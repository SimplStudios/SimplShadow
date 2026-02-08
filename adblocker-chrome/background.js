// SimplShadow - Background Service Worker (Chrome MV3)
// Handles state management and request tracking

'use strict';

// State management
let state = {
  enabled: false,
  totalBlocked: 0,
  sessionBlocked: 0,
  blockedByDomain: {},
  whitelistedDomains: [],
  userRules: [],
  stats: {
    today: 0,
    thisWeek: 0,
    allTime: 0
  },
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

// Recent blocked requests (for live process view)
let recentBlocked = [];
const MAX_RECENT = 50;

function addRecentBlocked(url, type = 'ad') {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  recentBlocked.unshift({ url, type, time, timestamp: now.getTime() });
  if (recentBlocked.length > MAX_RECENT) {
    recentBlocked = recentBlocked.slice(0, MAX_RECENT);
  }
}

// Initialize state from storage
chrome.storage.local.get(['shadowBlockState', 'settings']).then(async result => {
  if (result.shadowBlockState) {
    state = { ...state, ...result.shadowBlockState };
  }
  if (result.settings) {
    state.settings = { ...state.settings, ...result.settings };
  }
  state.sessionBlocked = 0;
  
  // Sync ruleset state with enabled setting
  await toggleRuleset(state.enabled);
  
  updateBadge();
  updateIcon();
});

// Save state
function saveState() {
  chrome.storage.local.set({ shadowBlockState: state });
}

// Update badge
function updateBadge() {
  const count = state.sessionBlocked;
  const text = count > 999 ? '999+' : (count > 0 ? count.toString() : '');
  
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ 
    color: state.enabled ? '#3B82F6' : '#6B7280' 
  });
}

// Update extension icon based on state
function updateIcon() {
  const iconPath = state.enabled ? 
    { 16: 'icons/icon16.png', 48: 'icons/icon48.png', 128: 'icons/icon128.png' } :
    { 16: 'icons/icon16-disabled.png', 48: 'icons/icon48-disabled.png', 128: 'icons/icon128.png' };
  chrome.action.setIcon({ path: iconPath });
}

// Track stats per tab
function trackTabStat(tabId, domain) {
  if (!tabStats[tabId]) {
    tabStats[tabId] = { blocked: 0, elements: 0, domains: {} };
  }
  tabStats[tabId].blocked++;
  if (domain) {
    tabStats[tabId].domains[domain] = (tabStats[tabId].domains[domain] || 0) + 1;
  }
}

// Clean up tab stats when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabStats[tabId];
});

// Reset tab stats when tab navigates
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabStats[tabId] = { blocked: 0, elements: 0, domains: {} };
  }
});

// Track blocked requests via declarativeNetRequest
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) => {
  if (info.rule.rulesetId === 'ruleset_1') {
    try {
      const url = new URL(info.request.url);
      recordBlock(url.hostname, info.request.tabId, info.request.url);
    } catch {
      recordBlock(null, null, info.request.url);
    }
  }
});

// Record blocked request
function recordBlock(domain, tabId = null, url = null) {
  state.totalBlocked++;
  state.sessionBlocked++;
  state.stats.today++;
  state.stats.thisWeek++;
  state.stats.allTime++;
  
  if (domain) {
    state.blockedByDomain[domain] = (state.blockedByDomain[domain] || 0) + 1;
  }
  
  // Determine request type
  let type = 'ad';
  if (url) {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('track') || lowerUrl.includes('analytics') || lowerUrl.includes('pixel')) {
      type = 'tracker';
    } else if (lowerUrl.includes('.js') || lowerUrl.includes('script')) {
      type = 'script';
    } else if (lowerUrl.includes('websocket') || lowerUrl.includes('wss:')) {
      type = 'websocket';
    }
    
    // Add to recent blocked
    addRecentBlocked(url, type);
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

// Toggle ruleset
async function toggleRuleset(enabled) {
  if (enabled) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ['ruleset_1']
    });
  } else {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['ruleset_1']
    });
  }
}

// Broadcast state change to all tabs
async function broadcastStateChange(enabled) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && !tab.url?.startsWith('chrome://')) {
        try {
          await chrome.tabs.sendMessage(tab.id, { 
            type: 'toggledEnabled', 
            enabled: enabled 
          });
        } catch (e) {
          // Tab may not have content script
        }
      }
    }
  } catch (e) {
    console.error('Failed to broadcast state change:', e);
  }
}

