// Offline FAQ used by the native side panel and webpage launcher.

const FAQ = [
  {
    label: 'CRM login failure / wrong password',
    query: 'CRM login failure wrong password',
    keywords: ['login', 'log in', 'password', 'credentials', 'crm', 'sign in'],
    answer: [
      '1. Confirm the agent is using their work email.',
      '2. Click "Forgot Password" and follow the reset email.',
      '3. Check spam or junk if the email does not arrive within 5 minutes.',
      '4. Escalate to IT Support with the agent name and employee ID.'
    ].join('\n')
  },
  {
    label: 'Account locked / too many login attempts',
    query: 'Account locked after too many login attempts',
    keywords: ['locked', 'lockout', 'too many attempts', 'suspended', 'failed attempts'],
    answer: [
      '1. Do not attempt further logins because this can extend the lockout.',
      '2. Contact IT Support with the full name, employee ID, and platform.',
      '3. After unlocking, advise the agent to reset their password.'
    ].join('\n')
  },
  {
    label: 'SSO / Single Sign-On failure',
    query: 'SSO single sign-on failure',
    keywords: ['sso', 'single sign on', 'saml', 'oauth', 'identity provider', 'idp'],
    answer: [
      '1. Confirm the agent is connected to the corporate VPN.',
      '2. Clear browser cache and cookies, then retry.',
      '3. Try an incognito or private browser window.',
      '4. If the issue continues, escalate with a screenshot of the error.'
    ].join('\n')
  },
  {
    label: 'No access to a module or queue',
    query: 'No access to a module or queue permission denied',
    keywords: ['no access', 'permission denied', 'missing permission', 'queue', '403', 'module'],
    answer: [
      '1. Verify the agent role assignment in the CRM admin panel.',
      '2. Assign the correct permission set, group, or role.',
      '3. If you do not have admin access, raise a request to the CRM Admin.',
      '4. Include the agent name and the module or queue required.'
    ].join('\n')
  },
  {
    label: 'Call quality / headset issues',
    query: 'Call quality issues on my headset',
    keywords: ['call quality', 'headset', 'audio', 'microphone', 'mic', 'echo'],
    answer: [
      '1. Confirm the headset is selected as the input and output device.',
      '2. Disconnect and reconnect the headset, then restart the calling app.',
      '3. Test another USB port or headset if available.',
      '4. Escalate with the call time, agent, and error symptoms if unresolved.'
    ].join('\n')
  },
  {
    label: 'Ticket escalation procedure',
    query: 'How do I escalate a ticket?',
    keywords: ['escalate', 'escalation', 'ticket', 'priority', 'urgent'],
    answer: [
      '1. Confirm the issue, impact, affected user, and troubleshooting already completed.',
      '2. Update the ticket with clear reproduction steps and evidence.',
      '3. Assign the correct priority and escalation queue.',
      '4. Notify the receiving team and record the handoff time.'
    ].join('\n')
  },
  {
    label: 'Customer identity verification',
    query: 'Customer identity verification steps',
    keywords: ['identity verification', 'verify identity', 'customer verification', 'security question'],
    answer: [
      '1. Ask the approved verification questions from the current SOP.',
      '2. Never disclose account details before verification is complete.',
      '3. Record the verification outcome in the ticket or CRM.',
      '4. Escalate suspected fraud through the security process.'
    ].join('\n')
  },
  {
    label: 'VPN disconnected / reconnecting',
    query: 'VPN disconnected how do I reconnect?',
    keywords: ['vpn', 'disconnected', 'reconnect', 'network tunnel'],
    answer: [
      '1. Check that the device has an active internet connection.',
      '2. Open the VPN client and reconnect to the nearest approved gateway.',
      '3. Restart the VPN client if the connection does not establish.',
      '4. Escalate with the gateway name and displayed error code.'
    ].join('\n')
  }
];

function searchFaq(query) {
  const normalized = query.toLowerCase();
  let bestScore = 0;
  let bestAnswer = '';

  for (const entry of FAQ) {
    const score = entry.keywords.reduce(
      (total, keyword) => total + (normalized.includes(keyword) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestAnswer = entry.answer;
    }
  }

  return { answer: bestAnswer, matched: bestScore > 0 };
}
