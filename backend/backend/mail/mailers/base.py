"""
Email dispatcher adapter base.
"""
from sqlalchemy.orm import Session

from backend.config import config
from backend.model import Notification

from ..common import MailContent, get_renderer

class Mailer:
    """
    Generic email dispatcher.
    """

    def maybe_send_for_notification(
        self, session: Session, notification: Notification
    ) -> bool:
        """
        Send an email for the given `notification` if the renderer for it exists and
        chooses to render it.
        """
        renderer = get_renderer(notification.type)
        if not renderer:
            return False

        content = renderer(
            session, notification,
            notification.owner.locale or config.default_locale.get()
        )
        if not content:
            return False

        self.do_send(notification.owner.email, content)
        return True

    def do_send(self, recipient_addr: str, content: MailContent):
        """
        Dispatch the provided email to the given recipients.

        Implementations must override.
        """
        raise NotImplementedError()
