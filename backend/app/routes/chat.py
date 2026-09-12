"""POST /api/chat — proxy Sargalay chat completions."""
from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Header, HTTPException, Request

from ..schemas import ChatRequest
from ..sargalay import SargalayError


router = APIRouter()


@router.post("/chat")
async def chat_completion(
    body: ChatRequest,
    request: Request,
    x_sargalay_user_key: Optional[str] = Header(default=None, alias="X-Sargalay-User-Key"),
) -> Dict[str, Any]:
    client = request.app.state.sargalay
    payload = body.model_dump(exclude_none=True)
    try:
        return await client.chat_completion(payload, user_key=x_sargalay_user_key)
    except SargalayError as e:
        raise HTTPException(status_code=e.status_code, detail=e.payload.model_dump()) from e
