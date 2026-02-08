// SimplShadow - YouTube Ad Blocker Injector
// Injects IMA shim and player interceptor before YouTube scripts run

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
    
    // 2. Inject the player response interceptor (removes ad data from player config)
    const interceptScript = document.createElement('script');
    interceptScript.textContent = `(function(){
'use strict';
if(window._simplshadowYT)return;window._simplshadowYT=true;
const adKeys=['adPlacements','playerAds','adSlots','adBreaks','adModule','adConfig'];
function strip(o){if(!o||typeof o!=='object')return o;for(const k of adKeys)delete o[k];if(o.playerResponse)strip(o.playerResponse);return o}
let _pr=window.ytInitialPlayerResponse;
Object.defineProperty(window,'ytInitialPlayerResponse',{get:()=>strip(_pr),set:v=>{_pr=strip(v)},configurable:true});
const _fetch=window.fetch;
window.fetch=function(u,...a){const s=typeof u==='string'?u:u?.url||'';if(/pagead|doubleclick|googleads|\\/api\\/stats\\/ads/.test(s))return Promise.resolve(new Response('',{status:204}));return _fetch.apply(this,[u,...a])};
const _parse=JSON.parse;
JSON.parse=function(t,...a){try{const r=_parse.apply(this,[t,...a]);if(r&&typeof r==='object')strip(r);return r}catch(e){return _parse.apply(this,[t,...a])}};
})();`;
    target.insertBefore(interceptScript, shimScript.nextSibling);
  }
  
  function cleanup() {
    // Can't truly undo the shim without reload, but stop any future injection
    injected = true;
  }
  
  // Check if enabled
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
