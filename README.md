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
                        ChromaDB                     Gemini 2.5 Flash
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
2. The FastAPI backend embeds the query using Google `text-embedding-004`.
3. ChromaDB retrieves the top-4 most relevant SOP chunks via cosine similarity.
4. The retrieved context + query are sent to Gemini 2.5 Flash with a strict system prompt.
5. Gemini returns a grounded, step-by-step response.
6. If Gemini or the network is unavailable, the backend queries a local SQLite cache of pre-saved offline procedures.
7. The extension auto-opens on 18 supported CRM/dialer platforms and shows the platform name in the header.

---

## Features

- **Auto-activates** on Salesforce, Zendesk, Freshdesk, Genesys, Avaya, RingCentral, Talkdesk, Five9, HubSpot, ServiceNow, Intercom, Help Scout, Kustomer, Zoho, and more
- **Highlight-to-query** — select any text on the CRM page, one click sends it as a query
- **Right-click context menu** — "Ask AssistFlow" on any selected text across any page
- **Numbered step rendering** — AI replies formatted as step-by-step instructions
- **Thumbs up / down feedback** per response, logged to the backend
- **Offline fallback** — works without internet using pre-saved SQLite procedures
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
│   ├── knowledge/              ← SOP documents (.md / .txt) for ingestion
│   │   ├── sop_crm_login_access.md
│   │   ├── sop_call_quality_telephony.md
│   │   ├── sop_system_downtime_offline.md
│   │   ├── sop_ticket_escalation_routing.md
│   │   └── sop_customer_identity_verification.md
│   ├── chroma/                 ← ChromaDB vector store (auto-created)
│   └── offline_cache/          ← SQLite offline DB (auto-created)
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
    └── evaluate_rag.py         ← Ragas evaluation (in progress)
```

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

Add your SOP files (`.md` or `.txt`) to `data/knowledge/`. Five example SOPs are already included. Then run:

```bash
# From the project root
python scripts/ingest_knowledge.py
```

This embeds all documents with `text-embedding-004` and stores them in ChromaDB at `data/chroma/`.

---

### Step 5 — Start the backend server

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

### Step 6 — Build the Chrome extension

```bash
cd extension/sidepanel
npm install
npm run build
```

This produces a `dist/` folder ready to be loaded into Chrome.

---

### Step 7 — Load the extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/sidepanel/dist/` folder
5. The AssistFlow icon will appear in your browser toolbar

---

### Step 8 — Use AssistFlow

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
| `POST` | `/api/chat` | Submit a query — returns RAG-grounded reply + latency + sources |
| `POST` | `/api/feedback` | Submit thumbs up/down rating on a response |

**`POST /api/chat` request body:**
```json
{ "message": "The agent cannot log into Salesforce" }
```

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

---

## Adding More SOPs

Drop any `.md` or `.txt` file into `data/knowledge/` and re-run the ingestion script:

```bash
python scripts/ingest_knowledge.py
```

The script clears and rebuilds the ChromaDB collection each time, so re-running is always safe.

---

## Supported CRM & Dialer Platforms

The content script auto-injects into these domains:

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
| Backend | Python, FastAPI, Uvicorn |
| AI / LLM | Google Gemini 2.5 Flash |
| Embeddings | Google `text-embedding-004` |
| Vector DB | ChromaDB (local, persistent) |
| Orchestration | LangChain |
| Offline Cache | SQLite |
| Evaluation | Ragas, Pandas |

---

## Development Notes

- All sync I/O in the backend (ChromaDB, LangChain, Gemini) runs in a thread-pool executor via `asyncio.to_thread()` — the FastAPI event loop is never blocked.
- Gemini API calls retry up to 3 times with exponential backoff on rate-limit (429) and server errors (5xx).
- The ChromaDB collection is rebuilt from scratch on each ingestion run — always idempotent.
- The content script is entirely passive — it reads the page but never modifies the host CRM DOM.
