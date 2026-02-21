'''
Authentication keys.
'''
import uuid
import hmac
import base64
import secrets
import hashlib
from enum import Enum
from typing import Optional
from datetime import datetime
from sqlalchemy import ForeignKey, UUID, Column, String, DateTime, Index, and_
from sqlalchemy.orm import Session, Mapped, relationship, joinedload

from kedet.config import ConfigError, config

from ..base import Base, BaseMixin, EnumMixin, Model
from ..common import current_datetime, enum_len
from .user import User

# HMAC digests for tokens.
_hmac_key = None # pylint: disable=invalid-name

def _generate_token_digest(token_secret: bytes) -> str:
    '''
    Generate a token digest for the given token secret.
    '''
    global _hmac_key # pylint: disable=global-statement

    if not _hmac_key:
        try:
            _hmac_key = base64.urlsafe_b64decode(config.auth_token_hmac_key.get())
        except: # pylint: disable=bare-except
            raise ConfigError('Invalid AUTH_TOKEN_HMAC_KEY') from None

    return hmac.new(_hmac_key, token_secret, hashlib.sha256).hexdigest()

# Auth keys.
class AuthKeyRestriction(EnumMixin, Enum):
    '''
    Restrictions that can be applied to an authentication key.
    '''
    ASSET_GET = 'asset_get'
    INVITATION = 'invitation'
    PASSWORD_RESET = 'password_reset'

class AuthKeyModel(Model):
    '''
    Default `Model` for `AuthKey`s.
    '''
    user_id: str
    created_at: datetime
    expires_at: datetime
    revoked_at: Optional[datetime] = None
    restriction: Optional[AuthKeyRestriction] = None

class AuthKey(Base, BaseMixin):
    '''
    An expiring, revokable, and refreshable authentication key.

    An associated token is created concurrently with key records, and the token digest
    is included in the key record. See `AuthKey.generate_token()`.

    The token itself is not persisted to prevent exploitation in the event of key record
    exposure.

    Can optionally have an associated restriction to limit the access scope.
    '''
    __tablename__ = 'auth_keys'
    __model__ = AuthKeyModel

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_digest = Column(String(length=112), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), default=current_datetime)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    _restriction = Column(
        'restriction', String(length=enum_len(AuthKeyRestriction)), nullable=True
    )

    # Joined load user since the whole point is to access them.
    user: Mapped[User] = relationship('User', lazy='joined')

    __table_args__ = (
        # Supporting get_for_token.
        Index(
            'ix_auth_keys_user_id_token_digest_expires_at_revoked_at',
            user_id, token_digest, expires_at, revoked_at
        ),
    )

    @classmethod
    def get_for_token(
        cls, session: Session, token: str, *,
        allowed_restriction: Optional[AuthKeyRestriction] = None
    ) -> Optional['AuthKey']:
        '''
        Return the `AuthKey` for the given token if one that is not expired
        or revoked exists.

        Note that this will not return restricted auth keys unless a matching
        `allowed_restriction` is provided, to prevent restricted keys from being mistaken
        for non-restricted keys.
        '''
        # Attempt to parse token.
        try:
            token_user_id, token_secret = token.split('@')

            token_user_id = uuid.UUID(bytes=base64.urlsafe_b64decode(token_user_id))
            token_digest = _generate_token_digest(token_secret.encode('utf-8'))
        except: # pylint: disable=bare-except
            return None

        clauses = [
            cls.revoked_at.is_(None),
            cls.expires_at > current_datetime(),
            cls.user_id == token_user_id,
            cls.token_digest == token_digest
        ]
        if allowed_restriction:
            clauses.append(cls._restriction == allowed_restriction.value)
        else:
            clauses.append(cls._restriction.is_(None))

        return session.query(cls)\
            .options(joinedload(cls.user).selectinload(User.grants))\
            .filter(and_(*clauses))\
            .first()

    @property
    def restriction(self) -> Optional[AuthKeyRestriction]:
        '''
        The restriction for this key, if any.
        '''
        if not self._restriction:
            return None

        return AuthKeyRestriction(self._restriction)

    @restriction.setter
    def restriction(self, value: Optional[AuthKeyRestriction]):
        '''
        Set the restriction for this key.
        '''
        self._restriction = value.value if value else None

    @property
    def is_valid(self) -> bool:
        '''
        Whether this key is valid.
        '''
        return self.expires_at > current_datetime() and not self.revoked_at

    def generate_token(self) -> str:
        '''
        Generate a token for this key and associate its digest with this key, then return
        it.
        '''
        token_secret = secrets.token_urlsafe(64)
        token_secret_bytes = token_secret.encode('utf-8')

        self.token_digest = _generate_token_digest(token_secret_bytes)

        token_user_id = base64.urlsafe_b64encode(self.user_id.bytes).decode('utf-8')

        return '@'.join((token_user_id, token_secret))

    def refresh(self, until: datetime):
        '''
        Defer the expiry of this key until the given datetime.
        '''
        self.expires_at = until

    def revoke(self):
        '''
        Revoke this key.
        '''
        self.revoked_at = current_datetime()
