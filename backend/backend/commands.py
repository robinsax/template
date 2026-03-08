"""
General CLI commands.
"""
import json
import base64
import secrets
from uuid import UUID
from getpass import getpass
from datetime import timedelta
import uvicorn
import requests
from cryptography.fernet import Fernet
from sqlalchemy import TIMESTAMP, update, func, text, case, cast
from sqlalchemy.orm import Session, InstrumentedAttribute

from backend.config import config
from backend.service import CLIError, cli, tasks as tasks_registry
from backend.model import (
    User, UserRole, Role, Audit, BasicAuditEvent, mappers
)

# Entrypoints.
@cli.verb()
def serve(service: str):
    """
    Serve the given HTTP service on the configured port, with hot reloading in dev mode.
    """
    if service not in ("api", "tasks"):
        raise CLIError("unknown service: " + service)

    uvicorn.run(
        "backend." + service + ":app",
        host="0.0.0.0", port=config.service_port.get(),
        reload=config.dev_mode.get(),
        lifespan="on" if service == "tasks" else "off"
    )

# Administration.
@cli.verb()
def keys_make_encryption():
    """
    Generate a new encryption key.
    """
    print(Fernet.generate_key().decode("utf-8"))

@cli.verb()
def keys_make_hmac():
    """
    Generate a new HMAC key.
    """
    print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode("utf-8"))

@cli.verb(with_session=True)
def user_create(
    session: Session, *, name: str, email: str, password: str
):
    """
    Create a user.
    """
    user = User(
        name=name,
        email=email
    )
    user.set_password(password)

    session.add(user)
    session.flush()
    session.refresh(user)

    Audit.create(session, user, user, BasicAuditEvent.CREATE)
    session.commit()

@cli.verb(with_session=True)
def user_role_assign(
    session: Session, email: str, role: str,
    realm: str | None = None
):
    """
    Assign a role to a user.

    Does not perform any validation.
    """
    try:
        role = Role(role)
    except ValueError:
        raise CLIError("Invalid role: " + role) from None

    user = User.get_by_email(session, email)
    if not user:
        raise CLIError("User not found: " + email)

    realm_id = None
    if realm:
        try:
            realm_id = UUID(realm)
        except ValueError:
            raise CLIError("Invalid realm ID: " + realm) from None

    grant = UserRole(
        user_id=user.id,
        realm_id=realm_id,
        role=role
    )
    session.add(grant)
    session.commit()

    Audit.create(session, user, grant, BasicAuditEvent.CREATE)
    session.commit()

@cli.verb()
def tasks_list():
    """
    List available background tasks.
    """
    for task_name, task_fn in tasks_registry.items():
        print(task_name + task_fn.__doc__.rstrip())

@cli.verb(with_session=True, short_names={ "t": "task_name" })
def tasks_run(session: Session, task_name: str):
    """
    Run a background task.
    """
    task = tasks_registry.get(task_name)
    if not task:
        raise CLIError("Unknown task: " + task_name)

    task(session)

# HTTP client.
def _user_prompt_login(root_url: str):
    """
    Prompt the user for login credentials and return a token.
    """
    root_url = root_url or "http://localhost/api/v1"

    user = input("Email address: ")
    password = getpass("Password: ")

    auth_resp = requests.post(
        root_url + "/auth",
        json={ "email": user, "password": password },
        timeout=10
    )
    if auth_resp.status_code != 200:
        raise CLIError("Authentication failed: " + auth_resp.text)

    auth_resp = auth_resp.json()

    return auth_resp["token"], auth_resp["auth"]

@cli.verb(short_names={ "r": "root_url" })
def client_login(*, root_url: str | None = None):
    """
    Log in to the API and output a token.
    """
    root_url = root_url or "http://localhost/api/v1"

    token, auth = _user_prompt_login(root_url)

    print("Token: ", token)
    print("Auth: ", auth)

