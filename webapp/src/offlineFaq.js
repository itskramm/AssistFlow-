/**
 * offlineFaq.js — Local FAQ for offline mode
 *
 * When the backend is unreachable, searchFaq() is called directly in the
 * browser — no network request at all. Each entry has a `keywords` array
 * (matched against the agent's query), a `label` for display, and an `answer`.
 *
 * Scoring: count how many keywords appear in the lowercased query.
 * Returns the highest-scoring answer, or null if nothing matches.
 */

const FAQ = [

  // ── CRM / LOGIN ──────────────────────────────────────────────────────────

  {
    label: 'CRM login failure / wrong password',
    keywords: ['login', 'log in', 'cannot login', 'cant log in', 'password', 'credentials',
               'crm login', 'salesforce login', 'zendesk login', 'freshdesk login',
               'hubspot login', 'servicenow login', 'zoho login', 'wrong password',
               'forgot password', 'access denied', 'login not working', 'sign in'],
    answer:
      '1. Confirm the agent is using their work email, not a personal one.\n' +
      '2. Click "Forgot Password" on the login page and follow the reset email.\n' +
      '3. Check spam/junk if the email does not arrive within 5 minutes.\n' +
      '4. If still no email, escalate to IT Support with the agent\'s name and employee ID.\n' +
      '5. Log the incident under category: Access / Authentication.',
  },

  {
    label: 'Account locked / too many login attempts',
    keywords: ['locked', 'lock out', 'locked out', 'too many attempts', 'account locked',
               'login blocked', 'account suspended', 'failed attempts', 'many wrong passwords'],
    answer:
      '1. Do NOT attempt further logins — this extends the lockout period.\n' +
      '2. Contact IT Support with: agent\'s full name, employee ID, and platform name.\n' +
      '3. IT Support will unlock the account within 15 minutes during business hours.\n' +
      '4. After unlocking, advise the agent to reset their password before logging in.',
  },

  {
    label: 'SSO / Single Sign-On failure',
    keywords: ['sso', 'single sign on', 'single sign-on', 'saml', 'oauth', 'sso failed',
               'sso error', 'sso not working', 'identity provider', 'idp', 'sso broken',
               'cannot authenticate', 'sso redirect', 'federation error'],
    answer:
      '1. Confirm the agent is connected to the corporate VPN.\n' +
      '2. Clear browser cache and cookies, then retry.\n' +
      '3. Try an incognito/private browser window.\n' +
      '4. Check the IT Status Page for active SSO / identity provider outages.\n' +
      '5. If no outage, escalate to IT Security with a screenshot of the SSO error.\n' +
      '6. Workaround: use username/password login if the platform supports it.',
  },

  {
    label: 'No access to module or queue (permission denied)',
    keywords: ['no access', 'permission denied', 'missing permission', 'cant see queue',
               'no queue access', 'access not granted', 'permission set', 'role wrong',
               '403 forbidden', 'missing module', 'cant see cases', 'cant see tickets',
               'access removed', 'module not visible'],
    answer:
      '1. Verify the agent\'s role assignment in the CRM admin panel.\n' +
      '2. Salesforce: Setup → Users → select user → assign the correct Permission Set.\n' +
      '3. Zendesk: Admin → People → select agent → change role to the correct tier.\n' +
      '4. Freshdesk: Admin → Agents → select agent → assign correct Group and Role.\n' +
      '5. If no admin access, raise a request to the CRM Admin with the agent\'s name and module needed.\n' +
      '6. Expected resolution: within 1 business hour.',
  },

  // ... Add more FAQ entries as needed from the extension version
];

const QUICK_RESPONSES = [
  {
    matches: /^(hi|hello|hey|hiya|good morning|good afternoon|good evening)( there| assistant| smartops)?$/,
    answer:
      'Hello! I can help with CRM access, telephony and call quality, ticket escalation, ' +
      'customer verification, system outages, and related workplace support issues. ' +
      'Tell me what is happening and include the platform or error message if you have it.',
  },
  {
    matches: /^(faq|faqs|help|help me|what can you help( me)? with|what do you do|what topics do you support)$/,
    answer:
      '1. CRM login, passwords, permissions, and session problems.\n' +
      '2. Telephony, headset, microphone, call quality, and call routing issues.\n' +
      '3. Ticket escalation, SLA, status, and transfer procedures.\n' +
      '4. Customer identity and enhanced verification procedures.\n' +
      '5. System downtime, outages, recovery, and offline workflows.\n' +
      'Ask a specific question to get step-by-step guidance.',
  },
];

/**
 * Search the FAQ for a matching entry.
 * Returns { answer: string, matched: boolean }
 */
export function searchFaq(query) {
  const q = query.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
  const quickResponse = QUICK_RESPONSES.find(entry => entry.matches.test(q));
  if (quickResponse) {
    return { answer: quickResponse.answer, matched: true };
  }

  let bestScore = 0;
  let bestAnswer = null;

  for (const entry of FAQ) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw.toLowerCase())) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestAnswer = entry.answer;
    }
  }

  if (bestScore >= 1) {
    return { answer: bestAnswer, matched: true };
  }
  return { answer: '', matched: false };
}

/**
 * Get a list of all FAQ topic labels (for display when no match).
 */
export function getTopicList() {
  return FAQ.map(entry => entry.label);
}
