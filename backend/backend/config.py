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
    google_bucket_default = ConfigValue("google_bucket_default")
    """
    The name of the GCP bucket to use for data by default, if Google is the configured
    storage backend.
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
