// debug.js — AssistFlow Debug Panel Logic
// External script to satisfy Chrome MV3 CSP (no inline scripts allowed).

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────
const BACKEND          = 'http://127.0.0.1:8000';
const MODEL_GENERATION = 'gemini-3.8-flash';
const MODEL_EMBEDDING  = 'gemini-embedding-001';
const CRM_DOMAINS = [
  'salesforce.com','lightning.force.com','zendesk.com','freshdesk.com',
  'freshworks.com','genesyscloud.com','mypurecloud.com','avayacloud.com',
  'ringcentral.com','talkdesk.com','niceincontact.com','five9.com',
  'hubspot.com','servicenow.com','intercom.com','helpscout.com',
  'kustomer.com','zohocrm.com','zoho.com',
];

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────
const ts = () => new Date().toTimeString().slice(0, 8);

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;');
}

function log(id, type, msg) {
  const el = document.getElementById('log-' + id);
  if (!el) return;
  if (el.querySelector('.log-info')?.textContent?.includes('Waiting')) el.innerHTML = '';
  const line = document.createElement('div');
  line.className = 'log-entry';
  line.innerHTML = `<span class="log-time">${ts()}</span><span class="log-${type}">${escHtml(msg)}</span>`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function logJSON(id, obj) {
  const el = document.getElementById('log-' + id);
  if (!el) return;
  const line = document.createElement('div');
  line.className = 'log-entry';
  line.innerHTML = `<span class="log-time">${ts()}</span><span class="log-data">${escHtml(JSON.stringify(obj, null, 2))}</span>`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function setDot(id, state) {
  const el = document.getElementById('dot-' + id);
  if (el) el.className = 'dot ' + (state || '');
}

function badge(cls, text) {
  return `<span class="badge ${cls}">${escHtml(text)}</span>`;
}

function sourceBadge(source) {
  if (source === 'rag')           return badge('badge-rag',     '● RAG');
  if (source === 'offline-cache') return badge('badge-offline', '● Offline cache');
  if (source === 'fallback')      return badge('badge-fallbk',  '● Fallback');
  return badge('badge-idle', source);
}

function isExt() {
  return typeof chrome !== 'undefined' && !!chrome?.runtime?.id;
}

// ─────────────────────────────────────────────────────────────
// 1. Extension Runtime
// ─────────────────────────────────────────────────────────────
function checkRuntime() {
  if (!isExt()) {
    log('runtime', 'error', '✗ chrome.runtime not available — open via chrome-extension:// URL');
    setDot('runtime', 'error');
    return;
  }
  const m = chrome.runtime.getManifest();
  log('runtime', 'ok',   '✓ chrome.runtime available');
  log('runtime', 'info', `  ID: ${chrome.runtime.id}`);
  log('runtime', 'info', `  Name: ${m.name} v${m.version}`);
  log('runtime', 'info', `  Manifest v${m.manifest_version}`);
  log('runtime', 'info', `  Permissions: ${m.permissions?.join(', ')}`);
  setDot('runtime', 'ok');
}

function pingBackground() {
  if (!isExt()) { log('runtime', 'error', '✗ Not in extension context'); return; }
  chrome.runtime.sendMessage({ type: 'ping' }, (res) => {
    if (chrome.runtime.lastError) {
      log('runtime', 'error', `✗ SW ping failed: ${chrome.runtime.lastError.message}`);
      setDot('runtime', 'error');
      return;
    }
    log('runtime', res?.ok ? 'ok' : 'warn',
      res?.ok ? `✓ Background SW alive — ${res.service}` : `⚠ Unexpected: ${JSON.stringify(res)}`);
    setDot('runtime', res?.ok ? 'ok' : 'warn');
  });
}

// ─────────────────────────────────────────────────────────────
// 2. Backend Health
// ─────────────────────────────────────────────────────────────
async function checkHealth() {
  const statusEl = document.getElementById('env-status');
  const modelEl  = document.getElementById('model-info');
  log('health', 'info', `→ GET ${BACKEND}/api/health`);
  try {
    const res  = await fetch(`${BACKEND}/api/health`);
    const data = await res.json();
    if (res.ok && data.status === 'ok') {
      log('health', 'ok', `✓ Backend up — ${data.service}`);
      statusEl.innerHTML = badge('badge-ok', '● Backend Online');
      modelEl.innerHTML  =
        `<span class="info-pill">LLM <span>${MODEL_GENERATION}</span></span>` +
        `<span class="info-pill">Embeddings <span>${MODEL_EMBEDDING}</span></span>` +
        `<span class="info-pill">Vector DB <span>ChromaDB</span></span>` +
        `<span class="info-pill">Offline <span>SQLite</span></span>`;
      setDot('health', 'ok');
    } else {
      log('health', 'warn', `⚠ Unexpected: ${JSON.stringify(data)}`);
      statusEl.innerHTML = badge('badge-warn', '● Unexpected Response');
      setDot('health', 'warn');
    }
  } catch (err) {
    log('health', 'error', `✗ Cannot reach backend: ${err.message}`);
    log('health', 'error', '  → cd backend && .venv/bin/python run.py --reload');
    statusEl.innerHTML = badge('badge-error', '● Backend Offline');
    if (modelEl) modelEl.innerHTML = '';
    setDot('health', 'error');
  }
}

// ─────────────────────────────────────────────────────────────
// 3. Chat API
// ─────────────────────────────────────────────────────────────
async function testChat() {
  const query   = document.getElementById('chat-input').value.trim();
  const metaEl  = document.getElementById('chat-meta');
  const replyEl = document.getElementById('chat-reply');

  if (!query) { log('chat', 'warn', '⚠ Enter a query first'); return; }

  metaEl.innerHTML      = badge('badge-idle', '● Sending…');
  replyEl.style.display = 'none';
  replyEl.textContent   = '';

  log('chat', 'info', '→ POST /api/chat');
  log('chat', 'info', `  "${query}"`);

  const t0 = performance.now();
  try {
    const res  = await fetch(`${BACKEND}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query }),
    });
    const data = await res.json();
    const ms   = Math.round(performance.now() - t0);

    if (res.ok) {
      const src = data.source || 'unknown';
      log('chat', 'ok', `✓ ${ms}ms (server: ${data.latency_ms}ms)`);
      metaEl.innerHTML =
        sourceBadge(src) + ' ' +
        badge('badge-idle', `⏱ ${data.latency_ms}ms`) + ' ' +
        (data.retrieved_sources?.length
          ? badge('badge-rag', `📄 ${data.retrieved_sources.map(s => s.split('/').pop()).join(', ')}`)
          : badge('badge-warn', '⚠ No sources retrieved'));
      replyEl.textContent   = data.reply || '(empty reply)';
      replyEl.style.display = 'block';
      log('chat', 'info', `  source: ${src} | sources: ${JSON.stringify(data.retrieved_sources)}`);
      setDot('chat', src === 'rag' ? 'ok' : src === 'offline-cache' ? 'warn' : 'error');
    } else {
      metaEl.innerHTML = badge('badge-error', `✗ HTTP ${res.status}`);
      log('chat', 'error', `✗ HTTP ${res.status}: ${JSON.stringify(data)}`);
      setDot('chat', 'error');
    }
  } catch (err) {
    metaEl.innerHTML = badge('badge-error', '✗ Request failed');
    log('chat', 'error', `✗ ${err.message}`);
    log('chat', 'error', '  → Is the FastAPI server running?');
    setDot('chat', 'error');
  }
}

function setQuery(q) {
  document.getElementById('chat-input').value = q;
}

// ─────────────────────────────────────────────────────────────
// 4. Feedback API
// ─────────────────────────────────────────────────────────────
async function testFeedback(rating) {
  const label = rating === 1 ? 'thumbs_up' : 'thumbs_down';
  log('feedback', 'info', `→ POST /api/feedback (${label})`);
  try {
    const res  = await fetch(`${BACKEND}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'How do I handle a Salesforce login failure?',
        reply:   '1. Ask the agent to confirm their email…',
        rating,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      log('feedback', 'ok', `✓ Accepted — ${data.rating}`);
      setDot('feedback', 'ok');
    } else {
      log('feedback', 'error', `✗ HTTP ${res.status}: ${JSON.stringify(data)}`);
      setDot('feedback', 'error');
    }
  } catch (err) {
    log('feedback', 'error', `✗ ${err.message}`);
    setDot('feedback', 'error');
  }
}

// ─────────────────────────────────────────────────────────────
// 5. Storage
// ─────────────────────────────────────────────────────────────
function readSessionStorage() {
  if (!isExt()) { log('storage', 'error', '✗ Not in extension context'); return; }
  chrome.storage.session.get(null, (items) => {
    if (chrome.runtime.lastError) {
      log('storage', 'error', `✗ ${chrome.runtime.lastError.message}`);
      setDot('storage', 'error');
      return;
    }
    const k = Object.keys(items).length;
    log('storage', k > 0 ? 'ok' : 'warn',
      k > 0 ? `✓ session: ${k} key(s)` : '⚠ session storage empty — navigate to a CRM tab first');
    if (k > 0) logJSON('storage', items);
    setDot('storage', k > 0 ? 'ok' : 'warn');
  });
}

function readLocalStorage() {
  if (!isExt()) { log('storage', 'error', '✗ Not in extension context'); return; }
  chrome.storage.local.get(null, (items) => {
    const k = Object.keys(items).length;
    log('storage', k > 0 ? 'ok' : 'warn',
      k > 0 ? `✓ local: ${k} key(s)` : '⚠ local storage empty');
    if (k > 0) logJSON('storage', items);
    setDot('storage', k > 0 ? 'ok' : 'warn');
  });
}

function clearStorage() {
  if (!isExt()) { log('storage', 'error', '✗ Not in extension context'); return; }
  chrome.storage.session.clear(() =>
    chrome.storage.local.clear(() => {
      log('storage', 'warn', '⚠ All extension storage cleared');
      setDot('storage', 'warn');
    })
  );
}

// ─────────────────────────────────────────────────────────────
// 6. Tab Context
// ─────────────────────────────────────────────────────────────
function getActiveTab() {
  if (!isExt()) { log('tabs', 'error', '✗ Not in extension context'); return; }
  if (!chrome.tabs) { log('tabs', 'error', '✗ chrome.tabs unavailable'); setDot('tabs', 'error'); return; }
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs?.length) { log('tabs', 'error', '✗ No active tab'); setDot('tabs', 'error'); return; }
    const tab   = tabs[0];
    const isCrm = CRM_DOMAINS.some(d => (tab.url || '').includes(d));
    log('tabs', 'ok', '✓ Active tab:');
    logJSON('tabs', { id: tab.id, url: tab.url, title: tab.title, status: tab.status });
    log('tabs', isCrm ? 'ok' : 'warn',
      isCrm ? '✓ Known CRM domain — panel auto-opens' : '⚠ Not a CRM domain — requires manual panel open');
    setDot('tabs', 'ok');
  });
}

