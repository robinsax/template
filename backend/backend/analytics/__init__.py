"""
Analytics backend adapters.
"""
from backend.config import ConfigError, config

from .base import (
    AnalyticsBackend, AnalyticsModel, DailyMetricsModel, RawAnalyticsModel,
    PerformanceMetricsModel, RawAnalyticsTrendModel
)
from .bigquery import BigQueryAnalyticsBackend
from .dummy import DummyAnalyticsBackend

def get_analytics_backend() -> AnalyticsBackend:
    """
    Return the configured `AnalyticsBackend`.
    """
    backend = config.analytics_backend.get()

    if backend == "bigquery":
        return BigQueryAnalyticsBackend()

    if backend == "dummy":
        return DummyAnalyticsBackend()

    raise ConfigError("invalid analytics backend: " + backend)
