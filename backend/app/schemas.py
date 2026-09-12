"""Pydantic models for request/response shapes."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ChatRequest(BaseModel):
    """OpenAI-compatible chat completion request.

    The `messages` field is a passthrough — Sargalay accepts the same shape
    as OpenAI's chat completions API.
    """

    model_config = ConfigDict(extra="allow")

    messages: List[Dict[str, Any]] = Field(
        ...,
        min_length=1,
        description="OpenAI-style messages array (text + image_url content parts).",
    )
    model: Optional[str] = Field(
        default=None,
        description="Override the server default model.",
    )
    max_tokens: Optional[int] = Field(default=None, ge=1)
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)
    response_format: Optional[Dict[str, Any]] = Field(default=None)
    stream: Optional[bool] = Field(default=False)


class ErrorResponse(BaseModel):
    """Error envelope mirroring the JS MT.AIErrors shape used by the frontend.

    Codes mirror js/ai/errors.js ErrorCodes:
      NO_KEY, AUTH, RATE_LIMIT, NETWORK, TIMEOUT, HTTP_ERROR,
      PARSE, SCHEMA, EMPTY_CONTENT, MAX_TOKENS, TRUNCATED, FILE_READ, IMAGE_DECODE
    """

    code: str
    message: str
    detail: Optional[str] = None
