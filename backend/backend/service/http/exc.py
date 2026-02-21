'''
Common exceptions and exception handling for HTTP services.
'''
from logging import getLogger
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from kedet.config import config

logger = getLogger(__name__)

dev_mode = config.dev_mode.get()

# HTTP-mapped error types.
class Invalid(Exception):
    '''
    Canonical validation error, mapped to 400.
    '''

class Unauthorized(Exception):
    '''
    Canonical authentication and authorization error, mapped to 401.
    '''

# Handlers.
def _log_client_error(status_code: int, exc: Exception):
    '''
    Log a client error.
    '''
    if dev_mode:
        logger.warning('%d: %s', status_code, exc)

def invalid_handler(_req: Request, exc: Invalid):
    '''
    Converts `Invalid`s to 400 responses.
    '''
    _log_client_error(status.HTTP_400_BAD_REQUEST, exc)

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={ 'error': str(exc) }
    )

def unauthorized_handler(_req: Request, exc: Unauthorized):
    '''
    Converts `Unauthorized`s to 401 responses.
    '''
    _log_client_error(status.HTTP_401_UNAUTHORIZED, exc)

    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={ 'error': str(exc) }
    )

def unprocessable_entity_handler(_req: Request, exc: Exception):
    '''
    Presents 422 responses.
    '''
    _log_client_error(status.HTTP_422_UNPROCESSABLE_ENTITY, exc)

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={ 'error': 'unprocessable_entity' }
    )

def not_found_handler(_req: Request, exc: Exception):
    '''
    Presents 404 responses.
    '''
    _log_client_error(status.HTTP_404_NOT_FOUND, exc)

    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={ 'error': 'not_found' }
    )

def internal_server_error_handler(_req: Request, exc: Exception):
    '''
    Presents 500 responses.
    '''
    _log_client_error(status.HTTP_500_INTERNAL_SERVER_ERROR, exc)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={ 'error': 'internal_err' }
    )

def register_exception_handlers(app: FastAPI):
    '''
    Registers common exception handlers onto `app`.
    '''
    app.exception_handler(Invalid)(invalid_handler)
    app.exception_handler(Unauthorized)(unauthorized_handler)
    app.exception_handler(422)(unprocessable_entity_handler)
    app.exception_handler(404)(not_found_handler)
    app.exception_handler(500)(internal_server_error_handler)
