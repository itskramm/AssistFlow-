# AssistFlow

AI-assisted workplace support for call-center and customer-support teams.
AssistFlow combines a FastAPI backend, a React web application, a Chrome CRM
extension, a ChromaDB knowledge base, and a local FAQ fallback.

## Choose how to use AssistFlow

| Option | Install | Best for |
|---|---|---|
| Deployed web app | Nothing beyond a browser | Everyday support questions and saved conversations |
| Local web app | Python, Node.js, backend, and web app | Private or development environments |
| Chrome extension | Chrome and the built extension | CRM ticket context and highlighted text |

The web application is the recommended starting point. The Chrome extension is
optional and is intended for agents who work inside supported CRM platforms.

## Features

- Retrieval-Augmented Generation (RAG) grounded in internal SOPs and error logs
- Gemini-powered troubleshooting and workplace support responses
- Recent conversation context passed to the AI for follow-up questions
- Optional CRM page context from the Chrome extension
- Per-user profiles and conversation history in Supabase
- Left-side conversation history in the web application
- Thumbs-up and thumbs-down response feedback
- Local FAQ fallback when the backend is unavailable
- Automatic recovery when backend connectivity returns
- Dark mode and responsive web layout

## Documentation

| Guide | Purpose |
|---|---|
| [Web application guide](docs/WEBAPP.md) | Web app development and deployment |
| [Chrome extension guide](extension/sidepanel/README.md) | Build, install, and use the CRM side panel |
| [Testing guide](docs/TESTING.md) | Backend, frontend, offline, and extension checks |
| [Deployment guide](docs/DEPLOYMENT_GUIDE.md) | End-to-end deployment checklist |
| [Render setup guide](docs/RENDER_SETUP_GUIDE.md) | Deploy the backend to Render |
| [Design guide](docs/DESIGN_GUIDE.md) | UI design specifications |
| [Project context](docs/project_guidelines_and_context.md) | Thesis and project background |

## How the system works

```text
Web app or Chrome extension
          │
          ▼
      POST /api/chat
          │
          ▼
   FastAPI ChatService
       │          │
       ▼          ▼
   ChromaDB     Gemini
  SOP retrieval  response
       │          │
       └────┬─────┘
            ▼
      Grounded guidance

If the backend is unavailable:
  frontend local FAQ → instant fallback response
```

For an online request, the backend combines the current question with recent
conversation turns, retrieves relevant knowledge from ChromaDB, and sends the
retrieved context to Gemini. The extension can also provide ticket subject,
description, status, priority, customer, and ticket ID as page context.

When the backend cannot be reached, the web app and extension use their bundled
FAQ data. The browser clients periodically check the backend and return to the
online path when it recovers.

## User installation

### Option 1: Use a deployed web app

Open the web URL provided by your administrator, then sign in or create an
account. No local installation or Chrome extension is required.

The administrator must configure the deployed web app with a reachable backend
and Supabase project. Never enter a Gemini API key into browser environment
variables.

### Option 2: Run the complete app locally

#### Prerequisites

- Python 3.11 or newer
- Node.js 18 or newer and npm
- A Google Gemini API key
- A Supabase project for login and saved conversation history
- Google Chrome 114 or newer if the extension is needed

#### 1. Clone the repository

```bash
git clone https://github.com/itskramm/AssistFlow-.git
cd AssistFlow-
```

#### 2. Install and configure the backend

```bash
cd backend
cp .env.example .env
python -m venv .venv
source .venv/bin/activate       # macOS/Linux
# .venv\Scripts\activate        # Windows PowerShell
pip install -r requirements.txt
cd ..
```

Edit `backend/.env`:

```env
GEMINI_API_KEY=your_google_gemini_api_key
CHROMA_DB_PATH=../data/chroma
OFFLINE_DB_PATH=../data/offline_cache/offline.db
FASTAPI_HOST=0.0.0.0
FASTAPI_PORT=8000
LOG_LEVEL=INFO
```

`GOOGLE_API_KEY` is also accepted by the knowledge-ingestion script, but
`GEMINI_API_KEY` is the documented project variable.

#### 3. Build the knowledge index

Run this once after configuring the API key, and again whenever knowledge files
change:

```bash
source backend/.venv/bin/activate
python scripts/ingest_knowledge.py
```

The script reads `.md` and `.txt` files from `data/knowledge/` and stores the
generated ChromaDB data under `data/chroma/`.

#### 4. Start the backend

Use a terminal from the repository root:

```bash
cd backend
source .venv/bin/activate
python run.py
```

Verify the server:

```bash
curl http://127.0.0.1:8000/api/health
```

OpenAPI documentation is available at
`http://127.0.0.1:8000/docs`. Use `python run.py --reload` during development.

#### 5. Configure Supabase

Create a Supabase project and enable **Email** under
**Authentication → Providers**. Run `supabase/schema.sql` in the Supabase SQL
Editor. The schema creates:

- `profiles` for user details
- `prompt_conversations` for saved chats
- `prompt_history` for prompt/response exchanges
- Row Level Security policies so users access only their own records

Configure the browser app:

```bash
cp webapp/.env.example webapp/.env.local
```

Set the public browser variables in `webapp/.env.local`:

