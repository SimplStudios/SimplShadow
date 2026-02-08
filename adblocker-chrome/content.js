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

  // Check enabled state
  chrome.runtime.sendMessage({ type: 'getState' }).then(response => {
    isEnabled = response?.enabled ?? true;
    if (isEnabled) {
      hideAds();
      observeDOM();
    }
  }).catch(() => {
    hideAds();
    observeDOM();
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
    document.querySelectorAll('[class*="ad-"], [id*="ad-"], [class*="advertisement"]').forEach(container => {
      if (container.offsetHeight === 0 || 
          (container.children.length === 0 && container.textContent.trim() === '')) {
        container.style.setProperty('display', 'none', 'important');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      hideAds();
      setTimeout(cleanupEmptyContainers, 1000);
    });
  } else {
    hideAds();
    setTimeout(cleanupEmptyContainers, 1000);
  }
  
  window.addEventListener('load', () => {
    hideAds();
    setTimeout(cleanupEmptyContainers, 2000);
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'toggledEnabled') {
      isEnabled = message.enabled;
      if (isEnabled) {
        hideAds();
      } else {
        document.querySelectorAll('[data-shadow-block-hidden]').forEach(el => {
          el.style.removeProperty('display');
          el.style.removeProperty('visibility');
          el.style.removeProperty('height');
          el.style.removeProperty('min-height');
          el.style.removeProperty('max-height');
          el.style.removeProperty('overflow');
          el.style.removeProperty('pointer-events');
          delete el.dataset.shadowBlockHidden;
        });
      }
    }
  });

})();
