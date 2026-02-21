'''
Various types of common pure logic.
'''
from .authz import (
    is_role_more_permissive_than, is_role_at_least_as_permissive_as, scope_contains_scope,
    would_grant_be_valid, role_provides_permission, check_authz, check_scopeless_authz,
    check_grant_set_authz, scopes_overlap, valid_grant_roles_for_scope
)
from .validation import (
    validate_campaign, validate_slot_asset, is_age_range_discontinuous
)
from .i18n import (
    I18nFn, LanguageEntry, get_supported_locales, load_languages, t_for_locale,
    get_current_t
)
from .assets import generate_asset_pooled_ad_variants
from .budget_allocation import (
    update_channels_budget_allocation, update_locations_budget_allocation
)
from .locations import update_locations_database
from .util import camel_to_snake_case, id_to_app_url_form
from .media import (
    BoundingBoxModel, crop_image, get_image_dimensions, resize_image,
    pad_image_transparent, get_target_dimensions_for_aspect_ratio,
    compress_image, get_video_metadata, get_video_thumbnail, correct_video_rotation,
    rotate_image
)
