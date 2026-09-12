"""Translate Sargalay / network errors into the JS MT.AIErrors code vocabulary.

The frontend's `MT.AIErrors.friendlyMessage(err)` understands these codes
(see js/ai/errors.js). Keeping parity means the existing UI toasts continue
to work without changes.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

import httpx

from .schemas import ErrorResponse


# Codes mirror js/ai/errors.js ErrorCodes.
class Code:
    NO_KEY = "NO_KEY"
    AUTH = "AUTH"
    RATE_LIMIT = "RATE_LIMIT"
    NETWORK = "NETWORK"
    TIMEOUT = "TIMEOUT"
    HTTP_ERROR = "HTTP_ERROR"
    PARSE = "PARSE"
    SCHEMA = "SCHEMA"
    EMPTY_CONTENT = "EMPTY_CONTENT"
    MAX_TOKENS = "MAX_TOKENS"
    TRUNCATED = "TRUNCATED"
    FILE_READ = "FILE_READ"
    IMAGE_DECODE = "IMAGE_DECODE"


# Human-readable fallback messages (English; the frontend localises via i18n).
_MESSAGES = {
    Code.NO_KEY: "No API key. Configure SARGALAY_API_KEY in backend/.env.",
    Code.AUTH: "Invalid API key.",
    Code.RATE_LIMIT: "Too many requests. Please wait.",
    Code.NETWORK: "Network connection issue.",
    Code.TIMEOUT: "Server timeout.",
    Code.HTTP_ERROR: "Upstream error.",
    Code.PARSE: "Failed to parse AI response.",
    Code.SCHEMA: "AI response did not match expected schema.",
    Code.EMPTY_CONTENT: "AI returned no content. Retry.",
    Code.MAX_TOKENS: "AI response was too long. Increase max_tokens.",
    Code.TRUNCATED: "AI response was incomplete (token limit). Increase max_tokens and retry.",
    Code.FILE_READ: "Could not read uploaded file.",
    Code.IMAGE_DECODE: "Could not decode image.",
}


def err(code: str, detail: Optional[str] = None) -> ErrorResponse:
    return ErrorResponse(
        code=code,
        message=_MESSAGES.get(code, _MESSAGES[Code.HTTP_ERROR]),
        detail=detail,
    )


def from_httpx(exc: httpx.HTTPError) -> ErrorResponse:
    """Map an httpx exception to the closest JS error code."""
    if isinstance(exc, httpx.TimeoutException):
        return err(Code.TIMEOUT, str(exc))
    if isinstance(exc, httpx.ConnectError):
        return err(Code.NETWORK, str(exc))
    if isinstance(exc, httpx.RequestError):
        return err(Code.NETWORK, str(exc))
    return err(Code.HTTP_ERROR, str(exc))


def from_http_status(status: int, body: Optional[Dict[str, Any]] = None) -> ErrorResponse:
    body_msg = None
    if isinstance(body, dict):
        body_msg = body.get("message") or body.get("error") or None
    detail = f"{status} {body_msg or ''}".strip()

    if status in (401, 403):
        return err(Code.AUTH, detail)
    if status == 429:
        return err(Code.RATE_LIMIT, str(status))
    if status == 400:
        return err(Code.HTTP_ERROR, detail)
    if status == 408:
        return err(Code.TIMEOUT, detail)
    if status == 413:
        return err(Code.HTTP_ERROR, "Request body too large.")
    return err(Code.HTTP_ERROR, detail)