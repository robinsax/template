import uuid
from enum import Enum
from typing import Optional, TypeVar, Type
from datetime import datetime
from sqlalchemy import Column, UUID, ForeignKey, DateTime, String, and_
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session, Mapped, relationship

from kedet.config import config

from .base import Base, BaseMixin, EnumMixin, Model, MAX_TABLENAME_LEN
from .common import EnumType, current_datetime
from .user import User, UserModel, UserGrant, Role
from .organization import Business

class NotificationEmailStatus(EnumMixin, Enum):
    '''
    Status of the email for a notification. Managed by the notification sender task.
    '''
    PENDING = 'pending'
    SKIPPED = 'skipped'
    ERROR = 'error'
    SENT = 'sent'

class NotificationType(EnumMixin, Enum):
    '''
    Enumerated notification types.
    '''
    INVITED = 'invited'
    CAMPAIGN_CREATED = 'campaign_created'
    CAMPAIGN_SUBMITTED = 'campaign_submitted'
    CAMPAIGN_CHANGES_REQUESTED = 'campaign_changes_requested'
    CAMPAIGN_APPROVED = 'campaign_approved'
    CAMPAIGN_PUBLISHED = 'campaign_published'
    CAMPAIGN_CHANNEL_APPROVED = 'campaign_channel_approved'
    CAMPAIGN_CHANNEL_REJECTED = 'campaign_channel_rejected'
    COMMENT_REPLY = 'comment_reply'
    PASSWORD_RESET = 'password_reset'

class NotificationModel(Model):
    '''
    Default `Model` for `Notification`s.
    '''
    id: str
    owner_id: str
    occurred_at: datetime
    seen_at: Optional[datetime] = None
    type: NotificationType
    user: Optional[UserModel] = None
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    cosmetic_metadata: Optional[dict[str, str]] = None

T = TypeVar('T', bound=BaseMixin)
class Notification(Base, BaseMixin):
    '''
    A notification. Can be related to both a `User` who triggered the action that caused
    the notification, and to some other generic target.
    '''
    __model__ = NotificationModel
    __tablename__ = 'notifications'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(
        UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True
    )
    '''
    User ID this notification belongs to.
    '''
    occurred_at = Column(
        DateTime(timezone=True), nullable=False, index=True, default=current_datetime
    )
    seen_at = Column(DateTime(timezone=True), nullable=True)
    _type = Column(EnumType(NotificationType), nullable=False)
    _email_status = Column(
        EnumType(NotificationEmailStatus), nullable=False, index=True
    )
    cosmetic_metadata = Column(JSONB, nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    '''
    User that performed the action that triggered this notification if applicable.
    '''
    target_type = Column(String(length=MAX_TABLENAME_LEN), nullable=True)
    target_id = Column(UUID(as_uuid=True), nullable=True)

    owner: Mapped[User] = relationship(
        'User', primaryjoin='Notification.owner_id == User.id'
    )
    # Joined load because notifications always provided with source user.
    user: Mapped[User] = relationship(
        'User', primaryjoin='Notification.user_id == User.id', lazy='joined'
    )

    @classmethod
    def get_all_with_email_pending(cls, session: Session) -> list['Notification']:
        '''
        Return all notifications with email status `PENDING`.
        '''
        return session.query(cls)\
            .filter(cls._email_status == NotificationEmailStatus.PENDING.value)\
            .all()

    @classmethod
    def get_all_for_user(
        cls, session: Session, user_id: uuid.UUID, include_seen: bool = False
    ) -> list['Notification']:
        '''
        Return all notifications for the given `user_id`.
        '''
        clauses = [cls.owner_id == user_id]
        if not include_seen:
            clauses.append(cls.seen_at.is_(None))

        return session.query(cls)\
            .filter(and_(*clauses))\
            .order_by(cls.occurred_at.desc())\
            .all()

    @classmethod
    def create(
        cls, session: Session, notif_type: NotificationType, owner: User, *,
        source_user: Optional[User] = None, target: Optional[BaseMixin] = None,
        cosmetic_metadata: Optional[dict[str, str]] = None
    ) -> Optional['Notification']:
        '''
        Create a notification for the given `owner`.

        Skips the `source_user` if one is provided.
        '''
        skip_as_source = (
            source_user and
            source_user.id == owner.id and
            not config.dev_mode.get()
        )
        if skip_as_source:
            return None

        notification = cls(
            owner_id=owner.id,
            type=notif_type,
            email_status=NotificationEmailStatus.PENDING,
            user_id=source_user.id if source_user else None,
            target_type=target.__class__.__tablename__ if target else None,
            target_id=target.id if target else None,
            cosmetic_metadata=cosmetic_metadata
        )
        session.add(notification)

        return notification

    @classmethod
    def create_for_all(
        cls, session: Session, notif_type: NotificationType, users: list[User], *,
        source_user: Optional[User] = None, target: Optional[BaseMixin] = None,
        cosmetic_metadata: Optional[dict[str, str]] = None
    ) -> list['Notification']:
        '''
        Create notifications for all the given `users`.

        Skips the `source_user` if one is provided.
        '''
        created = []
        created_for = {}
        for user in users:
            skip_as_source = (
                source_user and
                source_user.id == user.id and
                not config.dev_mode.get()
            )
            if skip_as_source:
                continue

            if user.id in created_for:
                continue
            created_for[user.id] = True

            notif = cls.create(
                session, notif_type, user, source_user=source_user, target=target,
                cosmetic_metadata=cosmetic_metadata
            )
            created.append(notif)

        session.add_all(created)

        return created

    @classmethod
    def create_for_all_with_roles_at_business(
        cls, session: Session, notif_type: NotificationType, roles: list[Role],
        business: Business, *,
        source_user: Optional[User] = None, target: Optional[BaseMixin] = None,
        cosmetic_metadata: Optional[dict[str, str]] = None
    ) -> list['Notification']:
        '''
        Create a notification for all users with the given `roles` at the given
        `business`.

        Skips the `source_user` if one is provided.
        '''
        grants = UserGrant.get_all_for_business(
            session, business.client_id, business.id, roles
        )

        return cls.create_for_all(
            session, notif_type, [grant.user for grant in grants],
            source_user=source_user, target=target, cosmetic_metadata=cosmetic_metadata
        )

    def get_target(self, session: Session, expect_cls: Type[T]) -> Optional[T]:
        '''
        Return the target or `None` if it doesn\'t exist. Raises if the target is not of
        the expected class.
        '''
        if self.target_type != expect_cls.__tablename__:
            raise ValueError('target isn\'t expected cls')

        if not self.target_id:
            return None

        return session.get(expect_cls, self.target_id)

    def get_target_or_die(self, session: Session, expect_cls: Type[T]) -> T:
        '''
        Return the target. Raises if the target is not of the expected class or if the
        target doesn't exist.
        '''
        target = self.get_target(session, expect_cls)
        if not target:
            raise ValueError('missing target')

        return target