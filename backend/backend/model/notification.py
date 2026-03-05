from __future__ import annotations

from uuid import UUID
from enum import Enum
from typing import TypeVar, Type
from datetime import datetime
from sqlalchemy import and_
from sqlalchemy.orm import Session, Mapped, relationship

from backend.config import config

from .base import Mapper, Model, EnumMixin, MAX_TABLENAME_LEN, column
from .user import User, UserModel

class NotificationEmailStatus(EnumMixin, Enum):
    """
    Status of the email for a notification. Managed by the notification sender task.
    """
    PENDING = "pending"
    SKIPPED = "skipped"
    ERROR = "error"
    SENT = "sent"

class NotificationType(EnumMixin, Enum):
    """
    Enumerated notification types.
    """
    CONFIRM_EMAIL = "confirm_email"
    PASSWORD_RESET = "password_reset"

class NotificationModel(Model):
    """
    Default `Model` for `Notification`s.
    """
    id: str
    cause_user_id: str
    occurred_at: datetime
    seen_at: datetime | None = None
    type: NotificationType
    cause_user: UserModel | None = None
    target_type: str | None = None
    target_id: str | None = None
    cosmetic_metadata: dict[str, str] | None = None

TTarget = TypeVar("TTarget", bound=Mapper)
class Notification(Mapper):
    """
    A notification. Can be related to both a `User` who triggered the action that caused
    the notification, and to some other generic target.
    """
    __model__ = NotificationModel
    __tablename__ = "notifications"

    id: Mapped[UUID] = column(pk=True)
    user_id: Mapped[UUID] = column(fk="users.id", index=True)
    cause_user_id: Mapped[UUID | None] = column(fk="users.id")
    occurred_at: Mapped[datetime] = column(dt=True, default_now=True, index=True)
    seen_at: Mapped[datetime | None] = column(dt=True)
    type: Mapped[NotificationType] = column(NotificationType)
    email_status: Mapped[NotificationEmailStatus] = column(
        NotificationEmailStatus, index=True
    )
    cosmetic_metadata: Mapped[dict | None] = column(raw_jsonb=True)
    target_type: Mapped[str | None] = column(str_len=MAX_TABLENAME_LEN)
    target_id: Mapped[UUID | None] = column()

    user: Mapped[User] = relationship(primaryjoin="Notification.user_id == User.id")
    # Joined load because notifications always provided with cause user.
    cause_user: Mapped[User] = relationship(
        primaryjoin="Notification.cause_user_id == User.id", lazy="joined"
    )

    @classmethod
    def get_all_with_email_pending(cls, session: Session) -> list["Notification"]:
        """
        Return all notifications with email status `PENDING`.
        """
        return session.query(cls)\
            .filter(cls.email_status == NotificationEmailStatus.PENDING)\
            .all()

    @classmethod
    def get_all_for_user(
        cls, session: Session, user_id: UUID, include_seen: bool = False
    ) -> list["Notification"]:
        """
        Return all notifications for the given `user_id`.
        """
        clauses = [cls.user_id == user_id]
        if not include_seen:
            clauses.append(cls.seen_at.is_(None))

        return session.query(cls)\
            .filter(and_(*clauses))\
            .order_by(cls.occurred_at.desc())\
            .all()

    @classmethod
    def create(
        cls, session: Session, notif_type: NotificationType, user: User, *,
        cause_user: User | None = None, target: Mapper | None = None,
        cosmetic_metadata: dict[str, str] | None = None
    ) -> "Notification" | None:
        """
        Create a notification for the given `user`, unless `cause_user` is `user`.
        """
        skip_as_cause = (
            cause_user and
            cause_user.id == user.id and
            not config.dev_mode.get()
        )
        if skip_as_cause:
            return None

        notification = cls(
            user_id=user.id,
            type=notif_type,
            email_status=NotificationEmailStatus.PENDING,
            cause_user_id=cause_user.id if cause_user else None,
            target_type=target.__class__.__tablename__ if target else None,
            target_id=target.id if target else None,
            cosmetic_metadata=cosmetic_metadata
        )
        session.add(notification)

        return notification

    @classmethod
    def create_for_all(
        cls, session: Session, notif_type: NotificationType, users: list[User], *,
        cause_user: User | None = None, target: Mapper | None = None,
        cosmetic_metadata: dict[str, str] | None = None
    ) -> list["Notification"]:
        """
        Create notifications for all the given `users`, skipping `cause_user` if one
        is provided.
        """
        created = []
        created_for = {}
        for user in users:
            skip_as_cause = (
                cause_user and
                cause_user.id == user.id and
                not config.dev_mode.get()
            )
            if skip_as_cause:
                continue

            if user.id in created_for:
                continue
            created_for[user.id] = True

            notif = cls.create(
                session, notif_type, user,
                cause_user=cause_user, target=target,
                cosmetic_metadata=cosmetic_metadata
            )
            created.append(notif)

        session.add_all(created)

        return created

    def get_target(self, session: Session, expect_cls: Type[TTarget]) -> TTarget | None:
        """
        Return the target or `None` if it doesn\"t exist. Raises if the target is not of
        the expected class.
        """
        if self.target_type != expect_cls.__tablename__:
            raise ValueError("target isn\"t expected cls")

        if not self.target_id:
            return None

        return session.get(expect_cls, self.target_id)

    def get_target_or_die(self, session: Session, expect_cls: Type[TTarget]) -> TTarget:
        """
        Return the target. Raises if the target is not of the expected class or if the
        target doesn't exist.
        """
        target = self.get_target(session, expect_cls)
        if not target:
            raise ValueError("missing target")

        return target
