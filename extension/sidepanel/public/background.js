/**
 * background.js — AssistFlow Service Worker
 *
 * Responsibilities:
 *  1. Auto-open the side panel when the agent navigates to a known CRM domain.
 *  2. Keep the panel open when the agent switches between tabs on the same domain.
 *  3. Forward active-tab context (URL, title, hostname) to the side panel so it
 *     can surface context-aware suggestions without the agent doing anything extra.
 *  4. Register a right-click "Ask AssistFlow" context menu so agents can highlight
 *     text on any page and send it directly as a query.
 */

// ---------------------------------------------------------------------------
// CRM / call-center domains that trigger auto-open
// ---------------------------------------------------------------------------
const CRM_DOMAINS = [
  'salesforce.com',
  'lightning.force.com',
  'zendesk.com',
  'freshdesk.com',
  'freshworks.com',
  'genesyscloud.com',
  'mypurecloud.com',
  'avayacloud.com',
  'ringcentral.com',
  'talkdesk.com',
  'niceincontact.com',
  'five9.com',
  'hubspot.com',
  'servicenow.com',
  'intercom.com',
  'helpscout.com',
  'kustomer.com',
  'zohocrm.com',
  'zoho.com',
];

function isCrmUrl(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname;
    return CRM_DOMAINS.some((domain) => hostname.endsWith(domain));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 1. Install — configure panel behaviour + register context menu
// ---------------------------------------------------------------------------
chrome.runtime.onInstalled.addListener(() => {
  // Open the side panel when the user clicks the extension action icon
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // "Ask AssistFlow" — appears when the agent selects text on any page
  chrome.contextMenus.create({
    id: 'ask-assistflow',
    title: 'Ask AssistFlow: "%s"',
    contexts: ['selection'],
  });
});

// ---------------------------------------------------------------------------
// 2. Auto-open panel when agent switches to a CRM tab
// ---------------------------------------------------------------------------
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (isCrmUrl(tab.url)) {
      await chrome.sidePanel.open({ tabId });
    }
    // Always push updated context to the panel (even if already open)
    broadcastTabContext(tab);
  } catch {
    // Tab may have been closed before the async call resolved — safe to ignore
  }
});

// ---------------------------------------------------------------------------
// 3. Update context when URL changes within the same tab (SPA navigation)
// ---------------------------------------------------------------------------
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (isCrmUrl(tab.url)) {
    try {
      await chrome.sidePanel.open({ tabId });
    } catch {
      // sidePanel.open can fail if the window isn't focused — ignore silently
    }
  }
  broadcastTabContext(tab);
});

// ---------------------------------------------------------------------------
// 4. Forward tab context to the side panel
// ---------------------------------------------------------------------------
function broadcastTabContext(tab) {
  if (!tab?.url) return;
  let hostname = '';
  try {
    hostname = new URL(tab.url).hostname;
  } catch {
    return;
  }

  const context = {
    type: 'TAB_CONTEXT',
    url: tab.url,
    title: tab.title || '',
    hostname,
    isCrm: isCrmUrl(tab.url),
  };

  // Send to the side panel (it listens via chrome.runtime.onMessage)
  chrome.runtime.sendMessage(context).catch(() => {
    // Panel not open yet — context will be fetched on next panel load
  });

  // Persist so the panel can read it on startup without waiting for a message
  chrome.storage.session.set({ lastTabContext: context });
}

// ---------------------------------------------------------------------------
// 5. "Ask AssistFlow" context menu — inject selected text as a query
// ---------------------------------------------------------------------------
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'ask-assistflow') return;

  const payload = {
    type: 'CONTEXT_MENU_QUERY',
    selectedText: info.selectionText || '',
    url: tab?.url || '',
    title: tab?.title || '',
  };

  // Open the panel first, then send the query
  chrome.sidePanel.open({ tabId: tab.id }).then(() => {
    // Small delay to let the panel React app mount before the message arrives
    setTimeout(() => {
      chrome.runtime.sendMessage(payload).catch(() => {});
    }, 400);
  }).catch(() => {});
});

// ---------------------------------------------------------------------------
// 6. Respond to ping from the side panel (health check)
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ping') {
    sendResponse({ ok: true, service: 'assistflow-background' });
  }
  // PANEL_READY — panel just mounted, send it the last known tab context
  if (message.type === 'PANEL_READY') {
    chrome.storage.session.get('lastTabContext', ({ lastTabContext }) => {
      sendResponse({ context: lastTabContext || null });
    });
    return true; // keep channel open for async sendResponse
  }
});
