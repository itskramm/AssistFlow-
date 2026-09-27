/**
 * content.js — AssistFlow Page Context Extractor
 *
 * Injected into known CRM / call-center pages.
 *
 * What it does:
 *  1. Detects which CRM platform is loaded and labels it.
 *  2. Extracts ticket/case context from the DOM (subject, description,
 *     status, customer name, priority) using platform-specific selectors.
 *  3. Sends PAGE_CONTEXT (URL/title/platform) and PAGE_DATA (ticket fields)
 *     to the background service worker so the side panel can attach them
 *     to every AI query automatically.
 *  4. Watches for SPA navigation to re-extract when the agent opens a
 *     different ticket without a full page reload.
 *  5. Forwards highlighted text via TEXT_SELECTED.
 *
 * Privacy: only reads visible text from the current page. Never reads
 * password fields, hidden inputs, or cross-origin iframes.
 * Never modifies the host page DOM.
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
// DOM helper — safely read text from first matching selector
// ---------------------------------------------------------------------------
function txt(selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const value = (el.value || el.textContent || el.innerText || '').trim();
        if (value) return value.slice(0, 400); // cap at 400 chars per field
      }
    } catch { /* invalid selector — skip */ }
  }
  return null;
}

// ---------------------------------------------------------------------------
// CRM-specific DOM extractors
// Each returns { subject, description, status, priority, customer, ticketId }
// All fields are optional — only populated if found on the current page.
// ---------------------------------------------------------------------------

function extractZendesk() {
  return {
    ticketId:    txt(['[data-test-id="ticket-id"]', '.ticket-id', 'title'])?.match(/#(\d+)/)?.[1] || null,
    subject:     txt(['[data-test-id="ticket-title-input"] input',
                      '.ticket_title input',
                      '#ticket-title',
                      '.pane_header .subject']),
    status:      txt(['[data-test-id="ticket-status-select"] button',
                      '.select-dropdown button',
                      '[aria-label="Status"]']),
    priority:    txt(['[data-test-id="ticket-priority-select"] button',
                      '[aria-label="Priority"]']),
    customer:    txt(['[data-test-id="requester-input"] input',
                      '.requester input',
                      '.ticket_requester .value']),
    description: txt(['[data-test-id="omni-log-item-composer"] .zd-comment',
                      '.zd-comment.richtext',
                      '.comment_body .zd-comment',
                      '.ticket-comment .zd-comment']),
  };
}

function extractSalesforce() {
  return {
    ticketId:    txt(['.recordName .uiOutputText',
                      '.slds-page-header .slds-media__body .uiOutputText',
                      'h1.slds-page-header__title']),
    subject:     txt(['.slds-form-element__static',
                      '[data-field="Subject"] .slds-form-element__static',
                      '[data-field="Subject"] span']),
    status:      txt(['[data-field="Status"] .slds-form-element__static',
                      '[data-field="Status"] span',
                      '.slds-form-element [title="Status"]']),
    priority:    txt(['[data-field="Priority"] .slds-form-element__static',
                      '[data-field="Priority"] span']),
    customer:    txt(['[data-field="ContactId"] .slds-form-element__static',
                      '[data-field="AccountId"] .slds-form-element__static']),
    description: txt(['[data-field="Description"] .slds-form-element__static',
                      '[data-field="Description"] span']),
  };
}

function extractFreshdesk() {
  return {
    ticketId:    document.title?.match(/#(\d+)/)?.[1] || null,
    subject:     txt(['.ticket-header-title',
                      '.subject .ticket-title',
                      '#ticket-title',
                      'h2.ember-view']),
    status:      txt(['.ticket-status-info .status-label',
                      '.status-pill',
                      '[data-label="Status"] .value']),
    priority:    txt(['[data-label="Priority"] .value',
                      '.ticket-priority']),
    customer:    txt(['.requester-info .name',
                      '.contact-name',
                      '.requester-name a']),
    description: txt(['.ticket-body .ticket-description',
                      '.description_html .ticket-description',
                      '.ticket-content p']),
  };
}

function extractHubSpot() {
  return {
    ticketId:    window.location.pathname.match(/tickets\/(\d+)/)?.[1] || null,
    subject:     txt(['[data-selenium-id="ticket-name"]',
                      '.ticket-name-input input',
                      'h1[data-test-id="record-name"]']),
    status:      txt(['[data-test-id="pipeline-stage-label"]',
                      '.pipeline-stage-selector button span']),
    priority:    txt(['[data-property-name="hs_ticket_priority"] .private-select__label',
                      '[data-property-name="priority"] span']),
    customer:    txt(['[data-test-id="associated-contact-name"]',
                      '.associated-objects .contact-name']),
    description: txt(['[data-property-name="content"] .private-textarea',
                      '[data-property-name="hs_ticket_description"] textarea',
                      '[data-property-name="content"] textarea']),
  };
}

function extractServiceNow() {
  return {
    ticketId:    txt(['#sys_readonly\\.incident\\.number',
                      '[id$=".number"] input',
                      '.form-group [name="number"]']),
    subject:     txt(['#sys_readonly\\.incident\\.short_description',
                      '[id$=".short_description"] input',
                      '[name="short_description"]']),
    status:      txt(['[id$=".state"] select option:checked',
                      '[name="state"] option:checked']),
    priority:    txt(['[id$=".priority"] select option:checked',
                      '[name="priority"] option:checked']),
    customer:    txt(['[id$=".caller_id"] input',
                      '[name="caller_id"]']),
    description: txt(['[id$=".description"] textarea',
                      '[name="description"]']),
  };
}

function extractIntercom() {
  return {
    ticketId:    window.location.pathname.match(/conversations\/(\d+)/)?.[1] || null,
    subject:     txt(['.conversation-title',
                      '.conversation__subject',
                      '[data-test="conversation-subject"]']),
    status:      txt(['.conversation-state',
                      '[data-test="conversation-state"]']),
    customer:    txt(['.user-name',
                      '.conversation__user-name',
                      '[data-test="user-name"]']),
    description: txt(['.comment-body .intercom-interblocks-paragraph',
                      '.conversation-part-body p']),
  };
}

function extractGeneric() {
  // Fallback: try to get any visible heading + first paragraph
  return {
    subject:     txt(['h1', 'h2', '.page-title', '.ticket-title']),
    description: txt(['.description', '.content p', 'main p', 'article p']),
  };
}

// ---------------------------------------------------------------------------
// Dispatch to the right extractor based on hostname
// ---------------------------------------------------------------------------
function extractPageData() {
  const hostname = window.location.hostname;
  let data = {};

  if (/salesforce\.com|lightning\.force\.com/.test(hostname)) data = extractSalesforce();
  else if (/zendesk\.com/.test(hostname))                       data = extractZendesk();
  else if (/freshdesk\.com|freshworks\.com/.test(hostname))     data = extractFreshdesk();
  else if (/hubspot\.com/.test(hostname))                       data = extractHubSpot();
  else if (/servicenow\.com/.test(hostname))                    data = extractServiceNow();
  else if (/intercom\.com/.test(hostname))                      data = extractIntercom();
  else                                                           data = extractGeneric();

  // Strip nulls so we don't send empty fields
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v != null && v !== ''));
}

