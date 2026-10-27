const statusPill = document.getElementById('status-pill');
const statusText = document.getElementById('status-text');
const urlInput = document.getElementById('url-input');
const sendBtn = document.getElementById('send-btn');
const msg = document.getElementById('msg');
const toggleIntercept = document.getElementById('toggle-intercept');
const toggleWidget = document.getElementById('toggle-widget');

// Check godm status
function updateStatus() {
  chrome.runtime.sendMessage({ action: 'check-status' }, (res) => {
    if (res && res.online) {
      statusPill.className = 'status-pill online';
      statusText.innerText = 'Connected';
    } else {
      statusPill.className = 'status-pill offline';
      statusText.innerText = 'App Offline';
    }
  });
}

// Load settings
chrome.storage.local.get(['interceptDownloads', 'showVideoWidget'], (res) => {
  toggleIntercept.checked = res.interceptDownloads !== false;
  toggleWidget.checked = res.showVideoWidget !== false;
});

toggleIntercept.addEventListener('change', () => {
  chrome.storage.local.set({ interceptDownloads: toggleIntercept.checked });
});

toggleWidget.addEventListener('change', () => {
  chrome.storage.local.set({ showVideoWidget: toggleWidget.checked });
});

// Send download
sendBtn.addEventListener('click', () => {
  const url = urlInput.value.trim();
  if (!url) return;

  msg.className = 'msg';
  msg.innerText = 'Sending to godm...';

  chrome.runtime.sendMessage({ action: 'download-url', url }, (res) => {
    if (res && res.success) {
      msg.className = 'msg success';
      msg.innerText = '✓ Sent to godm successfully!';
      urlInput.value = '';
      setTimeout(() => (msg.innerText = ''), 3000);
    } else {
      msg.className = 'msg error';
      msg.innerText = 'Failed: Please open the godm desktop app!';
    }
  });
});

updateStatus();
setInterval(updateStatus, 3000);
