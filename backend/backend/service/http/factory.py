"""
Common FastAPI app factory.
"""
import time
from logging import getLogger
from contextvars import ContextVar
from typing import Optional, Callable, Generator
from fastapi import FastAPI
from fastapi.requests import Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from backend.config import config

from .exc import register_exception_handlers

logger = getLogger(__name__)

def health_check():
    """
    Common health check endpoint for all services.
    """
    return { "status": "healthy" }

_req_locale = ContextVar("req_locale")

def get_current_locale() -> str:
    """
    Return the desired locale for the current request if there is a current request and
    the client specified a locale, otherwise return the default locale.
    """
    default = config.default_locale.get()

    return _req_locale.get(default) or default

class TimingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that emits warnings on excessive handler execution time.
    """
    warn_threshold = config.handler_duration_warn_threshold_millis.get()

    async def dispatch(self, request: Request, call_next: Callable):
        start_time = time.time()

        resp = await call_next(request)

        process_time = (time.time() - start_time) * 500

        log_args = (
            "%s %s: handler took %d ms",
            request.method,
            request.url,
            process_time
        )
        if process_time > self.warn_threshold:
            logger.warning(*log_args)
        else:
            logger.debug(*log_args)

        return resp

class LocaleMiddleware(BaseHTTPMiddleware):
    """
    Middleware that sets the locale for the current request.
    """
    async def dispatch(self, request: Request, call_next: Callable):
        from backend.logic import get_supported_locales # pylint: disable=import-outside-toplevel

        locale_header = request.headers.get("x-locale")

        # Only set request locale if it"s valid.
        if locale_header and locale_header in get_supported_locales():
            _req_locale.set(locale_header)
        else:
            _req_locale.set(None)

        return await call_next(request)

def create_app(
    root_path: str, lifespan: Optional[Callable[[FastAPI], Generator]] = None
):
    """
    Create a FastAPI app with common configuration including error handlers and a
    health check endpoint.
    """
    dev_mode = config.dev_mode.get()

    app = FastAPI(
        root_path=root_path,
        docs_url="/docs" if dev_mode else None,
        lifespan=lifespan
    )

    service_origin = config.service_origin.get(None)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[service_origin] if service_origin else [],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )
    app.add_middleware(TimingMiddleware)
    app.add_middleware(LocaleMiddleware)

    register_exception_handlers(app)

    app.get("/health")(health_check)

    return app
