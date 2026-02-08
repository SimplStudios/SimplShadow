// ShadowBlock - Twitch Ad Blocker
// Blocks video ads and display ads on Twitch

'use strict';

(function() {
  if (window.__shadowBlockTwitchLoaded) return;
  window.__shadowBlockTwitchLoaded = true;

  console.log('[ShadowBlock] Twitch ad blocker active');

  let adsBlocked = 0;

  // ==================== ELEMENT HIDING ====================

  const AD_SELECTORS = [
    // Video ad overlays
    '.video-player__ad-overlay',
    '.player-ad-overlay',
    '[data-a-target="video-ad-label"]',
    '[data-a-target="video-ad-countdown"]',
    
    // Ad container
    '.tw-absolute--fill:has([data-a-target="video-ad-label"])',
    'div[data-test-selector="video-ad-component"]',
    
    // Display ads
    '.stream-display-ad',
    '.channel-leaderboard-ad',
    '[data-a-target="ad-banner"]',
    '.top-nav__ad-container',
    '.side-nav-ad',
    '.home-carousel-ad',
    
    // Prime/Turbo promos (optional)
    '.prime-offers',
    '[data-a-target="prime-offer"]',
    '.channel-panels__content:has([data-a-target="prime-offer"])',
    '.prime-offer-button-container',
    
    // Gift sub promos
    '[data-a-target="gift-prompt"]',
    
    // Extensions that show ads
    '.extension-taskbar__overlay'
  ];

  function hideAdElements() {
    AD_SELECTORS.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => {
          if (!el.dataset.sbHidden) {
            el.style.setProperty('display', 'none', 'important');
            el.dataset.sbHidden = 'true';
            adsBlocked++;
          }
        });
      } catch (e) {}
    });
  }

  // ==================== VIDEO AD HANDLING ====================

  function isVideoAdPlaying() {
    // Check for ad indicators
    const adLabel = document.querySelector('[data-a-target="video-ad-label"]');
    const adOverlay = document.querySelector('.video-player__ad-overlay');
    const adCountdown = document.querySelector('[data-a-target="video-ad-countdown"]');
    
    return !!(adLabel || adOverlay || adCountdown);
  }

  function handleVideoAd() {
    if (!isVideoAdPlaying()) return;

    console.log('[ShadowBlock] Twitch video ad detected');
    
    // Hide the ad overlay
    const overlay = document.querySelector('.video-player__ad-overlay');
    if (overlay) {
      overlay.style.setProperty('display', 'none', 'important');
    }

    // Try to find and mute/speed up ad video
    const video = document.querySelector('video');
    if (video) {
      video.muted = true;
      video.playbackRate = 16;
    }

    adsBlocked++;
  }

  // ==================== WORKER OVERRIDE (ADVANCED) ====================

  // Override the M3U8 playlist to remove ad segments
  function interceptM3U8() {
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
      const url = args[0]?.toString() || '';
      
      // Intercept Twitch playlist requests
      if (url.includes('.m3u8') && url.includes('usher.ttvnw.net')) {
        return originalFetch.apply(this, args).then(response => {
          return response.text().then(text => {
            // Filter out ad segments from playlist
            const lines = text.split('\n');
            const filteredLines = lines.filter(line => {
              // Skip ad-related segments
              const isAd = line.includes('/stitched-ad/') || 
                          line.includes('Advertisement') ||
                          line.includes('ad-insertion');
              return !isAd;
            });
            
            return new Response(filteredLines.join('\n'), {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            });
          });
        });
      }
      
      // Block known ad endpoints
      if (url.includes('/ads/') || 
          url.includes('imasdk.googleapis.com') ||
          url.includes('amazon-adsystem')) {
        return Promise.resolve(new Response('', { status: 204 }));
      }
      
      return originalFetch.apply(this, args);
    };
  }

  // ==================== QUALITY SWITCH TRICK ====================

  // Sometimes switching quality can skip ads
  function tryQualitySwitch() {
    if (!isVideoAdPlaying()) return;
    
    const settingsBtn = document.querySelector('[data-a-target="player-settings-button"]');
    if (settingsBtn) {
      // This is a fallback technique - not always reliable
      console.log('[ShadowBlock] Ad detected, attempting quality switch workaround');
    }
  }

  // ==================== OBSERVER ====================

  function createObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldCheck = true;
          break;
        }
      }
      
      if (shouldCheck) {
        requestAnimationFrame(() => {
          hideAdElements();
          handleVideoAd();
        });
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    return observer;
  }

  // Poll for ads as backup
  function startPolling() {
    setInterval(() => {
      hideAdElements();
      handleVideoAd();
    }, 1000);
  }

  // ==================== INITIALIZATION ====================

  function init() {
    console.log('[ShadowBlock] Initializing Twitch blocker');
    
    // Intercept network requests
    interceptM3U8();
    
    // Initial cleanup
    hideAdElements();
    
    // Start observer
    createObserver();
    
    // Start polling
    startPolling();
    
    console.log('[ShadowBlock] Twitch blocker ready');
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
