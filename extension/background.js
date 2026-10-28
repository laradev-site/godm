const GODM_API = 'http://127.0.0.1:9246';

// Cache for detected media streams per tab: tabId -> array of stream items
const tabMediaStreams = new Map();
// Throttle map for cookie syncing: domain -> lastSyncTimestamp
const lastCookieSync = new Map();

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

  chrome.contextMenus.create({
    id: 'godm-sync-cookies',
    title: 'Sync session cookies to godm',
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
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const pageUrl = tab?.url || '';
  if (info.menuItemId === 'godm-download-link' && info.linkUrl) {
    await sendToGodm({
      url: info.linkUrl,
      referrer: pageUrl,
      pageUrl: pageUrl,
      tabId: tab?.id,
    });
  } else if (info.menuItemId === 'godm-download-media' && (info.srcUrl || info.linkUrl)) {
    await sendToGodm({
      url: info.srcUrl || info.linkUrl,
      referrer: pageUrl,
      pageUrl: pageUrl,
      tabId: tab?.id,
    });
  } else if (info.menuItemId === 'godm-download-page' && pageUrl) {
    await sendToGodm({
      url: pageUrl,
      filename: tab.title || '',
      referrer: pageUrl,
      pageUrl: pageUrl,
      tabId: tab?.id,
    });
  } else if (info.menuItemId === 'godm-sync-cookies' && pageUrl) {
    await syncCookiesForUrl(pageUrl);
  }
});

// Clean up tab stream cache when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabMediaStreams.delete(tabId);
});

// Helper: normalize media URLs by stripping chunk slicing parameters (bytestart/byteend/range)
function normalizeMediaUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    u.searchParams.delete('bytestart');
    u.searchParams.delete('byteend');
    u.searchParams.delete('range');
    return u.toString();
  } catch {
    return rawUrl.replace(/[?&](?:bytestart|byteend|range)=\d+/g, '');
  }
}

