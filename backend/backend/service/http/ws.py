'''
Websocket endpoint utilities.
'''
from typing import TypeVar, Type
from fastapi import WebSocket
from pydantic import ValidationError

from kedet.model import User, AuthKey, Model

from ..database import get_session_as_context
from .exc import Invalid, Unauthorized

class AuthWSParams(Model):
    '''
    Canonical authentication message for WebSockets.
    '''
    token: str

async def ws_authenticate(socket: WebSocket) -> User:
    '''
    Authenticate a WebSocket connection.

    Throws `Unauthorized` if authentication fails.
    '''
    data = await ws_receive_model(socket, AuthWSParams)

    # pylint: disable=no-member
    with get_session_as_context() as session:
        key = AuthKey.get_for_token(session, data.token)
        if not key or not key.is_valid:
            raise Unauthorized('invalid_auth')

        user = key.user
        session.refresh(user)
        user.expunge()

        return user
    # pylint: enable=no-member

M = TypeVar('M', bound=Model)
async def ws_receive_model(socket: WebSocket, model_cls: Type[M]) -> M:
    '''
    Receive and return a validated `Model` of type `model_cls` from the client.

    Throws `Invalid` if validation fails, which must be handled by the caller.
    '''
    data = await socket.receive_json()

    try:
        return model_cls(**data)
    except ValidationError:
        raise Invalid('invalid_payload') from None
