'''
Ad platform oauth token rotator.
'''
from datetime import timedelta
from sqlalchemy import and_
from sqlalchemy.orm import Session

from kedet.channels import get_ad_platform
from kedet.model import AdPlatformOAuthToken, current_datetime
from kedet.service import task, task_batch_query

@task(interval_seconds=60 * 60 * 24)
def synchronize_ad_platforms(session: Session):
    '''
    Invoke `AdPlatform.synchronize_oauth` for all active OAuth integrations, allowing
    token rotation and other account-level metadata updates.
    '''
    batches = task_batch_query(
        session, AdPlatformOAuthToken,
        and_(
            AdPlatformOAuthToken.disabled.is_(False),
            AdPlatformOAuthToken.last_rotated_at < current_datetime() - timedelta(days=2),
        )
    )
    for token in batches:
        ad_platform = get_ad_platform(token.platform_key)

        ad_platform.synchronize_oauth(token)

        session.commit()
