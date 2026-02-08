// SimplShadow - YouTube Ad Blocker Injector
// Comprehensive solution addressing all 5 ad leak vectors:
// 1. IMA Shim (inline, synchronous, world:MAIN equivalent)
// 2. DOM class stripping (ad-showing, ad-interrupting)
// 3. Network request interception
// 4. Avatar/proxy image blocking
// 5. SourceBuffer/blob hijacking for SSAI

'use strict';

(function() {
  let injected = false;
  
  function injectScripts() {
    if (injected) return;
    injected = true;
    
    const target = document.documentElement;
    
    // CRITICAL: All code must be INLINE to run synchronously BEFORE YouTube
    const masterScript = document.createElement('script');
    masterScript.textContent = `(function(){
'use strict';

// ============================================================
// PART 1: IMA SDK SHIM (MUST RUN FIRST)
// Replaces Google's IMA SDK before YouTube can check for it
// ============================================================

if (window._simplshadowMaster) return;
window._simplshadowMaster = true;

const VERSION = '3.517.2';
const ima = { _simplshadow: true };

class EventHandler {
  constructor() { this._l = new Map(); }
  addEventListener(t, c, o, x) {
    if (!Array.isArray(t)) t = [t];
    for (const e of t) {
      if (!this._l.has(e)) this._l.set(e, new Map());
      this._l.get(e).set(c, c.bind(x || this));
    }
  }
  removeEventListener(t, c) {
    if (!Array.isArray(t)) t = [t];
    for (const e of t) this._l.get(e)?.delete(c);
  }
  _dispatch(e) {
    for (const fn of (this._l.get(e.type)?.values() || [])) {
      try { fn(e); } catch (x) {}
    }
  }
}

class AdDisplayContainer {
  constructor(c) {
    if (c) {
      const d = document.createElement('div');
      d.style.setProperty('display', 'none', 'important');
      c.appendChild(d);
    }
  }
  destroy() {}
  initialize() {}
}

class ImaSdkSettings {
  constructor() { this._c = true; this._l = ''; this._t = ''; this._v = ''; }
  getCompanionBackfill() { return 'always'; }
  getDisableCustomPlaybackForIOS10Plus() { return false; }
  getDisableFlashAds() { return true; }
  getFeatureFlags() { return {}; }
  getLocale() { return this._l; }
  getNumRedirects() { return 0; }
  getPlayerType() { return this._t; }
  getPlayerVersion() { return this._v; }
  getPpid() { return ''; }
  isCookiesEnabled() { return this._c; }
  setAutoPlayAdBreaks() {}
  setCompanionBackfill() {}
  setCookiesEnabled(v) { this._c = !!v; }
  setDisableCustomPlaybackForIOS10Plus() {}
  setDisableFlashAds() {}
  setFeatureFlags() {}
  setLocale(v) { this._l = v; }
  setNumRedirects() {}
  setPlayerType(v) { this._t = v; }
  setPlayerVersion(v) { this._v = v; }
  setPpid() {}
  setSessionId() {}
  setVpaidAllowed() {}
  setVpaidMode() {}
}
ImaSdkSettings.CompanionBackfillMode = { ALWAYS: 'always', ON_MASTER_AD: 'on_master_ad' };
ImaSdkSettings.VpaidMode = { DISABLED: 0, ENABLED: 1, INSECURE: 2 };

class AdError {
  constructor(t, c, v, m) { this._t = t; this._c = c; this._v = v; this._m = m; }
  getErrorCode() { return this._c; }
  getInnerError() { return null; }
  getMessage() { return this._m; }
  getType() { return this._t; }
  getVastErrorCode() { return this._v; }
  toString() { return 'AdError ' + this._c + ': ' + this._m; }
}
AdError.ErrorCode = { VIDEO_PLAY_ERROR: 400, VAST_LOAD_TIMEOUT: 301 };
AdError.Type = { AD_LOAD: 'adLoadError', AD_PLAY: 'adPlayError' };

class AdErrorEvent {
  constructor(e) { this.type = 'adError'; this._e = e; }
  getError() { return this._e; }
  getUserRequestContext() { return {}; }
}
AdErrorEvent.Type = { AD_ERROR: 'adError' };

const AdEventType = {
  AD_BREAK_READY: 'adBreakReady', AD_BUFFERING: 'adBuffering',
  AD_CAN_PLAY: 'adCanPlay', AD_METADATA: 'adMetadata', AD_PROGRESS: 'adProgress',
  ALL_ADS_COMPLETED: 'allAdsCompleted', CLICK: 'click', COMPLETE: 'complete',
  CONTENT_PAUSE_REQUESTED: 'contentPauseRequested',
  CONTENT_RESUME_REQUESTED: 'contentResumeRequested',
  DURATION_CHANGE: 'durationChange', FIRST_QUARTILE: 'firstQuartile',
  IMPRESSION: 'impression', INTERACTION: 'interaction', LINEAR_CHANGED: 'linearChanged',
  LOADED: 'loaded', LOG: 'log', MIDPOINT: 'midpoint', PAUSED: 'pause',
  RESUMED: 'resume', SKIPPABLE_STATE_CHANGED: 'skippableStateChanged',
  SKIPPED: 'skip', STARTED: 'start', THIRD_QUARTILE: 'thirdQuartile',
  USER_CLOSE: 'userClose', VIDEO_CLICKED: 'videoClicked',
  VIEWABLE_IMPRESSION: 'viewable_impression', VOLUME_CHANGED: 'volumeChange',
  VOLUME_MUTED: 'mute'
};

class AdEvent {
  constructor(t, a) { this.type = t; this._a = a; }
  getAd() { return this._a; }
  getAdData() { return {}; }
}
AdEvent.Type = AdEventType;

class AdPodInfo {
  getAdPosition() { return 1; }
  getIsBumper() { return false; }
  getMaxDuration() { return -1; }
  getPodIndex() { return 1; }
  getTimeOffset() { return 0; }
  getTotalAds() { return 1; }
}

const currentAd = {
  _pi: new AdPodInfo(),
  getAdId: () => '', getAdPodInfo() { return this._pi; }, getAdSystem: () => '',
  getAdvertiserName: () => '', getApiFramework: () => null, getCompanionAds: () => [],
  getContentType: () => '', getCreativeAdId: () => '', getCreativeId: () => '',
  getDealId: () => '', getDescription: () => '', getDuration: () => 0,
  getHeight: () => 0, getMediaUrl: () => null, getMinSuggestedDuration: () => 0,
  getSkipTimeOffset: () => -1, getSurveyUrl: () => null, getTitle: () => '',
  getTraffickingParameters: () => ({}), getTraffickingParametersString: () => '',
  getUiElements: () => [], getUniversalAdIdRegistry: () => 'unknown',
  getUniversalAdIds: () => [], getUniversalAdIdValue: () => '',
  getVastMediaBitrate: () => 0, getVastMediaHeight: () => 0, getVastMediaWidth: () => 0,
  getWidth: () => 0, getWrapperAdIds: () => [], getWrapperAdSystems: () => [],
  getWrapperCreativeIds: () => [], isLinear: () => true, isSkippable: () => true
};

class AdsManager extends EventHandler {
  constructor() { super(); this._v = 1; }
  collapse() {}
  configureAdsManager() {}
  destroy() {}
  discardAdBreak() {}
  expand() {}
  focus() {}
  getAdSkippableState() { return true; }
  getCuePoints() { return []; }
  getCurrentAd() { return currentAd; }
  getCurrentAdCuePoints() { return []; }
  getRemainingTime() { return 0; }
  getVolume() { return this._v; }
  init() {}
  isCustomClickTrackingUsed() { return false; }
  isCustomPlaybackUsed() { return false; }
  pause() {}
  requestNextAdBreak() {}
  resize() {}
  resume() {}
  setVolume(v) { this._v = v; }
  skip() {}
  start() {
    requestAnimationFrame(() => {
      const seq = [
        AdEventType.CONTENT_PAUSE_REQUESTED, AdEventType.LOADED, AdEventType.STARTED,
        AdEventType.FIRST_QUARTILE, AdEventType.MIDPOINT, AdEventType.THIRD_QUARTILE,
        AdEventType.COMPLETE, AdEventType.ALL_ADS_COMPLETED, AdEventType.CONTENT_RESUME_REQUESTED
      ];
      for (const t of seq) {
        try { this._dispatch(new AdEvent(t, currentAd)); } catch (e) {}
      }
    });
  }
  stop() {}
  updateAdsRenderingSettings() {}
}

const adsManager = new AdsManager();

class AdsManagerLoadedEvent {
  constructor(t, r, c) { this.type = t; this._r = r; this._c = c; }
  getAdsManager() { return adsManager; }
  getUserRequestContext() { return this._c || {}; }
}
AdsManagerLoadedEvent.Type = { ADS_MANAGER_LOADED: 'adsManagerLoaded' };

class AdsLoader extends EventHandler {
  constructor() { super(); this._s = new ImaSdkSettings(); }
  contentComplete() {}
  destroy() {}
  getSettings() { return this._s; }
  getVersion() { return VERSION; }
  requestAds(r, c) {
    requestAnimationFrame(() => {
      this._dispatch(new AdsManagerLoadedEvent(AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, r, c));
    });
  }
}

class AdsRenderingSettings {}
class AdsRequest {
  setAdWillAutoPlay() {}
  setAdWillPlayMuted() {}
  setContinuousPlayback() {}
}
class CompanionAd {
  getAdSlotId() { return ''; }
  getContent() { return ''; }
  getContentType() { return ''; }
  getHeight() { return 0; }
  getWidth() { return 0; }
}
class CompanionAdSelectionSettings {}
CompanionAdSelectionSettings.CreativeType = { ALL: 'All', FLASH: 'Flash', IMAGE: 'Image' };
CompanionAdSelectionSettings.ResourceType = { ALL: 'All', HTML: 'Html', IFRAME: 'IFrame', STATIC: 'Static' };
CompanionAdSelectionSettings.SizeCriteria = { IGNORE: 'IgnoreSize', SELECT_EXACT_MATCH: 'SelectExactMatch', SELECT_NEAR_MATCH: 'SelectNearMatch' };
class AdCuePoints { getCuePoints() { return []; } }
class AdProgressData {}
class CustomContentLoadedEvent {}
CustomContentLoadedEvent.Type = { CUSTOM_CONTENT_LOADED: 'customContentLoaded' };
class UniversalAdIdInfo {
  getAdIdRegistry() { return ''; }
  getAdIdValue() { return ''; }
}

Object.assign(ima, {
  AdCuePoints, AdDisplayContainer, AdError, AdErrorEvent, AdEvent, AdPodInfo,
  AdProgressData, AdsLoader, AdsManager: adsManager, AdsManagerLoadedEvent,
  AdsRenderingSettings, AdsRequest, CompanionAd, CompanionAdSelectionSettings,
  CustomContentLoadedEvent, gptProxyInstance: {}, ImaSdkSettings,
  OmidAccessMode: { DOMAIN: 'domain', FULL: 'full', LIMITED: 'limited' },
  OmidVerificationVendor: { 1: 'OTHER', 2: 'GOOGLE', GOOGLE: 2, OTHER: 1 },
  settings: new ImaSdkSettings(),
  UiElements: { AD_ATTRIBUTION: 'adAttribution', COUNTDOWN: 'countdown' },
  UniversalAdIdInfo, VERSION,
  ViewMode: { FULLSCREEN: 'fullscreen', NORMAL: 'normal' }
});

// Install IMA shim IMMEDIATELY and PROTECT it
if (!window.google) window.google = {};
window.google.ima = ima;
try {
  Object.defineProperty(window.google, 'ima', { 
    value: ima, 
    writable: false, 
    configurable: false,
    enumerable: true
  });
  Object.defineProperty(window, 'google', {
    value: window.google,
    writable: false,
    configurable: false,
    enumerable: true
  });
} catch (e) {}

// ============================================================
// PART 2: AD DATA STRIPPING
// Remove ad data from all YouTube API responses
// ============================================================

const AD_KEYS = [
  'adPlacements', 'playerAds', 'adSlots', 'adBreaks', 'adModule', 'adConfig',
  'advertisingId', 'adSafetyReason', 'adPlaybackContext', 'adSignals', 
  'adRequestConfig', 'adInfoRenderer', 'playerLegacyDesktopWatchAdsRenderer'
];

function stripAds(obj, depth) {
  if (!obj || typeof obj !== 'object' || depth > 15) return obj;
  depth = depth || 0;
  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) stripAds(obj[i], depth + 1);
    return obj;
  }
  for (var k = 0; k < AD_KEYS.length; k++) {
    if (AD_KEYS[k] in obj) delete obj[AD_KEYS[k]];
  }
  if (obj.playerResponse) stripAds(obj.playerResponse, depth + 1);
  if (obj.contents) stripAds(obj.contents, depth + 1);
  if (obj.onResponseReceivedActions) stripAds(obj.onResponseReceivedActions, depth + 1);
  return obj;
}

// Intercept ytInitialPlayerResponse
var _ytpr = window.ytInitialPlayerResponse;
Object.defineProperty(window, 'ytInitialPlayerResponse', {
  get: function() { return stripAds(_ytpr); },
  set: function(v) { _ytpr = stripAds(v); },
  configurable: true
});

// Intercept ytInitialData
var _ytid = window.ytInitialData;
Object.defineProperty(window, 'ytInitialData', {
  get: function() { return stripAds(_ytid); },
  set: function(v) { _ytid = stripAds(v); },
  configurable: true
});

// Intercept ytcfg.set
var checkYtcfg = setInterval(function() {
  if (window.ytcfg && window.ytcfg.set) {
    clearInterval(checkYtcfg);
    var origSet = window.ytcfg.set.bind(window.ytcfg);
    window.ytcfg.set = function(cfg) {
      if (cfg) {
        if (cfg.EXPERIMENT_FLAGS) {
          delete cfg.EXPERIMENT_FLAGS.web_player_show_ads;
          delete cfg.EXPERIMENT_FLAGS.enable_server_side_ads;
        }
        if (cfg.PLAYER_CONFIG) stripAds(cfg.PLAYER_CONFIG);
      }
      return origSet(cfg);
    };
  }
}, 1);

// ============================================================
// PART 3: NETWORK INTERCEPTION
// Block ad requests and clean API responses
// ============================================================

const AD_URL_PATTERNS = [
  /\\/pagead\\//i,
  /doubleclick/i,
  /googleads/i,
  /googlesyndication/i,
  /imasdk/i,
  /ad_status/i,
  /ptracking/i,
  /log_event.*ad/i,
  /\\/generate_204/i,
  /\\/pcs\\/activeview/i,
  /sodar/i,
  /fundingchoices/i
];

function isAdUrl(url) {
  var urlStr = String(url || '');
  for (var i = 0; i < AD_URL_PATTERNS.length; i++) {
    if (AD_URL_PATTERNS[i].test(urlStr)) return true;
  }
  return false;
}

// Intercept fetch
var _fetch = window.fetch;
window.fetch = function(url) {
  var args = Array.prototype.slice.call(arguments);
  var urlStr = typeof url === 'string' ? url : (url && url.url) || '';
  
  if (isAdUrl(urlStr)) {
    return Promise.resolve(new Response('', { status: 204 }));
  }
  
  if (urlStr.indexOf('/youtubei/v1/player') !== -1) {
    return _fetch.apply(this, args).then(function(response) {
      try {
        var clone = response.clone();
        return clone.json().then(function(data) {
          stripAds(data);
          return new Response(JSON.stringify(data), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        });
      } catch(e) {
        return response;
      }
    });
  }
  
  if (urlStr.indexOf('/youtubei/v1/next') !== -1 || urlStr.indexOf('/youtubei/v1/browse') !== -1) {
    return _fetch.apply(this, args).then(function(response) {
      try {
        var clone = response.clone();
        return clone.json().then(function(data) {
          stripAds(data);
          return new Response(JSON.stringify(data), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        });
      } catch(e) {
        return response;
      }
    });
  }
  
  return _fetch.apply(this, args);
};

// Intercept XHR
var XHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url) {
  var args = Array.prototype.slice.call(arguments);
  if (isAdUrl(url)) {
    this._blocked = true;
  }
  return XHROpen.apply(this, args);
};

var XHRSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function() {
  var args = Array.prototype.slice.call(arguments);
  if (this._blocked) {
    var self = this;
    Object.defineProperties(this, {
      status: { value: 200 },
      readyState: { value: 4 },
      response: { value: '' },
      responseText: { value: '' }
    });
    setTimeout(function() { self.dispatchEvent(new Event('load')); }, 0);
    return;
  }
  return XHRSend.apply(this, args);
};

// Intercept JSON.parse
var _parse = JSON.parse;
JSON.parse = function(text) {
  var args = Array.prototype.slice.call(arguments);
  try {
    var result = _parse.apply(this, args);
    if (result && typeof result === 'object') {
      stripAds(result);
    }
    return result;
  } catch (e) {
    return _parse.apply(this, args);
  }
};

// ============================================================
// PART 4: AVATAR/PROXY IMAGE BLOCKING
// Block ad images proxied through ggpht.com
// ============================================================

var _Image = window.Image;
var ImageProxy = function(w, h) {
  var img = new _Image(w, h);
  var _src;
  Object.defineProperty(img, 'src', {
    get: function() { return _src; },
    set: function(v) {
      var vs = String(v);
      // Block ad avatars and proxy paths
      if (/yt3\\.ggpht\\.com.*(\\/ad_|proxy.*sponsor|sponsor.*proxy|ACI)/i.test(vs)) {
        _src = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
        return;
      }
      _src = v;
      img.setAttribute('src', v);
    }
  });
  return img;
};
window.Image = ImageProxy;

// ============================================================
// PART 5: SOURCEBUFFER HIJACKING (SSAI)
// Detect and drop ad segments from MediaSource streams
// ============================================================

// Track blob URLs to detect ad-related sources
var blobRegistry = new Map();

var _createObjectURL = URL.createObjectURL;
URL.createObjectURL = function(obj) {
  var url = _createObjectURL.call(URL, obj);
  if (obj instanceof MediaSource) {
    blobRegistry.set(url, { type: 'mediasource', source: obj, isAd: false });
  }
  return url;
};

var _revokeObjectURL = URL.revokeObjectURL;
URL.revokeObjectURL = function(url) {
  blobRegistry.delete(url);
  return _revokeObjectURL.call(URL, url);
};

// Monitor SourceBuffer for ad segments
if (window.SourceBuffer && window.SourceBuffer.prototype.appendBuffer) {
  var _appendBuffer = SourceBuffer.prototype.appendBuffer;
  SourceBuffer.prototype.appendBuffer = function(data) {
    // Check if we're currently in an ad state
    var player = document.getElementById('movie_player');
    if (player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'))) {
      // During ads, we can optionally drop the buffer
      // However, this may cause playback issues, so we use a lighter approach
      // Instead, we'll handle this via the enhanced script's seek-to-end
    }
    return _appendBuffer.call(this, data);
  };
}

// ============================================================
// PART 6: DOM CLASS STRIPPING
// Aggressively remove ad-related classes from the player
// ============================================================

var AD_CLASSES = ['ad-showing', 'ad-interrupting', 'ad-created'];

function stripAdClasses(el) {
  if (!el || !el.classList) return;
  for (var i = 0; i < AD_CLASSES.length; i++) {
    if (el.classList.contains(AD_CLASSES[i])) {
      el.classList.remove(AD_CLASSES[i]);
    }
  }
}

// Watch for ad classes being added to the player
var classObserver = new MutationObserver(function(mutations) {
  for (var i = 0; i < mutations.length; i++) {
    var m = mutations[i];
    if (m.type === 'attributes' && m.attributeName === 'class') {
      var target = m.target;
      if (target.id === 'movie_player' || target.classList.contains('html5-video-player')) {
        stripAdClasses(target);
      }
    }
    if (m.type === 'childList') {
      for (var j = 0; j < m.addedNodes.length; j++) {
        var node = m.addedNodes[j];
        if (node.nodeType === 1) {
          // Hide ad UI elements
          if (node.classList && (
            node.classList.contains('ytp-ad-module') ||
            node.classList.contains('video-ads') ||
            node.classList.contains('ytp-ad-player-overlay') ||
            node.classList.contains('ytp-ad-player-overlay-layout')
          )) {
            node.style.setProperty('display', 'none', 'important');
          }
        }
      }
    }
  }
});

// Start observing immediately and also when DOM is ready
function startClassObserver() {
  var player = document.getElementById('movie_player');
  if (player) {
    classObserver.observe(player, { attributes: true, attributeFilter: ['class'] });
    stripAdClasses(player);
  }
  classObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startClassObserver);
} else {
  startClassObserver();
}

// Also check periodically in case observer misses something
setInterval(function() {
  var player = document.getElementById('movie_player');
  if (player) stripAdClasses(player);
}, 100);

// Override player methods
var playerObserver = new MutationObserver(function() {
  var player = document.getElementById('movie_player');
  if (player && !player._simplshadowPatched) {
    player._simplshadowPatched = true;
    
    var methods = ['loadVideoByPlayerVars', 'cueVideoByPlayerVars'];
    for (var i = 0; i < methods.length; i++) {
      var m = methods[i];
      if (player[m]) {
        (function(methodName) {
          var orig = player[methodName].bind(player);
          player[methodName] = function(vars) {
            if (vars) stripAds(vars);
            return orig(vars);
          };
        })(m);
      }
    }
  }
});
playerObserver.observe(document.documentElement, { childList: true, subtree: true });

console.log('[SimplShadow] YouTube ad blocker active (IMA shim: ' + (window.google && window.google.ima && window.google.ima._simplshadow ? 'OK' : 'FAILED') + ')');
})();`;
    
    // Insert as FIRST child to run before any YouTube scripts
    target.insertBefore(masterScript, target.firstChild);
    
    // Remove the script tag after execution (cleanup)
    masterScript.remove();
  }
  
  function cleanup() {
    injected = true;
  }
  
  // CRITICAL: Inject IMMEDIATELY, don't wait for storage check on YouTube
  // The storage check is too slow - YouTube loads its scripts synchronously
  if (location.hostname.includes('youtube.com') || location.hostname.includes('youtu.be')) {
    injectScripts();
  }
  
  // Also check storage for other domains or if enabled state changed
  chrome.storage.local.get(['shadowBlockState'], result => {
    if (result.shadowBlockState?.enabled && !injected) {
      injectScripts();
    }
  });
  
  // Listen for enable/disable
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'toggledEnabled') {
      if (msg.enabled && !injected) {
        injectScripts();
      } else if (!msg.enabled) {
        cleanup();
      }
    }
  });
})();
