"""
General CLI commands.
"""
import uuid
import json
import base64
import secrets
from getpass import getpass
from datetime import timedelta
from typing import Optional, Union
import uvicorn
import requests
from cryptography.fernet import Fernet
from sqlalchemy import TIMESTAMP, update, func, text, case, cast
from sqlalchemy.orm import Session, InstrumentedAttribute

from backend.config import config
from backend.service import CLIError, cli, tasks as tasks_registry
from backend.model import (
    User, UserGrant, Role, UserType, State, Audit, BasicAuditEvent, CampaignChannel,
    CampaignChannelOrchestrationRunType, AdPlatformOAuthToken, Campaign, Client,
    AuthzScope, mappers
)
from backend.channels import AdPlatformTokenSideloadMixin, get_ad_platform
from backend.logic import update_locations_database
from backend.tasks import (
    run_campaign_analysis, publish_campaign_channel, poll_campaign_channel_reviews
)

# Entrypoints.
@cli.verb()
def serve(service: str):
    """
    Serve the given HTTP service on the configured port, with hot reloading in dev mode.
    """
    if service not in ("api", "streams"):
        raise CLIError("unknown service: " + service)

    uvicorn.run(
        "backend." + service + ":app",
        host="0.0.0.0", port=config.service_port.get(),
        reload=config.dev_mode.get()
    )

