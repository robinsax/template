"""
Context machinery for step chain executions.
"""
import os
import copy
import json
from uuid import uuid4
from datetime import datetime
from contextlib import contextmanager
from urllib.parse import urlencode
from typing import (
    Optional, Generator, Union, Any, get_type_hints, get_args, get_origin
)
import requests
from requests import Response
from fastapi.routing import APIRoute
from sqlalchemy.orm import Session

from backend.model import Model
from backend.service import get_session_as_context, cli as cli
from backend.api import app as backend_api
from backend.tasks.notifier import send_notification_emails

from .mocks import MockMailer
from .errors import TestError, ContextCallFailed, StepFailed
from .steps import StepInfo, StepRef, StepNeedsAny

APIReturn = Optional[Union[Model, list[Model], Response]]
StepOutput = dict[str, Any]

class StepsContext:
    """
    Context object for flow test steps. Provides all necessary utilities for
    performing steps, and captures the state of step chains during execution.
    """
    root_url: str
    authorization: Optional[str]
    _step_outputs: list[tuple[str, StepOutput]]
    _log: list[str]
    _current_subchain: Optional[str]

    def __init__(
        self, root_url: str, authorization: Optional[str] = None,
        step_outputs: Optional[list[tuple[str, StepOutput]]] = None,
        log: Optional[list[str]] = None
    ):
        self.root_url = root_url
        self.authorization = authorization
        self._step_outputs = step_outputs or []
        self._log = log or []

        self._current_subchain = None

    def _serialize(self, obj: object):
        def _default(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            if isinstance(obj, Model):
                return obj.model_dump()
            return obj

        json_str = json.dumps(obj, indent=2, default=_default)
        if len(json_str) > 3000:
            return json_str[:3000] + "..."
        return json_str

    def log(self, message: str = "", indent: int = 0):
        """
        Append a log message to be dumped on chain failure.
        """
        indent_str = "\n" + (" " * (indent * 2))
        message = indent_str + indent_str.join(message.split("\n"))

        self._log.append(message)

    def get_log(self) -> str:
        """
        Return the log of the current chain execution.

        This will be the individual branch log if there is a branch in the chain.
        """
        return "".join(self._log).strip()

    def run_step(self, step_info: StepInfo) -> list["StepsContext"]:
        """
        Run the given step and return a list of contexts. The next step in the chain
        should be run for each.
        """
        name = step_info.get_name()
        self.log("+ Running step: " + name)

        self._current_subchain = step_info.subchain

        # Prepare required outputs.
        injected_outputs = step_info.fn._injected_outputs # pylint: disable=protected-access
        injected_values = {}
        for arg_name, output in injected_outputs.items():
            injected_values[arg_name] = self.get_output(
                output.step_ref,
                output.key,
                subchain=output.subchain
            )

        # Execute step.
        try:
            step_output = step_info.fn(self, **injected_values)
        except Exception as err:
            raise TestError(f"Step { name } failed") from err

        self._current_subchain = None

        # Handle output.
        if not step_info.is_branch:
            self._step_outputs.insert(0, (name, step_output))
            return [self]

        contexts = [
            StepsContext(
                self.root_url,
                self.authorization,
                [(name, branch_case), *self._step_outputs],
                [*self._log, "\n++ Branch " + str(i)]
            )
            for i, branch_case in enumerate(step_output)
        ]

        return contexts

    def get_output(
        self, step_ref: Union[StepRef, StepNeedsAny], key: Optional[str] = None, *,
        subchain: Optional[int] = None
    ) -> Any:
        """
        Get the most recent output for the provided step.

        If the provided step is an any-of, returns output from the first matching step.

        If the currently executing step is within a subchain, or a subchain index is
        specified, will prioritize outputs from that subchain.
        """
        # Resolve refs.
        if isinstance(step_ref, StepNeedsAny):
            step_names = step_ref.steps
        elif isinstance(step_ref, str):
            step_names = [step_ref]
        else:
            step_names = [step_ref.__name__]

        # Apply subchain if applicable.
        if subchain is None:
            subchain = self._current_subchain
        if subchain is not None:
            subchain = str(subchain)

            step_names = [
                *(step_name + ":" + subchain for step_name in step_names),
                *step_names
            ]

        # Check known outputs.
        for check_name, check_output in self._step_outputs:
            if check_name not in step_names:
                continue

            if key is None:
                return check_output

            if key not in check_output:
                raise TestError("No output for key: " + key)

            return check_output[key]

        raise TestError("No outputs for: " + ", ".join(step_names))

    def get_session(self) -> Session:
        """
        Return a database session via a context manager.
        """
        return get_session_as_context()

    def _get_endpoint_model_cls(
        self, method: str, endpoint: str
    ) -> tuple[Optional[type[Model]], bool]:
        for route in backend_api.routes:
            if not isinstance(route, APIRoute):
                continue

            if list(route.methods)[0].lower() != method:
                continue

            matches, _ = route.matches({
                "type": "http",
                "method": method,
                "path": endpoint
            })
            if not matches.value:
                continue

            type_hints = get_type_hints(route.endpoint)

            for param_key, check_type in type_hints.items():
                if param_key == "return":
                    if get_origin(check_type) == list:
                        return get_args(check_type)[0], True

                    return check_type, False

        return None, False

    def _call(
        self, method: str, endpoint: str, body: Optional[Union[Model, dict]] = None,
        *, params: Optional[dict[str, Any]] = None, raw: bool = False
    ) -> APIReturn:
        if raw:
            url = endpoint
        else:
            url = self.root_url + endpoint

        headers = {}
        if self.authorization:
            headers["Authorization"] = self.authorization

        if body is not None:
            headers["Content-Type"] = "application/json"

            if isinstance(body, Model):
                body = self._serialize(body.model_dump())
            else:
                body = self._serialize(body)

        self.log("API call: " + method + " " + url, indent=1)
        self.log("> Request:", indent=1)
        if params:
            self.log("Parameters: " + urlencode(params), indent=2)
        self.log("Headers: " + self._serialize(headers), indent=2)
        if body:
            self.log("Body: " + body, indent=2)

        resp = requests.request(
            method, url,
            headers=headers, data=body, params=params,
            timeout=20,
            allow_redirects=not raw
        )
        resp_data = None

        self.log("< Response:", indent=1)
        self.log("Status: " + str(resp.status_code), indent=2)
        self.log("Headers: " + json.dumps(dict(resp.headers), indent=2), indent=2)
        if resp.headers.get("Content-Type") == "application/json":
            resp_data = resp.json()

            if resp_data is not None:
                # Hide channel models which pollute logs.
                show_resp_data = copy.deepcopy(resp_data)
                if "channels" in show_resp_data:
                    for channel in show_resp_data["channels"]:
                        if "channel" in channel:
                            channel["channel"] = "<...>"

                self.log("Body: " + self._serialize(show_resp_data), indent=2)
        else:
            self.log("Body: " + resp.text, indent=2)

        if raw:
            return resp

        if resp.status_code > 299:
            raise ContextCallFailed(
                resp.status_code, str(resp.status_code) + ": " + resp.text
            )

        model_cls, is_list = self._get_endpoint_model_cls(method, endpoint)
        if not resp_data or not model_cls:
            return None

        if is_list:
            return [model_cls(**item) for item in resp_data]

        return model_cls(**resp_data)

    def get(
        self, endpoint: str, *, params: Optional[dict[str, Any]] = None,
        raw: bool = False
    ) -> APIReturn:
        """
        Perform a GET request to the given endpoint and return the response
        data as reconstructed to Pydantic models.
        """
        return self._call("get", endpoint, params=params, raw=raw)

    def post(
        self, endpoint: str, body: Optional[Union[Model, dict]] = None,
        *, params: Optional[dict[str, Any]] = None
    ) -> APIReturn:
        """
        Perform a POST request to the given endpoint and return the response
        data as reconstructed to Pydantic models.

        `body` can be a Pydantic model or dictionary.
        """
        return self._call("post", endpoint, body, params=params)

    def put(
        self, endpoint: str, body: Optional[Union[Model, dict]] = None,
        *, params: Optional[dict[str, Any]] = None
    ) -> APIReturn:
        """
        Perform a PUT request to the given endpoint and return the response
        data as reconstructed to Pydantic models.

        `body` can be a Pydantic model or dictionary.
        """
        return self._call("put", endpoint, body, params=params)

    def delete(self, endpoint: str) -> APIReturn:
        """
        Perform a DELETE request to the given endpoint and return the response
        data as reconstructed to Pydantic models.
        """
        return self._call("delete", endpoint)

    def temp_file_path(self):
        """
        Return a file path to use for temporary files.

        No file is created and the path can safely be appended with an extension.
        """
        return os.path.join(".testdata", str(uuid4()))

    def cli(self, args: list[str]):
        """
        Invoke the CLI with the given arguments.
        """
        log_message = "CLI call:\npython3 backend "
        for arg in args:
            if arg.startswith("--"):
                log_message += "\\\n    "

            log_message += arg + " "

        self.log(log_message, indent=1)

        cli.run(args)

    def get_sent_emails(self) -> list[tuple[str, str]]:
        """
        Execute the email sending task and return all emails it sends.
        """
        mailer = MockMailer()

        send_notification_emails(None, mailer=mailer)

        return mailer.emails

    def fail(self, message: str):
        """
        Shorthand to fail a step.
        """
        raise StepFailed(message)

    @contextmanager
    def expect_unauthorized(self) -> Generator:
        """
        Context manager that will cause a step error if the with body *doesn't* raise
        a `ContextCallFailed` with a 401 status code.
        """
        try:
            yield
        except ContextCallFailed as err:
            if err.status_code != 401:
                raise
        else:
            raise StepFailed("API didn\"t respond with 401")

    @contextmanager
    def expect_invalid(self) -> Generator:
        """
        Context manager that will cause a step error if the with body *doesn't* raise
        a `ContextCallFailed` with a 400 status code.
        """
        try:
            yield
        except ContextCallFailed as err:
            if err.status_code != 400:
                raise
        else:
            raise StepFailed("API didn\"t respond with 400")
