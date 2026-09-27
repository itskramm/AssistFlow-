"""
chat_service.py
---------------
Orchestrates the full RAG pipeline:
  1. Embeds the user query with text-embedding-004
  2. Retrieves the top-K most relevant chunks from ChromaDB
  3. Builds a structured prompt using the retrieved context
  4. Calls Gemini 2.5 Flash for a grounded, step-by-step response
  5. Falls back to the offline SQLite cache if Gemini is unreachable

Async safety:
  All synchronous LangChain / ChromaDB calls are offloaded to a thread-pool
  executor via asyncio.to_thread() so the FastAPI event loop is never blocked,
  allowing multiple agents to query the system concurrently without lag.

Resilience:
  Gemini API calls are wrapped in an exponential-backoff retry (3 attempts)
  to handle transient rate-limit (429) and server errors (5xx).
"""

import asyncio
import logging
import sqlite3
import time
from pathlib import Path

import chromadb
from chromadb.config import Settings
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, SystemMessage

from app.core.config import (
    GEMINI_API_KEY,
    CHROMA_DB_PATH,
    OFFLINE_DB_PATH,
)

logger = logging.getLogger("assistflow.chat_service")

COLLECTION_NAME = "assistflow_knowledge"
TOP_K = 4           # chunks to retrieve per query
MAX_RETRIES = 3     # Gemini call attempts before giving up
RETRY_BASE_S = 1.5  # seconds — doubles on each retry

SYSTEM_PROMPT = """You are AssistFlow, an AI support assistant for call center agents.
Your job is to help agents resolve issues quickly using the company's Standard Operating Procedures (SOPs) and troubleshooting guides provided in the context below.

Rules:
- Base your answer primarily on the provided context. You may use general IT knowledge only to clarify or supplement the context.
- Format your response as clear, numbered step-by-step instructions when the query involves a procedure or troubleshooting.
- If the context contains relevant information, use it — even if the match is partial.
- If the context contains absolutely no relevant information at all, say: "I couldn't find a matching procedure. Please escalate to your supervisor."
- Keep responses concise and actionable. Avoid filler phrases.
"""


