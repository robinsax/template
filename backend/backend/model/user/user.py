import bcrypt
from uuid import UUID
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, Session, Query, relationship, selectinload

from ..base import Mapper, Model, column
from ..audit import AuditMixin

if TYPE_CHECKING:
    from ..realm import Realm
    from .authz import UserRole, UserRoleModel

MAX_USER_NAME_LENGTH = 30
MAX_USER_EMAIL_LENGTH = 60

class UserModel(Model):
    """
    Default `Model` for `User`s.
    """
    id: str
    name: str
    email: str
    roles: list["UserRoleModel"]
    locale: str

class User(Mapper, AuditMixin):
    """
    A user account with a type and enable state.

    `UserRole` is the authorization control construct.
    """
    __tablename__ = "users"
    __model__ = UserModel

    id: Mapped[UUID] = column(pk=True)
    email: Mapped[str] = column(str_len=MAX_USER_EMAIL_LENGTH, unique=True, index=True)
    name: Mapped[str] = column(str_len=MAX_USER_NAME_LENGTH)
    password_digest: Mapped[str | None] = column(str_len=60)
    locale: Mapped[str] = column(str_len=5)
    deactivated_at: Mapped[datetime | None] = column(dt=True)

    roles: Mapped[list["UserRole"]] = relationship(
        primaryjoin="and_(User.id == UserRole.user_id, UserRole.deleted_at.is_(None))",
        back_populates="user"
    )

    @classmethod
    def default_query(cls, session: Session) -> Query["User"]:
        """
        Return a default query for `User`s.
        """
        # Eager load roles without row expansion.
        return session.query(cls)\
            .options(selectinload(User.roles))

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
    def is_inactive(self) -> bool:
        return self.deactivated_at is not None

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

    def get_roles_containing_realm(self, realm: "Realm" | None) -> list["UserRole"]:
        """
        Return the `UserRole`s for this user that contain the given `realm`.
        """
        contained = []

        for role in self.roles:
            if role.realm is None:
                contained.append(role)
            elif realm is not None and role.realm.contains_realm(realm):
                contained.append(role)
        
        return contained
