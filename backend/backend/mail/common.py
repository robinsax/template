"""
Email template management.
"""
import os
from typing import Any, Callable
from dataclasses import dataclass
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session

from backend.model import NotificationType, Notification
from backend.logic import t_for_locale

@dataclass
class MailContent:
    """
    Mail content representation.
    """
    subject: str
    body: str

MailRenderFn = Callable[[Session, Notification, str], MailContent]

_renderers: dict[NotificationType, MailRenderFn] = {}

def mail_renderer(notification_type: NotificationType):
    """
    Register a mail renderer function for `notification_type`.
    """
    def decorator(render_fn: MailRenderFn):
        _renderers[notification_type] = render_fn

        return render_fn

    return decorator

def get_renderer(notification_type: NotificationType):
    """
    Return the renderer function for `notification_type`, or `None` if there isn't one.
    """
    return _renderers.get(notification_type)

def render_template(locale: str, template_name: str, context: dict[str, Any]):
    """
    Render `template_name` in the given `locale`, with the given template context.
    """
    loader_path = os.path.join(os.path.dirname(__file__), "templates")
    env = Environment(loader=FileSystemLoader(loader_path))

    template = env.get_template(template_name)

    content = template.render({
        **context,
        "t": t_for_locale(locale)
    })

    subject, body = content.split("$$$")

    return MailContent(
        subject=subject,
        body=body
    )
