# AssistFlow — AI-Assisted Workplace Support System

A thesis project: *"Design and Development of an AI-Assisted Workplace Support System for Improving Workflow Efficiency and System Usability."*

AssistFlow is a Chrome side-panel extension that gives call center agents real-time, AI-powered guidance without leaving their CRM or dialer. It uses Retrieval-Augmented Generation (RAG) to ground every answer in your actual internal SOPs, and falls back to a local SQLite cache when the network or AI service is unavailable.

---

## How It Works

```
Agent types a question in the side panel
         │
         ▼
Chrome Extension  ──POST /api/chat──▶  FastAPI Backend
                                              │
                              ┌───────────────┴───────────────┐
                              ▼                               ▼
                        ChromaDB                      Gemini Flash
                  (semantic SOP search)           (grounded generation)
                              │                               │
                              └───────────────┬───────────────┘
                                              ▼
                                  Step-by-step answer
                                  returned to agent
                                              │
                                   (if Gemini is down)
                                              ▼
                                    SQLite Offline Cache
                                  (pre-saved procedures)
```

1. The agent asks a question or highlights text on their CRM page.
2. The FastAPI backend embeds the query using Google `gemini-embedding-001`.
3. ChromaDB retrieves the top-4 most relevant SOP chunks via cosine similarity.
4. The retrieved context + live ticket fields + query are sent to Gemini with a strict system prompt.
5. Gemini returns a grounded, step-by-step response.
6. If Gemini or the network is unavailable, the backend queries a local SQLite cache of pre-saved offline procedures.
7. The extension auto-opens on 18 supported CRM and dialer platforms and shows the platform name in the header.

---

## Features

- **Auto-activates** on Salesforce, Zendesk, Freshdesk, Genesys, Avaya, RingCentral, Talkdesk, Five9, HubSpot, ServiceNow, Intercom, Help Scout, Kustomer, Zoho, and more
- **Live ticket context** — content script reads the open ticket's subject, description, status, priority, and customer from the CRM DOM and attaches it to every query automatically
- **Highlight-to-query** — select any text on the CRM page; one click sends it as a query
- **Right-click context menu** — "Ask AssistFlow" on any selected text across any page
- **Numbered step rendering** — AI replies are parsed and rendered as a step-by-step `<ol>` list
- **Source badge** — each response shows where the answer came from: "AI · SOP", "Offline cache", or "No connection"
- **Thumbs up / down feedback** per response, logged to the backend
- **Offline fallback** — works without internet using pre-seeded SQLite procedures
- **Dark mode** with system-preference detection and `localStorage` persistence
- **Latency tracking** — every request logged with response time in ms

---

## Repository Structure

```text
AssistFlow/
├── README.md
├── .gitignore
├── module_by_module_tech_stack_breakdown.md   ← development checklist
├── project_guidelines_and_context.md          ← thesis context & rules
│
├── backend/
│   ├── .env                    ← local secrets (not committed)
│   ├── .env.example            ← template for all env vars
│   ├── requirements.txt
│   ├── run.py                  ← server startup script
│   └── app/
│       ├── main.py             ← FastAPI app + lifespan
│       ├── api/
│       │   ├── middleware.py   ← request/response logger
│       │   └── routes/
│       │       └── chat.py     ← /api/health, /api/chat, /api/feedback
│       ├── core/
│       │   ├── config.py       ← env var loading
│       │   └── logging_config.py
│       └── services/
│           └── chat_service.py ← RAG pipeline + Gemini + offline fallback
│
├── data/
│   ├── knowledge/              ← SOP and error-log documents (.md / .txt) for ingestion
│   │   ├── sop_crm_login_access.md
│   │   ├── sop_call_quality_telephony.md
│   │   ├── sop_system_downtime_offline.md
│   │   ├── sop_ticket_escalation_routing.md
│   │   ├── sop_customer_identity_verification.md
│   │   ├── error_log_crm_systems.md
│   │   ├── error_log_network_auth.md
│   │   └── error_log_telephony.md
│   ├── chroma/                 ← ChromaDB vector store (auto-created on ingestion)
│   └── offline_cache/          ← SQLite offline DB (seeded by seed_offline_db.py)
│
├── extension/
│   └── sidepanel/
│       ├── public/
│       │   ├── manifest.json   ← Chrome Extension MV3 config
│       │   └── background.js   ← service worker (auto-open, context menu)
│       ├── src/
│       │   ├── App.jsx         ← main side panel UI
│       │   ├── content.js      ← injected into CRM pages
│       │   ├── index.css       ← Tailwind + custom styles
│       │   └── main.jsx        ← React entry point
│       ├── vite.config.js
│       └── package.json
│
└── scripts/
    ├── ingest_knowledge.py     ← embed SOPs → ChromaDB
    ├── seed_offline_db.py      ← populate SQLite offline cache
    └── evaluate_rag.py         ← Ragas evaluation (in progress)
```

