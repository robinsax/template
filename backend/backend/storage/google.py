"""
Google Cloud Storage storage backend.
"""
import mimetypes
from uuid import uuid4
from typing import IO
from sqlalchemy.orm import Session
from google.cloud.storage import Client

from backend.config import config
from backend.model import Upload, UploadType, Realm

from .base import StorageBackend, StorageError

class GoogleCloudStorageBackend(StorageBackend):
    """
    Google Cloud Storage storage backend.
    """
    client: Client

    def __init__(self):
        self.client = Client()

    def _bucket_name(self, upload_type: UploadType):
        """
        Get the bucket name for the given `upload_type`.
        """
        return config.google_bucket_default.get()

    def direct_read(self, filename: str) -> IO[bytes]:
        """
        Read the file data for the given `filename`.
        """
        bucket = self.client.get_bucket(self._bucket_name(UploadType.DEFAULT))
        blob = bucket.blob(filename)

        if not blob.exists():
            raise StorageError(filename)

        return blob.open("rb")

    def read(self, upload: Upload) -> IO[bytes]:
        """
        Read the file data for the given `upload`.
        """
        bucket = self.client.get_bucket(self._bucket_name(upload.type))
        blob = bucket.blob(str(upload.id))

        if not blob.exists():
            raise StorageError(str(upload.id))

        return blob.open("rb")

    def upload(
        self, session: Session, realm: Realm, upload_type: UploadType,
        filename: str, data: IO[bytes]
    ) -> Upload:
        """
        Upload the file data for the given `upload_type`, `filename`, and `data`.
        """
        upload_id = uuid4()

        bucket = self.client.get_bucket(self._bucket_name(upload_type))
        blob = bucket.blob(str(upload_id))
        blob.upload_from_file(data)

        content_type, _ = mimetypes.guess_type(filename)
        size = blob.size

        upload = Upload(
            id=upload_id,
            type=upload_type,
            filename=filename,
            content_type=content_type,
            size=size,
            realm_id=realm.id
        )
        session.add(upload)
        session.flush()
        session.refresh(upload)

        return upload
