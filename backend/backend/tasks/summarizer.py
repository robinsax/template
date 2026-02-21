'''
Periodic campaign brief summarization.
'''
from logging import getLogger
from datetime import timedelta
from sqlalchemy.orm import Session

from kedet.ai import generate_campaign_summary
from kedet.model import (
    Campaign, Audit, CampaignAuditEvent, Location, current_datetime
)
from kedet.service import task, task_batch_query

logger = getLogger(__name__)

@task(interval_seconds=60)
def summarize_campaigns(session: Session):
    '''
    Summarizes the campaign strategy and attaches the summary to the campaign.
    '''
    for campaign in task_batch_query(session, Campaign):
        if campaign.ai_summarized_at:
            last_update = Audit.get_latest_for_target(session, campaign, [
                CampaignAuditEvent.CREATE,
                CampaignAuditEvent.BRIEF_UPDATE,
                CampaignAuditEvent.LOCATIONS_UPDATE,
                CampaignAuditEvent.CHANNELS_UPDATE
            ])

            # Unreachable case unless something breaks.
            if not last_update:
                continue

            # Skip if we already summarized since last update.
            if campaign.ai_summarized_at > last_update.occurred_at:
                continue

            # Skip if it just changed (expect currently changing).
            if current_datetime() - last_update.occurred_at < timedelta(minutes=1):
                logger.debug('skip campaign %s: recency', campaign.id)
                continue

        logger.info('summarizing campaign: %s', campaign.id)

        location_ids = [loc.id for loc in campaign.locations]
        locations = Location.get_all(session, location_ids)

        channel_names = []
        for channel in campaign.channels:
            channel_names.append(channel.channel.label)

        location_names = [loc.name for loc in locations]

        campaign.ai_summary = generate_campaign_summary(
            campaign, channel_names, location_names
        )
        campaign.ai_summarized_at = current_datetime()
        session.commit()
