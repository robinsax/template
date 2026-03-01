"""
Notification email renderers.
"""
from datetime import timedelta
from urllib.parse import urlencode
from sqlalchemy.orm import Session

from backend.config import config
from backend.logic import id_to_app_url_form
from backend.model import (
    NotificationType, Notification, AuthKey, Campaign, AuthKeyRestriction,
    UserType, ROLE_USER_TYPES, current_datetime
)

from .common import MailContent, mail_renderer, render_template

@mail_renderer(NotificationType.INVITED)
def render_invited(
    session: Session, notification: Notification, locale: str
) -> MailContent:
    """
    Render an invited notification.
    """
    # Create invite key and token.
    expiry = (
        current_datetime() +
        timedelta(days=config.auth_key_invitation_expiry_days.get())
    )
    invite_key = AuthKey(
        user_id=notification.owner.id,
        expires_at=expiry,
        restriction=AuthKeyRestriction.INVITATION
    )
    token = invite_key.generate_token()

    session.add(invite_key)
    session.commit()

    return render_template(locale, "invite.html", {
        "origin": config.service_origin.get(),
        "url_params": urlencode({ "invite": token })
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
        user_id=notification.owner.id,
        expires_at=expiry,
        restriction=AuthKeyRestriction.PASSWORD_RESET
    )
    token = reset_key.generate_token()

    session.add(reset_key)
    session.commit()

    return render_template(locale, "password_reset.html", {
        "origin": config.service_origin.get(),
        "url_params": urlencode({ "reset": token, "user": notification.owner.id })
    })

@mail_renderer(NotificationType.COMMENT_REPLY)
def render_comment_reply(
    session: Session, notification: Notification, locale: str
) -> MailContent:
    """
    Render a comment reply notification.
    """
    replier = notification.user

    campaign = notification.get_target_or_die(session, Campaign)

    return render_template(locale, "comment_reply.html", {
        "origin": config.service_origin.get(),
        "replier": replier,
        "campaign_url_id": id_to_app_url_form(campaign.id),
        "campaign": campaign
    })

@mail_renderer(NotificationType.CAMPAIGN_CREATED)
def render_campaign_created(
    session: Session, notification: Notification, locale: str
) -> MailContent:
    """
    Render a campaign created notification.
    """
    campaign = notification.get_target_or_die(session, Campaign)

    return render_template(locale, "campaign_created.html", {
        "origin": config.service_origin.get(),
        "campaign": campaign,
        "business": campaign.business,
        "creator": notification.user,
        "campaign_url_id": id_to_app_url_form(campaign.id)
    })

@mail_renderer(NotificationType.CAMPAIGN_SUBMITTED)
def render_campaign_submitted(
    session: Session, notification: Notification, locale: str
) -> MailContent:
    """
    Render a campaign submitted notification.
    """
    campaign = notification.get_target_or_die(session, Campaign)

    return render_template(locale, "campaign_submitted.html", {
        "origin": config.service_origin.get(),
        "campaign": campaign,
        "submitter": notification.user,
        "campaign_url_id": id_to_app_url_form(campaign.id)
    })

@mail_renderer(NotificationType.CAMPAIGN_CHANGES_REQUESTED)
def render_campaign_changes_requested(
    session: Session, notification: Notification, locale: str
) -> MailContent:
    """
    Render a campaign changes requested notification.
    """
    campaign = notification.get_target_or_die(session, Campaign)

    return render_template(locale, "campaign_changes_requested.html", {
        "origin": config.service_origin.get(),
        "campaign": campaign,
        "reviewer": notification.user,
        "campaign_url_id": id_to_app_url_form(campaign.id)
    })

@mail_renderer(NotificationType.CAMPAIGN_APPROVED)
def render_campaign_approved(
    session: Session, notification: Notification, locale: str
) -> MailContent:
    """
    Render a campaign approved notification.
    """
    campaign = notification.get_target_or_die(session, Campaign)

    return render_template(locale, "campaign_approved.html", {
        "origin": config.service_origin.get(),
        "campaign": campaign,
        "reviewer": notification.user,
        "campaign_url_id": id_to_app_url_form(campaign.id)
    })

@mail_renderer(NotificationType.CAMPAIGN_PUBLISHED)
def render_campaign_published(
    session: Session, notification: Notification, locale: str
) -> MailContent:
    """
    Render a campaign published notification.
    """
    campaign = notification.get_target_or_die(session, Campaign)

    # Include business and client context for platform owners.
    business_context = None
    is_platform_owner = any(
        ROLE_USER_TYPES[grant.role] == UserType.PLATFORM_OWNER
        for grant in notification.owner.grants
    )
    if is_platform_owner:
        business_context = campaign.business

    return render_template(locale, "campaign_published.html", {
        "origin": config.service_origin.get(),
        "campaign": campaign,
        "publisher": notification.user,
        "business_context": business_context,
        "campaign_url_id": id_to_app_url_form(campaign.id)
    })

@mail_renderer(NotificationType.CAMPAIGN_CHANNEL_APPROVED)
def render_campaign_channel_approved(
    session: Session, notification: Notification, locale: str
) -> MailContent:
    """
    Render a campaign channel approved notification.
    """
    campaign = notification.get_target_or_die(session, Campaign)

    return render_template(locale, "campaign_channel_approved.html", {
        "origin": config.service_origin.get(),
        "campaign": campaign,
        "campaign_url_id": id_to_app_url_form(campaign.id)
    })

@mail_renderer(NotificationType.CAMPAIGN_CHANNEL_REJECTED)
def render_campaign_channel_rejected(
    session: Session, notification: Notification, locale: str
) -> MailContent:
    """
    Render a campaign channel rejected notification.
    """
    campaign = notification.get_target_or_die(session, Campaign)

    return render_template(locale, "campaign_channel_rejected.html", {
        "origin": config.service_origin.get(),
        "campaign": campaign,
        "campaign_url_id": id_to_app_url_form(campaign.id)
    })
