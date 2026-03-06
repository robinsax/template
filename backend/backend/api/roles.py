"""
User role assignment control and rule exposure endpoints.
"""
from uuid import UUID
from fastapi import Request, Depends
from sqlalchemy.orm import Session

from backend.model import (
    Model, Permission, Realm, Audit, UserRole, UserRoleModel, User, Role,
    BasicAuditEvent, current_datetime
)
from backend.logic import (
    would_role_be_valid, assignable_roles_for_realm, check_role_assign_authz
)
from backend.service import (
    Invalid, get_current_user, assert_authz, assert_role_assign_authz, get_session
)

from .base import app

# Authorization rule awareness.
def _get_role_options_for_realm(
    session: Session, cur_user: User, target_user_id: UUID,
    realm: Realm | None, *, allow_global: bool = False
) -> list[Role]:
    """
    Return the `Role`s which can be assigned by `cur_user` to `target_user_id`, optionally
    at the given realm.
    """
    if not realm and not allow_global:
        raise Invalid("invalid_target")

    assert_authz(cur_user, realm, Permission.IAM)

    if target_user_id == cur_user.id:
        # Users can"t update their own roles.
        return []

    target_user = User.get(session, target_user_id)
    if not target_user:
        raise Invalid("invalid_user")

    existing_roles = target_user.get_roles_containing_realm(realm)
    existing_roles = [
        role for role in existing_roles if role.realm != realm
    ]

    valid_roles = assignable_roles_for_realm(realm, existing_roles)

    allowed_roles = []
    for role in valid_roles:
        if check_role_assign_authz(cur_user, realm, role):
            allowed_roles.append(role)

    return allowed_roles

@app.get("/realms/global/user-roles/{user_id:uuid}/role-options")
def get_global_user_role_options(
    user_id: UUID,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
) -> list[Role]:
    """
    Retrieve the global level roles assignable to `user_id` by the current user.
    """
    return _get_role_options_for_realm(session, user, user_id, None, allow_global=True)

@app.get("/realms/{realm_id:uuid}/user-roles/{user_id:uuid}/role-options")
def get_realm_user_role_options(
    realm_id: UUID, user_id: UUID,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
) -> list[Role]:
    """
    Retrieve the `Client` level roles assignable to `user_id` by the current user.
    """
    realm = Realm.get(session, realm_id)
    if not realm:
        raise Invalid("invalid_realm")

    return _get_role_options_for_realm(session, user, user_id, realm)

# Role management - create and update.
class UserRoleUpdateParams(Model):
    """
    Role update request body.
    """
    role: Role

def _update_role_for_realm( # pylint: disable=too-many-locals
    session: Session, cur_user: User,
    target_user_id: UUID, update: UserRoleUpdateParams,
    realm: Realm | None = None, *,
    allow_global: bool = False
) -> UserRole:
    """
    Update the role of `target_user_id` in `realm` (or globally otherwise), as
    `cur_user`.

    Handles both a `UserRole` already existing, or not already existing, for that realm.

    Performs all authorization and validity checks.
    """
    # Pre-authorize.
    if not realm and not allow_global:
        raise Invalid("invalid_target")

    assert_authz(cur_user, realm, Permission.IAM)

    # Validate scope organizations and target user.
    if target_user_id == cur_user.id:
        raise Invalid("invalid_self_update")

    target_user = User.get(session, target_user_id)
    if not target_user:
        raise Invalid("invalid_user")

    # Check authorization for specific role.
    assert_role_assign_authz(cur_user, realm, update.role)

    # Find other relevant existing roles, and the target we're replacing.
    target_role = None
    target_user_roles = []
    for role in target_user.roles:
        if role.realm == realm:
            target_role = role
            continue

        if role.realm is None or role.realm.contains_realm(realm):
            target_user_roles.append(role)

    # Check role validity.
    valid, redundant = would_role_be_valid(realm, update.role, target_user_roles)
    if not valid:
        raise Invalid("invalid_role")

    # Revoke newly redundant roles.
    if redundant:
        for role in redundant:
            role.deleted_at = current_datetime()

    # Create or update role.
    event = None
    if target_role:
        event = BasicAuditEvent.UPDATE
        target_role.role = update.role
    else:
        event = BasicAuditEvent.CREATE
        target_role = UserRole(
            user_id=target_user_id,
            realm_id=realm.id if realm else None,
            role=update.role
        )
        session.add(target_role)

    session.flush()
    session.refresh(target_role)

    Audit.create(session, cur_user, target_role, event, update)
    session.commit()

    return target_role

@app.put("/realms/global/user-roles/{user_id:uuid}")
def update_global_user_role(
    user_id: UUID,
    update: UserRoleUpdateParams, session: Session = Depends(get_session),
    cur_user: User = Depends(get_current_user)
) -> UserRoleModel:
    """
    Update or create the role assignment for `user_id` at global level.

    Requires a higher authorization level than the resultant role.
    """
    role = _update_role_for_realm(
        session, cur_user, user_id, update,
        None, allow_global=True
    )

    return role.to_model()

@app.put("/realms/{realm_id:uuid}/user-roles/{user_id:uuid}")
def update_realm_user_role(
    realm_id: UUID, user_id: UUID,
    update: UserRoleUpdateParams, session: Session = Depends(get_session),
    cur_user: User = Depends(get_current_user)
) -> UserRoleModel:
    """
    Update or create the role assignment for `user_id` on the realm with ID `realm_id`.

    Requires a higher authorization level than the resultant role. 
    """
    realm = Realm.get(session, realm_id)
    role = _update_role_for_realm(
        session, cur_user, user_id, update, realm
    )

    return role.to_model()

# Role management - delete.
def _delete_role_for_realm(
    session: Session, cur_user: User, target_user_id: UUID,
    realm: Realm | None = None, *, allow_global: bool = False
) -> None:
    """
    Delete the role for `target_user_id` at `realm`.

    Performs all authorization and validity checks.
    """
    # Pre-authorize.
    if not realm and not allow_global:
        raise Invalid("invalid_target")

    assert_authz(cur_user, realm, Permission.IAM)

    target_user = User.get(session, target_user_id)
    if not target_user:
        raise Invalid("invalid_user")

    # Get existing role and validate it exists.
    target_role = next((
        role for role in target_user.roles
        if role.realm == realm
    ), None)
    if not target_role:
        raise Invalid("invalid_role")

    # Check authorization for specific role.
    assert_role_assign_authz(cur_user, realm, target_role.role)

    # Delete the role.
    target_role.deleted_at = current_datetime()
    session.flush()

    Audit.create(session, cur_user, target_role, BasicAuditEvent.DELETE)
    session.commit()

@app.delete("/realms/global/users/{user_id:uuid}")
def revoke_global_user_role(
    user_id: UUID,
    session: Session = Depends(get_session),
    cur_user: User = Depends(get_current_user)
) -> None:
    """
    Revoke the role for `user_id` at global level.

    Requires a higher authorization level than the target role.
    """
    _delete_role_for_realm(
        session, cur_user, user_id,
        None, allow_global=True
    )

@app.delete("/realms/{realm_id:uuid}/users/{user_id:uuid}")
def revoke_realm_user_role(
    realm_id: UUID, user_id: UUID,
    session: Session = Depends(get_session),
    cur_user: User = Depends(get_current_user)
) -> None:
    """
    Revoke the role for `user_id` on the realm with ID `realm_id`.

    Requires a higher authorization level than the target role.
    """
    realm = Realm.get(session, realm_id)

    _delete_role_for_realm(session, cur_user, user_id, realm)
