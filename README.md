# AssistFlow — AI-Assisted Workplace Support System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![Chrome Extension](https://img.shields.io/badge/chrome-extension-orange.svg)](https://developer.chrome.com/docs/extensions/)

> **Thesis Project:** *"Design and Development of an AI-Assisted Workplace Support System for Improving Workflow Efficiency and System Usability"*

AssistFlow is a Chrome side-panel extension that gives call center agents real-time, AI-powered guidance without leaving their CRM or dialer. It uses **Retrieval-Augmented Generation (RAG)** to ground every answer in your actual internal SOPs, and falls back to a bundled local FAQ instantly when the network or backend is unavailable — **no internet required, no extra setup**.

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
- **Instant offline FAQ** — 39 pre-loaded procedures bundled in the extension with heavy keyword loading for robust matching
- **Clickable topic list** — when no FAQ match is found offline, all topics are shown as one-tap buttons
- **Auto-recovery** — polls the backend silently while offline and restores online mode automatically
- **Thumbs up / down feedback** per response, logged to the backend
- **Dark mode** with system-preference detection and `localStorage` persistence
- **Latency tracking** — every backend request logged with response time in ms
- **Robust offline detection** — 5s timeout on first failure, then instant FAQ responses with zero network calls

---

## Repository Structure

```text
AssistFlow/
├── README.md
├── TESTING.md                  ← comprehensive testing guide (backend, offline FAQ, UI)
├── WEBAPP.md                   ← web application documentation and deployment guide
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
│       │   ├── offlineFaq.js   ← 39-entry local FAQ + searchFaq() + getTopicList()
│       │   ├── content.js      ← injected into CRM pages
│       │   ├── index.css       ← Tailwind + custom styles
│       │   └── main.jsx        ← React entry point
│       ├── vite.config.js
│       └── package.json
│
├── webapp/                     ← standalone web application (same functionality, no extension needed)
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── App.jsx            ← adapted from extension (no Chrome APIs)
│   │   ├── main.jsx           ← entry point with layout wrapper
│   │   ├── index.css          ← same styles + web-specific layout
│   │   └── offlineFaq.js      ← same FAQ as extension
│   ├── dist/                  ← production build output
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
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

**2a. Use the Chrome Extension**

Open Chrome and navigate to any supported CRM — the side panel opens automatically. On any other page, click the AssistFlow icon in the toolbar.

> Add `--reload` if you're actively changing backend code:
> ```bash
> python run.py --reload
> ```

The extension already has the local FAQ bundled. **It works offline from the moment it's installed** — no backend required for the FAQ.

**2b. Use the Web Application**

Start the standalone web app (no extension needed):

```bash
cd webapp
npm run dev
```

Open http://localhost:3000 in any browser. See **[WEBAPP.md](WEBAPP.md)** for deployment options and configuration.

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

**Chrome Extension:**
- Navigate to any supported CRM — the side panel opens automatically.
- Click the AssistFlow icon on any other page to open it manually.
- Type a question, or highlight text on the page and click **"Use as query"**.
- Right-click any selected text and choose **"Ask AssistFlow"** for a quick query.

**Web Application:**
- Run `cd webapp && npm run dev`
- Open http://localhost:3000
- Type your questions in the chat interface
- See **[WEBAPP.md](WEBAPP.md)** for full documentation

---

## Offline Mode

The extension handles connectivity loss automatically — no configuration needed.

| Situation | Behaviour |
|---|---|
| Backend reachable, internet available | Full RAG pipeline via Gemini |
| Backend reachable, Gemini unreachable | Backend probes Gemini endpoint, serves answer from SQLite cache (39 protocols) |
| Backend unreachable (first failure) | 5s timeout → marks offline → answers from local JS FAQ instantly |
| Backend unreachable (subsequent queries) | Skips fetch entirely → local FAQ answer in < 1ms |
| No FAQ match found | Shows a clickable list of all available topics |
| Backend recovers | Auto-detected via 30s health poll → switches back to online mode |

### Offline Cache Coverage

The system maintains **39 heavily keyword-loaded protocols** covering all 8 knowledge base documents:

**CRM & Login (5 protocols)**
- Login failures with error codes (INVALID_SESSION_ID, SSO errors, authentication failures)
- Account lockouts after failed attempts
- Permission denied / access control issues
- Session expiry and token problems
- Record locking conflicts

**Telephony & Audio (7 protocols)**
- One-way audio (agent can't hear customer / customer can't hear agent)
- Call quality issues (choppy, robotic, packet loss, jitter)
- Call drops and disconnections
- Echo and feedback issues
- Softphone crashes and recovery
- No incoming calls / routing failures
- WebRTC and ICE connection failures

**System Downtime (4 protocols)**
- Complete CRM unavailability and offline workflows
- Phone system downtime procedures
- Business continuity plan activation
- Post-downtime system restoration

**Escalation & Routing (6 protocols)**
- Tier 2 escalation procedures
- Tier 3 / supervisor escalation for critical issues
- Warm transfer step-by-step
- Cold transfer procedures
- SLA breach handling
- Ticket status and priority management

**Identity Verification (4 protocols)**
- Standard 2-factor authentication
- Third-party caller verification
- OTP and enhanced verification procedures
- Vulnerable customer handling

**Network & Authentication (6 protocols)**
- VPN connection failures
- MFA and 2FA issues
- SSL certificate errors
- Active Directory authentication
- Webhook and API errors
- Network timeout troubleshooting

**General Issues (7 protocols)**
- HTTP error codes (403, 404, 500, 502, 503, 504)
- Database connection failures
- Browser compatibility and cache clearing
- File upload errors
- Session timeout handling
- Password reset procedures
- System performance degradation

Each protocol is loaded with synonyms, platform names (Salesforce, Zendesk, Genesys, etc.), error codes, and natural agent phrasings to maximize matching accuracy.

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
| `GET` | `/api/offline-status` | Reports backend connectivity status: `{"online": true/false}` based on Gemini API reachability |
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

## Testing

Comprehensive testing procedures are documented in **[TESTING.md](TESTING.md)**, including:

- **Backend API tests** — health checks, chat endpoints, feedback, offline status
- **Sample prompts** — 40+ test queries organized by category (CRM, telephony, escalation, etc.)
- **Offline FAQ tests** — match verification, no-match handling, auto-recovery procedures
- **Extension UI checklist** — auto-open, context menu, dark mode, ticket context display
- **Common issues & fixes** — troubleshooting guide for typical problems

To run the full test suite:

```bash
# Backend API tests (requires backend running)
cd backend
source .venv/bin/activate
pytest -v

