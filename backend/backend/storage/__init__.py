'''
File storage adapters.
'''
from kedet.config import ConfigError, config

from .base import StorageBackend, StorageError
from .fs import FileSystemBackend
from .google import GoogleCloudStorageBackend

def get_storage_backend() -> StorageBackend:
    '''
    Return the configured `StorageBackend`.
    '''
    backend = config.storage_backend.get()

    if backend == 'google':
        return GoogleCloudStorageBackend()

    if backend == 'fs':
        return FileSystemBackend()

    raise ConfigError('invalid storage backend: ' + backend)
