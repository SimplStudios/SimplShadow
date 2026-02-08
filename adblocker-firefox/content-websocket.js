// ShadowBlock - WebSocket & WebRTC Blocker
// Blocks tracking through WebSocket and WebRTC connections

'use strict';

(function() {
  const DEBUG = false;
  const log = DEBUG ? console.log.bind(console, '[ShadowBlock WS/RTC]') : () => {};

  // Patterns that indicate tracking/ad WebSocket connections
  const WS_BLOCKED_PATTERNS = [
    /doubleclick\.net/i,
    /googlesyndication\.com/i,
    /googleadservices\.com/i,
    /adservice\.google/i,
    /pagead2\.googlesyndication/i,
    /analytics\.google\.com/i,
    /facebook\.com\/tr/i,
    /connect\.facebook\.net/i,
    /bat\.bing\.com/i,
    /ads\./i,
    /tracking\./i,
    /pixel\./i,
    /beacon\./i,
    /telemetry\./i,
    /metrics\./i,
    /collector\./i,
    /stats\./i,
    /\.hotjar\.com/i,
    /\.mixpanel\.com/i,
    /\.amplitude\.com/i,
    /\.segment\.io/i,
    /\.segment\.com/i,
    /\.optimizely\.com/i,
    /\.crazyegg\.com/i,
    /\.fullstory\.com/i,
    /\.mouseflow\.com/i,
    /\.inspectlet\.com/i,
    /\.luckyorange\.com/i,
    /\.heapanalytics\.com/i,
    /\.kissmetrics\.com/i,
    /\.mxpnl\.com/i
  ];

  // WebRTC STUN/TURN servers used for tracking
  const RTC_BLOCKED_SERVERS = [
    'stun:global.stun.twilio.com',
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
    'stun:stun3.l.google.com:19302',
    'stun:stun4.l.google.com:19302'
  ];

  // Check if URL matches blocked patterns
  function isBlockedWS(url) {
    return WS_BLOCKED_PATTERNS.some(pattern => pattern.test(url));
  }

  // ============== WebSocket Interception ==============
  const OriginalWebSocket = window.WebSocket;
  
  class ProxyWebSocket extends OriginalWebSocket {
    constructor(url, protocols) {
      const urlStr = String(url);
      
      if (isBlockedWS(urlStr)) {
        log('Blocked WebSocket:', urlStr);
        // Create a fake WebSocket that does nothing
        throw new Error('ShadowBlock: WebSocket blocked');
      }
      
      super(url, protocols);
      log('Allowed WebSocket:', urlStr);
    }
  }

  // Preserve static properties
  ProxyWebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  ProxyWebSocket.OPEN = OriginalWebSocket.OPEN;
  ProxyWebSocket.CLOSING = OriginalWebSocket.CLOSING;
  ProxyWebSocket.CLOSED = OriginalWebSocket.CLOSED;

  // Replace WebSocket
  Object.defineProperty(window, 'WebSocket', {
    value: ProxyWebSocket,
    writable: false,
    configurable: true
  });

  // ============== EventSource Interception ==============
  if (window.EventSource) {
    const OriginalEventSource = window.EventSource;
    
    class ProxyEventSource extends OriginalEventSource {
      constructor(url, config) {
        const urlStr = String(url);
        
        if (isBlockedWS(urlStr)) {
          log('Blocked EventSource:', urlStr);
          throw new Error('ShadowBlock: EventSource blocked');
        }
        
        super(url, config);
      }
    }

    Object.defineProperty(window, 'EventSource', {
      value: ProxyEventSource,
      writable: false,
      configurable: true
    });
  }

  // ============== WebRTC Interception ==============
  // Note: Full WebRTC blocking can break legitimate functionality
  // We only filter out known tracking servers

  if (window.RTCPeerConnection) {
    const OriginalRTCPeerConnection = window.RTCPeerConnection;
    
    class ProxyRTCPeerConnection extends OriginalRTCPeerConnection {
      constructor(config) {
        // Filter out tracking STUN/TURN servers
        if (config?.iceServers) {
          config.iceServers = config.iceServers.filter(server => {
            const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
            const blocked = urls.some(url => 
              RTC_BLOCKED_SERVERS.includes(url) ||
              isBlockedWS(url)
            );
            if (blocked) {
              log('Filtered RTC server:', urls.join(', '));
            }
            return !blocked;
          });
        }
        
        super(config);
      }
    }

    // Copy static properties
    for (const prop of Object.getOwnPropertyNames(OriginalRTCPeerConnection)) {
      if (prop !== 'prototype' && prop !== 'length' && prop !== 'name') {
        try {
          ProxyRTCPeerConnection[prop] = OriginalRTCPeerConnection[prop];
        } catch (e) {}
      }
    }

    Object.defineProperty(window, 'RTCPeerConnection', {
      value: ProxyRTCPeerConnection,
      writable: false,
      configurable: true
    });

    // Also handle webkit prefix
    if (window.webkitRTCPeerConnection) {
      Object.defineProperty(window, 'webkitRTCPeerConnection', {
        value: ProxyRTCPeerConnection,
        writable: false,
        configurable: true
      });
    }
  }

  // ============== Beacon API Interception ==============
  if (navigator.sendBeacon) {
    const originalSendBeacon = navigator.sendBeacon.bind(navigator);
    
    navigator.sendBeacon = function(url, data) {
      const urlStr = String(url);
      
      if (isBlockedWS(urlStr)) {
        log('Blocked beacon:', urlStr);
        return true; // Pretend it succeeded
      }
      
      return originalSendBeacon(url, data);
    };
  }

  // ============== Navigator.connection Spoofing ==============
  // Some trackers use connection info
  if (navigator.connection) {
    const originalConnection = navigator.connection;
    
    const spoofedConnection = {
      effectiveType: '4g',
      rtt: 50,
      downlink: 10,
      saveData: false,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true
    };

    try {
      Object.defineProperty(navigator, 'connection', {
        get: () => spoofedConnection,
        configurable: true
      });
    } catch (e) {}
  }

  // ============== Performance API Privacy ==============
  // Some trackers use performance.timing for fingerprinting
  if (window.PerformanceObserver) {
    const OriginalPerformanceObserver = window.PerformanceObserver;
    
    class ProxyPerformanceObserver extends OriginalPerformanceObserver {
      constructor(callback) {
        // Wrap callback to filter tracking-related entries
        const wrappedCallback = (list, observer) => {
          const entries = list.getEntries().filter(entry => {
            // Filter resource timing for tracking resources
            if (entry.entryType === 'resource') {
              return !isBlockedWS(entry.name);
            }
            return true;
          });
          
          if (entries.length > 0) {
            // Create a synthetic list
            callback({ getEntries: () => entries }, observer);
          }
        };
        
        super(wrappedCallback);
      }
    }

    // Copy static properties
    ProxyPerformanceObserver.supportedEntryTypes = OriginalPerformanceObserver.supportedEntryTypes;

    Object.defineProperty(window, 'PerformanceObserver', {
      value: ProxyPerformanceObserver,
      writable: false,
      configurable: true
    });
  }

  log('WebSocket/WebRTC blocking initialized');
})();
