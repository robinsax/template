"""
Common HTTP service authentication and authorization helpers.
"""
from typing import Optional
from fastapi import Request, Depends
from sqlalchemy.orm import Session

from backend.model import (
    AuthKey, AuthKeyRestriction, User, Permission, Role, Realm
)
from backend.logic import check_authz, check_scopeless_authz, check_role_assign_authz

from ..database import get_session
from .exc import Unauthorized

def get_current_auth_key(
    req: Request, session: Session, *,
    allowed_restriction: Optional[AuthKeyRestriction] = None
) -> Optional[AuthKey]:
    """
    Return the `AuthKey` provided in the request if it is valid.
    """
    token = req.headers.get("Authorization")
    if not token:
        return None

    key = AuthKey.get_for_token(
        session, token, allowed_restriction=allowed_restriction
    )
    if not key or not key.is_valid:
        return None

    return key

def get_current_user(req: Request, session: Session = Depends(get_session)) -> User:
    """
    Return the `User` to which the `AuthKey` provided in the request belongs, if it was
    valid.
    """
    key = get_current_auth_key(req, session)
    if not key:
        raise Unauthorized("authenticate")

    return key.user

def assert_authz(
    user: User, realm: Realm, permission: Permission | None = None
):
    """
    Raise `Unauthorized` if `check_authz` fails. Use this for authorization checks
    in endpoints.
    """
    check = check_authz(user, realm, permission)
    if not check:
        raise Unauthorized("unauthorized")

def assert_authz_any(
    user: User, realm: Realm, permissions: list[Permission]
):
    """
    Raise `Unauthorized` if `check_authz` fails for every one of the given permissions.
    Use to check whether the user has one of several permissions in endpoints.
    """
    for permission in permissions:
        check = check_authz(user, realm, permission)
        if check:
            return

    raise Unauthorized("unauthorized")

def assert_scopeless_authz(user: User, permission: Permission):
    """
    Raise `Unauthorized` if `check_scopeless_authz` fails. Use this for scopeless
    authorization checks in endpoints.
    """
    check = check_scopeless_authz(user, permission)
    if not check:
        raise Unauthorized("unauthorized")

def assert_role_assign_authz(user: User, realm: Realm, role: Role):
    """
    Raise `Unauthorized` if `check_role_assign_authz` fails. Use this for grant set
    authorization checks in endpoints.
    """
    check = check_role_assign_authz(user, realm, role)
    if not check:
        raise Unauthorized("unauthorized")
