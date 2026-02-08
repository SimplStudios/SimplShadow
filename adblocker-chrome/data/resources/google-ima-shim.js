/**
 * SimplShadow - Google IMA SDK Shim
 * Based on uBlock Origin's approach (Mozilla Public License 2.0)
 * 
 * Replaces Google's IMA SDK with a stub that immediately signals ad completion.
 */

(function() {
  'use strict';
  
  // Mark as installed (prevents double injection)
  if (window._simplshadowIMA) return;
  window._simplshadowIMA = true;
  
  const VERSION = '3.517.2';
  const ima = { _simplshadow: true };

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
    constructor() {
      this._c = true; this._l = ''; this._t = ''; this._v = '';
    }
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

  class AdError {
    constructor(t, c, v, m) { this._t = t; this._c = c; this._v = v; this._m = m; }
    getErrorCode() { return this._c; }
    getInnerError() { return null; }
    getMessage() { return this._m; }
    getType() { return this._t; }
    getVastErrorCode() { return this._v; }
    toString() { return `AdError ${this._c}: ${this._m}`; }
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
      // Immediately fire all ad completion events
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
      // Immediately return fake loaded event
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

  // Install shim
  if (!window.google) window.google = {};
  window.google.ima = ima;
  
  // Prevent overwriting
  try {
    Object.defineProperty(window.google, 'ima', { value: ima, writable: false, configurable: false });
  } catch (e) {}
})();
