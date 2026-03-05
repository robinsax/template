"""
Authorization enums and constants.
"""
import uuid
from enum import Enum
from dataclasses import dataclass
from typing import Optional
from sqlalchemy import Column, UUID

from ..base import EnumMixin

class Role(EnumMixin, Enum):
    """
    Granted roles that map to sets of `Permission`s.
    """
    # Owner roles.
    ADMIN = "admin"
    USER = "user"

class Permission(EnumMixin, Enum):
    """
    Specific permissions against which authorization checks are performed.
    """
    # IAM / organization management.
    MANAGE_USERS = "manage_users"

class AuthzScopeType(EnumMixin, Enum):
    """
    Levels of `AuthzScope`s.
    """
    GLOBAL = "global"
    TENANT = "tenant"

@dataclass
class AuthzScope:
    """
    Represents a scope for authorization checks. Represents the global scope
    when containing all none values.
    """
    tenant_id: Optional[uuid.UUID] = None

    @property
    def scope_type(self) -> AuthzScopeType:
        """
        The scope type for this scope.
        """
        if self.tenant_id is None:
            return AuthzScopeType.GLOBAL
        return AuthzScopeType.TENANT

    def is_same(self, other: "AuthzScope") -> bool:
        """
        Whether this scope is the same as the other scope.
        """
        return self.tenant_id == other.tenant_id

AUTHZ_SCOPE_TYPE_ORDER = [
    AuthzScopeType.GLOBAL,
    AuthzScopeType.TENANT
]
"""
Downwards ordering of `AuthzScopeType`s.
"""

ROLE_SCOPES = {
    Role.ADMIN: [AuthzScopeType.GLOBAL],
    Role.USER: [AuthzScopeType.TENANT]
}
"""
Defines the `AuthzScopeType`s at which each `Role` is grantable.
"""

PERMISSIONS_MATRIX = {
    Role.ADMIN: list(Permission),
    Role.USER: []
}
"""
Defines the set of permissions granted, within the grant scope, by each role.
"""

class AuthzScopedMixin:
    """
    Mixin for models that are scoped to an authorization context.
    """
    tenant_id = Column(UUID(as_uuid=True), nullable=True)

    @property
    def authz_scope(self) -> AuthzScope:
        """
        The `AuthzScope` within which this upload exists.
        """
        return AuthzScope(
            tenant_id=self.tenant_id
        )
