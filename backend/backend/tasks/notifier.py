"""
Email notification sender.
"""
import traceback
from typing import Optional
from logging import getLogger
from sqlalchemy.orm import Session

from backend.model import Notification, NotificationEmailStatus
from backend.mail import Mailer, get_mailer
from backend.service import task

logger = getLogger(__name__)

@task(interval_seconds=10)
def send_notification_emails(session: Session, mailer: Optional[Mailer] = None):
    """
    Attempt to send all pending email notifications. Marks any notifications for which
    there is no email as "skipped".
    """
    mailer = mailer or get_mailer()
    notifications = Notification.get_all_with_email_pending(session)

    for notification in notifications:
        try:
            sent = mailer.maybe_send_for_notification(session, notification)
        except Exception as err: # pylint: disable=broad-except
            logger.error(
                "notif send err %s: %s: %s",
                notification.id, str(err), "".join(traceback.format_tb(err.__traceback__))
            )

            notification.email_status = NotificationEmailStatus.ERROR
            session.commit()
            continue

        if not sent:
            notification.email_status = NotificationEmailStatus.SKIPPED
        else:
            notification.email_status = NotificationEmailStatus.SENT

        session.commit()
