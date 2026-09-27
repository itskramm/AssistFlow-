# AI-Assisted Workplace Support System - Development Guide

This repository contains the source code for the AI-Assisted Workplace Support System. The project is divided into distinct modules to ensure a clean, maintainable, and scalable architecture.

---

## Progress Legend
- ✅ Done
- 🔧 Scaffolded / Placeholder (code exists but not yet functional)
- ⬜ Not started

---

## Module 1: Frontend (Browser Extension)

**Tech Stack:** React, Tailwind CSS, Chrome Extension Manifest V3.
**Purpose:** Side-panel interface for call center agents. Auto-activates on 18 supported CRM, ticketing, and dialer platforms without the agent leaving their workspace.

**Files:** `extension/sidepanel/`

| Task | File | Status |
|---|---|---|
| `manifest.json` — permissions: `sidePanel`, `storage`, `activeTab`, `tabs`, `contextMenus`, `scripting` | `public/manifest.json` | ✅ |
| Content script rules for 18 CRM domains (Salesforce, Zendesk, Freshdesk, Genesys, Avaya, RingCentral, Talkdesk, Five9, HubSpot, ServiceNow, Intercom, Help Scout, Kustomer, Zoho…) | `public/manifest.json` | ✅ |
| Background service worker — auto-opens panel on CRM tab activation & URL change | `public/background.js` | ✅ |
| Background — persists tab context to `storage.session` for panel startup | `public/background.js` | ✅ |
| Background — right-click "Ask AssistFlow" context menu | `public/background.js` | ✅ |
| Background — `PANEL_READY` handshake pushes last context on mount | `public/background.js` | ✅ |
| Content script — platform detection (15 CRM labels) | `src/content.js` | ✅ |
| Content script — `PAGE_CONTEXT` on load + SPA navigation (MutationObserver) | `src/content.js` | ✅ |
| Content script — `TEXT_SELECTED` forwarded on highlight (debounced 600ms) | `src/content.js` | ✅ |
| React app entry point (`main.jsx`) | `src/main.jsx` | ✅ |
| Context-aware header — shows active platform (e.g. "Active on Salesforce") | `src/App.jsx` | ✅ |
| Selected-text banner with "Use as query" one-click action | `src/App.jsx` | ✅ |
| Chat message rendering — user/assistant bubbles | `src/App.jsx` | ✅ |
| Numbered step rendering — replies parsed into `<ol>` when applicable | `src/App.jsx` | ✅ |
| Thumbs up / down feedback UI — calls `POST /api/feedback`, disabled after rating | `src/App.jsx` | ✅ |
| Input form with send button | `src/App.jsx` | ✅ |
| Online / Offline status pill | `src/App.jsx` | ✅ |
| Animated loading dots | `src/App.jsx` | ✅ |
| Auto-scroll to latest message | `src/App.jsx` | ✅ |
| API client → `POST /api/chat` | `src/App.jsx` | ✅ |
| Offline fallback message when backend is unreachable | `src/App.jsx` | ✅ |
| Narrow-safe CSS (min-width 240px, slim scrollbar, truncation-safe layout) | `src/index.css` | ✅ |
| Vite dual-entry build — side panel + `content.js` as separate stable bundle | `vite.config.js` | ✅ |
| First production build (`npm run build`) — `dist/` folder exists with assets | `dist/` | ✅ |
| Streaming response support | — | ⬜ |

---

## Module 2: Backend API Gateway

**Tech Stack:** Python, FastAPI, Uvicorn.
**Purpose:** Central orchestrator — routes requests from the Chrome extension to ChromaDB and the Gemini API.

**Files:** `backend/`

| Task | File | Status |
|---|---|---|
| FastAPI app with lifespan context manager | `app/main.py` | ✅ |
| CORS middleware | `app/main.py` | ✅ |
| `RequestLoggingMiddleware` — logs method/path/status/latency on every request | `app/api/middleware.py` | ✅ |
| `GET /api/health` endpoint | `app/api/routes/chat.py` | ✅ |
| `POST /api/chat` — Pydantic request validation, delegates to `ChatService` | `app/api/routes/chat.py` | ✅ |
| `POST /api/feedback` — logs thumbs up/down ratings | `app/api/routes/chat.py` | ✅ |
| `config.py` — loads all env vars from `.env` (`GEMINI_API_KEY`, `CHROMA_DB_PATH`, `OFFLINE_DB_PATH`, `FASTAPI_HOST`, `FASTAPI_PORT`, `LOG_LEVEL`) | `app/core/config.py` | ✅ |
| `logging_config.py` — structured formatter, silences noisy libs | `app/core/logging_config.py` | ✅ |
| `.env` file with Gemini API key | `.env` | ✅ |
| `.env.example` with all keys documented | `.env.example` | ✅ |
| `ChatService` singleton on `app.state` | `app/services/chat_service.py` | ✅ |
| All sync I/O offloaded via `asyncio.to_thread()` — event loop never blocked | `app/services/chat_service.py` | ✅ |
| Gemini rate-limit retry — exponential backoff, 3 attempts, 1.5s base | `app/services/chat_service.py` | ✅ |
| Gemini 2.5 Flash integration via `ChatGoogleGenerativeAI` | `app/services/chat_service.py` | ✅ |
| RAG pipeline wired into `/api/chat` | `app/services/chat_service.py` | ✅ |
| SQLite offline fallback on Gemini/network failure | `app/services/chat_service.py` | ✅ |
| `run.py` — startup script with `--host`, `--port`, `--reload`, `--log-level` flags | `run.py` | ✅ |
| Full `pip install -r requirements.txt` in venv — all packages confirmed installed | `.venv/` | ✅ |

