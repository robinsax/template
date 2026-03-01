"""
Database session provision.
"""
import sys
from contextlib import contextmanager
from typing import Optional, Generator, Callable
from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from google.cloud.sql.connector import Connector, IPTypes

from backend.config import ConfigError, config

_engine: Optional[Engine] = None
_SessionLocal: Optional[type[Session]] = None

def _get_session_local():
    """
    Lazy-initialize and return the SQLAlchemy session factory.
    """
    global _SessionLocal # pylint: disable=global-statement

    if _SessionLocal is None:
        engine = get_engine()
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    return _SessionLocal

def _get_cloudsql_connection_factory() -> Callable:
    """
    Create and return a CloudSQL connection factory callable.
    """
    try:
        project, region, instance, user, db_name = (
            config.postgres_cloudsql_uri.get().split(":")
        )
    except ValueError:
        raise ConfigError("Invalid POSTGRES_CLOUDSQL_URI") from None

    connector = Connector()

    def factory():
        return connector.connect(
            ":".join((project, region, instance)),
            "pg8000",
            user=user,
            db=db_name,
            ip_type=IPTypes.PRIVATE,
            enable_iam_auth=True
        )

    return factory

def get_engine() -> Engine:
    """
    Return the global SQLAlchemy engine binding.
    """
    global _engine # pylint: disable=global-statement

    if _engine is None:
        if config.postgres_uri.is_set:
            # Create standard engine.
            _engine = create_engine(config.postgres_uri.get())
        elif config.postgres_cloudsql_uri.is_set:
            # Create CloudSQL connected engine.
            connection_factory = _get_cloudsql_connection_factory()

            _engine = create_engine(
                "postgresql+pg8000://",
                creator=connection_factory,
                pool_pre_ping=True,
                pool_recycle=1800
            )
        else:
            raise ConfigError("No POSTGRES_URI or POSTGRES_CLOUDSQL_URI")

        # Enable debug query logging if configured.
        if config.sqlalchemy_echo.get():
            import sqlparse # pylint: disable=import-outside-toplevel

            def show_formatted(*args):
                print(
                    sqlparse.format(args[2], reindent=True, keyword_case="lower"),
                    file=sys.stderr
                )

            event.listen(_engine, "before_cursor_execute", show_formatted)

    return _engine

def get_session() -> Generator[Session, None, None]:
    """
    Return a generator for an SQLAlchemy session. This should be used for API endpoint
    `Depends` clauses.

    In most other cases, `get_session_as_context()` should be used instead.

    Direct usage:
    ```py
    session_factory = get_session()
    try:
        session = next(session_factory)
        # ...
    finally:
        next(session_factory)
    ```
    """
    session = _get_session_local()()
    try:
        yield session
    finally:
        session.close()

@contextmanager
def _yield_session() -> Generator[Session, None, None]:
    """
    Yield a session.
    """
    yield from get_session()

def get_session_as_context() -> Session:
    """
    Return a session as a context manager.

    Usage:
    ```py
    with get_session_as_context() as session:
        # ...
    ```
    """
    return _yield_session()
