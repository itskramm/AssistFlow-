# System Error Log: Network, Authentication, and Integration Errors

**Document ID:** ERR-003  
**Maintained By:** IT Operations / IT Security  
**Covers:** VPN, SSO, Active Directory, API integrations  

---

## Error: VPN Authentication Failed

**Error Code:** VPN_AUTH_FAILED / PEER_AUTH_FAILED  
**Platform:** Corporate VPN (Cisco AnyConnect, GlobalProtect, Fortinet)  
**Frequency:** Common after password changes  

**Symptoms:**
- VPN client shows "Authentication failed" or "Invalid credentials"
- Agent cannot connect to the corporate network from home or remote location
- All internal tools and CRM platforms are inaccessible

**Root Cause:** The agent's domain password was recently changed but the VPN credentials were not updated, or the account was locked due to multiple failed VPN attempts.

**Resolution Steps:**
1. Confirm the agent is using their latest domain password (the same one used to log into the workstation).
2. If the password was recently changed, wait up to 5 minutes for Active Directory replication before retrying.
3. Check if the account is locked: the agent should contact IT Support — account lockouts from VPN attempts require manual unlocking.
4. If using multi-factor authentication (MFA), confirm the MFA app is generating the correct one-time code (check the device clock is accurate).
5. Escalate to IT Security if VPN auth failures persist after password confirmation.

---

## Error: Active Directory / LDAP Sync Failure

**Error Code:** LDAP_BIND_FAILED / AD_SYNC_ERROR  
**Platform:** Internal systems using Active Directory authentication  
**Frequency:** Rare, typically during AD maintenance  

**Symptoms:**
- Multiple agents cannot log into internal tools simultaneously
- SSO redirects fail with "Unable to authenticate" error
- New accounts created recently are not recognized by the system

**Root Cause:** Active Directory domain controller is unreachable, or an LDAP sync job failed, leaving the authentication service out of sync.

**Resolution Steps:**
1. Check the IT Status Page for any Active Directory or LDAP maintenance notices.
2. If this affects only newly created accounts: the AD sync may need to be manually triggered — contact IT Support.
3. If multiple existing accounts are affected: this is a domain controller issue. Escalate to IT Infrastructure immediately as a P1 incident.
4. As a temporary workaround, use any tools that have local authentication (not SSO-dependent) while the issue is being resolved.

---

## Error: SSL Certificate Error

**Error Code:** NET::ERR_CERT_AUTHORITY_INVALID / SSL_ERROR_UNKNOWN_CA  
**Platform:** Internal web applications, CRM platforms  
**Frequency:** Annually (certificate expiry) or after network configuration changes  

**Symptoms:**
- Browser shows "Your connection is not private" warning
- Red padlock icon in the address bar
- Agent cannot proceed to the site without bypassing the warning

**Root Cause:** The SSL certificate for the site has expired, or the corporate network proxy is intercepting HTTPS traffic with an untrusted certificate.

**Resolution Steps:**
1. Do NOT click "Proceed anyway" on production CRM or internal tool sites — this is a security risk.
2. Check the IT Status Page for certificate expiry notices.
3. If this affects an internal tool: escalate to IT Security immediately with the site URL and the certificate error details.
4. If this affects an external platform (Salesforce, Zendesk): check the platform's status page — certificate issues on their end are usually resolved within hours.
5. Never enter credentials on a site showing an SSL certificate error.

---

## Error: Integration Webhook Timeout

**Error Code:** WEBHOOK_TIMEOUT / HTTP 504 Gateway Timeout  
**Platform:** CRM integrations (Zapier, custom webhooks, Salesforce Flow)  
**Frequency:** During high traffic periods  

**Symptoms:**
- Automated actions triggered by ticket updates are not executing
- Data is not syncing between integrated platforms (e.g. Salesforce → Slack notifications not arriving)
- Integration logs show timeout errors

**Root Cause:** The receiving endpoint did not respond within the webhook timeout window (typically 30 seconds). This can be caused by the receiving server being overloaded or by a slow query in the integration logic.

**Resolution Steps:**
1. For agents: webhook failures do not affect your ability to work in the CRM. Continue handling tickets normally.
2. Check whether the automated action was critical (e.g. ticket routing) or informational (e.g. a Slack notification).
3. If ticket routing was affected (ticket not auto-assigned), manually assign the ticket to the correct queue.
4. Report the integration failure to the CRM Admin team with the ticket number and approximate time.
5. The CRM Admin will review the integration logs and re-trigger the failed webhook if needed.

---

## Error: Two-Factor Authentication (2FA) Code Not Working

**Error Code:** OTP_INVALID / MFA_FAILED  
**Platform:** All systems using 2FA / MFA  
**Frequency:** Occasional  

**Symptoms:**
- Agent enters the 6-digit code from their authenticator app but receives "Invalid code"
- Code expires before the agent can enter it
- Backup codes are also rejected

**Root Cause:** The most common cause is clock drift on the device running the authenticator app. TOTP codes are time-based and require the device clock to be within 30 seconds of the server time.

**Resolution Steps:**
1. Check the time on the agent's phone or authenticator device — ensure it is set to automatic/network time.
2. On Android: open the Google Authenticator app → Settings → Time correction for codes → Sync now.
3. On iPhone: Settings → General → Date & Time → enable "Set Automatically."
4. Wait for the current code to expire and try the next code immediately when it appears.
5. If all codes fail after time correction, escalate to IT Security to reset the agent's MFA enrollment.
6. Never share MFA codes with anyone, including IT Support — IT will never ask for a code.

---

## Error: API Gateway 500 Internal Server Error

**Error Code:** HTTP 500 / Internal Server Error  
**Platform:** Internal APIs, CRM REST APIs  
**Frequency:** Rare  

**Symptoms:**
- API calls from integrations or automation tools return HTTP 500
- The CRM UI may partially load but some features fail
- Error appears in the browser network tab or integration logs

**Root Cause:** The API server encountered an unhandled exception. This is always a server-side issue — not caused by the agent or their request.

**Resolution Steps:**
1. Retry the operation once after 60 seconds — transient 500 errors often resolve on retry.
2. If the error persists, check the platform's status page for active incidents.
3. Log the error with the timestamp, the action being performed, and any error reference codes shown.
4. Escalate to IT Operations if the 500 error prevents critical workflows (ticket creation, call logging).
5. Do not attempt to work around a 500 error by submitting the same request multiple times — this can create duplicate records.
