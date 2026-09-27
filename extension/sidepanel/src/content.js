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
 *  3. Watches for SPA route changes (title MutationObserver + throttled URL
 *     observer) to stay accurate inside Salesforce Lightning, Zendesk, etc.
 *
 * Performance notes:
 *  - The URL observer is throttled to fire at most once every 800ms to
 *    prevent hundreds of callbacks on heavy SPAs like Salesforce.
 *  - document.body subtree observation is used for URL changes only;
 *    the title observer is a lightweight single-node watch.
 *
 * This script is entirely passive — it never modifies the host page DOM.
 */

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------
const PLATFORM_MAP = [
  { pattern: /salesforce\.com|lightning\.force\.com/, label: 'Salesforce'    },
  { pattern: /zendesk\.com/,                          label: 'Zendesk'       },
  { pattern: /freshdesk\.com|freshworks\.com/,        label: 'Freshdesk'     },
  { pattern: /genesyscloud\.com|mypurecloud\.com/,    label: 'Genesys Cloud' },
  { pattern: /avayacloud\.com/,                       label: 'Avaya'         },
  { pattern: /ringcentral\.com/,                      label: 'RingCentral'   },
  { pattern: /talkdesk\.com/,                         label: 'Talkdesk'      },
  { pattern: /niceincontact\.com/,                    label: 'NICE inContact'},
  { pattern: /five9\.com/,                            label: 'Five9'         },
  { pattern: /hubspot\.com/,                          label: 'HubSpot'       },
  { pattern: /servicenow\.com/,                       label: 'ServiceNow'    },
  { pattern: /intercom\.com/,                         label: 'Intercom'      },
  { pattern: /helpscout\.com/,                        label: 'Help Scout'    },
  { pattern: /kustomer\.com/,                         label: 'Kustomer'      },
  { pattern: /zohocrm\.com|zoho\.com/,                label: 'Zoho'          },
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
    type:     'PAGE_CONTEXT',
    url:      window.location.href,
    title:    document.title,
    hostname,
    platform: getPlatformLabel(hostname),
  }).catch(() => {
    // Extension context may be invalidated after an update — safe to ignore
  });
}

// ---------------------------------------------------------------------------
// Forward selected text (debounced 600ms)
// ---------------------------------------------------------------------------
let selectionTimer = null;

document.addEventListener('mouseup', () => {
  clearTimeout(selectionTimer);
  selectionTimer = setTimeout(() => {
    const selected = window.getSelection()?.toString().trim();
    if (!selected || selected.length < 5) return;
    chrome.runtime.sendMessage({
      type:         'TEXT_SELECTED',
      selectedText: selected,
      url:          window.location.href,
      title:        document.title,
    }).catch(() => {});
  }, 600);
});

// ---------------------------------------------------------------------------
// Title observer — lightweight, single-node watch for SPA title changes
// ---------------------------------------------------------------------------
const titleEl = document.querySelector('title');
if (titleEl) {
  new MutationObserver(() => sendPageContext())
    .observe(titleEl, { childList: true });
}

// ---------------------------------------------------------------------------
// URL observer — throttled to max once per 800ms
// Fires on pushState / replaceState navigation in SPAs (Salesforce, Zendesk).
// Using a coarse subtree watch is the only reliable way to catch these without
// monkey-patching history.pushState.
// ---------------------------------------------------------------------------
let lastUrl       = window.location.href;
let urlThrottleId = null;

new MutationObserver(() => {
  if (window.location.href === lastUrl) return; // URL unchanged — skip
  lastUrl = window.location.href;

  // Throttle: discard mutations that arrive within 800ms of the last send
  if (urlThrottleId) return;
  urlThrottleId = setTimeout(() => {
    urlThrottleId = null;
    sendPageContext();
  }, 800);
}).observe(document.body, { subtree: true, childList: true });

// ---------------------------------------------------------------------------
// Initial send on script load
// ---------------------------------------------------------------------------
sendPageContext();
