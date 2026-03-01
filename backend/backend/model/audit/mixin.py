"""
Audit mixin for SQLAlchemy mappers.
"""
from datetime import datetime
from functools import cached_property
from typing import Union, TypeVar, Optional, TYPE_CHECKING
from sqlalchemy import Column, and_, select, func
from sqlalchemy.orm import Session, Mapped, relationship, declared_attr, foreign

from ..base import Model, EnumMixin
from .audit import Audit, BasicAuditEvent

if TYPE_CHECKING:
    from ..user import UserModel

class AuditSummaryModel(Model):
    """
    Consumable summary of a mapper"s audit log.
    """
    created_by: Union["UserModel", str]
    created_at: datetime
    last_updated_at: datetime
    last_updated_by: Union["UserModel", str]

T = TypeVar("T", bound=EnumMixin)
class AuditMixin:
    """
    Opt-in mixin for SQLAlchemy mappers to support audit logging.

    Implementers can add an `__audit_events__` property alongside `__tablename__` to
    define a custom audit event enum. They use `BasicAuditEvent` by default.
    """
    __audit_events__: type[T] = BasicAuditEvent
    __audit_self_summary__: Optional[type[Model]] = None
    __tablename__: str
    id: Column[str]

    def get_contributing_users(self, session: Session) -> list["UserModel"]:
        """
        Return all users who have contributed to this object.
        """
        from ..user import User # pylint: disable=import-outside-toplevel

        clauses = [
            Audit.target_type == self.__tablename__,
            Audit.target_id == self.id
        ]

        return session.query(User)\
            .join(Audit, Audit.user_id == User.id)\
            .filter(and_(*clauses))\
            .distinct()\
            .all()

    def get_audits(self, session: Session) -> list["Audit"]:
        """
        Return all audits for this object.
        """
        return Audit.get_all_for_target(session, self)

class AuditSummaryMixin:
    """
    Additional mixin for `AuditMixin` classes that allows `audit_summary` to be defined
    on implementers Pydantic models, and eager-loads it.
    """
    # Declare joinedload relations for audit_summary.
    @classmethod
    def _audit_relation(cls, *, last: bool):
        """
        Return a relationship for the audit_summary.
        """
        select_target = (
            func.max(Audit.occurred_at) if last else func.min(Audit.occurred_at)
        )

        return relationship(
            Audit,
            primaryjoin=lambda: and_(
                foreign(Audit.target_id) == cls.id,
                Audit.target_type == cls.__tablename__,
                Audit.occurred_at == (
                    select(select_target)
                        .where(and_(
                            Audit.target_id == cls.id,
                            Audit.target_type == cls.__tablename__
                        ))
                        .correlate_except(Audit)
                        .scalar_subquery()
                )
            ),
            foreign_keys=[Audit.target_id],
            uselist=False, viewonly=True, lazy="joined",
        )

    @declared_attr
    def _last_audit(cls) -> Mapped["Audit"]: # pylint: disable=no-self-argument
        """
        Return the last audit for this object.
        """
        return cls._audit_relation(last=True)

    @declared_attr
    def _first_audit(cls) -> Mapped["Audit"]: # pylint: disable=no-self-argument
        """
        Return the first audit for this object.
        """
        return cls._audit_relation(last=False)

    @cached_property
    def audit_summary(self) -> AuditSummaryModel:
        """
        Return the audit summary for this object.
        """
        last_audit = self._last_audit
        first_audit = self._first_audit

        if last_audit and last_audit.user and last_audit.user.id == self.id:
            last_updated_by = last_audit.user.to_model()
        else:
            last_updated_by = "self"

        if first_audit and first_audit.user and first_audit.user.id == self.id:
            created_by = first_audit.user.to_model()
        else:
            created_by = "self"

        return AuditSummaryModel(
            last_updated_at=last_audit.occurred_at,
            last_updated_by=last_updated_by,
            created_at=first_audit.occurred_at,
            created_by=created_by
        )

    def expunge(self):
        """
        Expunge this object from the session.
        """
        super().expunge()

        self.audit_summary # pylint: disable=pointless-statement
