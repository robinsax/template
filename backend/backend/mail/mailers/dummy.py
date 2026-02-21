'''
Dummy email dispatcher that logs "sent" messages to stderr.
'''
import sys

from .base import MailContent, Mailer

LOG_FORMAT = '''
To: %s
Subject: %s

%s
'''.strip()

class DummyMailer(Mailer):

    def do_send(self, recipient_addr: str, content: MailContent):
        '''
        Print the email to stderr.
        '''
        print(
            LOG_FORMAT%(recipient_addr, content.subject, content.body),
            file=sys.stderr
        )
