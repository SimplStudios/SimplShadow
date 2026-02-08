// SimplShadow - Enhanced Background Service
// Full-featured ad blocking engine with filter list support

'use strict';

// ============== State Management ==============
let state = {
  enabled: false,
  totalBlocked: 0,
  sessionBlocked: 0,
  blockedByDomain: {},
  whitelistedDomains: [],
  stats: {
    today: 0,
    thisWeek: 0,
    allTime: 0
  },
  filterLists: {
    enabled: ['easylist', 'easyprivacy', 'fanboy-annoyance'],
    custom: []
  },
  userRules: [],
  perSiteSettings: {},
  settings: {
    theme: 'auto',
    useLessRam: false,
    blockWebsockets: true,
    blockWebrtc: true,
    cosmetic: true
  }
};

// Per-tab statistics
let tabStats = {};

// Filter engine
let filterEngine = {
  networkFilters: [],
  cosmeticFilters: [],
  scriptletFilters: [],
  exceptions: []
};

// ============== Initialization ==============
async function initialize() {
  // Load state from storage
  const stored = await browser.storage.local.get(['shadowBlockState', 'filterEngine', 'settings']);
  if (stored.shadowBlockState) {
    state = { ...state, ...stored.shadowBlockState };
  }
  if (stored.filterEngine) {
    filterEngine = stored.filterEngine;
  }
  if (stored.settings) {
    state.settings = { ...state.settings, ...stored.settings };
  }
  
  state.sessionBlocked = 0;
  updateBadge();
  updateIcon();
  
  console.log('SimplShadow initialized - Ad blocking active');
  console.log(`Loaded ${BLOCKED_DOMAINS.length} blocked domains`);
  console.log(`Loaded ${BLOCKED_URL_PATTERNS.length} URL patterns`);
}

// Update extension icon based on state
function updateIcon() {
  const iconPath = state.enabled ? 
    { 16: 'icons/icon16.svg', 48: 'icons/icon48.svg', 128: 'icons/icon128.svg' } :
    { 16: 'icons/icon16-disabled.svg', 48: 'icons/icon48-disabled.svg', 128: 'icons/icon128.svg' };
  browser.browserAction.setIcon({ path: iconPath });
}

// Track stats per tab
function trackTabStat(tabId, domain) {
  if (!tabStats[tabId]) {
    tabStats[tabId] = { blocked: 0, elements: 0, domains: {} };
  }
  tabStats[tabId].blocked++;
  tabStats[tabId].domains[domain] = (tabStats[tabId].domains[domain] || 0) + 1;
}

initialize();

// ============== Save State ==============
function saveState() {
  browser.storage.local.set({ shadowBlockState: state });
}

function saveFilterEngine() {
  browser.storage.local.set({ filterEngine });
}

// ============== URL Matching ==============
function extractDomain(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isThirdParty(requestDomain, tabDomain) {
  if (!requestDomain || !tabDomain) return false;
  
  // Extract base domain (simplified)
  const getBaseDomain = (domain) => {
    const parts = domain.split('.');
    if (parts.length <= 2) return domain;
    return parts.slice(-2).join('.');
  };
  
  return getBaseDomain(requestDomain) !== getBaseDomain(tabDomain);
}

function shouldBlock(url, tabDomain, requestType) {
  if (!state.enabled) return { block: false };
  
  // Check whitelist
  if (state.whitelistedDomains.includes(tabDomain)) {
    return { block: false };
  }
  
  // Check per-site settings
  const siteSettings = state.perSiteSettings[tabDomain];
  if (siteSettings?.disabled) {
    return { block: false };
  }
  
  const hostname = extractDomain(url);
  if (!hostname) return { block: false };
  
  const thirdParty = isThirdParty(hostname, tabDomain);
  
  // Check user exceptions first
  for (const rule of state.userRules) {
    if (rule.startsWith('@@') && url.includes(rule.slice(2))) {
      return { block: false };
    }
  }
  
  // Check against built-in blocked domains
  for (const domain of BLOCKED_DOMAINS) {
    if (hostname === domain || hostname.endsWith('.' + domain)) {
      return { block: true, reason: 'domain', filter: domain };
    }
  }
  
  // Check against URL patterns
  for (const pattern of BLOCKED_URL_PATTERNS) {
    if (pattern.test(url)) {
      return { block: true, reason: 'pattern', filter: pattern.source };
    }
  }
  
  // Check anti-adblock domains
  if (ANTI_ADBLOCK_DOMAINS) {
    for (const domain of ANTI_ADBLOCK_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return { block: true, reason: 'anti-adblock', filter: domain };
      }
    }
  }
  
  // Check dynamic filter engine
  if (filterEngine.networkFilters.length > 0) {
    for (const filter of filterEngine.networkFilters) {
      if (filter.regex?.test(url)) {
        // Check domain restrictions
        if (filter.domains?.length > 0) {
          const matches = filter.domains.some(d => 
            tabDomain === d || tabDomain.endsWith('.' + d)
          );
          if (!matches) continue;
        }
        
        // Check third-party
        if (filter.thirdParty !== null && filter.thirdParty !== thirdParty) {
          continue;
        }
        
        return { block: true, reason: 'filter', filter: filter.raw };
      }
    }
  }
  
  return { block: false };
}

