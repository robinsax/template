"""
Authorization logic.
"""
from backend.model import (
    User, Realm, UserRole, Permission, Role, PERMISSIONS_MATRIX, ROLE_SCOPES
)

def is_role_more_permissive_than(
    check_role: Role, base_role: Role
) -> bool:
    """
    Return whether `check_role` grants any permissions that `base_role` doesn't.
    """
    base_permissions = PERMISSIONS_MATRIX[base_role]
    target_permissions = PERMISSIONS_MATRIX[check_role]

    for permission in target_permissions:
        if permission not in base_permissions:
            return True

    return False

def is_role_at_least_as_permissive_as(
    check_role: Role, base_role: Role
) -> bool:
    """
    Return whether `check_role` grants at least the permissions that `base_role` does.
    """
    base_permissions = PERMISSIONS_MATRIX[base_role]
    target_permissions = PERMISSIONS_MATRIX[check_role]

    for permission in base_permissions:
        if permission not in target_permissions:
            return False

    return True

def would_role_be_valid(
    realm: Realm | None, role: Role, existing_roles: list[UserRole]
) -> tuple[bool, list[UserRole] | None]:
    """
    Return whether assignment of `role` at `realm` to the user with `existing_roles`
    would be valid.

    `existing_roles` must all belong to the target user.

    If the assignment is valid, but requires other roles a lower scope be revoked to
    prevent redundancy, those roles are additionally returned.

    This does NOT check authorization.
    """
    valid_scope = (
        (realm is None and None in ROLE_SCOPES[role]) or
        (realm is not None and realm.type in ROLE_SCOPES[role])
    )
    if not valid_scope:
        return False, None

    redundant = []
    for existing_role in existing_roles:
        if realm == existing_role.realm:
            if is_role_more_permissive_than(role, existing_role.role):
                # More permissions at same scope - previous grant redundant.
                redundant.append(existing_role)
            else:
                # Less permissions at same scope - redundant.
                return False, None
        elif realm.contains_realm(existing_role.realm):
            if is_role_at_least_as_permissive_as(role, existing_role.role):
                # Same or more permissions at higher scope - lower grant redundant.
                redundant.append(existing_role)
        elif existing_role.realm.contains_realm(realm):
            if not is_role_more_permissive_than(role, existing_role.role):
                # Less permissions at lower scope - redundant.
                return False, None

    if redundant:
        return True, redundant
    return True, None

def assignable_roles_for_realm(
    realm: Realm, existing_roles: list[UserRole]
) -> list[Role]:
    """
    Return the set of roles assignable at `realm` to the user with `existing_roles`.

    This does NOT check authorization.
    """
    valid_grant_roles = []
    for role in Role:
        valid, _ = would_role_be_valid(realm, role, existing_roles)
        if valid:
            valid_grant_roles.append(role)

    return valid_grant_roles

def check_authz(
    user: User | None, realm: Realm | None, permission: Permission | None = None
) -> bool:
    """
    Return whether `user` has the given `permission` within the given `authz_scope`.

    If `permission` is omitted, returns whether `user` has any grants containing the
    given `authz_scope`. This is used the check whether the user can *see* something if
    there is not otherwise a specific permission defined for that case.

    `grants` may be provided to avoid a DB call if the caller already has the grants for
    `user` that contain `authz_scope` loaded.
    """
    if not user:
        return False

    check_roles = user.get_roles_containing_realm(realm)

    if not permission:
        return bool(check_roles)

    return any(
        permission in PERMISSIONS_MATRIX[role.role]
        for role in check_roles
    )

def check_scopeless_authz(user: User | None, permission: Permission) -> bool:
    """
    Return whether `user` has the given `permission` at any authorization scope.

    This is not a sufficient authorization check in most cases.
    """
    if not user:
        return False

    return any(
        permission in PERMISSIONS_MATRIX[role.role]
        for role in user.roles
    )

def check_role_assign_authz(user: User, realm: Realm | None, assign_role: Role) -> bool:
    """
    Return whether `user` is able to assign the given `role` at the given `realm`.
    """
    iam_allowed = check_authz(user, realm, Permission.IAM)
    if not iam_allowed:
        return False

    return not any(
        is_role_more_permissive_than(assign_role, role.role)
        for role in user.get_roles_containing_realm(realm)
    )

def can_user_manage_user(user: User, target_user: User) -> bool:
    """
    Return whether `user` is able to manage `target_user`.

    To return true, a role on a realm that contains all of `target_user`'s realms
    must exist and have the IAM permission.
    """
    for role in user.roles:
        if Permission.IAM not in PERMISSIONS_MATRIX[role.role]:
            continue

        for target_role in target_user.roles:
            if not role.realm.contains_realm(target_role.realm):
                break

        return True

    return False
