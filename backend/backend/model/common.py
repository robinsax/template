"""
Reusable functionality for model modules.
"""
from uuid import UUID
from typing import Callable, Type, Union, get_origin, get_args
from datetime import datetime, timezone, timedelta
from cryptography.fernet import Fernet

from backend.config import config

from .base import Model

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

        if isinstance(value, UUID):
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

    return model_cls.model_validate(model_input)
