'''
File upload and upload retrieval endpoints. File uploads are subject to authorization,
which is why these endpoints exist, rather than directly exposing a bucket or equivalent.
'''
from uuid import UUID
from fastapi import Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.model import (
    UploadType, Upload, UploadModel, User, Audit, AuthzScope, Permission,
    BasicAuditEvent, AuthKey, AuthKeyRestriction
)
from backend.storage import StorageBackend, get_storage_backend
from backend.service import (
    Unauthorized, StreamedUpload, Invalid, get_streamed_upload, get_current_user,
    assert_authz, get_session, managed_chunk_byte_stream
)

from .base import app

# Platform uploads.
AVATAR_SIZE = (512, 512)

@app.get('/uploads/{upload_type}/{upload_id:uuid}')
def get_upload(
    req: Request, upload_type: str, upload_id: UUID,
    storage: StorageBackend = Depends(get_storage_backend),
    session: Session = Depends(get_session)
) -> StreamingResponse:
    '''
    Return the content of an upload of the specific `upload_type`.

    Requires a grant containing the upload's authorization scope.
    '''
    query_token = req.query_params.get('token')
    if query_token:
        # Resolve "asset get" token authentication.
        access_token = AuthKey.get_for_token(
            session, query_token,
            allowed_restriction=AuthKeyRestriction.ASSET_GET
        )
        if not access_token or not access_token.is_valid:
            raise Unauthorized('invalid_token')

        user = access_token.user
        if user.is_inactive:
            raise Unauthorized('inactive_user')
    else:
        # Resolve normal authentication.
        user = get_current_user(req, session)

    try:
        upload_type = UploadType(upload_type)
    except ValueError:
        raise Invalid('invalid_upload_type') from None

    # Ensure "asset get" tokens are only used for campaign assets.
    if query_token and upload_type != UploadType.CAMPAIGN_ASSETS:
        raise Invalid('invalid_auth_method')

    upload = Upload.get_qualified(session, upload_type, upload_id)
    if not upload:
        raise Invalid('invalid_upload')

    filename = upload.filename.encode('ascii', 'ignore').decode('ascii')

    return StreamingResponse(
        managed_chunk_byte_stream(storage.read(upload), 0, upload.size),
        media_type=upload.content_type,
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )

def _create_upload(
    session: Session, storage: StorageBackend, user: User, authz_scope: AuthzScope,
    upload_type: UploadType, upload_data: StreamedUpload
):
    '''
    Create a new upload with the given `authz_scope` of the given `upload_type`.

    Does NOT check authorization.
    '''
    file_io = upload_data.io
    filename = upload_data.filename

    upload = storage.upload(session, authz_scope, upload_type, filename, file_io)

    # Create downscaled thumbnail for avatars.
    if upload_type == UploadType.AVATARS:
        file_io = resize_image(
            file_io,
            size=AVATAR_SIZE,
            out_format='JPEG'
        )

        thumbnail = storage.upload(
            session, authz_scope, UploadType.THUMBNAILS, 'avatar.jpg', file_io
        )
        upload.thumbnail_id = thumbnail.id

        Audit.create(session, user, thumbnail, BasicAuditEvent.CREATE)

    Audit.create(session, user, upload, BasicAuditEvent.CREATE)
    session.commit()

    return upload

@app.post('/uploads/{upload_type}')
def upload_file(
    req: Request, upload_type: str,
    upload: StreamedUpload = Depends(get_streamed_upload),
    session: Session = Depends(get_session),
    storage: StorageBackend = Depends(get_storage_backend)
) -> UploadModel:
    '''
    Upload an asset to be assigned for a `Asset` later.

    Requires permission to *manage creatives* at the campaign's business's authorization
    scope.
    '''
    user = get_current_user(req, session)

    campaign = Campaign.get(session, campaign_id)
    if not campaign:
        raise Invalid('invalid_campaign')

    assert_authz(user, campaign.business_authz_scope, Permission.MANAGE_CREATIVES)

    upload = _create_upload(
        session, storage, user, campaign.business_authz_scope,
        UploadType.CAMPAIGN_ASSETS, upload
    )

    return upload.to_model()