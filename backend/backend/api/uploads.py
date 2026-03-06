'''
File upload and upload retrieval endpoints, subject to authorization.
'''
from uuid import UUID
from fastapi import Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.model import (
    UploadType, Upload, UploadModel, User, Audit, Realm, BasicAuditEvent
)
from backend.storage import StorageBackend, get_storage_backend
from backend.service import (
    StreamedUpload, Invalid, get_streamed_upload, get_current_user, assert_authz,
    get_session, managed_chunk_byte_stream
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
    user = get_current_user(req, session)

    try:
        upload_type = UploadType(upload_type)
    except ValueError:
        raise Invalid('invalid_upload_type') from None

    upload = Upload.get_qualified(session, upload_type, upload_id)
    if not upload:
        raise Invalid('invalid_upload')

    realm = Realm.get(upload.realm_id)
    assert_authz(user, realm)

    filename = upload.filename.encode('ascii', 'ignore').decode('ascii')

    return StreamingResponse(
        managed_chunk_byte_stream(storage.read(upload), 0, upload.size),
        media_type=upload.content_type,
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )

def _create_upload(
    session: Session, storage: StorageBackend, user: User, realm: Realm,
    upload_type: UploadType, upload_data: StreamedUpload
):
    '''
    Create a new upload with the given `authz_scope` of the given `upload_type`.

    Does NOT check authorization.
    '''
    file_io = upload_data.io
    filename = upload_data.filename

    upload = storage.upload(session, realm, upload_type, filename, file_io)

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
    Upload a file.
    '''
    user = get_current_user(req, session)

    try:
        upload_type = UploadType(upload_type)
    except ValueError:
        raise Invalid('invalid_upload_type') from None

    # TEMPLATE: This will certainly need update to project use case.
    if not user.roles:
        raise Invalid("no_roles")
    realm = user.roles[0].realm

    assert_authz(user, realm)

    record = _create_upload(
        session, storage, user, realm, upload_type, upload
    )
    return record.to_model()
