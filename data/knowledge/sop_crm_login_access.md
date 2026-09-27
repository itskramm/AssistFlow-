# SOP: CRM System Login Failures and Access Issues

**Document ID:** SOP-001  
**Applies To:** All call center agents  
**Platforms Covered:** Salesforce, Zendesk, Freshdesk, HubSpot, ServiceNow, Zoho CRM  

---

## 1. Agent Cannot Log In — Incorrect Credentials

1. Ask the agent to confirm they are using their work email address, not a personal one.
2. Instruct the agent to click "Forgot Password" on the login page and follow the reset email.
3. If the reset email does not arrive within 5 minutes, check the spam/junk folder.
4. If the email still does not arrive, escalate to IT Support via the helpdesk portal — do not attempt manual password resets.
5. Log the incident in the ticketing system under category: **Access / Authentication**.

---

## 2. Account Locked After Multiple Failed Attempts

1. Confirm the account is locked by checking whether the login page shows "Account locked" or "Too many attempts."
2. Do not attempt further login — additional attempts may extend the lockout period.
3. Contact IT Support immediately with the agent's full name, employee ID, and the platform name.
4. IT Support will unlock the account within 15 minutes during business hours.
5. After unlocking, advise the agent to reset their password before logging in again.
6. Document the lockout event in the access log.

---

## 3. Agent Has No Access to a Required Module or Queue

1. Verify the agent's role assignment in the CRM admin panel (requires supervisor access).
2. Common cause: the agent's role profile is missing the required permission set.
3. To resolve in **Salesforce**: navigate to Setup → Users → select the user → assign the correct Permission Set.
4. To resolve in **Zendesk**: navigate to Admin → People → select the agent → change their role to the correct tier.
5. To resolve in **Freshdesk**: navigate to Admin → Agents → select the agent → assign the correct Group and Role.
6. If you do not have admin access, raise a request to the CRM Admin team with the agent's name and the specific module/queue they need access to.
7. Expected resolution time: within 1 business hour.

---

## 4. Single Sign-On (SSO) Failure

1. Confirm the agent is connected to the corporate network or VPN before attempting SSO.
2. Clear the browser cache and cookies, then retry.
3. Try an incognito/private browser window to rule out extension conflicts.
4. If SSO continues to fail, check the IT Status Page for any active SSO/identity provider outages.
5. If no outage is listed, escalate to IT Security with a screenshot of the SSO error message.
6. As a temporary workaround, direct the agent to use username/password login if the platform supports it, while the SSO issue is being resolved.

---

## 5. CRM Session Expires Repeatedly During a Shift

1. This is often caused by the browser's cookie settings or a network proxy stripping session tokens.
2. Advise the agent to check that cookies are enabled for the CRM domain in their browser settings.
3. Ensure the agent is not using a VPN split-tunnel that routes CRM traffic through a different path.
4. If the issue persists across multiple agents, escalate to IT as a potential session timeout configuration problem.
5. As a short-term workaround, advise the agent to save their work frequently and re-authenticate when prompted.

---

## Escalation Contacts

| Issue Type | Contact | SLA |
|---|---|---|
| Password reset / account unlock | IT Support Helpdesk | 15 min (business hours) |
| Role / permission change | CRM Admin Team | 1 business hour |
| SSO failure | IT Security | 30 min |
| Persistent session issues | IT Infrastructure | 2 business hours |
