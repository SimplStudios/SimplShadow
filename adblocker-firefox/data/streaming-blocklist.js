// ShadowBlock - YouTube & Streaming Ad Blocker Module
// Specialized rules for video platforms

const YOUTUBE_AD_SELECTORS = [
  // Video ads
  '.video-ads',
  '.ytp-ad-module',
  '.ytp-ad-overlay-slot',
  '.ytp-ad-text-overlay',
  '.ytp-ad-overlay-container',
  '.ytp-ad-overlay-close-button',
  '.ytp-ad-player-overlay',
  '.ytp-ad-player-overlay-layout',
  '.ytp-ad-player-overlay-instream-info',
  '.ytp-ad-skip-button-container',
  '.ytp-ad-skip-button',
  '.ytp-ad-preview-container',
  '.ytp-ad-message-container',
  '.ytp-ad-persistent-progress-bar-container',
  '.ytp-ad-progress',
  '.ytp-ad-progress-list',
  '.ad-showing',
  '.ad-interrupting',
  
  // Sidebar/feed ads
  'ytd-ad-slot-renderer',
  'ytd-banner-promo-renderer',
  'ytd-video-masthead-ad-v3-renderer',
  'ytd-primetime-promo-renderer',
  'ytd-compact-promoted-video-renderer',
  'ytd-promoted-sparkles-web-renderer',
  'ytd-promoted-video-renderer',
  'ytd-display-ad-renderer',
  'ytd-statement-banner-renderer',
  'ytd-in-feed-ad-layout-renderer',
  'ytd-action-companion-ad-renderer',
  'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
  
  // Masthead ads
  '#masthead-ad',
  '#player-ads',
  '#panels > ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
  
  // Merch/promo
  'ytd-merch-shelf-renderer',
  'ytd-compact-promoted-item-renderer',
  '#related ytd-promoted-sparkles-web-renderer',
  
  // Shorts ads  
  'ytd-reel-video-renderer[is-ad]',
  'ytd-ad-slot-renderer',
  
  // Premium upsells
  'ytd-mealbar-promo-renderer',
  'tp-yt-paper-dialog:has(yt-upsell-dialog-renderer)',
  'ytd-popup-container:has(yt-upsell-dialog-renderer)',
  
  // Survey/feedback
  'ytd-survey-renderer',
  'ytd-single-option-survey-renderer',
  
  // Homepage promos
  'ytd-brand-video-singleton-renderer',
  'ytd-brand-video-shelf-renderer',
  'ytd-rich-section-renderer:has(.ytd-statement-banner-renderer)'
];

const TWITCH_AD_SELECTORS = [
  // Video ads
  '.video-player__ad-overlay',
  '.player-ad-overlay',
  '[data-a-target="video-ad-label"]',
  '[data-a-target="video-ad-countdown"]',
  '.tw-absolute--fill:has([data-a-target="video-ad-label"])',
  
  // Display ads
  '.stream-display-ad',
  '.channel-leaderboard-ad',
  '[data-a-target="ad-banner"]',
  '.top-nav__ad-container',
  '.side-nav-ad',
  
  // Prime/sub promos
  '.prime-offers',
  '[data-a-target="prime-offer"]',
  '.channel-panels__content:has([data-a-target="prime-offer"])'
];

const SPOTIFY_AD_SELECTORS = [
  '.ad-slot',
  '[data-testid="ad-slot"]',
  '.sponsor-container',
  '[data-testid="sponsor"]',
  '.upgrade-modal',
  '[data-testid="upgrade-button"]'
];

const REDDIT_AD_SELECTORS = [
  // New Reddit
  'shreddit-ad-post',
  '[data-testid="ad-slot"]',
  '.promotedlink',
  '[data-promoted="true"]',
  'div[data-before-content="promoted"]',
  
  // Old Reddit
  '.promoted',
  '.sponsorshipbox',
  '#siteTable .promotedlink'
];

