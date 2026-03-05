"""
Base machinery for SQLAlchemy mappers, Pydantic models, and enums.
"""
from uuid import UUID, uuid4
from typing import Any, Type, TypeVar, Union, get_args, get_origin
from pydantic import BaseModel
from sqlalchemy import Column, Enum as SQLAEnum, UUID, ForeignKey, String, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session, Mapped, Query, DeclarativeBase, mapped_column
from sqlalchemy.inspection import inspect

MAX_TABLENAME_LEN = 64

class EnumMixin(str):
    """
    Base enum mixin which all model-involved enums must extend.

    Must come before `Enum` in the MRO.

    E.g.:
    ```py
    class MyEnum(EnumMixin, Enum):
        # ...
    ```
    """
    value: str

Model = BaseModel
"""
Base Pydantic model type which all serializable model definitions must extend.
"""

TImpl = TypeVar("TImpl", bound="Mapper")
class Mapper(DeclarativeBase):
    """
    Base class which all SQLAlchemy mappers must extend.

    Allows serialization to `Model`s. A `__model__` class variable must be set
    (alongside `__tablename__`) to the default `Model` to which this mapper converts by
    default.
    """
    __model__: Type[Model]
    """
    The `Model` type to which this mapper converts by default.

    See `Mapper.to_model`.
    """
    __tablename__: str
    id: Column

    @classmethod
    def default_query(cls: Type[TImpl], session: Session) -> Query[TImpl]:
        """
        The default query configuration for this mapper. This can be used to declare
        default load strategy.

        Respected by `BaseMixin.get`.
        """
        return session.query(cls)

    @classmethod
    def get(cls: Type[TImpl], session: Session, get_id: str) -> TImpl:
        """
        Query an instance by `id`.
        """
        return cls.default_query(session).filter(cls.id == get_id).first()

    @classmethod
    def exists(cls: Type[TImpl], session: Session, get_id: str) -> bool:
        """
        Return whether or not an instance exists, without loading it, by `id`.
        """
        return session.query(cls).filter(cls.id == get_id).count() > 0

    def to_model(self, *, model_cls: Type[Model] | None = None) -> Model:
        """
        Create a `Model` from this mapper instance, by default of the type of
        `__model__`.

        An alternate `Model` type `model_cls` may be provided instead.

        If a field of the `Model` contains a child `Model` or list of child `Model`s, the
        annotated type will be used when converting the child mapper on this mapper
        instance.

        E.g.:
        ```py
        class ChildThingModel(Model):
            id: str

        class ThingModel(Model):
            id: str
            children: list[ChildThingModel]

        class Thing(Mapper):
            __model__ = ThingModel

            # ...

            children: Mapped[list["Thing"]] = relationship(...)

        thing.to_model().model_dump()
        # { "id": 1, "children": [{ "id": 2 }, { "id": 3 }]}
        ```

        This is often necessary when creating `Model`s containing deep relationships,
        to prevent circularity.
        """
        if not model_cls:
            model_cls = getattr(self, "__model__", None)

        if isinstance(model_cls, str):
            from backend import model # pylint: disable=import-outside-toplevel
            model_cls = getattr(model, model_cls)

        if model_cls is None:
            raise NotImplementedError()

        data = {}
        for field_name, field in model_cls.model_fields.items():
            value = getattr(self, field_name)

            if isinstance(value, UUID):
                value = str(value)

            anno = field.annotation
            if get_origin(anno) is Union:
                anno = get_args(anno)[0]

            if isinstance(value, Mapper) and issubclass(anno, Model):
                value = value.to_model(model_cls=anno)

            is_checkable_list = isinstance(value, list) and len(value) > 0
            if is_checkable_list:
                if isinstance(value[0], Mapper):
                    inner_type = get_args(anno)[0]
                    value = [item.to_model(model_cls=inner_type) for item in value]

                if isinstance(value[0], UUID):
                    value = [str(item) for item in value]

            data[field_name] = value

        return model_cls.model_validate(data)

    def expunge(self, *, skip: list[str] | None = None):
        """
        Expunge this instance from the session.
        """
        session = Session.object_session(self)

        session.refresh(self)

        insp = inspect(self)
        for rel in insp.mapper.relationships:
            if rel.key in insp.unloaded:
                value = getattr(self, rel.key)

                if skip and rel.key in skip:
                    continue

                child_skip = [rel.key]
                if skip:
                    child_skip.extend(skip)

                if isinstance(value, Mapper):
                    value.expunge(skip=child_skip)
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, Mapper):
                            item.expunge(skip=child_skip)

        # Check because we have have been removed during above recursion.
        if self in session:
            session.expunge(self)

def column(
    target: Any | None = None, *, name: str | None = None, pk: bool = False, 
    fk: str | None = None, dt: bool = False, default_now: bool = False,
    str_len: int | None = None, index: bool = False, unique: bool = False
) -> Mapped[Any]:
    """
    Column containing an inferred value with some configuration.
    """
    if pk:
        return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    args = []
    if name:
        args = [name]

    kwargs = {
        'unique': unique,
        'index': index
    }
    if target:
        if issubclass(target, EnumMixin):
            args.extend([SQLAEnum(target)])
        elif issubclass(target, Model):
            args.extend([ColumnJSONBModel(target)])
        else:
            raise ValueError("Unknown column configuration.")
    elif fk:
        args.extend([UUID(as_uuid=True), ForeignKey(target)])
    elif dt:
        args.extend([DateTime(timezone=True)])
        if default_now:
            from .common import current_datetime

            kwargs["default"] = current_datetime
    elif str_len:
        args.extend([String(str_len)])

    return mapped_column(*args, **kwargs)

class ColumnJSONBModel(TypeDecorator):
    model_cls: type[Model]

    cache_ok = True

    def __init__(self, model_cls: type[Model]):
        super().__init__(JSONB())
        self.model_cls = model_cls

    def process_bind_param(self, value: Model | None, *args) -> dict | None:
        from .common import model_to_column_repr
        if not value:
            return None

        return model_to_column_repr(value)

    def process_result_value(self, value: dict | None, *args):
        from .common import model_from_column_repr
        if not value:
            return None

        return model_from_column_repr(self.model_cls, value)
