import uuid
import inspect
from enum import Enum
from types import UnionType
from datetime import datetime
from typing import Union, Optional, TextIO, get_origin, get_args
from fastapi.responses import StreamingResponse

from backend.model import Model
from backend.service import StreamedUpload

def open_file(path: str, mode: str = "r", nl: bool = False) -> TextIO:
    return open(path, mode, encoding="utf-8", newline="\n" if nl else "")

class TSSymbol:

    def write(self) -> list[Union["TSSymbol", str, int]]:
        raise NotImplementedError()

    def __str__(self):
        symbols = self.write()
        result = []
        for symbol in symbols:
            if isinstance(symbol, TSSymbol):
                try:
                    result.append(str(symbol))
                except Exception:
                    print(symbol.__class__.__name__)
                    raise
            else:
                result.append(symbol)

        return "".join(result)

class TSIndent(TSSymbol):

    def __init__(self, level: int):
        self.level = level

    def __add__(self, depth: int):
        return TSIndent(self.level + depth)

    def write(self):
        return ["    " * self.level]

class TSJoin(TSSymbol):

    def __init__(self, values: list[TSSymbol], separator: TSSymbol):
        self.values = values
        self.separator = separator

    def write(self):
        output = []
        for i, value in enumerate(self.values):
            if i > 0:
                output.append(self.separator)
            output.append(value)

        return output

class TSType(TSSymbol):

    def __init__(self, py_type: Optional[type] = None):
        self.py_type = py_type

    def is_generic(self):
        return "~" in repr(self.py_type)

    def write(self):
        if self.py_type is None:
            return ["void"]

        if self.py_type is str or self.py_type is uuid.UUID:
            return ["string"]

        if self.py_type is int or self.py_type is float:
            return ["number"]

        if self.py_type is bool:
            return ["boolean"]

        if self.py_type is dict:
            return ["Record<string, unknown>"]

        if self.py_type is datetime:
            return ["Date"]

        if self.py_type is StreamedUpload:
            return ["File"]

        if self.py_type is StreamingResponse:
            return ["Response"]

        origin = get_origin(self.py_type)
        if origin is Union or isinstance(self.py_type, UnionType):
            args = get_args(self.py_type)
            optional = False
            if type(None) in args:
                optional = True
                args = [arg for arg in args if arg is not type(None)]

            return [
                "(",
                TSJoin([TSType(arg) for arg in args], " | "),
                " | null" if optional else "",
                ")"
            ]

        if origin is tuple:
            args = []
            for arg in get_args(self.py_type):
                args.append(TSType(arg))
            return ["[", TSJoin(args, ", "), "]"]

        if origin is list:
            return [TSType(get_args(self.py_type)[0]), "[]"]

        if origin is dict:
            args = get_args(self.py_type)
            ts_val = ["Record<", TSType(args[0]), ", ", TSType(args[1]), ">"]
            if args[0] is not str:
                ts_val = ["Partial<", *ts_val, ">"]

            return ts_val

        if self.is_generic():
            return ["T"]

        if not inspect.isclass(self.py_type):
            raise ValueError(repr(self.py_type))

        if issubclass(self.py_type, Model):
            name = self.py_type.__name__
            if "[" in name:
                name = name.replace("[", "<").replace("]", ">")
            return [name]

        if issubclass(self.py_type, Enum):
            return [self.py_type.__name__]

        return ["unknown"]

class TSCode(TSSymbol):

    def __init__(self, code: str):
        self.code = code

    def write(self):
        return [self.code]

class TSString(TSSymbol):

    def __init__(self, value: str):
        self.value = value

    def write(self):
        return ['"', self.value, '"']

class TSPromise(TSSymbol):

    def __init__(self, py_type: Optional[type] = None):
        self.py_type = py_type

    def write(self):
        if self.py_type:
            return ["Promise<", TSType(self.py_type), ">"]

        return ["Promise<void>"]

class TSValueSet(TSSymbol):

    def __init__(self, values: list[TSSymbol], def_type: str, line_break: bool = False):
        self.values = values
        self.def_type = def_type
        self.line_break = line_break

    def write(self):
        lb = "\n" if self.line_break else ""
        if self.def_type == "array":
            return ["[", lb, TSJoin(self.values, ", "), lb, "]"]

        if self.def_type == "union":
            return ["(", lb, TSJoin(self.values, " | "), lb, ")"]

        raise ValueError(self.def_type)

