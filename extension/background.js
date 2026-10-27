const GODM_API = 'http://127.0.0.1:9246';

// Set up Context Menus on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'godm-download-link',
    title: 'Download with godm',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'godm-download-media',
    title: 'Download video/audio with godm',
    contexts: ['video', 'audio'],
  });

  chrome.contextMenus.create({
    id: 'godm-download-page',
    title: 'Download video on this page with godm',
    contexts: ['page'],
  });

  // Set default settings
  chrome.storage.local.get(['interceptDownloads', 'showVideoWidget'], (res) => {
    if (res.interceptDownloads === undefined) {
      chrome.storage.local.set({ interceptDownloads: true });
    }
    if (res.showVideoWidget === undefined) {
      chrome.storage.local.set({ showVideoWidget: true });
    }
  });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'godm-download-link' && info.linkUrl) {
    sendToGodm(info.linkUrl, '', tab?.url || '');
  } else if (info.menuItemId === 'godm-download-media' && (info.srcUrl || info.linkUrl)) {
    sendToGodm(info.srcUrl || info.linkUrl, '', tab?.url || '');
  } else if (info.menuItemId === 'godm-download-page' && tab?.url) {
    sendToGodm(tab.url, tab.title || '', tab.url);
  }
});

// List of file extensions to automatically intercept
const INTERCEPT_EXTENSIONS = [
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso', 'exe', 'msi', 'apk', 'dmg',
  'mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'wav', 'flac', 'pdf', 'epub'
];

// Intercept browser downloads
chrome.downloads.onCreated.addListener(async (downloadItem) => {
  const { interceptDownloads } = await chrome.storage.local.get('interceptDownloads');
  if (interceptDownloads === false) return;

  const rawUrl = downloadItem.finalUrl || downloadItem.url;
  if (!rawUrl || rawUrl.startsWith('blob:') || rawUrl.startsWith('data:') || rawUrl.startsWith('chrome:')) {
    return;
  }

  // Check if extension matches or file is sizable
  const cleanUrl = rawUrl.split('?')[0].toLowerCase();
  const shouldIntercept = INTERCEPT_EXTENSIONS.some((ext) => cleanUrl.endsWith('.' + ext));

  if (shouldIntercept) {
    // Attempt sending to godm
    const ok = await sendToGodm(rawUrl, downloadItem.filename || '', downloadItem.referrer || '');
    if (ok) {
      // Cancel the browser's slow single-thread download
      chrome.downloads.cancel(downloadItem.id, () => {
        // Erase cancelled item from browser download shelf
        chrome.downloads.erase({ id: downloadItem.id });
      });
    }
  }
});

// Handle messages from content script (Video Sniffer Widget)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'download-url') {
    sendToGodm(msg.url, msg.filename || '', sender.tab?.url || '').then((ok) => {
      sendResponse({ success: ok });
    });
    return true; // Keep message channel open for async response
  }
  if (msg.action === 'check-status') {
    checkGodmOnline().then((online) => {
      sendResponse({ online });
    });
    return true;
  }
});

// Send download request to local godm RPC server
async function sendToGodm(url, filename = '', referrer = '') {
  try {
    const res = await fetch(`${GODM_API}/api/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, filename, referrer }),
    });
    return res.ok;
  } catch (err) {
    console.warn('godm desktop app is not running:', err);
    return false;
  }
}

// Check if godm desktop app is open and listening
async function checkGodmOnline() {
  try {
    const res = await fetch(`${GODM_API}/api/ping`, { method: 'GET' });
    return res.ok;
  } catch (err) {
    return false;
  }
}
