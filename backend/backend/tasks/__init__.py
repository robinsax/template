"""
Background tasks.
"""
from backend.service import create_app, scheduler_lifespan

from . import notifier

# Background tasks run as FastAPI lifespan in Cloud Run to enable healthchecks.
app = create_app("/", scheduler_lifespan)
