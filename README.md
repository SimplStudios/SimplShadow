# 🛡️ SimplShadow - The #1 Ad Blocker on Chrome 

A high-performance ad blocker with real-time analytics and a beautiful modern UI.

![Version](https://img.shields.io/badge/version-2.1.0-3B82F6)
![Firefox](https://img.shields.io/badge/Firefox-Manifest%20V2-FF7139)
![Chrome](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4)

## ✨ What's New in 2.1.0

- **Fresh New Look** - Completely redesigned UI with modern blue theme
- **Light/Dark Mode** - Auto-detects system theme or choose manually
- **Interactive Stats** - Slide panel showing detailed blocking info
- **Use Less RAM** - New memory optimization setting
- **Better Icons** - Blue gradient icons with disabled state indication
- **Lucide Icons** - Beautiful, consistent iconography throughout

## Features

- ⚡ **High-Performance Blocking** - Blocks ads at the network level before they load
- 📊 **Real-Time Analytics** - Track blocked ads with session, page, and all-time stats
- 🎯 **1500+ Ad Domains** - Pre-loaded blocklist covering major ad networks
- 🎨 **Modern UI** - Sleek interface with light/dark theme support
- 🌐 **Per-Site Whitelist** - Easily whitelist your favorite sites
- 🔒 **Privacy Focused** - No data collection, everything stays local
- 💾 **Memory Optimization** - "Use Less RAM" mode for lower memory footprint
- 🎬 **Streaming Support** - Advanced YouTube and Twitch ad blocking

## Installation

### Firefox (Manifest V2)

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on..."**
3. Navigate to `adblocker-firefox` folder
4. Select the `manifest.json` file
5. SimplShadow is now active!

**For permanent installation:**
1. Go to `about:addons`
2. Click the gear icon → "Install Add-on From File..."
3. Select the zipped extension folder

### Chrome / Edge (Manifest V3)

1. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
2. Enable **"Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the `adblocker-chrome` folder
5. SimplShadow is now active!

## Usage

### Main Controls

- **Power Button** - Large toggle in popup to enable/disable ad blocking
- **Stats Card** - Click to open detailed blocking statistics panel
- **Site Card** - Shows current domain with quick whitelist toggle
- **Settings** - Access theme, memory, and blocking options

### Statistics

- **Total Blocked** - Lifetime blocked requests
- **This Page** - Ads blocked on current page
- **Elements Hidden** - DOM elements removed
- **Detailed Panel** - Slide-out panel with top blocked domains

### Settings

- **Theme** - Auto (system), Light, or Dark mode
- **Use Less RAM** - Reduces memory by limiting stat history
- **Block WebSockets** - Prevent WebSocket ad connections
- **Block WebRTC** - Disable WebRTC IP leak
- **Cosmetic Filtering** - Enable/disable element hiding

### Icon Status

- **Blue icon** - Protection active
- **Gray icon** - Protection paused
- **Badge number** - Ads blocked this session

## What Gets Blocked

SimplShadow blocks:

- **Ad Networks** - Google Ads, Facebook Ads, Amazon Ads, etc.
- **Trackers** - Analytics, fingerprinting, cross-site tracking
- **Content Recommendations** - Taboola, Outbrain, etc.
- **Video Ads** - Pre-roll, mid-roll, overlay ads
- **Pop-ups/Popunders** - Intrusive overlay ads
- **Crypto Miners** - In-browser mining scripts
- **WebSocket Ads** - Real-time ad delivery channels
- **WebRTC Leaks** - Prevents IP address exposure

### Platform-Specific Blocking

| Platform | What's Blocked |
|----------|---------------|
| **YouTube** | Pre-roll/mid-roll video ads, overlay ads, sidebar promoted videos, masthead ads, auto-skip enabled, ad speed-up |
| **Twitch** | Video ads, display ads, Prime/Turbo promos |
| **Reddit** | Promoted posts, sidebar ads (old & new Reddit) |
| **Twitter/X** | Promoted tweets, promoted trends |
| **Facebook** | Sponsored posts, marketplace ads |
| **Instagram** | Sponsored posts, story ads |
| **TikTok** | In-feed video ads |
| **Spotify Web** | Display ads, upgrade prompts |

## Project Structure

```
├── adblocker-firefox/          # Firefox extension (Manifest V2)
│   ├── manifest.json
│   ├── background-enhanced.js  # Request interception with filter engine
│   ├── content.js              # DOM element hiding
│   ├── content-youtube-enhanced.js  # Advanced YouTube ad skipper
│   ├── content-twitch.js       # Twitch ad blocker
│   ├── content-websocket.js    # WebSocket blocking
│   ├── content.css             # Ad hiding styles
│   ├── data/
│   │   ├── blocklist.js        # Domain blocklist
│   │   └── streaming-blocklist.js  # Streaming platform rules
│   ├── popup/
│   │   ├── popup.html          # Modern redesigned popup
│   │   ├── popup.css           # Theme-aware styles
│   │   └── popup.js            # Popup functionality
│   ├── options/                # Settings page
│   └── icons/                  # Blue gradient + disabled icons
│
├── adblocker-chrome/           # Chrome extension (Manifest V3)
│   ├── manifest.json
│   ├── background.js           # Service worker
│   ├── content.js              # DOM element hiding
│   ├── content-youtube-enhanced.js  # Advanced YouTube ad skipper
│   ├── content-twitch.js       # Twitch ad blocker
│   ├── content-websocket.js    # WebSocket blocking
│   ├── content.css             # Ad hiding styles
│   ├── rules/
│   │   └── rules.json          # Declarative net request rules
│   ├── popup/
│   ├── options/
│   └── icons/
│
└── README.md
```

## Technical Details

### Firefox (Manifest V2)
- Uses `webRequest.onBeforeRequest` with blocking
- Full programmatic control over what gets blocked
- Filter list parsing (EasyList format support)
- Scriptlet injection for advanced ad bypass

### Chrome (Manifest V3)
- Uses `declarativeNetRequest` API
- Rules defined statically in JSON
- Dynamic rules for whitelist functionality
- More efficient but less flexible

## 🦊 Why Firefox is Better for Ad Blocking

**Not satisfied with the Chrome version? Try our Firefox Adblocker instead!**

Since Firefox's manifest has a lot less restrictions and a lot more leniency for ad blocking, we are able to improve the functionality of our adblocking much more on Firefox than on Chrome.

| Feature | Firefox (MV2) | Chrome (MV3) |
|---------|---------------|--------------|
| **Request Blocking** | Full programmatic control | Static rules only |
| **Filter Lists** | Live parsing & updates | Requires recompilation |
| **Scriptlet Injection** | Full support | Limited |
| **WebRequest API** | ✅ Blocking mode | ❌ Removed |
| **Dynamic Rules** | Unlimited | Limited to 5,000 |
| **Performance** | Slightly higher memory | More efficient |

However, we still try to improve the Chrome version of our app every day. Yet, we still suggest moving to Firefox if you want more of an ad-free experience.

### Design System
- **Fonts:** Outfit (logo), Plus Jakarta Sans (headings), Rubik (body)
- **Colors:** Primary blue (#3B82F6 to #1D4ED8)
- **Icons:** Lucide icon set
- **Themes:** CSS variables for light/dark mode

## Performance

SimplShadow is designed for minimal performance impact:

- Network-level blocking prevents ad resources from ever loading
- CSS-based element hiding is hardware-accelerated
- Efficient DOM observation with `MutationObserver`
- Stats updates are batched to reduce storage writes
- "Use Less RAM" mode further reduces memory footprint

## Privacy

- **No telemetry** - We don't collect any data
- **No remote servers** - Everything runs locally
- **No account required** - Just install and use
- **Open source** - Audit the code yourself

## Troubleshooting

### Site breaks with SimplShadow
Use the whitelist button to disable blocking for that site.

### Ads still showing
Some sites use advanced anti-adblock techniques. Try refreshing the page or report the site for blocklist updates.

### High memory usage
Enable "Use Less RAM" in settings to reduce memory footprint.

### Theme not changing
Make sure to select the theme in SimplShadow settings, or choose "Auto" to follow system preference.

## License

MIT License - Free to use, modify, and distribute.

## Contact

Email: simplstudios@protonmail.com

Company Website: https://simplstudios.vercel.app

---

**<span style="color:#3B82F6">Simpl</span>Shadow** - Browse the web without the noise. 🛡️
