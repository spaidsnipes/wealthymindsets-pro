# WealthyMindsets Pro 🏆

> **Professional trading platform built for the team. Real-time order flow, AI sentiment, Pine Script v5 engine, full social community, and more.**

---

## 👷 ATH employees start here

> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**

The current front door is **in Drive, not in this repository**:

1. `00 — Above the Hill Canon — Master Index & Source of Truth`
2. `ATH — CURRENT COMMAND CENTER — 2026-09-11` (Drive ID `1h82mz0Gx7sYTpyhu6iMOFAup8GSmzBo4RzLn-sJJujQ`)
3. `WM Pro — Operating System BUILD ORDER — Natural Language — 2026-09-03` (Drive ID `1_GTybVD83kWtJpZpUxO2tSUNN8k8OfyP4alsjvQSom8`)
4. `ATH — FULL GARDEN PASS — 2026-09-11` (Drive ID `1npNbThYZCfahGP4SDFbhVvkinPncIetA3YrTATLKfV4`) — Garden Gates G0–G13
5. Current GitHub `main` HEAD
6. Current runtime proof chain

**`docs/operations/` is HISTORICAL LINEAGE. It may teach; it may not command.**
`ATH_COMMAND_CENTER.md`, `ACTIVE_TASK_QUEUE.md`, `BUILD_STATUS.md` and
`RISKS_AND_BLOCKERS.md` describe a July 2026 milestone on a retired Vercel host. Do not
take a current action from any of them. They carry demotion headers saying so.

Dated files under `docs/operations/` (batons, receipts, checkpoints) are evidence of what
was true on their date — never a current instruction.

---

## 🌐 Access the App

**Production (the only production proof):**

```
https://wealthymindsetspro.com
```

Cloudflare Workers / OpenNext. `www` redirects to the apex. Verified `HTTP 200` at
`/login` on 2026-09-11.

> **Vercel is a RETIRED host.** Any `*.vercel.app` URL, Vercel deployment status or Vercel
> instruction in this repository is migration lineage only. A retired host may not drive
> current diagnosis, release blockage or runtime health. Failing Vercel status checks on
> current commits are GHOST_HOST signals, not evidence that production is unhealthy.

**Development only — never production proof:**

```bash
npm run dev      # http://localhost:3000
```

A green `localhost:3000` says nothing about what the Founder's browser actually receives.
Runtime proof is a chain, not a noun: repo HEAD → deploy target → running release
fingerprint → public route → human scene → receipt.

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

Create `.env.local` (server-only names — do NOT use the `NEXT_PUBLIC_` prefix on secret keys; that ships them into the browser bundle):
```env
JWT_SECRET=<32-byte random>       # openssl rand -base64 32
FINNHUB_KEY=your_key              # server-side only
POLYGON_KEY=your_key              # server-side only
ALPACA_KEY=your_key               # server-side only
ALPACA_SECRET=your_secret         # server-side only
```

Without keys: WM Pro degrades honestly. There is no synthetic engine — quotes, tape, and profile all render an explicit "provider unavailable" state rather than fake data. Free tier keys at finnhub.io / polygon.io / alpaca.markets.

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
- Crypto via Coinbase / Binance WebSocket (no key needed, client-safe)
- Stocks via REST polling through the `/api/finnhub` server proxy
- Exponential backoff reconnection
- Honest "unavailable" state when providers can't be reached — never synthetic

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
