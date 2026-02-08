// ShadowBlock - Content Script
// Hides ad elements that slip through network blocking

'use strict';

(function() {
  // Prevent multiple injections
  if (window.__shadowBlockLoaded) return;
  window.__shadowBlockLoaded = true;

  let isEnabled = true;
  let hiddenCount = 0;
  
  // Check enabled state
  browser.runtime.sendMessage({ type: 'getState' }).then(response => {
    isEnabled = response?.enabled ?? true;
    if (isEnabled) {
      hideAds();
      observeDOM();
    }
  }).catch(() => {
    // Fallback - just run
    hideAds();
    observeDOM();
  });

  // Hide ad elements
  function hideAds() {
    if (!isEnabled) return;
    
    AD_SELECTORS.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
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
      } catch (e) {
        // Invalid selector
      }
    });
    
    // Hide elements by aria-label
    const ariaAds = document.querySelectorAll('[aria-label*="advertisement" i], [aria-label*="sponsored" i]');
    ariaAds.forEach(el => {
      if (!el.dataset.shadowBlockHidden) {
        el.style.setProperty('display', 'none', 'important');
        el.dataset.shadowBlockHidden = 'true';
        hiddenCount++;
      }
    });
    
    // Hide iframes from ad domains
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      if (!iframe.dataset.shadowBlockHidden && iframe.src) {
        const isAd = BLOCKED_DOMAINS.some(domain => 
          iframe.src.includes(domain)
        );
        if (isAd) {
          iframe.style.setProperty('display', 'none', 'important');
          iframe.dataset.shadowBlockHidden = 'true';
          hiddenCount++;
        }
      }
    });
  }

  // Observe DOM for dynamically added ads
  function observeDOM() {
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldScan = true;
          break;
        }
      }
      
      if (shouldScan) {
        requestIdleCallback ? requestIdleCallback(hideAds) : setTimeout(hideAds, 100);
      }
    });
    
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Remove ad placeholders / empty ad containers
  function cleanupEmptyContainers() {
    const containers = document.querySelectorAll('[class*="ad-"], [id*="ad-"], [class*="advertisement"]');
    containers.forEach(container => {
      if (container.offsetHeight === 0 || 
          (container.children.length === 0 && container.textContent.trim() === '')) {
        container.style.setProperty('display', 'none', 'important');
      }
    });
  }

  // Run cleanup after page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      hideAds();
      setTimeout(cleanupEmptyContainers, 1000);
    });
  } else {
    hideAds();
    setTimeout(cleanupEmptyContainers, 1000);
  }
  
  // Final pass after full load
  window.addEventListener('load', () => {
    hideAds();
    setTimeout(cleanupEmptyContainers, 2000);
  });

  // Listen for enable/disable messages
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'toggledEnabled') {
      isEnabled = message.enabled;
      if (isEnabled) {
        hideAds();
      } else {
        // Show hidden elements
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
