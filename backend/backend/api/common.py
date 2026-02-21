'''
Functionality shared between base API endpoints.
'''
import uuid
from typing import TypeVar, Optional
from sqlalchemy.orm import Session

from kedet.model import (
    User, Permission, AuthzScope, State, Model, Audit, StateMixin, BasicAuditEvent,
    Client, PERMISSIONS_MATRIX
)
from kedet.service import assert_authz

# Scope helpers.
def get_business_ids_in_client_for_user(
    user: User, client: Client, permission: Optional[Permission]
) -> list[uuid.UUID]:
    '''
    Return the IDs of businesses the user has access to within the given client.
    '''
    business_ids = set()
    for grant in user.grants:
        if not grant.client_id:
            # Global grant of some kind.
            return [business.id for business in client.businesses]

        is_same_client_with_permission = (
            grant.client_id == client.id and
            (not permission or permission in PERMISSIONS_MATRIX[grant.role])
        )
        if not is_same_client_with_permission:
            # Irrelevant grant.
            continue

        if grant.business_id:
            # Business-level grant.
            business_ids.add(grant.business_id)
        else:
            # Client-level grant.
            return [business.id for business in client.businesses]

    return list(business_ids)

# Generic base API handlers.
class StateUpdateParams(Model):
    '''
    Canonical request body for `State` change endpoints.
    '''
    state: State

S = TypeVar('S', bound=StateMixin)
def state_update_handler(
    session: Session, user: User, target: S, authz_scope: AuthzScope,
    update: StateUpdateParams, *, require_permission: Permission
) -> S:
    '''
    Re-usable handler for updating the `State` of an SQLAlchemy mapper.

    Checks authorization using the provided permission. Handles auditing.
    '''
    assert_authz(user, authz_scope, require_permission)

    target.state = update.state
    session.commit()
    session.refresh(target)

    Audit.create(session, user, target, BasicAuditEvent.UPDATE, update)
    session.commit()

    return target