# Manual testing
# Follow procedures in TESTING.md for UI and offline mode testing
```

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
- **Connectivity probe** — the backend probes `generativelanguage.googleapis.com:443` (actual Gemini API endpoint) before each request. If unreachable, it skips Gemini and queries its SQLite cache directly.
- **Network error detection** — comprehensive error string matching including "Name or service not known", "Temporary failure in name resolution", "nodename nor servname provided" to catch all DNS and network failures.
- **Retry logic** — Gemini calls retry up to 3 times with exponential backoff (1.5s base) for rate-limit (429) and server errors (5xx). Network errors skip retries immediately.
- **Idempotent ingestion** — `ingest_knowledge.py` drops and rebuilds the ChromaDB collection on every run. Safe to re-run after adding new SOPs.
- **Keyword loading** — offline cache protocols are heavily keyword-loaded with synonyms, platform names, error codes, and natural agent phrasings to maximize matching accuracy.
- **Content script privacy** — reads only visible text fields. Never touches password inputs, hidden fields, or cross-origin iframes, and never modifies the host CRM DOM.
- **CORS** — set to `allow_origins=["*"]` for local development. Tighten to the extension origin before any production deployment.
- **Feedback pipeline** — `POST /api/feedback` logs ratings to stdout. Ready to be wired into a database for fine-tuning data collection.

---

## Known Issues Fixed

Recent bug fixes and improvements:

1. **Connectivity probe** — Fixed to probe actual Gemini API endpoint (`generativelanguage.googleapis.com:443`) instead of generic DNS check
2. **Socket timeout corruption** — Replaced `socket.setdefaulttimeout()` with per-request timeout to avoid global state corruption
3. **Frontend status display** — Fixed to use `/api/offline-status` endpoint for accurate connectivity reporting
4. **Network error detection** — Expanded error string matching to catch all DNS resolution failures
5. **Offline cache expansion** — Increased from 13 to 39 protocols with comprehensive keyword loading
6. **Auto-recovery** — Added 30s background health poll for automatic online mode restoration
