import json
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

_error_detail = None

async def app(scope, receive, send):
    if scope["type"] == "lifespan":
        return
    if scope["type"] == "http":
        body = json.dumps({"error": "backend_startup_failure", "detail": _error_detail}).encode()
        await send({
            "type": "http.response.start",
            "status": 500,
            "headers": [[b"content-type", b"application/json"]],
        })
        await send({
            "type": "http.response.body",
            "body": body,
        })

try:
    from backend.app.main import app  # noqa: F811, E402
except BaseException as exc:
    _error_detail = (
        "The backend failed to start. "
        "Ensure SARGALAY_API_KEY is set in your Vercel environment variables. "
        f"Original error: {exc}"
    )
