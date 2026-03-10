"""
Various types of common pure logic.
"""
from .authz import (
    is_role_more_permissive_than, is_role_at_least_as_permissive_as, check_authz,
    check_scopeless_authz, check_role_assign_authz, would_role_be_valid,
    assignable_roles_for_realm, can_user_manage_user
)
from .i18n import (
    I18nFn, LanguageEntry, get_supported_locales, load_languages, t_for_locale,
    get_current_t
)
from .util import camel_to_snake_case, id_to_app_url_form
