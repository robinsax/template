from enum import Enum
from uuid import UUID
from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, relationship

from .base import Mapper, Model, EnumMixin, column
from .audit import AuditMixin

if TYPE_CHECKING:
    from .user import UserRole

MAX_REALM_NAME_LEN = 30

class RealmType(EnumMixin, Enum):
    INSTANCE = "instance"

class RealmModel(Model):
    id: str
    type: RealmType
    name: str
    parent: "RealmModel"

# AAAAAAAAAAAAAAAAAA CTE load parents

class Realm(Mapper, AuditMixin):
    __tablename__ = "realms"
    __model__ = RealmModel

    id: Mapped[UUID] = column(pk=True)
    type: Mapped[RealmType] = column(RealmType)
    parent_id: Mapped[UUID | None] = column(index=True)
    name: Mapped[str] = column(str_len=MAX_REALM_NAME_LEN)

    parent: Mapped["Realm"] = relationship(
        primaryjoin="Realm.parent_id == foreign(Realm.id)",
        remote_side="Realm.id"
    )
    grants: Mapped[list["UserRole"]] = relationship(
        primaryjoin=(
            "and_(Realm.id == UserRole.realm_id, UserRole.deleted_at.is_(None))"
        ),
        back_populates="realm"
    )

    def contains_realm(self, other: "Realm") -> bool:
        cur = other
        while cur:
            if cur == self:
                return True

            cur = cur.parent

        return False

    def collect_parents(self) -> list["Realm"]:
        parents = []
        cur = self.parent
        while cur:
            parents.insert(0, cur)

            cur = cur.parent

        return parents
