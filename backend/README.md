# MT Exam Studio — Backend (Sargalay Proxy)

A small FastAPI service that proxies AI requests to the **Sargalay API** so the
private server key never ships with the frontend.

## Why a backend?

The previous frontend called the Sargalay backend directly from the browser,
exposing the project key to anyone who opened the network panel. This proxy:

- Keeps the **default ("MT AI") key on the server** (in `backend/.env`).
- Mirrors the existing JS error code vocabulary so the frontend's error toasts
  keep working unchanged.

## Quick start

```bash
cd backend

# 1. Create a virtualenv
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create your env file (DO NOT commit this)
cp .env.example .env       # Windows: copy .env.example .env
# Edit .env and paste your real key:
#   SARGALAY_API_KEY=sk-your-real-key-here

> ⚠️ **Never commit this file.** `backend/.env` is already listed in
> `backend/.gitignore` and the root `.gitignore`.

If it ever shows up in `git status`, run `git rm --cached backend/.env`.

# 4. Run the server
uvicorn app.main:app --reload --port 8000
```

Then open `http://localhost:8000/api/health` in your browser — you should see:

```json
{"status":"ok","server_key_configured":true,"model":"deepseek-v4-flash-vision-exp"}
```

## Configuration reference

| Variable | Default | Purpose |
|---|---|---|
| `SARGALAY_API_KEY` | *(required)* | Server-side default key. The backend refuses to start without it. |
| `SARGALAY_BASE_URL` | `https://api.sargalay.com/v1` | Sargalay API root. |
| `SARGALAY_DEFAULT_MODEL` | `deepseek-v4-flash-vision-exp` | Default model for chat completions. |
| `SARGALAY_MAX_TOKENS_PER_IMAGE` | `384` | Per-image token cap. Requests above this are silently clamped (and logged). |
| `SARGALAY_TIMEOUT_SECONDS` | `120` | Upstream HTTP timeout. |
| `ALLOWED_ORIGINS` | `*` | CORS allowlist (comma-separated). Set to your frontend domain in production. |
| `MAX_REQUEST_BYTES` | `10485760` (10 MB) | Body size cap. |

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness + server-key presence check. |
| `GET` | `/api/test` | Validate the server key with a 1-token test request. |

## Development notes

- The backend is OpenAI-API-compatible on the upstream side. If Sargalay ever
  changes its auth scheme, edit `app/sargalay.py::_auth_headers` only.
- The frontend's `js/ai/baiClient.js` is configured via `window.MT_API_BASE`
  in `index.html` (defaults to `http://localhost:8000`). Change there to
  point at a deployed backend.
- Logs are scrubbed of any `Authorization` / `X-Sargalay-User-Key` content
  via `main.py::_RedactSecretsFilter`.