---

## Running AssistFlow

Once you've completed the one-time setup below, this is all you need to do each time:

**1. Start the backend** (from the `backend/` directory, with the venv active):

```bash
source .venv/bin/activate      # macOS / Linux
# .venv\Scripts\activate       # Windows

python run.py
```

The server starts at `http://127.0.0.1:8000`. You can confirm it's up with:

```bash
curl http://127.0.0.1:8000/api/health
# → {"status": "ok", "service": "assistflow-backend"}
```

**2. Open Chrome** and navigate to any supported CRM platform — the AssistFlow side panel opens automatically. On any other page, click the AssistFlow icon in the toolbar to open it manually.

That's it. The extension is already loaded and the knowledge base is already ingested. You don't need to rebuild or re-ingest anything unless you add new SOP documents.

> **Add `--reload`** to the `run.py` command if you're making backend changes and want auto-restart on file save:
> ```bash
> python run.py --reload
> ```

---

## Installation

### Prerequisites

- Python 3.11 or 3.13
- Node.js 18+
- Google Gemini API key
- Google Chrome (or any Chromium-based browser)

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/itskramm/AssistFlow-.git
cd AssistFlow
```

---

### Step 2 — Configure the backend environment

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in your values:

```env
GEMINI_API_KEY=your_google_gemini_api_key
CHROMA_DB_PATH=../data/chroma
OFFLINE_DB_PATH=../data/offline_cache/offline.db
FASTAPI_HOST=0.0.0.0
FASTAPI_PORT=8000
LOG_LEVEL=INFO
```

---

### Step 3 — Install Python dependencies

```bash
# From the backend/ directory
python -m venv .venv
source .venv/bin/activate      # macOS / Linux
# .venv\Scripts\activate       # Windows

pip install -r requirements.txt
```

---

### Step 4 — Ingest the knowledge base

Add your SOP files (`.md` or `.txt`) to `data/knowledge/`. Eight example documents (5 SOPs + 3 error logs) are already included. Then run:

```bash
# From the project root
python scripts/ingest_knowledge.py
```

This embeds all documents with `gemini-embedding-001` and stores them in ChromaDB at `data/chroma/`. Re-running the script is safe — it clears and rebuilds the collection each time.

---

### Step 5 — Seed the offline cache

```bash
# From the project root
python scripts/seed_offline_db.py
```

This creates the `offline_protocols` table in `data/offline_cache/offline.db` and seeds it with 13 pre-written Q&A pairs covering common call center issues. Run this once before starting the backend.

---

### Step 6 — Start the backend server

```bash
# From the backend/ directory
python run.py --reload
```

Verify it is running:

```bash
curl http://127.0.0.1:8000/api/health
# → {"status": "ok", "service": "assistflow-backend"}
```

The interactive API docs are available at: `http://127.0.0.1:8000/docs`

---

### Step 7 — Build the Chrome extension

```bash
cd extension/sidepanel
npm install
npm run build
```

This produces a `dist/` folder ready to be loaded into Chrome.

---

### Step 8 — Load the extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/sidepanel/dist/` folder
5. The AssistFlow icon will appear in your browser toolbar

---

### Step 9 — Use AssistFlow

- Navigate to any supported CRM platform — the side panel opens automatically.
- Click the AssistFlow toolbar icon on any other page to open it manually.
- Type a question in the chat input, or highlight text on the page and click **"Use as query"**.
- Right-click any selected text and choose **"Ask AssistFlow"** for a quick query.

---

## Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key | *(required)* |
| `CHROMA_DB_PATH` | Path to ChromaDB storage directory | `../data/chroma` |
| `OFFLINE_DB_PATH` | Path to SQLite offline cache database | `../data/offline_cache/offline.db` |
| `FASTAPI_HOST` | Host address for the backend server | `0.0.0.0` |
| `FASTAPI_PORT` | Port for the backend server | `8000` |
| `LOG_LEVEL` | Logging verbosity (`DEBUG`, `INFO`, `WARNING`) | `INFO` |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness check |
| `POST` | `/api/chat` | Submit a query — returns a RAG-grounded reply with latency and source metadata |
| `POST` | `/api/feedback` | Submit a thumbs up/down rating on a response |

**`POST /api/chat` request body:**
```json
{
  "message": "The agent cannot log into Salesforce",
  "page_context": {
    "ticketId": "12345",
    "subject": "Login failure",
    "status": "Open",
    "priority": "High",
    "customer": "Jane Smith",
    "description": "Agent reports SSO error on first login attempt"
  }
}
```

The `page_context` field is optional. When present (populated automatically by the content script), Gemini uses the live ticket details to tailor its response.

**`POST /api/chat` response:**
```json
{
  "reply": "1. Ask the agent to confirm...",
  "status": "ok",
  "source": "rag",
  "latency_ms": 1243.5,
  "retrieved_sources": ["data/knowledge/sop_crm_login_access.md"]
}
```

The `source` field indicates where the answer came from: `"rag"` (Gemini + ChromaDB), `"offline-cache"` (SQLite fallback), or `"fallback"` (no match found anywhere).

---

## Adding More SOPs

Drop any `.md` or `.txt` file into `data/knowledge/` and re-run the ingestion script:

```bash
python scripts/ingest_knowledge.py
```

The script clears and rebuilds the ChromaDB collection each time, so re-running is always safe.

---

## Supported CRM & Dialer Platforms

The content script auto-injects and the side panel auto-opens on these domains:

| Platform | Domain |
|---|---|
| Salesforce | `salesforce.com`, `lightning.force.com` |
| Zendesk | `zendesk.com` |
| Freshdesk | `freshdesk.com`, `freshworks.com` |
| Genesys Cloud | `genesyscloud.com`, `mypurecloud.com` |
| Avaya | `avayacloud.com` |
| RingCentral | `ringcentral.com` |
| Talkdesk | `talkdesk.com` |
| NICE inContact | `niceincontact.com` |
| Five9 | `five9.com` |
| HubSpot | `hubspot.com` |
| ServiceNow | `servicenow.com` |
| Intercom | `intercom.com` |
| Help Scout | `helpscout.com` |
| Kustomer | `kustomer.com` |
| Zoho | `zohocrm.com`, `zoho.com` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS, Chrome Extension MV3 |
| Build tool | Vite 5 + @vitejs/plugin-react |
| Backend | Python, FastAPI, Uvicorn |
| AI / LLM | Google Gemini (via `langchain-google-genai`) |
| Embeddings | Google `gemini-embedding-001` |
| Vector DB | ChromaDB (local, persistent, cosine similarity) |
| Orchestration | LangChain |
| Offline Cache | SQLite |
| Evaluation | Ragas, Pandas *(in progress)* |

---

## Development Notes

- **Async safety** — all synchronous LangChain/ChromaDB calls are offloaded via `asyncio.to_thread()` so the FastAPI event loop is never blocked. Multiple agents can query concurrently without latency degradation.
- **Retry logic** — Gemini API calls retry up to 3 times with exponential backoff (1.5s base, doubles each attempt) on rate-limit (429) and server errors (5xx).
- **Offline fallback** — uses simple keyword scoring against the SQLite cache, by design. It must work with zero network access and zero API calls.
- **Idempotent ingestion** — `ingest_knowledge.py` drops and rebuilds the ChromaDB collection on every run. Re-running after adding new SOPs is always safe.
- **Content script privacy** — the injected script reads only visible text fields. It never reads password inputs, hidden fields, or cross-origin iframes, and never modifies the host CRM DOM.
- **CORS** — currently set to `allow_origins=["*"]` for local development. Tighten to the extension origin before any production deployment.
- **Feedback pipeline** — `POST /api/feedback` currently logs ratings to stdout. The endpoint is ready to be wired into a database for fine-tuning data collection.
