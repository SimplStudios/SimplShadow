// ShadowBlock - Content Script (Chrome)
// Hides ad elements that slip through network blocking

'use strict';

(function() {
  if (window.__shadowBlockLoaded) return;
  window.__shadowBlockLoaded = true;

  let isEnabled = true;
  let hiddenCount = 0;
  
  // Ad element selectors
  const AD_SELECTORS = [
    '[class*="ad-container"]', '[class*="ad-wrapper"]', '[class*="ad-banner"]',
    '[class*="ad-unit"]', '[class*="ad-slot"]', '[class*="adsbygoogle"]',
    '[class*="advertisement"]', '[class*="sponsored"]', '[class*="promoted"]',
    '[id*="ad-container"]', '[id*="ad-wrapper"]', '[id*="ad-banner"]',
    '[id*="advertisement"]', '[id*="google_ads"]', '[id*="sponsored"]',
    '[data-ad]', '[data-ad-slot]', '[data-ad-client]', '[data-ad-unit]',
    '[data-google-av]', '[data-ad-region]', '.adsbygoogle', 'ins.adsbygoogle',
    '#google_ads_iframe', '[id^="google_ads"]', '[id^="div-gpt-ad"]',
    '.google-auto-placed', '#ad', '#ads', '.ad', '.ads', '.advert', '.adverts',
    '.ad-space', '.ad-zone', '.afs-ads', '.sidebar-ad', '.sidebar-ads',
    '.side-ad', '#sidebar-ad', '.widget_ad', '.widget-ad', '.top-ad',
    '.top-ads', '.bottom-ad', '.footer-ad', '.header-ad', '.leaderboard-ad',
    '.native-ad', '.native-ads', '.sponsored-content', '.sponsored-post',
    '.promoted-content', '.promoted-post', '.paid-content', '.partner-content',
    '[data-sponsored]', '.video-ad', '.video-ads', '.preroll-ad', '.midroll-ad',
    '.postroll-ad', '.vast-ad', '.taboola-container', '#taboola-', '[id^="taboola"]',
    '.OUTBRAIN', '.outbrain', '[data-widget-type="taboola"]', '[data-obct]',
    '.mgid-container', '#mgid', '.zergnet', '.zemanta', '.revcontent',
    '.content-ad', '.popup-ad', '.modal-ad', '.overlay-ad', '.interstitial-ad',
    'iframe[src*="ad"]', 'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
    'iframe[id*="google_ads"]', 'a[href*="//ad."]', 'a[href*="doubleclick.net"]'
  ];

  // CSS injection for blocking (loaded dynamically)
  const BLOCKING_CSS_ID = 'simplshadow-blocking-css';
  let cssLoaded = false;

  async function injectBlockingCSS() {
    if (cssLoaded || document.getElementById(BLOCKING_CSS_ID)) return;
    
    try {
      // Fetch the CSS file from extension
      const cssUrl = chrome.runtime.getURL('content.css');
      const response = await fetch(cssUrl);
      const cssText = await response.text();
      
      const style = document.createElement('style');
      style.id = BLOCKING_CSS_ID;
      style.textContent = cssText;
      (document.head || document.documentElement).appendChild(style);
      cssLoaded = true;
    } catch (e) {
      // CSS injection failed
    }
  }

  function removeBlockingCSS() {
    const style = document.getElementById(BLOCKING_CSS_ID);
    if (style) {
      style.remove();
      cssLoaded = false;
    }
  }

  // Get current domain
  function getCurrentDomain() {
    try {
      return new URL(window.location.href).hostname;
    } catch {
      return '';
    }
  }

  // Check enabled state AND whitelist - default to false (disabled)
  chrome.runtime.sendMessage({ type: 'getState' }).then(response => {
    const globalEnabled = response?.enabled ?? false;
    const whitelist = response?.whitelist || [];
    const currentDomain = getCurrentDomain();
    
    // Check if site is whitelisted
    const isWhitelisted = whitelist.some(domain => 
      currentDomain === domain || currentDomain.endsWith('.' + domain)
    );
    
    isEnabled = globalEnabled && !isWhitelisted;
    
    if (isEnabled) {
      injectBlockingCSS();
      hideAds();
      observeDOM();
    }
  }).catch(() => {
    // Extension context invalid or disabled - don't run blocking
    isEnabled = false;
  });

  function hideAds() {
    if (!isEnabled) return;
    
    AD_SELECTORS.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => {
          if (!el.dataset.shadowBlockHidden) {
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('height', '0', 'important');
            el.style.setProperty('min-height', '0', 'important');
            el.style.setProperty('max-height', '0', 'important');
            el.style.setProperty('overflow', 'hidden', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');
            el.dataset.shadowBlockHidden = 'true';
            hiddenCount++;
          }
        });
      } catch (e) {}
    });
    
    // Hide by aria-label
    document.querySelectorAll('[aria-label*="advertisement" i], [aria-label*="sponsored" i]').forEach(el => {
      if (!el.dataset.shadowBlockHidden) {
        el.style.setProperty('display', 'none', 'important');
        el.dataset.shadowBlockHidden = 'true';
        hiddenCount++;
      }
    });
  }

  function observeDOM() {
    const observer = new MutationObserver((mutations) => {
      let shouldScan = mutations.some(m => m.addedNodes.length > 0);
      if (shouldScan) {
        requestIdleCallback ? requestIdleCallback(hideAds) : setTimeout(hideAds, 100);
      }
    });
    
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function cleanupEmptyContainers() {
    // Only select explicit ad-prefixed containers, not partial matches like "masthead-container"
    document.querySelectorAll('.ad-container, .ad-wrapper, .ad-banner, #ad-container, #ad-wrapper, #ad-banner, [class^="ad-"], [id^="ad-"]').forEach(container => {
      if (container.offsetHeight === 0 || 
          (container.children.length === 0 && container.textContent.trim() === '')) {
        container.style.setProperty('display', 'none', 'important');
      }
    });
  }

  // These only run after initial state check sets isEnabled
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (isEnabled) {
        hideAds();
        setTimeout(cleanupEmptyContainers, 1000);
      }
    });
  }
  
  window.addEventListener('load', () => {
    if (isEnabled) {
      hideAds();
      setTimeout(cleanupEmptyContainers, 2000);
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'toggledEnabled') {
      isEnabled = message.enabled;
      if (isEnabled) {
        injectBlockingCSS();
        hideAds();
        observeDOM();
      } else {
        // Restore all hidden elements
        document.querySelectorAll('[data-shadow-block-hidden="true"]').forEach(el => {
          el.style.removeProperty('display');
          el.style.removeProperty('visibility');
          el.style.removeProperty('height');
          el.style.removeProperty('min-height');
          el.style.removeProperty('max-height');
          el.style.removeProperty('overflow');
          el.style.removeProperty('pointer-events');
          delete el.dataset.shadowBlockHidden;
        });
        // Remove injected CSS
        removeBlockingCSS();
      }
    }
  });

})();
