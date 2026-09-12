"""GET /api/health — liveness + server-key presence check."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from ..config import Settings, get_settings


router = APIRouter()


@router.get("/health")
async def health(settings: Settings = Depends(get_settings)) -> dict:
    return {
        "status": "ok",
        "server_key_configured": settings.server_key_configured,
        "model": settings.sargalay_default_model,
    }