// Media Stream Sniffer: intercept video/audio streams in real time
chrome.webRequest.onResponseStarted.addListener(
  (details) => {
    if (details.tabId < 0) return;

    const rawUrl = details.url;
    if (!rawUrl || rawUrl.startsWith('blob:') || rawUrl.startsWith('data:') || rawUrl.startsWith('chrome:')) {
      return;
    }

    // Exclude static assets, scripts, stylesheets, and telemetry
    if (
      rawUrl.includes('/rsrc.php/') ||
      rawUrl.includes('/static.xx.') ||
      rawUrl.includes('.js') ||
      rawUrl.includes('.css') ||
      rawUrl.includes('analytics') ||
      rawUrl.includes('logging') ||
      rawUrl.includes('/ajax/') ||
      rawUrl.includes('google-analytics') ||
      rawUrl.includes('doubleclick')
    ) {
      return;
    }

    let contentType = '';
    let contentLength = 0;
    let contentRangeTotal = 0;
    if (details.responseHeaders) {
      for (const h of details.responseHeaders) {
        const name = h.name.toLowerCase();
        if (name === 'content-type') contentType = h.value.toLowerCase();
        if (name === 'content-length') contentLength = parseInt(h.value, 10) || 0;
        if (name === 'content-range') {
          // Format: bytes 0-1024/15849200 -> total is 15849200
          const match = h.value.match(/\/(\d+)/);
          if (match && match[1]) {
            contentRangeTotal = parseInt(match[1], 10) || 0;
          }
        }
      }
    }

    // Disregard non-media content types
    if (
      contentType.includes('text/') ||
      contentType.includes('image/') ||
      contentType.includes('javascript') ||
      contentType.includes('json')
    ) {
      return;
    }

    const isVideoType =
      contentType.includes('video/') ||
      contentType.includes('audio/') ||
      contentType.includes('application/vnd.apple.mpegurl') ||
      contentType.includes('application/dash+xml');

    const isVideoUrl =
      /\.(mp4|m4v|webm|mkv|m3u8|mpd)(\?|$)/i.test(rawUrl) ||
      (rawUrl.includes('fbcdn.net') && (rawUrl.includes('/v/') || isVideoType));

    if (!isVideoType && !isVideoUrl) {
      return;
    }

    // Normalize URL: strip byte-range chunk slicing parameters
    const cleanUrl = normalizeMediaUrl(rawUrl);

    // Calculate real size: prefer full Content-Range length over chunk length
    const realSize = contentRangeTotal > 0 ? contentRangeTotal : contentLength;

    // Filter out tiny snippets (< 100 KB with no Content-Range and not a manifest)
    if (realSize < 100 * 1024 && contentRangeTotal === 0 && !cleanUrl.includes('.m3u8') && !cleanUrl.includes('.mpd')) {
      return;
    }

    const list = tabMediaStreams.get(details.tabId) || [];
    const existingIndex = list.findIndex((item) => item.url === cleanUrl);

    if (existingIndex >= 0) {
      // If we got a better size estimate from another chunk, update it
      if (realSize > list[existingIndex].size) {
        list[existingIndex].size = realSize;
      }
    } else {
      const streamItem = {
        url: cleanUrl,
        contentType: contentType || 'video/mp4',
        size: realSize,
        timestamp: Date.now(),
      };
      list.push(streamItem);
      if (list.length > 25) list.shift();
      tabMediaStreams.set(details.tabId, list);

      // Notify tab content script
      chrome.tabs.sendMessage(details.tabId, {
        action: 'media-detected',
        stream: streamItem,
      }).catch(() => {});
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// Intercept browser file downloads
const INTERCEPT_EXTENSIONS = [
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso', 'exe', 'msi', 'apk', 'dmg',
  'mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'wav', 'flac', 'pdf', 'epub'
];

chrome.downloads.onCreated.addListener(async (downloadItem) => {
  const { interceptDownloads } = await chrome.storage.local.get('interceptDownloads');
  if (interceptDownloads === false) return;

  const rawUrl = downloadItem.finalUrl || downloadItem.url;
  if (!rawUrl || rawUrl.startsWith('blob:') || rawUrl.startsWith('data:') || rawUrl.startsWith('chrome:')) {
    return;
  }

  const cleanUrl = rawUrl.split('?')[0].toLowerCase();
  const shouldIntercept = INTERCEPT_EXTENSIONS.some((ext) => cleanUrl.endsWith('.' + ext));

  if (shouldIntercept) {
    const ok = await sendToGodm({
      url: rawUrl,
      filename: downloadItem.filename || '',
      referrer: downloadItem.referrer || '',
      pageUrl: downloadItem.referrer || '',
    });
    if (ok) {
      chrome.downloads.cancel(downloadItem.id, () => {
        chrome.downloads.erase({ id: downloadItem.id });
      });
    }
  }
});

// Automatically sync cookies when user visits major media platforms
const AUTH_MEDIA_DOMAINS = [
  'facebook.com', 'fb.watch', 'instagram.com', 'youtube.com', 'tiktok.com', 'x.com', 'twitter.com', 'reddit.com'
];

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab?.url) {
    const url = tab.url;
    const isAuthPlatform = AUTH_MEDIA_DOMAINS.some((d) => url.includes(d));
    if (isAuthPlatform) {
      // Sync cookies in background (throttled to once every 10 minutes per domain)
      syncCookiesForUrl(url, false);
    }
  }
});

// Helper to extract domain from URL
function getDomain(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.replace(/^(www|m)\./, '');
  } catch {
    return '';
  }
}

// Extract cookies for URL and format into Netscape and Header strings
async function getCookiesForUrl(url, pageUrl) {
  try {
    const urlsToFetch = [];
    if (pageUrl) urlsToFetch.push(pageUrl);
    if (url && url !== pageUrl && url.startsWith('http')) urlsToFetch.push(url);

    let allCookies = [];
    for (const u of urlsToFetch) {
      try {
        const cookies = await chrome.cookies.getAll({ url: u });
        if (cookies && cookies.length > 0) {
          allCookies.push(...cookies);
        }
      } catch (e) {
        console.debug('Failed to get cookies for url:', u, e);
      }
    }

    // Also get cookies for primary domain
    const domain = getDomain(pageUrl || url);
    if (domain) {
      try {
        const domainCookies = await chrome.cookies.getAll({ domain });
        if (domainCookies && domainCookies.length > 0) {
          allCookies.push(...domainCookies);
        }
      } catch (e) {
        console.debug('Failed to get cookies for domain:', domain, e);
      }
    }

    // Deduplicate cookies
    const cookieMap = new Map();
    for (const c of allCookies) {
      const key = `${c.domain}:${c.path}:${c.name}`;
      cookieMap.set(key, c);
    }
    const uniqueCookies = Array.from(cookieMap.values());

    // 1. Standard Cookie header string: "key1=val1; key2=val2"
    const cookieHeader = uniqueCookies.map((c) => `${c.name}=${c.value}`).join('; ');

    // 2. Netscape HTTP Cookie File format (yt-dlp, curl, wget standard)
    let netscapeJar = '# Netscape HTTP Cookie File\n# Generated by godm browser extension\n\n';
    const futureExpiry = Math.round(Date.now() / 1000) + 86400 * 365;
    for (const c of uniqueCookies) {
      const d = c.domain.startsWith('.') ? c.domain : `.${c.domain}`;
      const flag = c.hostOnly ? 'FALSE' : 'TRUE';
      const path = c.path || '/';
      const secure = c.secure ? 'TRUE' : 'FALSE';
      const expiry = c.expirationDate ? Math.round(c.expirationDate) : futureExpiry;
      netscapeJar += `${d}\t${flag}\t${path}\t${secure}\t${expiry}\t${c.name}\t${c.value}\n`;
    }

    return {
      cookieHeader,
      netscapeJar,
      count: uniqueCookies.length,
      domain,
    };
  } catch (err) {
    console.error('getCookiesForUrl error:', err);
    return { cookieHeader: '', netscapeJar: '', count: 0, domain: '' };
  }
}

