# AssistFlow — Testing Guide

This document covers manual testing procedures for the full system: backend API, RAG pipeline, offline FAQ, and the Chrome extension UI.

---

## Quick Start

Make sure the backend is running before testing anything that requires it:

```bash
cd backend
source .venv/bin/activate
python run.py
```

Confirm it's up:

```bash
curl http://127.0.0.1:8000/api/health
# Expected: {"status": "ok", "service": "assistflow-backend"}
```

---

## 1. Backend API Tests

Run these with `curl` or use the interactive docs at `http://127.0.0.1:8000/docs`.

### 1.1 Health Check

```bash
curl http://127.0.0.1:8000/api/health
```

**Expected:**
```json
{"status": "ok", "service": "assistflow-backend"}
```

---

### 1.2 Offline Status

```bash
curl http://127.0.0.1:8000/api/offline-status
```

**Expected:**
```json
{"available": true, "protocol_count": 39}
```

---

### 1.3 Basic Chat — RAG Pipeline

```bash
curl -s -X POST http://127.0.0.1:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "The agent cannot log into Salesforce"}'
```

**Expected:** `source` is `"rag"`, `reply` contains numbered steps, `latency_ms` is populated.

---

### 1.4 Chat with Page Context

```bash
curl -s -X POST http://127.0.0.1:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I handle this?",
    "page_context": {
      "ticketId": "98234",
      "subject": "Agent locked out of Zendesk",
      "status": "Open",
      "priority": "High",
      "customer": "Maria Santos",
      "description": "Agent reports too many failed login attempts"
    }
  }'
```

**Expected:** Reply addresses the lockout scenario specifically, using the ticket context.

---

### 1.5 Feedback Submission

```bash
curl -s -X POST http://127.0.0.1:8000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "message": "agent cannot log in",
    "reply": "1. Confirm the agent is using their work email...",
    "rating": 1
  }'
```

**Expected:**
```json
{"status": "ok", "rating": "thumbs_up"}
```

Check the backend terminal output for the `[FEEDBACK]` log line.

---

### 1.6 Empty Message Validation

```bash
curl -s -X POST http://127.0.0.1:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": ""}'
```

**Expected:** HTTP 422 (Pydantic validation error — `min_length=1`).

---

## 2. Sample Prompts — Online Mode (RAG)

These should all return `source: "rag"` with grounded answers from the knowledge base.

### CRM & Login

| Prompt | Expected topic |
|---|---|
| `"Agent can't log into Salesforce, getting INVALID_SESSION_ID"` | Session expiry / cache clear |
| `"How do I unlock an account after too many failed attempts?"` | Account lockout procedure |
| `"SSO keeps redirecting in a loop"` | SSO failure troubleshooting |
| `"Agent doesn't have access to the billing queue"` | Permission set / role assignment |
| `"Freshdesk keeps logging the agent out every hour"` | Token expiry / clock skew |

### Telephony & Audio

| Prompt | Expected topic |
|---|---|
| `"The agent can hear the customer but the customer can't hear the agent"` | Mic not working |
| `"Call quality is very choppy and robotic"` | Packet loss / jitter |
| `"Genesys shows the agent as available but no calls are coming through"` | Routing failure |
| `"Softphone crashed mid-call on RingCentral"` | Softphone crash recovery |
| `"There's a loud echo on every call"` | Echo cancellation |
| `"WebRTC ICE connection failed error in the browser"` | WebRTC / firewall issue |

### Escalation & Tickets

| Prompt | Expected topic |
|---|---|
| `"How do I escalate a ticket to Tier 2?"` | Tier 2 escalation steps |
| `"Customer is threatening legal action, what do I do?"` | Tier 3 / supervisor escalation |
| `"Walk me through a warm transfer"` | Warm transfer procedure |
| `"What's the difference between a cold and warm transfer?"` | Transfer comparison |
| `"A ticket is showing red in the queue, what does that mean?"` | SLA breach |

### Identity Verification

| Prompt | Expected topic |
|---|---|
| `"How do I verify a customer's identity over the phone?"` | Standard 2FA |
| `"Someone is calling on behalf of the account holder"` | Third-party caller |
| `"Customer cannot remember any of their verification details"` | Vulnerable customer |
| `"I need to send an OTP for a password reset"` | Enhanced verification |

### System Downtime

| Prompt | Expected topic |
|---|---|
| `"The CRM is completely down, how do I keep working?"` | Offline workflow |
| `"What do I do when the phone system is unavailable?"` | Backup dialer procedure |
| `"System just came back online, what are the first steps?"` | Post-downtime restoration |
| `"We've been down for 3 hours, supervisor activated BCP"` | Business continuity plan |

### General / Knowledge Test

| Prompt | Expected behaviour |
|---|---|
| `"What does HTTP 403 mean?"` | Gemini answers from general knowledge |
| `"Explain what VPN is in simple terms"` | General knowledge answer |
| `"What is packet loss?"` | General knowledge answer |

---

## 3. Offline FAQ Tests