```env
VITE_BACKEND_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
```

For older Supabase projects, `VITE_SUPABASE_ANON_KEY` can be used instead of
`VITE_SUPABASE_PUBLISHABLE_KEY`. Never expose a Supabase service-role key,
database password, or Gemini API key in the frontend.

#### 6. Start the web application

In a second terminal:

```bash
cd webapp
npm install
npm run dev
```

Open `http://localhost:3000`, sign in, and send a message. Saved conversations
appear in the left history panel and can be reopened after signing in again.

#### 7. Install the Chrome extension (optional)

The extension is built separately from the web app:

```bash
cd extension/sidepanel
npm install
npm run build
```

Then:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `extension/sidepanel/dist/`.
5. Pin AssistFlow from Chrome's Extensions menu.
6. Click the toolbar icon to open the side panel.

The local extension uses `http://127.0.0.1:8000`. Keep the backend running
while using it. To use another backend, update `BACKEND_URL` in
`extension/sidepanel/src/App.jsx`, rebuild, and reload the extension.

See the [Chrome extension guide](extension/sidepanel/README.md) for CRM
support, page-context behavior, and troubleshooting.

## Normal local startup

After the one-time installation, use two terminals:

```bash
# Terminal 1: backend
cd backend
source .venv/bin/activate
python run.py
```

```bash
# Terminal 2: web app
cd webapp
npm run dev
```

If using the extension, load the built `extension/sidepanel/dist/` directory
once in Chrome and reload it after each new build.

## Offline behavior

| Condition | Behavior |
|---|---|
| Backend and Gemini available | RAG retrieval plus Gemini response |
| Backend available but AI service unavailable | Backend fallback response |
| Backend unreachable | Browser-local FAQ response |
| Backend recovers | Health polling returns the client to online mode |

The bundled FAQ is maintained separately in:

- `webapp/src/offlineFaq.js`
- `extension/sidepanel/src/offlineFaq.js`

Update both files when changing offline answers, then rebuild the affected
frontend.

## API reference

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Backend liveness check |
| `GET` | `/api/offline-status` | Check the backend SQLite cache |
| `POST` | `/api/chat` | RAG chat with optional conversation and page context |
| `POST` | `/api/offline-query` | Query the backend offline cache directly |
| `POST` | `/api/feedback` | Receive thumbs-up/down feedback |

Example chat request:

```json
{
  "message": "I cannot log in because of a password error",
  "conversation": [
    {"role": "user", "content": "I use Zendesk"},
    {"role": "assistant", "content": "Tell me what happens when you log in."}
  ],
  "page_context": {
    "platform": "Zendesk",
    "subject": "Login failure",
    "status": "Open",
    "priority": "High",
    "description": "The agent cannot sign in after a password error."
  }
}
```

The response includes `reply`, `source`, and `latency_ms`. RAG responses also
include retrieved source metadata when available.

## Knowledge base maintenance

Add `.md` or `.txt` SOP and error-log files to `data/knowledge/`, then rebuild
the vector index:

```bash
source backend/.venv/bin/activate
python scripts/ingest_knowledge.py
```

The current knowledge base covers CRM login, telephony, system downtime,
escalation, identity verification, network authentication, and general system
issues. The extension and web app FAQ files provide the local fallback for
common versions of these issues.

## Testing and validation

Build both browser clients:

```bash
cd webapp && npm run build
cd ../extension/sidepanel && npm run build
```

Compile the backend modules:

```bash
backend/.venv/bin/python -m py_compile \
  backend/app/services/chat_service.py \
  backend/app/api/routes/chat.py
```

Check formatting and review the complete testing guide:

```bash
git diff --check
```

See [docs/TESTING.md](docs/TESTING.md) for API checks, offline-mode checks,
extension checks, and troubleshooting.

## Repository structure

```text
AssistFlow-/
├── backend/                  # FastAPI API, RAG service, and offline cache
├── data/
│   └── knowledge/            # SOP and error-log source documents
├── extension/
│   └── sidepanel/            # MV3 Chrome extension source and build
├── webapp/                   # React/Vite standalone application
├── scripts/
│   └── ingest_knowledge.py   # Build the ChromaDB knowledge index
├── supabase/
│   └── schema.sql            # Profiles and conversation-history schema
├── docs/                     # Deployment, testing, design, and project guides
└── README.md
```

## Supported CRM platforms

The extension has content-script support for domains associated with:

Salesforce, Zendesk, Freshdesk, Freshworks, Genesys Cloud, PureCloud, Avaya
Cloud, RingCentral, Talkdesk, NICE inContact, Five9, HubSpot, ServiceNow,
Intercom, Help Scout, Kustomer, and Zoho.

Automatic page-context extraction depends on the CRM's page structure. The
side panel and manual text queries remain available when a page is not
recognized.

## Deployment

For production deployment, use the detailed guides:

- [Deployment guide](docs/DEPLOYMENT_GUIDE.md)
- [Render setup guide](docs/RENDER_SETUP_GUIDE.md)
- [Web application guide](docs/WEBAPP.md)

Keep Gemini and server credentials in the backend environment. Configure CORS,
`VITE_BACKEND_URL`, and Supabase browser keys for the deployed frontend.
