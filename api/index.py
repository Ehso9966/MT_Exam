import sys
from pathlib import Path

# Ensure the repo `backend/` package is importable from the function context
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from backend.app.main import app  # FastAPI instance