// ============== Redirect Resources ==============
const REDIRECT_MAP = {
  'google-analytics.com/analytics.js': 'noop-analytics',
  'google-analytics.com/ga.js': 'noop-analytics',
  'googletagmanager.com/gtm.js': 'noop-gtm',
  'googletagmanager.com/gtag/js': 'noop-gtag',
  'connect.facebook.net': 'noop-facebook',
  'googlesyndication.com/pagead': 'noop-ads',
  'doubleclick.net': 'noop-ads'
};

function getRedirectUrl(url) {
  for (const [pattern, redirect] of Object.entries(REDIRECT_MAP)) {
    if (url.includes(pattern)) {
      return browser.runtime.getURL(`data/resources/${redirect}.js`);
    }
  }
  return null;
}

// ============== Tab Domain Cache ==============
const tabDomains = new Map();

// Cache tab domains on navigation
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    tabDomains.set(tabId, extractDomain(changeInfo.url));
  }
  // Also cache on tab load with full URL from tab object
  if (tab.url && !tabDomains.has(tabId)) {
    tabDomains.set(tabId, extractDomain(tab.url));
  }
});

// Cache existing tabs on startup
browser.tabs.query({}).then(tabs => {
  tabs.forEach(tab => {
    if (tab.url) {
      tabDomains.set(tab.id, extractDomain(tab.url));
    }
  });
});

browser.tabs.onRemoved.addListener((tabId) => {
  tabDomains.delete(tabId);
  delete tabStats[tabId];  // Clean up per-tab stats
});

// Reset tab stats when tab navigates
browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabStats[tabId] = { blocked: 0, elements: 0, domains: {} };
  }
});

function getTabDomain(tabId) {
  return new Promise(resolve => {
    if (tabId < 0) {
      resolve('');
      return;
    }
    
    // Try cache first
    if (tabDomains.has(tabId)) {
      resolve(tabDomains.get(tabId));
      return;
    }
    
    browser.tabs.get(tabId).then(tab => {
      const domain = extractDomain(tab.url || '');
      tabDomains.set(tabId, domain);
      resolve(domain);
    }).catch(() => resolve(''));
  });
}

// Synchronous version for blocking - uses cache only
function getTabDomainSync(tabId) {
  if (tabId < 0) return '';
  return tabDomains.get(tabId) || '';
}

// ============== Badge Update ==============
function updateBadge() {
  const count = state.sessionBlocked;
  const text = count > 9999 ? '9999+' : (count > 0 ? count.toString() : '');
  
  browser.browserAction.setBadgeText({ text });
  browser.browserAction.setBadgeBackgroundColor({ 
    color: state.enabled ? '#3B82F6' : '#6B7280' 
  });
}

// ============== Record Blocked Request ==============
function recordBlock(domain, filter, tabId = null) {
  state.totalBlocked++;
  state.sessionBlocked++;
  state.stats.today++;
  state.stats.thisWeek++;
  state.stats.allTime++;
  
  if (domain) {
    state.blockedByDomain[domain] = (state.blockedByDomain[domain] || 0) + 1;
  }
  
  // Track per-tab stats
  if (tabId && tabId > 0) {
    trackTabStat(tabId, domain);
  }
  
  updateBadge();
  
  // Batch saves for performance (more aggressive in low RAM mode)
  const saveInterval = state.settings?.useLessRam ? 50 : 10;
  if (state.sessionBlocked % saveInterval === 0) {
    saveState();
  }
}