These test the local JS FAQ bundled in the extension. To simulate offline mode, either stop the backend server or disconnect your network.

### How to Test Offline

**Option A — Stop the backend:**
```bash
# Press Ctrl+C in the terminal running python run.py
```

**Option B — Network off:**
Turn off Wi-Fi or disconnect Ethernet, then type in the extension.

The status pill should switch to **Offline** after the first query (5s timeout on first attempt, then instant for all subsequent queries).

---

### 3.1 FAQ Match Tests

Type these into the extension chat while offline. Each should return an answer immediately with the **Offline cache** badge.

**CRM & Login**
- `"can't log in"`
- `"account locked too many attempts"`
- `"sso not working"`
- `"session keeps expiring"`
- `"permission denied on queue"`
- `"record locked cannot save"`

**Telephony**
- `"no audio on call"`
- `"customer cant hear me"`
- `"call keeps dropping"`
- `"echo on the line"`
- `"softphone crashed"`
- `"not receiving any calls"`
- `"webrtc ice failed"`
- `"conference call dropped"`

**Downtime**
- `"crm is down"`
- `"system unavailable"`
- `"phone system down"`
- `"system is back up now"`

**Escalation**
- `"how to escalate"`
- `"warm transfer"`
- `"cold transfer"`
- `"ticket overdue sla"`

**Verification**
- `"verify customer identity"`
- `"third party caller"`
- `"otp not working"`

**Network / Auth**
- `"vpn not connecting"`
- `"mfa code wrong"`
- `"ssl certificate error"`

---

### 3.2 No-Match Test (Topic List)

Type something the FAQ doesn't cover:

- `"hello"`
- `"asdfgh"`
- `"what is the weather today"`

**Expected:** The topic list appears showing all 35 FAQ categories as clickable buttons. Tapping any button should load that topic's answer immediately.

---

### 3.3 Auto-Recovery Test

1. Stop the backend (`Ctrl+C`).
2. Send any query in the extension — status pill switches to **Offline**, FAQ answer appears.
3. Restart the backend: `python run.py`
4. Wait up to 30 seconds without sending any message.
5. Status pill should switch back to **Online** automatically (health poll).
6. Send a query — should return a full RAG response with `"AI · SOP"` badge.

---

## 4. Extension UI Checks

Load the extension from `extension/sidepanel/dist/` and verify these manually.

| Check | How to verify |
|---|---|
| Side panel auto-opens on Salesforce / Zendesk | Navigate to a supported CRM domain |
| Platform name appears in header | Header should show e.g. "Active on Salesforce" |
| Highlight-to-query banner | Select text on a CRM page — banner appears with "Use as query" |
| Right-click context menu | Right-click selected text → "Ask AssistFlow" should appear |
| Ticket context shown | Open a ticket — `#ID · Subject` should appear under the title |
| Dark mode toggle | Click 🌙 / ☀️ — theme switches and persists after panel close/reopen |
| Thumbs up / down | Rate a response — buttons disable after one click |
| Source badge shows correctly | "AI · SOP" online, "Offline cache" from FAQ |
| Retry button on connection errors | Force a backend error — retry button appears on the error bubble |
| Loading dots | Appear while a backend request is in progress |

---

## 5. Pytest — Backend Unit Tests

pytest and httpx are already in `requirements.txt`. Run from the `backend/` directory:

```bash
cd backend
source .venv/bin/activate
pytest -v
```

Test files go in `backend/tests/`. A starter file is at `backend/tests/test_api.py` (create if it doesn't exist):

```python
# backend/tests/test_api.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_chat_empty_message():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post("/api/chat", json={"message": ""})
    assert r.status_code == 422  # Pydantic min_length validation

@pytest.mark.asyncio
async def test_feedback_thumbs_up():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post("/api/feedback", json={
            "message": "test query",
            "reply": "test reply",
            "rating": 1
        })
    assert r.status_code == 200
    assert r.json()["rating"] == "thumbs_up"

@pytest.mark.asyncio
async def test_offline_status():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/offline-status")
    assert r.status_code == 200
    data = r.json()
    assert "available" in data
    assert "protocol_count" in data
```

---

## 6. Common Issues & Fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| `/api/chat` returns 500 | `GEMINI_API_KEY` missing or invalid | Check `backend/.env` |
| RAG answers are generic, no SOP content | Knowledge base not ingested | Run `python scripts/ingest_knowledge.py` |
| Offline FAQ not responding | Extension built before `offlineFaq.js` was added | Run `npm run build` in `extension/sidepanel/` |
| Status pill stuck on Offline | Backend not running | Start with `python run.py` |
| Side panel doesn't open automatically | Extension not loaded or wrong `dist/` folder | Reload at `chrome://extensions` |
| `422 Unprocessable Entity` on `/api/chat` | Missing or empty `message` field | Ensure request body has `"message"` with content |
| ChromaDB collection not found warning | First run, ingestion not done yet | Run `python scripts/ingest_knowledge.py` |
