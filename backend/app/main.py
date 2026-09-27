"""
main.py
-------
FastAPI application entry point.

Lifecycle:
  - On startup: configures logging, initialises ChatService (loads Gemini +
    ChromaDB clients) and attaches it to app.state so all routes share a
    single instance.
  - On shutdown: no special teardown needed (ChromaDB handles persistence).
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.middleware import RequestLoggingMiddleware
from app.api.routes.chat import router as chat_router
from app.core.config import LOG_LEVEL
from app.core.logging_config import setup_logging
from app.services.chat_service import ChatService


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    setup_logging(level=LOG_LEVEL)
    app.state.chat_service = ChatService()
    yield
    # --- Shutdown — nothing to close explicitly ---


app = FastAPI(
    title="AssistFlow — AI-Assisted Workplace Support System",
    version="0.1.0",
    lifespan=lifespan,
)

# Request/response logger — must be added before CORSMiddleware so latency
# includes the full round-trip, not just post-CORS processing.
app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten to the extension origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
