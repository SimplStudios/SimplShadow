// ShadowBlock - Scriptlet Library
// Compatible with uBlock Origin scriptlet syntax
// These scriptlets defuse common anti-adblock and tracking scripts

'use strict';

const SCRIPTLETS = {
  // Abort on property read - prevents scripts from detecting adblockers
  'abort-on-property-read': function(prop) {
    if (!prop) return;
    const props = prop.split('.');
    let owner = window;
    
    for (let i = 0; i < props.length - 1; i++) {
      owner = owner[props[i]];
      if (!owner) return;
    }
    
    const target = props[props.length - 1];
    const descriptor = Object.getOwnPropertyDescriptor(owner, target);
    
    if (descriptor && descriptor.get) return;
    
    Object.defineProperty(owner, target, {
      get: function() {
        throw new ReferenceError('ShadowBlock: Blocked property read: ' + prop);
      },
      set: function() {}
    });
  },

  // Abort on property write - prevents setting tracking variables
  'abort-on-property-write': function(prop) {
    if (!prop) return;
    const props = prop.split('.');
    let owner = window;
    
    for (let i = 0; i < props.length - 1; i++) {
      owner = owner[props[i]];
      if (!owner) return;
    }
    
    const target = props[props.length - 1];
    
    Object.defineProperty(owner, target, {
      get: function() { return undefined; },
      set: function() {
        throw new ReferenceError('ShadowBlock: Blocked property write: ' + prop);
      }
    });
  },

  // Abort current inline script - stops scripts containing specific text
  'abort-current-inline-script': function(prop, search) {
    const magic = Math.random().toString(36).slice(2);
    const abort = function() {
      throw new ReferenceError(magic);
    };
    
    const props = prop.split('.');
    let owner = window;
    
    for (let i = 0; i < props.length - 1; i++) {
      owner = owner[props[i]];
      if (!owner) return;
    }
    
    const target = props[props.length - 1];
    let value = owner[target];
    
    Object.defineProperty(owner, target, {
      get: function() {
        if (search) {
          const script = document.currentScript;
          if (script && script.textContent.includes(search)) {
            abort();
          }
        } else {
          abort();
        }
        return value;
      },
      set: function(v) {
        if (search) {
          const script = document.currentScript;
          if (script && script.textContent.includes(search)) {
            abort();
          }
        }
        value = v;
      }
    });
  },

  // Set constant - sets a property to a constant value
  'set-constant': function(prop, value) {
    if (!prop) return;
    
    // Parse value
    let constantValue;
    switch (value) {
      case 'true': constantValue = true; break;
      case 'false': constantValue = false; break;
      case 'null': constantValue = null; break;
      case 'undefined': constantValue = undefined; break;
      case 'noopFunc': constantValue = function() {}; break;
      case 'trueFunc': constantValue = function() { return true; }; break;
      case 'falseFunc': constantValue = function() { return false; }; break;
      case 'emptyObj': constantValue = {}; break;
      case 'emptyArr': constantValue = []; break;
      case 'emptyStr': constantValue = ''; break;
      case '': constantValue = undefined; break;
      default:
        if (/^\d+$/.test(value)) {
          constantValue = parseInt(value, 10);
        } else if (/^\d+\.\d+$/.test(value)) {
          constantValue = parseFloat(value);
        } else {
          constantValue = value;
        }
    }
    
    const props = prop.split('.');
    let owner = window;
    
    // Create nested objects if needed
    for (let i = 0; i < props.length - 1; i++) {
      if (!(props[i] in owner)) {
        owner[props[i]] = {};
      }
      owner = owner[props[i]];
    }
    
    const target = props[props.length - 1];
    
    try {
      Object.defineProperty(owner, target, {
        configurable: false,
        enumerable: true,
        get: function() { return constantValue; },
        set: function() {}
      });
    } catch (e) {
      // Property might already be non-configurable
    }
  },

  // Remove attribute - removes specified attributes from elements
  'remove-attr': function(attr, selector) {
    selector = selector || '[' + attr + ']';
    
    const removeAttr = function() {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        el.removeAttribute(attr);
      }
    };
    
    removeAttr();
    
    const observer = new MutationObserver(removeAttr);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [attr]
    });
  },

  // Remove class - removes specified classes from elements
  'remove-class': function(className, selector) {
    selector = selector || '.' + className;
    
    const removeClass = function() {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        el.classList.remove(className);
      }
    };
    
    removeClass();
    
    const observer = new MutationObserver(removeClass);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true
    });
  },

  // No setTimeout if - cancels setTimeout calls containing specific strings
  'no-setTimeout-if': function(search, delay) {
    const nativeSetTimeout = window.setTimeout;
    
    window.setTimeout = function(fn, d, ...args) {
      const fnStr = typeof fn === 'function' ? fn.toString() : fn;
      
      if (search && fnStr.includes(search)) {
        if (!delay || d == delay) {
          return;
        }
      }
      
      return nativeSetTimeout.call(this, fn, d, ...args);
    };
  },

  // No setInterval if - cancels setInterval calls containing specific strings
  'no-setInterval-if': function(search, delay) {
    const nativeSetInterval = window.setInterval;
    
    window.setInterval = function(fn, d, ...args) {
      const fnStr = typeof fn === 'function' ? fn.toString() : fn;
      
      if (search && fnStr.includes(search)) {
        if (!delay || d == delay) {
          return;
        }
      }
      
      return nativeSetInterval.call(this, fn, d, ...args);
    };
  },

  // No fetch if - blocks fetch requests matching criteria
  'no-fetch-if': function(search) {
    const nativeFetch = window.fetch;
    
    window.fetch = function(url, options) {
      const urlStr = typeof url === 'string' ? url : url.url || '';
      
      if (search && urlStr.includes(search)) {
        return Promise.resolve(new Response('', { status: 200 }));
      }
      
      return nativeFetch.apply(this, arguments);
    };
  },

  // No XMLHttpRequest if - blocks XHR requests matching criteria
  'no-xhr-if': function(search) {
    const nativeOpen = XMLHttpRequest.prototype.open;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      if (search && url.includes(search)) {
        this._blocked = true;
      }
      return nativeOpen.call(this, method, url, ...args);
    };
    
    const nativeSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(...args) {
      if (this._blocked) {
        Object.defineProperty(this, 'status', { value: 200 });
        Object.defineProperty(this, 'responseText', { value: '' });
        Object.defineProperty(this, 'response', { value: '' });
        this.dispatchEvent(new Event('load'));
        return;
      }
      return nativeSend.apply(this, args);
    };
  },

  // Nano setTimeout booster - speeds up delayed code
  'nano-setTimeout-booster': function(search, delay) {
    delay = parseInt(delay, 10) || 0;
    const nativeSetTimeout = window.setTimeout;
    
    window.setTimeout = function(fn, d, ...args) {
      const fnStr = typeof fn === 'function' ? fn.toString() : fn;
      
      if ((!search || fnStr.includes(search)) && d > delay) {
        d = delay;
      }
      
      return nativeSetTimeout.call(this, fn, d, ...args);
    };
  },

  // Nano setInterval booster - speeds up intervals
  'nano-setInterval-booster': function(search, delay) {
    delay = parseInt(delay, 10) || 0;
    const nativeSetInterval = window.setInterval;
    
    window.setInterval = function(fn, d, ...args) {
      const fnStr = typeof fn === 'function' ? fn.toString() : fn;
      
      if ((!search || fnStr.includes(search)) && d > delay) {
        d = delay;
      }
      
      return nativeSetInterval.call(this, fn, d, ...args);
    };
  },

  // Disable newtab links - prevents links opening in new tabs
  'disable-newtab-links': function() {
    document.addEventListener('click', function(e) {
      let target = e.target;
      while (target && target.tagName !== 'A') {
        target = target.parentElement;
      }
      if (target && target.target === '_blank') {
        target.target = '_self';
      }
    }, true);
  },

  // Window close defuser - prevents window.close()
  'window-close-defuser': function() {
    window.close = function() {};
  },

  // Prevent addEventListener - blocks specific event listeners
  'prevent-addEventListener': function(type, search) {
    const nativeAddEventListener = EventTarget.prototype.addEventListener;
    
    EventTarget.prototype.addEventListener = function(eventType, fn, ...args) {
      if (type && eventType !== type) {
        return nativeAddEventListener.call(this, eventType, fn, ...args);
      }
      
      if (search) {
        const fnStr = typeof fn === 'function' ? fn.toString() : '';
        if (!fnStr.includes(search)) {
          return nativeAddEventListener.call(this, eventType, fn, ...args);
        }
      }
      
      // Blocked
      return;
    };
  },

  // JSON prune - removes properties from JSON.parse results
  'json-prune': function(props, needle) {
    const nativeParse = JSON.parse;
    
    JSON.parse = function(text, reviver) {
      const result = nativeParse.call(this, text, reviver);
      
      if (needle && !text.includes(needle)) {
        return result;
      }
      
      if (props && result && typeof result === 'object') {
        const propList = props.split(' ');
        for (const prop of propList) {
          const parts = prop.split('.');
          let obj = result;
          for (let i = 0; i < parts.length - 1; i++) {
            obj = obj?.[parts[i]];
          }
          if (obj) {
            delete obj[parts[parts.length - 1]];
          }
        }
      }
      
      return result;
    };
  },

  // Overlay buster - removes overlay/modal elements
  'overlay-buster': function() {
    const checkOverlay = function() {
      const styles = ['fixed', 'sticky'];
      const elements = document.querySelectorAll('body > *');
      
      for (const el of elements) {
        const computed = window.getComputedStyle(el);
        if (styles.includes(computed.position)) {
          const zIndex = parseInt(computed.zIndex, 10) || 0;
          if (zIndex > 1000) {
            el.style.display = 'none';
          }
        }
      }
      
      // Restore body scroll
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
    
    checkOverlay();
    
    const observer = new MutationObserver(checkOverlay);
    observer.observe(document.body, { childList: true, subtree: true });
  },

  // Alert buster - blocks alert dialogs
  'alert-buster': function() {
    window.alert = function() {};
  },

  // noeval - blocks eval()
  'noeval': function() {
    window.eval = function() {
      throw new Error('ShadowBlock: eval blocked');
    };
  },

  // Silent noeval - silently blocks eval()
  'noeval-silent': function() {
    window.eval = function() {};
  },

  // Spoof CSS - returns fake values for getComputedStyle
  'spoof-css': function(selector, prop, value) {
    const nativeGetComputedStyle = window.getComputedStyle;
    
    window.getComputedStyle = function(el, pseudo) {
      const result = nativeGetComputedStyle.call(this, el, pseudo);
      
      if (el.matches && el.matches(selector)) {
        const nativeGetPropertyValue = result.getPropertyValue.bind(result);
        result.getPropertyValue = function(p) {
          if (p === prop) return value;
          return nativeGetPropertyValue(p);
        };
      }
      
      return result;
    };
  },

  // Adblock detection defuser (generic)
  'nobab': function() {
    // BlockAdBlock defuser
    const props = [
      'blockAdBlock', 'BlockAdBlock', 'canRunAds', 'isAdBlockActive',
      'adBlockDetected', 'adBlockEnabled', 'adsBlocked'
    ];
    
    for (const prop of props) {
      Object.defineProperty(window, prop, {
        get: function() { return false; },
        set: function() {}
      });
    }
  },

  // FuckAdBlock defuser
  'nofab': function() {
    const FuckAdBlock = function() {};
    FuckAdBlock.prototype = {
      check: function() { return false; },
      emitEvent: function() { return this; },
      clearEvent: function() { return this; },
      on: function() { return this; },
      onDetected: function() { return this; },
      onNotDetected: function(fn) { if (fn) fn(); return this; },
      setOption: function() { return this; }
    };
    
    window.FuckAdBlock = window.fuckAdBlock = FuckAdBlock;
    window.blockAdBlock = new FuckAdBlock();
  }
};

// Execute scriptlet by name
function executeScriptlet(name, ...args) {
  // Handle aliases
  const aliases = {
    'aopr': 'abort-on-property-read',
    'aopw': 'abort-on-property-write',
    'acis': 'abort-current-inline-script',
    'set': 'set-constant',
    'ra': 'remove-attr',
    'rc': 'remove-class',
    'nostif': 'no-setTimeout-if',
    'nosiif': 'no-setInterval-if'
  };
  
  const scriptletName = aliases[name] || name;
  const scriptlet = SCRIPTLETS[scriptletName];
  
  if (scriptlet) {
    try {
      scriptlet.apply(null, args);
    } catch (e) {
      console.debug('ShadowBlock scriptlet error:', name, e);
    }
  }
}

// Inject scriptlet into page context
function injectScriptlet(name, ...args) {
  const scriptlet = SCRIPTLETS[name];
  if (!scriptlet) return;
  
  const argsStr = args.map(a => JSON.stringify(a)).join(',');
  const code = `(${scriptlet.toString()})(${argsStr});`;
  
  const script = document.createElement('script');
  script.textContent = code;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

// Export
if (typeof module !== 'undefined') {
  module.exports = { SCRIPTLETS, executeScriptlet, injectScriptlet };
}
