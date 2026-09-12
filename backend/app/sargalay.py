"""Async httpx client wrapping the Sargalay (OpenAI-compatible) API."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

import httpx

from .config import Settings
from .errors import Code, err, from_http_status, from_httpx
from .schemas import ErrorResponse


logger = logging.getLogger(__name__)


class SargalayError(Exception):
    def __init__(self, payload: ErrorResponse, status_code: int):
        super().__init__(payload.message)
        self.payload = payload
        self.status_code = status_code


def count_images(messages: List[Dict[str, Any]]) -> int:
    """Count image_url parts across all messages (used for per-image cap)."""
    total = 0
    for m in messages or []:
        content = m.get("content")
        if isinstance(content, list):
            for part in content:
                if isinstance(part, dict) and part.get("type") == "image_url":
                    total += 1
    return total


def clamp_max_tokens(
    requested: Optional[int],
    image_count: int,
    cap: int,
) -> Tuple[Optional[int], bool]:
    """Clamp max_tokens to the per-image cap when images are present.

    Returns (effective_max_tokens, was_clamped).
    """
    if requested is None or image_count == 0:
        return requested, False
    allowed = cap * image_count
    if requested > allowed:
        logger.warning(
            "max_tokens=%d exceeds per-image cap (cap=%d, images=%d); clamping to %d",
            requested, cap, image_count, allowed,
        )
        return allowed, True
    return requested, False


class SargalayClient:
    """Thin async wrapper over Sargalay's OpenAI-compatible endpoints."""

    def __init__(self, settings: Settings):
        self._settings = settings
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self) -> "SargalayClient":
        self._client = httpx.AsyncClient(
            base_url=self._settings.sargalay_base_url,
            timeout=httpx.Timeout(self._settings.sargalay_timeout_seconds),
            headers={"User-Agent": "MT-Exam-Studio-Backend/1.0"},
        )
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    def _auth_headers(self, user_key: Optional[str]) -> Dict[str, str]:
        """Pick the key: per-request user key first, then server key.

        Raises SargalayError(NO_KEY) if neither is available.
        """
        key = (user_key or "").strip() or (self._settings.sargalay_api_key or "").strip()
        if not key:
            raise SargalayError(err(Code.NO_KEY, "No Sargalay key available."), 503)
        return {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    async def test_connection(self, user_key: Optional[str] = None) -> Dict[str, Any]:
        """Validate the key by sending a 1-token chat-completion request.

        Works for any OpenAI-compatible API regardless of whether /models is
        exposed. Returns {"ok": True, "model": <name>} on success.
        """
        assert self._client is not None
        body = {
            "model": self._settings.sargalay_default_model,
            "messages": [{"role": "user", "content": "ping"}],
            "max_tokens": 1,
        }
        # chat_completion already handles auth, error translation, and JSON
        # parsing. Any non-2xx is raised as SargalayError.
        await self.chat_completion(body, user_key=user_key)
        return {"ok": True, "model": body["model"]}

    async def chat_completion(
        self,
        body: Dict[str, Any],
        user_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """POST /chat/completions with the given OpenAI-shaped body.

        Applies the per-image max_tokens cap before sending.
        """
        assert self._client is not None
        headers = self._auth_headers(user_key)

        # Apply per-image cap if needed.
        messages = body.get("messages") or []
        image_count = count_images(messages)
        cap = self._settings.sargalay_max_tokens_per_image
        max_tokens = body.get("max_tokens")
        effective, _clamped = clamp_max_tokens(max_tokens, image_count, cap)
        if effective is not None:
            body["max_tokens"] = effective

        # Server default model when client didn't specify one.
        body.setdefault("model", self._settings.sargalay_default_model)

        try:
            resp = await self._client.post("/chat/completions", json=body, headers=headers)
        except httpx.HTTPError as e:
            raise SargalayError(from_httpx(e), 502) from e

        return await self._parse_json_response(resp)

    @staticmethod
    async def _parse_json_response(resp: httpx.Response) -> Dict[str, Any]:
        try:
            data = resp.json()
        except Exception:
            if resp.status_code >= 400:
                raise SargalayError(
                    from_http_status(resp.status_code, None),
                    resp.status_code,
                ) from None
            raise SargalayError(err(Code.PARSE, "Non-JSON response from upstream."), 502) from None

        if resp.status_code >= 400:
            payload = from_http_status(resp.status_code, data if isinstance(data, dict) else None)
            raise SargalayError(payload, resp.status_code)

        return data
