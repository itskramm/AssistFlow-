"""
run.py
------
Convenience startup script for the AssistFlow FastAPI backend.

Usage (from the backend/ directory):
    python run.py              # default: host=0.0.0.0, port=8000
    python run.py --reload     # auto-reload on file changes (dev mode)
    python run.py --port 9000  # custom port

Alternatively, use uvicorn directly:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

import argparse
import sys
from pathlib import Path

# Ensure the backend/ directory is on the path when run from the project root
sys.path.insert(0, str(Path(__file__).resolve().parent))

import uvicorn
from app.core.config import FASTAPI_HOST, FASTAPI_PORT


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Start the AssistFlow FastAPI backend server."
    )
    parser.add_argument(
        "--host",
        default=FASTAPI_HOST,
        help=f"Host to bind to (default: {FASTAPI_HOST})",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=FASTAPI_PORT,
        help=f"Port to listen on (default: {FASTAPI_PORT})",
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload on source changes (development only)",
    )
    parser.add_argument(
        "--log-level",
        default="info",
        choices=["debug", "info", "warning", "error"],
        help="Uvicorn log level (default: info)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    print(f"\n🚀  AssistFlow backend starting on http://{args.host}:{args.port}")
    print(f"    Docs: http://127.0.0.1:{args.port}/docs")
    print(f"    Health: http://127.0.0.1:{args.port}/api/health")
    print(f"    Reload: {args.reload}\n")

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level=args.log_level,
    )
