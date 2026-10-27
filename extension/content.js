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

  // Extract direct stream URLs for Facebook (including private reels / videos)
  function extractFacebookDirectUrls() {
    const direct = [];
    try {
      const scripts = document.querySelectorAll('script');
      for (const s of scripts) {
        const content = s.textContent;
        if (!content) continue;
        if (!content.includes('playable_url') && !content.includes('browser_native')) continue;

        // Extract HD
        const hdMatch = content.match(/"(?:browser_native_hd_url|playable_url_quality_hd)"\s*:\s*"([^"]+)"/);
        if (hdMatch && hdMatch[1]) {
          const decoded = hdMatch[1].replace(/\\u0025/g, '%').replace(/\\u0026/g, '&').replace(/\\\//g, '/');
          if (!direct.some((item) => item.url === decoded)) {
            direct.push({ url: decoded, quality: 'HD Direct Stream (1080p/720p)', contentType: 'video/mp4' });
          }
        }

        // Extract SD
        const sdMatch = content.match(/"(?:browser_native_sd_url|playable_url)"\s*:\s*"([^"]+)"/);
        if (sdMatch && sdMatch[1]) {
          const decoded = sdMatch[1].replace(/\\u0025/g, '%').replace(/\\u0026/g, '&').replace(/\\\//g, '/');
          if (!direct.some((item) => item.url === decoded)) {
            direct.push({ url: decoded, quality: 'SD Direct Stream (480p/360p)', contentType: 'video/mp4' });
          }
        }
      }

      // Check video elements directly
      const videos = document.querySelectorAll('video');
      for (const v of videos) {
        const src = v.currentSrc || v.src;
        if (src && src.startsWith('http') && src.includes('fbcdn.net')) {
          if (!direct.some((item) => item.url === src)) {
            direct.push({ url: src, quality: 'Direct CDN Stream', contentType: 'video/mp4' });
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

      // Gather any direct streams detected
      let directStreams = [...detectedStreams];
      if (isFacebook) {
        const fbStreams = extractFacebookDirectUrls();
        for (const s of fbStreams) {
          if (!directStreams.some((d) => d.url === s.url)) {
            directStreams.push(s);
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
