# WealthyMindsets Pro 🏆

> **Professional trading platform built for the team. Real-time order flow, AI sentiment, Pine Script v5 engine, full social community, and more.**

---

## 🌐 Access the App (RIGHT NOW)

```
http://localhost:3000
```

Start the dev server:
```bash
npm run dev
```

---

## 📱 How the Homies Download the App

### Option 1 — iPhone (PWA)
1. Open **Safari** on iPhone → go to `http://YOUR-COMPUTER-IP:3000`
   > Find your IP: `ipconfig` (Windows) or `ifconfig | grep inet` (Mac)
2. Tap the **Share** button (box with arrow pointing up)
3. Scroll down → tap **"Add to Home Screen"**
4. Tap **Add** — WealthyMindsets Pro icon appears on home screen 🎯

### Option 2 — Android (PWA)
1. Open **Chrome** → go to `http://YOUR-COMPUTER-IP:3000`
2. Tap the **3-dot menu** → **"Add to Home Screen"** or **"Install App"**
3. Tap **Install** — standalone app, no browser UI

### Option 3 — Desktop Install (Chrome/Edge/Brave)
1. Visit app in Chrome or Edge
2. Click the **install icon** in the URL bar (looks like monitor + arrow)
3. Click **Install** — opens as its own window

### Option 4 — Windows .exe / Mac .dmg / Linux .AppImage

```bash
# First-time setup
npm install

# Build the desktop app
npm run electron:build:mac      # → Mac .dmg
npm run electron:build:win      # → Windows .exe installer
npm run electron:build:linux    # → Linux .AppImage
npm run electron:build:all      # → All platforms at once

# Files land in:  dist/
```

Share the `.exe` with Windows homies, `.dmg` with Mac homies — they install it like any app.

---

## 🚀 Quick Start

```bash
cd wealthymindsets-pro
npm install
npm run dev
# Open http://localhost:3000
```

---

## 🔑 Live Data (Optional)

Create `.env.local`:
```env
NEXT_PUBLIC_POLYGON_KEY=your_key_here
NEXT_PUBLIC_FINNHUB_KEY=your_key_here
```

Without keys: **synthetic engine kicks in automatically** — sub-100ms ticks, realistic order flow, identical look. Free tier keys at polygon.io and finnhub.io.

---

## 📺 Pages

| Route | What it does |
|---|---|
| `/charts` | Main trading dashboard — all the heat |
| `/scanner` | Market scanner |
| `/heatmaps` | Sector heat maps |
| `/news` | Live news with AI sentiment scoring |
| `/education` | CLC Rule, Wyckoff, YouTube |
| `/lounge` | The Lounge — team social |
| `/shop` | Merch |
| `/veddbuild` | VeddBuild — Faith + Forex community |
| `/profile` | Profile |
| `/journal` | Trade journal |
| `/backtesting` | Backtesting engine |

---

## ⚡ Platform Features

### Chart Engine
- All 16 timeframes (1 tick → Monthly), instant switch
- Volume Profile — right side, Bid/Ask inside bars, POC line, VAH/VAL shading
- Canvas order flow: bubbles at EXACT price levels
- 5 footprint modes: Bid×Ask, Delta, Volume Profile, Imbalance, Agg/Passive
- 250+ indicator library with search

### Pine Script v5
- Full interpreter (parser + executor on real bar data)
- Custom Indicator Builder with syntax highlighting + autocomplete
- 📚 Community Library — browse, star, fork, 1-click Add to Chart
- Live chart rendering as overlay series

### AI News Sentiment
- 0-100 sentiment score per article (Bullish / Neutral / Bearish)
- Live market sentiment gauge + symbol heat chips
- Refreshes every 8 seconds in live mode

### WebSocket Data
- RAF-batched updates for smooth rendering
- Polygon.io → Finnhub → Synthetic fallback chain
- Exponential backoff reconnection

### PWA + Electron
- iPhone/Android installable in 3 taps
- Windows .exe, Mac .dmg, Linux .AppImage builds

---

## 🛠️ Commands

```bash
npm run dev                    # Dev server
npm run build                  # Production build
npm run start                  # Serve production build
npm run electron:dev           # Desktop dev mode
npm run electron:build:mac     # Mac build
npm run electron:build:win     # Windows build
npm run electron:build:linux   # Linux build
npm run electron:build:all     # All platforms
```

---

*Built for the WealthyMindsets Pro team — trade with purpose, live with discipline.*
