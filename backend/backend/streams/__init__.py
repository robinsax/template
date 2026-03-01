"""
HTTP video streaming service.
"""
import uuid
from fastapi import Request, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.model import (
    Upload, Permission, AuthKey, AuthKeyRestriction
)
from backend.service import (
    Invalid, assert_authz, get_current_user, create_app, get_session,
    managed_chunk_byte_stream
)
from backend.storage import StorageBackend, get_storage_backend

app = create_app("/streams/v1")

@app.get("/{upload_id:uuid}")
def stream_video(
    req: Request, upload_id: uuid.UUID,
    session: Session = Depends(get_session),
    storage: StorageBackend = Depends(get_storage_backend)
):
    """
    Stream a video upload with range header compatibility.

    Requires a query parameter `token?=<auth token>`, where the provided token has
    the `asset_get` restriction, to authenticate the request.

    Requires permission to *view campaign contents* at the upload"s authorization scope.
    """
    # Authenticate.
    token = req.query_params.get("token")
    if not token:
        raise Invalid("invalid_token")

    access_token = AuthKey.get_for_token(
        session, token, allowed_restriction=AuthKeyRestriction.ASSET_GET
    )
    if not access_token or not access_token.is_valid:
        raise Invalid("invalid_token")

    user = access_token.user

    # Authorize upload.
    upload = Upload.get(session, upload_id)
    if not upload or not upload.content_type.startswith("video/"):
        raise Invalid("invalid_upload")

    assert_authz(user, upload.authz_scope, Permission.VIEW_CAMPAIGN_CONTENTS)

    # Stream.
    start = 0
    end = upload.size - 1

    range_header = req.headers.get("range")
    if range_header:
        try:
            bytes_range = range_header.strip().split("=")[-1]
            start_str, end_str = bytes_range.split("-")
            start = int(start_str)
            if end_str:
                end = int(end_str)
        except ValueError:
            raise Invalid("invalid_range") from None

    return StreamingResponse(
        managed_chunk_byte_stream(storage.read(upload), start, end),
        status_code=206 if range_header else 200,
        headers={
            "Content-Range": f"bytes {start}-{end}/{upload.size}",
            "Accept-Ranges": "bytes",
            "Content-Type": upload.content_type
        }
    )
