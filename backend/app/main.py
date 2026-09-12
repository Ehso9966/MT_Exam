"""FastAPI application entry point.

Run locally with:
    cd backend
    source .venv/bin/activate   # or .venv\\Scripts\\activate on Windows
    uvicorn app.main:app --reload --port 8000
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Awaitable, Callable

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .config import get_settings, validate_startup
from .errors import Code, err
from .routes import chat, health, models
from .sargalay import SargalayClient


# ---- Logging filter: redact API keys from any log record ----
_SECRET_HEADERS = {"authorization", "x-sargalay-user-key"}


class _RedactSecretsFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        try:
            msg = record.getMessage()
        except Exception:
            return True
        lower = msg.lower()
        if "bearer " in lower or "x-sargalay-user-key" in lower:
            # Naive but safe: scrub the entire message.
            record.msg = "[REDACTED: secret-bearing log line suppressed]"
            record.args = ()
        return True


def _configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.addFilter(_RedactSecretsFilter())
    root = logging.getLogger()
    # Don't double-add handlers under --reload.
    if not any(isinstance(f, _RedactSecretsFilter) for f in (h.filters for h in root.handlers)):
        root.addHandler(handler)
    root.setLevel(logging.INFO)


_configure_logging()
logger = logging.getLogger("mt_exam.backend")


# ---- Body size limit middleware (cheap version: Content-Length check) ----
class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_bytes: int) -> None:
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable]
    ):
        cl = request.headers.get("content-length")
        if cl is not None:
            try:
                if int(cl) > self.max_bytes:
                    payload = err(Code.HTTP_ERROR, "Request body too large.")
                    return JSONResponse(status_code=413, content=payload.model_dump())
            except ValueError:
                pass
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    validate_startup()  # raises SystemExit if no key
    client = SargalayClient(settings)
    await client.__aenter__()
    app.state.sargalay = client
    app.state.settings = settings
    logger.info(
        "Backend ready. server_key_configured=%s base_url=%s model=%s",
        settings.server_key_configured, settings.sargalay_base_url, settings.sargalay_default_model,
    )
    try:
        yield
    finally:
        await client.__aexit__(None, None, None)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="MT Exam Studio — Sargalay Proxy",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS
    origins = settings.cors_origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        max_age=3600,
    )

    # Body size cap
    app.add_middleware(BodySizeLimitMiddleware, max_bytes=settings.max_request_bytes)

    # Routes
    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(models.router, prefix="/api", tags=["models"])
    app.include_router(chat.router, prefix="/api", tags=["chat"])

    @app.get("/")
    async def root() -> dict:
        return {
            "service": "mt-exam-studio-backend",
            "endpoints": ["/api/health", "/api/models", "/api/chat"],
        }

    return app


app = create_app()
