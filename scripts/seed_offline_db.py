"""
seed_offline_db.py
------------------
Creates the SQLite offline cache database and populates it with
pre-saved procedures for common call center issues.

These are served by ChatService when Gemini / the internet is unavailable.

Each entry's question string is packed with synonyms, platform names,
error codes, and natural agent phrasings so the keyword scorer in
ChatService._offline_fallback() has the best possible chance of matching
whatever the agent types.

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

    # ══════════════════════════════════════════════════════════════════════
    # CRM / LOGIN / ACCESS
    # ══════════════════════════════════════════════════════════════════════

    (
        # Broad login failure — covers: "can't log in", "login not working",
        # "crm login", "wrong password", "forgot password", "credentials wrong",
        # "salesforce login", "zendesk login", "freshdesk login", "hubspot login",
        # "servicenow login", "zoho login", "crm down", "access denied"
        "agent cannot log in crm login failure wrong password credentials "
        "salesforce zendesk freshdesk hubspot servicenow zoho crm access denied "
        "can not log in cannot login not working forgot password",
        "1. Ask the agent to confirm they are using their work email address, not a personal one.\n"
        "2. Click 'Forgot Password' on the login page and follow the reset email.\n"
        "3. Check spam/junk if the reset email does not arrive within 5 minutes.\n"
        "4. If still no email, escalate to IT Support via the helpdesk portal with the agent's name and employee ID.\n"
        "5. Log the incident under category: Access / Authentication.",
    ),

    (
        # Account locked — covers: "locked out", "too many attempts", "account locked",
        # "locked after failed attempts", "locked salesforce", "locked zendesk",
        # "account suspended", "login blocked", "too many wrong passwords"
        "account locked too many attempts failed login lockout locked out "
        "account suspended blocked salesforce zendesk freshdesk crm locked "
        "too many wrong passwords login blocked unable to login",
        "1. Do not attempt further logins — additional attempts will extend the lockout period.\n"
        "2. Contact IT Support immediately with: agent's full name, employee ID, and platform name.\n"
        "3. IT Support will unlock the account within 15 minutes during business hours.\n"
        "4. After unlocking, advise the agent to reset their password before logging in.\n"
        "5. Document the lockout event in the access log.",
    ),

    (
        # SSO failure — covers: "sso not working", "single sign on failed",
        # "sso error", "sso broken", "cannot authenticate", "saml error",
        # "oauth failed", "identity provider error", "sso salesforce", "sso zendesk"
        "sso single sign on failure failed error not working saml oauth "
        "identity provider authentication failed cannot authenticate "
        "sso salesforce sso zendesk sso broken login redirect failed "
        "idp error federation error sso down",
        "1. Confirm the agent is connected to the corporate VPN before attempting SSO.\n"
        "2. Clear the browser cache and cookies, then retry.\n"
        "3. Try an incognito/private browser window to rule out extension conflicts.\n"
        "4. Check the IT Status Page for any active SSO or identity provider outages.\n"
        "5. If no outage is listed, escalate to IT Security with a screenshot of the SSO error.\n"
        "6. As a workaround, use username/password login if the platform supports it.",
    ),

    (
        # No access to module/queue — covers: "no access", "permission denied",
        # "can't see queue", "missing module", "access not granted", "role wrong",
        # "permission set", "no queue access", "403 forbidden crm"
        "no access module queue permission denied missing access not granted "
        "role wrong permission set 403 forbidden crm cannot see queue "
        "access removed missing permission module not visible role missing "
        "no queue access can not see cases tickets",
        "1. Verify the agent's role assignment in the CRM admin panel (requires supervisor access).\n"
        "2. Common cause: the agent's role profile is missing the required permission set.\n"
        "3. Salesforce: Setup → Users → select user → assign the correct Permission Set.\n"
        "4. Zendesk: Admin → People → select agent → change role to the correct tier.\n"
        "5. Freshdesk: Admin → Agents → select agent → assign correct Group and Role.\n"
        "6. If no admin access, raise a request to the CRM Admin team with the agent's name and the module/queue needed.\n"
        "7. Expected resolution: within 1 business hour.",
    ),

    (
        # Session expiring — covers: "session expired", "keeps logging out",
        # "crm logs me out", "session timeout", "invalid session", "INVALID_SESSION_ID",
        # "kicked out of crm", "session keeps expiring", "salesforce session",
        # "auto logout", "session not persisting"
        "session expired keeps logging out crm logs out session timeout "
        "INVALID_SESSION_ID invalid session kicked out auto logout "
        "session keeps expiring not persisting salesforce session expired "
        "zendesk session repeated logout freshdesk session timeout",
        "1. This is often caused by browser cookie settings or a network proxy stripping session tokens.\n"
        "2. Confirm cookies are enabled for the CRM domain in the agent's browser settings.\n"
        "3. Ensure the agent is not using a VPN split-tunnel that routes CRM traffic differently.\n"
        "4. If the Salesforce INVALID_SESSION_ID error appears: clear browser cache, log out fully, and log back in.\n"
        "5. If the issue persists across multiple agents, escalate to IT as a session timeout configuration problem.\n"
        "6. Short-term workaround: advise the agent to save work frequently and re-authenticate when prompted.",
    ),

    (
        # Record locked — covers: "record locked", "unable to lock row",
        # "cannot save", "someone else editing", "locked record salesforce",
        # "UNABLE_TO_LOCK_ROW", "concurrent edit", "locked ticket servicenow"
        "record locked unable to lock row cannot save UNABLE_TO_LOCK_ROW "
        "someone else editing concurrent edit locked salesforce servicenow "
        "locked record cannot update ticket locked changes not saving "
        "save failed record in use",
        "1. Wait 30–60 seconds and retry saving — the lock is usually released quickly.\n"
        "2. Contact the other agent via internal messaging and coordinate who completes the edit.\n"
        "3. If the lock persists for more than 5 minutes with no active editor, escalate to the CRM Admin to force-release the lock.\n"
        "4. Never duplicate the record to work around the lock — this creates data inconsistencies.",
    ),

    (
        # Zendesk 503 / CRM unavailable — covers: "zendesk down", "503 service unavailable",
        # "zendesk not loading", "crm not loading", "ticket queue not loading",
        # "zendesk maintenance", "crm slow", "zendesk 503"
        "zendesk down 503 service unavailable not loading crm not loading "
        "ticket queue not loading zendesk maintenance crm slow zendesk 503 "
        "zendesk error page blank zendesk not working platform down",
        "1. Check the Zendesk System Status page (status.zendesk.com) for active incidents.\n"
        "2. Wait 5 minutes and refresh — 503 errors during maintenance windows resolve automatically.\n"
        "3. If the page does not recover after 10 minutes, switch to the offline interaction logging procedure.\n"
        "4. Do not submit duplicate tickets — wait for the service to restore.\n"
        "5. Notify your supervisor and log affected calls in the manual interaction log.",
    ),

    (
        # Freshdesk auth token expired — covers: "freshdesk session expired",
        # "freshdesk logout", "freshdesk 401", "authentication token expired",
        # "freshdesk keeps logging out", "freshdesk api 401"
        "freshdesk session expired authentication token expired freshdesk 401 "
        "freshdesk logout keeps logging out freshdesk api 401 unauthorized "
        "freshdesk token freshdesk re-login session expired freshdesk",
        "1. Log out and log back in to obtain a fresh session token — this is expected daily behaviour.\n"
        "2. If the token expires repeatedly within a short period, check that the workstation clock is accurate — clock skew causes premature token expiry.\n"
        "3. For integration 401 errors, the API key may need refreshing in the integration settings by the CRM Admin.",
    ),

    # ══════════════════════════════════════════════════════════════════════
    # TELEPHONY / CALL QUALITY / AUDIO
    # ══════════════════════════════════════════════════════════════════════

    (
        # One-way audio / agent can't hear customer — covers: "no audio",
        # "can't hear customer", "one way audio", "silent call", "no sound",
        # "customer muted", "audio not working", "genesys audio", "talkdesk audio"
        "agent cannot hear customer one way audio no sound silent call "
        "audio not working genesys audio talkdesk audio avaya no audio "
        "ringcentral no sound five9 audio problem cannot hear customer "
        "customer silent one sided audio media stream failed headset no audio",
        "1. Place the customer on hold.\n"
        "2. Check the headset is firmly connected to the USB port or audio jack.\n"
        "3. In telephony Settings → Audio Devices, confirm the correct microphone and speaker are selected.\n"
        "4. Disconnect and reconnect the headset, then check if the audio device refreshes.\n"
        "5. If using a softphone, close and reopen the telephony application.\n"
        "6. If unresolved, transfer the customer to another agent and log the fault with the Telephony team.",
    ),

    (
        # Microphone not working / customer can't hear agent — covers:
        # "mic not working", "customer can't hear me", "muted", "no mic",
        # "microphone permission", "getUserMedia", "mic blocked", "headset muted"
        "customer cannot hear agent microphone not working muted mic not working "
        "customer can not hear me no microphone getUserMedia mic blocked "
        "headset muted mic permission denied browser microphone chrome mic "
        "microphone access denied softphone muted physical mute button",
        "1. Check the browser or application has microphone permissions enabled:\n"
        "   Chrome: Settings → Privacy and Security → Site Settings → Microphone.\n"
        "2. Confirm the agent is not muted in the telephony platform (check the mute indicator).\n"
        "3. Test the microphone using the platform's built-in audio test tool.\n"
        "4. Check the physical mute button on the headset — confirm it is not engaged.\n"
        "5. Try a different USB port or headset if available.\n"
        "6. If unresolved after 3 minutes, transfer the customer and escalate to Telephony Support.",
    ),

    (
        # Call drops / disconnects — covers: "call dropping", "calls keep disconnecting",
        # "call drops", "unstable calls", "call cut off", "lost connection during call",
        # "bad internet call", "call quality poor", "dropped call", "call keeps cutting out"
        "call drops disconnects unexpectedly poor connection call dropping "
        "calls keep disconnecting cut off lost connection during call "
        "unstable calls bad internet call quality poor dropped call "
        "call keeps cutting out call disconnect genesys call drop talkdesk drop",
        "1. Check internet connection — run a speed test at fast.com (minimum: 10 Mbps down / 5 Mbps up).\n"
        "2. Switch from Wi-Fi to a wired Ethernet connection if possible.\n"
        "3. Check the Telephony Status Page for active outages.\n"
        "4. In the QoS/Network Diagnostics dashboard, check for packet loss above 1% or jitter above 30ms.\n"
        "5. Close unnecessary browser tabs and applications consuming bandwidth.\n"
        "6. Escalate to Telephony Support with the call recording ID and timestamps if unresolved.",
    ),

    (
        # Echo / background noise — covers: "echo on call", "background noise",
        # "noise on line", "static", "echo cancellation", "customer hears echo",
        # "feedback on call", "reverb", "noise suppression", "loud background"
        "echo background noise on call audio quality static feedback reverb "
        "noise suppression echo cancellation customer hears echo loud background "
        "noise on line poor audio quality choppy robotic audio words cutting out "
        "packet loss jitter audio degradation noisy call",
        "1. Enable noise-cancellation in the headset companion app.\n"
        "2. Move to a quieter workstation.\n"
        "3. In telephony Audio Settings, enable Noise Suppression and Echo Cancellation.\n"
        "4. Reduce the microphone sensitivity/gain in the platform's audio settings.\n"
        "5. If echo is on the customer's end, advise them to use a handset instead of speakerphone.\n"
        "6. If choppy/robotic audio: check QoS dashboard for packet loss > 1% or jitter > 30ms — escalate to IT Operations if widespread.",
    ),

    (
        # Agent status stuck / not receiving calls — covers: "not getting calls",
        # "no calls routing", "available but no calls", "calls not coming through",
        # "routing failure", "stuck in available", "agent stuck", "no calls in queue"
        "agent status stuck not receiving calls no calls routing available but no calls "
        "calls not coming through routing failure stuck available agent stuck "
        "no calls in queue genesys not routing five9 not routing NICE incontact stuck "
        "avaya not routing telephony routing problem calls not assigned",
        "1. Log out of the telephony platform completely (not just set to Offline — full logout).\n"
        "2. Wait 30 seconds, then log back in.\n"
        "3. Set status back to 'Available' and confirm which queues the agent is assigned to.\n"
        "4. Verify the agent's telephony licence is active — check with the Telephony Admin if unsure.\n"
        "5. If calls still do not route after 5 minutes, contact the Telephony Admin — they can force a routing profile refresh from the admin console.\n"
        "6. If multiple agents are affected, check the platform's routing configuration for recent changes.",
    ),

    (
        # Softphone crashes — covers: "softphone crashed", "app closing",
        # "phone app crash", "softphone keeps closing", "talkdesk crash",
        # "ringcentral crash", "five9 crash", "softphone freezes", "app freezes on call"
        "softphone crashes freezes app closing phone app crash keeps closing "
        "talkdesk crash ringcentral crash five9 crash softphone not responding "
        "application crash unhandled exception softphone update issue "
        "softphone closes on incoming call app crash during call",
        "1. Note the exact time of the crash and the call ID if visible before the crash.\n"
        "2. Reopen the softphone and call the customer back using the callback number in the CRM.\n"
        "3. Clear the browser cache and hard-reload the softphone page (Ctrl+Shift+R / Cmd+Shift+R).\n"
        "4. Check the telephony platform's status page for any reported update or incident.\n"
        "5. Report the crash to Telephony Support with: agent name, time, browser version, OS version, and call ID.\n"
        "6. If the crash repeats on the next call, switch to the backup desk phone until resolved.",
    ),

    (
        # WebRTC ICE failure — covers: "webrtc failed", "ICE failed", "call connects no audio",
        # "ice connection failed", "ice gathering failed", "webrtc error", "silent both sides",
        # "firewall blocking webrtc", "udp blocked", "stun turn failed"
        "webrtc ICE connection failed ice gathering failed ice failed "
        "call connects no audio silent both sides webrtc error firewall blocking "
        "udp blocked stun turn failed ice_connection_failed ice_failed "
        "browser call no audio webrtc softphone silent",
        "1. Check if the agent is on the corporate VPN — some VPN configs block WebRTC UDP traffic. Try temporarily disabling the VPN.\n"
        "2. Switch from Wi-Fi to a wired Ethernet connection — Wi-Fi packet loss causes ICE failures.\n"
        "3. Ask the agent to run a WebRTC test at test.webrtc.org and share results with IT Support.\n"
        "4. If multiple agents in the same location are affected, escalate to IT Network — firewall rules may need updating to allow WebRTC UDP (ports 10000–60000).\n"
        "5. As a temporary workaround, use a desk phone instead of the softphone.",
    ),

    (
        # Conference / 3-way call failure — covers: "conference call failed",
        # "3 way call dropping", "conference bridge error", "third party drops",
        # "conference failed", "three way call not working", "bridge failure"
        "conference call failed three way call dropping conference bridge error "
        "third party drops conference failed bridge failure conference error "
        "3 way call not working avaya conference genesys conference "
        "ringcentral conference failed third party disconnects",
        "1. Inform the customer you are experiencing a technical issue and will reconnect the third party.\n"
        "2. Attempt the conference again — most bridge failures are transient.\n"
        "3. If it fails a second time, complete a warm transfer instead: place the customer on hold, call the third party directly, brief them, then connect the customer.\n"
        "4. Log the failed conference attempt in the ticket notes with the timestamp.\n"
        "5. If conference failures are recurring, escalate to the Telephony Admin to check bridge capacity.",
    ),

    # ══════════════════════════════════════════════════════════════════════
    # SYSTEM DOWNTIME / OFFLINE WORKFLOW
    # ══════════════════════════════════════════════════════════════════════

    (
        # System downtime / CRM down — covers: "crm down", "system unavailable",
        # "system offline", "everything down", "crm not working", "outage",
        # "lost connection", "system outage", "platform down", "website unreachable",
        # "network down", "internet down", "all systems down", "nothing loading"
        "system downtime crm unavailable offline workflow system down outage "
        "crm not working everything down lost connection platform down "
        "website unreachable network down internet down all systems down "
        "nothing loading cannot connect server down connection refused "
        "ERR_CONNECTION_REFUSED network error systems unavailable",
        "1. Check the IT Status Page for active incidents — bookmark: status.internal.\n"
        "2. Ask a colleague if they are experiencing the same issue. If two or more agents are affected, treat as a system-wide outage.\n"
        "3. Notify your team supervisor immediately via the designated channel (Teams / Slack / phone).\n"
        "4. Do not spend more than 3 minutes trying to restore access before switching to the offline workflow.\n"
        "5. Open the Offline Interaction Log spreadsheet (shared network drive: \\\\shared\\ops\\offline_log.xlsx) or the printed backup form.\n"
        "6. Record for every interaction: date/time, customer name, account number, issue summary, action taken, follow-up required.\n"
        "7. Once the system is restored, enter all offline interactions within 30 minutes — tag them 'offline-entry'.",
    ),

    (
        # Telephony down — covers: "phone system down", "dialer down", "genesys down",
        # "avaya down", "talkdesk down", "ringcentral down", "five9 down",
        # "cannot make calls", "cannot receive calls", "telephony unavailable"
        "telephony dialer phone unavailable backup procedure phone system down "
        "genesys down avaya down talkdesk down ringcentral down five9 down "
        "nice incontact down cannot make calls cannot receive calls "
        "telephony unavailable dialer not working softphone not connecting",
        "1. Use the backup softphone application on the desktop (icon: 'Backup Dialer').\n"
        "2. If both dialers are unavailable, use the designated desk phone in your pod (one per pod — confirm extension with supervisor).\n"
        "3. Inform customers: 'I'm working from a backup system — I may not have full account history.'\n"
        "4. Log all calls in the Manual Interaction Log.\n"
        "5. Do not promise specific resolution timelines during downtime — use standard SLA wording.\n"
        "6. Check the telephony platform's status page for incident updates.",
    ),

    (
        # Restoring after downtime — covers: "system back up", "back online",
        # "after outage", "system restored", "crm back", "system recovery",
        # "what to do after outage", "post downtime", "backlog after downtime"
        "restoring after downtime system back up back online after outage "
        "system restored crm back recovery post downtime backlog after outage "
        "what to do when system comes back system recovered",
        "1. Wait for the official 'System Restored' notification from IT Operations via the team channel — do not assume the system is back based on your own login attempt alone.\n"
        "2. Log in and verify your workstation: CRM loads and shows your queue, telephony shows 'Available', AI Assistant responds to a test query.\n"
        "3. Enter all offline interaction logs into the CRM within 30 minutes, tagged 'offline-entry'.\n"
        "4. Notify your supervisor once backlog entries are complete.\n"
        "5. If you find data discrepancies (duplicate records, missing interactions), report to the Data Team — do not attempt to fix records yourself.",
    ),

    (
        # Prolonged outage / BCP — covers: "outage more than 2 hours", "long outage",
        # "bcp", "business continuity", "prolonged downtime", "extended outage",
        # "still down after 2 hours", "major incident"
        "prolonged outage more than 2 hours long outage bcp business continuity "
        "extended outage still down major incident p1 incident long downtime "
        "hours of downtime system still unavailable",
        "1. Your supervisor will activate the Business Continuity Plan (BCP) and communicate revised workflows via the team channel.\n"
        "2. You may be redirected to handle email-only or chat-only interactions if those channels remain available.\n"
        "3. All SLA clocks are paused during a declared outage — inform customers of this if asked.\n"
        "4. Update your supervisor on customer volume and escalating situations every 30 minutes.\n"
        "5. All SLA breach timers restart from zero once the system is restored.",
    ),

    # ══════════════════════════════════════════════════════════════════════
    # ESCALATION / TICKET MANAGEMENT
    # ══════════════════════════════════════════════════════════════════════

    (
        # Escalate to Tier 2 — covers: "how to escalate", "escalate ticket",
        # "tier 2 escalation", "send to tier 2", "raise ticket tier 2",
        # "escalation procedure", "escalate case", "move to tier 2"
        "how to escalate ticket tier 2 escalation procedure raise ticket "
        "send to tier 2 escalate case move to specialist team escalation steps "
        "when to escalate SOP-004 escalation routing specialist team",
        "1. Ensure the ticket contains: customer details, clear issue description, steps already taken by Tier 1, and any error messages.\n"
        "2. In the CRM, change Priority to 'High' and Tier to 'Tier 2'.\n"
        "3. Assign to the correct Tier 2 queue (see routing table in SOP-004).\n"
        "4. Add an internal note: 'Escalated to Tier 2 — [reason]. Tier 1 agent: [your name]. Date: [date].'\n"
        "5. Inform the customer: 'I'm escalating this to our specialist team. You will receive a follow-up within [SLA time].' Do not give a specific agent name.\n"
        "6. Do not close the ticket — leave it in 'Escalated' status.",
    ),

    (
        # Tier 3 / supervisor escalation — covers: "tier 3 escalation", "escalate to supervisor",
        # "need supervisor", "supervisor escalation", "external escalation",
        # "legal escalation", "fraud escalation", "VIP escalation", "enterprise escalation"
        "tier 3 escalation escalate to supervisor need supervisor supervisor approval "
        "external escalation legal escalation fraud escalation VIP enterprise account "
        "data breach unauthorized account access threatening legal action regulatory "
        "complaint P1 immediate escalation security fraud team",
        "1. Tier 3 escalation requires supervisor approval — do not escalate to Tier 3 directly.\n"
        "2. Notify your supervisor with the ticket number and a brief verbal summary.\n"
        "3. Supervisor will review and either approve escalation or provide an alternative path.\n"
        "4. If approved, the supervisor escalates to the relevant Tier 3 team or external vendor.\n"
        "5. Update the ticket: 'Supervisor [name] approved Tier 3 escalation on [date/time].'\n"
        "6. For fraud/security/data breach: route to SEC-FRAUD queue immediately as a P1 — do not wait.",
    ),

    (
        # Warm transfer — covers: "warm transfer", "how to do a warm transfer",
        # "transfer with introduction", "briefed transfer", "conference transfer"
        "warm transfer how to do a warm transfer transfer with introduction "
        "briefed transfer conference transfer introduce agent transfer steps "
        "warm handoff transfer distressed customer complex transfer",
        "Warm transfer (use for distressed customers or complex issues):\n"
        "1. Place the customer on hold.\n"
        "2. Call the receiving agent/queue internally and brief them on the situation.\n"
        "3. Confirm the receiving agent is ready.\n"
        "4. Connect the customer and introduce them: 'I have [agent name] on the line who will continue to assist you.'\n"
        "5. Stay on the line for 30 seconds to confirm the handoff is complete.",
    ),

    (
        # Cold transfer — covers: "cold transfer", "blind transfer",
        # "straight transfer", "direct transfer", "transfer without introduction"
        "cold transfer blind transfer straight transfer direct transfer "
        "transfer without introduction cold handoff transfer to queue",
        "Cold transfer (use for straightforward routing where the receiving queue has full ticket context):\n"
        "1. Confirm the customer understands they are being transferred.\n"
        "2. Transfer directly to the correct queue — the receiving agent will have full ticket context.\n"
        "3. Do not use a cold transfer for distressed customers, sensitive situations, or complex issues — use a warm transfer instead.",
    ),

    (
        # SLA breach / ticket about to breach — covers: "sla breach", "ticket overdue",
        # "sla at risk", "red ticket", "breach warning", "ticket deadline",
        # "approaching sla", "sla timer", "response time exceeded"
        "sla breach ticket overdue sla at risk red ticket breach warning "
        "ticket deadline approaching sla sla timer response time exceeded "
        "ticket late sla warning overdue ticket missing sla deadline",
        "1. Review your open ticket queue at the start and midpoint of every shift — SLA-risk tickets are highlighted in red.\n"
        "2. If a ticket is at risk of breaching due to a dependency outside your control, flag it to your supervisor immediately — do not wait for the breach to occur.\n"
        "3. Add a mandatory comment to the ticket explaining the cause of delay.\n"
        "4. If the delay is due to a system outage, SLA clocks are paused — confirm this with your supervisor.\n"
        "5. Tickets approaching SLA for billing disputes over $500 route to BILL-T3 with a 1 business day SLA.",
    ),

    (
        # Ticket status definitions — covers: "ticket status", "what does escalated mean",
        # "pending customer status", "ticket on hold", "closed vs resolved",
        # "what is ACW", "ticket statuses explained"
        "ticket status escalated pending customer on hold resolved closed "
        "what does status mean ticket statuses explained open status ACW "
        "after call work status definitions ticket states",
        "Ticket status definitions:\n"
        "- Open: active, being worked on by the current assignee.\n"
        "- Pending Customer: awaiting response or action from the customer.\n"
        "- Escalated: transferred to a higher tier; original agent is no longer primary.\n"
        "- On Hold: blocked by a third party or system issue.\n"
        "- Resolved: issue fixed; customer confirmed or SLA expired.\n"
        "- Closed: resolved with no further action expected.\n\n"
        "Never close a ticket that has been escalated — leave it in 'Escalated' status until the higher tier resolves it.",
    ),

    # ══════════════════════════════════════════════════════════════════════
    # IDENTITY VERIFICATION
    # ══════════════════════════════════════════════════════════════════════

    (
        # Standard verification — covers: "how to verify customer", "identity check",
        # "security verification", "verify account", "2fa check", "security questions",
        # "verify caller", "id check", "customer verification steps"
        "customer identity verification how to verify account security check "
        "id check verify caller 2fa check security questions standard verification "
        "verify customer identity SOP-005 caller authentication account verification "
        "confirm identity security verification steps",
        "1. Greet the customer and say: 'For security purposes, I need to verify your identity before I can access your account.'\n"
        "2. Ask the customer to confirm at least TWO of: full name, date of birth, account number, registered email, billing postcode/ZIP, last 4 digits of payment method, security question answer.\n"
        "3. Do not suggest which factors — let the customer provide them.\n"
        "4. If both match: proceed. Note in the ticket: 'Customer verified — standard 2FA.'\n"
        "5. If one factor fails: give the customer one more attempt with a different factor.\n"
        "6. If verification fails twice: do not proceed. Say: 'I'm unable to verify your identity at this time. Please use an alternative channel.'\n"
        "7. Log the outcome in the CRM — do not document the customer's answers verbatim.",
    ),

    (
        # Enhanced/high-risk verification — covers: "otp verification", "send otp",
        # "one time code", "enhanced verification", "password reset verification",
        # "payment change verification", "high risk action", "fraud investigation verify"
        "enhanced verification otp one time code send otp high risk action "
        "password reset verification payment change verification fraud investigation verify "
        "OTP not received verification code send code enhanced 2fa",
        "1. Complete standard 2-factor verification first.\n"
        "2. In the CRM: Account → Security → Send Verification Code.\n"
        "3. Inform the customer: 'I'm sending a one-time code to your registered phone/email. Please share it when you receive it.'\n"
        "4. Wait up to 3 minutes for the customer to receive the OTP.\n"
        "5. Enter the code in the CRM verification field — the system will confirm if it matches.\n"
        "6. If the OTP does not match or expires: do not proceed. Escalate to the Security Team — do not attempt to bypass.",
    ),

    (
        # Third-party caller — covers: "third party calling", "not account holder",
        # "calling on behalf", "authorized contact", "someone else calling",
        # "power of attorney", "third party authorization", "caller not on account"
        "third party caller not account holder authorization calling on behalf "
        "authorized contact someone else calling power of attorney "
        "third party authorization caller not on account can someone else call "
        "authorized third party access",
        "1. Check the Authorized Contacts section in the CRM.\n"
        "2. If the third party is listed as authorized: apply standard 2-factor verification using their name and the account holder's details.\n"
        "3. If not listed: do not provide account access. Say: 'For the account holder's security, I can only discuss this account with authorized contacts. The account holder can add you as an authorized contact by contacting us directly.'\n"
        "4. Never allow a third party to add themselves as an authorized contact — this must be done by the account holder.\n"
        "5. Log the outcome: 'Third-party caller — not listed as authorized contact. Account not accessed.'",
    ),

    (
        # Vulnerable customer — covers: "confused customer", "distressed customer",
        # "vulnerable caller", "customer cannot verify", "customer struggling",
        # "cannot remember details", "mental health call", "elderly customer"
        "vulnerable customer confused distressed cannot verify struggling "
        "cannot remember details elderly customer welfare concern "
        "customer upset cannot complete verification mental health call",
        "1. Do not repeatedly ask the same verification questions — this increases distress.\n"
        "2. Offer an alternative: 'You can also verify by visiting a branch, uploading ID through the secure portal, or emailing from your registered address.'\n"
        "3. If you have concerns about the customer's welfare, escalate to your supervisor before ending the call.\n"
        "4. Do not access the account without successful verification, even if the customer is distressed — this protects both the customer and the company.",
    ),

    # ══════════════════════════════════════════════════════════════════════
    # NETWORK / VPN / AUTHENTICATION ERRORS
    # ══════════════════════════════════════════════════════════════════════

    (
        # VPN not working — covers: "vpn not connecting", "vpn failed",
        # "cannot connect vpn", "vpn authentication failed", "cisco anyconnect",
        # "globalprotect", "fortinet vpn", "vpn error", "vpn disconnecting"
        "vpn not connecting vpn failed cannot connect vpn vpn authentication failed "
        "cisco anyconnect globalprotect fortinet vpn vpn error vpn disconnecting "
        "VPN_AUTH_FAILED PEER_AUTH_FAILED vpn credentials wrong vpn locked out "
        "remote access not working working from home no vpn",
        "1. Confirm the agent is using their latest domain password (the same one used to log into the workstation).\n"
        "2. If the password was recently changed, wait up to 5 minutes for Active Directory replication before retrying.\n"
        "3. If using MFA, confirm the authenticator app is generating the correct one-time code — check the device clock is set to automatic time.\n"
        "4. If the account is locked due to multiple failed VPN attempts, contact IT Support for manual unlock.\n"
        "5. Escalate to IT Security if VPN auth failures persist after password confirmation.",
    ),

    (
        # 2FA / MFA not working — covers: "2fa not working", "mfa code rejected",
        # "authenticator code wrong", "otp invalid", "code not accepted",
        # "google authenticator wrong", "mfa failed", "backup codes rejected"
        "2fa not working mfa code rejected authenticator code wrong otp invalid "
        "code not accepted google authenticator wrong mfa failed backup codes rejected "
        "OTP_INVALID MFA_FAILED two factor authentication not working "
        "6 digit code invalid verification code rejected time sync mfa",
        "1. Check the time on the agent's phone or authenticator device — must be set to automatic/network time.\n"
        "2. Android: Google Authenticator → Settings → Time correction for codes → Sync now.\n"
        "3. iPhone: Settings → General → Date & Time → enable 'Set Automatically.'\n"
        "4. Wait for the current code to expire and enter the next code immediately when it appears.\n"
        "5. If all codes fail after time correction, escalate to IT Security to reset the agent's MFA enrollment.\n"
        "6. Never share MFA codes with anyone — IT will never ask for a code.",
    ),

    (
        # SSL certificate error — covers: "ssl error", "certificate error",
        # "not private warning", "your connection is not private", "ssl warning",
        # "padlock red", "NET::ERR_CERT", "untrusted certificate", "https error"
        "ssl error certificate error not private your connection is not private "
        "ssl warning padlock red NET::ERR_CERT_AUTHORITY_INVALID "
        "SSL_ERROR_UNKNOWN_CA untrusted certificate https error browser warning "
        "proceed anyway certificate expired security warning",
        "1. Do NOT click 'Proceed anyway' on production CRM or internal tool sites — this is a security risk.\n"
        "2. Check the IT Status Page for certificate expiry notices.\n"
        "3. If this affects an internal tool: escalate to IT Security immediately with the site URL and error details.\n"
        "4. If this affects an external platform (Salesforce, Zendesk etc.): check their status page — certificate issues are usually resolved within hours.\n"
        "5. Never enter credentials on a site showing an SSL certificate error.",
    ),

    (
        # Active Directory / SSO multiple agents — covers: "multiple agents locked out",
        # "everyone can't login", "ad sync failed", "ldap error", "domain controller",
        # "active directory down", "ad maintenance", "sso broken for everyone"
        "active directory AD sync failed LDAP_BIND_FAILED AD_SYNC_ERROR "
        "multiple agents cannot login everyone locked out domain controller "
        "ldap error ad maintenance sso broken for everyone new accounts not recognized "
        "authentication service down identity provider down",
        "1. Check the IT Status Page for Active Directory or LDAP maintenance notices.\n"
        "2. If this affects only newly created accounts: the AD sync needs to be manually triggered — contact IT Support.\n"
        "3. If multiple existing accounts are affected: this is a domain controller issue. Escalate to IT Infrastructure immediately as a P1 incident.\n"
        "4. As a temporary workaround, use any tools with local authentication (not SSO-dependent) while the issue is being resolved.",
    ),

    (
        # Webhook / integration failure — covers: "integration not working",
        # "webhook failed", "zapier not working", "automation not triggering",
        # "data not syncing", "slack notifications not coming", "workflow not running",
        # "504 gateway timeout", "integration broken"
        "integration not working webhook failed zapier not working automation not triggering "
        "data not syncing slack notifications not coming workflow not running "
        "WEBHOOK_TIMEOUT HTTP 504 gateway timeout integration broken "
        "CRM integration failed ticket not auto-assigned data sync failed",
        "1. For agents: webhook failures do not affect your ability to work in the CRM manually — continue handling tickets normally.\n"
        "2. Check whether the automated action was critical (ticket routing) or informational (Slack notification).\n"
        "3. If ticket routing was affected (ticket not auto-assigned): manually assign the ticket to the correct queue.\n"
        "4. Report the integration failure to the CRM Admin team with the ticket number and approximate time.\n"
        "5. The CRM Admin will review integration logs and re-trigger the failed webhook if needed.",
    ),

    (
        # API 500 error — covers: "api error", "500 internal server error",
        # "api not working", "http 500", "server error", "internal error",
        # "api calls failing", "crm api 500"
        "api error 500 internal server error api not working http 500 "
        "server error internal error api calls failing crm api 500 "
        "API_500 unhandled exception server side error api broken",
        "1. Retry the operation once after 60 seconds — transient 500 errors often resolve on retry.\n"
        "2. If the error persists, check the platform's status page for active incidents.\n"
        "3. Log the error with the timestamp, the action being performed, and any error reference codes.\n"
        "4. Escalate to IT Operations if the 500 error prevents critical workflows (ticket creation, call logging).\n"
        "5. Do not submit the same request multiple times — this can create duplicate records.",
    ),

    # ══════════════════════════════════════════════════════════════════════
    # GENERAL GUIDANCE
    # ══════════════════════════════════════════════════════════════════════

    (
        # Network completely down — covers: "internet down", "no internet",
        # "network outage", "no connection", "wifi down", "ethernet not working",
        # "cannot connect to anything", "all websites down", "network failure"
        "internet down no internet network outage no connection wifi down "
        "ethernet not working cannot connect to anything all websites down "
        "network failure cannot reach any website lost all connectivity "
        "ERR_CONNECTION_REFUSED all platforms down",
        "1. Check if other websites (e.g. google.com) are reachable — if not, the network is down (not a single platform issue).\n"
        "2. Restart the network adapter: disconnect and reconnect the Ethernet cable, or toggle Wi-Fi off and on.\n"
        "3. If on VPN: disconnect and reconnect the VPN client.\n"
        "4. Contact IT Support if the network does not recover within 2 minutes.\n"
        "5. Activate the offline workflow immediately (see SOP-003) — do not wait for the network to recover before informing your supervisor.",
    ),

    (
        # HubSpot rate limit — covers: "hubspot rate limit", "hubspot 429",
        # "hubspot api limit", "hubspot slow", "hubspot workflows stopped",
        # "rate limit exceeded hubspot", "api throttled"
        "hubspot rate limit 429 RATE_LIMIT_EXCEEDED api limit hubspot slow "
        "hubspot workflows stopped api throttled hubspot api exceeded "
        "bulk import hubspot rate limit automation stopped",
        "1. For agents doing normal manual work in the HubSpot UI: this error does not affect you — continue working.\n"
        "2. Pause any bulk import or export jobs running in the background.\n"
        "3. Notify the CRM Admin — they will review active workflows and throttle the offending integration.\n"
        "4. The rate limit resets automatically within 10 seconds for most operations.",
    ),

    (
        # Microphone permission blocked in Chrome — covers: "chrome mic blocked",
        # "microphone not allowed", "browser blocked mic", "mic permission chrome",
        # "allow microphone", "microphone access denied browser", "getUserMedia failed"
        "chrome mic blocked microphone not allowed browser blocked mic "
        "mic permission chrome allow microphone microphone access denied browser "
        "getUserMedia failed media stream failed padlock microphone permission "
        "site settings microphone genesys talkdesk ringcentral mic",
        "1. Click the padlock icon in the Chrome address bar.\n"
        "2. Check that Microphone is set to 'Allow' for the telephony domain.\n"
        "3. If it shows 'Blocked': change it to 'Allow' and refresh the page.\n"
        "4. If the setting is not visible: Chrome Settings → Privacy and Security → Site Settings → Microphone → confirm the telephony site is not in the blocked list.\n"
        "5. After allowing, refresh the telephony platform and retry the audio test.\n"
        "6. If the issue persists, try a different browser profile or incognito window.",
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
    print("========================\n")
    print("Topics covered:")
    topics = [
        "CRM login failure / wrong password",
        "Account locked / too many attempts",
        "SSO / single sign-on failure",
        "No access to module or queue",
        "CRM session expiring repeatedly",
        "Record locked (concurrent edit)",
        "Zendesk 503 / CRM unavailable",
        "Freshdesk auth token expired",
        "One-way audio / agent can't hear customer",
        "Microphone not working / customer can't hear agent",
        "Call drops / disconnects",
        "Echo / background noise",
        "Agent status stuck / not receiving calls",
        "Softphone crashes or freezes",
        "WebRTC ICE connection failed",
        "Conference / 3-way call failure",
        "System downtime / CRM offline workflow",
        "Telephony down / dialer unavailable",
        "Restoring after downtime",
        "Prolonged outage / BCP",
        "Tier 2 escalation procedure",
        "Tier 3 / supervisor escalation",
        "Warm transfer",
        "Cold transfer",
        "SLA breach / ticket overdue",
        "Ticket status definitions",
        "Standard identity verification",
        "Enhanced / OTP verification",
        "Third-party caller / not account holder",
        "Vulnerable customer verification",
        "VPN not connecting / auth failed",
        "2FA / MFA code not working",
        "SSL certificate error",
        "Active Directory / LDAP failure",
        "Webhook / integration failure",
        "API 500 internal server error",
        "Internet / network completely down",
        "HubSpot rate limit exceeded",
        "Chrome microphone permission blocked",
    ]
    for i, t in enumerate(topics, 1):
        print(f"  {i:2}. {t}")


if __name__ == "__main__":
    seed()
