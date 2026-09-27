"""
seed_offline_db.py
------------------
Creates the SQLite offline cache database and populates it with
pre-saved procedures for common call center issues.

These are served by ChatService when Gemini / the internet is unavailable.

Run from the project root:
    python scripts/seed_offline_db.py
"""

import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / "backend" / ".env")

import os

DB_PATH = Path(os.getenv(
    "OFFLINE_DB_PATH",
    str(Path(__file__).resolve().parents[1] / "data" / "offline_cache" / "offline.db")
))

OFFLINE_PROTOCOLS = [
    # ── CRM / Login ────────────────────────────────────────────────────────
    (
        "agent cannot log in crm login failure",
        "1. Ask the agent to confirm they are using their work email address.\n"
        "2. Click 'Forgot Password' on the login page and follow the reset email.\n"
        "3. Check spam/junk if the email does not arrive within 5 minutes.\n"
        "4. If still no email, contact IT Support with the agent's name and employee ID.\n"
        "5. Log the incident under category: Access / Authentication.",
    ),
    (
        "account locked too many attempts",
        "1. Do not attempt further logins — this extends the lockout.\n"
        "2. Contact IT Support with the agent's full name, employee ID, and platform name.\n"
        "3. IT Support will unlock the account within 15 minutes during business hours.\n"
        "4. After unlocking, advise the agent to reset their password before logging in.",
    ),
    (
        "salesforce zendesk freshdesk login sso single sign on failure",
        "1. Confirm the agent is connected to the corporate VPN.\n"
        "2. Clear the browser cache and cookies, then retry.\n"
        "3. Try an incognito/private browser window.\n"
        "4. Check the IT Status Page for active SSO outages.\n"
        "5. If no outage is listed, escalate to IT Security with a screenshot of the error.\n"
        "6. As a workaround, use username/password login if the platform supports it.",
    ),
    # ── Telephony / Call Quality ────────────────────────────────────────────
    (
        "agent cannot hear customer one way audio no sound",
        "1. Place the customer on hold.\n"
        "2. Check that the headset is firmly connected.\n"
        "3. In telephony Settings → Audio Devices, confirm the correct mic and speaker are selected.\n"
        "4. Disconnect and reconnect the headset.\n"
        "5. If using a softphone, close and reopen the application.\n"
        "6. If unresolved, transfer the customer to another agent and log the fault.",
    ),
    (
        "customer cannot hear agent microphone not working muted",
        "1. Check that the browser or application has microphone permissions enabled.\n"
        "2. Confirm the agent is not muted in the telephony platform.\n"
        "3. Test the microphone using the platform's built-in audio test tool.\n"
        "4. Check the physical mute button on the headset.\n"
        "5. Try a different USB port or headset.\n"
        "6. If unresolved after 3 minutes, transfer the customer and escalate.",
    ),
    (
        "call drops disconnects unexpectedly poor connection",
        "1. Check internet connection — run a speed test at fast.com (minimum: 10/5 Mbps).\n"
        "2. Switch from Wi-Fi to a wired Ethernet connection if possible.\n"
        "3. Check the Telephony Status Page for active outages.\n"
        "4. Check QoS dashboard for packet loss above 1% or jitter above 30ms.\n"
        "5. Escalate to Telephony Support with the call recording ID and timestamps.",
    ),
    (
        "echo background noise on call audio quality",
        "1. Enable noise-cancellation in the headset companion app.\n"
        "2. Move to a quieter workstation.\n"
        "3. Enable Noise Suppression and Echo Cancellation in telephony Audio Settings.\n"
        "4. Reduce microphone sensitivity/gain.\n"
        "5. If echo is on the customer's end, advise them to use a handset instead of speakerphone.",
    ),
    # ── Downtime / Offline ──────────────────────────────────────────────────
    (
        "system downtime crm unavailable offline workflow",
        "1. Check the IT Status Page for active incidents.\n"
        "2. If two or more agents are affected, treat as a system-wide outage.\n"
        "3. Notify your supervisor immediately.\n"
        "4. Open the Offline Interaction Log spreadsheet (shared network drive or printed form).\n"
        "5. Record: date/time, customer name, account number, issue summary, action taken.\n"
        "6. After restoration, enter all offline interactions within 30 minutes (tag: offline-entry).",
    ),
    (
        "telephony dialer phone unavailable backup procedure",
        "1. Use the backup softphone application on the desktop (icon: Backup Dialer).\n"
        "2. If both dialers are unavailable, use the designated desk phone in your pod.\n"
        "3. Inform customers: 'I'm working from a backup system and may not have full account history.'\n"
        "4. Log all calls in the Manual Interaction Log.\n"
        "5. Do not promise specific resolution timelines — use standard SLA wording.",
    ),
    # ── Escalation / Tickets ────────────────────────────────────────────────
    (
        "how to escalate ticket tier 2 escalation procedure",
        "1. Ensure the ticket has: customer details, issue description, steps already taken, error messages.\n"
        "2. In the CRM, change Priority to 'High' and Tier to 'Tier 2'.\n"
        "3. Assign to the correct Tier 2 queue (see routing table in SOP-004).\n"
        "4. Add an internal note: 'Escalated to Tier 2 — [reason]. Tier 1 agent: [your name].'\n"
        "5. Inform the customer they will receive a follow-up within the stated SLA.\n"
        "6. Do not close the ticket — leave it in 'Escalated' status.",
    ),
    (
        "warm transfer cold transfer how to transfer call",
        "Warm transfer (use for distressed customers or complex issues):\n"
        "1. Place the customer on hold.\n"
        "2. Call the receiving agent internally and brief them.\n"
        "3. Confirm the receiving agent is ready.\n"
        "4. Connect the customer and introduce them.\n"
        "5. Stay on the line for 30 seconds to confirm the handoff.\n\n"
        "Cold transfer (use for straightforward routing):\n"
        "1. Confirm the customer understands they are being transferred.\n"
        "2. Transfer directly to the queue — the receiving agent has full ticket context.",
    ),
    # ── Identity Verification ───────────────────────────────────────────────
    (
        "customer identity verification how to verify account security check",
        "1. Ask the customer to confirm two of: full name, date of birth, account number, "
        "registered email, billing postcode, last 4 digits of payment method, security answer.\n"
        "2. Do not suggest which factors — let the customer provide them.\n"
        "3. If both match: proceed and note 'Customer verified — standard 2FA.'\n"
        "4. If one factor fails: give one more attempt with a different factor.\n"
        "5. If verification fails twice: do not proceed. Advise the customer to use an alternative channel.",
    ),
    (
        "third party caller not account holder authorization",
        "1. Check the Authorized Contacts section in the CRM.\n"
        "2. If the third party is listed: apply standard 2-factor verification.\n"
        "3. If not listed: do not provide account access.\n"
        "4. Say: 'For security, I can only discuss this account with authorized contacts. "
        "The account holder can add you by contacting us directly.'\n"
        "5. Never allow a third party to add themselves as an authorized contact.",
    ),
]


def seed():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS offline_protocols (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            answer   TEXT NOT NULL,
            created  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Clear existing rows for idempotent re-runs
    cursor.execute("DELETE FROM offline_protocols")

    cursor.executemany(
        "INSERT INTO offline_protocols (question, answer) VALUES (?, ?)",
        OFFLINE_PROTOCOLS,
    )

    conn.commit()
    conn.close()

    print(f"\n=== Offline DB Seeded ===")
    print(f"Path    : {DB_PATH}")
    print(f"Records : {len(OFFLINE_PROTOCOLS)}")
    print("=========================\n")


if __name__ == "__main__":
    seed()
