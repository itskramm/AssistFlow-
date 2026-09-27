# SOP: Ticket Escalation and Routing Procedures

**Document ID:** SOP-004  
**Applies To:** All call center agents  
**Purpose:** Ensure customer issues are routed to the correct team and resolved within SLA  

---

## 1. When to Escalate a Ticket

Escalate immediately if any of the following conditions are true:

- The issue has not been resolved after **two contact attempts** by a Tier 1 agent.
- The customer is threatening legal action or regulatory complaint.
- The issue involves a **data breach, unauthorized account access, or fraud**.
- The resolution requires system access or permissions beyond Tier 1 scope.
- The customer is a **VIP, enterprise, or key account** — check the account flag in the CRM.
- The customer has been waiting more than **2 business days** for a resolution.
- The issue is technically complex and requires specialist knowledge.

---

## 2. Tier 1 → Tier 2 Escalation

1. Before escalating, ensure the ticket contains:
   - Full customer details (name, account number, contact number)
   - Clear issue description (what happened, when, and what the customer expected)
   - Steps already taken by Tier 1 and their outcomes
   - Any error messages or reference numbers
2. In the CRM, change the ticket's **Priority** to "High" and **Tier** to "Tier 2."
3. Assign the ticket to the appropriate Tier 2 queue (see Routing Table below).
4. Add an internal note: "Escalated to Tier 2 — [reason]. Tier 1 agent: [your name]. Date: [date]."
5. Inform the customer: "I'm escalating this to our specialist team. You will receive a follow-up within [SLA time]." Do not give a specific agent name.
6. Do not close the ticket — leave it in "Escalated" status.

---

## 3. Tier 2 → Tier 3 / External Escalation

1. Tier 3 escalation requires **supervisor approval** — do not escalate to Tier 3 directly.
2. Notify your supervisor with the ticket number and a brief verbal summary.
3. Supervisor will review and either approve escalation or provide an alternative resolution path.
4. If approved, the supervisor will escalate to the relevant Tier 3 team or external vendor.
5. Update the ticket with: "Supervisor [name] approved Tier 3 escalation on [date/time]."

---

## 4. Ticket Routing Table

| Issue Category | Route To | Queue Name | SLA |
|---|---|---|---|
| Billing dispute under $500 | Billing Team Tier 2 | `BILL-T2` | 4 business hours |
| Billing dispute over $500 | Billing Team Tier 3 | `BILL-T3` | 1 business day |
| Technical fault — software | Tech Support Tier 2 | `TECH-T2` | 2 business hours |
| Technical fault — hardware | Field Services | `FIELD-SVC` | 1–2 business days |
| Account security / fraud | Security & Fraud Team | `SEC-FRAUD` | Immediate (P1) |
| Complaint — service quality | Customer Relations | `CUST-REL` | 4 business hours |
| Complaint — legal / regulatory | Legal & Compliance | `LEGAL` | Immediate (notify supervisor) |
| VIP / enterprise account | Dedicated Account Manager | `VIP-AM` | 1 business hour |
| Data / privacy request (GDPR) | Data Protection Officer | `DPO` | 72 hours (legal requirement) |

---

## 5. Warm Transfer vs. Cold Transfer

**Use a warm transfer** when:
- The customer is distressed, confused, or has complex context the next agent must understand.
- The issue involves sensitive information (fraud, complaint, legal).

**Warm transfer steps:**
1. Place the customer on hold.
2. Call the receiving agent/queue internally and brief them on the situation.
3. Confirm the receiving agent is ready.
4. Connect the customer and introduce them: "I have [agent name] on the line who will continue to assist you."
5. Stay on the line for 30 seconds to confirm the handoff is complete.

**Use a cold transfer** when:
- The routing is straightforward and the receiving queue has full ticket context.
- The customer has agreed to be transferred and understands the next step.

---

## 6. Ticket Status Definitions

| Status | Meaning |
|---|---|
| Open | Active, being worked on by current assignee |
| Pending Customer | Awaiting response or action from the customer |
| Escalated | Transferred to a higher tier, original agent no longer primary |
| On Hold | Blocked by a third party or system issue |
| Resolved | Issue fixed, customer confirmed or SLA expired |
| Closed | Resolved and no further action expected |

---

## 7. SLA Breach Prevention

1. Review your open ticket queue at the start and midpoint of every shift.
2. Tickets approaching SLA breach will be highlighted in **red** in the CRM queue view.
3. If a ticket is at risk of breaching SLA due to a dependency outside your control, flag it to your supervisor immediately — do not wait for the breach to occur.
4. SLA breach tickets require a mandatory comment explaining the cause of delay.
