from enum import Enum
from uuid import UUID
from typing import TYPE_CHECKING, Optional
from sqlalchemy import text
from sqlalchemy.orm import Mapped, Session, relationship

from .base import Mapper, Model, EnumMixin, column
from .audit import AuditMixin

if TYPE_CHECKING:
    from .user import UserRole

MAX_REALM_NAME_LEN = 30
MAX_REALM_DEPTH = 5

class RealmType(EnumMixin, Enum):
    INSTANCE = "instance"

class RealmModel(Model):
    """
    Default `Model` for `Realm`s. This model inlines the parent realms which is faster
    and sufficient for permission checking. To inline the children instead, see
    `RealmHierarchyModel`.
    """
    id: str
    type: RealmType
    name: str
    parent: Optional["RealmModel"]

class RealmHierarchyModel(Model):
    """
    Alternate `Model` for `Realm`s which inlines the child realms rather than parent,
    for when the full hierarchy is needed.
    """
    id: str
    type: RealmType
    name: str
    children: list["RealmHierarchyModel"]

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
    children: Mapped[list["Realm"]] = relationship(
        primaryjoin="Realm.id == foreign(Realm.parent_id)",
        remote_side="Realm.parent_id"
    )
    grants: Mapped[list["UserRole"]] = relationship(
        primaryjoin=(
            "and_(Realm.id == UserRole.realm_id, UserRole.deleted_at.is_(None))"
        ),
        back_populates="realm"
    )

    @classmethod
    def get_all_fast_parents(cls, session: Session, ids: list[UUID]) -> list["Realm"]:
        ids = session.execute(text("""
            WITH RECURSIVE ancestors AS (
                SELECT id, parent_id, 0 AS depth FROM realms WHERE id = ANY(:ids)
                UNION ALL
                SELECT r.id, r.parent_id, a.depth + 1 FROM realms r
                JOIN ancestors a ON r.id = a.parent_id
                WHERE a.depth < :max_depth
            )
            SELECT id FROM ancestors;
        """), { "ids": ids, "max_depth": MAX_REALM_DEPTH })

        return session.query(cls)\
            .where(cls.id.in_([row.id for row in ids]))\
            .all()

    @classmethod
    def get_all_fast_children(cls, session: Session, ids: list[UUID]) -> list["Realm"]:
        ids = session.execute(text("""
            WITH RECURSIVE descendants AS (
                SELECT id, parent_id, 0 AS depth FROM realms WHERE id = ANY(:ids)
                UNION ALL
                SELECT r.id, r.parent_id, a.depth + 1 FROM realms r
                JOIN descendants a ON r.parent_id = a.id
                WHERE a.depth < :max_depth
            )
            SELECT id FROM descendants;
        """), { "ids": ids, "max_depth": MAX_REALM_DEPTH })

        return session.query(cls)\
            .where(cls.id.in_([row.id for row in ids]))\
            .all()

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