@cli.verb()
def tasks():
    """
    Run background tasks.
    """
    # Cloud run requires HTTP healthcheck so background tasks run in an FastAPI
    # lifespan even though there are no endpoints that do anything.
    uvicorn.run(
        "backend.tasks:app",
        host="0.0.0.0", port=8080,
        reload=config.dev_mode.get(),
        lifespan="on"
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

@cli.verb(short_names={ "e": "encryption_key", "t": "token" })
def keys_decrypt_token(token: str, encryption_key: str = ""):
    """
    Decrypt an encrypted ad platform OAuth token.
    """
    encryption_key = encryption_key or config.encryption_key.get()

    fernet = Fernet(encryption_key.encode())
    token_bytes = base64.b64decode(token)

    print(fernet.decrypt(token_bytes).decode("utf-8"))

@cli.verb(with_session=True)
def user_create(
    session: Session, *, name: str, email: str, password: str,
    owner: bool = False
):
    """
    Create a user.
    """
    user = User(
        name=name,
        email=email,
        type=UserType.PLATFORM_OWNER if owner else UserType.CLIENT,
        state=State.ACTIVE
    )
    user.set_password(password)

    session.add(user)
    session.commit()
    session.refresh(user)

    Audit.create(session, user, user, BasicAuditEvent.CREATE)
    session.commit()

@cli.verb(with_session=True)
def user_update(
    session: Session, email: str, *,
    name: Optional[str] = None,
    user_type: Optional[str] = None,
    password: Optional[str] = None
):
    """
    Update an existing user.
    
    Can update name, type (client/platform_owner), and/or password.
    """
    user = User.get_by_email(session, email)
    if not user:
        raise CLIError("User not found: " + email)

    if name:
        user.name = name

    if user_type:
        try:
            user.type = UserType(user_type)
        except ValueError:
            raise CLIError(
                f"Invalid user type: {user_type}. Must be "client" or "platform_owner"."
            ) from None

    if password:
        user.set_password(password)

    session.commit()
    session.refresh(user)

    Audit.create(session, user, user, BasicAuditEvent.UPDATE)
    session.commit()

@cli.verb(with_session=True)
def user_role_assign(
    session: Session, email: str, role: str,
    client: Optional[str] = None # pylint: disable=redefined-outer-name
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

    client_id = None
    if client:
        try:
            client_id = uuid.UUID(client)
        except ValueError:
            raise CLIError("Invalid client ID: " + client) from None

        client = Client.get(session, client_id)
        if not client:
            raise CLIError("Client not found: " + client)

    grant = UserGrant(
        user_id=user.id,
        client_id=client_id,
        role=role
    )
    session.add(grant)
    session.commit()

    Audit.create(session, user, grant, BasicAuditEvent.CREATE)
    session.commit()

@cli.verb(with_session=True, short_names={ "oid": "ad_platform_oauth_id" })
def synchronize_oauth(session: Session, ad_platform_oauth_id: str):
    """
    Run synchronization for an OAuth token.
    """
    try:
        ad_platform_oauth_id = uuid.UUID(ad_platform_oauth_id)
    except ValueError:
        raise CLIError("Invalid ad platform OAuth ID: " + ad_platform_oauth_id) from None

    oauth_token = AdPlatformOAuthToken.get(session, ad_platform_oauth_id)
    if not oauth_token:
        raise CLIError("Ad platform OAuth not found: " + str(ad_platform_oauth_id))

    ad_platform = get_ad_platform(oauth_token.platform_key)

    ad_platform.synchronize_oauth(oauth_token)

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

@cli.verb(with_session=True)
def locations_update(session: Session):
    """
    Update the locations database.
    """
    update_locations_database(session)

# Ad platform orchestration.
def _get_campaign_channel(session: Session, campaign_channel_id: str) -> CampaignChannel:
    """
    Get the campaign channel with the given `campaign_channel_id`.
    """
    try:
        campaign_channel_id = uuid.UUID(campaign_channel_id)
    except ValueError:
        raise CLIError("Invalid campaign channel ID: " + campaign_channel_id) from None

    campaign_channel = CampaignChannel.get(session, campaign_channel_id)
    if not campaign_channel:
        raise CLIError("Campaign channel not found: " + str(campaign_channel_id))

    return campaign_channel

@cli.verb(with_session=True, short_names={ "cid": "campaign_channel_id" })
def ap_call(
    session: Session, *, campaign_channel_id: str, action: str
):
    """
    Call an ad platform orchestration action.
    """
    campaign_channel = _get_campaign_channel(session, campaign_channel_id)

    actions_run_types = {
        "publish": CampaignChannelOrchestrationRunType.PUBLISH,
        "poll_review": CampaignChannelOrchestrationRunType.POLL_REVIEW
    }
    action = actions_run_types.get(action)

    if action == CampaignChannelOrchestrationRunType.PUBLISH:
        publish_campaign_channel(session, campaign_channel, allow_invalid=True)
    elif action == CampaignChannelOrchestrationRunType.POLL_REVIEW:
        poll_campaign_channel_reviews(session, campaign_channel)
    else:
        raise CLIError("Unknown action")

@cli.verb(with_session=True, short_names={ "cid": "campaign_channel_id" })
def ap_state(session: Session, *, campaign_channel_id: str):
    """
    Output campaign channel publish state to standard out as JSON.
    """
    campaign_channel = _get_campaign_channel(session, campaign_channel_id)

    print(json.dumps(campaign_channel.publish_state.model_dump(), indent=2))

@cli.verb(
    with_session=True,
    short_names={ "cid": "client_id", "bid": "business_id", "k": "platform_key" }
)
def ap_token(
    session: Session, *, client_id: str, platform_key: str, business_id: str = ""
):
    """
    Output an encrypted ad platform OAuth token.
    """
    authz_scope = AuthzScope(
        client_id=uuid.UUID(client_id),
        business_id=uuid.UUID(business_id) if business_id else None
    )
    oauth = AdPlatformOAuthToken.get_for_scope_platform(
        session, authz_scope, platform_key
    )
    if not oauth:
        raise CLIError("Ad platform OAuth not found")

    print("=== ENCRYPTED TOKEN ===")
    print(oauth.encrypted_token)
    print("=======================")

    print("=== METADATA ===")
    print(json.dumps(oauth._integration_metadata)) # pylint: disable=protected-access
    print("================")

@cli.verb(
    with_session=True,
    short_names={ "cid": "client_id", "bid": "business_id", "k": "platform_key" }
)
def ap_token_overwrite(
    session: Session, *, client_id: str, platform_key: str, business_id: str = ""
):
    """
    Overwrite an existing ad platform OAuth token and associated metadata.
    """
    authz_scope = AuthzScope(
        client_id=uuid.UUID(client_id),
        business_id=uuid.UUID(business_id) if business_id else None
    )
    oauth = AdPlatformOAuthToken.get_for_scope_platform(
        session, authz_scope, platform_key
    )
    if not oauth:
        raise CLIError("Target ad platform OAuth not found")

    raw_token = input("Raw token: ")
    metadata_file_path = input("Integration metadata JSON file path: ")
    if metadata_file_path:
        with open(metadata_file_path, "r", encoding="utf-8") as fh:
            metadata = json.load(fh)

        oauth._integration_metadata = metadata # pylint: disable=protected-access

    oauth.set_token_from_cleartext(raw_token)
    session.commit()

@cli.verb(
    with_session=True,
    short_names={
        "cid": "client_id", "bid": "business_id", "k": "platform_key",
        "at": "access_token", "uid": "user_id"
    }
)
def ap_token_sideload(
    session: Session, *, client_id: str, platform_key: str, access_token: str,
    user_id: str, business_id: str = "",
):
    """
    Sideload a net-new platform OAuth token.
    """
    authz_scope = AuthzScope(
        client_id=uuid.UUID(client_id),
        business_id=uuid.UUID(business_id) if business_id else None
    )
    oauth = AdPlatformOAuthToken.get_for_scope_platform(
        session, authz_scope, platform_key
    )
    if oauth:
        raise CLIError("Would duplicate existing token")

    platform = get_ad_platform(platform_key)
    if not isinstance(platform, AdPlatformTokenSideloadMixin):
        raise CLIError("Cannot sideload this platform")

    refresh_token, integration_metadata = platform.exercise_oauth_sideload(
        access_token
    )

    oauth = AdPlatformOAuthToken(
        client_id=authz_scope.client_id,
        business_id=authz_scope.business_id,
        user_id=uuid.UUID(user_id),
        platform_key=platform_key,
        integration_metadata=integration_metadata
    )
    oauth.set_token_from_cleartext(refresh_token)

    session.add(oauth)
    session.commit()

# Analysis.
@cli.verb(with_session=True, short_names={ "cid": "campaign_id" })
def run_analysis(session: Session, *, campaign_id: str):
    """
    Run analysis for a specific campaign.
    """
    try:
        campaign_id = uuid.UUID(campaign_id)
    except ValueError:
        raise CLIError("Invalid campaign ID: " + campaign_id) from None

    campaign = Campaign.get(session, campaign_id)
    if not campaign:
        raise CLIError("Campaign not found: " + str(campaign_id))

    run_campaign_analysis(session, campaign)

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
def client_login(*, root_url: Optional[str] = None):
    """
    Log in to the API and output a token.
    """
    root_url = root_url or "http://localhost/api/v1"

    token, auth = _user_prompt_login(root_url)

    print("Token: ", token)
    print("Auth: ", auth)

@cli.verb(short_names={ "r": "root_url" })
def client(*, root_url: Optional[str] = None):
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
    session: Session, days: Union[int, str] = 0, hours: Union[int, str] = 0
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
                                f"{{"{key}"}}",
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