class TSObject(TSSymbol):

    def __init__(self, indent_level: int = 0):
        self.content = []
        self.indent = TSIndent(indent_level)

    def add(self, key: str, value: TSSymbol):
        self.content.append(TSJoin([self.indent + 1, key, ": ", value], ""))

    def write(self):
        return ["{\n", TSJoin(self.content, ",\n"), self.indent, "\n", self.indent, "}"]

class TSObjectType(TSSymbol):

    def __init__(self, indent_level: int = 0):
        self.content = []
        self.inner = TSObject(indent_level)
        self.generic = False

    def add(self, key: str, value_type: type):
        value = TSType(value_type)
        if value.is_generic():
            self.generic = True

        self.inner.add(key, value)

    def write(self):
        return [self.inner]

class TSFunction(TSSymbol):

    def __init__(
        self,
        params: list[tuple[str, Union[type, str]]],
        return_type: Optional[type], body: TSSymbol
    ):
        self.params = params
        self.return_type = return_type
        self.body = body

    def write(self):
        params = []
        for param_name, param_type in self.params:
            if not isinstance(param_type, str):
                param_type = TSType(param_type)
            params.append(TSJoin([param_name, param_type], ": "))

        result = ["(", TSJoin(params, ", "), ")"]
        if self.return_type:
            if not isinstance(self.return_type, TSSymbol):
                self.return_type = TSType(self.return_type)
            result.extend([": ", self.return_type])
        result.extend([" => (", self.body, ")"])

        return result

class TSTypeDef(TSSymbol):

    def __init__(self, name: str, def_type: TSSymbol):
        self.name = name
        self.def_type = def_type

    def write(self):
        generic = []
        if isinstance(self.def_type, TSObjectType) and self.def_type.generic:
            generic = ["<T>"]
        return ["export type ", self.name, *generic, " = ", self.def_type, ";"]

class TSConstDef(TSSymbol):

    def __init__(
        self,
        name: str,
        value: TSSymbol,
        def_type: Optional[Union[type, TSSymbol]] = None
    ):
        self.name = name
        self.value = value
        self.def_type = def_type

    def write(self):
        result = ["export const ", self.name]
        if self.def_type:
            if isinstance(self.def_type, TSSymbol):
                result.extend([": ", self.def_type])
            else:
                result.extend([": ", TSType(self.def_type)])
        result.extend([" = ", self.value, ";"])

        return result

class TSEnumDefs(TSSymbol):

    def __init__(self, name: str, enum_type: type[Enum]):
        self.name = name
        self.enum_type = enum_type

    def write(self):
        const_name = self.name[0].lower() + self.name[1:]
        if const_name.endswith("y"):
            const_name = const_name[:-1] + "ies"
        elif const_name.endswith("s"):
            const_name = const_name + "es"
        else:
            const_name += "s"

        return [
            TSTypeDef(
                self.name,
                TSValueSet(
                    [TSString(e.value) for e in list(self.enum_type)],
                    "union"
                )
            ),
            "\n\n",
            TSConstDef(
                const_name,
                TSValueSet(
                    [TSString(e.value) for e in list(self.enum_type)],
                    "array"
                ),
                TSType(list[self.enum_type])
            )
        ]

class TSImport(TSSymbol):

    def __init__(self, module: str, types: list[type]):
        self.module = module
        self.types = types

    def add(self, new_type: type):
        self.types.append(new_type)

    def write(self):
        types = [t if isinstance(t, str) else TSType(t) for t in self.types]
        return ["import { ", TSJoin(types, ", "), " } from \"", self.module, "\";"]

class TSScope(TSSymbol):

    def __init__(self):
        self.content = []

    def add(self, symbol: TSSymbol):
        self.content.append(symbol)

    def write(self):
        result = []
        for symbol in self.content:
            result.append(symbol)
            if symbol == self.content[-1]:
                result.append("\n")
            else:
                result.append("\n\n")

        return result

def ts_obj_key(name: str, as_type: bool = False):
    if as_type:
        name = name.capitalize()
    for character in ("-", "_"):
        if character in name:
            name = name.split(character)
            for i, part in enumerate(name):
                if i > 0 or as_type:
                    name[i] = part.capitalize()
            name = "".join(name)

    return name

def model_type_def_ts(model_cls: type[Model]):
    ts_type = TSObjectType()
    for field_name, field in model_cls.model_fields.items():
        ts_type.add(field_name, field.annotation)

    return TSTypeDef(model_cls.__name__, ts_type)

def enum_type_defs_ts(enum_type: type[Enum]):
    return TSEnumDefs(enum_type.__name__, enum_type)
