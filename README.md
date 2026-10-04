# AssistFlow — AI-Assisted Workplace Support System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![Web App](https://img.shields.io/badge/web-application-blue.svg)](https://react.dev/)

> **Thesis Project:** *"Design and Development of an AI-Assisted Workplace Support System for Improving Workflow Efficiency and System Usability"*

AssistFlow is a modern web application that gives call center agents real-time, AI-powered guidance through an intuitive browser interface. It uses **Retrieval-Augmented Generation (RAG)** to ground every answer in your actual internal SOPs, and falls back to a bundled local FAQ instantly when the network or backend is unavailable — **no internet required, no extra setup**.

**Available in two deployment modes:**
- 🌐 **Web Application** — Standalone React app accessible from any browser (recommended)
- 🔌 **Chrome Extension** — Side-panel integration with CRM platforms (optional)

## Documentation

| Guide | Description |
|---|---|
| [Web application guide](docs/WEBAPP.md) | Run and deploy the standalone web app |
| [Testing guide](docs/TESTING.md) | Backend, frontend, offline-mode, and extension testing |
| [Deployment guide](docs/DEPLOYMENT_GUIDE.md) | End-to-end deployment checklist |
| [Render setup guide](docs/RENDER_SETUP_GUIDE.md) | Deploy the backend to Render |
| [Design guide](docs/DESIGN_GUIDE.md) | UI design specifications and implementation guidance |
| [Extension summary](docs/EXTENSION_WIDGET_COMPLETE.md) | Chrome extension features and completion notes |
| [Project context](docs/project_guidelines_and_context.md) | Thesis context and project guidelines |

---

## How It Works

```
User interacts with AssistFlow (Web App or Extension)
         │
         ▼
  Is backend reachable?
         │
    YES  │                        NO (known offline)
         ▼                              ▼
   POST /api/chat              Local FAQ search
         │                     (bundled in frontend,
         ▼                      answers instantly,
   FastAPI Backend             zero network calls)
         │
    ┌────┴────┐
    ▼         ▼
ChromaDB   Gemini Flash
(Vector     (AI Generation)
 Search)
    │         │
    └────┬────┘
         ▼
  Step-by-step answer
         │
   (if Gemini unreachable
    but backend is up)
         ▼
  Backend connectivity
   probe + FAQ answer
```

### Online Flow
1. User types a question or clicks a suggestion card
2. FastAPI backend embeds the query using Google `gemini-embedding-001`
3. ChromaDB retrieves the top-4 most relevant SOP chunks via cosine similarity
4. Retrieved context + query sent to Gemini 2.5 Flash
5. Gemini returns a grounded, step-by-step response

### Offline Flow
1. On first failed request, system marks itself offline (5s timeout)
2. All subsequent queries answered **instantly** from local JS FAQ — no backend call, no network, no delay
3. Background health poll (`GET /api/health`) runs every 30s
4. Auto-switches back to online mode when backend recovers
5. If query doesn't match FAQ, shows clickable list of all available topics

---

## Features

### Core Features (Web App & Extension)
- **Real-time AI assistance** — RAG pipeline with Gemini 2.5 Flash for accurate, contextual answers
- **Numbered step rendering** — AI replies parsed and rendered as easy-to-follow step-by-step instructions
- **Source badge** — each response shows where the answer came from: "AI · SOP" or "Offline cache"
- **Instant offline FAQ** — 39 pre-loaded procedures with heavy keyword loading for robust matching
- **Clickable topic list** — when no FAQ match is found offline, all topics shown as one-tap buttons
- **Auto-recovery** — polls backend silently while offline and restores online mode automatically
- **Thumbs up / down feedback** — per response, logged to backend for continuous improvement
- **Per-user prompt history** — signed-in users can reload their saved prompts, responses, sources, and ratings
- **Dark mode** — with system-preference detection and `localStorage` persistence
- **Latency tracking** — every backend request logged with response time in ms
- **Robust offline detection** — 5s timeout on first failure, then instant FAQ responses with zero network calls

