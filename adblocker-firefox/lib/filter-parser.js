// ShadowBlock - EasyList/AdBlock Plus Filter Parser
// Parses filter list syntax used by uBlock Origin, AdBlock Plus, etc.

'use strict';

class FilterParser {
  constructor() {
    this.networkFilters = [];
    this.cosmeticFilters = [];
    this.scriptletFilters = [];
    this.exceptions = [];
  }

  // Parse a filter list (EasyList format)
  parse(filterText) {
    const lines = filterText.split('\n');
    
    for (let line of lines) {
      line = line.trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('!') || line.startsWith('[')) {
        continue;
      }
      
      try {
        this.parseLine(line);
      } catch (e) {
        // Skip invalid filters
      }
    }
    
    return {
      networkFilters: this.networkFilters,
      cosmeticFilters: this.cosmeticFilters,
      scriptletFilters: this.scriptletFilters,
      exceptions: this.exceptions
    };
  }

  parseLine(line) {
    // Exception rules (whitelist)
    if (line.startsWith('@@')) {
      this.parseException(line.slice(2));
      return;
    }
    
    // Cosmetic filters (element hiding)
    if (line.includes('##') || line.includes('#@#') || line.includes('#?#')) {
      this.parseCosmeticFilter(line);
      return;
    }
    
    // Scriptlet filters
    if (line.includes('##+js(') || line.includes('##^script')) {
      this.parseScriptletFilter(line);
      return;
    }
    
    // Network filters
    this.parseNetworkFilter(line);
  }

  parseNetworkFilter(line) {
    const filter = {
      raw: line,
      pattern: '',
      isRegex: false,
      domains: [],
      excludedDomains: [],
      types: [],
      thirdParty: null,
      matchCase: false
    };

    let pattern = line;
    
    // Extract options after $
    const optionsIndex = line.lastIndexOf('$');
    if (optionsIndex !== -1 && !line.includes('\\$')) {
      const options = line.slice(optionsIndex + 1).split(',');
      pattern = line.slice(0, optionsIndex);
      
      for (const opt of options) {
        this.parseOption(filter, opt.trim());
      }
    }
    
    // Handle anchors
    if (pattern.startsWith('||')) {
      // Domain anchor
      filter.pattern = pattern.slice(2);
      filter.anchorDomain = true;
    } else if (pattern.startsWith('|')) {
      // Start anchor
      filter.pattern = pattern.slice(1);
      filter.anchorStart = true;
    } else if (pattern.endsWith('|')) {
      filter.pattern = pattern.slice(0, -1);
      filter.anchorEnd = true;
    } else {
      filter.pattern = pattern;
    }
    
    // Handle regex filters
    if (filter.pattern.startsWith('/') && filter.pattern.endsWith('/')) {
      filter.isRegex = true;
      filter.pattern = filter.pattern.slice(1, -1);
    }
    
    // Convert wildcards to regex
    if (!filter.isRegex) {
      filter.regex = this.patternToRegex(filter.pattern, filter);
    } else {
      try {
        filter.regex = new RegExp(filter.pattern, filter.matchCase ? '' : 'i');
      } catch (e) {
        return; // Invalid regex
      }
    }
    
    this.networkFilters.push(filter);
  }

  parseOption(filter, option) {
    const negated = option.startsWith('~');
    const opt = negated ? option.slice(1) : option;
    
    // Resource types
    const types = {
      'script': 'script',
      'image': 'image',
      'stylesheet': 'stylesheet',
      'css': 'stylesheet',
      'object': 'object',
      'xmlhttprequest': 'xmlhttprequest',
      'xhr': 'xmlhttprequest',
      'sub_frame': 'sub_frame',
      'subdocument': 'sub_frame',
      'ping': 'ping',
      'websocket': 'websocket',
      'webrtc': 'webrtc',
      'font': 'font',
      'media': 'media',
      'other': 'other'
    };
    
    if (types[opt]) {
      if (negated) {
        filter.excludedTypes = filter.excludedTypes || [];
        filter.excludedTypes.push(types[opt]);
      } else {
        filter.types.push(types[opt]);
      }
      return;
    }
    
    // Domain options
    if (opt.startsWith('domain=')) {
      const domains = opt.slice(7).split('|');
      for (const d of domains) {
        if (d.startsWith('~')) {
          filter.excludedDomains.push(d.slice(1));
        } else {
          filter.domains.push(d);
        }
      }
      return;
    }
    
    // Third-party
    if (opt === 'third-party' || opt === '3p') {
      filter.thirdParty = !negated;
      return;
    }
    
    // First-party
    if (opt === 'first-party' || opt === '1p') {
      filter.thirdParty = negated;
      return;
    }
    
    // Match case
    if (opt === 'match-case') {
      filter.matchCase = true;
      return;
    }
    
    // Important (high priority)
    if (opt === 'important') {
      filter.important = true;
      return;
    }
  }

  patternToRegex(pattern, filter) {
    // Escape regex special chars except * and ^
    let regex = pattern
      .replace(/[.+?{}()[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\^/g, '(?:[^\\w\\d_.%-]|$)');
    
    if (filter.anchorDomain) {
      regex = '(?:^|[./])' + regex;
    }
    if (filter.anchorStart) {
      regex = '^' + regex;
    }
    if (filter.anchorEnd) {
      regex = regex + '$';
    }
    
    try {
      return new RegExp(regex, filter.matchCase ? '' : 'i');
    } catch (e) {
      return null;
    }
  }

  parseCosmeticFilter(line) {
    let separator, isException = false, isProcedural = false;
    
    if (line.includes('#@#')) {
      separator = '#@#';
      isException = true;
    } else if (line.includes('#?#')) {
      separator = '#?#';
      isProcedural = true;
    } else {
      separator = '##';
    }
    
    const parts = line.split(separator);
    const domains = parts[0] ? parts[0].split(',') : [];
    const selector = parts.slice(1).join(separator);
    
    const filter = {
      raw: line,
      selector: selector,
      domains: [],
      excludedDomains: [],
      isException: isException,
      isProcedural: isProcedural
    };
    
    for (const d of domains) {
      if (d.startsWith('~')) {
        filter.excludedDomains.push(d.slice(1));
      } else if (d) {
        filter.domains.push(d);
      }
    }
    
    this.cosmeticFilters.push(filter);
  }

  parseScriptletFilter(line) {
    // Parse uBlock Origin scriptlet syntax: example.com##+js(scriptlet, arg1, arg2)
    const match = line.match(/^([^#]*)#\+js\(([^)]+)\)$/);
    if (match) {
      const domains = match[1] ? match[1].split(',') : [];
      const scriptletParts = match[2].split(',').map(s => s.trim());
      const scriptletName = scriptletParts[0];
      const args = scriptletParts.slice(1);
      
      this.scriptletFilters.push({
        raw: line,
        domains: domains.filter(d => !d.startsWith('~')),
        excludedDomains: domains.filter(d => d.startsWith('~')).map(d => d.slice(1)),
        scriptlet: scriptletName,
        args: args
      });
    }
  }

  parseException(line) {
    // Parse the exception as a network filter
    const filter = { raw: '@@' + line, isException: true };
    // Simplified - just store the pattern
    this.exceptions.push(line);
  }
}

// Filter matching engine
class FilterMatcher {
  constructor(filters) {
    this.filters = filters;
    this.cache = new Map();
  }

  matches(url, type, sourceDomain, thirdParty) {
    // Check cache first
    const cacheKey = `${url}|${type}|${sourceDomain}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    let result = null;
    
    for (const filter of this.filters.networkFilters) {
      if (this.filterMatches(filter, url, type, sourceDomain, thirdParty)) {
        result = filter;
        break;
      }
    }
    
    // Check exceptions
    if (result) {
      for (const exception of this.filters.exceptions) {
        // Simplified exception check
        if (url.includes(exception)) {
          result = null;
          break;
        }
      }
    }
    
    // Cache result (limit cache size)
    if (this.cache.size > 10000) {
      this.cache.clear();
    }
    this.cache.set(cacheKey, result);
    
    return result;
  }

  filterMatches(filter, url, type, sourceDomain, thirdParty) {
    // Check regex
    if (!filter.regex || !filter.regex.test(url)) {
      return false;
    }
    
    // Check type
    if (filter.types.length > 0 && !filter.types.includes(type)) {
      return false;
    }
    
    // Check excluded types
    if (filter.excludedTypes && filter.excludedTypes.includes(type)) {
      return false;
    }
    
    // Check third-party
    if (filter.thirdParty !== null) {
      if (filter.thirdParty !== thirdParty) {
        return false;
      }
    }
    
    // Check domains
    if (filter.domains.length > 0) {
      const matches = filter.domains.some(d => 
        sourceDomain === d || sourceDomain.endsWith('.' + d)
      );
      if (!matches) return false;
    }
    
    // Check excluded domains
    if (filter.excludedDomains.length > 0) {
      const excluded = filter.excludedDomains.some(d => 
        sourceDomain === d || sourceDomain.endsWith('.' + d)
      );
      if (excluded) return false;
    }
    
    return true;
  }

  getCosmeticFilters(domain) {
    const result = [];
    
    for (const filter of this.filters.cosmeticFilters) {
      if (filter.isException) continue;
      
      // Global filter (no domain restriction)
      if (filter.domains.length === 0 && filter.excludedDomains.length === 0) {
        result.push(filter.selector);
        continue;
      }
      
      // Check if domain matches
      const domainMatches = filter.domains.length === 0 || 
        filter.domains.some(d => domain === d || domain.endsWith('.' + d));
      const domainExcluded = filter.excludedDomains.some(d => 
        domain === d || domain.endsWith('.' + d)
      );
      
      if (domainMatches && !domainExcluded) {
        result.push(filter.selector);
      }
    }
    
    return result;
  }

  getScriptlets(domain) {
    return this.filters.scriptletFilters.filter(filter => {
      if (filter.domains.length === 0) return true;
      
      const matches = filter.domains.some(d => 
        domain === d || domain.endsWith('.' + d)
      );
      const excluded = filter.excludedDomains.some(d => 
        domain === d || domain.endsWith('.' + d)
      );
      
      return matches && !excluded;
    });
  }
}

// Export for use
if (typeof module !== 'undefined') {
  module.exports = { FilterParser, FilterMatcher };
}
