// SmartOpsSupportHub Background Service Worker
// Handles side panel opening

chrome.action.onClicked.addListener((tab) => {
  // Open side panel when extension icon is clicked
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Optional: Set side panel behavior
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    enabled: true
  });
});
