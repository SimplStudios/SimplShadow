// ShadowBlock - Redirect Resources
// Neutered versions of common tracking/analytics scripts
// When a request matches, we serve these harmless stubs instead

'use strict';

const REDIRECT_RESOURCES = {
  // Google Analytics - Universal Analytics
  'google-analytics.com/analytics.js': `
    (function() {
      var noopfn = function() {};
      var noopnull = function() { return null; };
      window.ga = window.ga || function() {
        (window.ga.q = window.ga.q || []).push(arguments);
      };
      window.ga.l = Date.now();
      window.ga.create = noopfn;
      window.ga.getByName = noopnull;
      window.ga.getAll = function() { return []; };
      window.ga.remove = noopfn;
      window.gaData = window.gaData || {};
      window.gaGlobal = window.gaGlobal || {};
    })();
  `,

  // Google Analytics 4 / gtag.js
  'googletagmanager.com/gtag/js': `
    (function() {
      var noopfn = function() {};
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function() {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', 'UA-XXXXX-Y');
    })();
  `,

  // Google Tag Manager
  'googletagmanager.com/gtm.js': `
    (function() {
      window.dataLayer = window.dataLayer || [];
      window.google_tag_manager = window.google_tag_manager || {};
    })();
  `,

  // Google Ads conversion tracking
  'googleadservices.com/pagead/conversion.js': `
    (function() {
      var noopfn = function() {};
      window.google_trackConversion = noopfn;
    })();
  `,

  // Facebook Pixel
  'connect.facebook.net/en_US/fbevents.js': `
    (function() {
      var noopfn = function() {};
      window.fbq = window.fbq || function() {
        if (window.fbq.callMethod) {
          window.fbq.callMethod.apply(window.fbq, arguments);
        } else {
          window.fbq.queue = window.fbq.queue || [];
          window.fbq.queue.push(arguments);
        }
      };
      window.fbq.push = noopfn;
      window.fbq.loaded = true;
      window.fbq.version = '2.0';
      window.fbq.queue = [];
      window._fbq = window.fbq;
    })();
  `,

  // Twitter tracking
  'static.ads-twitter.com/uwt.js': `
    (function() {
      window.twq = window.twq || function() {
        (window.twq.exe ? window.twq.exe : window.twq.queue).push(arguments);
      };
      window.twq.version = '1.1';
      window.twq.queue = [];
    })();
  `,

  // Hotjar
  'static.hotjar.com/c/hotjar': `
    (function() {
      window.hj = window.hj || function() {
        (window.hj.q = window.hj.q || []).push(arguments);
      };
      window._hjSettings = window._hjSettings || {};
    })();
  `,

  // Segment.io
  'cdn.segment.com/analytics.js': `
    (function() {
      var analytics = window.analytics = window.analytics || [];
      if (analytics.initialize) return;
      analytics.invoked = true;
      analytics.methods = [
        'trackSubmit', 'trackClick', 'trackLink', 'trackForm',
        'pageview', 'identify', 'reset', 'group', 'track',
        'ready', 'alias', 'debug', 'page', 'once', 'off', 'on'
      ];
      analytics.factory = function(method) {
        return function() {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(method);
          analytics.push(args);
          return analytics;
        };
      };
      for (var i = 0; i < analytics.methods.length; i++) {
        var method = analytics.methods[i];
        analytics[method] = analytics.factory(method);
      }
      analytics.load = function() {};
      analytics.SNIPPET_VERSION = '4.1.0';
    })();
  `,

  // Mixpanel
  'cdn.mxpnl.com/libs/mixpanel': `
    (function() {
      window.mixpanel = window.mixpanel || [];
      var methods = [
        'track', 'track_pageview', 'track_links', 'track_forms',
        'register', 'register_once', 'alias', 'unregister', 'identify',
        'name_tag', 'set_config', 'reset', 'opt_in_tracking', 'opt_out_tracking',
        'people.set', 'people.set_once', 'people.increment', 'people.track_charge',
        'people.append', 'people.union', 'people.delete_user'
      ];
      for (var i = 0; i < methods.length; i++) {
        (function(method) {
          window.mixpanel[method] = function() {
            window.mixpanel.push([method].concat(Array.prototype.slice.call(arguments, 0)));
          };
        })(methods[i]);
      }
      window.mixpanel._i = [];
      window.mixpanel.init = function() {};
    })();
  `,

  // Amplitude
  'cdn.amplitude.com/libs/amplitude': `
    (function() {
      window.amplitude = window.amplitude || { _q: [], _iq: {} };
      var methods = [
        'init', 'logEvent', 'logRevenue', 'setUserId', 'setUserProperties',
        'setOptOut', 'setVersionName', 'setDomain', 'setDeviceId', 'enableTracking',
        'setGlobalUserProperties', 'identify', 'clearUserProperties', 'setGroup',
        'logRevenueV2', 'regenerateDeviceId', 'groupIdentify', 'onInit', 'logEventWithTimestamp',
        'logEventWithGroups', 'setSessionId', 'resetSessionId'
      ];
      function stub(method) {
        return function() {
          this._q.push([method].concat(Array.prototype.slice.call(arguments, 0)));
          return this;
        };
      }
      for (var i = 0; i < methods.length; i++) {
        amplitude.__proto__[methods[i]] = stub(methods[i]);
      }
      amplitude.getInstance = function(instance) {
        instance = instance || '$default_instance';
        if (!amplitude._iq[instance]) {
          amplitude._iq[instance] = { _q: [] };
          for (var j = 0; j < methods.length; j++) {
            amplitude._iq[instance][methods[j]] = stub(methods[j]);
          }
        }
        return amplitude._iq[instance];
      };
    })();
  `,

  // Optimizely
  'cdn.optimizely.com/js': `
    (function() {
      window.optimizely = window.optimizely || [];
      window.optimizely.push = function() {};
      window.optimizely.get = function() { return null; };
    })();
  `,

  // Chartbeat
  'static.chartbeat.com/js/chartbeat.js': `
    (function() {
      window.pSUPERFLY = window.pSUPERFLY || {};
      window.pSUPERFLY.activity = function() {};
      window._sf_async_config = window._sf_async_config || {};
    })();
  `,

  // Crazy Egg
  'script.crazyegg.com/pages/scripts': `
    (function() {
      window.CE2 = window.CE2 || {};
      window.CE2.bN = function() {};
    })();
  `,

  // Quantcast
  'secure.quantserve.com/quant.js': `
    (function() {
      window.__qc = window.__qc || {};
      window._qevents = window._qevents || [];
      window.__qc.qcPageInfo = function() {};
    })();
  `,

  // Scorecard Research
  'sb.scorecardresearch.com/beacon.js': `
    (function() {
      window.COMSCORE = window.COMSCORE || {};
      window.COMSCORE.beacon = function() {};
      window.COMSCORE.purge = function() {};
      window._comscore = window._comscore || [];
    })();
  `,

  // AdRoll
  'static.adroll.com/j/roundtrip.js': `
    (function() {
      window.adroll = window.adroll || {};
      window.adroll.track = function() {};
      window.adroll_custom_data = window.adroll_custom_data || {};
      window.__adroll_loaded = true;
    })();
  `,

  // Criteo
  'static.criteo.net/js/ld/ld.js': `
    (function() {
      window.Criteo = window.Criteo || {};
      window.Criteo.CallRTA = function() {};
      window.Criteo.ComputeStandaloneDFPTargeting = function() { return {}; };
      window.Criteo.DisplayAd = function() {};
      window.Criteo.RenderAd = function() {};
      window.Criteo.Passback = { RenderStandard: function() {} };
    })();
  `,

  // Generic noop resources
  'noop.js': 'void 0;',
  'noop.txt': '',
  'noop.html': '<!DOCTYPE html><html><head></head><body></body></html>',
  'noop.json': '{}',
  'noop-1s.mp3': '', // Would be actual silent audio in production
  'noop-0.5s.mp3': '',
  'noop.mp4': '', // Would be transparent video

  // 1x1 transparent GIF
  '1x1.gif': 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  
  // 2x2 transparent PNG  
  '2x2.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAC0lEQVQI12NgAAIAAAUAAeImBZsAAAAASUVORK5CYII=',

  // 3x2 transparent PNG
  '3x2.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAAC0lEQVQI12NgwAcAAB4AAWbqPx0AAAAASUVORK5CYII=',

  // 32x32 transparent PNG
  '32x32.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGklEQVR42u3BAQEAAACCIP+vbkhAAQAA7wYMGAAB/5RBcAAAAABJRU5ErkJggg=='
};

