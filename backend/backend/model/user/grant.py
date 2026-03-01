"""
User grant definition - the central in-database authorization object.
"""
import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Column, UUID, String, ForeignKey, Boolean, Index, and_, or_
from sqlalchemy.orm import Mapped, Session, relationship

from ..base import Base, BaseMixin, Model
from ..common import State, SoftDeleteMixin, enum_len
from ..audit import AuditMixin
from ..upload import UploadModel
from .authz import Role, AuthzScopeType, AuthzScope

if TYPE_CHECKING:
    from ..user import User
    from ..organization import Client, Business

class UserGrantClientModel(Model):
    """
    `Client` representation used by `UserGrantModel` to prevent circularity with grants.
    """
    id: str
    name: str
    state: State
    avatar: Optional[UploadModel]

class UserGrantBusinessModel(Model):
    """
    `Business` representation used by `UserGrantModel` to prevent circularity with
    grants.
    """
    id: str
    name: str
    client_id: str
    avatar: Optional[UploadModel]

class UserGrantModel(Model):
    """
    Default `Model` for `UserGrant`s.
    """
    id: str
    user_id: str
    scope_type: AuthzScopeType
    client_id: Optional[str]
    business_id: Optional[str]
    client: Optional[UserGrantClientModel]
    business: Optional[UserGrantBusinessModel]
    role: Role

class UserGrant(Base, SoftDeleteMixin, BaseMixin, AuditMixin):
    """
    Grants a `User` a `Role` at an authorization scope.

    If `client_id` is not set the grant is global.

    If `business_id` is set `client_id` must also be set.

    Uses soft-deletion for revokes to retain history. If you `session.query()` this
    mapper, you must check this case.
    """
    __model__ = UserGrantModel
    __tablename__ = "user_grants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=True)
    deleted = Column(Boolean, nullable=False, default=False)
    _role = Column("role", String(length=enum_len(Role)), nullable=False)

    client: Mapped["Client"] = relationship("Client", back_populates="grants")
    business: Mapped["Business"] = relationship("Business", back_populates="grants")

    user: Mapped["User"] = relationship("User", back_populates="grants")

    __table_args__ = (
        # Supporting `get_for_user`.
        Index("ix_user_grant_user_id_deleted", user_id, deleted),
    )

    @classmethod
    def role_column(cls):
        """
        The role column for this mapper.
        """
        return cls._role

    @classmethod
    def get_for_user(cls, session: Session, user_id: uuid.UUID):
        """
        Return all grants for `user_id` that are not soft-deleted.
        """
        return session.query(cls)\
            .filter(and_(
                cls.deleted.is_(False),
                cls.user_id == user_id
            ))\
            .all()

    @classmethod
    def get_all_for_business(
        cls, session: Session, client_id: uuid.UUID, business_id: uuid.UUID,
        roles: Optional[list[Role]] = None
    ) -> list["UserGrant"]:
        """
        Return all grants on the given `business_id` within the given `client_id` that
        are not soft-deleted.

        Can additionally filter to specific `roles`.
        """
        base_clauses = [cls.deleted.is_(False)]
        if roles:
            base_clauses.append(cls._role.in_([role.value for role in roles]))

        return session.query(cls)\
            .filter(and_(
                *base_clauses,
                or_(
                    and_(
                        cls.client_id == client_id,
                        cls.business_id.is_(None)
                    ),
                    and_(
                        cls.client_id == client_id,
                        cls.business_id == business_id
                    ),
                    and_(
                        cls.client_id.is_(None),
                        cls.business_id.is_(None)
                    )
                )
            ))\
            .all()

    @property
    def scope(self) -> AuthzScope:
        """
        The scope for this grant.
        """
        return AuthzScope(
            client_id=self.client_id,
            business_id=self.business_id
        )

    @property
    def scope_type(self) -> AuthzScopeType:
        """
        The scope type for this grant.
        """
        return self.scope.scope_type

    @property
    def role(self) -> Role:
        """
        The role for this grant.
        """
        return Role(self._role)

    @role.setter
    def role(self, role: Role):
        """
        Set the role for this grant.
        """
        self._role = role.value
