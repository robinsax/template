"""
Filesystem storage backend.

Serves as a reference implementation and is useful for local development.
"""
import os
import uuid
import mimetypes
from typing import IO
from sqlalchemy.orm import Session

from backend.config import config
from backend.model import Upload, UploadType, Realm

from .base import StorageBackend, StorageError

class FileSystemBackend(StorageBackend):
    """
    File storage backend that writes files to the filesystem within the configured root
    directory.
    """

    def __init__(self):
        self.root = config.fs_storage_root.get()

        if not os.path.exists(self.root):
            os.makedirs(self.root)

    def _get_path(
        self, upload_type: UploadType, ref: str, create: bool = False
    ):
        """
        Get the path for the given `upload_type` and `ref`.
        """
        dir_path = os.path.join(self.root, upload_type.value)
        if not os.path.exists(dir_path):
            if not create:
                raise StorageError(dir_path)

            os.makedirs(dir_path)

        file_path = os.path.join(dir_path, ref)
        if not os.path.exists(file_path) and not create:
            raise StorageError(file_path)

        return file_path

    def direct_read(self, filename: str) -> IO[bytes]:
        """
        Read the file data for the given `filename`.
        """
        file_path = self._get_path(UploadType.DEFAULT, filename)

        return open(file_path, "rb")

    def read(self, upload: Upload) -> IO[bytes]:
        """
        Read the file data for the given `upload`.
        """
        file_path = self._get_path(upload.type, str(upload.id))

        return open(file_path, "rb")

    def direct_upload(self, filename: str, data: IO[bytes]):
        """
        Upload the file data for the given `filename`.
        """
        file_path = self._get_path(UploadType.DEFAULT, filename, create=True)
        with open(file_path, "wb") as fh:
            while chunk := data.read(8192):
                fh.write(chunk)

    def upload(
        self, session: Session, realm: Realm, upload_type: UploadType,
        filename: str, data: IO[bytes]
    ) -> Upload:
        """
        Upload the file data for the given `upload_type`, `filename`, and `data`.
        """
        upload_id = uuid.uuid4()

        file_path = self._get_path(upload_type, str(upload_id), create=True)
        with open(file_path, "wb") as fh:
            while chunk := data.read(8192):
                fh.write(chunk)

        content_type, _ = mimetypes.guess_type(filename)
        size = os.path.getsize(file_path)

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
