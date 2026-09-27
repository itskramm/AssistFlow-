# System Error Log: CRM Platforms

**Document ID:** ERR-001  
**Maintained By:** IT Operations  
**Covers:** Salesforce, Zendesk, Freshdesk, HubSpot, ServiceNow  

---

## Error: INVALID_SESSION_ID — Salesforce

**Error Code:** INVALID_SESSION_ID  
**Platform:** Salesforce / Salesforce Lightning  
**Frequency:** Intermittent  
**First Logged:** Recurring known issue  

**Symptoms:**
- Agent receives "INVALID_SESSION_ID" in the browser console or on screen
- Page reloads to the Salesforce login screen mid-session
- CRM data stops loading and spinner appears indefinitely

**Root Cause:** Salesforce session token expired or was invalidated by the server. Common triggers include idle timeout (default: 2 hours), concurrent logins from another device, or a Salesforce platform update rolling out mid-session.

**Resolution Steps:**
1. Clear browser cache and cookies for the Salesforce domain.
2. Log out completely and log back in.
3. If using SSO, ensure the VPN connection is active before re-authenticating.
4. If the error persists for multiple agents simultaneously, check the Salesforce Trust Status page (trust.salesforce.com) for active incidents.
5. Escalate to the CRM Admin team if the issue is isolated to one agent after steps 1–3.

---

## Error: 503 Service Unavailable — Zendesk

**Error Code:** HTTP 503  
**Platform:** Zendesk  
**Frequency:** Occasional during peak hours  

**Symptoms:**
- Zendesk returns a blank page or "Service Unavailable" message
- Ticket queue fails to load
- Agent cannot submit ticket updates

**Root Cause:** Zendesk API or web application is overloaded or undergoing maintenance. This is typically a platform-side issue, not a local network issue.

**Resolution Steps:**
1. Check the Zendesk System Status page (status.zendesk.com) for active incidents.
2. Wait 5 minutes and refresh the page — 503 errors during maintenance windows resolve automatically.
3. If the page does not recover after 10 minutes, switch to the offline interaction logging procedure (see SOP-003).
4. Do not attempt to submit duplicate tickets — wait for the service to restore.
5. Notify your supervisor and log affected calls in the manual interaction log.

---

## Error: Authentication Token Expired — Freshdesk

**Error Code:** authentication_token_expired  
**Platform:** Freshdesk  
**Frequency:** Daily (session-based)  

**Symptoms:**
- Agent is redirected to the Freshdesk login page unexpectedly
- API calls from integrations return 401 Unauthorized
- Browser shows "Your session has expired" toast notification

**Root Cause:** Freshdesk authentication tokens expire after a fixed period (typically 8 hours). This is expected behavior, not a system fault.

**Resolution Steps:**
1. Log out and log back in to obtain a new session token.
2. If the token expires repeatedly within a short period, check that the system clock on the workstation is accurate — clock skew can cause premature token expiry.
3. For integration-related 401 errors, the API key may need to be refreshed in the integration settings by the CRM Admin.

---

## Error: Record Locked — Salesforce / ServiceNow

**Error Code:** UNABLE_TO_LOCK_ROW (Salesforce) / Record Locked (ServiceNow)  
**Platform:** Salesforce, ServiceNow  
**Frequency:** Occasional during concurrent edits  

**Symptoms:**
- "Unable to lock row" error when attempting to save a record
- Another agent is editing the same ticket or case simultaneously
- Changes cannot be saved until the lock is released

**Root Cause:** Two agents are editing the same record at the same time. The CRM places a lock on the record while one agent is editing it.

**Resolution Steps:**
1. Wait 30–60 seconds and retry saving — the lock is usually released quickly.
2. Contact the other agent via the internal messaging tool and coordinate who should complete the edit.
3. If the lock persists for more than 5 minutes with no active editor, escalate to the CRM Admin to force-release the lock.
4. Never attempt to duplicate the record to work around the lock — this creates data inconsistencies.

---

## Error: API Rate Limit Exceeded — HubSpot

**Error Code:** RATE_LIMIT_EXCEEDED / HTTP 429  
**Platform:** HubSpot  
**Frequency:** Rare, typically during bulk operations  

**Symptoms:**
- HubSpot API returns HTTP 429 responses
- Automated workflows or integrations stop processing
- Dashboard widgets fail to update

**Root Cause:** The HubSpot API rate limit has been reached. Free/Starter tiers allow 100 API calls per 10 seconds. This is usually triggered by bulk data imports or runaway automation workflows.

**Resolution Steps:**
1. For agents: this error does not affect normal manual ticket and contact operations in the HubSpot UI. Continue working normally.
2. For integrations: pause any bulk import or export jobs running in the background.
3. Notify the CRM Admin — they will review active workflows and throttle the offending integration.
4. The rate limit resets automatically within 10 seconds for most operations.

---

## Error: Cannot Connect to Server — Generic CRM

**Error Code:** ERR_CONNECTION_REFUSED / Network Error  
**Platform:** All CRM platforms  
**Frequency:** During network outages  

**Symptoms:**
- Browser shows "Cannot connect to server" or "ERR_CONNECTION_REFUSED"
- All CRM platforms are unreachable simultaneously
- Internal tools and communication platforms are also affected

**Root Cause:** Local network or internet connectivity failure. If all platforms are affected at once, the issue is network-side, not platform-side.

**Resolution Steps:**
1. Check if other websites (e.g. google.com) are reachable — if not, the network is down.
2. Restart the network adapter: disconnect and reconnect the Ethernet cable, or toggle Wi-Fi off and on.
3. If on VPN, disconnect and reconnect the VPN client.
4. Contact IT Support if the network does not recover within 2 minutes.
5. Activate the offline workflow immediately (see SOP-003) — do not wait for the network to recover before informing your supervisor.
