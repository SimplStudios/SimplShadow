// ShadowBlock - Enhanced YouTube Ad Blocker
// Uses YouTube Player API hooks and mutation observers
// Based on techniques used by uBlock Origin

'use strict';

(function() {
  const DEBUG = false;
  const log = DEBUG ? console.log.bind(console, '[ShadowBlock YouTube]') : () => {};
  
  // ============== Configuration ==============
  const CONFIG = {
    skipButtonInterval: 50,
    playerCheckInterval: 500,
    mutationDebounce: 100,
    adSpeedMultiplier: 16,
    checkEnabled: true
  };

  // ============== Ad Selectors ==============
  const AD_SELECTORS = [
    // Video player ads
    '.ytp-ad-module',
    '.ytp-ad-overlay-container',
    '.ytp-ad-overlay-slot',
    '.ytp-ad-image-overlay',
    '.ytp-ad-text-overlay',
    '.ytp-ad-player-overlay',
    '.ytp-ad-player-overlay-instream-info',
    '.ytp-ad-skip-button-container',
    '.ytp-ad-preview-container',
    '.ytp-ad-message-container',
    '.video-ads',
    '.ytp-ad-progress',
    '.ytp-ad-progress-list',
    
    // Feed ads
    'ytd-ad-slot-renderer',
    'ytd-banner-promo-renderer',
    'ytd-video-masthead-ad-v3-renderer',
    'ytd-primetime-promo-renderer',
    'ytd-statement-banner-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-display-ad-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-video-renderer',
    'ytd-player-legacy-desktop-watch-ads-renderer',
    'ytd-compact-promoted-video-renderer',
    'ytd-action-companion-ad-renderer',
    'ytd-watch-next-secondary-results-renderer ytd-compact-promoted-item-renderer',
    
    // Masthead
    '#masthead-ad',
    'ytd-rich-item-renderer:has(.ytd-ad-slot-renderer)',
    
    // Engagement panels
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
    
    // Movie/paid content promos
    'ytd-movie-offer-module-renderer',
    '.ytp-paid-content-overlay',
    
    // Premium upsells
    'ytd-mealbar-promo-renderer',
    'tp-yt-paper-dialog:has(#premium-upsell)',
    'ytd-popup-container:has(ytd-single-option-survey-renderer)',
    '#related ytd-compact-promoted-video-renderer',
    
    // Survey/feedback overlays
    '.ytd-popup-container',
    'ytd-enforcement-message-view-model'
  ];

  // ============== State ==============
  let playerRef = null;
  let isProcessingAd = false;
  let skipAttempts = 0;
  let lastAdTime = 0;

  // ============== Helper Functions ==============
  function $(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function $$(selector, parent = document) {
    return parent.querySelectorAll(selector);
  }

  function hideElement(el) {
    if (el && el.style) {
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    }
  }

  function removeElement(el) {
    if (el && el.remove) {
      el.remove();
    }
  }

  // ============== Player API Integration ==============
  function getYTPlayer() {
    // Try different methods to get player reference
    if (playerRef && playerRef.getPlayerState) {
      return playerRef;
    }

    // Method 1: Direct element
    const moviePlayer = $('#movie_player');
    if (moviePlayer && moviePlayer.getPlayerState) {
      playerRef = moviePlayer;
      return playerRef;
    }

    // Method 2: ytd-player
    const ytdPlayer = $('ytd-player');
    if (ytdPlayer && ytdPlayer.player_) {
      playerRef = ytdPlayer.player_;
      return playerRef;
    }

    // Method 3: Window API
    if (window.yt?.player?.getPlayerByElement) {
      const el = $('#movie_player');
      if (el) {
        playerRef = window.yt.player.getPlayerByElement(el);
        return playerRef;
      }
    }

    return null;
  }

  function isAdPlaying() {
    const player = getYTPlayer();
    if (!player) return false;

    // Check player state methods
    if (typeof player.getAdState === 'function') {
      return player.getAdState() === 1;
    }

    // Check video data
    if (typeof player.getVideoData === 'function') {
      const data = player.getVideoData();
      if (data?.isAd || data?.isLivePlayback === false && data?.video_id === '') {
        return true;
      }
    }

    // DOM-based checks
    const adPlaying = $('.ad-showing, .ad-interrupting') !== null;
    const hasAdOverlay = $('.ytp-ad-player-overlay') !== null;
    const hasPreviewText = $('.ytp-ad-preview-text, .ytp-ad-preview-container') !== null;

    return adPlaying || hasAdOverlay || hasPreviewText;
  }

  function getVideoDuration() {
    const player = getYTPlayer();
    if (player?.getDuration) {
      return player.getDuration();
    }
    const video = $('video');
    return video ? video.duration : 0;
  }

  // ============== Ad Skipping Logic ==============
  function skipVideoAd() {
    const player = getYTPlayer();
    const video = $('video');

    if (!player && !video) return false;

    let skipped = false;

    // Method 1: Click skip button
    const skipButtons = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      'button.ytp-ad-skip-button-container',
      '.ytp-ad-skip-button-slot button',
      '[class*="skip"] button',
      'button[class*="skip"]'
    ];

    for (const selector of skipButtons) {
      const btn = $(selector);
      if (btn && btn.offsetParent !== null) {
        btn.click();
        log('Clicked skip button:', selector);
        skipped = true;
        break;
      }
    }

    // Method 2: Seek to end
    if (!skipped && video && isAdPlaying()) {
      const duration = video.duration;
      if (duration && isFinite(duration) && duration > 0) {
        video.currentTime = duration - 0.1;
        video.playbackRate = CONFIG.adSpeedMultiplier;
        video.muted = true;
        log('Seeked to end of ad');
        skipped = true;
      }
    }

    // Method 3: Use player API
    if (!skipped && player) {
      try {
        if (player.skipAd) {
          player.skipAd();
          log('Used player.skipAd()');
          skipped = true;
        } else if (player.nextVideo) {
          // Last resort for unskippable ads
          if (skipAttempts > 20) {
            player.nextVideo();
            log('Used player.nextVideo() as fallback');
            skipped = true;
          }
        }
      } catch (e) {}
    }

    return skipped;
  }

  function handleVideoAd() {
    if (!isAdPlaying()) {
      isProcessingAd = false;
      skipAttempts = 0;
      
      // Restore video settings
      const video = $('video');
      if (video) {
        video.playbackRate = 1;
        video.muted = false;
      }
      return;
    }

    isProcessingAd = true;
    skipAttempts++;
    lastAdTime = Date.now();

    log('Processing ad, attempt:', skipAttempts);

    // Speed up and mute ad
    const video = $('video');
    if (video && video.playbackRate !== CONFIG.adSpeedMultiplier) {
      video.playbackRate = CONFIG.adSpeedMultiplier;
      video.muted = true;
    }

    // Try to skip
    skipVideoAd();

    // Continue checking
    if (skipAttempts < 100) {
      setTimeout(handleVideoAd, CONFIG.skipButtonInterval);
    }
  }

  // ============== DOM Ad Hiding ==============
  function hideAds() {
    let hiddenCount = 0;

    for (const selector of AD_SELECTORS) {
      const elements = $$(selector);
      for (const el of elements) {
        if (el.dataset.sbHidden !== 'true') {
          hideElement(el);
          el.dataset.sbHidden = 'true';
          hiddenCount++;
        }
      }
    }

    // Remove ad containers entirely (safer than hiding for some)
    const adsToRemove = [
      'ytd-ad-slot-renderer',
      'ytd-banner-promo-renderer',
      'ytd-promoted-sparkles-web-renderer'
    ];

    for (const selector of adsToRemove) {
      const elements = $$(selector);
      for (const el of elements) {
        removeElement(el);
        hiddenCount++;
      }
    }

    if (hiddenCount > 0) {
      log('Hidden/removed', hiddenCount, 'ad elements');
    }
  }

  // ============== Anti-Adblock Detection Bypass ==============
  function bypassDetection() {
    // Override detection methods
    const overrides = {
      // Google ad detection
      'ytInitialPlayerResponse': () => {
        const orig = window.ytInitialPlayerResponse;
        if (orig?.adPlacements) {
          delete orig.adPlacements;
        }
        if (orig?.playerAds) {
          delete orig.playerAds;
        }
        return orig;
      }
    };

    // Apply overrides
    for (const [prop, handler] of Object.entries(overrides)) {
      try {
        let value = window[prop];
        Object.defineProperty(window, prop, {
          get: () => handler() ?? value,
          set: (v) => { value = v; },
          configurable: true
        });
      } catch (e) {}
    }

    // Prevent ad-related fetch requests
    const originalFetch = window.fetch;
    window.fetch = function(url, ...args) {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
      
      // Block ad-related endpoints
      const blockedPatterns = [
        '/pagead/',
        '/ptracking',
        '/api/stats/ads',
        '/get_video_info.*ad',
        'googlevideo.com/videoplayback.*ctier=L',
        'doubleclick.net',
        'googleadservices.com'
      ];

      for (const pattern of blockedPatterns) {
        if (new RegExp(pattern, 'i').test(urlStr)) {
          log('Blocked fetch:', urlStr.slice(0, 100));
          return Promise.resolve(new Response('', { status: 204 }));
        }
      }

      return originalFetch.apply(this, [url, ...args]);
    };

    // Prevent ad-related XHR
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      const urlStr = String(url);
      
      const blockedPatterns = [
        '/pagead/',
        '/ptracking',
        '/api/stats/ads',
        'doubleclick'
      ];

      for (const pattern of blockedPatterns) {
        if (urlStr.includes(pattern)) {
          this._blocked = true;
          log('Blocked XHR:', urlStr.slice(0, 100));
          return;
        }
      }

      return originalOpen.apply(this, [method, url, ...args]);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(...args) {
      if (this._blocked) {
        Object.defineProperties(this, {
          status: { value: 200 },
          readyState: { value: 4 },
          response: { value: '' },
          responseText: { value: '' }
        });
        this.dispatchEvent(new Event('load'));
        return;
      }
      return originalSend.apply(this, args);
    };
  }

  // ============== Mutation Observer ==============
  let observerTimeout = null;
  
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      // Debounce
      if (observerTimeout) return;
      
      observerTimeout = setTimeout(() => {
        observerTimeout = null;

        // Check for ads in DOM changes
        let hasAdChanges = false;
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === 1) {
                const isAd = AD_SELECTORS.some(sel => 
                  node.matches?.(sel) || node.querySelector?.(sel)
                );
                if (isAd) {
                  hasAdChanges = true;
                  break;
                }
              }
            }
          }
          if (hasAdChanges) break;
        }

        if (hasAdChanges) {
          hideAds();
        }

        // Check for video ad state changes
        const adShowing = $('.ad-showing, .ad-interrupting');
        if (adShowing && !isProcessingAd) {
          handleVideoAd();
        }

      }, CONFIG.mutationDebounce);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return observer;
  }

  // ============== Video Event Handlers ==============
  function setupVideoEventHandlers() {
    const setupForVideo = (video) => {
      if (video._sbHandled) return;
      video._sbHandled = true;

      video.addEventListener('playing', () => {
        if (isAdPlaying() && !isProcessingAd) {
          handleVideoAd();
        }
      });

      video.addEventListener('timeupdate', () => {
        // Check if we're at the start of an ad
        if (video.currentTime < 1 && isAdPlaying() && !isProcessingAd) {
          handleVideoAd();
        }
      });

      video.addEventListener('ratechange', () => {
        // If playback rate was reset during an ad, speed it up again
        if (isAdPlaying() && video.playbackRate !== CONFIG.adSpeedMultiplier) {
          video.playbackRate = CONFIG.adSpeedMultiplier;
        }
      });
    };

    // Handle existing videos
    $$('video').forEach(setupForVideo);

    // Handle new videos
    const videoObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeName === 'VIDEO') {
            setupForVideo(node);
          } else if (node.querySelector) {
            node.querySelectorAll('video').forEach(setupForVideo);
          }
        }
      }
    });

    videoObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // ============== Player API Interception ==============
  function interceptPlayerAPI() {
    // Intercept player loading to remove ads from config
    const originalParse = JSON.parse;
    JSON.parse = function(text, ...args) {
      const result = originalParse.apply(this, [text, ...args]);
      
      if (result && typeof result === 'object') {
        // Remove ad-related data
        const propsToDelete = [
          'adPlacements', 'playerAds', 'adSlots', 'adBreaks',
          'adModule', 'adConfig', 'adSafetyReason', 'advertisingId'
        ];
        
        for (const prop of propsToDelete) {
          if (prop in result) {
            delete result[prop];
          }
        }
        
        // Recursively clean nested objects
        if (result.playerResponse) {
          for (const prop of propsToDelete) {
            if (prop in result.playerResponse) {
              delete result.playerResponse[prop];
            }
          }
        }
      }
      
      return result;
    };
  }

  // ============== Periodic Checks ==============
  function startPeriodicChecks() {
    setInterval(() => {
      hideAds();
      
      if (isAdPlaying() && !isProcessingAd) {
        handleVideoAd();
      }
    }, CONFIG.playerCheckInterval);
  }

  // ============== Initialize ==============
  function init() {
    log('Initializing enhanced YouTube blocker');
    
    // Apply detection bypass first
    bypassDetection();
    interceptPlayerAPI();
    
    // Initial ad hiding
    hideAds();
    
    // Set up observers and handlers
    setupMutationObserver();
    setupVideoEventHandlers();
    startPeriodicChecks();
    
    // Handle navigation (YouTube is SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        log('Navigation detected');
        isProcessingAd = false;
        skipAttempts = 0;
        setTimeout(hideAds, 100);
      }
    }).observe(document.body, { childList: true, subtree: true });
    
    log('YouTube blocker initialized');
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