const TWITTER_AD_SELECTORS = [
  // Promoted tweets
  '[data-testid="placementTracking"]',
  'article:has([data-testid="placementTracking"])',
  '[data-promoted="true"]',
  'div[data-testid="tweet"]:has(path[d*="M19.498"])', // Promoted icon path
  
  // Who to follow (ads)
  '[data-testid="UserCell"]:has([data-promoted="true"])',
  
  // Trends for you (promoted)
  '[data-testid="trend"]:has([data-promoted="true"])'
];

const INSTAGRAM_AD_SELECTORS = [
  // Sponsored posts
  'article:has(span:contains("Sponsored"))',
  '[data-ad-preview]',
  'article a[href*="/ads/"]',
  
  // Story ads
  '[data-story-ad]'
];

const TIKTOK_AD_SELECTORS = [
  // Video ads
  '[class*="DivAdCard"]',
  '[data-e2e="ad-card"]',
  'div[class*="tiktok-ad"]',
  '[class*="SparkAdsPostWrapper"]'
];

const FACEBOOK_AD_SELECTORS = [
  // Sponsored posts
  '[data-pagelet*="FeedUnit"]:has(a[href*="/ads/"])',
  'div[data-pagelet]:has(span:contains("Sponsored"))',
  '[aria-label*="Sponsored"]',
  
  // Marketplace ads
  '[data-pagelet*="MarketplaceAd"]',
  
  // Suggested for you (ads)
  '[data-pagelet*="Suggestion"]'
];

// URL patterns for video ad requests
const VIDEO_AD_URL_PATTERNS = [
  // YouTube
  /googlevideo\.com\/videoplayback.*(?:&|%26)oad/i,
  /youtube\.com\/api\/stats\/ads/i,
  /youtube\.com\/pagead\//i,
  /youtube\.com\/ptracking/i,
  /youtube\.com\/api\/stats\/qoe.*adformat/i,
  /youtube\.com\/get_video_info.*(?:&|%26)ad_/i,
  /youtube\.com\/watch\?.*&ad_type=/i,
  /doubleclick\.net\/pagead\/adview/i,
  
  // Twitch
  /twitchsvc\.net\/.*\/ads\//i,
  /usher\.ttvnw\.net\/.*\/ads\//i,
  /imasdk\.googleapis\.com\/js\/.*\/ima3\.js/i,
  
  // General video ads
  /\.mp4.*(?:\?|&)ad/i,
  /\/ads?\/.*\.mp4/i,
  /video.*ad.*\.mp4/i
];

// Anti-Adblock bypass
const ANTI_ADBLOCK_DOMAINS = [
  'blockadblock.com',
  'fuckadblock.com',
  'admiral.com',
  'getadmiral.com',
  'pagefair.com',
  'pagefair.net',
  'instart.com',
  'instartlogic.com',
  'adintersect.com',
  'adblock-blocker.com',
  'fundingchoices.google.com',
  'googletagmanager.com/gtag/js',
  'adrecoveryfund.com',
  'recovery.pr.co',
  'aab.no',
  'adbackanalytics.bbelements.com',
  'adblockanalytics.com',
  'adblock.ai',
  'adskeeper.co.uk/adb',
  'blockmetrics.com',
  'detectadblock.com',
  'nativestart.com',
  'getsecuredfiles.com'
];

// Export for use in other modules
if (typeof module !== 'undefined') {
  module.exports = {
    YOUTUBE_AD_SELECTORS,
    TWITCH_AD_SELECTORS,
    SPOTIFY_AD_SELECTORS,
    REDDIT_AD_SELECTORS,
    TWITTER_AD_SELECTORS,
    INSTAGRAM_AD_SELECTORS,
    TIKTOK_AD_SELECTORS,
    FACEBOOK_AD_SELECTORS,
    VIDEO_AD_URL_PATTERNS,
    ANTI_ADBLOCK_DOMAINS
  };
}
