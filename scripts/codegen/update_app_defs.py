import sys
import inspect
from enum import Enum
from types import ModuleType
from typing import get_origin, get_args, get_type_hints
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.routing import APIRoute

from backend import model, api
from backend.model import Model, PERMISSIONS_MATRIX, ROLE_SCOPES
from backend.service import StreamedUpload
from backend.api import app as api_app

sys.path.insert(0, ".")
from codegen_common import * # pylint: disable=wildcard-import, unused-wildcard-import, wrong-import-position, wrong-import-order

HEADER = """
/** This file is auto-generated. Do not modify it. */
/* eslint-disable max-len */
""".strip()

def write_models_ts(src_modules: list[ModuleType]):
    ts_scope = TSScope()

    seen_models = set()
    for src_module in src_modules:
        for symbol_name in dir(src_module):
            symbol = getattr(src_module, symbol_name)

            is_model = (
                isinstance(symbol, type) and \
                issubclass(symbol, Model) and \
                symbol is not Model
            )
            if is_model:
                if symbol in seen_models:
                    continue
                seen_models.add(symbol)

                ts_scope.add(model_type_def_ts(symbol))
                continue

            is_enum = (
                isinstance(symbol, type) and \
                issubclass(symbol, Enum) and \
                symbol is not Enum
            )
            if is_enum:
                ts_scope.add(enum_type_defs_ts(symbol))
                continue

    ts_perms_mat = TSObject()
    for key, value in PERMISSIONS_MATRIX.items():
        ts_entry = TSObject(1)
        for permission in value:
            ts_entry.add(permission.value, TSCode("true"))
        ts_perms_mat.add(key.value, ts_entry)

    ts_scope.add(
        TSConstDef(
            "permissionsMatrix",
            ts_perms_mat,
            TSCode("Record<Role, Partial<Record<Permission, boolean>>>")
        )
    )

    ts_role_scopes = TSObject()
    for key, value in ROLE_SCOPES.items():
        ts_entry = TSValueSet(
            [TSString(scope.value) if scope else TSCode("null") for scope in value],
            "array"
        )
        ts_role_scopes.add(key.value, ts_entry)

    ts_scope.add(
        TSConstDef(
            "roleScopes",
            ts_role_scopes,
            TSCode("Record<Role, (RealmType | null)[]>")
        )
    )

    return str(ts_scope)

def write_endpoints_ts(app: FastAPI): # pylint: disable=too-many-statements
    ts_models_import = TSImport("@/models", [])

    def add_import(to_add):
        if to_add in (str, StreamedUpload, StreamingResponse):
            return

        if get_origin(to_add) is list:
            add_import(get_args(to_add)[0])
            return

        if to_add not in ts_models_import.types:
            ts_models_import.add(to_add)

    tree = {}
    def add_endpoint(path: str, method: str, param_type: type, return_type: type):
        parts = path.split("/")
        parts.pop(0)

        cur = tree
        while len(parts):
            part = parts.pop(0)
            if part not in cur:
                cur[part] = {}

            cur = cur[part]

        cur[method.lower()] = (path, method, param_type, return_type)

    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue

        type_hints = get_type_hints(route.endpoint)

        param_type = None
        return_type = None
        for param_key, check_type in type_hints.items():
            is_relevant = (
                check_type is dict or \
                get_origin(check_type) is list or \
                (inspect.isclass(check_type) and issubclass(check_type, Model)) or \
                check_type is StreamedUpload or \
                check_type is StreamingResponse
            )
            if not is_relevant:
                continue

            if param_key == "return":
                return_type = check_type
            else:
                param_type = check_type

        if param_type and param_type is not dict:
            add_import(param_type)
        if return_type and return_type is not dict:
            add_import(return_type)

        add_endpoint(
            route.path,
            list(route.methods)[0].lower(),
            param_type,
            return_type
        )

    def write(node, indent: int) -> TSSymbol:
        if isinstance(node, dict):
            ts_object = TSObject(indent)

            for key, value in node.items():
                if key[0] == "{":
                    name_only = key[1:-1].split(":")[0]

                    item_name = "_".join(name_only.split("_")[1:])

                    ts_object.add(
                        ts_obj_key(item_name),
                        TSFunction(
                            [(name_only, str)],
                            None,
                            TSJoin(["(", write(value, indent + 1), ")"], ""),
                        )
                    )
                else:
                    ts_object.add(ts_obj_key(key), write(value, indent + 1))

            return ts_object

        path, method, param_type, return_type = node

        path_parts = path.split("/")
        detemplated_parts = []
        for part in path_parts:
            if part and part[0] == "{":
                detemplated_parts.append("${" + part[1:-1].split(":")[0] + "}")
            else:
                detemplated_parts.append(part)

        params = []
        if param_type:
            params.append(("body", param_type))
        params.append(("options?", "APICallOptions"))

        raw_resp = return_type is StreamingResponse

        return TSFunction(
            params,
            TSPromise(return_type),
            TSCode(
                "api.call({ " + \
                    "path: `" + "/".join(detemplated_parts) + "`, " + \
                    "method: \"" + method + "\"" + \
                    (", body " if param_type else " ") + \
                "}, " + \
                ("{ ...options, rawResp: true }" if raw_resp else "options") + \
                ")"
            )
        )

    ts_scope = TSScope()
    ts_scope.add(ts_models_import)
    ts_scope.add(TSImport("./base", ["APIClientBase", "APICallOptions"]))
    ts_scope.add(
        TSConstDef(
            "binding",
            TSFunction(
                [("api", "APIClientBase")],
                None,
                write(tree, 0)
            )
        )
    )

    return str(ts_scope)

def update_models():
    with open_file("./app/src/model/backend.ts", "w") as fh:
        fh.write(HEADER)
        fh.write("\n")
        fh.write(write_models_ts([model, api]))

    with open_file("./app/src/api/binding.ts", "w") as fh:
        fh.write(HEADER)
        fh.write("\n")
        fh.write(write_endpoints_ts(api_app))

update_models()
print("Done.")
