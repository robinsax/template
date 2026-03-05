"""
Mock implementations required for integration suite runs.
"""
from backend.mail import Mailer, MailContent

class MockMailer(Mailer):
    """
    Mock mailer implementation that collects sent emails for inspection.
    """
    emails: list[tuple[str, str]]

    def __init__(self):
        self.emails = []

    def do_send(self, recipient_addr: str, content: MailContent):
        self.emails.append((recipient_addr, content.body))
