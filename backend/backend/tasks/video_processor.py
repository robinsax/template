"""
Video metadata extraction and thumbnail generation.
"""
import traceback
from logging import getLogger
from sqlalchemy import and_
from sqlalchemy.orm import Session

from backend.model import (
    Upload, UploadType, Audit, BasicAuditEvent, UploadVideoMetadataModel, Campaign,
    Asset
)
from backend.service import task, task_batch_query
from backend.logic import (
    get_video_thumbnail, get_video_metadata, resize_image, validate_campaign,
    correct_video_rotation, rotate_image
)
from backend.storage import get_storage_backend

logger = getLogger(__name__)

VIDEO_THUMB_BASIS_SIZE = 256 * 2

def _get_thumb_size(width: int, height: int) -> tuple[int, int]:
    """
    Get the thumbnail size for the given `width` and `height`.
    """
    if width > height:
        thumb_width = VIDEO_THUMB_BASIS_SIZE
        thumb_height = int(height / width * VIDEO_THUMB_BASIS_SIZE)
    else:
        thumb_height = VIDEO_THUMB_BASIS_SIZE
        thumb_width = int(width / height * VIDEO_THUMB_BASIS_SIZE)

    return thumb_width, thumb_height

@task(interval_seconds=10)
def process_uploaded_videos(session: Session): # pylint: disable=too-many-locals
    """
    Extracts metadata and generates thumbnails for video assets.
    """
    storage = get_storage_backend()

    batches = task_batch_query(
        session, Upload,
        and_(
            Upload.type_column() == UploadType.CAMPAIGN_ASSETS,
            Upload.content_type.ilike("video/%"),
            Upload.thumbnail_id.is_(None),
            Upload.processing_aborted.is_not(True)
        )
    )
    for upload in batches:
        try:
            # Load audit for attributions.
            creation = Audit.get_latest_for_target(session, upload)
            asset_upload_id = upload.id

            with storage.read(upload) as video_data:
                # Process video data.
                duration, (width, height), rotation = get_video_metadata(
                    video_data
                )
                video_data.seek(0)

                thumbnail_data = get_video_thumbnail(video_data)
                video_data.seek(0)

                # Correct rotation into replaced uploaded, if needed.
                if rotation:
                    video_data = correct_video_rotation(video_data, rotation)
                    video_data.seek(0)

                    width, height = height, width

                    upload.processing_aborted = True

                    upload = storage.upload(
                        session, upload.authz_scope, upload.type,
                        upload.filename, video_data
                    )
                    Audit.create(
                        session, creation.user, upload, BasicAuditEvent.CREATE
                    )

                    thumbnail_data = rotate_image(thumbnail_data, degrees=rotation)
                    thumbnail_data.seek(0)

            # Create thumbnail.
            thumbnail_data = resize_image(
                thumbnail_data,
                size=_get_thumb_size(width, height),
                out_format="JPEG"
            )

            # Create thumbnail upload and audit.
            thumbnail_upload = storage.upload(
                session, upload.authz_scope, UploadType.THUMBNAILS,
                "thumbnail.jpg", thumbnail_data
            )
            Audit.create(session, creation.user, thumbnail_upload, BasicAuditEvent.CREATE)

            # Update upload.
            upload.thumbnail_id = thumbnail_upload.id
            upload.video_metadata = UploadVideoMetadataModel(
                width=width,
                height=height,
                duration=duration
            )

            session.commit()

            # If the video is associated with an asset, revalidate now that we have
            # metadata.
            asset = Asset.get_for_upload(session, asset_upload_id)
            if not asset:
                continue

            asset.upload_id = upload.id
            session.commit()
            session.refresh(asset)

            campaign = Campaign.get(session, asset.campaign_id)
            validate_campaign(session, campaign)
            session.commit()
        except Exception as err: # pylint: disable=broad-exception-caught
            logger.error(
                "Process failed: %s: %s: %s",
                upload.id, str(err),
                "".join(traceback.format_tb(err.__traceback__))
            )

            upload.processing_aborted = True
            session.commit()
