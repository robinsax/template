"""
Audit mapper.
"""
from uuid import UUID
from enum import Enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional, Union, Any
from sqlalchemy import Column, Index, and_, or_, select, exists
from sqlalchemy.orm import Session, Mapped, relationship

from ..base import Mapper, Model, EnumMixin, Model, MAX_TABLENAME_LEN, column
from ..common import model_to_column_repr, dict_to_column_repr

if TYPE_CHECKING:
    from ..user import User, UserModel
    from .mixin import AuditMixin

MAX_AUDIT_EVENT_LEN = 60

class BasicAuditEvent(EnumMixin, Enum):
    """
    Audit event types for objects that don"t need custom extension.
    """
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"

class AuditModel(Model):
    """
    Default `Model` for `Audit`s.
    """
    id: str
    user: "UserModel"
    target_type: str
    target_id: str
    occurred_at: datetime
    event: str
    params: Optional[dict]

class AuditStandaloneModel(Model):
    """
    `Audit` model for standalone exposure (when detached from target).

    The target mapper must declare a `__audit_self_summary__` model for this to be usable.
    """
    id: str
    user: "UserModel"
    occurred_at: datetime
    event: str
    target_type: str
    target_summary: Any

class Audit(Mapper):
    """
    Audit record.

    Relates to the audited mapper instance by storing its `__tablename__` in
    `target_type` and its `id` in `target_id`.

    Comprised of a user reference, timestamp, event type, and optionally parameters.
    """
    __model__ = AuditModel
    __tablename__ = "audits"

    id: Mapped[UUID] = column(pk=True)
    user_id: Mapped[UUID] = column(fk="users.id")
    occurred_at: Mapped[datetime] = column(dt=True, default_now=True, index=True)
    target_type: Mapped[str] = column(str_len=MAX_TABLENAME_LEN)
    target_id: Mapped[UUID] = column()
    _event: Mapped[str] = column(name="event", str_len=MAX_AUDIT_EVENT_LEN, nullable=False)
    params: Mapped[dict | None] = column()

    user: Mapped["User"] = relationship()

    __table_args__ = (
        Index("ix_audit_target", target_type, target_id),
    )

    @classmethod
    def create(
        cls, session: Session, user: "User", target: "AuditMixin",
        event: EnumMixin, params: Union[dict, Model, None] = None
    ) -> None:
        """
        Create an `Audit` for the given `target` SQLAlchemy mapper instance.

        Does not commit the provided session.
        """
        audit_model_cls = target.__audit_events__
        if not isinstance(event, audit_model_cls):
            raise ValueError("event must be an instance of " + audit_model_cls.__name__)

        log = cls(
            user_id=user.id,
            target_type=target.__class__.__tablename__,
            target_id=target.id,
            event=event,
            params=params
        )
        session.add(log)

    @classmethod
    def get_all_for_target(
        cls, session: Session, target: "AuditMixin",
        events: Optional[list[EnumMixin]] = None
    ) -> list["Audit"]:
        """
        Return all `Audit`s created for the given SQLAlchemy mapper instance in
        chronological order (oldest first).

        `events` can additionally be specified to filter on event types.
        """
        clauses = [
            cls.target_type == target.__class__.__tablename__,
            cls.target_id == target.id
        ]
        if events:
            clauses.append(cls._event.in_([event.value for event in events]))

        return session.query(cls)\
            .filter(and_(*clauses))\
            .order_by(cls.occurred_at.asc())\
            .all()

    @classmethod
    def get_latest_for_target(
        cls, session: Session, target: "AuditMixin",
        events: Optional[list[EnumMixin]] = None
    ) -> Optional["Audit"]:
        """
        Return the latest `Audit` created for the given SQLAlchemy mapper instance.

        `events` can additionally be specified to filter on event types.
        """
        clauses = [
            cls.target_type == target.__class__.__tablename__,
            cls.target_id == target.id
        ]
        if events:
            clauses.append(cls._event.in_([event.value for event in events]))

        return session.query(cls)\
            .filter(and_(*clauses))\
            .order_by(cls.occurred_at.desc())\
            .first()

    @classmethod
    def get_latest_for_targets_in_businesses(
        cls, session: Session, business_ids: list[UUID],
        target_cls_list: list[tuple["AuditMixin", Column]],
        limit: Optional[int] = None
    ) -> list["Audit"]:
        """
        Return the latest `Audit`s created for arbitrary business-related objects
        in the given businesses.

        `target_cls_list` should be a list of tuples containing:
        - Mapper class
        - Column of the mapper containing business ID.
        """
        clauses = []
        for target_cls, business_column in target_cls_list:
            clauses.append(exists(
                select(target_cls.id).where(and_(
                    target_cls.id == cls.target_id,
                    target_cls.__tablename__ == cls.target_type,
                    business_column.in_(business_ids)
                ))
            ))

        query = session.query(cls)\
            .filter(or_(*clauses))\
            .order_by(cls.target_id, cls.occurred_at.desc())\
            .distinct(cls.target_id)

        if limit:
            query = query.limit(limit)

        return query.all()

    @property
    def params(self):
        """
        Return the parameters of the audit event.
        """
        return self._params

    @params.setter
    def params(self, value: Optional[Union[Model, dict]]):
        """
        Set the parameters of the audit event.
        """
        if value is None:
            self._params = None
        elif isinstance(value, Model):
            self._params = model_to_column_repr(value)
        else:
            self._params = dict_to_column_repr(value)

    @property
    def event(self):
        """
        Return the event of the audit.
        """
        from backend.model import AuditMixin, mapper_for_tablename # pylint: disable=import-outside-toplevel

        mapper_cls = mapper_for_tablename(self.target_type)
        if not issubclass(mapper_cls, AuditMixin):
            raise ValueError("Target not an AuditMixin: " + self.target_type)

        return mapper_cls.__audit_events__(self._event)

    @event.setter
    def event(self, value: EnumMixin):
        """
        Set the event of the audit.
        """
        self._event = value.value

    @property
    def target_summary(self):
        """
        Return the summary of the target of the audit.
        """
        from backend.model import AuditMixin, mapper_for_tablename # pylint: disable=import-outside-toplevel

        session = Session.object_session(self)

        mapper_cls = mapper_for_tablename(self.target_type)
        if not issubclass(mapper_cls, AuditMixin):
            raise ValueError("Target not an AuditMixin: " + self.target_type)
        if not mapper_cls.__audit_self_summary__:
            raise ValueError("Missing self-summary: " + self.target_type)

        instance = mapper_cls.get(session, self.target_id)
        if not instance:
            return None

        return instance.to_model(model_cls=mapper_cls.__audit_self_summary__)
