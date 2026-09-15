"""Application settings loaded from environment / .env file."""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import List

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# Load .env file from the backend/ directory (this file's parent's parent).
_BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_DIR / ".env")


class Settings(BaseSettings):
    """Sargalay proxy configuration.

    All values are read from environment variables (or a backend/.env file).
    No real API keys may be hardcoded here.
    """

    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Sargalay upstream ---
    sargalay_api_key: str = Field(
        default="",
        description="Server-side default Sargalay key (MT AI free mode). Required.",
    )
    sargalay_base_url: str = Field(
        default="https://api.sargalay.com/v1",
        description="Sargalay API root.",
    )
    sargalay_default_model: str = Field(
        default="deepseek-v4-flash-vision-exp",
        description="Default model for chat completions.",
    )
    sargalay_max_tokens_per_image: int = Field(
        default=384,
        ge=1,
        description="Maximum tokens allowed per document image in a chat request.",
    )
    sargalay_timeout_seconds: float = Field(
        default=120.0,
        gt=0,
        description="Per-request timeout for upstream Sargalay calls.",
    )

    # --- Server config ---
    allowed_origins: str = Field(
        default="*",
        description="Comma-separated CORS origin allowlist. Use '*' for development only.",
    )
    max_request_bytes: int = Field(
        default=10 * 1024 * 1024,
        gt=0,
        description="Maximum accepted request body size in bytes.",
    )

    @property
    def cors_origins(self) -> List[str]:
        raw = (self.allowed_origins or "").strip()
        if not raw or raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]

    @property
    def server_key_configured(self) -> bool:
        return bool(self.sargalay_api_key and self.sargalay_api_key.strip())


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings accessor. Reads .env once on first call."""
    return Settings()


def validate_startup() -> None:
    """Hard-fail at startup if SARGALAY_API_KEY is not set.

    Raises SystemExit with a clear message so the operator knows what to fix.
    """
    s = get_settings()
    if not s.sargalay_api_key:
        raise SystemExit(
            "\n[fatal] SARGALAY_API_KEY is not set.\n"
            "  -> Create backend/.env (copy from backend/.env.example) and add:\n"
            "       SARGALAY_API_KEY=sk-your-real-key-here\n"
        )