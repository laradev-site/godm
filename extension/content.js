// godm Video Sniffer & Floating Download Bar
(function () {
  let widgetEnabled = true;

  chrome.storage.local.get('showVideoWidget', (res) => {
    if (res.showVideoWidget !== undefined) {
      widgetEnabled = res.showVideoWidget;
    }
  });

  // Check if current site is a video platform (YouTube, TikTok, Instagram, Twitter, etc.)
  const isVideoSite = /(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|twitter\.com|x\.com|facebook\.com|vimeo\.com|twitch\.tv|dailymotion\.com|reddit\.com)/i.test(
    window.location.hostname
  );

  function createFloatingButton(videoElement) {
    if (!widgetEnabled) return;
    if (videoElement.dataset.godmAttached) return;
    videoElement.dataset.godmAttached = 'true';

    const btn = document.createElement('div');
    btn.className = 'godm-video-btn';
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
      <span>Download with godm</span>
    `;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      let targetUrl = window.location.href;
      // If direct video src is available and not a dynamic site, use direct src
      if (!isVideoSite && videoElement.currentSrc && !videoElement.currentSrc.startsWith('blob:')) {
        targetUrl = videoElement.currentSrc;
      }

      btn.classList.add('loading');
      btn.querySelector('span').innerText = 'Sending...';

      chrome.runtime.sendMessage(
        {
          action: 'download-url',
          url: targetUrl,
          filename: document.title || '',
        },
        (response) => {
          btn.classList.remove('loading');
          if (response && response.success) {
            btn.classList.add('success');
            btn.querySelector('span').innerText = '✓ Sent to godm';
            setTimeout(() => {
              btn.classList.remove('success');
              btn.querySelector('span').innerText = 'Download with godm';
            }, 3000);
          } else {
            btn.classList.add('error');
            btn.querySelector('span').innerText = 'Start godm app!';
            setTimeout(() => {
              btn.classList.remove('error');
              btn.querySelector('span').innerText = 'Download with godm';
            }, 3000);
          }
        }
      );
    });

    // Position relative to parent or fixed
    const parent = videoElement.parentElement;
    if (parent && getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    if (parent) {
      parent.appendChild(btn);
    }
  }

  // Find all HTML5 video elements
  function scanVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach((v) => {
      // Only attach to visible videos with dimensions
      if (v.offsetWidth > 150 || v.offsetHeight > 100 || isVideoSite) {
        createFloatingButton(v);
      }
    });
  }

  // Initial scan and observer for dynamically inserted video players
  scanVideos();
  const observer = new MutationObserver(() => scanVideos());
  observer.observe(document.body, { childList: true, subtree: true });

  // YouTube / Single Page App navigation support
  window.addEventListener('yt-navigate-finish', () => {
    setTimeout(scanVideos, 1000);
  });
})();
