from kedet.config import ConfigError, config

from .base import Mailer, MailContent
from .dummy import DummyMailer
from .smtp import SMTPMailer

def get_mailer() -> Mailer:
    '''
    Return the configured `Mailer`.
    '''
    mailer = config.mailer.get()

    if mailer == 'smtp':
        return SMTPMailer()

    if mailer == 'dummy':
        return DummyMailer()

    raise ConfigError('invalid mailer: ' + mailer)
