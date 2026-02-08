// SimplShadow - Enhanced YouTube Ad Blocker
// Focuses on reliable skip button clicking and overlay removal
// Less aggressive approach for better compatibility

'use strict';

(function() {
  const DEBUG = false;
  const log = DEBUG ? console.log.bind(console, '[SimplShadow YouTube]') : () => {};
  
  // ============== Configuration ==============
  const CONFIG = {
    skipButtonInterval: 100,
    playerCheckInterval: 1000,
    mutationDebounce: 200
  };

  // State
  let skipInterval = null;
  let wasAdPlaying = false;

  // ============== Ad Selectors for DOM removal ==============
  const AD_SELECTORS = [
    // Feed and sidebar ads (safe to remove)
    'ytd-ad-slot-renderer',
    'ytd-banner-promo-renderer',
    'ytd-video-masthead-ad-v3-renderer',
    'ytd-primetime-promo-renderer',
    'ytd-statement-banner-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-display-ad-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-video-renderer',
    'ytd-compact-promoted-video-renderer',
    'ytd-action-companion-ad-renderer',
    '#masthead-ad',
    
    // Overlay ads (safe to hide)
    '.ytp-ad-overlay-container',
    '.ytp-ad-overlay-slot',
    '.ytp-ad-image-overlay',
    '.ytp-ad-text-overlay',
    
    // Premium upsells
    'ytd-mealbar-promo-renderer',
    'ytd-enforcement-message-view-model'
  ];

  // ============== Skip Button Selectors (updated for 2024) ==============
  const SKIP_SELECTORS = [
    // Modern YouTube skip button (most common)
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    
    // Container buttons
    '.ytp-ad-skip-button-container button',
    '.ytp-skip-ad-button__text',
    
    // New YouTube UI
    'button.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-slot button',
    
    // Fallbacks
    '[class*="skip-button"]',
    '[class*="skipButton"]'
  ];

  // ============== Helper Functions ==============
  function $(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function $$(selector, parent = document) {
    return parent.querySelectorAll(selector);
  }

  function hideElement(el) {
    if (el) {
      el.style.setProperty('display', 'none', 'important');
    }
  }

  // ============== Check if Ad is Playing ==============
  function isAdPlaying() {
    // Primary check: class on player
    const player = $('#movie_player');
    if (player?.classList.contains('ad-showing') || player?.classList.contains('ad-interrupting')) {
      return true;
    }
    
    // Secondary check: ad preview text visible
    const hasAdPreview = $('.ytp-ad-preview-container, .ytp-ad-text') !== null;
    
    return hasAdPreview;
  }

  // ============== Skip Button Logic ==============
  function tryClickSkipButton() {
    for (const selector of SKIP_SELECTORS) {
      const buttons = $$(selector);
      for (const btn of buttons) {
        // Check if button is visible and clickable
        if (btn && btn.offsetParent !== null && !btn.disabled) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            try {
              btn.click();
              log('Clicked skip button:', selector);
              return true;
            } catch(e) {}
          }
        }
      }
    }
    return false;
  }

  function handleAdState() {
    const adPlaying = isAdPlaying();
    
    if (adPlaying && !skipInterval) {
      // Ad started - begin checking for skip button
      log('Ad detected, watching for skip button');
      wasAdPlaying = true;
      
      skipInterval = setInterval(() => {
        if (!isAdPlaying()) {
          clearInterval(skipInterval);
          skipInterval = null;
          log('Ad ended');
          return;
        }
        tryClickSkipButton();
      }, CONFIG.skipButtonInterval);
      
    } else if (!adPlaying && wasAdPlaying) {
      // Ad ended
      wasAdPlaying = false;
      if (skipInterval) {
        clearInterval(skipInterval);
        skipInterval = null;
      }
    }
  }

  // ============== DOM Ad Hiding ==============
  function hideAds() {
    let hiddenCount = 0;

    for (const selector of AD_SELECTORS) {
      try {
        const elements = $$(selector);
        for (const el of elements) {
          if (el.dataset.sbHidden !== 'true') {
            hideElement(el);
            el.dataset.sbHidden = 'true';
            hiddenCount++;
          }
        }
      } catch(e) {}
    }

    if (hiddenCount > 0) {
      log('Hidden', hiddenCount, 'ad elements');
    }
  }

  // ============== Mutation Observer ==============
  let observerTimeout = null;
  
  function setupObserver() {
    const observer = new MutationObserver((mutations) => {
      if (observerTimeout) return;
      
      observerTimeout = setTimeout(() => {
        observerTimeout = null;
        hideAds();
        handleAdState();
      }, CONFIG.mutationDebounce);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  // ============== Initialize ==============
  function init() {
    log('Initializing SimplShadow YouTube blocker');
    
    // Initial cleanup
    hideAds();
    
    // Set up observer
    setupObserver();
    
    // Periodic check for ads
    setInterval(() => {
      handleAdState();
      hideAds();
    }, CONFIG.playerCheckInterval);
    
    // Handle SPA navigation
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        log('Navigation detected');
        
        // Clear any existing skip interval
        if (skipInterval) {
          clearInterval(skipInterval);
          skipInterval = null;
        }
        wasAdPlaying = false;
        
        setTimeout(hideAds, 500);
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
