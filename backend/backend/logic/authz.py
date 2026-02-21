'''
Authorization logic.
'''
from typing import Optional

from kedet.model import (
    User, AuthzScope, UserGrant, Permission, UserType, Role, PERMISSIONS_MATRIX,
    AUTHZ_SCOPE_TYPE_ORDER, ROLE_SCOPES, ROLE_USER_TYPES
)

def scope_contains_scope(
    containing: AuthzScope, contained: AuthzScope
) -> bool:
    '''
    Return whether `contained` is at, or above, the given `containing`.

    Considers a scope to contain itself.

    E.g.: Global scope contains client-level scopes.
    '''
    if contained.client_id:
        if containing.client_id and containing.client_id != contained.client_id:
            return False
    elif containing.client_id:
        return False

    if contained.business_id:
        if containing.business_id and containing.business_id != contained.business_id:
            return False
    elif containing.business_id:
        return False

    return True

def scopes_overlap(
    scope_a: AuthzScope, scope_b: AuthzScope
) -> bool:
    '''
    Return whether there is any overlap between the given authorization scopes.

    E.g.: Two separate clients' scopes do not overlap, but a client-level scope
    and the global scope do.
    '''
    return (
        scope_contains_scope(scope_a, scope_b) or
        scope_contains_scope(scope_b, scope_a)
    )

def role_provides_permission(role: Role, permission: Permission) -> bool:
    '''
    Return whether the given `role` grants the given `permission`.
    '''
    return permission in PERMISSIONS_MATRIX[role]

def is_role_more_permissive_than(
    check_role: Role, base_role: Role
) -> bool:
    '''
    Return whether `check_role` grants any permissions that `base_role` doesn't.
    '''
    base_permissions = PERMISSIONS_MATRIX[base_role]
    target_permissions = PERMISSIONS_MATRIX[check_role]

    for permission in target_permissions:
        if permission not in base_permissions:
            return True

    return False

def is_role_at_least_as_permissive_as(
    check_role: Role, base_role: Role
) -> bool:
    '''
    Return whether `check_role` grants at least the permissions that `base_role` does.
    '''
    base_permissions = PERMISSIONS_MATRIX[base_role]
    target_permissions = PERMISSIONS_MATRIX[check_role]

    for permission in base_permissions:
        if permission not in target_permissions:
            return False

    return True

def would_grant_be_valid(
    authz_scope: AuthzScope, role: Role, user_type: UserType,
    existing_grants: list[UserGrant]
) -> tuple[bool, Optional[list[UserGrant]]]:
    '''
    Return whether a grant with `role` at `authz_scope` to the user with
    `existing_grants` of type `user_type` would be valid.

    `existing_grants` must all belong to the target user.

    If the grant is valid, but requires other grants a lower scope be revoked to
    prevent redundancy, those grants are additionally returned.

    This does NOT check authorization.
    '''
    if user_type != ROLE_USER_TYPES[role]:
        # Invalid user type for role.
        return False, None

    if authz_scope.scope_type not in ROLE_SCOPES[role]:
        # Invalid scope for role.
        return False, None

    redundant = []
    grant_level = AUTHZ_SCOPE_TYPE_ORDER.index(authz_scope.scope_type)

    for existing_grant in existing_grants:
        if not scopes_overlap(authz_scope, existing_grant.scope):
            continue

        existing_grant_level = AUTHZ_SCOPE_TYPE_ORDER.index(existing_grant.scope_type)

        if grant_level < existing_grant_level:
            if is_role_at_least_as_permissive_as(role, existing_grant.role):
                # Same or more permissions at higher scope - lower grant redundant.
                redundant.append(existing_grant)
        elif grant_level > existing_grant_level:
            if not is_role_more_permissive_than(role, existing_grant.role):
                # Less permissions at lower scope - redundant.
                return False, None
        else:
            if is_role_more_permissive_than(role, existing_grant.role):
                # More permissions at same scope - previous grant redundant.
                redundant.append(existing_grant)
            else:
                # Less permissions at same scope - redundant.
                return False, None

    if redundant:
        return True, redundant
    return True, None

def valid_grant_roles_for_scope(
    authz_scope: AuthzScope, user_type: UserType, existing_grants: list[UserGrant]
) -> list[Role]:
    '''
    Return the set of roles grantable at `authz_scope` to the user of type `user_type`
    with `existing_grants`.

    This does NOT check authorization.
    '''
    valid_grant_roles = []
    for role in Role:
        valid, _ = would_grant_be_valid(
            authz_scope, role, user_type, existing_grants
        )
        if valid:
            valid_grant_roles.append(role)

    return valid_grant_roles

def check_authz(
    user: User, authz_scope: AuthzScope, permission: Optional[Permission] = None
) -> bool:
    '''
    Return whether `user` has the given `permission` within the given `authz_scope`.

    If `permission` is omitted, returns whether `user` has any grants containing the
    given `authz_scope`. This is used the check whether the user can *see* something if
    there is not otherwise a specific permission defined for that case.

    `grants` may be provided to avoid a DB call if the caller already has the grants for
    `user` that contain `authz_scope` loaded.
    '''
    if not user:
        return False

    check_grants = user.get_grants_containing_scope(authz_scope)

    if not permission:
        return bool(check_grants)

    return any(
        permission in PERMISSIONS_MATRIX[grant.role]
        for grant in check_grants
    )

def check_scopeless_authz(user: User, permission: Permission) -> bool:
    '''
    Return whether `user` has the given `permission` at any authorization scope.

    This is not a sufficient authorization check in most cases.
    '''
    if not user:
        return False

    return any(
        permission in PERMISSIONS_MATRIX[grant.role]
        for grant in user.grants
    )

def check_grant_set_authz(user: User, authz_scope: AuthzScope, role: Role) -> bool:
    '''
    Return whether `user` is able to grant the given `role` at the given
    `authz_scope`.
    '''
    iam_allowed = check_authz(user, authz_scope, Permission.MANAGE_IAM)
    if not iam_allowed:
        return False

    return not any(
        is_role_more_permissive_than(role, grant.role)
        for grant in user.get_grants_containing_scope(authz_scope)
    )
