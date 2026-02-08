// SimplShadow - Modern Popup Script
// Handles all popup functionality including theme, stats, and settings

class SimplShadowPopup {
  constructor() {
    this.state = {
      enabled: false,
      domain: '',
      whitelisted: false,
      stats: {
        totalBlocked: 0,
        pageBlocked: 0,
        trackersBlocked: 0,
        elements: 0,
        scriptsBlocked: 0,
        websocketsBlocked: 0
      },
      blockedDomains: [],
      settings: {
        theme: 'auto',
        useLessRam: false,
        blockWebsockets: true,
        blockWebrtc: true,
        cosmetic: true
      }
    };
    
    this.init();
  }
  
  async init() {
    await this.loadTheme();
    await this.loadState();
    this.bindEvents();
    this.updateUI();
    await this.getCurrentTab();
    await this.loadStats();
  }
  
  // Theme Management
  async loadTheme() {
    try {
      const result = await chrome.storage.local.get('settings');
      const theme = result.settings?.theme || 'auto';
      this.state.settings.theme = theme;
      this.applyTheme(theme);
    } catch (e) {
      this.applyTheme('auto');
    }
  }
  
  applyTheme(theme) {
    // Set on both html and .app elements to ensure CSS selectors match
    document.documentElement.setAttribute('data-theme', theme);
    const appEl = document.querySelector('.app');
    if (appEl) {
      appEl.setAttribute('data-theme', theme);
    }
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.value = theme;
    }
  }
  
  // Load Extension State
  async loadState() {
    try {
      const result = await chrome.storage.local.get(['enabled', 'whitelist', 'settings', 'stats']);
      this.state.enabled = result.enabled !== false;
      this.state.settings = { ...this.state.settings, ...result.settings };
      this.state.stats.totalBlocked = result.stats?.totalBlocked || 0;
    } catch (e) {
      console.error('Failed to load state:', e);
    }
  }
  
  // Get Current Tab
  async getCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.url) {
        const url = new URL(tabs[0].url);
        this.state.domain = url.hostname;
        this.state.tabId = tabs[0].id;
        
        // Check if whitelisted
        const result = await chrome.storage.local.get('whitelist');
        const whitelist = result.whitelist || [];
        this.state.whitelisted = whitelist.includes(this.state.domain);
        
        this.updateSiteCard();
      }
    } catch (e) {
      console.error('Failed to get current tab:', e);
    }
  }
  
  // Load Stats
  async loadStats() {
    try {
      // Get stats from background script
      const response = await chrome.runtime.sendMessage({ action: 'getStats' });
      if (response) {
        this.state.stats = { ...this.state.stats, ...response };
        this.state.blockedDomains = response.blockedDomains || [];
      }
      
      // Get page-specific stats
      if (this.state.tabId) {
        const pageResponse = await chrome.runtime.sendMessage({ 
          action: 'getPageStats', 
          tabId: this.state.tabId 
        });
        if (pageResponse) {
          this.state.stats.pageBlocked = pageResponse.blocked || 0;
          this.state.stats.elements = pageResponse.elements || 0;
          this.state.blockedDomains = pageResponse.domains || [];
        }
      }
      
      this.updateStatsUI();
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  }
  
  // Bind Event Listeners
  bindEvents() {
    // Power button
    const powerBtn = document.getElementById('power-btn');
    powerBtn?.addEventListener('click', () => this.togglePower());
    
    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    settingsBtn?.addEventListener('click', () => this.openSettings());
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    refreshBtn?.addEventListener('click', () => this.refreshPage());
    
    // Stats card (open details panel)
    const statsCard = document.querySelector('.stat-card.main');
    statsCard?.addEventListener('click', () => this.togglePanel());
    
    // Whitelist button
    const whitelistBtn = document.getElementById('whitelist-btn');
    whitelistBtn?.addEventListener('click', () => this.toggleWhitelist());
    
    // Close side panel
    const closePanelBtn = document.getElementById('close-panel');
    closePanelBtn?.addEventListener('click', () => this.closePanel());
    
    // Close settings
    const closeSettingsBtn = document.getElementById('close-settings');
    closeSettingsBtn?.addEventListener('click', () => this.closeSettings());
    
    // Theme select
    const themeSelect = document.getElementById('theme-select');
    themeSelect?.addEventListener('change', (e) => this.setTheme(e.target.value));
    
    // Toggle settings
    document.querySelectorAll('.setting-item .toggle-switch input').forEach(toggle => {
      toggle.addEventListener('change', (e) => this.handleSettingToggle(e));
    });
    
    // Open options
    const optionsBtn = document.getElementById('open-options');
    optionsBtn?.addEventListener('click', () => this.openOptions());
    
    // Clear stats
    const clearStatsBtn = document.getElementById('clear-stats');
    clearStatsBtn?.addEventListener('click', () => this.clearStats());
    
    // Firefox promo modal
    const whyFirefoxBtn = document.getElementById('why-firefox-btn');
    whyFirefoxBtn?.addEventListener('click', () => this.openFirefoxModal());
    
    const closeFirefoxModal = document.getElementById('close-firefox-modal');
    closeFirefoxModal?.addEventListener('click', () => this.closeFirefoxModal());
    
    // Close modal when clicking outside
    const firefoxModal = document.getElementById('firefox-modal');
    firefoxModal?.addEventListener('click', (e) => {
      if (e.target === firefoxModal) {
        this.closeFirefoxModal();
      }
    });
  }
  
  // Firefox Modal
  openFirefoxModal() {
    const modal = document.getElementById('firefox-modal');
    modal?.classList.remove('hidden');
  }
  
  closeFirefoxModal() {
    const modal = document.getElementById('firefox-modal');
    modal?.classList.add('hidden');
  }
  
  // Toggle Power
  async togglePower() {
    this.state.enabled = !this.state.enabled;
    
    try {
      await chrome.storage.local.set({ enabled: this.state.enabled });
      await chrome.runtime.sendMessage({ 
        action: 'setEnabled', 
        enabled: this.state.enabled 
      });
      
      // Update icon
      const iconPath = this.state.enabled ? 
        { 16: 'icons/icon16.svg', 48: 'icons/icon48.svg' } :
        { 16: 'icons/icon16-disabled.svg', 48: 'icons/icon48-disabled.svg' };
      
      chrome.action.setIcon({ path: iconPath });
    } catch (e) {
      console.error('Failed to toggle power:', e);
    }
    
    this.updateUI();
  }
  
  // Toggle Whitelist
  async toggleWhitelist() {
    if (!this.state.domain) return;
    
    try {
      const result = await chrome.storage.local.get('whitelist');
      let whitelist = result.whitelist || [];
      
      if (this.state.whitelisted) {
        whitelist = whitelist.filter(d => d !== this.state.domain);
      } else {
        whitelist.push(this.state.domain);
      }
      
      await chrome.storage.local.set({ whitelist });
      await chrome.runtime.sendMessage({ action: 'updateWhitelist', whitelist });
      
      this.state.whitelisted = !this.state.whitelisted;
      this.updateSiteCard();
      
      // Refresh page to apply changes
      if (this.state.tabId) {
        chrome.tabs.reload(this.state.tabId);
      }
    } catch (e) {
      console.error('Failed to toggle whitelist:', e);
    }
  }
  
  // Refresh Page
  async refreshPage() {
    if (this.state.tabId) {
      await chrome.tabs.reload(this.state.tabId);
      window.close();
    }
  }
  
  // Panel Management
  togglePanel() {
    const app = document.querySelector('.app');
    if (app.classList.contains('settings-open')) {
      app.classList.remove('settings-open');
    }
    app.classList.toggle('panel-open');
    this.updateBlockedList();
  }
  
  closePanel() {
    document.querySelector('.app')?.classList.remove('panel-open');
  }
  
  openSettings() {
    const app = document.querySelector('.app');
    if (app.classList.contains('panel-open')) {
      app.classList.remove('panel-open');
    }
    app.classList.add('settings-open');
    this.loadSettingsUI();
  }
  
  closeSettings() {
    document.querySelector('.app')?.classList.remove('settings-open');
  }
  
  // Theme
  async setTheme(theme) {
    this.state.settings.theme = theme;
    this.applyTheme(theme);
    await this.saveSettings();
  }
  
  // Settings
  async handleSettingToggle(e) {
    const setting = e.target.dataset.setting;
    const value = e.target.checked;
    
    this.state.settings[setting] = value;
    await this.saveSettings();
    
    // Notify background script
    if (setting === 'useLessRam') {
      await chrome.runtime.sendMessage({ action: 'setLowMemoryMode', enabled: value });
    } else if (setting === 'blockWebsockets') {
      await chrome.runtime.sendMessage({ action: 'setWebsocketBlocking', enabled: value });
    } else if (setting === 'blockWebrtc') {
      await chrome.runtime.sendMessage({ action: 'setWebrtcBlocking', enabled: value });
    } else if (setting === 'cosmetic') {
      await chrome.runtime.sendMessage({ action: 'setCosmeticFiltering', enabled: value });
    }
  }
  
  async saveSettings() {
    try {
      await chrome.storage.local.set({ settings: this.state.settings });
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }
  
  loadSettingsUI() {
    // Load toggle states
    const toggles = {
      'useLessRam': this.state.settings.useLessRam,
      'blockWebsockets': this.state.settings.blockWebsockets,
      'blockWebrtc': this.state.settings.blockWebrtc,
      'cosmetic': this.state.settings.cosmetic
    };
    
    for (const [setting, value] of Object.entries(toggles)) {
      const toggle = document.querySelector(`[data-setting="${setting}"]`);
      if (toggle) toggle.checked = value;
    }
    
    // Load theme
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = this.state.settings.theme;
  }
  
  openOptions() {
    chrome.runtime.openOptionsPage();
    window.close();
  }
  
  async clearStats() {
    try {
      await chrome.runtime.sendMessage({ action: 'clearStats' });
      this.state.stats = {
        totalBlocked: 0,
        pageBlocked: 0,
        trackersBlocked: 0,
        elements: 0,
        scriptsBlocked: 0,
        websocketsBlocked: 0
      };
      this.state.blockedDomains = [];
      this.updateStatsUI();
      this.updateBlockedList();
    } catch (e) {
      console.error('Failed to clear stats:', e);
    }
  }
  
  // UI Updates
  updateUI() {
    // Power button
    const powerBtn = document.getElementById('power-btn');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    
    if (this.state.enabled) {
      powerBtn?.classList.add('active');
      statusDot?.classList.add('active');
      if (statusText) statusText.textContent = 'Protection Active';
    } else {
      powerBtn?.classList.remove('active');
      statusDot?.classList.remove('active');
      if (statusText) statusText.textContent = 'Protection Paused';
    }
  }
  
  updateStatsUI() {
    // Total blocked
    const totalEl = document.getElementById('total-blocked');
    if (totalEl) totalEl.textContent = this.formatNumber(this.state.stats.totalBlocked);
    
    // Page blocked
    const pageEl = document.getElementById('page-blocked');
    if (pageEl) pageEl.textContent = this.formatNumber(this.state.stats.pageBlocked);
    
    // Elements hidden
    const elementsEl = document.getElementById('elements-hidden');
    if (elementsEl) elementsEl.textContent = this.formatNumber(this.state.stats.elements);
    
    // Footer stats
    const trackersEl = document.getElementById('trackers-blocked');
    if (trackersEl) trackersEl.textContent = this.formatNumber(this.state.stats.trackersBlocked || 0);
    
    const scriptsEl = document.getElementById('scripts-blocked');
    if (scriptsEl) scriptsEl.textContent = this.formatNumber(this.state.stats.scriptsBlocked || 0);
    
    // Update badge
    this.updateBadge();
    
    // Detail stats in side panel
    const detailTotal = document.getElementById('detail-total');
    if (detailTotal) detailTotal.textContent = this.formatNumber(this.state.stats.totalBlocked);
    
    const detailPage = document.getElementById('detail-page');
    if (detailPage) detailPage.textContent = this.formatNumber(this.state.stats.pageBlocked);
    
    const detailScripts = document.getElementById('detail-scripts');
    if (detailScripts) detailScripts.textContent = this.formatNumber(this.state.stats.scriptsBlocked || 0);
    
    const detailWebsockets = document.getElementById('detail-websockets');
    if (detailWebsockets) detailWebsockets.textContent = this.formatNumber(this.state.stats.websocketsBlocked || 0);
  }
  
  updateSiteCard() {
    const domainEl = document.getElementById('current-domain');
    const whitelistBtn = document.getElementById('whitelist-btn');
    const whitelistText = document.getElementById('whitelist-text');
    
    if (domainEl) {
      domainEl.textContent = this.state.domain || 'No site loaded';
    }
    
    if (whitelistBtn && whitelistText) {
      if (this.state.whitelisted) {
        whitelistBtn.classList.add('active');
        whitelistText.textContent = 'Enabled';
      } else {
        whitelistBtn.classList.remove('active');
        whitelistText.textContent = 'Disable';
      }
    }
  }
  
  updateBlockedList() {
    const listEl = document.getElementById('blocked-list');
    const emptyState = document.getElementById('empty-state');
    
    if (!listEl) return;
    
    // Clear existing items
    listEl.innerHTML = '';
    
    if (this.state.blockedDomains.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');
    
    // Show top 10 blocked domains
    const sortedDomains = this.state.blockedDomains
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    sortedDomains.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'blocked-item';
      itemEl.innerHTML = `
        <span class="blocked-domain" title="${item.domain}">${item.domain}</span>
        <span class="blocked-count">${item.count}</span>
      `;
      listEl.appendChild(itemEl);
    });
  }
  
  async updateBadge() {
    try {
      const count = this.state.stats.pageBlocked;
      const text = count > 999 ? '999+' : (count > 0 ? count.toString() : '');
      
      await chrome.action.setBadgeText({ text });
      await chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' });
    } catch (e) {
      // Badge API may not be available
    }
  }
  
  // Utilities
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SimplShadowPopup();
});
