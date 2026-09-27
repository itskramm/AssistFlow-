class ChatService:
    """Service layer for chat orchestration and future RAG integration."""

    def process_message(self, message: str) -> dict:
        text = (message or "").strip()

        if not text:
            return {"reply": "Please provide a valid support request.", "status": "error"}

        return {
            "reply": (
                "I’ve received your request. Based on the current troubleshooting workflow, "
                "check the system status, validate the active incident checklist, and escalate "
                "if the issue persists."
            ),
            "status": "ok",
            "input": text,
            "source": "chat-service"
        }
