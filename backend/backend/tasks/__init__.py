'''
Background tasks.
'''
from kedet.service import create_app, scheduler_lifespan

from . import orchestrator, summarizer, oauth_synchronizer, notifier, video_processor
from .analyzer import run_campaign_analysis
from .orchestrator import publish_campaign_channel, poll_campaign_channel_reviews

# Background tasks run as FastAPI lifespan in Cloud Run to enable healthchecks.
app = create_app('/', scheduler_lifespan)
