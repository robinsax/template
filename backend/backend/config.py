"""
Environment-injected configuration.
"""
import os
import sys
from logging import getLogger
from typing import Type, TypeVar, Generic

from dotenv import load_dotenv

logger = getLogger(__name__)

class ConfigError(Exception):
    """
    Thrown when required configuration is missing.
    """

_sentinel = object()

T = TypeVar("T")
class ConfigValue(Generic[T]):
    """
    A lazy-loaded, type cast, configuration value for `Config`.
    """
    key: str
    val_type: Type[T]
    default: T
    integration_test_value: T

    def __init__(
        self, key: str, val_type: Type[T] = str, *, default: T = _sentinel,
        integration_test_value: T = _sentinel
    ):
        self.key = key
        self.val_type = val_type
        self.default = default
        self.integration_test_value = integration_test_value

    @property
    def is_set(self) -> bool:
        """
        Return whether this config value was either injected or has a default.
        """
        use_integration_test_value = (
            self.integration_test_value is not _sentinel and
            config.integration_test_mode.get()
        )
        if use_integration_test_value:
            return bool(self.integration_test_value)

        return os.getenv(self.key.upper(), None) or self.default is not _sentinel

    def set(self, value: T):
        """
        Set the value.
        """
        os.environ[self.key.upper()] = str(value)

    def get(self, get_default: T = _sentinel) -> T:
        """
        Return the value or throw if none is available.

        A call-time default can be provided.
        """
        use_integration_test_value = (
            self.integration_test_value is not _sentinel and
            config.integration_test_mode.get()
        )
        if use_integration_test_value:
            return self.integration_test_value

        key = self.key.upper()

        if not os.environ.get(key, None):
            if get_default is not _sentinel:
                return get_default

            if self.default is not _sentinel:
                return self.default

            raise ConfigError(f"missing: { key }")

        if self.val_type == bool:
            return os.environ[key].lower() in ("true", "1", "t", "y", "yes")

        value = os.environ[key].strip()

        try:
            return self.val_type(value)
        except ValueError:
            raise ConfigError(f"invalid value: { key }") from None