### Web Application Exclusive
- **Split-screen layout** — Interactive workspace with suggestion cards + chat panel
- **Quick action cards** — Pre-configured prompts for common scenarios (CRM login, escalation, telephony, etc.)
- **Modern Gemini-style UI** — Clean, sophisticated interface with glassmorphism effects
- **Cross-browser support** — Works on Chrome, Firefox, Safari, and Edge
- **No installation required** — Direct browser access at localhost or deployed URL
- **Responsive design** — Optimized for desktop, tablet, and mobile devices

### Chrome Extension Exclusive
- **Auto-activates** on 15+ CRM platforms (Salesforce, Zendesk, Freshdesk, Genesys, etc.)
- **Live ticket context** — reads open ticket details from CRM DOM automatically
- **Highlight-to-query** — select text on CRM page; one click sends it as query
- **Right-click context menu** — "Ask AssistFlow" on any selected text

---

## Repository Structure

```text
AssistFlow/
├── README.md
├── docs/
│   ├── WEBAPP.md               ← web application documentation and deployment guide
│   ├── TESTING.md              ← backend, frontend, offline, and extension testing
│   ├── DEPLOYMENT_GUIDE.md     ← end-to-end deployment checklist
│   ├── RENDER_SETUP_GUIDE.md   ← Render backend setup
│   ├── DESIGN_GUIDE.md         ← UI design specifications
│   ├── EXTENSION_WIDGET_COMPLETE.md
│   ├── GOOGLE_DRIVE_RAG_INTEGRATION.md
│   ├── MODULE_STATUS_UPDATE.md
│   ├── module_by_module_tech_stack_breakdown.md
│   └── project_guidelines_and_context.md
├── .gitignore
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

### Start the Backend

From the `backend/` directory with the virtual environment active:

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

> **Dev tip:** Add `--reload` flag for hot-reloading during development:
> ```bash
> python run.py --reload
> ```

---

### Option A: Web Application (Recommended)

Start the standalone web app — no installation or browser extension needed:

```bash
cd webapp
npm run dev
```

The app opens automatically at **http://localhost:3000**

**What you get:**
- Modern Gemini-style interface with suggestion cards
- Split-screen layout (workspace + chat panel)
- Works in any browser (Chrome, Firefox, Safari, Edge)
- Perfect for managers, supervisors, and agents

See **[WEBAPP.md](docs/WEBAPP.md)** for deployment options and production configuration.

---

### Option B: Chrome Extension (Optional)

For CRM-integrated experience with automatic ticket context reading:

1. Build the extension:
   ```bash
   cd extension/sidepanel
   npm run build
   ```

2. Load in Chrome:
   - Go to `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select `extension/sidepanel/dist/` folder

3. Use: Navigate to any supported CRM — the side panel opens automatically

**Extension benefits:**
- Auto-opens on 15+ CRM platforms
- Reads live ticket context from page
- Highlight-to-query feature
- Right-click context menu

---

Both interfaces share the same backend and work identically offline. Choose based on your deployment needs.

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

For login, profile details, and per-user prompt history, configure Supabase in
`webapp/.env.local` using `webapp/.env.example`, then run `supabase/schema.sql`
in the Supabase SQL Editor. Supabase Row Level Security ensures each user can
only read and update their own profile and prompt history.

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

### Step 6 — Build the Web Application

```bash
cd webapp
npm install
npm run build
```

This produces a `dist/` folder ready for deployment.

For development, use `npm run dev` to start the dev server at http://localhost:3000.

---

### Step 7 (Optional) — Build the Chrome Extension

Only if you need CRM integration with automatic ticket context reading:

```bash
cd extension/sidepanel
npm install
npm run build
```

Then load the extension:
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `extension/sidepanel/dist/` folder

---

### Step 8 — Launch AssistFlow

#### Web Application (Recommended)

```bash
cd webapp
npm run dev
```

- Opens at http://localhost:3000
- Use the interactive suggestion cards or chat directly
- Works in any modern browser

#### Chrome Extension (Optional)

```bash
cd extension/sidepanel
npm run build
```

Then load `extension/sidepanel/dist/` in Chrome as an unpacked extension.

- Auto-opens on CRM platforms
- Manual open via toolbar icon on other pages
- Highlight text for quick queries
- Right-click for "Ask AssistFlow" menu

See **[WEBAPP.md](docs/WEBAPP.md)** for deployment and production configuration.

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

Comprehensive testing procedures are documented in **[TESTING.md](docs/TESTING.md)**, including:

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
# Follow procedures in docs/TESTING.md for UI and offline mode testing
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