---

## Module 3: Knowledge Base & Vector Retrieval (RAG)

**Tech Stack:** ChromaDB, LangChain, Google Text Embeddings (`text-embedding-004`).
**Purpose:** Stores and retrieves company SOPs and troubleshooting guides via semantic search.

**Files:** `scripts/ingest_knowledge.py`, `data/knowledge/`, `data/chroma/`

| Task | File | Status |
|---|---|---|
| `data/knowledge/` directory | `data/knowledge/` | ✅ |
| `ingest_knowledge.py` — loads `.md` / `.txt` docs | `scripts/ingest_knowledge.py` | ✅ |
| Text chunking — `RecursiveCharacterTextSplitter` (800 chars / 100 overlap) | `scripts/ingest_knowledge.py` | ✅ |
| Google `text-embedding-004` embedding via `GoogleGenerativeAIEmbeddings` | `scripts/ingest_knowledge.py` | ✅ |
| ChromaDB `PersistentClient` — cosine similarity, stores to `data/chroma/` | `scripts/ingest_knowledge.py` | ✅ |
| Retriever — top-4 cosine similarity search, integrated into `ChatService` | `app/services/chat_service.py` | ✅ |
| 5 SOP documents added to `data/knowledge/` (CRM login, telephony, downtime, escalation, identity verification) | `data/knowledge/` | ✅ |
| First ingestion run — `data/chroma/` vector store populated | `data/chroma/` | ⬜ |

---

## Module 4: Generative AI & Orchestration

**Tech Stack:** Google Gemini API (Gemini 2.5 Flash), LangChain.
**Purpose:** Synthesizes retrieved SOPs and the agent's query into a grounded, step-by-step response.

**Files:** `backend/app/services/chat_service.py`

| Task | File | Status |
|---|---|---|
| `google-generativeai` + `langchain-google-genai` in `requirements.txt` | `requirements.txt` | ✅ |
| `GEMINI_API_KEY` loaded from `.env` | `app/core/config.py` | ✅ |
| `ChatGoogleGenerativeAI` (Gemini 2.5 Flash, temp 0.2) | `app/services/chat_service.py` | ✅ |
| System prompt — restricts AI to retrieved context, enforces step-by-step format | `app/services/chat_service.py` | ✅ |
| RAG chain — embed query → retrieve chunks → build prompt → call Gemini | `app/services/chat_service.py` | ✅ |
| Response returned with `latency_ms` + `retrieved_sources` metadata | `app/services/chat_service.py` | ✅ |
| Streaming support | — | ⬜ |

---

## Module 5: Downtime & Offline Caching

**Tech Stack:** SQLite (`sqlite-utils`).
**Purpose:** Serves pre-saved offline protocols when Gemini or the network is unavailable.

**Files:** `backend/app/services/chat_service.py`, `data/offline_cache/`

| Task | File | Status |
|---|---|---|
| `data/offline_cache/` directory | `data/offline_cache/` | ✅ |
| `sqlite-utils` in `requirements.txt` (confirmed installed) | `requirements.txt` | ✅ |
| `OFFLINE_DB_PATH` in `config.py` | `app/core/config.py` | ✅ |
| Offline fallback in `ChatService` — queries SQLite on Gemini failure | `app/services/chat_service.py` | ✅ |
| Frontend shows "Offline" status when backend is unreachable | `src/App.jsx` | ✅ |
| SQLite DB schema (`offline_protocols` table — `question`, `answer`) | — | ⬜ |
| Pre-populate DB with offline protocols / downtime procedures | — | ⬜ |

---

## Module 6: Evaluation & Metrics

**Tech Stack:** Python, Ragas Framework, Pandas.
**Purpose:** Benchmarks RAG system performance for the thesis evaluation objectives.

**Files:** `scripts/evaluate_rag.py`

| Task | File | Status |
|---|---|---|
| `ragas` + `pandas` in `requirements.txt` (confirmed installed) | `requirements.txt` | ✅ |
| `evaluate_rag.py` scaffolded | `scripts/evaluate_rag.py` | 🔧 |
| Per-request latency logged via `RequestLoggingMiddleware` + `chat_service.py` | `app/api/middleware.py` | ✅ |
| Evaluation dataset — question + ground truth pairs | — | ⬜ |
| Ragas metrics — retrieval precision, context recall, answer accuracy | `scripts/evaluate_rag.py` | ⬜ |
| Results exported to CSV via Pandas | `scripts/evaluate_rag.py` | ⬜ |

---

## Remaining Steps (in order)

| Step | Command / Action |
|---|---|
| 1. Run first knowledge ingestion | `python scripts/ingest_knowledge.py` (from project root) |
| 2. Start the backend | `cd backend && python run.py --reload` |
| 3. Verify health endpoint | `curl http://127.0.0.1:8000/api/health` |
| 4. Load extension in Chrome | `chrome://extensions` → Load unpacked → select `extension/sidepanel/dist/` |
| 5. Seed SQLite offline DB | Create `offline_protocols` table + insert fallback procedures |
| 6. Run RAG evaluation | Implement + run `scripts/evaluate_rag.py` |