@cli.verb(short_names={ "r": "root_url" })
def client(*, root_url: str | None = None):
    """
    Run an HTTP client for the API.

    Initiates a loop after authentication where requests are executed from user
    input.

    A response query path can be appended when inputting an endpoint. For example, the
    following will output only the ID of the first client:
    ```
    /clients + 0.id
    ```
    """
    root_url = root_url or "http://localhost/api/v1"

    # Log in.
    token, _ = _user_prompt_login(root_url)

    session = requests.Session()
    session.headers.update({ "Authorization": token })

    methods = ["get", "delete", "put", "post"]

    # Request loop.
    while True:
        print("-" * 30)
        print(
            "Method: " +
            ", ".join([str(i + 1) + ". " + method for i, method in enumerate(methods)])
        )
        method = input("")
        try:
            method = methods[int(method) - 1]
        except ValueError:
            print("Invalid method: " + method)
            continue

        endpoint = input("Endpoint: ")
        query_path = None
        if " + " in endpoint:
            endpoint, query_path = endpoint.split(" + ")

        body = None
        if method in ["post", "put"]:
            body = input("Body: ")
            try:
                body = json.loads(body)
            except ValueError:
                print("Invalid body: " + body)
                continue

        resp = session.request(
            method,
            root_url + endpoint,
            json=body
        )
        resp_data = resp.json()

        if query_path:
            try:
                query_path = query_path.split(".")
                cur = resp_data

                for key in query_path:
                    if isinstance(cur, list):
                        cur = cur[int(key)]
                    else:
                        cur = cur[key]

                resp_data = cur
            except (KeyError, ValueError):
                print("Failed to parse path: " + query_path)

        print(resp.status_code)
        print(json.dumps(resp_data, indent=2))

# Dev tooling.
@cli.verb(with_session=True, short_names={ "d": "days", "h": "hours" })
def dev_timetravel( # pylint: disable=too-many-locals
    session: Session, days: int | str = 0, hours: int | str = 0
):
    """
    Emulate traveling forward in time by decrementing all timestamps in the database by
    the given duration.

    This effectively creates a state where all events occurred further in the past.
    """
    days = int(days)
    hours = int(hours)
    delta = timedelta(days=days, hours=hours)
    jsonb_delta = ""
    if days:
        jsonb_delta += f" {days} days"
    if hours:
        jsonb_delta += f" {hours} hours"
    jsonb_delta = jsonb_delta.strip()

    for mapper_cls in mappers():
        # Find datetime columns.
        datetime_columns = []
        for attr in dir(mapper_cls):
            column = getattr(mapper_cls, attr)
            if not isinstance(column, InstrumentedAttribute):
                continue

            try:
                type_name = str(column.type)
            except AttributeError:
                continue

            if type_name == "DATETIME":
                datetime_columns.append((attr, column))

        if not datetime_columns:
            continue

        # Update all datetime columns.
        session.execute(update(mapper_cls).values({
            attr: col - delta for attr, col in datetime_columns
        }))

        # Update all JSONB columns.
        jsonb_fields = getattr(mapper_cls, "__timetravel_jsonb__", None)
        if jsonb_fields:
            for col_name, jsonb_keys in jsonb_fields:
                col = getattr(mapper_cls, col_name)
                expr = getattr(mapper_cls, col_name)
                for key in jsonb_keys:
                    value = func.jsonb_extract_path_text(col, key)

                    expr = case(
                        (value != None, ( # pylint: disable=singleton-comparison
                            func.jsonb_set(
                                expr,
                                f'{{"{key}"}}',
                                func.to_jsonb(
                                    cast(value, TIMESTAMP(timezone=True)) -
                                    text(f"interval \"{jsonb_delta}\"")
                                ))
                            )
                        ),
                        else_=expr
                    )

                session.execute(update(mapper_cls).values({
                    col: expr
                }))

    session.commit()
