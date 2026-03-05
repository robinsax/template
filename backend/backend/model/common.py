"""
Reusable functionality for model modules.
"""
import uuid
from enum import Enum
from typing import Callable, TypeVar, Type, Union, Any, get_origin, get_args
from datetime import datetime, timezone, timedelta
from pydantic.fields import FieldInfo
from cryptography.fernet import Fernet
from sqlalchemy import Enum as SQLAlchemyEnum

from backend.config import config

from .base import Model

EnumType = SQLAlchemyEnum

M = TypeVar("M", bound=Model)
class ModelEqMixin:
    """
    Mixin for Pydantic models to override == with relatively deep equality checking.
    """

    def __eq__(self: M, other: M) -> bool:
        """
        Return `True` if `self` and `other` are equal.
        """
        if self.__class__ is not other.__class__:
            return False

        for name in self.model_fields:
            if getattr(self, name) != getattr(other, name):
                return False

        return True

class ModelGracefulEnumReconstructMixin:
    """
    Mixin that automatically drops invalid enum values from list fields during database
    loads.

    Useful to avoid migrations when values are inconsequentially removed from enum types.
    """

    @classmethod
    def _is_enum_list_field(cls: M, field: FieldInfo) -> bool:
        """
        Return `True` if `field` is a list of enums.
        """
        origin = get_origin(field.annotation)
        if origin is not list:
            return False

        args = get_args(field.annotation)
        return bool(args and isinstance(args[0], type) and issubclass(args[0], Enum))

    @classmethod
    def model_validate_as_column(cls: M, data: Any, **kwargs):
        """
        Intercept validation and sanitize enum lists before normal validation.
        """
        if not isinstance(data, dict):
            return cls.model_validate(data, **kwargs)

        new_data = dict(data)
        for name, field in cls.model_fields.items():
            if not cls._is_enum_list_field(field) or name not in new_data:
                continue

            enum_cls = get_args(field.annotation)[0]
            raw_values = new_data[name]
            if not isinstance(raw_values, list):
                continue

            cleaned = []
            for val in raw_values:
                try:
                    cleaned.append(enum_cls(val))
                except ValueError:
                    # Ignore invalid.
                    continue

            new_data[name] = cleaned

        data = new_data
        return cls.model_validate(data, **kwargs)

def get_fernet_encryption():
    """
    Return a `Fernet` loaded with the configured encryption key.
    """
    return Fernet(config.encryption_key.get().encode())

def datetime_factory(delta: timedelta = timedelta(0)) -> Callable[[], datetime]:
    """
    Return a datetime factory to return a UTC datetime.

    A forward-offset `delta` may be provided.
    """
    def factory() -> datetime:
        return datetime.now(timezone.utc) + delta
    return factory

current_datetime = datetime_factory()
"""
Returns the current UTC datetime.
"""

def dict_to_column_repr(data: dict) -> dict:
    """
    Convert complex types in `data` to assign to a JSONB column.
    """
    result = {}

    for key, value in data.items():
        if isinstance(value, datetime):
            value = value.isoformat()

        if isinstance(value, uuid.UUID):
            value = str(value)

        if isinstance(value, Model):
            value = model_to_column_repr(value)

        result[key] = value

    return result

def model_to_column_repr(model: Model) -> dict:
    """
    Create a dictionary representation of a `Model` to assign to a JSONB column.

    Usage is only necessary for models with complex types.
    """
    return dict_to_column_repr(model.model_dump())

def model_from_column_repr(model_cls: Type[Model], data: dict) -> Model:
    """
    Create a `Model` from a dictionary representation of a `Model` from a JSONB column.

    Usage is only necessary for models with complex types.
    """
    model_input = {}

    for key, value in data.items():
        anno = model_cls.model_fields[key].annotation
        is_datetime = (
            anno is datetime or
            (get_origin(anno) is Union and get_args(anno)[1] is datetime)
        )
        if is_datetime and value:
            value = datetime.fromisoformat(value)

        model_input[key] = value

    if issubclass(model_cls, ModelGracefulEnumReconstructMixin):
        return model_cls.model_validate_as_column(model_input)

    return model_cls.model_validate(model_input)
