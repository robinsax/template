"""
Authentication keys.
"""
import hmac
import base64
import secrets
import hashlib
from uuid import UUID
from enum import Enum
from datetime import datetime
from sqlalchemy import Index, and_
from sqlalchemy.orm import Session, Mapped, relationship, joinedload

from backend.config import ConfigError, config

from ..base import Mapper, Model, EnumMixin, column
from ..common import current_datetime
from .user import User

# HMAC digests for tokens.
_hmac_key = None # pylint: disable=invalid-name

def _generate_token_digest(token_secret: bytes) -> str:
    """
    Generate a token digest for the given token secret.
    """
    global _hmac_key # pylint: disable=global-statement

    if not _hmac_key:
        try:
            _hmac_key = base64.urlsafe_b64decode(config.auth_token_hmac_key.get())
        except: # pylint: disable=bare-except
            raise ConfigError("Invalid AUTH_TOKEN_HMAC_KEY") from None

    return hmac.new(_hmac_key, token_secret, hashlib.sha256).hexdigest()

# Auth keys.
class AuthKeyRestriction(EnumMixin, Enum):
    """
    Restrictions that can be applied to an authentication key.
    """
    EMAIL_CONFIRM = "email_confirm"
    PASSWORD_RESET = "password_reset"

class AuthKeyModel(Model):
    """
    Default `Model` for `AuthKey`s.
    """
    user_id: str
    created_at: datetime
    expires_at: datetime
    revoked_at: datetime | None = None
    restriction: AuthKeyRestriction | None = None

class AuthKey(Mapper):
    """
    An expiring, revokable, and refreshable authentication key.

    An associated token is created concurrently with key records, and the token digest
    is included in the key record. See `AuthKey.generate_token()`.

    The token itself is not persisted to prevent exploitation in the event of key record
    exposure.

    Can optionally have an associated restriction to limit the access scope.
    """
    __tablename__ = "auth_keys"
    __model__ = AuthKeyModel

    id: Mapped[UUID] = column(pk=True)
    user_id: Mapped[UUID] = column(fk="users.id")
    token_digest: Mapped[str] = column(str_len=112)
    created_at: Mapped[datetime] = column(dt=True, default_now=True)
    expires_at: Mapped[datetime | None] = column(dt=True)
    restriction: Mapped[AuthKeyRestriction | None] = column(AuthKeyRestriction)

    # Joined load user since the whole point is to access them.
    user: Mapped[User] = relationship(lazy="joined")

    __table_args__ = (
        # Supporting get_for_token.
        Index(
            "ix_auth_keys_user_id_token_digest_expires_at",
            user_id, token_digest, expires_at
        ),
    )

    @classmethod
    def get_for_token(
        cls, session: Session, token: str, *,
        allowed_restriction: AuthKeyRestriction | None = None
    ) -> "AuthKey" | None:
        """
        Return the `AuthKey` for the given token if one that is not expired
        or revoked exists.

        Note that this will not return restricted auth keys unless a matching
        `allowed_restriction` is provided, to prevent restricted keys from being mistaken
        for non-restricted keys.
        """
        # Attempt to parse token.
        try:
            token_user_id, token_secret = token.split("@")

            token_user_id = uuid.UUID(bytes=base64.urlsafe_b64decode(token_user_id))
            token_digest = _generate_token_digest(token_secret.encode("utf-8"))
        except: # pylint: disable=bare-except
            return None

        clauses = [
            cls.expires_at > current_datetime(),
            cls.user_id == token_user_id,
            cls.token_digest == token_digest
        ]
        if allowed_restriction:
            clauses.append(cls.restriction == allowed_restriction)
        else:
            clauses.append(cls.restriction.is_(None))

        return session.query(cls)\
            .options(joinedload(cls.user).selectinload(User.grants))\
            .filter(and_(*clauses))\
            .first()

    @property
    def is_valid(self) -> bool:
        """
        Whether this key is valid.
        """
        return self.expires_at > current_datetime()

    def generate_token(self) -> str:
        """
        Generate a token for this key and associate its digest with this key, then return
        it.
        """
        token_secret = secrets.token_urlsafe(64)
        token_secret_bytes = token_secret.encode("utf-8")

        self.token_digest = _generate_token_digest(token_secret_bytes)

        token_user_id = base64.urlsafe_b64encode(self.user_id.bytes).decode("utf-8")

        return "@".join((token_user_id, token_secret))

    def refresh(self, until: datetime):
        """
        Defer the expiry of this key until the given datetime.
        """
        self.expires_at = until

    def revoke(self):
        """
        Revoke this key.
        """
        self.expires_at = current_datetime()
