import uuid
from enum import Enum
from typing import Optional, TYPE_CHECKING
import bcrypt
from sqlalchemy import UUID, Column, String, ForeignKey
from sqlalchemy.orm import Mapped, Session, Query, relationship, selectinload

from ..base import Base, BaseMixin, Model, EnumMixin
from ..common import StateMixin, State, enum_len
from ..audit import AuditMixin

if TYPE_CHECKING:
    from ..upload import Upload, UploadModel
    from .authz import AuthzScope
    from .grant import UserGrant, UserGrantModel

MAX_USER_NAME_LENGTH = 30
MAX_USER_EMAIL_LENGTH = 60

class UserModel(Model):
    """
    Default `Model` for `User`s.
    """
    id: str
    name: str
    state: State
    email: str
    is_claimed: bool
    grants: list["UserGrantModel"]
    locale: Optional[str]

class User(Base, BaseMixin, StateMixin, AuditMixin):
    """
    A user account with a type and enable state.

    `UserGrant` is the authorization control construct.
    """
    __tablename__ = "users"
    __model__ = UserModel

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    avatar_id = Column(UUID(as_uuid=True), ForeignKey("uploads.id"), nullable=True)
    email = Column(String(length=MAX_USER_EMAIL_LENGTH), unique=True, index=True)
    name = Column(String(length=MAX_USER_NAME_LENGTH))
    password_digest = Column(String(length=60), nullable=True)
    locale = Column(String(length=5), nullable=True)
    _state = Column("state", String(length=enum_len(State)), nullable=False)
    _type = Column("type", String(length=enum_len(UserType)), nullable=False)

    grants: Mapped[list["UserGrant"]] = relationship(
        "UserGrant",
        primaryjoin="and_(User.id == UserGrant.user_id, UserGrant.deleted.is_(False))",
        back_populates="user"
    )
    # Load avatar joined.
    avatar: Mapped["Upload"] = relationship(
        "Upload", foreign_keys=[avatar_id], lazy="joined"
    )

    @classmethod
    def default_query(cls, session: Session) -> Query["User"]:
        """
        Return a default query for `User`s.
        """
        # Eager load grants without row expansion since we joined load avatar.
        return session.query(cls)\
            .options(selectinload(User.grants))

    @classmethod
    def get_all(cls, session: Session) -> list["User"]:
        """
        Return all users.
        """
        return session.query(cls).all()

    @classmethod
    def get_by_email(cls, session: Session, email: str) -> "User":
        """
        Return the `User` with the given `email`.
        """
        return session.query(cls).filter(cls.email == email).first()

    @property
    def type(self) -> UserType:
        """
        The type for this user.
        """
        return UserType(self._type)

    @type.setter
    def type(self, value: UserType):
        """
        Set the type for this user.
        """
        self._type = value.value

    @property
    def is_claimed(self) -> bool:
        """
        Return whether this users invite has been actioned.
        """
        return self.password_digest is not None

    def set_password(self, password: str):
        """
        Set the password digest from the given plaintext password.
        """
        self.password_digest = bcrypt\
            .hashpw(password.encode("utf-8"), bcrypt.gensalt())\
            .decode("utf-8")

    def check_password(self, password: str) -> bool:
        """
        Return whether the given plaintext password matches the stored password digest.
        """
        if not self.password_digest:
            return False

        return bcrypt.checkpw(
            password.encode("utf-8"),
            self.password_digest.encode("utf-8")
        )

    def get_grants_containing_scope(
        self, authz_scope: "AuthzScope"
    ) -> list["UserGrant"]:
        """
        Return the `UserGrant` for the given `authz_scope` if there is one.
        """
        from backend.logic import scope_contains_scope # pylint: disable=import-outside-toplevel

        return [
            grant for grant in self.grants
            if scope_contains_scope(grant.scope, authz_scope)
        ]

    def get_minimum_iam_authz_scope(self) -> "AuthzScope":
        """
        Return the minimum authorization scope within which this user can be managed.

        E.g.: If the user belongs to one client, they can be managed by users with IAM
        permission on that client. If they belong to multiple, they can only be managed
        by users with IAM permission at platform level.
        """
        from .authz import AuthzScope # pylint: disable=import-outside-toplevel

        client_ids = []
        business_ids = []

        for grant in self.grants:
            if grant.client_id:
                client_ids.append(grant.client_id)
            if grant.business_id:
                business_ids.append(grant.business_id)

        client_id = None
        business_id = None
        if len(client_ids) == 1:
            client_id = client_ids[0]

            if len(business_ids) == 1:
                business_id = business_ids[0]

        return AuthzScope(
            client_id=client_id,
            business_id=business_id
        )
