// ShadowBlock Options - JavaScript

'use strict';

// ============== Tab Navigation ==============
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    // Update active tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Show corresponding content
    const tabId = tab.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
  });
});

// ============== Load Data ==============
async function loadData() {
  // Get stats
  const response = await browser.runtime.sendMessage({ type: 'getStats' });
  
  // Update stats display
  document.getElementById('statSession').textContent = formatNumber(response.session);
  document.getElementById('statToday').textContent = formatNumber(response.today);
  document.getElementById('statWeek').textContent = formatNumber(response.week);
  document.getElementById('statAllTime').textContent = formatNumber(response.allTime);
  
  // Update top blocked
  const topBlockedList = document.getElementById('topBlockedList');
  topBlockedList.innerHTML = response.topBlocked.map((item, i) => `
    <div class="top-blocked-item">
      <span class="rank">${i + 1}</span>
      <span class="domain">${item.domain}</span>
      <span class="count">${formatNumber(item.count)}</span>
    </div>
  `).join('');
  
  // Update whitelist
  const whitelistItems = document.getElementById('whitelistItems');
  whitelistItems.innerHTML = response.whitelistedDomains.map(domain => `
    <div class="whitelist-item" data-domain="${domain}">
      <span class="domain">${domain}</span>
      <button class="btn btn-danger btn-small remove-whitelist">Remove</button>
    </div>
  `).join('');
  
  // Add remove handlers
  whitelistItems.querySelectorAll('.remove-whitelist').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const domain = e.target.closest('.whitelist-item').dataset.domain;
      await browser.runtime.sendMessage({ type: 'toggleWhitelist', domain });
      loadData();
    });
  });
  
  // Load user rules
  const rulesResponse = await browser.runtime.sendMessage({ type: 'getUserRules' });
  document.getElementById('userRules').value = rulesResponse.rules.join('\n');
}

// ============== Format Number ==============
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// ============== Filter List Management ==============
document.querySelectorAll('.filter-item input').forEach(checkbox => {
  checkbox.addEventListener('change', async (e) => {
    const listName = e.target.dataset.list;
    const enabled = e.target.checked;
    
    // Save to storage
    const stored = await browser.storage.local.get(['filterLists']);
    const filterLists = stored.filterLists || { enabled: [], custom: [] };
    
    if (enabled) {
      if (!filterLists.enabled.includes(listName)) {
        filterLists.enabled.push(listName);
      }
    } else {
      filterLists.enabled = filterLists.enabled.filter(l => l !== listName);
    }
    
    await browser.storage.local.set({ filterLists });
    
    // Show notification
    showNotification(enabled ? `Enabled ${listName}` : `Disabled ${listName}`);
  });
});

// ============== Custom Filter URL ==============
document.getElementById('addCustomUrl').addEventListener('click', async () => {
  const input = document.getElementById('customUrl');
  const url = input.value.trim();
  
  if (!url) return;
  
  try {
    new URL(url);
  } catch {
    showNotification('Invalid URL', 'error');
    return;
  }
  
  const stored = await browser.storage.local.get(['filterLists']);
  const filterLists = stored.filterLists || { enabled: [], custom: [] };
  
  if (!filterLists.custom.includes(url)) {
    filterLists.custom.push(url);
    await browser.storage.local.set({ filterLists });
    
    // Add to UI
    const customList = document.getElementById('customFilterLists');
    customList.innerHTML += `
      <div class="custom-list-item" data-url="${url}">
        <span class="url">${url}</span>
        <button class="btn btn-danger btn-small remove-custom">Remove</button>
      </div>
    `;
    
    input.value = '';
    showNotification('Custom filter list added');
  }
});

// Remove custom filter list
document.getElementById('customFilterLists').addEventListener('click', async (e) => {
  if (e.target.classList.contains('remove-custom')) {
    const item = e.target.closest('.custom-list-item');
    const url = item.dataset.url;
    
    const stored = await browser.storage.local.get(['filterLists']);
    const filterLists = stored.filterLists || { enabled: [], custom: [] };
    filterLists.custom = filterLists.custom.filter(u => u !== url);
    await browser.storage.local.set({ filterLists });
    
    item.remove();
    showNotification('Custom filter list removed');
  }
});

