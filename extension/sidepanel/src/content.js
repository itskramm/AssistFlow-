/**
 * content.js — AssistFlow Page Context Extractor
 *
 * Injected into known CRM / call-center pages by the manifest content_scripts rule.
 *
 * What it does:
 *  1. On load: sends the current page URL, title, and platform label to the
 *     background service worker so the side panel can display context.
 *  2. On text selection: debounces and forwards selected text so the panel
 *     can offer to use it as a query with a single click.
 *  3. Listens for SPA route changes (MutationObserver on <title>) so it stays
 *     accurate inside Salesforce Lightning, Zendesk, etc. which don't do full
 *     page reloads.
 *
 * This script is purely passive — it never modifies the host page DOM.
 */

// ---------------------------------------------------------------------------
// Platform detection — maps hostname → friendly label shown in the panel
// ---------------------------------------------------------------------------
const PLATFORM_MAP = [
  { pattern: /salesforce\.com|lightning\.force\.com/, label: 'Salesforce' },
  { pattern: /zendesk\.com/, label: 'Zendesk' },
  { pattern: /freshdesk\.com|freshworks\.com/, label: 'Freshdesk' },
  { pattern: /genesyscloud\.com|mypurecloud\.com/, label: 'Genesys Cloud' },
  { pattern: /avayacloud\.com/, label: 'Avaya' },
  { pattern: /ringcentral\.com/, label: 'RingCentral' },
  { pattern: /talkdesk\.com/, label: 'Talkdesk' },
  { pattern: /niceincontact\.com/, label: 'NICE inContact' },
  { pattern: /five9\.com/, label: 'Five9' },
  { pattern: /hubspot\.com/, label: 'HubSpot' },
  { pattern: /servicenow\.com/, label: 'ServiceNow' },
  { pattern: /intercom\.com/, label: 'Intercom' },
  { pattern: /helpscout\.com/, label: 'Help Scout' },
  { pattern: /kustomer\.com/, label: 'Kustomer' },
  { pattern: /zohocrm\.com|zoho\.com/, label: 'Zoho' },
];

function getPlatformLabel(hostname) {
  for (const { pattern, label } of PLATFORM_MAP) {
    if (pattern.test(hostname)) return label;
  }
  return hostname;
}

// ---------------------------------------------------------------------------
// Send page context to the background worker
// ---------------------------------------------------------------------------
function sendPageContext() {
  const hostname = window.location.hostname;
  chrome.runtime.sendMessage({
    type: 'PAGE_CONTEXT',
    url: window.location.href,
    title: document.title,
    hostname,
    platform: getPlatformLabel(hostname),
  }).catch(() => {
    // Extension context may be invalidated after an update — safe to ignore
  });
}

// ---------------------------------------------------------------------------
// Forward selected text to the panel (debounced 600ms)
// ---------------------------------------------------------------------------
let selectionTimer = null;

document.addEventListener('mouseup', () => {
  clearTimeout(selectionTimer);
  selectionTimer = setTimeout(() => {
    const selected = window.getSelection()?.toString().trim();
    if (!selected || selected.length < 5) return;

    chrome.runtime.sendMessage({
      type: 'TEXT_SELECTED',
      selectedText: selected,
      url: window.location.href,
      title: document.title,
    }).catch(() => {});
  }, 600);
});

// ---------------------------------------------------------------------------
// Watch for SPA title changes (Salesforce Lightning, Zendesk, etc.)
// ---------------------------------------------------------------------------
const titleObserver = new MutationObserver(() => {
  sendPageContext();
});

const titleEl = document.querySelector('title');
if (titleEl) {
  titleObserver.observe(titleEl, { childList: true });
}

// Also handle history-based navigation (pushState / replaceState)
let lastUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    sendPageContext();
  }
});
urlObserver.observe(document.body, { subtree: true, childList: true });

// ---------------------------------------------------------------------------
// Initial send on script load
// ---------------------------------------------------------------------------
sendPageContext();
