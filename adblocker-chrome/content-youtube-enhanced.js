// SimplShadow - YouTube SSAI Ad Blocker
// Handles Server-Side Ad Insertion where ads are embedded in video stream
// Aggressive approach: detect ad segments and skip/seek past them

'use strict';

(function() {
  if (window._simplshadowYTEnhanced) return;
  window._simplshadowYTEnhanced = true;
  
  const DEBUG = false;
  const log = DEBUG ? console.log.bind(console, '[SimplShadow YT]') : () => {};
  
  let isEnabled = false;
  let initialized = false;
  let adCheckInterval = null;
  let skipBtnInterval = null;
  let observer = null;
  
  // ============ Ad Detection ============
  
  function getPlayer() {
    return document.querySelector('#movie_player');
  }
  
  function getVideo() {
    return document.querySelector('video.html5-main-video');
  }
  
  function isAdPlaying() {
    const player = getPlayer();
    if (!player) return false;
    
    // Check for ad-showing class (most reliable)
    if (player.classList.contains('ad-showing')) return true;
    if (player.classList.contains('ad-interrupting')) return true;
    
    // Check for ad overlay elements
    if (document.querySelector('.ytp-ad-player-overlay')) return true;
    if (document.querySelector('.ytp-ad-preview-container')) return true;
    if (document.querySelector('.ytp-ad-text')) return true;
    
    // Check player API if available
    try {
      if (player.getAdState && player.getAdState() === 1) return true;
      const videoData = player.getVideoData?.();
      if (videoData?.isAd) return true;
    } catch(e) {}
    
    return false;
  }
  
  // ============ Ad Skipping ============
  
  // Skip button selectors (updated for 2024+ YouTube)
  const SKIP_SELECTORS = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-container button',
    'button.ytp-ad-skip-button-modern',
    '.videoAdUiSkipButton',
    '[id^="skip-button"]',
    '.ytp-ad-skip-button-slot button'
  ];
  
  function clickSkipButton() {
    for (const sel of SKIP_SELECTORS) {
      const btns = document.querySelectorAll(sel);
      for (const btn of btns) {
        if (btn && btn.offsetParent !== null) {
          try {
            btn.click();
            log('Clicked skip button:', sel);
            return true;
          } catch(e) {}
        }
      }
    }
    return false;
  }
  
  function skipAd() {
    const video = getVideo();
    const player = getPlayer();
    
    if (!video || !isAdPlaying()) return;
    
    log('Ad detected, attempting skip...');
    
    // Method 1: Click skip button (always try first)
    if (clickSkipButton()) return;
    
    // Method 2: Seek to end of ad segment
    if (video.duration && isFinite(video.duration) && video.duration > 0) {
      // For short ads, seek directly to end
      if (video.duration < 120) {
        video.currentTime = video.duration;
        log('Seeked to end:', video.duration);
      }
    }
    
    // Method 3: Speed up and mute the ad
    if (video.playbackRate < 16) {
      video.playbackRate = 16;
      video.muted = true;
      log('Sped up ad to 16x');
    }
    
    // Method 4: Try player API skip
    try {
      if (player?.skipAd) player.skipAd();
      if (player?.cancelPlayback) player.cancelPlayback();
    } catch(e) {}
  }
  
  // ============ Ad Overlay Removal ============
  
  const AD_OVERLAY_SELECTORS = [
    '.ytp-ad-overlay-container',
    '.ytp-ad-overlay-slot',
    '.ytp-ad-text-overlay',
    '.ytp-ad-image-overlay',
    '.ytp-ad-player-overlay',
    '.ytp-ad-player-overlay-layout',
    '.ytp-ad-player-overlay-instream-info',
    '.ytp-ad-action-interstitial',
    '.ytp-ad-action-interstitial-background-container',
    '.ytp-ad-action-interstitial-slot',
    '.ytp-ad-message-container',
    '.video-ads',
    '.ytp-ad-progress',
    '.ytp-ad-progress-list',
    'ytd-ad-slot-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-banner-promo-renderer',
    'ytd-promoted-sparkles-web-renderer',
    '#masthead-ad'
  ];
  
  function removeAdOverlays() {
    for (const sel of AD_OVERLAY_SELECTORS) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
      }
    }
  }
  
  // ============ Video Restoration ============
  
  function restoreVideo() {
    const video = getVideo();
    if (video && !isAdPlaying()) {
      if (video.playbackRate > 1 && video.playbackRate !== 1) {
        video.playbackRate = 1;
      }
      if (video.muted) {
        // Only unmute if it was muted by us
        // Check localStorage for user's original mute state
        const wasMuted = sessionStorage.getItem('simplshadow_was_muted');
        if (wasMuted !== 'true') {
          video.muted = false;
        }
      }
    }
  }
  
  // ============ Main Ad Check Loop ============
  
  function checkForAds() {
    if (!isEnabled) return;
    
    if (isAdPlaying()) {
      skipAd();
      removeAdOverlays();
    } else {
      restoreVideo();
    }
  }
  
  function startSkipButtonWatcher() {
    if (skipBtnInterval) return;
    
    // Watch for skip button very aggressively (every 50ms)
    skipBtnInterval = setInterval(() => {
      if (!isEnabled) return;
      if (isAdPlaying()) {
        clickSkipButton();
      }
    }, 50);
  }
  
  // ============ Video Event Listeners ============
  
  function setupVideoListeners() {
    const video = getVideo();
    if (!video || video._simplshadowListeners) return;
    video._simplshadowListeners = true;
    
    // Save initial mute state
    sessionStorage.setItem('simplshadow_was_muted', video.muted ? 'true' : 'false');
    
    video.addEventListener('playing', checkForAds);
    video.addEventListener('timeupdate', () => {
      if (isAdPlaying() && video.duration < 120) {
        // If we're in an ad, keep trying to skip
        skipAd();
      }
    });
    
    // Detect when video source changes (potential ad segment)
    video.addEventListener('loadeddata', () => {
      if (isAdPlaying()) {
        skipAd();
      }
    });
  }
  
  // ============ Mutation Observer ============
  
  function setupObserver() {
    if (observer) return;
    
    observer = new MutationObserver((mutations) => {
      if (!isEnabled) return;
      
      // Check if ad-showing class was added
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          const target = mutation.target;
          if (target.id === 'movie_player') {
            if (target.classList.contains('ad-showing') || target.classList.contains('ad-interrupting')) {
              log('Ad class detected via observer');
              skipAd();
              removeAdOverlays();
            } else {
              restoreVideo();
            }
          }
        }
      }
      
      // Check for new ad elements
      if (document.querySelector('.ytp-ad-player-overlay, .ytp-ad-text')) {
        skipAd();
        removeAdOverlays();
      }
    });
    
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }
  
  // ============ Initialization ============
  
  function init() {
    if (initialized || !isEnabled) return;
    initialized = true;
    
    log('Initializing YouTube SSAI blocker');
    
    // Start aggressive ad checking (every 500ms)
    adCheckInterval = setInterval(checkForAds, 500);
    
    // Start skip button watcher
    startSkipButtonWatcher();
    
    // Setup observers
    setupObserver();
    setupVideoListeners();
    
    // Initial check
    removeAdOverlays();
    checkForAds();
    
    // Re-setup video listeners on navigation (YouTube SPA)
    const navObserver = new MutationObserver(() => {
      setupVideoListeners();
    });
    if (document.body) {
      navObserver.observe(document.body, { childList: true, subtree: true });
    }
    
    log('YouTube SSAI blocker initialized');
  }
  
  function cleanup() {
    log('Cleaning up YouTube blocker');
    initialized = false;
    
    if (adCheckInterval) {
      clearInterval(adCheckInterval);
      adCheckInterval = null;
    }
    if (skipBtnInterval) {
      clearInterval(skipBtnInterval);
      skipBtnInterval = null;
    }
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    
    restoreVideo();
  }
  
  // ============ State Management ============
  
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'toggledEnabled') {
      isEnabled = msg.enabled;
      if (isEnabled) {
        init();
      } else {
        cleanup();
      }
    }
  });
  
  // Check initial state
  chrome.storage.local.get(['shadowBlockState'], (result) => {
    isEnabled = result.shadowBlockState?.enabled ?? false;
    if (isEnabled) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    }
  });
  
  // Backup state check
  chrome.runtime.sendMessage({ type: 'getState' }).then(response => {
    if (response?.enabled && !initialized) {
      isEnabled = true;
      init();
    }
  }).catch(() => {});
})();
