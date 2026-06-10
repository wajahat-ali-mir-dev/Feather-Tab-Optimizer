let isEnabled = true;
let autoDiscardEnabled = false;
let suspendLinksEnabled = true;
let discardTimeout = null;

// Initialize extension state
chrome.storage.local.get({
  enabled: true,
  autoDiscardEnabled: false,
  suspendLinksEnabled: true
}, (result) => {
  isEnabled = result.enabled;
  autoDiscardEnabled = result.autoDiscardEnabled;
  suspendLinksEnabled = result.suspendLinksEnabled;
  updateIcon();
  if (isEnabled && autoDiscardEnabled) {
    scheduleDiscardCheck();
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if ('enabled' in changes) isEnabled = changes.enabled.newValue;
    if ('autoDiscardEnabled' in changes) autoDiscardEnabled = changes.autoDiscardEnabled.newValue;
    if ('suspendLinksEnabled' in changes) suspendLinksEnabled = changes.suspendLinksEnabled.newValue;
    updateIcon();

    if (isEnabled && autoDiscardEnabled) {
      scheduleDiscardCheck();
    } else {
      if (discardTimeout) clearTimeout(discardTimeout);
    }
  }
});

function updateIcon() {
  const path = isEnabled ? {
    "16": "/data/icons/16.png",
    "32": "/data/icons/32.png",
    "48": "/data/icons/48.png",
    "128": "/data/icons/128.png"
  } : {
    "16": "/data/icons/disabled/16.png",
    "32": "/data/icons/disabled/32.png"
  };
  chrome.action.setIcon({ path }).catch(() => { });
}

function isDiscardableUrl(url) {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("ftp://");
}

function scheduleDiscardCheck() {
  if (!isEnabled || !autoDiscardEnabled) return;
  if (discardTimeout) clearTimeout(discardTimeout);
  discardTimeout = setTimeout(checkAndDiscardTabs, 5000);
}

async function checkAndDiscardTabs() {
  if (!isEnabled || !autoDiscardEnabled) return;
  try {
    const tabs = await chrome.tabs.query({ active: false, discarded: false });
    for (const tab of tabs) {
      if (isDiscardableUrl(tab.url || tab.pendingUrl)) {
        await chrome.tabs.discard(tab.id).catch(() => { });
      }
    }
  } catch (error) {
    console.error("Error auto-discarding tabs:", error);
  }
}

// Intercept newly created tabs to suspend them immediately if not active
chrome.tabs.onCreated.addListener((tab) => {
  if (!isEnabled || !suspendLinksEnabled) return;
  if (!tab.active && isDiscardableUrl(tab.url || tab.pendingUrl)) {
    chrome.tabs.discard(tab.id).catch(() => { });
  }
});

// Manual action
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'discardAllTabs') {
    discardAllTabs().then(() => sendResponse({ success: true }));
    return true; // Keep message channel open for async response
  }
});

async function discardAllTabs() {
  try {
    const tabs = await chrome.tabs.query({ active: false, discarded: false });
    for (const tab of tabs) {
      if (isDiscardableUrl(tab.url || tab.pendingUrl)) {
        await chrome.tabs.discard(tab.id).catch(() => { });
      }
    }
  } catch (error) {
    console.error("Error manually discarding tabs:", error);
  }
}

chrome.tabs.onActivated.addListener(scheduleDiscardCheck);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") scheduleDiscardCheck();
});
chrome.windows.onFocusChanged.addListener(scheduleDiscardCheck);
chrome.runtime.onStartup.addListener(scheduleDiscardCheck);
