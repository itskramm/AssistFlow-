"""
config.py
---------
Central configuration for the AssistFlow backend.
All values are read from environment variables (loaded from backend/.env).
"""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

BASE_DIR = Path(__file__).resolve().parents[2]

GEMINI_API_KEY:  str = os.getenv("GEMINI_API_KEY", "")
CHROMA_DB_PATH:  str = os.getenv("CHROMA_DB_PATH", str(BASE_DIR / "data" / "chroma"))
OFFLINE_DB_PATH: str = os.getenv("OFFLINE_DB_PATH", str(BASE_DIR / "data" / "offline_cache" / "offline.db"))
FASTAPI_HOST:    str = os.getenv("FASTAPI_HOST", "0.0.0.0")
FASTAPI_PORT:    int = int(os.getenv("FASTAPI_PORT", "8000"))
LOG_LEVEL:       str = os.getenv("LOG_LEVEL", "INFO")
