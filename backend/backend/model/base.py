"""
Base machinery for SQLAlchemy mappers, Pydantic models, and enums.
"""
import uuid
from typing import Optional, Type, TypeVar, Union, get_args, get_origin
from pydantic import BaseModel
from sqlalchemy import Column
from sqlalchemy.orm import Session, Query, declarative_base
from sqlalchemy.inspection import inspect

MAX_TABLENAME_LEN = 64

Base: Type = declarative_base()
"""
Declarative base. All SQLAlchemy mappers must extend from both this and `BaseMixin`.
"""
Model = BaseModel
"""
Base Pydantic model type which all serializable model definitions must extend.
"""

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

T = TypeVar("T", bound=Base)
class BaseMixin:
    """
    A mixin with shared functionality which all SQLAlchemy mappers must extend.

    Allows serialization to `Model`s. A `__model__` class variable must be set
    (alongside `__tablename__`) to the default `Model` to which this mapper converts by
    default.
    """
    __model__: Type[Model]
    """
    The `Model` type to which this mapper converts by default.

    See `BaseMixin.to_model`.
    """
    __tablename__: str
    id: Column

    @classmethod
    def default_query(cls: Type[T], session: Session) -> Query[T]:
        """
        The default query configuration for this mapper. This can be used to declare
        default load strategy.

        Respected by `BaseMixin.get`.
        """
        return session.query(cls)

    @classmethod
    def get(cls: Type[T], session: Session, get_id: str) -> T:
        """
        Query an instance by `id`.
        """
        return cls.default_query(session).filter(cls.id == get_id).first()

    @classmethod
    def exists(cls, session: Session, get_id: str) -> bool:
        """
        Return whether or not an instance exists, without loading it, by `id`.
        """
        return session.query(cls).filter(cls.id == get_id).count() > 0

    def to_model(self, *, model_cls: Optional[Type[Model]] = None) -> Model:
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

        class Thing(Base, BaseMixin):
            __model__ = ThingModel

            # ...

            children: Mapped[list["Thing"]] = relationship("Thing", ...)

        thing.to_model().model_dump()
        # { "id": 1, "children": [{ "id": 2 }, { "id": 3 }]}
        ```

        This is often necessary when creating `Model`s containing deep relationships,
        to prevent circularity.
        """
        from .common import ModelGracefulEnumReconstructMixin # pylint: disable=import-outside-toplevel

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

            if isinstance(value, uuid.UUID):
                value = str(value)

            anno = field.annotation
            if get_origin(anno) is Union:
                anno = get_args(anno)[0]

            if isinstance(value, BaseMixin) and issubclass(anno, Model):
                value = value.to_model(model_cls=anno)

            is_checkable_list = isinstance(value, list) and len(value) > 0
            if is_checkable_list:
                if isinstance(value[0], BaseMixin):
                    inner_type = get_args(anno)[0]
                    value = [item.to_model(model_cls=inner_type) for item in value]

                if isinstance(value[0], uuid.UUID):
                    value = [str(item) for item in value]

            data[field_name] = value

        if issubclass(model_cls, ModelGracefulEnumReconstructMixin):
            data = model_cls.model_validate_as_column(data)

        return model_cls.model_validate(data)

    def expunge(self, *, skip: Optional[list[str]] = None):
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

                if isinstance(value, BaseMixin):
                    value.expunge(skip=child_skip)
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, BaseMixin):
                            item.expunge(skip=child_skip)

        # Check because we have have been removed during above recursion.
        if self in session:
            session.expunge(self)