## Supported Platforms

### Web Application
- **Universal Access** — Works in any modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **No Platform Restrictions** — Use alongside any CRM, dialer, or helpdesk system
- **Deployment Options** — Localhost, internal server, Netlify, Vercel, Docker, or cloud hosting

### Chrome Extension (Optional CRM Auto-Activation)

| Platform | Domains |
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

*Note: Extension auto-opens on these domains and reads live ticket context.*

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Tailwind CSS 3.4 |
| **Build Tool** | Vite 5 + @vitejs/plugin-react |
| **Deployment** | Web App (primary), Chrome Extension MV3 (optional) |
| **Backend** | Python 3.11+, FastAPI 0.115, Uvicorn 0.30 |
| **AI / LLM** | Google Gemini 2.5 Flash (via `langchain-google-genai`) |
| **Embeddings** | Google `gemini-embedding-001` |
| **Vector DB** | ChromaDB 0.5.11 (local, persistent, cosine similarity) |
| **Orchestration** | LangChain 0.3.1 |
| **Offline FAQ** | Plain JS object bundled in frontend (zero dependencies, 39 protocols) |
| **Backend Cache** | SQLite (secondary fallback when backend is up but Gemini is down) |
| **Evaluation** | Ragas 0.1.16, Pandas *(in progress)* |

---

## Development Notes

### Frontend Architecture
- **Web App Primary** — Modern React application with Gemini-inspired UI, suggestion cards, and split-screen layout
- **Extension Secondary** — Optional CRM integration mode with same core logic
- **Shared Codebase** — Both use identical offline FAQ, state management, and API integration
- **Responsive Design** — Works beautifully on desktop (1024px+), tablet (768-1024px), and mobile (<768px)

### Offline System
- **Offline detection** — tracks connectivity in a `useRef` (no re-renders). First failure sets flag; all subsequent queries skip fetch entirely
- **Fetch timeout** — 5s (down from 30s) for quick offline detection without blocking the agent
- **Health poll** — background 30s interval auto-recovers when backend returns
- **Network error detection** — comprehensive error string matching for DNS failures ("Name or service not known", "Temporary failure", "nodename nor servname")
- **Keyword loading** — 39 offline protocols heavily keyword-loaded with synonyms, platform names, error codes, and natural phrasings

### Backend Architecture
- **Async safety** — all synchronous LangChain/ChromaDB calls offloaded via `asyncio.to_thread()`. FastAPI event loop never blocked
- **Connectivity probe** — probes `generativelanguage.googleapis.com:443` (actual Gemini endpoint) before each request
- **Retry logic** — Gemini calls retry up to 3 times with exponential backoff (1.5s base) for 429/5xx. Network errors skip retries
- **Idempotent ingestion** — `ingest_knowledge.py` drops and rebuilds ChromaDB collection on every run. Safe to re-run

### Security & Privacy
- **Content script privacy** (extension only) — reads only visible text fields. Never touches passwords, hidden fields, or cross-origin iframes. Never modifies CRM DOM
- **CORS** — set to `allow_origins=["*"]` for local development. Tighten to specific origins for production
- **API key protection** — `GEMINI_API_KEY` in `.env` (never committed)
- **Input validation** — Pydantic models with `min_length` constraints

### Data Pipeline
- **Feedback logging** — `POST /api/feedback` logs ratings to stdout. Ready for database integration
- **Latency tracking** — every request logged with response time in milliseconds
- **Source attribution** — all responses tagged with source ("rag", "offline-cache", "fallback")

---

## Known Issues Fixed

Recent bug fixes and improvements:

1. **Connectivity probe** — Fixed to probe actual Gemini API endpoint (`generativelanguage.googleapis.com:443`) instead of generic DNS check
2. **Socket timeout corruption** — Replaced `socket.setdefaulttimeout()` with per-request timeout to avoid global state corruption
3. **Frontend status display** — Fixed to use `/api/offline-status` endpoint for accurate connectivity reporting
4. **Network error detection** — Expanded error string matching to catch all DNS resolution failures
5. **Offline cache expansion** — Increased from 13 to 39 protocols with comprehensive keyword loading
6. **Auto-recovery** — Added 30s background health poll for automatic online mode restoration
