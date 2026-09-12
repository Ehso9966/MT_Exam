"""GET /api/test — validate Sargalay key by sending a 1-token chat probe.

Works around the fact that Sargalay (and similar OpenAI-compatible providers)
may not expose a /models listing endpoint. The test sends a minimal
chat-completion request and returns {ok, model} on success.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Header, HTTPException, Request

from ..sargalay import SargalayError


router = APIRouter()


@router.get("/test")
async def test_connection(
    request: Request,
    x_sargalay_user_key: Optional[str] = Header(default=None, alias="X-Sargalay-User-Key"),
) -> Dict[str, Any]:
    client = request.app.state.sargalay
    try:
        return await client.test_connection(user_key=x_sargalay_user_key)
    except SargalayError as e:
        raise HTTPException(status_code=e.status_code, detail=e.payload.model_dump()) from e