// Sync cookies for a URL to the local godm desktop app
async function syncCookiesForUrl(url, force = true) {
  const domain = getDomain(url);
  if (!domain) return false;

  const now = Date.now();
  const lastSync = lastCookieSync.get(domain) || 0;
  if (!force && now - lastSync < 10 * 60 * 1000) {
    return true; // Already synced recently
  }

  const cookieData = await getCookiesForUrl(url);
  if (!cookieData || cookieData.count === 0) return false;

  try {
    const res = await fetch(`${GODM_API}/api/cookies/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: cookieData.domain || domain,
        cookieJar: cookieData.netscapeJar,
        cookieHeader: cookieData.cookieHeader,
      }),
    });
    if (res.ok) {
      lastCookieSync.set(domain, now);
      return true;
    }
  } catch {
    // App might not be running right now
  }
  return false;
}

// Send download request with cookies and direct streams to local godm RPC server
async function sendToGodm(params) {
  const {
    url,
    filename = '',
    referrer = '',
    pageUrl = '',
    tabId,
    directStreams = [],
  } = params;

  try {
    // Extract cookies for the target / page URL
    const cookieData = await getCookiesForUrl(url, pageUrl);

    // Get any cached media streams for this tab
    let streams = [...directStreams];
    if (tabId && tabMediaStreams.has(tabId)) {
      const cached = tabMediaStreams.get(tabId) || [];
      for (const item of cached) {
        if (!streams.some((s) => s.url === item.url)) {
          streams.push(item);
        }
      }
    }

    const payload = {
      url,
      filename,
      referrer: referrer || pageUrl,
      pageUrl: pageUrl || referrer,
      userAgent: navigator.userAgent,
      cookies: cookieData.cookieHeader,
      cookieJar: cookieData.netscapeJar,
      headers: {
        'User-Agent': navigator.userAgent,
        Referer: pageUrl || referrer || '',
        Cookie: cookieData.cookieHeader,
      },
      directStreams: streams,
    };

    const res = await fetch(`${GODM_API}/api/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.warn('godm desktop app is not reachable:', err);
    return false;
  }
}

// Handle runtime messages from content script & popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'download-url') {
    const tabId = sender.tab?.id;
    sendToGodm({
      url: msg.url,
      filename: msg.filename || '',
      referrer: sender.tab?.url || msg.pageUrl || '',
      pageUrl: sender.tab?.url || msg.pageUrl || '',
      tabId: tabId,
      directStreams: msg.directStreams || [],
    }).then((ok) => {
      sendResponse({ success: ok });
    });
    return true;
  }

  if (msg.action === 'check-status') {
    checkGodmOnline().then((online) => {
      sendResponse({ online });
    });
    return true;
  }

  if (msg.action === 'sync-cookies') {
    const url = msg.url || sender.tab?.url;
    syncCookiesForUrl(url, true).then((ok) => {
      sendResponse({ success: ok });
    });
    return true;
  }

  if (msg.action === 'get-tab-media') {
    const tabId = msg.tabId || sender.tab?.id;
    const streams = (tabId && tabMediaStreams.get(tabId)) || [];
    sendResponse({ streams });
    return true;
  }
});

// Check if godm desktop app is open and listening
async function checkGodmOnline() {
  try {
    const res = await fetch(`${GODM_API}/api/ping`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}
