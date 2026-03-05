"""
Authentication endpoints.
"""
from typing import Optional
from datetime import timedelta
from fastapi import Request, Depends
from sqlalchemy.orm import Session

from backend.config import config
from backend.model import (
    Model, User, AuthKey, AuthKeyModel, AuthKeyRestriction, Notification,
    NotificationType, current_datetime
)
from backend.service import (
    Unauthorized, Invalid, get_current_auth_key, get_session, get_current_user
)

from .base import app

# Auth keys.
class AuthParams(Model):
    """
    Authentication JSON body.

    Either:
    - `email` and `password` must be provided, or
    - An `Authorization` header must be provided.

    In some cases both `Authorization` and `password` are required.

    `restriction` can be set to generate a restricted key.
    """
    email: Optional[str] = None
    password: Optional[str] = None
    restriction: Optional[AuthKeyRestriction] = None

class AuthResp(Model):
    """
    Response upon successful authentication. Contains a token and the `AuthKeyModel`
    associated to it.
    """
    token: str
    auth: AuthKeyModel

@app.post("/auth")
def provision_auth_key(
    req: Request, params: AuthParams, session: Session = Depends(get_session)
) -> AuthResp:
    """
    Provision an expiring authentication key and corresponding `token` that can be
    provided to authenticate under it.

    Behavior depends on the specified `restriction`:
    - `null`
        - Unrestricted, general purpose authentication.
        - Token must be passed in the `Authorization` header.
    - `asset_get`
        - Usable to get asset media from the /uploads/campaign_assets/<id> endpoint or
          the streaming API.
        - Provided in a query parameter when doing so.
        - Short lifespan.
    - `password_reset`
        - Usable to change your own password.
        - Both an existing unrestricted key, and `password`, must be provided.
        - Reset link emails contain a token for an equivalent key.
    """
    # Validate credentials.
    if params.email and params.password:
        user = User.get_by_email(session, params.email)

        if not user or not user.check_password(params.password):
            raise Invalid("invalid_credentials")
    else:
        user = get_current_user(req, session)

    if user.is_inactive:
        raise Unauthorized("inactive_user")

    # Solve restriction and expiry.
    restriction = None
    expiry_delta = timedelta(hours=config.auth_key_expiry_hours.get())
    if params.restriction:
        try:
            restriction = AuthKeyRestriction(params.restriction)
        except ValueError:
            raise Invalid("invalid_restriction") from None

        if restriction == AuthKeyRestriction.ASSET_GET:
            expiry_delta = timedelta(
                minutes=config.auth_key_asset_get_expiry_minutes.get()
            )
        elif restriction == AuthKeyRestriction.PASSWORD_RESET:
            # Also require password for reset tokens (block physical session
            # hijack).
            if not params.password or not user.check_password(params.password):
                raise Invalid("invalid_password")

            expiry_delta = timedelta(
                hours=config.auth_key_password_reset_expiry_hours.get()
            )
        else:
            raise Invalid("invalid_restriction")

    # Create key with default expiry.
    key = AuthKey(
        user_id=user.id,
        restriction=restriction,
        expires_at=current_datetime() + expiry_delta
    )
    token = key.generate_token()

    session.add(key)
    session.commit()
    session.refresh(key)

    return AuthResp(
        token=token,
        auth=key.to_model()
    )

@app.put("/auth")
def refresh_auth_key(
    req: Request, session: Session = Depends(get_session)
) -> AuthKeyModel:
    """
    Refresh the current authentication key to defer expiry.
    """
    key = get_current_auth_key(req, session)
    if not key:
        raise Unauthorized("invalid_auth")

    key.refresh(
        current_datetime() + timedelta(hours=config.auth_key_expiry_hours.get())
    )

    session.commit()
    session.refresh(key)

    return key.to_model()

@app.delete("/auth")
def revoke_auth_key(
    req: Request, session: Session = Depends(get_session)
) -> AuthKeyModel:
    """
    Immediately revoke the current authentication key.
    """
    key = get_current_auth_key(req, session)
    if not key:
        raise Unauthorized("invalid_auth")

    key.revoke()
    session.commit()

    return key.to_model()

# Password resets.
class PasswordResetRequestParams(Model):
    email: str

@app.post("/auth/password-resets")
def request_password_reset(
    params: PasswordResetRequestParams, session: Session = Depends(get_session)
) -> None:
    """
    Anonymously request a password reset for the user with the given email.
    """
    user = User.get_by_email(session, params.email)
    if not user:
        return None

    # Notification email renderer will generate the token and key.
    Notification.create(session, NotificationType.PASSWORD_RESET, user)
    session.commit()

    return None
