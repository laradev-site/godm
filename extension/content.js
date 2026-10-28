// godm Universal Video Sniffer & Floating Download Bar
(function () {
  'use strict';

  let widgetEnabled = true;
  const detectedStreams = [];

  chrome.storage.local.get('showVideoWidget', (res) => {
    if (res.showVideoWidget !== undefined) {
      widgetEnabled = res.showVideoWidget;
    }
  });

  // Check if current site is a known video platform
  const hostname = window.location.hostname.toLowerCase();
  const isYouTube = hostname.includes('youtube.com') || hostname.includes('youtu.be');
  const isTikTok = hostname.includes('tiktok.com');
  const isInstagram = hostname.includes('instagram.com');
  const isTwitter = hostname.includes('twitter.com') || hostname.includes('x.com');
  const isFacebook = hostname.includes('facebook.com') || hostname.includes('fb.watch');
  const isReddit = hostname.includes('reddit.com');

  // Listen for background media sniffer events
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'media-detected' && msg.stream) {
      if (!detectedStreams.some((s) => s.url === msg.stream.url)) {
        detectedStreams.push(msg.stream);
      }
    }
  });

  // Helper: clean & normalize video URL (strip DASH chunk slicing & sequencing)
  function cleanMediaUrl(raw) {
    if (!raw) return '';
    const decoded = raw
      .replace(/\\u0025/g, '%')
      .replace(/\\u0026/g, '&')
      .replace(/\\\//g, '/')
      .replace(/\\/g, '')
      .replace(/&amp;/g, '&');
    try {
      const u = new URL(decoded);
      u.searchParams.delete('bytestart');
      u.searchParams.delete('byteend');
      u.searchParams.delete('range');
      u.searchParams.delete('sq');
      u.searchParams.delete('segment');
      u.searchParams.delete('seg');
      u.searchParams.delete('chunk');
      return u.toString();
    } catch {
      return decoded.replace(/[?&](?:bytestart|byteend|range|sq|segment|seg|chunk)=\d+/g, '');
    }
  }

  // Extract direct stream URLs for Facebook (including private reels / videos)
  function extractFacebookDirectUrls() {
    const direct = [];
    try {
      // 1. Search full page HTML (includes all inline scripts, Relay caches, and DOM)
      const fullHtml = document.documentElement ? document.documentElement.innerHTML : '';

      // High Definition (HD) Streams (progressive MP4 with both audio & video)
      const hdRegex = /\\?"(?:browser_native_hd_url|playable_url_quality_hd|hd_src|hd_src_no_ratelimit)\\?"\s*:\s*\\?"(https?:[^"\\]+?(?:\\.[^"\\]+?)*)\\?"/g;
      for (const m of fullHtml.matchAll(hdRegex)) {
        const clean = cleanMediaUrl(m[1]);
        if (clean && clean.includes('fbcdn.net') && !direct.some((item) => item.url === clean)) {
          direct.push({ url: clean, quality: 'HD Video (1080p/720p)', contentType: 'video/mp4' });
        }
      }

      // Standard Definition (SD) Streams
      const sdRegex = /\\?"(?:browser_native_sd_url|playable_url|sd_src|sd_src_no_ratelimit|progressive_download_url)\\?"\s*:\s*\\?"(https?:[^"\\]+?(?:\\.[^"\\]+?)*)\\?"/g;
      for (const m of sdRegex) {
        const clean = cleanMediaUrl(m[1]);
        if (clean && clean.includes('fbcdn.net') && !direct.some((item) => item.url === clean)) {
          direct.push({ url: clean, quality: 'SD Video (480p/360p)', contentType: 'video/mp4' });
        }
      }

      // 2. Fallback: check video elements directly
      const videos = document.querySelectorAll('video');
      for (const v of videos) {
        const src = v.currentSrc || v.src;
        if (src && src.startsWith('http') && src.includes('fbcdn.net')) {
          const clean = cleanMediaUrl(src);
          if (clean && !direct.some((item) => item.url === clean)) {
            direct.push({ url: clean, quality: 'Direct Video Stream', contentType: 'video/mp4' });
          }
        }
      }
    } catch (e) {
      console.debug('Direct FB url extraction err:', e);
    }
    return direct;
  }

  function getCanonicalMediaURL(videoElement) {
    if (isYouTube) {
      if (window.location.pathname.startsWith('/shorts/')) {
        return window.location.href;
      }
      const urlParams = new URLSearchParams(window.location.search);
      const v = urlParams.get('v');
      if (v) {
        return `https://www.youtube.com/watch?v=${v}`;
      }
      return window.location.href;
    }

    if (isTikTok || isInstagram || isTwitter || isFacebook || isReddit) {
      return window.location.href;
    }

    if (videoElement && videoElement.currentSrc && !videoElement.currentSrc.startsWith('blob:') && !videoElement.currentSrc.startsWith('data:')) {
      return videoElement.currentSrc;
    }

    return window.location.href;
  }

  function getPlatformBadge() {
    if (isYouTube) return 'YouTube';
    if (isTikTok) return 'TikTok';
    if (isInstagram) return 'Instagram';
    if (isTwitter) return 'X / Twitter';
    if (isFacebook) return 'Facebook';
    if (isReddit) return 'Reddit';
    return 'Video';
  }

  function attachWidget(container, videoElement) {
    if (!widgetEnabled) return;
    if (container.querySelector('.godm-video-panel')) return;

    const panel = document.createElement('div');
    panel.className = 'godm-video-panel';
    const badge = getPlatformBadge();

    panel.innerHTML = `
      <div class="godm-video-btn" title="Download ${badge} video with godm (Accelerated + Authenticated)">
        <svg class="godm-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
        <span class="godm-btn-text">Download ${badge}</span>
      </div>
    `;

    const btn = panel.querySelector('.godm-video-btn');
    const textSpan = btn.querySelector('.godm-btn-text');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      const mediaUrl = getCanonicalMediaURL(videoElement);
      const title = document.title || 'Video Download';

      btn.classList.add('loading');
      textSpan.innerText = 'Extracting auth...';

      // Gather direct streams: prefer full progressive streams on Facebook
      let directStreams = [];
      if (isFacebook) {
        const fbStreams = extractFacebookDirectUrls();
        if (fbStreams.length > 0) {
          directStreams = fbStreams;
        }
      }

      if (directStreams.length === 0) {
        // Fallback to normalized network streams (deduplicated by clean URL)
        for (const s of detectedStreams) {
          const clean = cleanMediaUrl(s.url);
          if (clean && !directStreams.some((d) => d.url === clean)) {
            directStreams.push({ ...s, url: clean });
          }
        }
      }

      chrome.runtime.sendMessage(
        {
          action: 'download-url',
          url: mediaUrl,
          filename: title,
          pageUrl: window.location.href,
          directStreams: directStreams,
        },
        (res) => {
          btn.classList.remove('loading');
          if (res && res.success) {
            btn.classList.add('success');
            textSpan.innerText = '✓ Sent to godm';
            setTimeout(() => {
              btn.classList.remove('success');
              textSpan.innerText = `Download ${badge}`;
            }, 3000);
          } else {
            btn.classList.add('error');
            textSpan.innerText = 'Start godm app!';
            setTimeout(() => {
              btn.classList.remove('error');
              textSpan.innerText = `Download ${badge}`;
            }, 3000);
          }
        }
      );
    });

    // Handle auto-hide on mouse idle
    let hideTimer = null;
    const showPanel = () => {
      panel.classList.add('visible');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        panel.classList.remove('visible');
      }, 3500);
    };

    container.addEventListener('mousemove', showPanel);
    container.addEventListener('mouseenter', showPanel);
    container.addEventListener('mouseleave', () => {
      clearTimeout(hideTimer);
      panel.classList.remove('visible');
    });

    // Make sure container has relative/absolute positioning
    const style = window.getComputedStyle(container);
    if (style.position === 'static') {
      container.style.position = 'relative';
    }

    container.appendChild(panel);
  }

  // Find candidate video containers across platforms
  function scanAndInject() {
    if (!widgetEnabled) return;

    // 1. YouTube standard player
    const ytPlayer = document.querySelector('#movie_player, .html5-video-player');
    if (ytPlayer) {
      const vid = ytPlayer.querySelector('video');
      if (vid) {
        attachWidget(ytPlayer, vid);
      }
    }

    // 2. YouTube Shorts
    const ytShorts = document.querySelectorAll('ytd-reel-video-renderer');
    ytShorts.forEach((short) => {
      const vid = short.querySelector('video');
      if (vid) {
        attachWidget(short, vid);
      }
    });

    // 3. TikTok players
    const tiktokPlayers = document.querySelectorAll('[data-e2e="feed-video"], .xgplayer');
    tiktokPlayers.forEach((player) => {
      const vid = player.querySelector('video');
      if (vid) {
        attachWidget(player, vid);
      }
    });

    // 4. Twitter / X players
    const twitterPlayers = document.querySelectorAll('[data-testid="videoPlayer"], [data-testid="videoComponent"]');
    twitterPlayers.forEach((player) => {
      const vid = player.querySelector('video');
      if (vid) {
        attachWidget(player, vid);
      }
    });

    // 5. Facebook Reels & Video players
    const fbPlayers = document.querySelectorAll('[data-video-id], [role="article"] video, [aria-label*="video" i]');
    fbPlayers.forEach((player) => {
      const vid = player.tagName === 'VIDEO' ? player : player.querySelector('video');
      if (vid && vid.offsetWidth > 160 && vid.offsetHeight > 100) {
        const parent = vid.parentElement;
        if (parent && !parent.querySelector('.godm-video-panel')) {
          attachWidget(parent, vid);
        }
      }
    });

    // 6. Generic HTML5 Videos
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach((video) => {
      if (video.offsetWidth > 160 && video.offsetHeight > 100) {
        const parent = video.parentElement;
        if (parent && !parent.querySelector('.godm-video-panel')) {
          attachWidget(parent, video);
        }
      }
    });
  }

  // Scan immediately and observe for DOM changes
  scanAndInject();
  const observer = new MutationObserver(() => scanAndInject());
  observer.observe(document.body, { childList: true, subtree: true });

  // YouTube / SPA navigation listener
  window.addEventListener('yt-navigate-finish', () => {
    setTimeout(scanAndInject, 1000);
  });
})();
