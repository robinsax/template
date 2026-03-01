"""
Authorization enums and constants.
"""
import uuid
from enum import Enum
from dataclasses import dataclass
from typing import Optional

from ..base import EnumMixin
from .user import UserType

class Role(EnumMixin, Enum):
    """
    Granted roles that map to sets of `Permission`s.
    """
    # Owner roles.
    ADMIN = "admin"
    ACCOUNT_MANAGER = "account_manager"
    CAMPAIGN_MANAGER = "campaign_manager"
    DATA_ANALYST = "data_analyst"
    # Client roles.
    BUSINESS_MANAGER = "business_manager"
    MANAGER = "manager"
    MEMBER = "member"

class Permission(EnumMixin, Enum):
    """
    Specific permissions against which authorization checks are performed.
    """
    # IAM / organization management.
    MANAGE_CLIENTS = "manage_clients"
    MANAGE_ORG = "manage_org"
    """
    Manage the client or business at which the role is assigned.
    """
    MANAGE_IAM = "manage_iam"
    MANAGE_OAUTHS = "manage_oauths"
    # Levels of access.
    VIEW_CAMPAIGN_CONTENTS = "view_campaign_contents"
    VIEW_ANALYTICS = "view_analytics"
    MANAGE_BRIEFS = "manage_briefs"
    MANAGE_CREATIVES = "manage_creatives"
    MANAGE_CAMPAIGNS = "manage_campaigns"

class AuthzScopeType(EnumMixin, Enum):
    """
    Levels of `AuthzScope`s.
    """
    GLOBAL = "global"
    CLIENT = "client"
    BUSINESS = "business"

@dataclass
class AuthzScope:
    """
    Represents a scope for authorization checks. Represents the global platform scope
    when no client or business is specified.

    If the scope has a `business_id` it must also have a `client_id`.
    """
    client_id: Optional[uuid.UUID] = None
    business_id: Optional[uuid.UUID] = None

    @property
    def scope_type(self) -> AuthzScopeType:
        """
        The scope type for this scope.
        """
        if self.client_id is None and self.business_id is None:
            return AuthzScopeType.GLOBAL
        if self.business_id is None:
            return AuthzScopeType.CLIENT
        return AuthzScopeType.BUSINESS

    def is_same(self, other: "AuthzScope") -> bool:
        """
        Whether this scope is the same as the other scope.
        """
        return self.client_id == other.client_id and self.business_id == other.business_id

AUTHZ_SCOPE_TYPE_ORDER = [
    AuthzScopeType.GLOBAL,
    AuthzScopeType.CLIENT,
    AuthzScopeType.BUSINESS
]
"""
Downwards ordering of `AuthzScopeType`s.
"""

ROLE_USER_TYPES = {
    Role.ADMIN: UserType.PLATFORM_OWNER,
    Role.ACCOUNT_MANAGER: UserType.PLATFORM_OWNER,
    Role.CAMPAIGN_MANAGER: UserType.PLATFORM_OWNER,
    Role.DATA_ANALYST: UserType.PLATFORM_OWNER,
    Role.BUSINESS_MANAGER: UserType.CLIENT,
    Role.MANAGER: UserType.CLIENT,
    Role.MEMBER: UserType.CLIENT,
}
"""
Defines the `UserType` to which each `Role` is grantable.
"""

ROLE_SCOPES = {
    Role.ADMIN: [AuthzScopeType.GLOBAL],
    Role.ACCOUNT_MANAGER: [
        AuthzScopeType.GLOBAL,
        AuthzScopeType.CLIENT,
        AuthzScopeType.BUSINESS
    ],
    Role.CAMPAIGN_MANAGER: [
        AuthzScopeType.GLOBAL,
        AuthzScopeType.CLIENT,
        AuthzScopeType.BUSINESS
    ],
    Role.DATA_ANALYST: [
        AuthzScopeType.GLOBAL,
        AuthzScopeType.CLIENT,
        AuthzScopeType.BUSINESS
    ],
    Role.BUSINESS_MANAGER: [
        AuthzScopeType.CLIENT,
        AuthzScopeType.BUSINESS
    ],
    Role.MANAGER: [
        AuthzScopeType.CLIENT,
        AuthzScopeType.BUSINESS
    ],
    Role.MEMBER: [AuthzScopeType.BUSINESS],
}
"""
Defines the `AuthzScopeType`s at which each `Role` is grantable.
"""

PERMISSIONS_MATRIX = {
    Role.ADMIN: list(Permission),
    Role.ACCOUNT_MANAGER: [
        Permission.MANAGE_CLIENTS,
        Permission.MANAGE_ORG,
        Permission.MANAGE_BRIEFS,
        Permission.MANAGE_CREATIVES,
        Permission.MANAGE_CAMPAIGNS,
        Permission.MANAGE_IAM,
        Permission.MANAGE_OAUTHS,
        Permission.VIEW_CAMPAIGN_CONTENTS,
        Permission.VIEW_ANALYTICS
    ],
    Role.CAMPAIGN_MANAGER: [
        Permission.MANAGE_BRIEFS,
        Permission.MANAGE_CREATIVES,
        Permission.MANAGE_CAMPAIGNS,
        Permission.MANAGE_OAUTHS,
        Permission.VIEW_CAMPAIGN_CONTENTS,
        Permission.VIEW_ANALYTICS
    ],
    Role.DATA_ANALYST: [
        Permission.VIEW_ANALYTICS
    ],
    Role.BUSINESS_MANAGER: [
        Permission.MANAGE_ORG,
        Permission.MANAGE_BRIEFS,
        Permission.MANAGE_CREATIVES,
        Permission.MANAGE_CAMPAIGNS,
        Permission.MANAGE_IAM,
        Permission.MANAGE_OAUTHS,
        Permission.VIEW_CAMPAIGN_CONTENTS,
        Permission.VIEW_ANALYTICS
    ],
    Role.MANAGER: [
        Permission.MANAGE_BRIEFS,
        Permission.MANAGE_CREATIVES,
        Permission.MANAGE_CAMPAIGNS,
        Permission.MANAGE_OAUTHS,
        Permission.VIEW_CAMPAIGN_CONTENTS,
        Permission.VIEW_ANALYTICS
    ],
    Role.MEMBER: [
        Permission.MANAGE_BRIEFS,
        Permission.MANAGE_CREATIVES,
        Permission.VIEW_CAMPAIGN_CONTENTS,
        Permission.VIEW_ANALYTICS
    ]
}
"""
Defines the set of permissions granted, within the grant scope, by each role.
"""

MANAGER_ROLES = [
    Role.ACCOUNT_MANAGER,
    Role.CAMPAIGN_MANAGER,
    Role.BUSINESS_MANAGER,
    Role.MANAGER,
    Role.ADMIN
]

CLIENT_MANAGER_ROLES = [
    Role.BUSINESS_MANAGER,
    Role.MANAGER
]
"""
Client-account manager roles (excluding platform owner roles).
"""
