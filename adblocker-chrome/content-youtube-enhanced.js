// SimplShadow - YouTube Ad Handler
// Simple approach: click skip buttons + hide banner ads only

'use strict';

(function() {
  if (window._simplshadowYTEnhanced) return;
  window._simplshadowYTEnhanced = true;
  
  let isEnabled = false;
  let skipInterval = null;
  let bannerInterval = null;
  
  // ========== Skip Button Clicking ==========
  
  const SKIP_SELECTORS = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    'button.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-container button',
    '[id^="skip-button"]'
  ];
  
  function clickSkipButton() {
    for (const sel of SKIP_SELECTORS) {
      const btns = document.querySelectorAll(sel);
      for (const btn of btns) {
        if (btn && btn.offsetParent !== null) {
          try {
            btn.click();
            return true;
          } catch(e) {}
        }
      }
    }
    return false;
  }
  
  function isAdPlaying() {
    const player = document.querySelector('#movie_player');
    if (!player) return false;
    return player.classList.contains('ad-showing') || 
           player.classList.contains('ad-interrupting');
  }
  
  function handleVideoAd() {
    if (!isEnabled) return;
    
    // Try to click skip button
    if (clickSkipButton()) return;
    
    // If ad is playing, try to seek to end
    if (isAdPlaying()) {
      const video = document.querySelector('video.html5-main-video');
      if (video && video.duration && isFinite(video.duration) && video.duration > 0 && video.duration < 300) {
        video.currentTime = video.duration;
      }
    }
  }
  
  // ========== Banner Ad Hiding ==========
  // Only hide banner/sidebar ads - NOT skip button or video player elements
  
  const BANNER_SELECTORS = [
    // Sidebar and feed ads
    'ytd-ad-slot-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-banner-promo-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-display-ad-renderer',
    '#masthead-ad',
    // Overlay ads on video (text overlays, NOT skip button)
    '.ytp-ad-overlay-container',
    '.ytp-ad-text-overlay',
    '.ytp-ad-image-overlay'
  ];
  
  function hideBannerAds() {
    if (!isEnabled) return;
    
    for (const sel of BANNER_SELECTORS) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (el.style.display !== 'none') {
          el.style.setProperty('display', 'none', 'important');
        }
      }
    }
  }
  
  // ========== Initialization ==========
  
  function start() {
    if (skipInterval) return;
    
    // Check for skip button frequently
    skipInterval = setInterval(handleVideoAd, 100);
    
    // Hide banner ads less frequently
    bannerInterval = setInterval(hideBannerAds, 500);
    
    // Initial run
    hideBannerAds();
  }
  
  function stop() {
    if (skipInterval) {
      clearInterval(skipInterval);
      skipInterval = null;
    }
    if (bannerInterval) {
      clearInterval(bannerInterval);
      bannerInterval = null;
    }
  }
  
  // ========== State Management ==========
  
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'toggledEnabled') {
      isEnabled = msg.enabled;
      if (isEnabled) {
        start();
      } else {
        stop();
      }
    }
  });
  
  // Check initial state
  chrome.storage.local.get(['shadowBlockState'], (result) => {
    isEnabled = result.shadowBlockState?.enabled ?? false;
    if (isEnabled) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
      } else {
        start();
      }
    }
  });
})();
