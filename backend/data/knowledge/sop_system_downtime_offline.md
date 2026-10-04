# SOP: System Downtime and Offline Workflow Procedures

**Document ID:** SOP-003  
**Applies To:** All call center agents and team supervisors  
**Trigger:** Any CRM, telephony, or core system becomes unavailable  

---

## 1. Confirming a System Outage (Before Declaring Downtime)

1. Check the internal IT Status Page (bookmark: status.internal / pinned in the team channel) for any active incident notices.
2. Ask at least one colleague whether they are experiencing the same issue — if the problem is isolated to one workstation, follow individual troubleshooting steps first.
3. If two or more agents are affected simultaneously, treat it as a system-wide outage.
4. Notify your team supervisor immediately via the designated communication channel (Teams / Slack / phone).
5. Do not spend more than 3 minutes attempting to restore access before switching to the offline workflow.

---

## 2. CRM Unavailable — Manual Interaction Logging

1. Open the **Offline Interaction Log** spreadsheet stored on the shared network drive (path: `\\shared\ops\offline_log.xlsx`) or the printed backup form at each workstation.
2. Record the following for every customer interaction during downtime:
   - Date and time
   - Customer full name
   - Customer account number or phone number
   - Issue summary (3–5 words)
   - Action taken
   - Follow-up required (Yes / No)
3. Keep the completed offline log secure — do not leave it unattended.
4. Once the CRM is restored, enter all offline interactions into the system within **30 minutes** of restoration, marked with the tag: `offline-entry`.

---

## 3. Telephony / Dialer Unavailable — Call Handling Procedure

1. If the telephony platform is down but internet is available, use the backup softphone application installed on each workstation (icon: "Backup Dialer" on the desktop).
2. If both the primary and backup dialer are unavailable, use a designated desk phone (one per pod — check with your supervisor for the extension).
3. Inform customers at the start of the call: "I'm currently working from a backup system — I may not have access to your full account history, but I will assist you and update your records once our systems are restored."
4. Log all calls using the Manual Interaction Log (see Section 2).
5. Do not promise customers specific resolution timelines during downtime — use: "We will follow up within [standard SLA] once our systems are fully restored."

---

## 4. Knowledge Base / AI Assistant Unavailable

1. Refer to the **Printed Quick Reference Cards** available in each team pod. These cover the top 20 most common issue types.
2. Contact your team supervisor or a senior agent for guidance on complex issues.
3. For escalations that normally require system lookup, collect the customer's details and promise a callback within 4 business hours.
4. Do not attempt to resolve issues that require real-time system access (e.g. account balance changes, order cancellations) — schedule a callback instead.

---

## 5. Restoring Normal Operations After Downtime

1. Wait for the official "System Restored" notification from IT Operations via the team channel — do not assume the system is back based on your own login attempt alone.
2. Once confirmed, log in and verify your workstation is functioning correctly:
   - CRM loads and shows your queue
   - Telephony platform shows "Available"
   - AI Assistant responds to a test query
3. Enter all offline interaction logs into the CRM within 30 minutes (tag: `offline-entry`).
4. Notify your supervisor once your backlog entries are complete.
5. If you encounter any data discrepancies after restoration (e.g. duplicate records, missing interactions), report to the Data Team immediately — do not attempt to fix records yourself.

---

## 6. Prolonged Outage (More Than 2 Hours)

1. The supervisor will activate the **Business Continuity Plan (BCP)** and communicate revised workflows via the team channel.
2. Agents may be redirected to handle email-only or chat-only interactions if those channels remain available.
3. All SLA clocks are paused during a declared outage — inform customers of this if asked.
4. Keep your supervisor updated on customer volume and any escalating situations every 30 minutes.

---

## Escalation Contacts During Downtime

| System | First Contact | Backup Contact |
|---|---|---|
| CRM (Salesforce / Zendesk / etc.) | CRM Admin Team | IT Operations |
| Telephony (Genesys / Avaya / etc.) | Telephony Support | IT Operations |
| Network / Internet | IT Helpdesk | IT Operations (P1 line) |
| AI Assistant / Backend | IT Operations | Team Supervisor |
