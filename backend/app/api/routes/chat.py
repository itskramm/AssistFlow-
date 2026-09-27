"""
routes/chat.py
--------------
FastAPI routes for the AssistFlow backend.

Endpoints:
  GET  /api/health  — liveness check
  POST /api/chat    — main RAG query endpoint
  POST /api/feedback — thumbs up/down logging (stub, ready for DB extension)
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["chat"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Agent's query or issue description")


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


@router.post("/chat")
async def chat(request: ChatRequest, req: Request) -> dict:
    """
    Accepts a natural-language query from the agent, runs the RAG pipeline,
    and returns a grounded, step-by-step response from Gemini 2.5 Flash.
    """
    chat_service = req.app.state.chat_service

    try:
        result = await chat_service.process_message(request.message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return result


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
