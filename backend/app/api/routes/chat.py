from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


@router.get("/health")
async def health_check() -> dict:
    return {"status": "ok", "service": "assistflow-backend"}


@router.post("/chat")
async def chat(request: ChatRequest) -> dict:
    message = request.message.strip()

    if not message:
        return {"reply": "Please provide a valid support request.", "status": "error"}

    reply = (
        "I’ve received your request. Based on the current troubleshooting workflow, "
        "check the system status, validate the active incident checklist, and escalate "
        "if the issue persists."
    )

    return {
        "reply": reply,
        "status": "ok",
        "input": message,
        "source": "local-backend"
    }
