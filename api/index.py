import json
import sys
from pathlib import Path

# Add the project root to sys.path so 'backend' package is importable.
# On Vercel, includeFiles copies backend/ alongside this function.
# On localhost, the project root already contains backend/.
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

try:
    from backend.app.main import app  # noqa: E402
except BaseException as exc:
    _error_detail = (
        "The backend failed to start. "
        "Ensure SARGALAY_API_KEY is set in your Vercel environment variables. "
        f"Original error: {exc}"
    )

    async def app(scope, receive, send):  # noqa: D103
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