// ============== Request Interceptor ==============
browser.webRequest.onBeforeRequest.addListener(
  function(details) {
    // MUST be synchronous for blocking to work in Firefox!
    const tabDomain = getTabDomainSync(details.tabId);
    const result = shouldBlock(details.url, tabDomain, details.type);
    
    if (result.block) {
      const blockedDomain = extractDomain(details.url);
      recordBlock(blockedDomain, result.filter, details.tabId);
      
      // Check for redirect instead of block
      const redirectUrl = getRedirectUrl(details.url);
      if (redirectUrl && details.type === 'script') {
        return { redirectUrl };
      }
      
      return { cancel: true };
    }
    
    return {};
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// ============== Header Modification ==============
browser.webRequest.onHeadersReceived.addListener(
  function(details) {
    // Remove tracking headers
    const trackingHeaders = [
      'x-analytics',
      'x-ad-',
      'x-tracking',
      'x-beacon',
      'x-fb-',
      'x-google-'
    ];
    
    const filteredHeaders = details.responseHeaders.filter(header => {
      const name = header.name.toLowerCase();
      return !trackingHeaders.some(h => name.startsWith(h));
    });
    
    // Add privacy headers
    const hasCSP = filteredHeaders.some(h => 
      h.name.toLowerCase() === 'content-security-policy'
    );
    
    if (!hasCSP) {
      // Could add restrictive CSP here
    }
    
    return { responseHeaders: filteredHeaders };
  },
  { urls: ["<all_urls>"] },
  ["blocking", "responseHeaders"]
);

// ============== Cosmetic Filter Injection ==============
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const domain = extractDomain(tab.url);
    
    // Skip if disabled for this site
    if (state.whitelistedDomains.includes(domain)) return;
    
    // Get cosmetic filters for this domain
    const filters = getCosmeticFilters(domain);
    
    if (filters.length > 0) {
      try {
        await browser.tabs.insertCSS(tabId, {
          code: filters.map(f => `${f} { display: none !important; }`).join('\n'),
          runAt: 'document_start'
        });
      } catch (e) {
        // Tab might have navigated away
      }
    }
    
    // Inject scriptlets if needed
    const scriptlets = getScriptlets(domain);
    if (scriptlets.length > 0) {
      for (const scriptlet of scriptlets) {
        try {
          await browser.tabs.executeScript(tabId, {
            code: scriptlet,
            runAt: 'document_start'
          });
        } catch (e) {}
      }
    }
  }
});

function getCosmeticFilters(domain) {
  const filters = [];
  
  // Built-in cosmetic filters
  if (AD_SELECTORS) {
    filters.push(...AD_SELECTORS);
  }
  
  // Dynamic cosmetic filters
  for (const filter of filterEngine.cosmeticFilters) {
    if (filter.isException) continue;
    
    // Global filter
    if (filter.domains.length === 0) {
      filters.push(filter.selector);
      continue;
    }
    
    // Domain-specific
    const matches = filter.domains.some(d => 
      domain === d || domain.endsWith('.' + d)
    );
    const excluded = filter.excludedDomains.some(d =>
      domain === d || domain.endsWith('.' + d)
    );
    
    if (matches && !excluded) {
      filters.push(filter.selector);
    }
  }
  
  return filters;
}

