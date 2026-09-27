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

  {
    label: 'CRM session expiring repeatedly',
    keywords: ['session expired', 'keeps logging out', 'session timeout', 'kicked out',
               'auto logout', 'session not persisting', 'crm logs out', 'invalid session',
               'INVALID_SESSION_ID', 'session keeps expiring', 'repeated logout'],
    answer:
      '1. Confirm cookies are enabled for the CRM domain in the browser settings.\n' +
      '2. Ensure the agent is not on a VPN split-tunnel that routes CRM traffic differently.\n' +
      '3. Salesforce INVALID_SESSION_ID: clear browser cache, log out fully, and log back in.\n' +
      '4. If multiple agents are affected, escalate to IT — likely a session timeout config issue.\n' +
      '5. Workaround: advise the agent to save work frequently and re-authenticate when prompted.',
  },

  {
    label: 'Record locked / cannot save (concurrent edit)',
    keywords: ['record locked', 'unable to lock row', 'UNABLE_TO_LOCK_ROW', 'cannot save',
               'concurrent edit', 'someone else editing', 'locked record', 'save failed',
               'record in use', 'changes not saving', 'locked ticket'],
    answer:
      '1. Wait 30–60 seconds and retry saving — locks are usually released quickly.\n' +
      '2. Contact the other agent via internal messaging and coordinate who completes the edit.\n' +
      '3. If the lock persists for more than 5 minutes, escalate to the CRM Admin to force-release it.\n' +
      '4. Never duplicate the record to work around the lock — this creates data inconsistencies.',
  },

  {
    label: 'Zendesk down / 503 Service Unavailable',
    keywords: ['zendesk down', 'zendesk 503', 'zendesk not loading', 'zendesk error',
               'zendesk maintenance', '503 service unavailable', 'zendesk blank page',
               'ticket queue not loading', 'zendesk not working'],
    answer:
      '1. Check status.zendesk.com for active incidents.\n' +
      '2. Wait 5 minutes and refresh — 503 errors during maintenance windows resolve automatically.\n' +
      '3. If not recovered after 10 minutes, switch to the offline interaction logging procedure.\n' +
      '4. Do not submit duplicate tickets — wait for the service to restore.\n' +
      '5. Notify your supervisor and log affected calls in the manual interaction log.',
  },

  {
    label: 'Freshdesk authentication token expired',
    keywords: ['freshdesk session', 'freshdesk expired', 'freshdesk 401', 'freshdesk logout',
               'freshdesk token', 'authentication token expired', 'freshdesk keeps logging out'],
    answer:
      '1. Log out and log back in to obtain a fresh session token — this is expected daily behaviour.\n' +
      '2. If the token expires repeatedly, check that the workstation clock is accurate — clock skew causes premature expiry.\n' +
      '3. For integration 401 errors, the API key may need refreshing by the CRM Admin.',
  },

  {
    label: 'HubSpot API rate limit exceeded',
    keywords: ['hubspot rate limit', 'hubspot 429', 'hubspot api limit', 'rate limit exceeded',
               'hubspot slow', 'hubspot workflows stopped', 'api throttled', 'hubspot api exceeded'],
    answer:
      '1. For agents doing normal manual work in HubSpot UI — this does not affect you, continue normally.\n' +
      '2. Pause any bulk import or export jobs running in the background.\n' +
      '3. Notify the CRM Admin to review active workflows and throttle the offending integration.\n' +
      '4. The rate limit resets automatically within 10 seconds for most operations.',
  },

  // ── TELEPHONY / AUDIO ────────────────────────────────────────────────────

  {
    label: 'Agent cannot hear customer (one-way audio)',
    keywords: ['cant hear customer', 'no audio', 'one way audio', 'silent call', 'no sound',
               'agent cannot hear', 'one-way audio', 'audio not working', 'customer silent',
               'headset no audio', 'media stream failed', 'genesys no audio', 'talkdesk audio'],
    answer:
      '1. Place the customer on hold.\n' +
      '2. Check the headset is firmly connected to the USB port or audio jack.\n' +
      '3. Telephony Settings → Audio Devices: confirm the correct mic and speaker are selected.\n' +
      '4. Disconnect and reconnect the headset, then check if the audio device refreshes.\n' +
      '5. If using a softphone, close and reopen the telephony application.\n' +
      '6. If still unresolved, transfer the customer to another agent and log the fault.',
  },

  {
    label: 'Customer cannot hear agent (mic not working)',
    keywords: ['customer cant hear', 'mic not working', 'microphone not working', 'muted',
               'no mic', 'mic blocked', 'microphone permission', 'getUserMedia',
               'headset muted', 'physical mute', 'customer cannot hear me'],
    answer:
      '1. Check browser microphone permissions:\n' +
      '   Chrome: Settings → Privacy and Security → Site Settings → Microphone.\n' +
      '2. Confirm the agent is not muted in the telephony platform.\n' +
      '3. Test the mic using the platform\'s built-in audio test tool.\n' +
      '4. Check the physical mute button on the headset — confirm it is not engaged.\n' +
      '5. Try a different USB port or headset.\n' +
      '6. If unresolved after 3 minutes, transfer the customer and escalate to Telephony Support.',
  },

  {
    label: 'Call drops / disconnects unexpectedly',
    keywords: ['call drops', 'call dropping', 'disconnects', 'call cut off', 'lost connection',
               'unstable calls', 'bad connection', 'call keeps cutting', 'dropped call',
               'call disconnect', 'poor connection', 'calls disconnecting'],
    answer:
      '1. Run a speed test at fast.com (minimum: 10 Mbps down / 5 Mbps up).\n' +
      '2. Switch from Wi-Fi to a wired Ethernet connection if possible.\n' +
      '3. Check the Telephony Status Page for active outages.\n' +
      '4. Check QoS dashboard for packet loss above 1% or jitter above 30ms.\n' +
      '5. Close unnecessary browser tabs and apps consuming bandwidth.\n' +
      '6. Escalate to Telephony Support with the call recording ID and timestamps.',
  },

  {
    label: 'Echo or background noise on the line',
    keywords: ['echo', 'background noise', 'noise on call', 'static', 'feedback on call',
               'reverb', 'noise suppression', 'echo cancellation', 'loud background',
               'choppy audio', 'robotic audio', 'words cutting out', 'audio degradation'],
    answer:
      '1. Enable noise-cancellation in the headset companion app.\n' +
      '2. Move to a quieter workstation.\n' +
      '3. Telephony Audio Settings: enable Noise Suppression and Echo Cancellation.\n' +
      '4. Reduce microphone sensitivity/gain in the audio settings.\n' +
      '5. If echo is on the customer\'s end, advise them to use a handset instead of speakerphone.\n' +
      '6. For choppy/robotic audio: check QoS for packet loss > 1% or jitter > 30ms.',
  },

  {
    label: 'Agent not receiving calls (status stuck)',
    keywords: ['not receiving calls', 'no calls routing', 'available no calls', 'calls not coming',
               'routing failure', 'agent stuck', 'status stuck', 'calls not assigned',
               'available but no calls', 'not getting calls', 'genesys not routing',
               'five9 not routing', 'avaya not routing'],
    answer:
      '1. Log out of the telephony platform completely (full logout — not just set to Offline).\n' +
      '2. Wait 30 seconds, then log back in.\n' +
      '3. Set status to "Available" and confirm which queues the agent is assigned to.\n' +
      '4. Verify the agent\'s telephony licence is active.\n' +
      '5. If calls still do not route after 5 minutes, contact the Telephony Admin for a routing profile refresh.\n' +
      '6. If multiple agents are affected, check for recent routing configuration changes.',
  },

  {
    label: 'Softphone crashes or freezes',
    keywords: ['softphone crash', 'softphone crashed', 'app crash', 'softphone freezes',
               'phone app closing', 'talkdesk crash', 'ringcentral crash', 'five9 crash',
               'softphone not responding', 'app closes on call', 'softphone keeps closing'],
    answer:
      '1. Note the exact time of the crash and the call ID if visible.\n' +
      '2. Reopen the softphone and call the customer back using the callback number in the CRM.\n' +
      '3. Hard-reload the softphone page: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac).\n' +
      '4. Check the telephony platform\'s status page for any reported update or incident.\n' +
      '5. Report to Telephony Support: agent name, time, browser version, OS, and call ID.\n' +
      '6. If the crash repeats, switch to the backup desk phone until resolved.',
  },

  {
    label: 'WebRTC / ICE connection failed (silent call)',
    keywords: ['webrtc', 'ice failed', 'ICE connection failed', 'ice gathering failed',
               'ice_failed', 'call connects no audio', 'silent both sides', 'webrtc error',
               'firewall webrtc', 'udp blocked', 'stun failed', 'turn failed'],
    answer:
      '1. Check if the agent is on VPN — some VPN configs block WebRTC UDP traffic. Try disabling VPN temporarily.\n' +
      '2. Switch from Wi-Fi to a wired Ethernet connection.\n' +
      '3. Run a WebRTC test at test.webrtc.org and share the results with IT Support.\n' +
      '4. If multiple agents in the same location are affected, escalate to IT Network — firewall rules may need updating (UDP ports 10000–60000).\n' +
      '5. Temporary workaround: use a desk phone instead of the softphone.',
  },

  {
    label: 'Conference / 3-way call failure',
    keywords: ['conference failed', 'three way call', '3 way call', 'conference bridge',
               'third party drops', 'conference call drop', 'bridge failure',
               'conference error', 'conference not working'],
    answer:
      '1. Inform the customer you are experiencing a technical issue and will reconnect the third party.\n' +
      '2. Attempt the conference again — most bridge failures are transient.\n' +
      '3. If it fails a second time, do a warm transfer instead: hold → call third party → brief them → connect customer.\n' +
      '4. Log the failed conference attempt in the ticket with the timestamp.\n' +
      '5. If conference failures are recurring, escalate to the Telephony Admin to check bridge capacity.',
  },

  {
    label: 'Chrome microphone permission blocked',
    keywords: ['chrome mic blocked', 'microphone not allowed', 'browser blocked mic',
               'mic permission chrome', 'allow microphone', 'microphone access denied',
               'getUserMedia failed', 'site settings microphone', 'mic permission denied'],
    answer:
      '1. Click the padlock icon in the Chrome address bar.\n' +
      '2. Check that Microphone is set to "Allow" for the telephony domain.\n' +
      '3. If blocked: change to "Allow" and refresh the page.\n' +
      '4. Or go to: Chrome Settings → Privacy and Security → Site Settings → Microphone.\n' +
      '5. After allowing, refresh the telephony platform and retry the audio test.\n' +
      '6. If still failing, try a different browser profile or incognito window.',
  },

  // ── SYSTEM DOWNTIME / OFFLINE WORKFLOW ──────────────────────────────────

  {
    label: 'System / CRM down — offline workflow',
    keywords: ['system down', 'system unavailable', 'crm down', 'crm unavailable', 'outage',
               'platform down', 'everything down', 'nothing loading', 'cannot connect',
               'connection refused', 'network down', 'all systems down', 'lost connection',
               'website unreachable', 'internet down', 'no internet'],
    answer:
      '1. Check the IT Status Page (status.internal) for active incidents.\n' +
      '2. Ask a colleague — if 2+ agents are affected, treat as a system-wide outage.\n' +
      '3. Notify your supervisor immediately via Teams / Slack / phone.\n' +
      '4. Do not spend more than 3 minutes trying to restore access before switching to offline workflow.\n' +
      '5. Open the Offline Interaction Log (shared drive: \\\\shared\\ops\\offline_log.xlsx or printed backup form).\n' +
      '6. Record for every interaction: date/time, customer name, account number, issue summary, action taken.\n' +
      '7. Once restored, enter all offline interactions into the CRM within 30 minutes — tag: "offline-entry".',
  },

  {
    label: 'Phone / dialer unavailable — backup procedure',
    keywords: ['phone down', 'dialer down', 'telephony down', 'telephony unavailable',
               'genesys down', 'avaya down', 'talkdesk down', 'ringcentral down',
               'five9 down', 'nice incontact down', 'cannot make calls', 'cannot receive calls'],
    answer:
      '1. Use the backup softphone application on the desktop (icon: "Backup Dialer").\n' +
      '2. If both dialers are unavailable, use the designated desk phone in your pod.\n' +
      '3. Tell customers: "I\'m working from a backup system — I may not have full account history."\n' +
      '4. Log all calls in the Manual Interaction Log.\n' +
      '5. Do not promise specific resolution timelines — use standard SLA wording.',
  },

  {
    label: 'Restoring normal operations after downtime',
    keywords: ['system restored', 'back online', 'after outage', 'system back up', 'crm back',
               'after downtime', 'recovery', 'post downtime', 'what to do when system comes back'],
    answer:
      '1. Wait for the official "System Restored" notification from IT Operations — do not assume it\'s back based on your own login attempt.\n' +
      '2. Log in and verify: CRM loads with your queue, telephony shows "Available", AI Assistant responds.\n' +
      '3. Enter all offline interaction logs into the CRM within 30 minutes, tagged "offline-entry".\n' +
      '4. Notify your supervisor once backlog entries are complete.\n' +
      '5. Report any data discrepancies (duplicate records, missing interactions) to the Data Team.',
  },

  {
    label: 'Prolonged outage / Business Continuity Plan (BCP)',
    keywords: ['prolonged outage', 'outage 2 hours', 'long outage', 'bcp', 'business continuity',
               'extended outage', 'still down', 'major incident', 'hours downtime', 'p1 incident'],
    answer:
      '1. Your supervisor will activate the Business Continuity Plan (BCP) — follow revised workflows from the team channel.\n' +
      '2. You may be redirected to email-only or chat-only interactions if those channels are available.\n' +
      '3. All SLA clocks are paused during a declared outage — inform customers if asked.\n' +
      '4. Update your supervisor on customer volume and escalating situations every 30 minutes.',
  },

  // ── ESCALATION / TICKET MANAGEMENT ─────────────────────────────────────

  {
    label: 'How to escalate a ticket to Tier 2',
    keywords: ['how to escalate', 'escalate ticket', 'tier 2', 'escalation', 'send to tier 2',
               'escalate case', 'escalation procedure', 'escalation steps', 'when to escalate',
               'move to specialist'],
    answer:
      '1. Ensure the ticket contains: customer details, issue description, steps already taken, and any error messages.\n' +
      '2. In the CRM, change Priority to "High" and Tier to "Tier 2".\n' +
      '3. Assign to the correct Tier 2 queue (see routing table in SOP-004).\n' +
      '4. Add an internal note: "Escalated to Tier 2 — [reason]. Tier 1 agent: [your name]. Date: [date]."\n' +
      '5. Tell the customer: "I\'m escalating this to our specialist team. You\'ll receive a follow-up within [SLA time]."\n' +
      '6. Leave the ticket in "Escalated" status — do not close it.',
  },

  {
    label: 'Tier 3 / supervisor escalation (fraud, legal, VIP)',
    keywords: ['tier 3', 'supervisor escalation', 'escalate to supervisor', 'need supervisor',
               'supervisor approval', 'external escalation', 'fraud escalation', 'legal escalation',
               'vip escalation', 'enterprise escalation', 'data breach', 'unauthorized access'],
    answer:
      '1. Tier 3 escalation requires supervisor approval — do not escalate to Tier 3 directly.\n' +
      '2. Notify your supervisor with the ticket number and a brief verbal summary.\n' +
      '3. Supervisor will review and either approve escalation or provide an alternative path.\n' +
      '4. Update the ticket: "Supervisor [name] approved Tier 3 escalation on [date/time]."\n' +
      '5. Fraud/security/data breach: route to SEC-FRAUD queue immediately as a P1.',
  },

  {
    label: 'How to do a warm transfer',
    keywords: ['warm transfer', 'warm handoff', 'transfer with introduction', 'briefed transfer',
               'how to warm transfer', 'transfer distressed customer'],
    answer:
      'Warm transfer steps:\n' +
      '1. Place the customer on hold.\n' +
      '2. Call the receiving agent internally and brief them on the situation.\n' +
      '3. Confirm the receiving agent is ready.\n' +
      '4. Connect the customer: "I have [agent name] on the line who will continue to assist you."\n' +
      '5. Stay on the line for 30 seconds to confirm the handoff is complete.',
  },

  {
    label: 'How to do a cold transfer',
    keywords: ['cold transfer', 'blind transfer', 'direct transfer', 'transfer without introduction',
               'straight transfer', 'cold handoff'],
    answer:
      'Cold transfer steps:\n' +
      '1. Confirm the customer understands they are being transferred.\n' +
      '2. Transfer directly to the correct queue — the receiving agent will have full ticket context.\n' +
      'Note: use a warm transfer instead for distressed customers or complex issues.',
  },

  {
    label: 'SLA breach / ticket overdue',
    keywords: ['sla breach', 'ticket overdue', 'sla at risk', 'red ticket', 'breach warning',
               'approaching sla', 'sla timer', 'response time exceeded', 'ticket late',
               'missing deadline', 'ticket deadline'],
    answer:
      '1. SLA-risk tickets are highlighted in red in the CRM queue view.\n' +
      '2. If a ticket is at risk due to a dependency outside your control, flag it to your supervisor immediately.\n' +
      '3. Add a mandatory comment explaining the cause of delay.\n' +
      '4. If the delay is due to a system outage, SLA clocks are paused — confirm with your supervisor.',
  },

  {
    label: 'Ticket status definitions (Open, Escalated, Resolved…)',
    keywords: ['ticket status', 'what does escalated mean', 'pending customer', 'ticket on hold',
               'closed vs resolved', 'ticket statuses', 'open status', 'ticket states', 'acw',
               'after call work', 'what is open status'],
    answer:
      'Ticket status definitions:\n' +
      '• Open — active, being worked on by the current assignee.\n' +
      '• Pending Customer — awaiting response from the customer.\n' +
      '• Escalated — transferred to a higher tier; original agent is no longer primary.\n' +
      '• On Hold — blocked by a third party or system issue.\n' +
      '• Resolved — issue fixed; customer confirmed or SLA expired.\n' +
      '• Closed — resolved with no further action expected.',
  },

  // ── IDENTITY VERIFICATION ────────────────────────────────────────────────

  {
    label: 'How to verify customer identity (standard 2FA)',
    keywords: ['verify customer', 'identity verification', 'how to verify', 'security check',
               'id check', 'verify caller', 'customer verification', 'confirm identity',
               'account verification', '2fa check', 'security questions', 'verify account'],
    answer:
      '1. Say: "For security purposes, I need to verify your identity before I can access your account."\n' +
      '2. Ask the customer to confirm at least TWO of: full name, date of birth, account number, registered email, billing postcode/ZIP, last 4 digits of payment method, security question answer.\n' +
      '3. Do not suggest which factors — let the customer provide them.\n' +
      '4. Both match → proceed. Note: "Customer verified — standard 2FA."\n' +
      '5. One fails → give one more attempt with a different factor.\n' +
      '6. Two failures → do not proceed. Say: "I\'m unable to verify your identity. Please use an alternative channel."',
  },

  {
    label: 'Enhanced verification / OTP (high-risk actions)',
    keywords: ['otp', 'one time code', 'one time password', 'send otp', 'verification code',
               'enhanced verification', 'high risk verification', 'password reset verify',
               'payment change verify', 'otp not received', 'code not arriving'],
    answer:
      '1. Complete standard 2-factor verification first.\n' +
      '2. In the CRM: Account → Security → Send Verification Code.\n' +
      '3. Tell the customer: "I\'m sending a one-time code to your registered phone/email."\n' +
      '4. Wait up to 3 minutes for the customer to receive the OTP.\n' +
      '5. Enter the code in the CRM verification field.\n' +
      '6. If the OTP does not match or expires: do not proceed — escalate to the Security Team.',
  },

  {
    label: 'Third-party caller / not the account holder',
    keywords: ['third party', 'not account holder', 'calling on behalf', 'authorized contact',
               'someone else calling', 'power of attorney', 'third party caller',
               'caller not on account', 'authorized third party'],
    answer:
      '1. Check the Authorized Contacts section in the CRM.\n' +
      '2. If listed: apply standard 2-factor verification using their name and the account holder\'s details.\n' +
      '3. If not listed: say "For security, I can only discuss this account with authorized contacts. The account holder can add you by contacting us directly."\n' +
      '4. Never allow a third party to add themselves as an authorized contact.',
  },

  {
    label: 'Vulnerable or distressed customer cannot verify',
    keywords: ['vulnerable customer', 'confused customer', 'distressed customer', 'cannot verify',
               'customer struggling', 'cannot remember', 'elderly customer', 'welfare concern',
               'customer upset'],
    answer:
      '1. Do not repeatedly ask the same verification questions — this increases distress.\n' +
      '2. Offer an alternative: "You can also verify by visiting a branch, uploading ID through the secure portal, or emailing from your registered address."\n' +
      '3. If you have welfare concerns, escalate to your supervisor before ending the call.\n' +
      '4. Do not access the account without successful verification, even if the customer is distressed.',
  },

  // ── NETWORK / VPN / AUTH ERRORS ─────────────────────────────────────────

  {
    label: 'VPN not connecting / authentication failed',
    keywords: ['vpn', 'vpn not connecting', 'vpn failed', 'vpn error', 'vpn authentication',
               'cisco anyconnect', 'globalprotect', 'fortinet vpn', 'vpn disconnecting',
               'vpn credentials', 'remote access', 'working from home vpn'],
    answer:
      '1. Confirm the agent is using their latest domain password (same as workstation login).\n' +
      '2. If the password was recently changed, wait up to 5 minutes for Active Directory replication before retrying.\n' +
      '3. Check the MFA app is generating the correct code and the device clock is set to automatic time.\n' +
      '4. If the account is locked due to multiple failed VPN attempts, contact IT Support for a manual unlock.\n' +
      '5. Escalate to IT Security if VPN auth failures persist.',
  },

  {
    label: '2FA / MFA code not working',
    keywords: ['2fa', 'mfa', 'two factor', 'authenticator', 'mfa code', '2fa not working',
               'mfa failed', 'code rejected', 'otp invalid', 'google authenticator wrong',
               'backup codes', 'code not accepted', 'authenticator code wrong', 'mfa reset'],
    answer:
      '1. Check the time on the agent\'s authenticator device — must be set to automatic/network time.\n' +
      '2. Android: Google Authenticator → Settings → Time correction for codes → Sync now.\n' +
      '3. iPhone: Settings → General → Date & Time → enable "Set Automatically."\n' +
      '4. Wait for the current code to expire, then enter the next one immediately.\n' +
      '5. If all codes still fail, escalate to IT Security to reset the agent\'s MFA enrollment.\n' +
      '6. Never share MFA codes with anyone — IT will never ask for a code.',
  },

  {
    label: 'SSL certificate error in browser',
    keywords: ['ssl error', 'certificate error', 'not private', 'connection not private',
               'ssl warning', 'padlock red', 'ERR_CERT', 'untrusted certificate',
               'https error', 'browser warning', 'certificate expired', 'proceed anyway'],
    answer:
      '1. Do NOT click "Proceed anyway" on production CRM or internal tool sites — this is a security risk.\n' +
      '2. Check the IT Status Page for certificate expiry notices.\n' +
      '3. Internal tool: escalate to IT Security immediately with the site URL and error details.\n' +
      '4. External platform (Salesforce, Zendesk etc.): check their status page — usually resolved within hours.\n' +
      '5. Never enter credentials on a site showing an SSL certificate error.',
  },

  {
    label: 'Active Directory / LDAP sync failure (multiple agents affected)',
    keywords: ['active directory', 'ad sync', 'ldap', 'domain controller', 'LDAP_BIND_FAILED',
               'AD_SYNC_ERROR', 'multiple agents locked', 'everyone cant login',
               'new accounts not working', 'sso broken for everyone', 'authentication service down'],
    answer:
      '1. Check the IT Status Page for Active Directory or LDAP maintenance notices.\n' +
      '2. Newly created accounts only: the AD sync may need to be manually triggered — contact IT Support.\n' +
      '3. Multiple existing accounts affected: domain controller issue — escalate to IT Infrastructure as a P1 immediately.\n' +
      '4. Workaround: use any tools with local authentication (not SSO-dependent) while the issue is resolved.',
  },

  {
    label: 'Webhook / integration not triggering',
    keywords: ['webhook', 'integration', 'zapier', 'automation', 'data not syncing',
               'slack notifications', 'workflow not running', '504 gateway timeout',
               'integration broken', 'ticket not auto assigned', 'webhook failed'],
    answer:
      '1. For agents doing normal manual work in the CRM — webhook failures do not affect you, continue normally.\n' +
      '2. If ticket routing was affected (ticket not auto-assigned): manually assign the ticket to the correct queue.\n' +
      '3. Report the failure to the CRM Admin with the ticket number and approximate time.\n' +
      '4. The CRM Admin will review integration logs and re-trigger the failed webhook.',
  },

  {
    label: 'API 500 Internal Server Error',
    keywords: ['api 500', 'internal server error', 'http 500', 'server error', 'api not working',
               'api calls failing', 'crm api error', '500 error', 'unhandled exception'],
    answer:
      '1. Retry the operation once after 60 seconds — transient 500 errors often resolve on retry.\n' +
      '2. If the error persists, check the platform\'s status page for active incidents.\n' +
      '3. Log the error with the timestamp, action being performed, and any error reference codes.\n' +
      '4. Escalate to IT Operations if the 500 error blocks critical workflows.\n' +
      '5. Do not submit the same request multiple times — this can create duplicate records.',
  },

  {
    label: 'Internet / network completely down',
    keywords: ['network down', 'no internet', 'internet down', 'all websites down',
               'cannot connect to anything', 'network failure', 'lost all connectivity',
               'ERR_CONNECTION_REFUSED', 'all platforms down', 'network outage'],
    answer:
      '1. Check if other websites (e.g. google.com) are reachable — if not, this is a network issue, not a single platform issue.\n' +
      '2. Restart the network adapter: disconnect and reconnect the Ethernet cable, or toggle Wi-Fi off and on.\n' +
      '3. If on VPN: disconnect and reconnect the VPN client.\n' +
      '4. Contact IT Support if the network does not recover within 2 minutes.\n' +
      '5. Activate the offline workflow immediately — do not wait before informing your supervisor.',
  },

];

/**
 * Search the FAQ for the best match to a query string.
 * Returns { answer, label, matched } or { answer: null, matched: false }.
 */
export function searchFaq(query) {
  if (!query) return { answer: null, matched: false };
  const q = query.toLowerCase();

  let bestScore = 0;
  let bestEntry = null;

  for (const entry of FAQ) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw.toLowerCase())) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  return bestScore >= 1
    ? { answer: bestEntry.answer, label: bestEntry.label, matched: true }
    : { answer: null, matched: false };
}

/**
 * Returns all FAQ topic labels for display in the "no match" fallback UI.
 * Groups them by section for readability.
 */
export function getTopicList() {
  return FAQ.map((e) => e.label);
}
