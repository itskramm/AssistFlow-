"""
routes/chat.py
--------------
FastAPI routes for the AssistFlow backend.

Endpoints:
  GET  /api/health         — liveness check
  GET  /api/offline-status — reports whether the offline SQLite cache is ready
  POST /api/chat           — main RAG query endpoint (auto-falls back offline)
  POST /api/offline-query  — query the SQLite cache directly, no internet needed
  POST /api/feedback       — thumbs up/down logging (stub, ready for DB extension)
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.config import OFFLINE_DB_PATH

router = APIRouter(prefix="/api", tags=["chat"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Agent's query or issue description")
    page_context: dict | None = Field(
        default=None,
        description="Live CRM page data extracted by the content script "
                    "(ticket subject, description, status, priority, customer, ticketId)"
    )


class OfflineQueryRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Agent's query")


class FeedbackRequest(BaseModel):
    message: str = Field(..., description="The original query")
    reply: str = Field(..., description="The reply that was rated")
    rating: int = Field(..., ge=1, le=2, description="1 = thumbs up, 2 = thumbs down")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/health")
async def health_check() -> dict:
    return {"status": "ok", "service": "assistflow-backend"}


@router.get("/offline-status")
async def offline_status() -> dict:
    """
    Reports whether the local SQLite offline cache exists and has protocols loaded.
    The extension can call this on startup to know if offline mode is available.
    """
    import sqlite3
    db_path = Path(OFFLINE_DB_PATH)
    if not db_path.exists():
        return {"available": False, "reason": "Offline DB not found", "protocol_count": 0}
    try:
        conn = sqlite3.connect(str(db_path))
        count = conn.execute("SELECT COUNT(*) FROM offline_protocols").fetchone()[0]
        conn.close()
        return {"available": count > 0, "protocol_count": count}
    except Exception as exc:
        return {"available": False, "reason": str(exc), "protocol_count": 0}


@router.post("/chat")
async def chat(request: ChatRequest, req: Request) -> dict:
    """
    Accepts a natural-language query, runs the RAG pipeline, and returns a
    grounded response. Automatically falls back to the offline SQLite cache
    when internet is unavailable — no special handling needed by the client.
    """
    chat_service = req.app.state.chat_service

    try:
        result = await chat_service.process_message(
            request.message,
            page_context=request.page_context,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return result


@router.post("/offline-query")
async def offline_query(request: OfflineQueryRequest, req: Request) -> dict:
    """
    Queries the local SQLite cache directly — no internet or Gemini API needed.
    Use this as a guaranteed-available fallback when the main /api/chat endpoint
    cannot be reached or is taking too long.
    """
    chat_service = req.app.state.chat_service
    return chat_service.offline_query(request.message)


@router.post("/feedback")
async def feedback(request: FeedbackRequest) -> dict:
    """
    Receives agent feedback on a response. Currently logs to stdout;
    ready to be wired into a database for fine-tuning data collection.
    """
    rating_label = "thumbs_up" if request.rating == 1 else "thumbs_down"
    print(
        f"[FEEDBACK] rating={rating_label} | "
        f"query={request.message[:80]!r} | "
        f"reply={request.reply[:80]!r}"
    )
    return {"status": "ok", "rating": rating_label}