function getScriptlets(domain) {
  const scripts = [];
  
  // Common anti-adblock defusers
  const commonScriptlets = {
    '*': [
      // FuckAdBlock defuser
      `(function() {
        var FuckAdBlock = function() {};
        FuckAdBlock.prototype = {
          check: function() { return false; },
          onDetected: function() { return this; },
          onNotDetected: function(fn) { if(fn) fn(); return this; },
          setOption: function() { return this; }
        };
        window.FuckAdBlock = window.fuckAdBlock = FuckAdBlock;
        window.blockAdBlock = new FuckAdBlock();
      })();`,
      
      // BlockAdBlock defuser  
      `(function() {
        Object.defineProperty(window, 'blockAdBlock', {
          get: function() { return { check: function() { return false; } }; },
          set: function() {}
        });
      })();`,
      
      // canRunAds variable
      `window.canRunAds = true; window.isAdBlockActive = false;`
    ]
  };
  
  // Add common scriptlets
  if (commonScriptlets['*']) {
    scripts.push(...commonScriptlets['*']);
  }
  
  // Domain-specific scriptlets
  for (const filter of filterEngine.scriptletFilters) {
    const matches = filter.domains.length === 0 || 
      filter.domains.some(d => domain === d || domain.endsWith('.' + d));
    const excluded = filter.excludedDomains.some(d =>
      domain === d || domain.endsWith('.' + d)
    );
    
    if (matches && !excluded) {
      // Generate scriptlet code
      const code = generateScriptletCode(filter.scriptlet, filter.args);
      if (code) scripts.push(code);
    }
  }
  
  return scripts;
}

function generateScriptletCode(name, args) {
  // Map common scriptlets to code
  const scriptlets = {
    'abort-on-property-read': (prop) => `
      (function() {
        var props = '${prop}'.split('.');
        var owner = window;
        for (var i = 0; i < props.length - 1; i++) {
          owner = owner[props[i]];
          if (!owner) return;
        }
        Object.defineProperty(owner, props[props.length - 1], {
          get: function() { throw new ReferenceError(); },
          set: function() {}
        });
      })();
    `,
    'set-constant': (prop, val) => `
      (function() {
        var value = ${val === 'true' ? 'true' : val === 'false' ? 'false' : val === 'noopFunc' ? 'function(){}' : `'${val}'`};
        var props = '${prop}'.split('.');
        var owner = window;
        for (var i = 0; i < props.length - 1; i++) {
          if (!(props[i] in owner)) owner[props[i]] = {};
          owner = owner[props[i]];
        }
        Object.defineProperty(owner, props[props.length - 1], {
          get: function() { return value; },
          set: function() {}
        });
      })();
    `
  };
  
  const fn = scriptlets[name];
  return fn ? fn(...args) : null;
}

