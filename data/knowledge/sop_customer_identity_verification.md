# SOP: Customer Identity Verification Procedure

**Document ID:** SOP-005  
**Applies To:** All call center agents  
**Purpose:** Verify customer identity before accessing or modifying account information, in compliance with data protection regulations  

---

## 1. When Verification Is Required

Identity verification is mandatory before any of the following actions:

- Accessing account details, balances, or personal information
- Processing any account change (address, payment method, contact details)
- Resetting passwords or security questions
- Discussing billing, charges, or disputes
- Processing refunds, cancellations, or order modifications
- Any action on a third party's behalf

---

## 2. Standard Verification (Phone / Voice Channel)

Ask the customer to confirm **at least two** of the following, matching what is on file in the CRM:

1. Full name (first and last)
2. Date of birth
3. Account number or reference number
4. Registered email address
5. Billing postcode / ZIP code
6. Last 4 digits of the payment method on file
7. Answer to the security question set on the account

**Steps:**
1. Greet the customer and explain: "For security purposes, I need to verify your identity before I can access your account."
2. Ask for two verification factors. Do not suggest which ones — let the customer provide them.
3. If both factors match: proceed with the interaction. Note in the ticket: "Customer verified — standard 2FA."
4. If one factor fails: give the customer one more attempt with a different factor.
5. If verification fails twice: do not proceed. Say: "I'm unable to verify your identity at this time. For your security, I cannot access the account. Please visit [nearest branch / website / email us] to verify your identity in person or through a secure channel."
6. Log the failed verification attempt in the CRM under the account (do not create a new record).

---

## 3. Enhanced Verification (High-Risk Actions)

Required for: password resets, payment method changes, fraud investigations, large transactions.

In addition to the standard 2-factor check, also verify:

- A one-time passcode (OTP) sent to the registered mobile number or email — agent initiates this from the CRM.
- If OTP delivery fails, escalate to the Security Team — do not attempt to bypass.

**Steps:**
1. Complete standard verification first.
2. In the CRM, navigate to **Account → Security → Send Verification Code.**
3. Inform the customer: "I'm sending a one-time code to your registered [phone/email]. Please share it with me when you receive it."
4. Wait up to 3 minutes for the customer to receive the OTP.
5. Enter the code in the CRM verification field — the system will confirm if it matches.
6. If the OTP matches: proceed with the high-risk action.
7. If the OTP does not match or expires: do not proceed. Escalate to the Security Team.

---

## 4. Third-Party Callers (Calling on Behalf of Account Holder)

1. A third party may only access an account if they are a named, pre-authorized contact on the account.
2. Verify this by checking the **Authorized Contacts** section in the CRM.
3. Apply the same 2-factor verification process using the third party's own name and the account holder's details.
4. If the third party is not listed as authorized: do not provide account access. Say: "For the account holder's security, I can only discuss this account with authorized contacts. The account holder can add you as an authorized contact by contacting us directly."
5. Never allow a third party to add themselves as an authorized contact — this must be done by the account holder.

---

## 5. Vulnerable Customers

1. If a customer appears confused, distressed, or unable to complete verification, do not repeatedly ask the same questions.
2. Offer an alternative verification channel: "I understand this may be difficult. You can also verify your identity by [visiting a branch / uploading ID through the secure portal / emailing from your registered address]."
3. If you have concerns about the customer's welfare, escalate to your supervisor before ending the call.
4. Do not access the account without successful verification, even if the customer is distressed — this protects both the customer and the company.

---

## 6. Verification Failure — What Not To Do

- Do not reveal which verification factor failed — say only "I wasn't able to verify your identity."
- Do not access the account partially (e.g. confirming the name but not the other factor).
- Do not accept verification via unofficial channels (WhatsApp, personal email).
- Do not allow colleagues to verify on behalf of a customer over your shoulder.
- Do not document the customer's verification answers verbatim in the ticket notes.

---

## 7. Logging Verification Outcomes

After every call where verification was required, add a CRM note:

| Outcome | Note to Log |
|---|---|
| Verified | "Identity verified — standard 2FA passed." |
| Enhanced verified | "Identity verified — standard 2FA + OTP passed." |
| Third-party verified | "Third-party [name] verified — listed as authorized contact." |
| Verification failed | "Verification failed after [number] attempts. Account not accessed. Customer advised to use alternative channel." |
| Escalated | "Verification escalated to Security Team — [reason]." |
