# AssistFlow — AI-Assisted Workplace Support System

A thesis project: *"Design and Development of an AI-Assisted Workplace Support System for Improving Workflow Efficiency and System Usability."*

AssistFlow is a Chrome side-panel extension that gives call center agents real-time, AI-powered guidance without leaving their CRM or dialer. It uses Retrieval-Augmented Generation (RAG) to ground every answer in your actual internal SOPs, and falls back to a bundled local FAQ instantly when the network or backend is unavailable — no internet required, no extra setup.

---

## How It Works

```
Agent types a question in the side panel
         │
         ▼
  Is backend reachable?
         │
    YES  │                        NO (known offline)
         ▼                              ▼
Chrome Extension                 Local FAQ search
──POST /api/chat──▶  FastAPI     (bundled in extension,
                     Backend      answers instantly,
         │           │            zero network calls)
   ChromaDB      Gemini Flash
 (SOP search)  (generation)
         │           │
         └─────┬─────┘
               ▼
     Step-by-step answer
               │
     (if Gemini unreachable
      but backend is up)
               ▼
    Backend connectivity
      probe + FAQ answer
```

**Online flow:**
1. The agent types a question or highlights text on their CRM page.
2. The FastAPI backend embeds the query using Google `gemini-embedding-001`.
3. ChromaDB retrieves the top-4 most relevant SOP chunks via cosine similarity.
4. The retrieved context + live ticket fields + query are sent to Gemini Flash.
5. Gemini returns a grounded, step-by-step response.

**Offline flow:**
1. On the first failed request, the extension marks itself offline (5s timeout).
2. All subsequent queries are answered **instantly** from a local JS FAQ bundled inside the extension — no backend call, no network, no delay.
3. The extension polls `GET /api/health` every 30s in the background and automatically switches back to online mode when the backend recovers.
4. If a query doesn't match the FAQ, a clickable list of all 35 topics is shown so the agent can browse available procedures.

---

## Features

- **Auto-activates** on Salesforce, Zendesk, Freshdesk, Genesys, Avaya, RingCentral, Talkdesk, Five9, HubSpot, ServiceNow, Intercom, Help Scout, Kustomer, Zoho, and more
- **Live ticket context** — content script reads the open ticket's subject, description, status, priority, and customer from the CRM DOM and attaches it to every query automatically
- **Highlight-to-query** — select any text on the CRM page; one click sends it as a query
- **Right-click context menu** — "Ask AssistFlow" on any selected text across any page
- **Numbered step rendering** — AI replies are parsed and rendered as a step-by-step `<ol>` list
- **Source badge** — each response shows where the answer came from: "AI · SOP" or "Offline cache"
- **Instant offline FAQ** — 35 pre-loaded procedures bundled in the extension, zero network required
- **Clickable topic list** — when no FAQ match is found offline, all topics are shown as one-tap buttons
- **Auto-recovery** — polls the backend silently while offline and restores online mode automatically
- **Thumbs up / down feedback** per response, logged to the backend
- **Dark mode** with system-preference detection and `localStorage` persistence
- **Latency tracking** — every backend request logged with response time in ms

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
│       │       └── chat.py     ← /api/health, /api/chat, /api/offline-status, /api/feedback
│       ├── core/
│       │   ├── config.py       ← env var loading
│       │   └── logging_config.py
│       └── services/
│           └── chat_service.py ← RAG pipeline + Gemini + connectivity probe
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
│   └── offline_cache/          ← SQLite DB (used by backend fallback only)
│
├── extension/
│   └── sidepanel/
│       ├── public/
│       │   ├── manifest.json   ← Chrome Extension MV3 config
│       │   └── background.js   ← service worker (auto-open, context menu)
│       ├── src/
│       │   ├── App.jsx         ← main side panel UI + offline detection logic
│       │   ├── offlineFaq.js   ← 35-entry local FAQ + searchFaq() + getTopicList()
│       │   ├── content.js      ← injected into CRM pages
│       │   ├── index.css       ← Tailwind + custom styles
│       │   └── main.jsx        ← React entry point
│       ├── vite.config.js
│       └── package.json
│
└── scripts/
    ├── ingest_knowledge.py     ← embed SOPs → ChromaDB
    ├── seed_offline_db.py      ← populate backend SQLite cache (optional)
    └── evaluate_rag.py         ← Ragas evaluation (in progress)
```

---

## Running AssistFlow

Once you've completed the one-time setup below, this is all you need each session:

**1. Start the backend** (from the `backend/` directory, with the venv active):

```bash
source .venv/bin/activate      # macOS / Linux
# .venv\Scripts\activate       # Windows

