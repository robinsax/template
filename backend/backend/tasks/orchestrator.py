'''
Background tasks implementing campaign orchestration.
'''
import logging
from datetime import timedelta, datetime
from sqlalchemy import DateTime, cast, and_
from sqlalchemy.orm import Session

from kedet.channels import orchestration_call_context
from kedet.model import (
    Campaign, CampaignStatus, CampaignChannelStatus, CampaignChannelOrchestrationRunType,
    CampaignChannel, Notification, NotificationType, CampaignChannelReviewDecision,
    Audit, CampaignAuditEvent, current_datetime
)
from kedet.service import task, task_batch_query

logger = logging.getLogger(__name__)

def publish_campaign_channel(
    session: Session, channel: CampaignChannel, *, allow_invalid: bool = False
):
    '''
    Publish a single campaign channel.
    '''
    call_context = orchestration_call_context(
        session, channel, CampaignChannelOrchestrationRunType.PUBLISH
    )

    with call_context() as call:
        ad_platform, context = call

        if not channel.validation.valid and not allow_invalid:
            # Sanity check that channel is valid before attempting publish.
            logger.warning(
                'Channel %s is not valid, skipping publish', channel.id
            )
            return

        ad_platform.publish(context)

        # Update status to published if it was previously initial state.
        if not channel.status:
            channel.status = CampaignChannelStatus.PUBLISHED

        channel.needs_publish = False

def poll_campaign_channel_reviews(session: Session, channel: CampaignChannel):
    '''
    Poll reviews for a single campaign channel.
    '''
    call_context = orchestration_call_context(
        session, channel, CampaignChannelOrchestrationRunType.POLL_REVIEW
    )

    with call_context() as call:
        ad_platform, context = call

        reviews = ad_platform.poll_review(context)

        # Assign run ID.
        channel_review = None
        for review in reviews:
            review.orchestration_run_id = context.run.id
            if not review.ad_id:
                channel_review = review

        # Send notifications if channel-level decision occurred.
        if channel_review:
            campaign = channel.campaign

            # Collect users to notify.
            users = set(review.user for review in campaign.reviews)
            # Attempt to include publisher.
            publish = Audit.get_latest_for_target(
                session, campaign, [CampaignAuditEvent.STATUS_UPDATE]
            )
            if publish:
                users.add(publish.user)

            users = list(users)

            if channel_review.decision == CampaignChannelReviewDecision.APPROVED:
                Notification.create_for_all(
                    session, NotificationType.CAMPAIGN_CHANNEL_APPROVED, users,
                    target=campaign,
                    cosmetic_metadata={
                        'campaign_name': campaign.name,
                        'channel': channel.channel.label
                    }
                )

                # Unpause and queue publish.
                if channel.paused:
                    channel.paused = False
                    channel.needs_publish = True
            elif channel_review.decision == CampaignChannelReviewDecision.REJECTED:
                Notification.create_for_all(
                    session, NotificationType.CAMPAIGN_CHANNEL_REJECTED, users,
                    target=campaign,
                    cosmetic_metadata={
                        'campaign_name': campaign.name,
                        'channel': channel.channel.label
                    }
                )

        session.add_all(reviews)
        session.commit()

@task(interval_seconds=30)
def publish_campaigns(session: Session):
    '''
    Recurring task to publish campaign channels.

    Discovers campaign channels with *needs publish* set.
    '''
    batches = task_batch_query(
        session, CampaignChannel,
        CampaignChannel.needs_publish.is_(True)
    )

    for channel in batches:
        publish_campaign_channel(session, channel)

@task(interval_seconds=60 * 60)
def poll_campaign_reviews(session: Session):
    '''
    Recurring task to pull campaign review status on ad channels.

    Discovers campaign channels with *published* status.

    When campaigns are discovered to be fully approved, they are automatically
    un-paused and a publish run is queued.
    '''
    batches = task_batch_query(
        session, CampaignChannel,
        CampaignChannel.status_column() == CampaignChannelStatus.PUBLISHED
    )

    for channel in batches:
        poll_campaign_channel_reviews(session, channel)

@task(interval_seconds=60 * 60)
def campaign_status_updater(session: Session):
    '''
    Recurring task to update campaign statuses based on timing:
    - To *live* once their start date is hit and all ads channels are fully approved.
    - To *completed* once their end date is hit.

    Additionally marks campaigns that ended over a week ago as *archived*.
    '''
    # Updates from published to live.
    batches = task_batch_query(
        session, Campaign,
        Campaign.status_column() == CampaignStatus.PUBLISHED
    )

    for campaign in batches:
        if not campaign.brief.start_date:
            continue

        if campaign.brief.start_date < current_datetime():
            campaign.status = CampaignStatus.LIVE

        # Check for unapproved channels.
        any_unapproved = any(
            channel.status != CampaignChannelStatus.APPROVED
            for channel in campaign.channels
        )
        if any_unapproved:
            continue

        campaign.status = CampaignStatus.LIVE
        session.commit()

    # Updates from live to completed.
    def end_date_query(status: CampaignStatus, thresh: datetime):
        '''
        Get the query for campaigns that are in the given `status` and have an end date
        before the given `thresh`.
        '''
        return and_(
            Campaign.status_column() == status,
            Campaign.brief_column()['end_date'].is_not(None),
            cast(
                Campaign.brief_column()['end_date'].astext, DateTime(timezone=True)
            ) < thresh
        )

    now = current_datetime()
    batches = task_batch_query(
        session, Campaign,
        end_date_query(CampaignStatus.LIVE, now)
    )

    for campaign in batches:
        campaign.status = CampaignStatus.COMPLETED
        session.commit()

    # Mark campaigns that ended over a week ago as archived.
    week_ago = now - timedelta(days=7)
    batches = task_batch_query(
        session, Campaign,
        end_date_query(CampaignStatus.COMPLETED, week_ago)
    )

    for campaign in batches:
        campaign.archived = True
        session.commit()
