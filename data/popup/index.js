document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('enable-toggle');
  const statusText = document.getElementById('status-text');
  const autoDiscardToggle = document.getElementById('auto-discard-toggle');
  const suspendLinksToggle = document.getElementById('suspend-links-toggle');
  const discardNowBtn = document.getElementById('discard-now-btn');
  const actionStatus = document.getElementById('action-status');

  const hasChromeApi = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  // Load state from local storage
  if (hasChromeApi) {
    chrome.storage.local.get({
      enabled: true,
      autoDiscardEnabled: false,
      suspendLinksEnabled: true
    }, (result) => {
      toggle.checked = result.enabled;
      autoDiscardToggle.checked = result.autoDiscardEnabled;
      suspendLinksToggle.checked = result.suspendLinksEnabled;
      updateUI(result.enabled);
    });
  } else {
    // Preview mode defaults
    toggle.checked = true;
    autoDiscardToggle.checked = false;
    suspendLinksToggle.checked = true;
    updateUI(true);
  }

  // Watch for toggle changes
  toggle.addEventListener('change', () => {
    const isEnabled = toggle.checked;
    if (hasChromeApi) {
      chrome.storage.local.set({ enabled: isEnabled }, () => {
        updateUI(isEnabled);
      });
    } else {
      updateUI(isEnabled);
    }
  });

  autoDiscardToggle.addEventListener('change', () => {
    if (hasChromeApi) {
      chrome.storage.local.set({ autoDiscardEnabled: autoDiscardToggle.checked });
    }
  });

  suspendLinksToggle.addEventListener('change', () => {
    if (hasChromeApi) {
      chrome.storage.local.set({ suspendLinksEnabled: suspendLinksToggle.checked });
    }
  });

  // Action button click
  discardNowBtn.addEventListener('click', () => {
    discardNowBtn.disabled = true;
    if (hasChromeApi && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'discardAllTabs' }, (response) => {
        discardNowBtn.disabled = !toggle.checked;
        if (chrome.runtime.lastError) {
          console.error("Error communicating with background script:", chrome.runtime.lastError);
          showStatus("Failed to discard tabs", false);
          return;
        }
        if (response && response.success) {
          showStatus("All tabs discarded!", true);
        } else {
          showStatus("No tabs to discard", false);
        }
      });
    } else {
      // Mock action in preview mode
      setTimeout(() => {
        discardNowBtn.disabled = false;
        showStatus("Mock: Tabs discarded!", true);
      }, 800);
    }
  });

  function showStatus(text, isSuccess) {
    actionStatus.textContent = text;
    actionStatus.style.color = isSuccess ? 'var(--accent-active)' : 'var(--text-secondary)';
    actionStatus.classList.add('show');
    setTimeout(() => {
      actionStatus.classList.remove('show');
    }, 2000);
  }

  // Dynamically update labels and inputs based on state
  function updateUI(isEnabled) {
    if (isEnabled) {
      statusText.textContent = 'Enabled';
      statusText.className = 'status-value active';
      autoDiscardToggle.disabled = false;
      suspendLinksToggle.disabled = false;
      discardNowBtn.disabled = false;
    } else {
      statusText.textContent = 'Disabled';
      statusText.className = 'status-value disabled';
      autoDiscardToggle.disabled = true;
      suspendLinksToggle.disabled = true;
      discardNowBtn.disabled = true;
    }
  }
});
