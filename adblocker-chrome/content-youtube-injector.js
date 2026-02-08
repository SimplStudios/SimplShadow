// SimplShadow - YouTube Ad Blocker Injector
// Injects scripts to intercept and neutralize YouTube's ad system
// Must run at document_start before YouTube scripts load

'use strict';

(function() {
  let injected = false;
  
  function injectScripts() {
    if (injected) return;
    injected = true;
    
    const target = document.documentElement;
    
    // 1. Inject the IMA shim first (blocks Google IMA ads SDK)
    const shimScript = document.createElement('script');
    shimScript.src = chrome.runtime.getURL('data/resources/google-ima-shim.js');
    target.insertBefore(shimScript, target.firstChild);
    
    // 2. Inject comprehensive YouTube ad data interceptor
    const interceptScript = document.createElement('script');
    interceptScript.textContent = `(function(){
'use strict';
if(window._simplshadowYTIntercept)return;
window._simplshadowYTIntercept=true;

// Ad-related keys to strip from player responses
const AD_KEYS=['adPlacements','playerAds','adSlots','adBreaks','adModule','adConfig',
'advertisingId','adSafetyReason','adPlaybackContext','adSignals','adRequestConfig'];

// Strip ad data from any object recursively
function stripAds(obj,depth=0){
  if(!obj||typeof obj!=='object'||depth>10)return obj;
  if(Array.isArray(obj)){
    obj.forEach(item=>stripAds(item,depth+1));
    return obj;
  }
  for(const key of AD_KEYS){
    if(key in obj)delete obj[key];
  }
  // Clean playerResponse inside wrapper
  if(obj.playerResponse)stripAds(obj.playerResponse,depth+1);
  if(obj.contents)stripAds(obj.contents,depth+1);
  if(obj.onResponseReceivedActions)stripAds(obj.onResponseReceivedActions,depth+1);
  return obj;
}

// Intercept ytInitialPlayerResponse (initial page load)
let _ytpr=window.ytInitialPlayerResponse;
Object.defineProperty(window,'ytInitialPlayerResponse',{
  get:()=>stripAds(_ytpr),
  set:v=>{_ytpr=stripAds(v)},
  configurable:true
});

// Intercept ytInitialData (page data)
let _ytid=window.ytInitialData;
Object.defineProperty(window,'ytInitialData',{
  get:()=>stripAds(_ytid),
  set:v=>{_ytid=stripAds(v)},
  configurable:true
});

// Intercept ytcfg.set (YouTube config)
const origYtcfg=window.ytcfg;
if(origYtcfg&&origYtcfg.set){
  const origSet=origYtcfg.set.bind(origYtcfg);
  origYtcfg.set=function(cfg){
    if(cfg){
      // Remove ad-related config
      delete cfg.EXPERIMENT_FLAGS?.web_player_show_ads;
      delete cfg.EXPERIMENT_FLAGS?.enable_server_side_ads;
      if(cfg.PLAYER_CONFIG)stripAds(cfg.PLAYER_CONFIG);
    }
    return origSet(cfg);
  };
}

// Intercept fetch for player API responses
const _fetch=window.fetch;
window.fetch=function(url,...args){
  const urlStr=typeof url==='string'?url:url?.url||'';
  
  // Block ad-related requests completely
  if(/(\\/pagead\\/|doubleclick|googleads|googlesyndication|imasdk|ad_status|ptracking|log_event)/.test(urlStr)){
    return Promise.resolve(new Response('',{status:204}));
  }
  
  // For player requests, intercept and clean the response
  if(urlStr.includes('/youtubei/v1/player')){
    return _fetch.apply(this,[url,...args]).then(async response=>{
      try{
        const clone=response.clone();
        const data=await clone.json();
        stripAds(data);
        return new Response(JSON.stringify(data),{
          status:response.status,
          statusText:response.statusText,
          headers:response.headers
        });
      }catch(e){
        return response;
      }
    });
  }
  
  // For next/browse requests (SPA navigation), also clean
  if(urlStr.includes('/youtubei/v1/next')||urlStr.includes('/youtubei/v1/browse')){
    return _fetch.apply(this,[url,...args]).then(async response=>{
      try{
        const clone=response.clone();
        const data=await clone.json();
        stripAds(data);
        return new Response(JSON.stringify(data),{
          status:response.status,
          statusText:response.statusText,
          headers:response.headers
        });
      }catch(e){
        return response;
      }
    });
  }
  
  return _fetch.apply(this,[url,...args]);
};

// Intercept XHR
const XHROpen=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(method,url,...args){
  const urlStr=String(url);
  if(/(\\/pagead\\/|doubleclick|googleads|ptracking|log_event|ad_status)/.test(urlStr)){
    this._blocked=true;
  }
  return XHROpen.apply(this,[method,url,...args]);
};

const XHRSend=XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send=function(...args){
  if(this._blocked){
    Object.defineProperties(this,{
      status:{value:200},readyState:{value:4},response:{value:''},responseText:{value:''}
    });
    setTimeout(()=>this.dispatchEvent(new Event('load')),0);
    return;
  }
  return XHRSend.apply(this,args);
};

// Intercept JSON.parse to catch any ad data we might have missed
const _parse=JSON.parse;
JSON.parse=function(text,...args){
  try{
    const result=_parse.apply(this,[text,...args]);
    if(result&&typeof result==='object'){
      stripAds(result);
    }
    return result;
  }catch(e){
    return _parse.apply(this,[text,...args]);
  }
};

// Override player's ad methods if available
const observer=new MutationObserver(()=>{
  const player=document.getElementById('movie_player');
  if(player){
    // Override ad-related methods
    const methods=['loadVideoByPlayerVars','cueVideoByPlayerVars'];
    methods.forEach(m=>{
      if(player[m]){
        const orig=player[m].bind(player);
        player[m]=function(vars){
          if(vars)stripAds(vars);
          return orig(vars);
        };
      }
    });
  }
});
observer.observe(document.documentElement,{childList:true,subtree:true});

console.log('[SimplShadow] YouTube ad interceptor active');
})();`;
    target.insertBefore(interceptScript, shimScript.nextSibling);
  }
  
  function cleanup() {
    injected = true; // Prevent further injection
  }
  
  // Check if enabled and inject immediately
  chrome.storage.local.get(['shadowBlockState'], result => {
    if (result.shadowBlockState?.enabled) {
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
