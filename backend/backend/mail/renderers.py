"""
Notification email renderers.
"""
from datetime import timedelta
from urllib.parse import urlencode
from sqlalchemy.orm import Session

from backend.config import config
from backend.model import (
    NotificationType, Notification, AuthKey, AuthKeyRestriction,
    current_datetime
)

from .common import MailContent, mail_renderer, render_template

@mail_renderer(NotificationType.CONFIRM_EMAIL)
def render_confirm_email(
    session: Session, notification: Notification, locale: str
) -> MailContent:
    """
    Render an email for address confirmation during account creation.
    """
    # Create invite key and token.
    expiry = (
        current_datetime() +
        timedelta(days=config.auth_key_invitation_expiry_days.get())
    )
    invite_key = AuthKey(
        user_id=notification.user.id,
        expires_at=expiry,
        restriction=AuthKeyRestriction.EMAIL_CONFIRM
    )
    token = invite_key.generate_token()

    session.add(invite_key)
    session.commit()

    return render_template(locale, "confirm_email.html", {
        "origin": config.service_origin.get(),
        "url_params": urlencode({ "confirm": token })
    })

@mail_renderer(NotificationType.PASSWORD_RESET)
def render_password_reset(
    session: Session, notification: Notification, locale: str
) -> MailContent:
    """
    Render a password reset notification.
    """
    # Create password reset key and token.
    expiry = (
        current_datetime() +
        timedelta(hours=config.auth_key_password_reset_expiry_hours.get())
    )
    reset_key = AuthKey(
        user_id=notification.user.id,
        expires_at=expiry,
        restriction=AuthKeyRestriction.PASSWORD_RESET
    )
    token = reset_key.generate_token()

    session.add(reset_key)
    session.commit()

    return render_template(locale, "password_reset.html", {
        "origin": config.service_origin.get(),
        "url_params": urlencode({ "reset": token, "user": notification.user.id })
    })