python run.py
```

Confirm it's up:

```bash
curl http://127.0.0.1:8000/api/health
# → {"status": "ok", "service": "assistflow-backend"}
```

**2. Open Chrome** and navigate to any supported CRM — the side panel opens automatically. On any other page, click the AssistFlow icon in the toolbar.

> Add `--reload` if you're actively changing backend code:
> ```bash
> python run.py --reload
> ```

The extension already has the local FAQ bundled. **It works offline from the moment it's installed** — no backend required for the FAQ.

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

Eight example documents (5 SOPs + 3 error logs) are already in `data/knowledge/`. Run:

```bash
# From the project root
python scripts/ingest_knowledge.py
```

This embeds all documents with `gemini-embedding-001` and stores them in ChromaDB at `data/chroma/`. Re-running is always safe — it clears and rebuilds the collection each time.

---

### Step 5 — Start the backend server

```bash
# From the backend/ directory
python run.py
```

The interactive API docs are available at `http://127.0.0.1:8000/docs`.

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

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/sidepanel/dist/` folder
5. The AssistFlow icon will appear in your browser toolbar

---

### Step 8 — Use AssistFlow

- Navigate to any supported CRM — the side panel opens automatically.
- Click the AssistFlow icon on any other page to open it manually.
- Type a question, or highlight text on the page and click **"Use as query"**.
- Right-click any selected text and choose **"Ask AssistFlow"** for a quick query.

---

## Offline Mode

The extension handles connectivity loss automatically — no configuration needed.

| Situation | Behaviour |
|---|---|
| Backend reachable, internet available | Full RAG pipeline via Gemini |
| Backend reachable, internet down | Backend probes Gemini, serves FAQ answer from its own SQLite cache |
| Backend unreachable (first failure) | 5s timeout → marks offline → answers from local JS FAQ instantly |
| Backend unreachable (subsequent queries) | Skips fetch entirely → local FAQ answer in < 1ms |
| No FAQ match found | Shows a clickable list of all 35 available topics |
| Backend recovers | Auto-detected via 30s health poll → switches back to online mode |

The local FAQ covers 35 topics across 6 categories:
- **CRM & Login** — login failures, lockouts, SSO, permissions, session issues
- **Telephony & Audio** — one-way audio, mic issues, call drops, echo, softphone crashes, WebRTC
- **System Downtime** — offline workflow, backup procedures, BCP, post-downtime restoration
- **Escalation & Tickets** — Tier 2/3 escalation, warm/cold transfer, SLA breach, ticket statuses
- **Identity Verification** — standard 2FA, OTP, third-party callers, vulnerable customers
- **Network & Auth** — VPN, MFA, SSL errors, Active Directory, webhooks, API errors

To add more FAQ entries, edit `extension/sidepanel/src/offlineFaq.js` and run `npm run build`.

---

## Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key | *(required)* |
| `CHROMA_DB_PATH` | Path to ChromaDB storage directory | `../data/chroma` |
| `OFFLINE_DB_PATH` | Path to SQLite offline cache (backend-side fallback) | `../data/offline_cache/offline.db` |
| `FASTAPI_HOST` | Host address for the backend server | `0.0.0.0` |
| `FASTAPI_PORT` | Port for the backend server | `8000` |
| `LOG_LEVEL` | Logging verbosity (`DEBUG`, `INFO`, `WARNING`) | `INFO` |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness check — also used by the extension's offline recovery probe |
| `GET` | `/api/offline-status` | Reports whether the backend SQLite cache is loaded |
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

The `source` field: `"rag"` (Gemini + ChromaDB), `"offline-cache"` (backend SQLite fallback), or `"fallback"` (no match).

---

## Adding More SOPs

Drop any `.md` or `.txt` file into `data/knowledge/` and re-run:

```bash
python scripts/ingest_knowledge.py
```

To extend the offline FAQ, add entries to `extension/sidepanel/src/offlineFaq.js` and rebuild:

```bash
cd extension/sidepanel && npm run build
```

---

## Supported CRM & Dialer Platforms

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
| Offline FAQ | Plain JS object bundled in the extension (zero dependencies) |
| Backend cache | SQLite (secondary fallback when backend is up but Gemini is down) |
| Evaluation | Ragas, Pandas *(in progress)* |

---

## Development Notes

- **Offline detection** — the extension tracks connectivity in a `useRef` (no re-renders). First failure sets the flag; all subsequent queries skip the fetch entirely. A background health poll clears the flag when the backend recovers.
- **Fetch timeout** — reduced to 5s (down from 30s) so offline is detected quickly on the first failed request without blocking the agent.
- **Async safety** — all synchronous LangChain/ChromaDB calls on the backend are offloaded via `asyncio.to_thread()`. The FastAPI event loop is never blocked.
- **Connectivity probe** — the backend probes `generativelanguage.googleapis.com:443` before each request. If unreachable, it skips Gemini and queries its SQLite cache directly.
- **Retry logic** — Gemini calls retry up to 3 times with exponential backoff (1.5s base) for rate-limit (429) and server errors (5xx). Network errors skip retries immediately.
- **Idempotent ingestion** — `ingest_knowledge.py` drops and rebuilds the ChromaDB collection on every run. Safe to re-run after adding new SOPs.
- **Content script privacy** — reads only visible text fields. Never touches password inputs, hidden fields, or cross-origin iframes, and never modifies the host CRM DOM.
- **CORS** — set to `allow_origins=["*"]` for local development. Tighten to the extension origin before any production deployment.
- **Feedback pipeline** — `POST /api/feedback` logs ratings to stdout. Ready to be wired into a database for fine-tuning data collection.
