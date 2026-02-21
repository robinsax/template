'''
User access, invite, and management endpoints.

The user creation flow is:
- A `User` with *manage IAM* permission at any scope invites a new `User`.
- The inviting `User` grants any desired roles to the new `User`.
- The new `User` and an associated invite-specific `AuthKey` are created.
- A link is sent to the invited email to exercise the invite and claim the `User`.
- The invited `User` exercises the invite and claims the `User`.
'''
import re
import uuid
from typing import Optional
from fastapi import Request, Depends
from sqlalchemy.orm import Session

from kedet.logic import get_supported_locales
from kedet.model import (
    Model, Permission, User, UserType, UserModel, Audit, State, Upload, UploadType,
    BasicAuditEvent, Notification, NotificationType, NotificationModel,
    AuthKeyRestriction, AuthKey, MAX_USER_NAME_LENGTH, MAX_USER_EMAIL_LENGTH,
    current_datetime
)
from kedet.service import (
    Invalid, Unauthorized, get_current_user, assert_scopeless_authz, assert_authz,
    get_session
)

from .app import app
from .common import StateUpdateParams, assert_authz, state_update_handler

# Validators.
def _validate_password(password: str):
    '''
    Raise if the given plaintext password does not meet security requirements.
    '''
    if len(password) < 10:
        raise Invalid('password_too_short')

    if not re.search(r'[A-Z]', password):
        raise Invalid('password_no_uppercase')

    if not re.search(r'[a-z]', password):
        raise Invalid('password_no_lowercase')

    if not re.search(r'[0-9]', password):
        raise Invalid('password_no_digit')

    if not re.search(r'[^A-Za-z0-9]', password):
        raise Invalid('password_no_special')

def _validate_user_name(user_name: str):
    '''
    Raise if the given user name is invalid.
    '''
    if not user_name:
        raise Invalid('invalid_name')

    if len(user_name) > MAX_USER_NAME_LENGTH:
        raise Invalid('name_too_long')

def _validate_user_email(user_email: str):
    '''
    Raise if the given user email is invalid.
    '''
    if not user_email:
        raise Invalid('invalid_email')

    if len(user_email) > MAX_USER_EMAIL_LENGTH:
        raise Invalid('email_too_long')

    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', user_email):
        raise Invalid('invalid_email')

# User access.
@app.get('/users')
def get_users(
    req: Request, session: Session = Depends(get_session)
) -> list[UserModel]:
    '''
    Return all users.

    Requires *manage IAM* permission at any scope.
    '''
    user = get_current_user(req, session)

    # Necessarily scopeless to allow discovery for novel grant creation.
    assert_scopeless_authz(user, Permission.MANAGE_IAM)

    users = User.get_all(session)

    return [user.to_model() for user in users]

@app.get('/users/{user_id:uuid}')
def get_user(
    user_id: uuid.UUID, req: Request, session: Session = Depends(get_session)
) -> UserModel:
    '''
    Return the user with `user_id`.

    Requires *manage IAM* permission at any scope if the user is not the requester.
    '''
    cur_user = get_current_user(req, session)

    user = User.get(session, user_id)
    if not user:
        raise Invalid('invalid_user')

    if user.id != cur_user.id:
        assert_scopeless_authz(cur_user, Permission.MANAGE_IAM)

    return user.to_model()

# User invite flow.
class UserInviteParams(Model):
    '''
    Invitation request JSON body.
    '''
    name: str
    email: str
    locale: str
    type: UserType

@app.post('/users')
def invite_user(
    req: Request, create: UserInviteParams, session: Session = Depends(get_session)
) -> UserModel:
    '''
    Create a new user and send them an invitation to claim their account via email.
    '''
    cur_user = get_current_user(req, session)

    _validate_user_name(create.name)
    _validate_user_email(create.email)

    if User.get_by_email(session, create.email):
        raise Invalid('already_exists')

    # Scope will be checked later, on grant creation.
    assert_scopeless_authz(cur_user, Permission.MANAGE_IAM)

    if cur_user.type == UserType.CLIENT and create.type != UserType.CLIENT:
        raise Unauthorized('unpermitted_type')

    if create.locale not in get_supported_locales():
        raise Invalid('invalid_locale')

    user = User(
        name=create.name,
        email=create.email,
        locale=create.locale,
        type=create.type,
        state=State.ACTIVE
    )

    session.add(user)
    session.commit()
    session.refresh(user)

    Audit.create(session, cur_user, user, BasicAuditEvent.CREATE)

    # Note the (restricted) auth key for this invite will be generated when the
    # notification is dispatched via email.
    Notification.create(session, NotificationType.INVITED, user, source_user=cur_user)
    session.commit()

    return user.to_model()

class UserClaimParams(Model):
    '''
    User claim request JSON body.
    '''
    invite_token: str
    password: str

@app.post('/invites')
def claim_user(
    params: UserClaimParams, session: Session = Depends(get_session)
) -> UserModel:
    '''
    Claim a user account and set a password using the invite with `invite_id`.
    '''
    invite_key = AuthKey.get_for_token(
        session, params.invite_token,
        allowed_restriction=AuthKeyRestriction.INVITATION
    )
    if not invite_key:
        raise Invalid('invalid_invite')

    user = invite_key.user
    if user.is_claimed:
        raise Invalid('invalid_invite')

    _validate_password(params.password)

    user.set_password(params.password)
    invite_key.revoke()

    session.commit()
    session.refresh(user)

    Audit.create(session, user, user, BasicAuditEvent.UPDATE)
    session.commit()

    return user.to_model()

