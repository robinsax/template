'''
Base file storage type definitions.
'''
from typing import IO
from sqlalchemy.orm import Session

from kedet.model import Upload, UploadType, AuthzScope

class StorageError(Exception):
    pass

class StorageBackend:
    '''
    Base file storage backend.

    Implementations are responsible for creating `Upload` instances in addition to
    storing the file data.
    '''

    def direct_read(self, filename: str) -> IO[bytes]:
        '''
        Return a handle on the file data, in bytes, for the given `filename`.

        This handle must be closed by the caller. Should not be used by normal
        application logic.
        '''
        raise NotImplementedError()

    def read(self, upload: Upload) -> IO[bytes]:
        '''
        Return a handle on the file data, in bytes, for the given `Upload`.

        This handle must be closed by the caller.
        '''
        raise NotImplementedError()

    def direct_upload(self, filename: str, data: IO[bytes]):
        '''
        Store `data` associated to `filename`.

        Should not be used by normal application logic.
        '''
        raise NotImplementedError()

    def upload(
        self, session: Session, authz_scope: AuthzScope,
        upload_type: UploadType, filename: str, data: IO[bytes]
    ) -> Upload:
        '''
        Store the file data for the given handle `data`, and create a corresponding
        `Upload` with the given `upload_type`, `filename`, and `authz_scope`.
        '''
        raise NotImplementedError()
