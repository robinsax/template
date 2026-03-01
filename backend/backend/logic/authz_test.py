import uuid

from backend.logic import (
    is_role_more_permissive_than, is_role_at_least_as_permissive_as, scope_contains_scope,
    would_grant_be_valid
)
from backend.model import Role, UserGrant, AuthzScope, UserType

def test_role_permissiveness_checks():
    # Difference.
    assert is_role_more_permissive_than(Role.ADMIN, Role.MEMBER)
    assert not is_role_more_permissive_than(Role.ADMIN, Role.ADMIN)

    assert is_role_at_least_as_permissive_as(Role.ADMIN, Role.MEMBER)
    assert not is_role_at_least_as_permissive_as(Role.MEMBER, Role.ADMIN)

    assert is_role_more_permissive_than(Role.MANAGER, Role.MEMBER)
    assert not is_role_more_permissive_than(Role.MEMBER, Role.MANAGER)

    # Equality.
    assert not is_role_more_permissive_than(Role.MANAGER, Role.MANAGER)
    assert is_role_at_least_as_permissive_as(Role.MANAGER, Role.MANAGER)

def test_scoping_checks():
    global_scope = AuthzScope()
    client_a_scope = AuthzScope(client_id=uuid.uuid4())
    client_b_scope = AuthzScope(client_id=uuid.uuid4())
    business_a_scope = AuthzScope(
        client_id=client_a_scope.client_id,
        business_id=uuid.uuid4()
    )
    business_b_scope = AuthzScope(
        client_id=client_b_scope.client_id,
        business_id=uuid.uuid4()
    )

    # All permutations.
    assert scope_contains_scope(global_scope, global_scope)
    assert scope_contains_scope(global_scope, client_a_scope)
    assert scope_contains_scope(global_scope, business_a_scope)
    assert scope_contains_scope(client_a_scope, business_a_scope)
    assert not scope_contains_scope(client_b_scope, global_scope)
    assert not scope_contains_scope(business_b_scope, client_b_scope)
    assert not scope_contains_scope(client_a_scope, client_b_scope)
    assert not scope_contains_scope(business_a_scope, business_b_scope)
    assert not scope_contains_scope(client_a_scope, business_b_scope)
    assert not scope_contains_scope(business_b_scope, client_a_scope)
    assert not scope_contains_scope(business_a_scope, client_b_scope)

def test_grant_validity_checks():
    # Role user types are respected.
    valid, redundant = would_grant_be_valid(
        AuthzScope(),
        Role.ADMIN,
        UserType.CLIENT,
        []
    )
    assert not valid

    # Role scopes are respected.
    valid, redundant = would_grant_be_valid(
        AuthzScope(),
        Role.MEMBER,
        UserType.CLIENT,
        []
    )
    assert not valid

    # Re-granting more permissive role at same scope is valid but creates redundancy.
    grants = [
        UserGrant(
            role=Role.DATA_ANALYST,
            client_id=None,
            business_id=None
        )
    ]
    valid, redundant = would_grant_be_valid(
        AuthzScope(),
        Role.ADMIN,
        UserType.PLATFORM_OWNER,
        grants
    )
    assert valid
    assert redundant and len(redundant) == 1 and redundant[0] == grants[0]

    # Re-granting same role at same scope is invalid.
    valid, redundant = would_grant_be_valid(
        AuthzScope(),
        Role.DATA_ANALYST,
        UserType.PLATFORM_OWNER,
        grants
    )
    assert not valid

    # Re-granting less permissive role at same scope is invalid.
    valid, redundant = would_grant_be_valid(
        AuthzScope(),
        Role.MANAGER,
        UserType.PLATFORM_OWNER,
        grants
    )
    assert not valid

    # Re-granting more permissive role at child scope is valid.
    client_a_id = uuid.uuid4()
    grants = [
        UserGrant(
            role=Role.MEMBER,
            client_id=client_a_id,
            business_id=None
        )
    ]
    valid, redundant = would_grant_be_valid(
        AuthzScope(client_id=client_a_id, business_id=uuid.uuid4()),
        Role.MANAGER,
        UserType.CLIENT,
        grants
    )
    assert valid
    assert not redundant

    # Granting more permissive role at parent scope is valid and creates redundancy.
    grants = [
        UserGrant(
            role=Role.MEMBER,
            client_id=client_a_id,
            business_id=uuid.uuid4()
        )
    ]
    valid, redundant = would_grant_be_valid(
        AuthzScope(client_id=client_a_id),
        Role.MANAGER,
        UserType.CLIENT,
        grants
    )
    assert valid
    assert redundant and len(redundant) == 1 and redundant[0] == grants[0]

    # Granting the same role at parent scope is valid and creates redundancy.
    grants = [
        UserGrant(
            role=Role.MANAGER,
            client_id=client_a_id,
            business_id=uuid.uuid4()
        )
    ]
    valid, redundant = would_grant_be_valid(
        AuthzScope(client_id=client_a_id),
        Role.MANAGER,
        UserType.CLIENT,
        grants
    )
    assert valid
    assert redundant and len(redundant) == 1 and redundant[0] == grants[0]