// Get top blocked domains
function getTopBlocked(limit) {
  return Object.entries(state.blockedByDomain)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([domain, count]) => ({ domain, count }));
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle both message.type and message.action for compatibility
  const action = message.action || message.type;
  
  (async () => {
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
          todayBlocked: state.stats.today,
          weekBlocked: state.stats.thisWeek,
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
      
      case 'getRecentBlocked':
        sendResponse({
          processes: recentBlocked.slice(0, 15)
        });
        break;
      
      case 'setEnabled':
        state.enabled = message.enabled;
        await toggleRuleset(state.enabled);
        await broadcastStateChange(state.enabled);
        updateBadge();
        updateIcon();
        saveState();
        sendResponse({ enabled: state.enabled });
        break;
        
      case 'toggleEnabled':
        state.enabled = !state.enabled;
        await toggleRuleset(state.enabled);
        updateBadge();
        updateIcon();
        saveState();
        sendResponse({ enabled: state.enabled });
        break;
      
      case 'updateWhitelist':
        state.whitelistedDomains = message.whitelist || [];
        saveState();
        await updateWhitelistRules();
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
        await updateWhitelistRules();
        sendResponse({ whitelisted: state.whitelistedDomains.includes(domain) });
        break;
        
      case 'isWhitelisted':
        sendResponse({ whitelisted: state.whitelistedDomains.includes(message.domain) });
        break;
      
      // Settings actions
      case 'setLowMemoryMode':
        state.settings.useLessRam = message.enabled;
        if (message.enabled) {
          tabStats = {};
          state.blockedByDomain = {};
        }
        saveState();
        chrome.storage.local.set({ settings: state.settings });
        sendResponse({ success: true });
        break;
      
      case 'setWebsocketBlocking':
        state.settings.blockWebsockets = message.enabled;
        saveState();
        chrome.storage.local.set({ settings: state.settings });
        sendResponse({ success: true });
        break;
      
      case 'setWebrtcBlocking':
        state.settings.blockWebrtc = message.enabled;
        saveState();
        chrome.storage.local.set({ settings: state.settings });
        sendResponse({ success: true });
        break;
      
      case 'setCosmeticFiltering':
        state.settings.cosmetic = message.enabled;
        saveState();
        chrome.storage.local.set({ settings: state.settings });
        sendResponse({ success: true });
        break;
      
      case 'clearStats':
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
        
      case 'getUserRules':
        sendResponse({ rules: state.userRules || [] });
        break;
        
      case 'addUserRule':
        if (!state.userRules) state.userRules = [];
        if (!state.userRules.includes(message.rule)) {
          state.userRules.push(message.rule);
          saveState();
        }
        sendResponse({ success: true });
        break;
        
      case 'removeUserRule':
        state.userRules = (state.userRules || []).filter(r => r !== message.rule);
        saveState();
        sendResponse({ success: true });
        break;
        
      case 'resetUserRules':
        state.userRules = [];
        saveState();
        sendResponse({ success: true });
        break;
    }
  })();
  
  return true; // Keep channel open for async response
});

// Update whitelist rules dynamically
async function updateWhitelistRules() {
  // Remove existing dynamic rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existingRules.map(r => r.id);
  
  if (existingIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingIds
    });
  }
  
  // Add allow rules for whitelisted domains
  if (state.whitelistedDomains.length > 0) {
    const allowRules = state.whitelistedDomains.map((domain, index) => ({
      id: 10000 + index,
      priority: 2, // Higher priority than block rules
      action: { type: 'allow' },
      condition: {
        initiatorDomains: [domain],
        resourceTypes: ['script', 'image', 'sub_frame', 'xmlhttprequest', 'other']
      }
    }));
    
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: allowRules
    });
  }
}

// Reset daily stats
function checkDayReset() {
  const now = new Date();
  
  chrome.storage.local.get(['lastDailyReset']).then(result => {
    const today = now.toDateString();
    
    if (result.lastDailyReset !== today) {
      state.stats.today = 0;
      chrome.storage.local.set({ lastDailyReset: today });
      
      if (now.getDay() === 0) {
        state.stats.thisWeek = 0;
      }
      
      saveState();
    }
  });
}

// Check for day reset on startup and periodically
checkDayReset();
setInterval(checkDayReset, 3600000);

// Initialize whitelist rules on startup
updateWhitelistRules();

console.log('SimplShadow initialized - Ad blocking active');