// Match URL to redirect resource
function getRedirectResource(url) {
  const urlLower = url.toLowerCase();
  
  for (const [pattern, resource] of Object.entries(REDIRECT_RESOURCES)) {
    if (urlLower.includes(pattern.toLowerCase())) {
      return resource;
    }
  }
  
  return null;
}

// Create a data URL from resource content
function createDataUrl(content, mimeType) {
  if (content.startsWith('data:')) {
    return content;
  }
  
  const base64 = btoa(content);
  return `data:${mimeType};base64,${base64}`;
}

// Get MIME type for redirect
function getMimeType(url) {
  if (url.endsWith('.js')) return 'application/javascript';
  if (url.endsWith('.json')) return 'application/json';
  if (url.endsWith('.html')) return 'text/html';
  if (url.endsWith('.css')) return 'text/css';
  if (url.endsWith('.gif')) return 'image/gif';
  if (url.endsWith('.png')) return 'image/png';
  if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg';
  if (url.endsWith('.svg')) return 'image/svg+xml';
  if (url.endsWith('.mp3')) return 'audio/mpeg';
  if (url.endsWith('.mp4')) return 'video/mp4';
  return 'text/plain';
}

// Export
if (typeof module !== 'undefined') {
  module.exports = { REDIRECT_RESOURCES, getRedirectResource, createDataUrl, getMimeType };
}
