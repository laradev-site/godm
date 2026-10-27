const statusPill = document.getElementById('status-pill');
const statusText = document.getElementById('status-text');
const urlInput = document.getElementById('url-input');
const sendBtn = document.getElementById('send-btn');
const msg = document.getElementById('msg');
const toggleIntercept = document.getElementById('toggle-intercept');
const toggleWidget = document.getElementById('toggle-widget');

const activeVideoBox = document.getElementById('active-video-box');
const videoPlatformBadge = document.getElementById('video-platform-badge');
const activeVideoTitle = document.getElementById('active-video-title');
const downloadCurrentBtn = document.getElementById('download-current-btn');
const syncCookiesBtn = document.getElementById('sync-cookies-btn');
const syncStatus = document.getElementById('sync-status');

let currentTabVideoUrl = '';
let currentTabVideoTitle = '';
let currentTabUrl = '';

// Check godm connection status
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

// Sync cookies button
if (syncCookiesBtn) {
  syncCookiesBtn.addEventListener('click', () => {
    syncCookiesBtn.innerText = 'Syncing session...';
    chrome.runtime.sendMessage({ action: 'sync-cookies', url: currentTabUrl }, (res) => {
      if (res && res.success) {
        syncCookiesBtn.innerText = '✓ Session Synced to godm!';
        if (syncStatus) syncStatus.innerText = 'Private videos ready to download';
        setTimeout(() => {
          syncCookiesBtn.innerText = '🔒 Sync Tab Session to godm';
        }, 3000);
      } else {
        syncCookiesBtn.innerText = 'Failed: Start godm app';
        setTimeout(() => {
          syncCookiesBtn.innerText = '🔒 Sync Tab Session to godm';
        }, 3000);
      }
    });
  });
}

// Check current active tab for videos
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs || tabs.length === 0) return;
  const tab = tabs[0];
  const url = tab.url || '';
  const title = tab.title || '';
  currentTabUrl = url;

  const isVideoPlatform = /(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|twitter\.com|x\.com|facebook\.com|vimeo\.com|reddit\.com|twitch\.tv|dailymotion\.com)/i.test(url);

  if (isVideoPlatform) {
    currentTabVideoUrl = url;
    currentTabVideoTitle = title;

    let badge = 'Video';
    if (url.includes('youtube.com') || url.includes('youtu.be')) badge = 'YouTube';
    else if (url.includes('tiktok.com')) badge = 'TikTok';
    else if (url.includes('instagram.com')) badge = 'Instagram';
    else if (url.includes('twitter.com') || url.includes('x.com')) badge = 'Twitter/X';
    else if (url.includes('facebook.com')) badge = 'Facebook';
    else if (url.includes('vimeo.com')) badge = 'Vimeo';

    videoPlatformBadge.innerText = badge;
    activeVideoTitle.innerText = title;
    activeVideoBox.style.display = 'flex';
  }
});

// Download current tab video
downloadCurrentBtn.addEventListener('click', () => {
  if (!currentTabVideoUrl) return;

  downloadCurrentBtn.innerText = 'Sending...';
  chrome.runtime.sendMessage({ action: 'download-url', url: currentTabVideoUrl, filename: currentTabVideoTitle }, (res) => {
    if (res && res.success) {
      downloadCurrentBtn.innerText = '✓ Sent to godm!';
      setTimeout(() => {
        downloadCurrentBtn.innerText = '⚡ Download This Video';
      }, 3000);
    } else {
      downloadCurrentBtn.innerText = 'Failed: Start godm app!';
      setTimeout(() => {
        downloadCurrentBtn.innerText = '⚡ Download This Video';
      }, 3000);
    }
  });
});

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

// Manual URL send
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