function sendPanelReady() {
  if (!isExt()) { log('tabs', 'error', '✗ Not in extension context'); return; }
  chrome.runtime.sendMessage({ type: 'PANEL_READY' }, (res) => {
    if (chrome.runtime.lastError) {
      log('tabs', 'error', `✗ ${chrome.runtime.lastError.message}`);
      setDot('tabs', 'error');
      return;
    }
    log('tabs', 'ok', '✓ PANEL_READY acknowledged');
    if (res?.context) {
      log('tabs', 'info', '  Last known tab context:');
      logJSON('tabs', res.context);
      setDot('tabs', 'ok');
    } else {
      log('tabs', 'warn', '⚠ No context stored — navigate to a CRM tab first');
      setDot('tabs', 'warn');
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 7. Content Script Simulation
// ─────────────────────────────────────────────────────────────
function simulatePageContext() {
  if (!isExt()) { log('content', 'error', '✗ Not in extension context'); return; }
  const msg = {
    type:     'PAGE_CONTEXT',
    url:      'https://mycompany.zendesk.com/agent/tickets/12345',
    title:    'Ticket #12345 — Login Issue',
    hostname: 'mycompany.zendesk.com',
    platform: 'Zendesk',
  };
  chrome.runtime.sendMessage(msg, () => {
    log('content', 'ok', '✓ PAGE_CONTEXT sent → panel header should show "Active on Zendesk"');
    setDot('content', 'ok');
  });
}

function simulateTextSelected() {
  if (!isExt()) { log('content', 'error', '✗ Not in extension context'); return; }
  const msg = {
    type:         'TEXT_SELECTED',
    selectedText: 'Agent cannot log into Salesforce — invalid credentials after password reset.',
    url:          'https://mycompany.salesforce.com/cases',
    title:        'Cases — Salesforce',
  };
  chrome.runtime.sendMessage(msg, () => {
    log('content', 'ok', '✓ TEXT_SELECTED sent → panel should show selected-text banner');
    setDot('content', 'ok');
  });
}

function simulateContextMenu() {
  if (!isExt()) { log('content', 'error', '✗ Not in extension context'); return; }
  const msg = {
    type:         'CONTEXT_MENU_QUERY',
    selectedText: 'Customer cannot hear me during the call',
    url:          'https://mycompany.zendesk.com/agent',
    title:        'Zendesk',
  };
  chrome.runtime.sendMessage(msg, () => {
    log('content', 'ok', '✓ CONTEXT_MENU_QUERY sent → panel input should be pre-filled');
    setDot('content', 'ok');
  });
}

// ─────────────────────────────────────────────────────────────
// 8. Permissions
// ─────────────────────────────────────────────────────────────
function checkPermissions() {
  if (!isExt()) { log('perms', 'error', '✗ Not in extension context'); return; }
  const required = ['storage', 'activeTab', 'tabs', 'contextMenus', 'scripting', 'sidePanel'];
  let allOk = true;
  let checked = 0;
  required.forEach(p => {
    chrome.permissions.contains({ permissions: [p] }, (has) => {
      if (has) {
        log('perms', 'ok', `  ✓ ${p}`);
      } else {
        log('perms', 'error', `  ✗ ${p} — MISSING`);
        allOk = false;
      }
      if (++checked === required.length) {
        setDot('perms', allOk ? 'ok' : 'error');
        log('perms', allOk ? 'ok' : 'error',
          allOk ? '✓ All permissions granted' : '✗ Some permissions missing — reload the extension');
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────
// 9. Custom Message
// ─────────────────────────────────────────────────────────────
function sendCustomMessage() {
  if (!isExt()) { log('msg', 'error', '✗ Not in extension context'); return; }
  let payload;
  try { payload = JSON.parse(document.getElementById('msg-input').value || '{}'); }
  catch (e) { log('msg', 'error', `✗ Invalid JSON: ${e.message}`); setDot('msg', 'error'); return; }
  log('msg', 'info', `→ Sending: ${JSON.stringify(payload)}`);
  chrome.runtime.sendMessage(payload, (res) => {
    if (chrome.runtime.lastError) {
      log('msg', 'warn', `⚠ ${chrome.runtime.lastError.message}`);
      setDot('msg', 'warn');
      return;
    }
    log('msg', 'ok', '✓ Response:');
    logJSON('msg', res ?? null);
    setDot('msg', 'ok');
  });
}

// ─────────────────────────────────────────────────────────────
// 10. Run All Tests
// ─────────────────────────────────────────────────────────────
async function runAll() {
  document.getElementById('log-all').innerHTML = '';
  log('all', 'info', '═══════ AssistFlow Test Suite ═══════');

  log('all', 'info', '\n[1] Extension runtime…');
  if (isExt()) {
    log('all', 'ok', `  ✓ chrome.runtime.id = ${chrome.runtime.id}`);
    const m = chrome.runtime.getManifest();
    log('all', 'info', `  ${m.name} v${m.version} (MV${m.manifest_version})`);
  } else {
    log('all', 'warn', '  ⚠ Not in extension context (backend tests will still run)');
  }

  log('all', 'info', '\n[2] Backend health…');
  let backendOk = false;
  try {
    const r = await fetch(`${BACKEND}/api/health`);
    const d = await r.json();
    backendOk = r.ok && d.status === 'ok';
    log('all', backendOk ? 'ok' : 'warn',
      `  ${backendOk ? '✓' : '⚠'} ${d.service} (HTTP ${r.status})`);
  } catch (e) {
    log('all', 'error', `  ✗ Backend unreachable — ${e.message}`);
    log('all', 'error', '  → cd backend && .venv/bin/python run.py --reload');
  }

  if (!backendOk) {
    log('all', 'warn', '\n⚠ Skipping chat/feedback tests — backend offline');
    setDot('all', 'error');
    log('all', 'info', '\n═══════ Test suite complete ═══════');
    return;
  }

  const queries = [
    'agent cannot log into Salesforce',
    'customer cannot hear the agent on the call',
    'how do I verify a customer identity',
  ];

  log('all', 'info', '\n[3] RAG pipeline (3 SOP queries)…');
  for (const q of queries) {
    try {
      const r = await fetch(`${BACKEND}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });
      const d = await r.json();
      const srcLabel = d.source === 'rag' ? '✓ rag' : d.source === 'offline-cache' ? '⚠ offline-cache' : '✗ fallback';
      const srcType  = d.source === 'rag' ? 'ok' : d.source === 'offline-cache' ? 'warn' : 'error';
      log('all', srcType,
        `  [${srcLabel}] ${d.latency_ms}ms | "${q.slice(0, 40)}…" → ${(d.retrieved_sources || []).map(s => s.split('/').pop()).join(', ') || 'no sources'}`);
    } catch (e) {
      log('all', 'error', `  ✗ Query failed: ${e.message}`);
    }
  }

  log('all', 'info', '\n[4] Feedback API…');
  try {
    const r = await fetch(`${BACKEND}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'test', reply: 'test reply', rating: 1 }),
    });
    const d = await r.json();
    log('all', r.ok ? 'ok' : 'error', r.ok ? `  ✓ ${d.rating}` : `  ✗ HTTP ${r.status}`);
  } catch (e) {
    log('all', 'error', `  ✗ ${e.message}`);
  }

  if (isExt()) {
    log('all', 'info', '\n[5] Background SW…');
    chrome.runtime.sendMessage({ type: 'ping' }, (res) => {
      log('all', res?.ok ? 'ok' : 'error',
        res?.ok ? `  ✓ SW alive: ${res.service}` : '  ✗ No SW response');
    });

    log('all', 'info', '\n[6] Session storage…');
    chrome.storage.session.get(null, (items) => {
      const k = Object.keys(items).length;
      log('all', k > 0 ? 'ok' : 'warn',
        k > 0 ? `  ✓ ${k} key(s) stored` : '  ⚠ Empty — navigate to a CRM tab first');
    });
  }

  setDot('all', 'ok');
  log('all', 'info', '\n═══════ Test suite complete ═══════');
}

// ─────────────────────────────────────────────────────────────
// Clear all logs
// ─────────────────────────────────────────────────────────────
function clearAllLogs() {
  ['runtime','health','chat','feedback','storage','tabs','content','perms','msg','all'].forEach(id => {
    const el = document.getElementById('log-' + id);
    if (el) el.innerHTML = '<span class="log-info log-entry">Cleared.</span>';
    setDot(id, '');
  });
  document.getElementById('env-status').innerHTML = '';
  document.getElementById('model-info').innerHTML = '';
  document.getElementById('chat-meta').innerHTML  = '';
  const r = document.getElementById('chat-reply');
  if (r) { r.style.display = 'none'; r.textContent = ''; }
}

// ─────────────────────────────────────────────────────────────
// Wire up all button event listeners (replaces inline onclick)
// MV3 CSP blocks both inline <script> and onclick attributes
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const on = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);

  // Panel 1
  on('btn-check-runtime',   checkRuntime);
  on('btn-ping-bg',         pingBackground);
  // Panel 2
  on('btn-health',          checkHealth);
  // Panel 3
  on('btn-send-chat',       testChat);
  on('btn-query-telephony', () => setQuery('customer cannot hear the agent on the call'));
  on('btn-query-identity',  () => setQuery('how do I verify a customers identity'));
  on('btn-query-downtime',  () => setQuery('the CRM is down what do I do'));
  on('btn-query-escalation',() => setQuery('how do I escalate a ticket to tier 2'));
  // Panel 4
  on('btn-thumbs-up',       () => testFeedback(1));
  on('btn-thumbs-down',     () => testFeedback(2));
  // Panel 5
  on('btn-read-session',    readSessionStorage);
  on('btn-read-local',      readLocalStorage);
  on('btn-clear-storage',   clearStorage);
  // Panel 6
  on('btn-active-tab',      getActiveTab);
  on('btn-panel-ready',     sendPanelReady);
  // Panel 7
  on('btn-sim-page',        simulatePageContext);
  on('btn-sim-text',        simulateTextSelected);
  on('btn-sim-menu',        simulateContextMenu);
  // Panel 8
  on('btn-check-perms',     checkPermissions);
  // Panel 9
  on('btn-send-msg',        sendCustomMessage);
  // Panel 10
  on('btn-run-all',         runAll);
  on('btn-clear-all',       clearAllLogs);

  // Auto health check on load
  checkHealth();
});
