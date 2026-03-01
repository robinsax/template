"""
User, authentication, and authorization setup steps.
"""
import re
from typing import Optional
from urllib.parse import unquote

from backend.api import (
    AuthResp, AuthParams, UserInviteParams, UserClaimParams,
    UserGrantUpdateParams
)
from backend.model import (
    AuthKeyRestriction, UserModel, UserType, User, UserGrantModel, Role
)

from ..base import StepsContext, step, any_of, output
from ..fuzzy import make_name, make_num, make_valid_password, make_next_int

# Helpers.
def _login_request(context: StepsContext, email: str, password: str):
    context.authorization = None

    resp: AuthResp = context.post(
        "/auth",
        AuthParams(
            email=email,
            password=password
        )
    )

    context.authorization = resp.token

    return {
        "token": resp.token,
        "email": email,
        "password": password,
        "user_id": resp.auth.user_id
    }

def _invite_user(context: StepsContext, user_type: UserType):
    email = (
        str(make_next_int()) +
        str(make_num(1000000)) +
        "@kedet-integration-suite.com"
    )
    name = make_name(2)

    resp: UserModel = context.post(
        "/users",
        UserInviteParams(
            email=email,
            name=name,
            locale=context.get_output(any_locale, "locale"),
            type=user_type
        )
    )

    return {
        "user_id": resp.id,
        "email": email
    }

def _create_grant(
    context: StepsContext, role: Role, user_id: str, client_id: str,
    business_id: Optional[str] = None
):
    endpoint = "/clients/" + client_id
    if business_id:
        endpoint += "/businesses/" + business_id

    resp: UserGrantModel = context.put(
        endpoint + "/users/" + user_id,
        UserGrantUpdateParams(role=role)
    )

    if str(resp.user_id) != user_id or str(resp.client_id) != client_id:
        context.fail("Grant not created")

    return { "grant_id": resp.id }

# Locales.
@step()
def en_us_locale(context: StepsContext): # pylint: disable=unused-argument
    return { "locale": "en_US" }

@step()
def fr_fr_locale(context: StepsContext): # pylint: disable=unused-argument
    return { "locale": "fr_FR" }

any_locale = any_of(en_us_locale, fr_fr_locale)

# Admin provision (entrypoint for most chains).
@step()
def platform_owner_user(context: StepsContext):
    """
    Create an platform owner user.
    """
    email = (
        str(make_next_int()) +
        str(make_num(1000000)) +
        "@kedet-integration-suite.com"
    )
    name = make_name(2)
    password = make_valid_password()

    context.cli([
        "user", "create",
        "--name", name,
        "--email", email,
        "--password", password,
        "--owner", "true"
    ])

    with context.get_session() as session:
        user = User.get_by_email(session, email)

    return {
        "email": email,
        "password": password,
        "user_id": str(user.id)
    }

@step(needs=[platform_owner_user])
def admin_role(
    context: StepsContext,
    email: str = output(platform_owner_user, "email"),
    password: str = output(platform_owner_user, "password"),
    user_id: str = output(platform_owner_user, "user_id")
):
    """
    Configure a created account as an admin, then log in as it.
    """
    context.cli([
        "user", "role", "assign",
        "--email", email,
        "--role", "admin"
    ])

    return {
        "email": email,
        "password": password,
        "user_id": user_id
    }

@step(needs=[admin_role])
def admin_login(
    context: StepsContext,
    email: str = output(admin_role, "email"),
    password: str = output(admin_role, "password")
):
    """
    Log in as an admin.
    """
    return _login_request(context, email, password)

# Other user setup steps - via API with admin account.
@step(needs=[any_locale, admin_login])
def client_user_invite(context: StepsContext):
    """
    Invite a user to the platform.
    """
    return _invite_user(context, UserType.CLIENT)

@step(needs=[any_locale, admin_login])
def platform_owner_user_invite(context: StepsContext):
    """
    Invite a user to the platform.
    """
    return _invite_user(context, UserType.PLATFORM_OWNER)

any_user_invite = any_of(client_user_invite, platform_owner_user_invite)

@step(needs=[any_user_invite])
def invite_token(
    context: StepsContext,
    target_email: str = output(any_user_invite, "email")
):
    """
    Invite a user to the platform.
    """
    for recipient, content in context.get_sent_emails():
        if recipient == target_email:
            return {
                "token": unquote(re.split(r"\s", content.split("invite=")[1])[0])
            }

    context.fail("No invite token found")

@step(needs=[invite_token])
def invite_token_claim(
    context: StepsContext,
    token: str = output(invite_token, "token")
):
    """
    Assert a user invite token can be used for general authentication.
    """
    password = make_valid_password()

    user: UserModel = context.post(
        "/invites",
        UserClaimParams(
            invite_token=token,
            password=password
        )
    )

    return {
        "user_id": user.id,
        "email": user.email,
        "password": password
    }

# Role permutations.
@step(needs=["client", client_user_invite, invite_token_claim])
def client_manager_role(
    context: StepsContext,
    client_id: str = output("client", "client_id"),
    user_id: str = output(invite_token_claim, "user_id"),
    email: str = output(invite_token_claim, "email"),
    password: str = output(invite_token_claim, "password")
):
    """
    Assigns a member role to a user.
    """
    return {
        "email": email,
        "password": password,
        "user_id": user_id,
        "client_id": client_id,
        **_create_grant(context, Role.MANAGER, user_id, client_id)
    }

@step(needs=[client_manager_role])
def client_manager_login(
    context: StepsContext,
    client_id: str = output(client_manager_role, "client_id"),
    email: str = output(client_manager_role, "email"),
    password: str = output(client_manager_role, "password")
):
    """
    Log in as a client manager.
    """
    return {
        "client_id": client_id,
        **_login_request(context, email, password)
    }

@step(needs=["business", client_user_invite, invite_token_claim])
def business_member_role(
    context: StepsContext,
    client_id: str = output("business", "client_id"),
    business_id: str = output("business", "business_id"),
    user_id: str = output(invite_token_claim, "user_id")
):
    """
    Assigns a member role to a user.
    """
    return {
        "email": context.get_output(invite_token_claim, "email"),
        "password": context.get_output(invite_token_claim, "password"),
        "user_id": user_id,
        "client_id": client_id,
        "business_id": business_id,
        **_create_grant(context, Role.MEMBER, user_id, client_id, business_id)
    }

@step(needs=[business_member_role])
def business_member_login(
    context: StepsContext,
    client_id: str = output(business_member_role, "client_id"),
    business_id: str = output(business_member_role, "business_id"),
    email: str = output(business_member_role, "email"),
    password: str = output(business_member_role, "password")
):
    """
    Log in as a business member.
    """
    return {
        "client_id": client_id,
        "business_id": business_id,
        **_login_request(context, email, password)
    }

# Other auth steps.
any_login = any_of(admin_login, client_manager_login, business_member_login)

@step(needs=[any_login])
def logout(context: StepsContext):
    """
    Log out.
    """
    context.delete("/auth")

@step(needs=[any_login])
def asset_get_token(context: StepsContext):
    """
    Provision a token with the "asset get" restriction.
    """
    resp: AuthResp = context.post(
        "/auth",
        AuthParams(restriction=AuthKeyRestriction.ASSET_GET)
    )

    return { "token": resp.token }