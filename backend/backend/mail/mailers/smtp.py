'''
SMTP mailer.
'''
from smtplib import SMTP
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from kedet.config import config

from .base import Mailer, MailContent

class SMTPMailer(Mailer):
    '''
    SMTP-backed mailer implementation.
    '''
    host: str
    port: int
    user: str
    password: str

    def __init__(self):
        self.host = config.smtp_host.get()
        self.port = config.smtp_port.get()
        self.user = config.smtp_user.get()
        self.password = config.smtp_password.get()

    def do_send(self, recipient_addr: str, content: MailContent):
        '''
        Send the email.
        '''
        msg = MIMEMultipart()
        msg['From'] = self.user
        msg['To'] = recipient_addr
        msg['Subject'] = content.subject
        msg.attach(MIMEText(content.body, 'plain'))

        # Log sent messages in dev mode to make multi-account testing possible.
        if config.dev_mode.get():
            print('SMTPMailer: ' + msg.as_string())
            return

        with SMTP(self.host, self.port) as smtp:
            smtp.starttls()
            smtp.login(self.user, self.password)
            smtp.sendmail(self.user, recipient_addr, msg.as_string())
