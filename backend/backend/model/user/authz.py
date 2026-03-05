"""
User grant definition - the central in-database authorization object.
"""
from enum import Enum
from uuid import UUID
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Index, and_
from sqlalchemy.orm import Mapped, Session, relationship

from ..base import Mapper, Model, EnumMixin, column
from ..audit import AuditMixin

if TYPE_CHECKING:
    from ..realm import RealmModel, Realm
    from .user import User

class Role(EnumMixin, Enum):
    """
    Granted roles that map to sets of `Permission`s.
    """
    # Owner roles.
    ADMIN = "admin"
    USER = "user"

class Permission(EnumMixin, Enum):
    """
    Specific permissions against which authorization checks are performed.
    """
    # IAM / organization management.
    IAM = "IAM"

class UserRoleModel(Model):
    """
    Default `Model` for `UserRole`s.
    """
    id: str
    user_id: str
    realm: Optional["RealmModel"]
    role: Role

class UserRole(Mapper, AuditMixin):
    """
    Grants a `User` a `Role` at an authorization scope.

    If `realm_id` is not set the grant is global.

    Uses soft-deletion for revokes to retain history. If you `session.query()` this
    mapper, you must check this case.
    """
    __model__ = UserRoleModel
    __tablename__ = "user_roles"

    id: Mapped[UUID] = column(pk=True)
    realm_id: Mapped[UUID | None] = column(fk="realms.id")
    user_id: Mapped[UUID] = column(fk="users.id", index=True)
    deleted_at: Mapped[datetime | None] = column(dt=True)
    role: Mapped[Role] = column(Role)

    realm: Mapped["Realm"] = relationship()
    user: Mapped["User"] = relationship(back_populates="roles")

    __table_args__ = (
        # Supporting `get_for_user`.
        Index("ix_user_grant_user_id_deleted_at", user_id, deleted_at),
    )

    @classmethod
    def get_for_user(cls, session: Session, user_id: UUID):
        """
        Return all grants for `user_id` that are not soft-deleted.
        """
        return session.query(cls)\
            .filter(and_(
                cls.deleted_at.is_(None),
                cls.user_id == user_id
            ))\
            .all()

    @classmethod
    def get_all_for_realm(
        cls, session: Session, realm_id: UUID,
        roles: list[Role] | None = None
    ) -> list["UserRole"]:
        """
        Return all grants on the given `realm_id` that
        are not soft-deleted.

        Can additionally filter to specific `roles`.
        """
        clauses = [
            cls.deleted_at.is_(None),
            # AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA CTE
            cls.realm_id == realm_id
        ]
        if roles:
            clauses.append(cls.role.in_(roles))

        return session.query(cls)\
            .filter(and_(*clauses))\
            .all()

ROLE_SCOPES = {
    Role.ADMIN: [None],
    Role.USER: [None]
}
"""
Defines the `RealmType`s at which each `Role` is grantable. `None` represents
application global roles.
"""

PERMISSIONS_MATRIX = {
    Role.ADMIN: list(Permission),
    Role.USER: []
}
"""
Defines the set of permissions granted, within the grant scope, by each role.
"""