// ============== Update Lists ==============
document.getElementById('updateLists').addEventListener('click', async () => {
  const btn = document.getElementById('updateLists');
  btn.disabled = true;
  btn.innerHTML = '<svg class="spinner" width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="30 70" /></svg> Updating...';
  
  // Simulate update (in real implementation, would fetch filter lists)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const now = new Date().toLocaleString();
  document.getElementById('lastUpdate').textContent = now;
  await browser.storage.local.set({ lastFilterUpdate: now });
  
  btn.disabled = false;
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Update All Lists';
  
  showNotification('Filter lists updated');
});

// ============== User Rules ==============
document.getElementById('saveRules').addEventListener('click', async () => {
  const rules = document.getElementById('userRules').value
    .split('\n')
    .map(r => r.trim())
    .filter(r => r && !r.startsWith('!'));
  
  // Clear existing and add new
  await browser.runtime.sendMessage({ type: 'resetUserRules' });
  
  for (const rule of rules) {
    await browser.runtime.sendMessage({ type: 'addUserRule', rule });
  }
  
  showNotification('Rules saved');
});

document.getElementById('clearRules').addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all custom rules?')) {
    document.getElementById('userRules').value = '';
    await browser.runtime.sendMessage({ type: 'resetUserRules' });
    showNotification('Rules cleared');
  }
});

// Quick add rule
document.getElementById('addQuickRule').addEventListener('click', async () => {
  const type = document.getElementById('ruleType').value;
  const value = document.getElementById('ruleValue').value.trim();
  
  if (!value) return;
  
  let rule;
  switch (type) {
    case 'block':
      rule = `||${value}^`;
      break;
    case 'whitelist':
      rule = `@@||${value}^$document`;
      break;
    case 'hide':
      rule = `##${value}`;
      break;
  }
  
  // Add to textarea
  const textarea = document.getElementById('userRules');
  textarea.value = textarea.value ? textarea.value + '\n' + rule : rule;
  
  // Save
  await browser.runtime.sendMessage({ type: 'addUserRule', rule });
  
  document.getElementById('ruleValue').value = '';
  showNotification('Rule added');
});

// ============== Whitelist ==============
document.getElementById('addWhitelist').addEventListener('click', async () => {
  const input = document.getElementById('whitelistDomain');
  const domain = input.value.trim().toLowerCase();
  
  if (!domain) return;
  
  await browser.runtime.sendMessage({ type: 'toggleWhitelist', domain });
  input.value = '';
  loadData();
  showNotification(`${domain} added to whitelist`);
});

// ============== Statistics ==============
document.getElementById('resetStats').addEventListener('click', async () => {
  if (confirm('Are you sure you want to reset all statistics?')) {
    await browser.runtime.sendMessage({ type: 'resetStats' });
    loadData();
    showNotification('Statistics reset');
  }
});

document.getElementById('exportStats').addEventListener('click', async () => {
  const response = await browser.runtime.sendMessage({ type: 'getStats' });
  
  const data = {
    exportDate: new Date().toISOString(),
    statistics: {
      session: response.session,
      today: response.today,
      week: response.week,
      allTime: response.allTime
    },
    topBlocked: response.topBlocked,
    whitelistedDomains: response.whitelistedDomains
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `shadowblock-stats-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  showNotification('Statistics exported');
});

// ============== Notifications ==============
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'error' ? '#EF4444' : '#10B981'};
    color: white;
    border-radius: 8px;
    font-weight: 500;
    animation: slideIn 0.3s ease;
    z-index: 1000;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  .spinner {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// ============== Initialize ==============
async function init() {
  // Load last update time
  const stored = await browser.storage.local.get(['lastFilterUpdate', 'filterLists']);
  
  if (stored.lastFilterUpdate) {
    document.getElementById('lastUpdate').textContent = stored.lastFilterUpdate;
  }
  
  // Load filter list state
  if (stored.filterLists?.enabled) {
    document.querySelectorAll('.filter-item input').forEach(checkbox => {
      const listName = checkbox.dataset.list;
      checkbox.checked = stored.filterLists.enabled.includes(listName);
    });
  }
  
  // Load custom filter lists
  if (stored.filterLists?.custom) {
    const customList = document.getElementById('customFilterLists');
    customList.innerHTML = stored.filterLists.custom.map(url => `
      <div class="custom-list-item" data-url="${url}">
        <span class="url">${url}</span>
        <button class="btn btn-danger btn-small remove-custom">Remove</button>
      </div>
    `).join('');
  }
  
  loadData();
}

init();
