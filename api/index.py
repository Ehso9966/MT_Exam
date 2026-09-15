import sys
from pathlib import Path

# Add the project root to sys.path so 'backend' package is importable.
# On Vercel, includeFiles copies backend/ alongside this function.
# On localhost, the project root already contains backend/.
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from backend.app.main import app  # noqa: E402
