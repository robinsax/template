"""
This package implements all data models, dependency adapters, business logic, and
services of backend.

The adapter pattern is used for function points including ad channels, email dispatchers,
and file storage backends. This works as follows:
- A base type is defined in the `base` of the topic package.
    - e.g. `Mailer` in `backend.mail.base`.
- Implementations are defined in the topic package.
    - e.g. `DummyMailer` in `backend.mail.dummy`.
- A factory function is defined in the topic package, which checks configuration to
    instantiate the appropriate implementation(s).
    - e.g. `get_mailer` in `backend.mail`.
- This factory function is called directly, or used as a `Depends` in API endpoints, to
    retrieve the appropriate implementation.
"""
# pylint: disable=wrong-import-position,wrong-import-order
import logging
import warnings

# Suppress annoying warnings that we don't care about.
logging.getLogger("tzlocal").setLevel(logging.WARNING)
logging.getLogger("google.cloud.storage._opentelemetry_tracing")\
    .setLevel(logging.WARNING)
logging.getLogger("charset_normalizer").setLevel(logging.WARNING)
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

from backend.service import configure_logging

configure_logging()

from . import (
    config, model, api, storage, mail, logic, service, commands, tasks
)

from types import ModuleType
__all__ = [name for name, value in locals().items() if isinstance(value, ModuleType)]