class ChatService:
    """Handles query embedding, vector retrieval, and LLM generation."""

    def __init__(self) -> None:
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set. Check backend/.env.")

        # Embedding model for query vectorisation
        self._embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=GEMINI_API_KEY,
        )

        # Gemini 3.1 Flash Lite for generation
        self._llm = ChatGoogleGenerativeAI(
            model="gemini-3.1-flash-lite",
            google_api_key=GEMINI_API_KEY,
            temperature=0.2,
        )

        # ChromaDB persistent client
        Path(CHROMA_DB_PATH).mkdir(parents=True, exist_ok=True)
        self._chroma = chromadb.PersistentClient(
            path=CHROMA_DB_PATH,
            settings=Settings(anonymized_telemetry=False),
        )

        logger.info("ChatService initialised (Gemini 2.5 Flash + ChromaDB ready)")

    # ------------------------------------------------------------------
    # Public async interface
    # ------------------------------------------------------------------

    async def process_message(self, message: str, page_context: dict | None = None) -> dict:
        """
        Main entry point called by the /api/chat route.

        Args:
            message:      The agent's natural-language query.
            page_context: Optional dict of CRM ticket fields extracted from the
                          active browser page by the content script. When present
                          it is injected into the RAG prompt so Gemini can tailor
                          its answer to the specific ticket the agent is viewing.

        Returns a dict with:
          reply, status, source, latency_ms, retrieved_sources
        """
        text = (message or "").strip()
        if not text:
            return {"reply": "Please provide a valid support request.", "status": "error"}

        start = time.perf_counter()
        sources: list[str] = []

        try:
            # Offload blocking I/O to the thread pool — keeps the event loop free
            context_chunks, sources = await asyncio.to_thread(self._retrieve, text)
            reply = await self._generate_with_retry(text, context_chunks, page_context)
            source = "rag"
        except Exception as exc:
            logger.warning("RAG pipeline failed (%s). Trying offline cache.", exc)
            reply = await asyncio.to_thread(self._offline_fallback, text)
            source = "offline-cache"
            if reply is None:
                reply = (
                    "The AI service is currently unavailable and no cached procedure "
                    "matched your query. Please escalate to your supervisor."
                )
                source = "fallback"

        latency_ms = round((time.perf_counter() - start) * 1000, 1)
        logger.info(
            "process_message done | source=%s latency_ms=%s sources=%s",
            source, latency_ms, sources,
        )

        return {
            "reply": reply,
            "status": "ok",
            "source": source,
            "latency_ms": latency_ms,
            "retrieved_sources": sources,
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _retrieve(self, query: str) -> tuple[list[str], list[str]]:
        """
        Embed the query and retrieve the top-K chunks from ChromaDB.
        Runs synchronously — always call via asyncio.to_thread().
        """
        try:
            collection = self._chroma.get_collection(COLLECTION_NAME)
        except Exception:
            # Collection doesn't exist yet — knowledge base not ingested
            logger.warning("ChromaDB collection '%s' not found. Skipping retrieval.", COLLECTION_NAME)
            return [], []

        query_vector = self._embeddings.embed_query(query)

        results = collection.query(
            query_embeddings=[query_vector],
            n_results=min(TOP_K, collection.count()),
            include=["documents", "metadatas"],
        )

        chunks = results["documents"][0] if results["documents"] else []
        metadatas = results["metadatas"][0] if results["metadatas"] else []
        sources = list({m.get("source", "unknown") for m in metadatas})

        logger.debug("Retrieved %d chunks from %s sources.", len(chunks), len(sources))
        return chunks, sources

    async def _generate_with_retry(
        self,
        query: str,
        context_chunks: list[str],
        page_context: dict | None = None,
    ) -> str:
        """
        Call Gemini 2.5 Flash with exponential-backoff retry to handle
        transient 429 (rate limit) and 5xx errors from the API.
        """
        last_exc: Exception | None = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                # _generate is synchronous (LangChain invoke) — offload it
                return await asyncio.to_thread(self._generate, query, context_chunks, page_context)
            except Exception as exc:
                last_exc = exc
                is_retryable = any(
                    marker in str(exc).lower()
                    for marker in ("429", "rate limit", "quota", "503", "500", "server error")
                )
                if not is_retryable or attempt == MAX_RETRIES:
                    break
                wait = RETRY_BASE_S * (2 ** (attempt - 1))
                logger.warning(
                    "Gemini call failed (attempt %d/%d): %s — retrying in %.1fs",
                    attempt, MAX_RETRIES, exc, wait,
                )
                await asyncio.sleep(wait)

        raise last_exc  # re-raise so process_message can trigger offline fallback

    def _generate(
        self,
        query: str,
        context_chunks: list[str],
        page_context: dict | None = None,
    ) -> str:
        """
        Build the RAG prompt and call Gemini.
        Runs synchronously — always call via asyncio.to_thread().
        """
        # --- Knowledge base context ---
        if context_chunks:
            context_block = "\n\n---\n\n".join(context_chunks)
            context_section = f"CONTEXT FROM KNOWLEDGE BASE:\n{context_block}"
        else:
            context_section = (
                "CONTEXT FROM KNOWLEDGE BASE:\n"
                "(No relevant procedures found in the knowledge base.)"
            )

        # --- Live CRM page context (optional) ---
        page_section = ""
        if page_context and isinstance(page_context, dict):
            field_map = {
                "ticketId":    "Ticket/Case ID",
                "subject":     "Subject",
                "status":      "Status",
                "priority":    "Priority",
                "customer":    "Customer",
                "description": "Description",
            }
            lines = []
            for key, label in field_map.items():
                val = page_context.get(key)
                if val:
                    lines.append(f"  {label}: {val}")
            if lines:
                page_section = "\nCURRENT PAGE — TICKET/CASE DETAILS:\n" + "\n".join(lines)
                logger.debug("Page context injected: %s", list(page_context.keys()))

        user_content = (
            f"{context_section}"
            f"{page_section}"
            f"\n\nAGENT QUERY:\n{query}"
        )

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=user_content),
        ]

        response = self._llm.invoke(messages)
        content = response.content
        if isinstance(content, list):
            content = " ".join(
                part.get("text", "") if isinstance(part, dict) else str(part)
                for part in content
            )
        return content.strip()

    def _offline_fallback(self, query: str) -> str | None:
        """
        Query the local SQLite offline cache for a pre-saved protocol.
        Returns the best match or None if the DB doesn't exist / no match found.
        Runs synchronously — always call via asyncio.to_thread().
        """
        db_path = Path(OFFLINE_DB_PATH)
        if not db_path.exists():
            logger.info("Offline DB not found at %s.", db_path)
            return None

        try:
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()

            # Split the query into keywords and score each row by how many match.
            # Returns the highest-scoring row, falling back to any partial match.
            keywords = [w for w in query.lower().split() if len(w) > 3]
            if not keywords:
                conn.close()
                return None

            cursor.execute("SELECT question, answer FROM offline_protocols")
            rows = cursor.fetchall()
            conn.close()

            best_answer = None
            best_score = 0
            for question, answer in rows:
                q_lower = question.lower()
                score = sum(1 for kw in keywords if kw in q_lower)
                if score > best_score:
                    best_score = score
                    best_answer = answer

            if best_answer and best_score >= 1:
                logger.info(
                    "Offline cache hit (score=%d) for query: %r", best_score, query[:60]
                )
                return best_answer

            return None
        except Exception as exc:
            logger.error("Offline cache query failed: %s", exc)
            return None