class UserPasswordUpdateParams(Model):
    '''
    User password update request JSON body.
    '''
    reset_token: str
    password: str

@app.put('/users/{user_id:uuid}/password')
def update_user_password(
    user_id: uuid.UUID, update: UserPasswordUpdateParams,
    session: Session = Depends(get_session)
) -> UserModel:
    '''
    Update the password of the user with `user_id`.

    Requires the user is the requester and is authenticated via an auth key with
    the *password reset* restriction.
    '''
    reset_key = AuthKey.get_for_token(
        session, update.reset_token,
        allowed_restriction=AuthKeyRestriction.PASSWORD_RESET
    )
    if not reset_key:
        raise Unauthorized('invalid_reset')

    user = reset_key.user
    if user.id != user_id:
        raise Unauthorized('invalid_auth')

    _validate_password(update.password)

    user.set_password(update.password)
    reset_key.revoke()

    session.commit()
    session.refresh(user)

    Audit.create(session, user, user, BasicAuditEvent.UPDATE, update)
    session.commit()

    return user.to_model()

# User updates.
class UserUpdateParams(Model):
    '''
    User update request JSON body.
    '''
    name: Optional[str] = None
    locale: Optional[str] = None
    avatar_id: Optional[str] = None

@app.put('/users/{user_id:uuid}')
def update_user(
    user_id: uuid.UUID, req: Request, update: UserUpdateParams,
    session: Session = Depends(get_session)
) -> UserModel:
    '''
    Update the user with `user_id`.

    Requires  *manage IAM* permission containing user's minimum authorization scope if
    the user is not the requester.
    '''
    cur_user = get_current_user(req, session)

    # Validate target and authz.
    user = User.get(session, user_id)
    if not user:
        raise Invalid('invalid_user')

    if cur_user.id != user.id:
        required_authz_scope = user.get_minimum_iam_authz_scope()

        assert_authz(cur_user, required_authz_scope, Permission.MANAGE_IAM)

    # Update avatar.
    if update.avatar_id:
        upload = Upload.get_qualified(session, UploadType.AVATARS, update.avatar_id)
        if not upload:
            raise Invalid('invalid_avatar')

        # Avatars are uploaded with empty scope, no authz check needed

        user.avatar_id = upload.id

    # Update name and locale.
    if update.name:
        _validate_user_name(update.name)
        user.name = update.name

    if update.locale:
        if update.locale not in get_supported_locales():
            raise Invalid('invalid_locale')

        user.locale = update.locale

    # Save.
    session.commit()
    session.refresh(user)

    Audit.create(session, cur_user, user, BasicAuditEvent.UPDATE, update)
    session.commit()

    return user.to_model()

@app.put('/users/{user_id:uuid}/state')
def update_user_state(
    user_id: uuid.UUID, req: Request, update: StateUpdateParams,
    session: Session = Depends(get_session)
) -> UserModel:
    '''
    Update the state of the user with `user_id`.

    Requires *manage IAM* permission containing user's minimum authorization scope if
    the user is not the requester.
    '''
    cur_user = get_current_user(req, session)

    user = User.get(session, user_id)
    if not user:
        raise Invalid('invalid_user')

    user = state_update_handler(
        session, cur_user, user, user.get_minimum_iam_authz_scope(), update,
        require_permission=Permission.MANAGE_IAM
    )

    return user.to_model()

# Notifications.
@app.get('/users/{user_id:uuid}/notifications')
def get_notifications(
    req: Request, user_id: uuid.UUID, session: Session = Depends(get_session)
) -> list[NotificationModel]:
    '''
    Return notifications for the given user. Returns only unseen notifications unless
    an `all` query parameter is included and non-empty.

    Requires that either the user is the requester or the user has *manage IAM* permission
    at the user's minimum authorization scope.
    '''
    user = get_current_user(req, session)

    # Assert authz.
    if user.id != user_id:
        required_authz_scope = user.get_minimum_iam_authz_scope()

        assert_authz(user, required_authz_scope, Permission.MANAGE_IAM)

    include_seen = bool(req.query_params.get('all'))
    notifications = Notification.get_all_for_user(session, user_id, include_seen)

    return [notification.to_model() for notification in notifications]

class NotificationsUpdateParams(Model):
    seen_ids: list[uuid.UUID]

@app.put('/users/{user_id:uuid}/notifications')
def update_notifications(
    user_id: uuid.UUID, req: Request, update: NotificationsUpdateParams,
    session: Session = Depends(get_session)
) -> None:
    '''
    Update notifications.

    All notifications with IDs in `seen_ids` will be marked as seen.

    Requires that the user is the requester.
    '''
    user = get_current_user(req, session)

    # Assert authz.
    if user.id != user_id:
        raise Unauthorized('unauthorized')

    notifications = Notification.get_all_for_user(session, user_id)
    notifications_lookup = {
        notification.id: notification for notification in notifications
    }

    for notification_id in update.seen_ids:
        notification = notifications_lookup.get(notification_id)
        if not notification:
            raise Invalid('invalid_notification')

        notification.seen_at = current_datetime()

    session.commit()