class Config:
    """
    The application configuration. Use via `config`.
    """
    # Behaviors.
    dev_mode = ConfigValue("dev_mode", bool, default=False)
    """
    Whether the application is running in development mode.
    """
    api_exec_task_scheduler = ConfigValue("api_exec_task_scheduler", bool, default=False)
    """
    Whether the API should execute the task scheduler.
    """
    auth_key_expiry_hours = ConfigValue("auth_key_expiry_hours", int, default=48)
    """
    The duration in hours before authentication keys expire.
    """
    auth_key_asset_get_expiry_minutes = ConfigValue(
        "auth_key_asset_get_expiry_minutes", int, default=10
    )
    """
    The duration in minutes before asset get-restricted authentication keys expire.
    """
    auth_key_password_reset_expiry_hours = ConfigValue(
        "auth_key_password_reset_expiry_hours", int, default=1
    )
    """
    The duration in hours before password reset authentication keys (password reset
    emails) expire.
    """
    auth_key_invitation_expiry_days = ConfigValue(
        "auth_key_invitation_expiry_days", int, default=2
    )
    """
    The duration in days before invitation authentication keys (invite emails) expire.
    """
    handler_duration_warn_threshold_millis = ConfigValue(
        "handler_duration_warn_threshold_millis", int, default=250
    )
    """
    The handler execution duration threshold for warning logs in milliseconds.
    """
    sqlalchemy_echo = ConfigValue("sqlalchemy_echo", bool, default=False)
    """
    Whether to enable SQLAlchemy echo.
    """
    default_locale = ConfigValue("default_locale", default="en_US")
    """
    The default locale to use.
    """
    integration_test_mode = ConfigValue("integration_test_mode", bool, default=False)
    """
    Whether to:
    - Force enable all ad platforms with a mock backend.
    - Skip ad platform OAuth transactions during orchestration calls.

    Only ever set during integration suite runs, as part of tricking channels into being
    enabled.
    """
    emit_json_logs = ConfigValue("emit_json_logs", bool, default=False)
    """
    Whether to emit JSON logs.
    """
    mock_backends_skip_hwid = ConfigValue("mock_backends_skip_hwid", bool, default=False)
    """
    Used to control how mock backends store their databases.

    Unless set, their database files will be stored with a hardware ID included to avoid
    conflicts when using shared cloud storage backends.
    """

    # Paths and URIs.
    locales_path = ConfigValue("locales_path", default="../common/locales")
    """
    The path to the locales directory.
    """
    languages_path = ConfigValue("languages_path", default="../common/languages.json")
    """
    The path to the languages file.
    """
    postgres_uri = ConfigValue("postgres_uri")
    """
    The connection string for the PostgreSQL database.
    """
    postgres_cloudsql_uri = ConfigValue("postgres_cloudsql_uri")
    """
    The connection string for the PostgreSQL Cloud SQL database of the format:
    ```
    project:region:instance:user:db
    ```
    """

    # Service configuration.
    service_port = ConfigValue("service_port", int)
    """
    The port on which to host the running service.
    """
    service_origin = ConfigValue("service_origin")
    """
    The origin of the running service for CORS control, if applicable. Note
    authentication does not use cookies and therefore is not highly CORS vulnerable.
    """
    service_name = ConfigValue("service_name", default="local")
    """
    The name of the running service.
    """
    service_env = ConfigValue("service_env", default="local")
    """
    The environment of the running service.
    """

    # Keys.
    encryption_key = ConfigValue("encryption_key")
    """
    The encryption key for OAuth tokens and other authentication symbols.
    """
    auth_token_hmac_key = ConfigValue("auth_token_hmac_key")
    """
    The HMAC key for authentication tokens.
    """
    google_maps_api_key = ConfigValue("google_maps_api_key")
    """
    The API key for Google Maps.
    """

    # Mailer.
    mailer = ConfigValue("mailer", default="dummy")
    """
    The `Mailer` implementation to use.
    """
    # Mailer - SMTP.
    smtp_host = ConfigValue("smtp_host")
    """
    The SMTP backend host.
    """
    smtp_port = ConfigValue("smtp_port", int)
    """
    The SMTP backend port.
    """
    smtp_user = ConfigValue("smtp_user")
    """
    User for the SMTP backend.
    """
    smtp_password = ConfigValue("smtp_password")
    """
    Password for the SMTP backend.
    """

    # AI provision.
    ai_provider = ConfigValue("ai_provider")
    """
    The `AIProvider` implementation to use.
    """
    # AI provision - Gemini.
    gemini_dev_api_key = ConfigValue("gemini_dev_api_key")
    """
    The Gemini developer API key to use.
    """
    gemini_gcp_project_id = ConfigValue("gemini_gcp_project_id")
    """
    The GCP project ID to use for Gemini, only applicable outside of Dev mode.
    """
    gemini_gcp_location = ConfigValue("gemini_gcp_location")
    """
    The GCP location to use for Gemini, only applicable outside of Dev mode.
    """
    gemini_model = ConfigValue("gemini_model", default="gemini-2.5-flash")
    """
    The Google Gemini model to use.
    """
    gemini_image_model = ConfigValue(
        "gemini_image_model",
        default="gemini-2.5-flash-image"
    )
    """
    The Google Gemini image model to use.
    """
    imagen_model = ConfigValue(
        "imagen_model",
        default="models/imagen-4.0-generate-001"
    )
    """
    The Google Imagen model to use.
    """

    # Storage backends.
    storage_backend = ConfigValue(
        "storage_backend",
        default="fs",
        integration_test_value="fs"
    )
    """
    The storage backend to use.
    """
    # Storage backends - FS.
    fs_storage_root = ConfigValue("fs_storage_root", default=".storage")
    """
    The root directory for filesystem storage, if that is the desired storage backend.
    """
    # Storage backends - Google.
    google_bucket_platform = ConfigValue("google_bucket_platform")
    """
    The name of the GCP bucket to use for platform data, if Google is the configured
    storage backend.
    """
    google_bucket_creative = ConfigValue("google_bucket_creative")
    """
    The name of the GCP bucket to use for creatives data, if Google is the configured
    storage backend.
    """

    # Analytics backends.
    analytics_backend = ConfigValue("analytics_backend", default="dummy")
    """
    The `AnalyticsBackend` implementation to use.
    """
    # Analytics backends - BigQuery.
    bigquery_project_id = ConfigValue("bigquery_project_id")
    """
    The GCP project ID to use for BigQuery.
    """
    bigquery_dataset_id = ConfigValue("bigquery_dataset_id")
    """
    The BigQuery dataset ID to use.
    """
    bigquery_table_name = ConfigValue("bigquery_table_name")
    """
    The BigQuery table name to use.
    """

    # Ad platforms - Google.
    google_client_id = ConfigValue(
        "google_client_id",
        integration_test_value="dummy"
    )
    """
    The client ID for the Google Ads & DV360 platforms.
    """
    google_client_secret = ConfigValue(
        "google_client_secret",
        integration_test_value="dummy"
    )
    """
    The client secret for the Google Ads & DV360 platforms.
    """
    google_ads_dev_token = ConfigValue(
        "google_ads_dev_token",
        integration_test_value=""
    )
    """
    The developer token for the Google Ads platform.
    """
    google_dv360_use_mock_backend = ConfigValue(
        "google_dv360_use_mock_backend", bool,
        default=False,
        integration_test_value=True
    )
    """
    Whether to use a mock Google DV360 backend.
    """
    # Ad platforms - Meta.
    meta_app_id = ConfigValue(
        "meta_app_id",
        integration_test_value="dummy"
    )
    """
    The app ID for the Meta platform.
    """
    meta_app_secret = ConfigValue(
        "meta_app_secret",
        integration_test_value="dummy"
    )
    """
    The app secret for the Meta platform.
    """
    meta_login_config_id = ConfigValue("meta_login_config_id", default="")
    """
    The login configuration ID for OAuth flows.

    Only required in non-mock deployments.
    """
    meta_use_mock_backend = ConfigValue(
        "meta_use_mock_backend", bool,
        default=False,
        integration_test_value=True
    )
    """
    Whether to use a mock Meta backend.
    """
    # Ad platforms - Snapchat.
    snapchat_client_id = ConfigValue(
        "snapchat_client_id",
        integration_test_value="dummy"
    )
    """
    The Confidential OAuth 2.0 Client ID for the Snapchat platform.
    """
    snapchat_client_secret = ConfigValue(
        "snapchat_client_secret",
        integration_test_value="dummy"
    )
    """
    The Confidential OAuth 2.0 Client Secret for the Snapchat platform.
    """
    snapchat_use_mock_backend = ConfigValue(
        "snapchat_use_mock_backend", bool,
        default=False,
        integration_test_value=True
    )
    """
    Whether to use a mock Snapchat backend.
    """
    # Ad platforms - TikTok.
    tiktok_app_id = ConfigValue(
        "tiktok_app_id",
        integration_test_value="dummy"
    )
    """
    The app ID for the TikTok platform.
    """
    tiktok_app_secret = ConfigValue(
        "tiktok_app_secret",
        integration_test_value="dummy"
    )
    """
    The app secret for the TikTok platform.
    """
    tiktok_use_mock_backend = ConfigValue(
        "tiktok_use_mock_backend", bool,
        default=False,
        integration_test_value=True
    )
    """
    Whether to use a mock TikTok backend.
    """
    # Ad platforms - Amazon.
    amazon_client_id = ConfigValue(
        "amazon_client_id",
        integration_test_value="dummy"
    )
    """
    The Confidential OAuth 2.0 Client ID for the Amazon platform.
    """
    amazon_client_secret = ConfigValue(
        "amazon_client_secret",
        integration_test_value="dummy"
    )
    """
    The Confidential OAuth 2.0 Client Secret for the Amazon platform.
    """
    amazon_use_mock_backend = ConfigValue(
        "amazon_use_mock_backend", bool,
        default=False,
        integration_test_value=True
    )
    """
    Whether to use a mock Amazon backend.
    """
    # Ad platforms - Pinterest.
    pinterest_app_id = ConfigValue(
        "pinterest_app_id",
        integration_test_value="mock"
    )
    """
    The ID of the registered Pinterest App.

    If set to `mock`, the OAuth flow will be mocked.
    """
    pinterest_app_secret = ConfigValue(
        "pinterest_app_secret",
        integration_test_value="dummy"
    )
    """
    The generated OAuth secret of the registed Pinterest App.
    """
    pinterest_use_mock_backend = ConfigValue(
        "pinterest_use_mock_backend", bool,
        default=False,
        integration_test_value=True
    )
    """
    Whether to use a mock Pinterest backend.
    """

def _create_config():
    """
    Create the configuration.
    """
    if os.getenv("LOAD_DOTENVS"):
        for env_file in os.getenv("LOAD_DOTENVS").split(";"):
            if not os.path.isfile(env_file):
                msg = (
                    "warning: missing specified LOAD_DOTENVS path: "
                    f"{env_file}, skipping"
                )
                print(msg, file=sys.stderr)
            else:
                load_dotenv(env_file)

    return Config()

config = _create_config()
