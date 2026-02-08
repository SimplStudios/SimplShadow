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
    await this.loadProcesses();
    
    // Refresh processes periodically when panel is open
    setInterval(() => {
      if (document.querySelector('.app.panel-open')) {
        this.loadProcesses();
      }
    }, 2000);
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
    const powerBtn = document.getElementById('power-toggle');
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
    const optionsBtn = document.getElementById('open-options-btn');
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
        { 16: 'icons/icon16.png', 48: 'icons/icon48.png' } :
        { 16: 'icons/icon16-disabled.png', 48: 'icons/icon48-disabled.png' };
      
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
    const app = document.querySelector('.app');
    const powerBtn = document.getElementById('power-toggle');
    const statusDisplay = document.querySelector('.status-display');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('status-text');
    const logoIcon = document.querySelector('.logo-icon svg');
    
    if (this.state.enabled) {
      // ENABLED STATE - Blue, glowing
      powerBtn?.classList.add('active');
      statusDot?.classList.add('active');
      statusDisplay?.classList.remove('disabled');
      app?.removeAttribute('data-disabled');
      if (statusText) statusText.textContent = 'Protection Active';
      
      // Update logo gradient to blue
      if (logoIcon) {
        const gradient = logoIcon.querySelector('#logoGrad stop');
        if (gradient) gradient.style.stopColor = '#3B82F6';
      }
    } else {
      // DISABLED STATE - Grey, no glow
      powerBtn?.classList.remove('active');
      statusDot?.classList.remove('active');
      statusDisplay?.classList.add('disabled');
      app?.setAttribute('data-disabled', 'true');
      if (statusText) statusText.textContent = 'Protection Paused';
      
      // Update logo gradient to grey
      if (logoIcon) {
        const gradient = logoIcon.querySelector('#logoGrad stop');
        if (gradient) gradient.style.stopColor = '#6B7280';
      }
    }
  }
  
  updateStatsUI() {
    // This Session = current page/tab blocked count
    const sessionEl = document.getElementById('session-blocked');
    if (sessionEl) sessionEl.textContent = this.formatNumber(this.state.stats.pageBlocked || 0);
    
    // Today = blocked today
    const todayEl = document.getElementById('today-blocked');
    if (todayEl) todayEl.textContent = this.formatNumber(this.state.stats.todayBlocked || 0);
    
    // All Time = total ever blocked
    const totalEl = document.getElementById('total-blocked');
    if (totalEl) totalEl.textContent = this.formatNumber(this.state.stats.totalBlocked || 0);
    
    // Footer stats
    const trackersEl = document.getElementById('trackers-blocked');
    if (trackersEl) trackersEl.textContent = this.formatNumber(this.state.stats.trackersBlocked || 0);
    
    const scriptsEl = document.getElementById('scripts-blocked');
    if (scriptsEl) scriptsEl.textContent = this.formatNumber(this.state.stats.scriptsBlocked || 0);
    
    // Update badge
    this.updateBadge();
    
    // Detail stats in side panel
    const weekEl = document.getElementById('week-blocked');
    if (weekEl) weekEl.textContent = this.formatNumber(this.state.stats.weekBlocked || 0);
    
    const detailTotal = document.getElementById('detail-total');
    if (detailTotal) detailTotal.textContent = this.formatNumber(this.state.stats.totalBlocked || 0);
    
    const detailPage = document.getElementById('detail-page');
    if (detailPage) detailPage.textContent = this.formatNumber(this.state.stats.pageBlocked);
    
    const detailScripts = document.getElementById('detail-scripts');
    if (detailScripts) detailScripts.textContent = this.formatNumber(this.state.stats.scriptsBlocked || 0);
    
    const detailWebsockets = document.getElementById('detail-websockets');
    if (detailWebsockets) detailWebsockets.textContent = this.formatNumber(this.state.stats.websocketsBlocked || 0);
    
    // Updated detail panel stats
    const scriptsCount = document.getElementById('scripts-count');
    if (scriptsCount) scriptsCount.textContent = this.formatNumber(this.state.stats.scriptsBlocked || 0);
    
    const websocketsCount = document.getElementById('websockets-count');
    if (websocketsCount) websocketsCount.textContent = this.formatNumber(this.state.stats.websocketsBlocked || 0);
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
  
  // Update live process list
  updateProcessList(processes = []) {
    const listEl = document.getElementById('process-list');
    if (!listEl) return;
    
    if (!processes || processes.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state small">
          <span>Monitoring...</span>
          <p>Blocked requests appear here in real-time</p>
        </div>
      `;
      return;
    }
    
    listEl.innerHTML = processes.slice(0, 15).map(proc => {
      const typeClass = proc.type || 'ad';
      const typeIcons = {
        ad: '🚫',
        tracker: '👁️',
        script: '📜',
        websocket: '🔌'
      };
      const typeLabels = {
        ad: 'Ad',
        tracker: 'Tracker',
        script: 'Script',
        websocket: 'WebSocket'
      };
      
      return `
        <div class="process-item">
          <div class="process-type ${typeClass}" title="${typeLabels[typeClass] || 'Blocked'}">
            ${typeIcons[typeClass] || '🚫'}
          </div>
          <div class="process-info">
            <div class="process-url" title="${proc.url}">${this.truncateUrl(proc.url)}</div>
            <div class="process-label">${typeLabels[typeClass] || 'Blocked'}</div>
          </div>
          <div class="process-time">${proc.time || 'now'}</div>
        </div>
      `;
    }).join('');
  }
  
  truncateUrl(url) {
    if (!url) return '—';
    try {
      const parsed = new URL(url);
      const path = parsed.pathname;
      if (path.length > 30) {
        return parsed.hostname + '/...' + path.slice(-20);
      }
      return parsed.hostname + path;
    } catch {
      return url.slice(0, 40);
    }
  }
  
  async loadProcesses() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getRecentBlocked' });
      if (response?.processes) {
        this.updateProcessList(response.processes);
      }
    } catch (e) {
      // Silent fail - processes may not be available
    }
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