// ---------------------------------------------------------------------------
// Send page context (URL / title / platform)
// ---------------------------------------------------------------------------
function sendPageContext() {
  const hostname = window.location.hostname;
  chrome.runtime.sendMessage({
    type:     'PAGE_CONTEXT',
    url:      window.location.href,
    title:    document.title,
    hostname,
    platform: getPlatformLabel(hostname),
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Send extracted page data (ticket fields) — debounced 1.2s after DOM settles
// ---------------------------------------------------------------------------
let pageDataTimer = null;

function sendPageData() {
  clearTimeout(pageDataTimer);
  pageDataTimer = setTimeout(() => {
    const data = extractPageData();
    if (Object.keys(data).length === 0) return; // nothing useful found
    chrome.runtime.sendMessage({
      type:     'PAGE_DATA',
      platform: getPlatformLabel(window.location.hostname),
      url:      window.location.href,
      data,
    }).catch(() => {});
  }, 1200); // wait for the CRM's React/Angular to finish rendering
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
// Title observer — SPA title changes
// ---------------------------------------------------------------------------
const titleEl = document.querySelector('title');
if (titleEl) {
  new MutationObserver(() => {
    sendPageContext();
    sendPageData();
  }).observe(titleEl, { childList: true });
}

// ---------------------------------------------------------------------------
// URL observer — throttled to 800ms (SPA navigation)
// ---------------------------------------------------------------------------
let lastUrl       = window.location.href;
let urlThrottleId = null;

new MutationObserver(() => {
  if (window.location.href === lastUrl) return;
  lastUrl = window.location.href;
  if (urlThrottleId) return;
  urlThrottleId = setTimeout(() => {
    urlThrottleId = null;
    sendPageContext();
    sendPageData();
  }, 800);
}).observe(document.body, { subtree: true, childList: true });

// ---------------------------------------------------------------------------
// Initial send on script load
// ---------------------------------------------------------------------------
sendPageContext();
sendPageData();