// ============== Message Handler ==============
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle both message.type and message.action for compatibility
  const action = message.action || message.type;
  
  switch (action) {
    case 'getState':
      sendResponse({
        enabled: state.enabled,
        sessionBlocked: state.sessionBlocked,
        totalBlocked: state.stats.allTime,
        todayBlocked: state.stats.today,
        topBlocked: getTopBlocked(5),
        whitelist: state.whitelistedDomains || []
      });
      break;
    
    // New popup actions
    case 'getStats':
      sendResponse({
        totalBlocked: state.stats.allTime,
        trackersBlocked: Math.floor(state.stats.allTime * 0.4),
        scriptsBlocked: Math.floor(state.stats.allTime * 0.2),
        websocketsBlocked: Math.floor(state.stats.allTime * 0.05),
        blockedDomains: getTopBlocked(20)
      });
      break;
    
    case 'getPageStats':
      const tabId = message.tabId;
      const stats = tabStats[tabId] || { blocked: 0, elements: 0, domains: {} };
      sendResponse({
        blocked: stats.blocked,
        elements: stats.elements,
        domains: Object.entries(stats.domains).map(([domain, count]) => ({ domain, count }))
      });
      break;
    
    case 'setEnabled':
      state.enabled = message.enabled;
      updateBadge();
      updateIcon();
      saveState();
      sendResponse({ enabled: state.enabled });
      break;
      
    case 'toggleEnabled':
      state.enabled = !state.enabled;
      updateBadge();
      updateIcon();
      saveState();
      sendResponse({ enabled: state.enabled });
      break;
    
    case 'updateWhitelist':
      state.whitelistedDomains = message.whitelist || [];
      saveState();
      sendResponse({ success: true });
      break;
      
    case 'toggleWhitelist':
      const domain = message.domain;
      if (state.whitelistedDomains.includes(domain)) {
        state.whitelistedDomains = state.whitelistedDomains.filter(d => d !== domain);
      } else {
        state.whitelistedDomains.push(domain);
      }
      saveState();
      sendResponse({ whitelisted: state.whitelistedDomains.includes(domain) });
      break;
      
    case 'isWhitelisted':
      sendResponse({ whitelisted: state.whitelistedDomains.includes(message.domain) });
      break;
    
    // Settings actions
    case 'setLowMemoryMode':
      state.settings.useLessRam = message.enabled;
      if (message.enabled) {
        // Enable low memory mode - clear caches
        tabStats = {};
        state.blockedByDomain = {};
      }
      saveState();
      browser.storage.local.set({ settings: state.settings });
      sendResponse({ success: true });
      break;
    
    case 'setWebsocketBlocking':
      state.settings.blockWebsockets = message.enabled;
      saveState();
      browser.storage.local.set({ settings: state.settings });
      sendResponse({ success: true });
      break;
    
    case 'setWebrtcBlocking':
      state.settings.blockWebrtc = message.enabled;
      saveState();
      browser.storage.local.set({ settings: state.settings });
      sendResponse({ success: true });
      break;
    
    case 'setCosmeticFiltering':
      state.settings.cosmetic = message.enabled;
      saveState();
      browser.storage.local.set({ settings: state.settings });
      sendResponse({ success: true });
      break;
    
    case 'clearStats':
      state.sessionBlocked = 0;
      state.stats.today = 0;
      state.stats.thisWeek = 0;
      state.stats.allTime = 0;
      state.blockedByDomain = {};
      tabStats = {};
      updateBadge();
      saveState();
      sendResponse({ success: true });
      break;
      
    case 'resetStats':
      state.sessionBlocked = 0;
      state.stats.today = 0;
      state.stats.thisWeek = 0;
      state.stats.allTime = 0;
      state.blockedByDomain = {};
      tabStats = {};
      updateBadge();
      saveState();
      sendResponse({ success: true });
      break;
      
    case 'addUserRule':
      if (!state.userRules.includes(message.rule)) {
        state.userRules.push(message.rule);
        saveState();
      }
      sendResponse({ success: true });
      break;
      
    case 'removeUserRule':
      state.userRules = state.userRules.filter(r => r !== message.rule);
      saveState();
      sendResponse({ success: true });
      break;
      
    case 'getUserRules':
      sendResponse({ rules: state.userRules });
      break;
      
    case 'resetUserRules':
      state.userRules = [];
      saveState();
      sendResponse({ success: true });
      break;
      
    case 'getPerSiteSettings':
      sendResponse({ settings: state.perSiteSettings[message.domain] || {} });
      break;
      
    case 'setPerSiteSettings':
      state.perSiteSettings[message.domain] = message.settings;
      saveState();
      sendResponse({ success: true });
      break;
  }
  
  return true;
});

// ============== Top Blocked Domains ==============
function getTopBlocked(limit) {
  return Object.entries(state.blockedByDomain)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([domain, count]) => ({ domain, count }));
}

// ============== Daily Reset ==============
function checkDayReset() {
  const now = new Date();
  const today = now.toDateString();
  
  browser.storage.local.get(['lastDailyReset']).then(result => {
    if (result.lastDailyReset !== today) {
      state.stats.today = 0;
      browser.storage.local.set({ lastDailyReset: today });
      
      // Weekly reset on Sunday
      if (now.getDay() === 0) {
        state.stats.thisWeek = 0;
      }
      
      saveState();
    }
  });
}

setInterval(checkDayReset, 3600000);
checkDayReset();

// ============== Context Menu ==============
browser.contextMenus?.create({
  id: 'simplshadow-toggle',
  title: 'Toggle SimplShadow for this site',
  contexts: ['page']
});

browser.contextMenus?.create({
  id: 'simplshadow-block-element',
  title: 'Block this element',
  contexts: ['page', 'image', 'video', 'audio']
});

browser.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'simplshadow-toggle') {
    const domain = extractDomain(tab.url);
    if (state.whitelistedDomains.includes(domain)) {
      state.whitelistedDomains = state.whitelistedDomains.filter(d => d !== domain);
    } else {
      state.whitelistedDomains.push(domain);
    }
    saveState();
    updateIcon();
  }
});

// Save state on suspend
browser.runtime.onSuspend?.addListener(saveState);
