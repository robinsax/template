"""
Misc. utilities.
"""
import re
import uuid
from typing import Union

BASE_62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

def camel_to_snake_case(name: str) -> str:
    """
    Convert a camelCase string to snake_case.
    """
    step = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)

    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", step).lower()

def base62_encode(num: int) -> str:
    """
    Encodes an integer into base62 string.
    """
    if num == 0:
        return BASE_62[0]
    chars = []
    while num > 0:
        num, rem = divmod(num, 62)
        chars.append(BASE_62[rem])
    return "".join(reversed(chars))

def id_to_app_url_form(value: Union[str, uuid.UUID]) -> str:
    """
    Encodes a UUID into a URL-friendly base62 string.
    """
    if not isinstance(value, uuid.UUID):
        value = uuid.UUID(value)

    num = int.from_bytes(value.bytes, byteorder="big", signed=False)

    return base62_encode(num)
