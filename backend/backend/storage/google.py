'''
Google Cloud Storage storage backend.
'''
import uuid
import mimetypes
from typing import IO
from sqlalchemy.orm import Session
from google.cloud.storage import Client

from kedet.config import config
from kedet.model import Upload, UploadType, AuthzScope, UploadImageMetadataModel
from kedet.logic import get_image_dimensions

from .base import StorageBackend, StorageError

class GoogleCloudStorageBackend(StorageBackend):
    '''
    Google Cloud Storage storage backend.
    '''
    client: Client

    def __init__(self):
        self.client = Client()

    def _bucket_name(self, upload_type: UploadType):
        '''
        Get the bucket name for the given `upload_type`.
        '''
        if upload_type == UploadType.CAMPAIGN_ASSETS:
            return config.google_bucket_creative.get()

        return config.google_bucket_platform.get()

    def direct_read(self, filename: str) -> IO[bytes]:
        '''
        Read the file data for the given `filename`.
        '''
        bucket = self.client.get_bucket(self._bucket_name(UploadType.PLATFORM_DATA))
        blob = bucket.blob(filename)

        if not blob.exists():
            raise StorageError(filename)

        return blob.open('rb')

    def read(self, upload: Upload) -> IO[bytes]:
        '''
        Read the file data for the given `upload`.
        '''
        bucket = self.client.get_bucket(self._bucket_name(upload.type))
        blob = bucket.blob(str(upload.id))

        if not blob.exists():
            raise StorageError(str(upload.id))

        return blob.open('rb')

    def direct_upload(self, filename: str, data: IO[bytes]):
        '''
        Upload the file data for the given `filename`.
        '''
        bucket = self.client.get_bucket(self._bucket_name(UploadType.PLATFORM_DATA))
        blob = bucket.blob(filename)
        blob.upload_from_file(data)

    def upload( # pylint: disable=too-many-locals
        self, session: Session, authz_scope: AuthzScope,
        upload_type: UploadType, filename: str, data: IO[bytes]
    ) -> Upload:
        '''
        Upload the file data for the given `upload_type`, `filename`, and `data`.
        '''
        upload_id = uuid.uuid4()

        bucket = self.client.get_bucket(self._bucket_name(upload_type))
        blob = bucket.blob(str(upload_id))
        blob.upload_from_file(data)

        content_type, _ = mimetypes.guess_type(filename)
        size = blob.size
        image_metadata = None
        if content_type.startswith('image/'):
            width, height = get_image_dimensions(data)

            image_metadata = UploadImageMetadataModel(width=width, height=height)
            if content_type == 'image/jpg':
                content_type = 'image/jpeg'

        upload = Upload(
            id=upload_id,
            type=upload_type,
            filename=filename,
            content_type=content_type,
            size=size,
            client_id=authz_scope.client_id,
            business_id=authz_scope.business_id,
            image_metadata=image_metadata
        )
        session.add(upload)
        session.commit()
        session.refresh(upload)

        return upload
