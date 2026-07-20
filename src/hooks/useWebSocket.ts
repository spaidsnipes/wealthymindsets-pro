/**
 * useWebSocket — Optimized real-time market data hook
 *
 * Architecture:
 *  1. Tries Polygon.io WebSocket (requires NEXT_PUBLIC_POLYGON_KEY)
 *  2. Falls back to Finnhub WebSocket (requires NEXT_PUBLIC_FINNHUB_KEY)
 *  3. Falls back to high-frequency synthetic tick engine (sub-100ms)
 *
 * Optimizations:
 *  - Message batching: accumulates ticks and flushes in RAF (requestAnimationFrame)
 *  - Stale-socket watchdog: crypto feeds that go >25s silent on an OPEN socket
 *    are force-closed to trigger reconnect (catches half-dead sockets where
 *    onclose never fires)
 *  - Exponential backoff reconnection (2s → 4s → … → max 15s)
 *  - Ref-based hot path: no setState on every tick (only flush buffer)
 *  - Adaptive tick rate: speeds up during high-volatility periods
 */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface Tick {
  price: number;
  size:  number;
  side:  "buy" | "sell";
  time:  number;
  /** True only for genuine executed trades (not bookTicker/quote/REST/synthetic
   *  price-direction ticks). Delta Bubbles consume only real trades — this flag
   *  lets the consumer include full aggressive flow without quote/synthetic noise. */
  trade?: boolean;
}

export interface OHLCVBar {
  time:   number;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  size:  number;
  side:  "bid" | "ask";
}

export interface MarketState {
  ticker:      { price: number; change: number; changePct: number; volume: number };
  liveBar:     OHLCVBar | null;
  recentTicks: Tick[];
  orderBook:   { bids: OrderBookLevel[]; asks: OrderBookLevel[] };
  connected:   boolean;
  source:      "polygon" | "finnhub" | "yahoo" | "alpaca" | "binance" | "unavailable";
  /** Aggressor tape feed — set only by trade WebSockets, never downgraded by REST quotes. */
  tapeSource:  "polygon" | "finnhub" | "alpaca" | "binance" | null;
  latency:     number; // ms to last update
}

/* ── Symbol seed prices ─────────────────────────────────── */
// NOTE: These are fallback seeds used ONLY before the Polygon REST snapshot resolves.
// Verified against MooMoo + TradingView on Jun 16, 2026.
// Updated Jun 17 2026 — sourced from Yahoo Finance proxy at runtime
const SYMBOL_SEEDS: Record<string, number> = {
  "NQ1!":  30_476,   "ES1!":  7_595,   "RTY1!":  2_968,   "YM1!":  52_464,
  "GC1!":   4_349,   "CL1!":  75.68,   "SI1!":   69.97,   "ZB1!":  113.06,
  "ZN1!":   109.88,  "HG1!":   4.50,
  "AAPL":    299,    "TSLA":    405,    "NVDA":    207,    "AMZN":    246,
  "META":    600,    "MSFT":    394,    "GOOG":    371,    "AVGO":    210,
  "AMD":     507,    "INTC":     22,    "CRM":     300,    "ORCL":    165,
  "NFLX":   78.72,   "JPM":     331,    "GS":    1_091,    "BAC":      46,
  "V":       360,    "MA":      560,    "UNH":     310,    "LLY":     870,
  "SPY":     750,    "QQQ":     730,    "IWM":     292,    "DIA":     524,
  "GLD":     398,    "TLT":      88,    "XLK":     240,    "XLF":      50,
  "BTC":  64_500,    "ETH":   1_760,    "SOL":   71.77,    "BNB":     601,
  "XRP":   1.188,    "DOGE":  0.086,    "ADA":    0.75,    "AVAX":     25,
  "EUR/USD": 1.13,   "GBP/USD": 1.34,  "USD/JPY": 144,    "AUD/USD": 0.645,
};

function getBasePrice(sym: string) {
  return SYMBOL_SEEDS[sym.toUpperCase()] ?? 100;
}

/* ── Real price fetch — Yahoo Finance proxy (all symbols) ────
   Yahoo Finance via /api/yahoo covers futures (NQ=F, ES=F etc),
   crypto, stocks. Finnhub used as fallback for stocks/crypto.
────────────────────────────────────────────────────────────── */
const FUTURES_SET = new Set(["NQ1!","ES1!","RTY1!","YM1!","GC1!","SI1!","CL1!","NG1!","ZB1!","ZN1!","ZF1!","ZT1!","HG1!","MNQ1!","MES1!","MYM1!","M2K1!","MGC1!","MCL1!","VX1!"]);
const CRYPTO_SET  = new Set(["BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","LINK","DOT","LTC","ATOM","UNI"]);

type RealQuote = { price: number; change: number; changePct: number; source: string };

async function fetchRealQuote(sym: string): Promise<RealQuote | null> {
  const upper = sym.toUpperCase();

  // Per-exchange crypto (e.g. "BTC.COINBASE") → that exchange's quote
  const exMatch = upper.match(/^([A-Z]{2,6})\.(COINBASE|KRAKEN|BITSTAMP|BINANCEUS|GEMINI)$/);
  if (exMatch) {
    try {
      const ex = exMatch[2].toLowerCase();
      const j = await fetch(`/api/exchange?ex=${ex}&coin=${exMatch[1]}&type=quote`, { cache: "no-store" }).then(r => r.json());
      if ((j?.price ?? 0) > 0) return { price: j.price, change: j.change ?? 0, changePct: j.changePct ?? 0, source: "binance" };
    } catch {}
    return null;
  }

  const isFutures = FUTURES_SET.has(upper) || upper.endsWith("1!");
  const isCrypto  = CRYPTO_SET.has(upper);
  const isForex   = upper.includes("/");

  const mk = (j: any, source: string): RealQuote | null => {
    const price = j?.price ?? j?.c ?? 0;
    if (!(price > 0)) return null;
    // prefer explicit change fields; otherwise derive from open/prevClose
    const prev  = j?.prevClose ?? j?.pc ?? j?.open ?? price;
    const change    = j?.change    ?? +(price - prev).toFixed(4);
    const changePct = j?.changePct ?? (prev > 0 ? +((price - prev) / prev * 100).toFixed(4) : 0);
    return { price, change, changePct, source };
  };

  // ── Stocks & ETFs: Yahoo FIRST. Yahoo's intraday series uses includePrePost,
  // so it reflects the CONSOLIDATED last price (the number Moomoo/TradingView
  // show) in both regular AND extended hours. Alpaca's free IEX feed only sees
  // IEX's own thin prints — which match in RTH but diverge by dollars in
  // pre/post-market (e.g. TSLA 377 on IEX vs 380.89 consolidated). So Yahoo is
  // the accurate primary; Alpaca/Finnhub are fallbacks only if Yahoo fails. ───
  if (!isFutures && !isForex) {
    try {
      const j = await fetch(`/api/yahoo?sym=${encodeURIComponent(sym)}&type=quote`, { cache: "no-store" }).then(r => r.json());
      const q = mk(j, "yahoo"); if (q) return q;
    } catch {}
    try {
      const j = await fetch(`/api/alpaca?sym=${encodeURIComponent(upper)}&type=quote`, { cache: "no-store" }).then(r => r.json());
      const q = mk(j, "alpaca"); if (q) return q;
    } catch {}
    if (!isCrypto) {
      try {
        const j = await fetch(`/api/finnhub?sym=${encodeURIComponent(upper)}&type=quote`, { cache: "no-store" }).then(r => r.json());
        const q = mk(j, "finnhub"); if (q) return q;
      } catch {}
    }
  }

  // ── Futures + Crypto + final fallback: Yahoo Finance proxy ──────────────
  try {
    const j = await fetch(`/api/yahoo?sym=${encodeURIComponent(sym)}&type=quote`, { cache: "no-store" }).then(r => r.json());
    const q = mk(j, "yahoo"); if (q) return q;
  } catch {}

  return null;
}

function getTickSize(base: number) {
  if (base > 10_000) return 0.25;
  if (base > 1_000)  return 0.25;
  if (base > 100)    return 0.01;
  if (base > 1)      return 0.0001;
  return 0.00001;
}

function buildBook(): { bids: OrderBookLevel[]; asks: OrderBookLevel[] } {
  return { bids: [], asks: [] };
}

/* ── Polygon.io WebSocket adapter ───────────────────────── */
function tryPolygon(
  symbol:   string,
  apiKey:   string,
  onTick:   (t: Tick, isReal: boolean) => void,
  onStatus: (connected: boolean) => void,
): (() => void) | null {
  if (!apiKey || apiKey === "YOUR_KEY") return null;

  // Map symbol → Polygon channel (simplified)
  const channel = symbol.includes("/") ? `C.${symbol.replace("/", "")}` : `T.${symbol}`;

  let ws: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (closed) return;
    try {
      ws = new WebSocket(`wss://socket.polygon.io/stocks`);
    } catch { scheduleReconnect(); return; }

    ws.onopen = () => {
      retry = 0;
      ws?.send(JSON.stringify({ action: "auth", params: apiKey }));
    };
    ws.onmessage = (ev) => {
      try {
        const msgs = JSON.parse(ev.data as string);
        for (const m of msgs) {
          if (m.ev === "authenticated") {
            ws?.send(JSON.stringify({ action: "subscribe", params: channel }));
            onStatus(true);
          }
          if (m.ev === "T") {
            onTick({ price: m.p, size: m.s, side: m.c?.[0] === 1 ? "buy" : "sell", time: m.t, trade: true }, true);
          }
        }
      } catch {}
    };
    ws.onerror = () => { onStatus(false); };
    ws.onclose = () => { onStatus(false); if (!closed) scheduleReconnect(); };
  };

  const scheduleReconnect = () => {
    if (closed) return;
    retry = Math.min(retry + 1, 6);
    const delay = Math.min(1000 * 2 ** retry, 15000);
    reconnectTimer = setTimeout(connect, delay);
  };

  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    try { ws?.close(); } catch {}
  };
}

/* ── Finnhub WebSocket adapter ──────────────────────────── */
function tryFinnhub(
  symbol:   string,
  apiKey:   string,
  onTick:   (t: Tick, isReal: boolean) => void,
  onStatus: (connected: boolean) => void,
): (() => void) | null {
  if (!apiKey || apiKey === "YOUR_KEY") return null;

  let ws: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let lastTradePx = 0;

  const connect = () => {
    if (closed) return;
    try {
      ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
    } catch { scheduleReconnect(); return; }

    ws.onopen = () => {
      retry = 0;
      ws?.send(JSON.stringify({ type: "subscribe", symbol }));
      onStatus(true);
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        if (msg.type === "trade" && msg.data?.length) {
          for (const t of msg.data) {
            const px = Number(t.p);
            const sz = Number(t.v);
            if (!Number.isFinite(px) || px <= 0 || !Number.isFinite(sz) || sz <= 0) continue;
            const side: "buy" | "sell" = px >= lastTradePx ? "buy" : "sell";
            lastTradePx = px;
            onTick({ price: px, size: sz, side, time: t.t, trade: true }, true);
          }
        }
      } catch {}
    };
    ws.onerror = () => { onStatus(false); };
    ws.onclose = () => { onStatus(false); if (!closed) scheduleReconnect(); };
  };

  const scheduleReconnect = () => {
    if (closed) return;
    retry = Math.min(retry + 1, 6);
    const delay = Math.min(1000 * 2 ** retry, 15000);
    reconnectTimer = setTimeout(connect, delay);
  };

  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    try { ws?.close(); } catch {}
  };
}

/* ── Binance WebSocket adapter (real-time crypto, public, no key) ──────
 * IMPORTANT: binance.com is geo-blocked in the US ("restricted location").
 * We use the US-compliant **Binance.US** gateway, which serves US clients and
 * uses the identical @trade stream format:
 *   wss://stream.binance.us:9443/ws/<sym>@trade
 * Every executed trade → a real tick. Auto-reconnects with backoff.
 ───────────────────────────────────────────────────────────────────── */
const BINANCE_WS_HOST = "wss://stream.binance.us:9443";
const BINANCE_PAIR: Record<string, string> = {
  BTC: "btcusdt", ETH: "ethusdt", SOL: "solusdt", BNB: "bnbusdt",
  XRP: "xrpusdt", DOGE: "dogeusdt", ADA: "adausdt", AVAX: "avaxusdt",
  LINK: "linkusdt", DOT: "dotusdt", LTC: "ltcusdt", ATOM: "atomusdt",
  UNI: "uniusdt", MATIC: "maticusdt", BTCUSD: "btcusdt", ETHUSD: "ethusdt",
  SOLUSD: "solusdt",
};

function binancePair(symbol: string): string | null {
  return BINANCE_PAIR[symbol.toUpperCase()] ?? null;
}

function tryBinance(
  symbol:   string,
  onTick:   (t: Tick, isReal: boolean) => void,
  onStatus: (connected: boolean) => void,
): (() => void) | null {
  const pair = binancePair(symbol);
  if (!pair) return null;

  let ws: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let lastMsgAt = Date.now();
  let watchdog: ReturnType<typeof setInterval> | null = null;

  const connect = () => {
    if (closed) return;
    lastMsgAt = Date.now();
    try {
      // Combined stream: @bookTicker (frequent best bid/ask → drives live price
      // ~1×/sec even on lower-volume US pairs) + @trade (real size/side when
      // trades print) + @ticker (24h change %).
      ws = new WebSocket(`${BINANCE_WS_HOST}/stream?streams=${pair}@bookTicker/${pair}@trade/${pair}@ticker`);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => { retry = 0; onStatus(true); };

    let lastPx = 0;
    ws.onmessage = (ev) => {
      lastMsgAt = Date.now();
      try {
        const frame = JSON.parse(ev.data as string);
        const m = frame.data ?? frame;       // combined stream wraps payload in .data
        if (m.b && m.a) {
          // @bookTicker: best bid (b) / ask (a) → mid price, frequent
          const mid = (parseFloat(m.b) + parseFloat(m.a)) / 2;
          if (mid > 0) {
            const side: "buy" | "sell" = mid >= lastPx ? "buy" : "sell";
            lastPx = mid;
            onTick({ price: mid, size: 0.01, side, time: Date.now() }, true);
          }
        } else if (m.e === "trade" && m.p) {
          // @trade: real executed trade (size + aggressor side)
          const price = parseFloat(m.p);
          if (price > 0) {
            lastPx = price;
            onTick({ price, size: parseFloat(m.q) || 0.01, side: m.m ? "sell" : "buy", time: m.T ?? Date.now(), trade: true }, true);
          }
        } else if (m.e === "24hrTicker" && m.c) {
          // @ticker: carries last price + 24h change % (used for the day-change display)
          const price = parseFloat(m.c);
          if (price > 0) { lastPx = price; onTick({ price, size: 0.01, side: "buy", time: Date.now() }, true); }
        }
      } catch { /* ignore malformed frame */ }
    };

    ws.onerror = () => { onStatus(false); };
    ws.onclose = () => { onStatus(false); if (!closed) scheduleReconnect(); };
  };

  const scheduleReconnect = () => {
    if (closed) return;
    retry = Math.min(retry + 1, 6);
    const delay = Math.min(1000 * 2 ** retry, 15000); // 2s,4s,…,15s cap
    reconnectTimer = setTimeout(connect, delay);
  };

  connect();

  // Stale-socket watchdog: crypto feeds tick multiple times/sec, so >25s of
  // silence on an OPEN socket means it's half-dead (onclose never fired).
  // Force-close it → onclose triggers the backoff reconnect.
  watchdog = setInterval(() => {
    if (closed) return;
    if (ws && ws.readyState === WebSocket.OPEN && Date.now() - lastMsgAt > 25_000) {
      try { ws.close(); } catch {}
    }
  }, 10_000);

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (watchdog) clearInterval(watchdog);
    try { ws?.close(); } catch {}
  };
}

/* ── Coinbase WebSocket adapter (real-time crypto, US, no key) ─────────
 * wss://ws-feed.exchange.coinbase.com — `ticker` channel pushes on every
 * match (real trade). Higher US volume than Binance.US → ~4 ticks/sec on BTC
 * (measured 33 updates / 8s vs Binance.US 6). This is the primary crypto feed.
 ───────────────────────────────────────────────────────────────────── */
const COINBASE_PRODUCT: Record<string, string> = {
  BTC: "BTC-USD", ETH: "ETH-USD", SOL: "SOL-USD", BNB: "BNB-USD",
  XRP: "XRP-USD", DOGE: "DOGE-USD", ADA: "ADA-USD", AVAX: "AVAX-USD",
  LINK: "LINK-USD", DOT: "DOT-USD", LTC: "LTC-USD", ATOM: "ATOM-USD",
  UNI: "UNI-USD", MATIC: "MATIC-USD", BTCUSD: "BTC-USD", ETHUSD: "ETH-USD",
  SOLUSD: "SOL-USD",
};

/* ───────────────────────────────────────────────────────────────────────────
   SHARED TAPE HUB — one socket per (feed, symbol), fanned out to every consumer.

   useWebSocket is mounted by ~11 components at once (MainChart, SmartMoneyPanel,
   DOMPanel, StockInfoPanel, VolumeProfileLadder, WMSessionVP, ChartsDashboard,
   BottomIndexBar, SymbolInfoHeader, AlertsPanel, ai-bot). Each used to open its
   OWN socket for the same symbol on the same API key. Measured against prod:
   26 Finnhub sockets in 12s, and the WS handshake then returns

       HTTP/1.1 429 Too Many Requests

   while REST on the same key is a healthy 200. Finnhub drops the sockets, the
   reconnect logic storms, Finnhub drops harder, and the retry loop finally gives
   up — so `recentTicks` never sees a single trade tick and every stock reads
   "NO TAPE". Crypto only survived because Coinbase tolerates the duplicates.

   Now the FIRST consumer opens the socket; the rest attach to it. The underlying
   connection is torn down only when the last consumer unmounts.
─────────────────────────────────────────────────────────────────────────── */
type TapeTick   = (t: Tick, isReal: boolean) => void;
type TapeStatus = (ok: boolean) => void;

interface TapeHub {
  refs: number;
  cleanup: () => void;
  tickers: Set<TapeTick>;
  statuses: Set<TapeStatus>;
  lastStatus: boolean;
}

const tapeHubs = new Map<string, TapeHub>();

/** Attach to the shared socket for `key`, opening it if nobody else has.
 *  Returns an unsubscribe fn, or null if the feed cannot serve this symbol. */
// Cross-tab dedup is only possible where BOTH Web Locks (leader election) and
// BroadcastChannel (tick fan-out) exist. Otherwise we degrade to one socket
// per tab (still deduped WITHIN the tab by the refcounted hub).
const CROSS_TAB =
  typeof window !== "undefined" &&
  typeof BroadcastChannel !== "undefined" &&
  typeof navigator !== "undefined" &&
  !!(navigator as unknown as { locks?: unknown }).locks;

/* Build the hub for `key`. With cross-tab support, exactly ONE tab (the Web
   Lock holder) opens the real socket and broadcasts ticks to the others over a
   BroadcastChannel; every other tab stays passive. THIS is what stops N open
   tabs from opening N sockets and tripping the Finnhub 429 — the per-tab hub
   alone could not dedupe across tabs. A 6s heartbeat-loss safety net opens a
   local socket if a leader ever goes silent, so a tab is never left dataless. */
function createTapeHub(
  key: string,
  connect: (onTick: TapeTick, onStatus: TapeStatus) => (() => void) | null,
): TapeHub | null {
  const tickers  = new Set<TapeTick>();
  const statuses = new Set<TapeStatus>();
  const hub: TapeHub = { refs: 0, cleanup: () => {}, tickers, statuses, lastStatus: false };

  const fanTick   = (t: Tick, isReal: boolean) => { tickers.forEach(fn => fn(t, isReal)); };
  const fanStatus = (ok: boolean) => { hub.lastStatus = ok; statuses.forEach(fn => fn(ok)); };

  // Single-tab / unsupported browser: open the socket locally (previous behavior).
  if (!CROSS_TAB) {
    const c = connect(fanTick, fanStatus);
    if (!c) return null;
    hub.cleanup = c;
    return hub;
  }

  const chan = `wm-tape:${key}`;
  const bc = new BroadcastChannel(chan);
  let socketCleanup: (() => void) | null = null;   // real socket, when we are leader
  let safetyCleanup: (() => void) | null = null;    // fallback socket, if leader goes silent
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let watchdog:  ReturnType<typeof setInterval> | null = null;
  let releaseLock: (() => void) | null = null;
  let lastLeaderMsg = Date.now();                    // seed = now so a fresh follower waits real silence
  let torn = false;

  const becomeLeader = () => {
    if (torn || socketCleanup) return;
    if (safetyCleanup) { try { safetyCleanup(); } catch { /* */ } safetyCleanup = null; }
    socketCleanup = connect(
      (t, isReal) => { fanTick(t, isReal); try { bc.postMessage({ k: "t", t, r: isReal }); } catch { /* */ } },
      (ok)        => { fanStatus(ok);      try { bc.postMessage({ k: "s", ok }); } catch { /* */ } },
    );
    heartbeat = setInterval(() => { try { bc.postMessage({ k: "hb", ok: hub.lastStatus }); } catch { /* */ } }, 2000);
  };

  bc.onmessage = (e) => {
    const m = e.data as { k?: string; t?: Tick; r?: boolean; ok?: boolean };
    lastLeaderMsg = Date.now();
    if (m?.k === "t" && m.t) {
      // A real tick PROVES the leader's feed is live. A follower that only ever
      // sees ticks (the heartbeat can arrive late or be timer-throttled on a
      // backgrounded leader) must still learn it is connected — otherwise
      // tapeSource stays null and every tapeSource-gated feature (on-chart WM
      // Delta Bubbles, the delta footprint, delta accumulation) silently
      // disables even while price updates. Marking connected on the first tick
      // makes followers robust and immediate, not dependent on heartbeat timing.
      if (!hub.lastStatus) fanStatus(true);
      fanTick(m.t, !!m.r);
    }
    else if (m?.k === "s") fanStatus(!!m.ok);
    else if (m?.k === "hb" && m.ok && !hub.lastStatus) fanStatus(true);
  };

  // Leader election: the granted callback holds the lock until we resolve it
  // (on teardown or tab close), at which point another tab is granted and
  // becomes leader. Exactly one holder at a time.
  try {
    (navigator as unknown as { locks: { request: (n: string, o: unknown, f: () => Promise<void>) => Promise<void> } })
      .locks.request(chan, { mode: "exclusive" }, () =>
        new Promise<void>((resolve) => { releaseLock = resolve; if (!torn) becomeLeader(); else resolve(); }),
      ).catch(() => { /* lock rejected; safety net covers us */ });
  } catch { /* locks unavailable at call time; safety net covers us */ }

  watchdog = setInterval(() => {
    if (torn || socketCleanup) return;              // leader already has the socket
    const silent = Date.now() - lastLeaderMsg > 6000;
    if (silent && !safetyCleanup) safetyCleanup = connect(fanTick, fanStatus);
    else if (!silent && safetyCleanup) { try { safetyCleanup(); } catch { /* */ } safetyCleanup = null; }
  }, 3000);

  hub.cleanup = () => {
    torn = true;
    if (heartbeat) clearInterval(heartbeat);
    if (watchdog)  clearInterval(watchdog);
    try { socketCleanup?.(); } catch { /* */ }
    try { safetyCleanup?.(); } catch { /* */ }
    try { bc.close(); } catch { /* */ }
    releaseLock?.();                                 // hand leadership to another tab
  };

  return hub;
}

function joinTape(
  key: string,
  connect: (onTick: TapeTick, onStatus: TapeStatus) => (() => void) | null,
  onTick: TapeTick,
  onStatus: TapeStatus,
): (() => void) | null {
  let hub = tapeHubs.get(key);
  if (!hub) {
    const created = createTapeHub(key, connect);
    if (!created) return null;               // feed can't serve this symbol
    tapeHubs.set(key, created);
    hub = created;
  }

  hub.tickers.add(onTick);
  hub.statuses.add(onStatus);
  hub.refs++;
  // A consumer that mounts after the socket opened must still learn it is live.
  if (hub.lastStatus) onStatus(true);

  let released = false;
  return () => {
    if (released) return;                    // React may invoke a cleanup twice
    released = true;
    const h = tapeHubs.get(key);
    if (!h) return;
    h.tickers.delete(onTick);
    h.statuses.delete(onStatus);
    if (--h.refs <= 0) {
      tapeHubs.delete(key);
      try { h.cleanup(); } catch { /* socket already gone */ }
    }
  };
}

function coinbaseProduct(symbol: string): string | null {
  return COINBASE_PRODUCT[symbol.toUpperCase()] ?? null;
}

function tryCoinbase(
  symbol:   string,
  onTick:   (t: Tick, isReal: boolean) => void,
  onStatus: (connected: boolean) => void,
): (() => void) | null {
  const product = coinbaseProduct(symbol);
  if (!product) return null;

  let ws: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let lastMsgAt = Date.now();
  let watchdog: ReturnType<typeof setInterval> | null = null;

  const connect = () => {
    if (closed) return;
    lastMsgAt = Date.now();
    try {
      ws = new WebSocket("wss://ws-feed.exchange.coinbase.com");
    } catch { scheduleReconnect(); return; }

    ws.onopen = () => {
      retry = 0;
      ws?.send(JSON.stringify({ type: "subscribe", product_ids: [product], channels: ["ticker"] }));
      onStatus(true);
    };

    ws.onmessage = (ev) => {
      lastMsgAt = Date.now();
      try {
        const m = JSON.parse(ev.data as string);
        if (m.type === "ticker" && m.price) {
          const price = parseFloat(m.price);
          if (price > 0) {
            // Coinbase `side` is the maker side; aggressor is the opposite.
            const side: "buy" | "sell" = m.side === "sell" ? "buy" : "sell";
            onTick({ price, size: parseFloat(m.last_size) || 0.01, side, time: Date.now(), trade: true }, true);
          }
        }
      } catch { /* ignore */ }
    };

    ws.onerror = () => { onStatus(false); };
    ws.onclose = () => { onStatus(false); if (!closed) scheduleReconnect(); };
  };

  const scheduleReconnect = () => {
    if (closed) return;
    retry = Math.min(retry + 1, 6);
    const delay = Math.min(1000 * 2 ** retry, 15000);
    reconnectTimer = setTimeout(connect, delay);
  };

  connect();

  // Stale-socket watchdog (see tryBinance): force-reconnect a silent OPEN socket.
  watchdog = setInterval(() => {
    if (closed) return;
    if (ws && ws.readyState === WebSocket.OPEN && Date.now() - lastMsgAt > 25_000) {
      try { ws.close(); } catch {}
    }
  }, 10_000);

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (watchdog) clearInterval(watchdog);
    try { ws?.close(); } catch {}
  };
}

/* ── Main hook ──────────────────────────────────────────── */
export function useWebSocket({ symbol, timeframe }: { symbol: string; timeframe: string }) {
  const base      = getBasePrice(symbol);

  // Hot path refs — no re-render on every tick
  const priceRef   = useRef(base);
  const baseRef    = useRef(base);
  // Real prior-session close (from the quote), used for the day-change %. Without
  // this, change was computed against the hardcoded seed (e.g. TSLA 405 = a close
  // from days ago) and showed a bogus −7% on a flat day. 0 until first quote.
  const prevCloseRef = useRef(0);
  const barRef     = useRef<OHLCVBar | null>(null);
  const tickBuf    = useRef<Tick[]>([]);      // batched buffer
  const bookRef    = useRef(buildBook());
  const rafRef     = useRef<number>(0);
  const volRef     = useRef(0);

  // Reconnect state
  const retryCount = useRef(0);
  const cleanupFns = useRef<Array<() => void>>([]);

  // Latency tracking
  const lastUpdateRef = useRef(Date.now());

  const tapeSourceRef = useRef<MarketState["tapeSource"]>(null);

  const [state, setState] = useState<MarketState>({
    ticker:      { price: 0, change: 0, changePct: 0, volume: 0 },
    liveBar:     null,
    recentTicks: [],
    orderBook:   { bids: [], asks: [] },   // built client-side in useEffect to avoid hydration mismatch
    connected:   false,
    source:      "unavailable",
    tapeSource:  null,
    latency:     0,
  });

  // Interval ref for synthetic engine
  const syntheticRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Flag: stop synthetic once real ticks arrive
  const hasRealDataRef = useRef(false);

  const getIntervalSec = useCallback(() => {
    const m: Record<string, number> = {
      "1t": 1, "5t": 5, "30t": 30,
      "1m": 60, "2m": 120, "3m": 180, "5m": 300, "10m": 600,
      "15m": 900, "30m": 1800, "1h": 3600, "2h": 7200,
      "4h": 14400, "D": 86400, "W": 604800,
    };
    return m[timeframe] ?? 60;
  }, [timeframe]);

  /* Flush buffer to React state (called in RAF) */
  const flush = useCallback(() => {
    if (tickBuf.current.length === 0) return;

    const ticks = tickBuf.current.splice(0, tickBuf.current.length);
    const last  = ticks[ticks.length - 1];
    const price = last.price;
    const now   = Date.now();
    const latency = now - lastUpdateRef.current;
    lastUpdateRef.current = now;

    setState(prev => {
      const newVol = prev.ticker.volume + ticks.reduce((s, t) => s + t.size, 0);
      // Day-change is vs the REAL prior close (from the quote) — NOT the hardcoded
      // seed, which produced bogus % (e.g. −7% on a flat day for TSLA).
      const ref = prevCloseRef.current > 0 ? prevCloseRef.current : baseRef.current;
      return {
        ...prev,
        ticker: {
          price,
          change:    +(price - ref).toFixed(2),
          changePct: ref > 0 ? +((price - ref) / ref * 100).toFixed(2) : 0,
          volume:    newVol,
        },
        liveBar:     barRef.current ? { ...barRef.current } : null,
        recentTicks: [...ticks, ...prev.recentTicks].slice(0, 50),
        orderBook:   bookRef.current,
        connected:   true,
        latency,
      };
    });
  }, []);

  /* Schedule a RAF flush */
  const scheduleFlush = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      flush();
    });
  }, [flush]);

  /* Process an incoming tick (hot path — no setState) */
  const processTick = useCallback((tick: Tick, isReal = false) => {
    // Stop synthetic engine the first time real data arrives
    if (isReal && !hasRealDataRef.current) {
      hasRealDataRef.current = true;
      if (syntheticRef.current) {
        clearInterval(syntheticRef.current);
        syntheticRef.current = null;
      }
    }
    // If we have real data, ignore synthetic ticks
    if (!isReal && hasRealDataRef.current) return;

    // ── Source-level corrupt-tick guard ────────────────────────────────────
    // Reject only definitively-bad prints (non-positive / NaN) here — a wrong
    // magnitude would poison barRef.low/high via Math.min/Math.max. We do NOT
    // do a deviation check at this layer because the seed can be a stale
    // hardcoded value far from the real price (that would freeze the chart).
    // The magnitude/deviation check lives in MainChart against lastBar.close,
    // which is reliably refetched per symbol.
    if (!Number.isFinite(tick.price) || tick.price <= 0) return;

    priceRef.current = tick.price;
    tickBuf.current.push(tick);

    // Update bar
    const intervalSec = getIntervalSec();
    const barTime = Math.floor(tick.time / 1000 / intervalSec) * intervalSec;

    if (!barRef.current || barRef.current.time !== barTime) {
      barRef.current = {
        time: barTime, open: tick.price, high: tick.price,
        low: tick.price, close: tick.price, volume: tick.size,
      };
    } else {
      barRef.current = {
        ...barRef.current,
        high:   Math.max(barRef.current.high, tick.price),
        low:    Math.min(barRef.current.low, tick.price),
        close:  tick.price,
        volume: barRef.current.volume + tick.size,
      };
    }

    scheduleFlush();
  }, [getIntervalSec, scheduleFlush]);

  /* ── Synthetic engine — ATR-calibrated, instrument-aware ─── */
  const startSynthetic = useCallback((b: number) => {
    if (syntheticRef.current) clearInterval(syntheticRef.current);

    const tf = timeframe;

    // ── Minimum tick size per instrument (exchange rules) ─────
    // NQ/ES/YM: 0.25, stocks: 0.01, forex: 0.0001, crypto varies
    const minTick = b > 10_000 ? 0.25 : b > 1_000 ? 0.25 : b > 100 ? 0.01 : b > 1 ? 0.0001 : 0.00001;

    // ── Target ATR (average true range) per bar, per instrument ──
    // These match real-world ranges you'd see on TradingView:
    //   NQ 1m ≈ 20-40pts | ES 1m ≈ 5-15pts | AAPL 1m ≈ 0.3-0.8pts
    //   NQ 30m ≈ 80-150pts | ES 30m ≈ 25-50pts | AAPL 30m ≈ 1-3pts
    //   NQ D ≈ 300-700pts  | ES D ≈ 80-200pts   | AAPL D ≈ 3-8pts
    const atrTable: Record<string, number> = {
      "1t":  b > 10_000 ? 3   : b > 1_000 ? 1   : b > 100 ? 0.05  : b > 1 ? 0.0005 : 0.000005,
      "5t":  b > 10_000 ? 5   : b > 1_000 ? 2   : b > 100 ? 0.08  : b > 1 ? 0.0008 : 0.000008,
      "30t": b > 10_000 ? 8   : b > 1_000 ? 3   : b > 100 ? 0.12  : b > 1 ? 0.0012 : 0.000012,
      "1m":  b > 10_000 ? 28  : b > 1_000 ? 9   : b > 100 ? 0.45  : b > 1 ? 0.0030 : 0.000030,
      "2m":  b > 10_000 ? 38  : b > 1_000 ? 13  : b > 100 ? 0.62  : b > 1 ? 0.0042 : 0.000042,
      "3m":  b > 10_000 ? 48  : b > 1_000 ? 16  : b > 100 ? 0.78  : b > 1 ? 0.0052 : 0.000052,
      "5m":  b > 10_000 ? 62  : b > 1_000 ? 21  : b > 100 ? 1.00  : b > 1 ? 0.0068 : 0.000068,
      "10m": b > 10_000 ? 82  : b > 1_000 ? 28  : b > 100 ? 1.35  : b > 1 ? 0.0090 : 0.000090,
      "15m": b > 10_000 ? 100 : b > 1_000 ? 34  : b > 100 ? 1.65  : b > 1 ? 0.0110 : 0.000110,
      "30m": b > 10_000 ? 140 : b > 1_000 ? 48  : b > 100 ? 2.30  : b > 1 ? 0.0155 : 0.000155,
      "1h":  b > 10_000 ? 200 : b > 1_000 ? 68  : b > 100 ? 3.20  : b > 1 ? 0.0215 : 0.000215,
      "2h":  b > 10_000 ? 270 : b > 1_000 ? 92  : b > 100 ? 4.30  : b > 1 ? 0.0290 : 0.000290,
      "4h":  b > 10_000 ? 370 : b > 1_000 ? 125 : b > 100 ? 5.80  : b > 1 ? 0.0390 : 0.000390,
      "D":   b > 10_000 ? 520 : b > 1_000 ? 175 : b > 100 ? 8.00  : b > 1 ? 0.0540 : 0.000540,
      "W":   b > 10_000 ? 900 : b > 1_000 ? 310 : b > 100 ? 14.0  : b > 1 ? 0.0950 : 0.000950,
      "M":   b > 10_000 ?1800 : b > 1_000 ? 600 : b > 100 ? 28.0  : b > 1 ? 0.1900 : 0.001900,
    };
    const targetAtr = atrTable[tf] ?? (b * 0.002);

    // ── UI update interval (how often we fire the engine) ─────
    // Shorter TF = more frequent visual updates (feels live)
    // Longer TF = infrequent (bar barely moves, like real D/W chart)
    const tickMs: Record<string, number> = {
      "1t":80,  "5t":120, "30t":150,
      "1m":400, "2m":500, "3m":600,  "5m":800,  "10m":1200, "15m":1600, "30m":2500,
      "1h":4000,"2h":6000,"4h":9000,
      "D":15000,"W":30000,"M":60000,
    };
    const fireMs = tickMs[tf] ?? 400;

    // ── Fires per bar (how many engine ticks in one full bar) ─
    const tfSecMap: Record<string,number> = {
      "1t":1,"5t":5,"30t":30,
      "1m":60,"2m":120,"3m":180,"5m":300,"10m":600,"15m":900,"30m":1800,
      "1h":3600,"2h":7200,"4h":14400,"D":86400,"W":604800,"M":2592000,
    };
    const intervalSec = tfSecMap[tf] ?? 60;
    const firesPerBar = Math.max(1, (intervalSec * 1000) / fireMs);

    // ── Step size: calibrated so sqrt(firesPerBar)*step ≈ targetAtr
    // i.e. the random walk produces the right range naturally
    const rawStep  = targetAtr / Math.sqrt(firesPerBar);
    // Round to nearest valid tick (minimum 1 tick)
    const stepTicks = Math.max(1, Math.round(rawStep / minTick));
    const stepSize  = stepTicks * minTick;

    // ── Precision for toFixed ─────────────────────────────────
    const dp = b > 1000 ? 2 : b > 1 ? 4 : 6;

    // ── Momentum state — creates trending within bars ─────────
    let momentum = 0; // range -1..+1; positive = bullish bias

    syntheticRef.current = setInterval(() => {
      const prev = priceRef.current;

      // Momentum-biased coin flip — 62% chance to continue trend
      const rand = Math.random();
      let direction: number;
      if      (momentum >  0.25) direction = rand < 0.62 ?  1 : -1;
      else if (momentum < -0.25) direction = rand < 0.62 ? -1 :  1;
      else                       direction = rand < 0.50 ?  1 : -1;

      const move  = direction * stepSize;
      const price = +Math.min(b * 1.04, Math.max(b * 0.96, prev + move)).toFixed(dp);

      // Mean-revert momentum if price drifted >2% from seed
      const drift = (price - b) / b;
      if (Math.abs(drift) > 0.02) {
        momentum = momentum * 0.2 - Math.sign(drift) * 0.6;
      } else {
        momentum = momentum * 0.55 + direction * 0.45;
      }
      momentum = Math.max(-1, Math.min(1, momentum));

      const side: "buy" | "sell" = direction > 0 ? "buy" : "sell";
      const size = Math.floor(1 + Math.random() * (b > 10_000 ? 25 : 200));
      processTick({ price, size, side, time: Date.now() });
    }, fireMs);
  }, [processTick, timeframe]);

  /* ── Mount / symbol change ──────────────────────────────── */
  useEffect(() => {
    // Cleanup previous
    cleanupFns.current.forEach(fn => fn());
    cleanupFns.current = [];
    if (syntheticRef.current) clearInterval(syntheticRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    tickBuf.current = [];

    const b = getBasePrice(symbol);
    baseRef.current  = b;
    priceRef.current = b;
    prevCloseRef.current = 0; // cleared on symbol change; repopulated by the next quote
    barRef.current   = null;
    bookRef.current  = buildBook();
    retryCount.current = 0;
    hasRealDataRef.current = false;

    tapeSourceRef.current = null;

    setState({
      ticker:      { price: 0, change: 0, changePct: 0, volume: 0 },
      liveBar:     null,
      recentTicks: [],
      orderBook:   { bids: [], asks: [] },
      connected:   false,
      source:      "unavailable",
      tapeSource:  null,
      latency:     0,
    });

    // ── Real data strategy ───────────────────────────────────
    // 1. Finnhub WebSocket (stocks/crypto, 15s delayed on free plan)
    // 2. REST polling every 5s (Finnhub for stocks, Yahoo for futures/crypto)
    // NOTE: Polygon key is known-invalid — skip it entirely to avoid blocking Finnhub WS
    const finnhubKey  = process.env.NEXT_PUBLIC_FINNHUB_KEY ?? "d8efu9hr01qth3ch5f20d8efu9hr01qth3ch5f2g";

    // Identify instrument class
    const isFuture = symbol.endsWith("1!") || symbol.includes("=F");
    const isCrypto = binancePair(symbol) != null;

    // ── CRYPTO: real-time WebSocket (US-compliant, no key, 24/7) ──
    // Primary = Coinbase (highest US volume, ~4 ticks/sec). Binance.US is kept
    // as an automatic fallback if Coinbase fails to connect.
    let cryptoCleanup: (() => void) | null = null;
    let cryptoFallback: (() => void) | null = null;
    if (isCrypto) {
      let gotCoinbase = false;
      cryptoCleanup = joinTape(
        `coinbase:${symbol.toUpperCase()}`,
        (onTick, onStatus) => tryCoinbase(symbol, onTick, onStatus),
        processTick,
        (ok) => {
          if (ok) {
            gotCoinbase = true;
            hasRealDataRef.current = true;
            tapeSourceRef.current = "binance";
            setState(p => ({ ...p, source: "binance" /* "live" badge */, tapeSource: "binance", connected: true }));
          }
        },
      );
      // If Coinbase hasn't connected within 4s, spin up Binance.US too.
      setTimeout(() => {
        if (!gotCoinbase && !cryptoFallback) {
          cryptoFallback = joinTape(
            `binance:${symbol.toUpperCase()}`,
            (onTick, onStatus) => tryBinance(symbol, onTick, onStatus),
            processTick,
            (ok) => {
              if (ok) {
                hasRealDataRef.current = true;
                tapeSourceRef.current = "binance";
                setState(p => ({ ...p, source: "binance", tapeSource: "binance", connected: true }));
              }
            },
          );
          if (cryptoFallback) cleanupFns.current.push(cryptoFallback);
        }
      }, 4000);
    }
    const binanceCleanup = cryptoCleanup;

    // ── STOCKS/ETFs: Finnhub WS (skip for futures + crypto) ──
    const fhWsSym = symbol.toUpperCase();
    const finhCleanup = (!isFuture && !isCrypto && finnhubKey)
      ? joinTape(
          `finnhub:${fhWsSym}`,
          (onTick, onStatus) => tryFinnhub(fhWsSym, finnhubKey, onTick, onStatus),
          processTick,
          (ok) => {
            if (ok) {
              hasRealDataRef.current = true;
              tapeSourceRef.current = "finnhub";
              setState(p => ({ ...p, source: "finnhub", tapeSource: "finnhub", connected: true }));
            }
          },
        )
      : null;

    // ── REST polling — REAL price drives the live bar (no faked movement) ──
    const doRestFetch = () => {
      fetchRealQuote(symbol).then(q => {
        if (!q) return;
        const realPrice = q.price;
        const prevPrice = priceRef.current;
        priceRef.current = realPrice;
        bookRef.current  = buildBook();
        hasRealDataRef.current = true;
        // CRITICAL FIX: feed the real price through processTick so the LIVE BAR
        // (barRef → chart candles) actually updates. Previously only the ticker
        // updated and the candles stayed frozen.
        const side: "buy" | "sell" = realPrice >= prevPrice ? "buy" : "sell";
        // Capture the REAL prior close so flush() computes the correct day-change.
        if (Number.isFinite(q.change)) prevCloseRef.current = realPrice - q.change;
        processTick({ price: realPrice, size: 1, side, time: Date.now() }, true);
        // Real day change comes straight from the quote (not a per-poll delta).
        const tape = tapeSourceRef.current;
        setState(prev2 => ({
          ...prev2,
          // REST quote is for price display only — never downgrade an active aggressor tape feed.
          source: tape ?? (q.source as MarketState["source"]),
          tapeSource: tape,
          connected: true,
          ticker: { price: realPrice, change: q.change, changePct: q.changePct, volume: prev2.ticker.volume },
          orderBook: bookRef.current,
        }));
      });
    };

    // Fetch immediately at mount to correct stale seed price
    doRestFetch();
    // Poll every 1.5s for real-time price updates (Yahoo/Alpaca handle this rate fine)
    const restRefresh = setInterval(doRestFetch, 1_500);

    // Fire REST fetch immediately when tab becomes visible (fixes background-tab throttling)
    const onVisibleWS = () => { if (document.visibilityState === "visible") doRestFetch(); };
    document.addEventListener("visibilitychange", onVisibleWS);

    // ── Real-time per-trade tape via an always-on external WS proxy ─────────
    // REAL executed trades for EVERY US stock, so Big Trades bubbles populate on
    // all symbols — not just the handful the Finnhub WS happens to serve. Vercel
    // serverless can't host a persistent Alpaca websocket (the function freezes),
    // so the proxy runs OFF Vercel (e.g. a Railway service) holding the Alpaca IEX
    // socket and relaying trades. It keeps the Alpaca key/secret — WM only knows
    // the proxy's public WS URL. Configure via NEXT_PUBLIC_ALPACA_PROXY_URL
    // (Vercel) or localStorage wm_alpaca_proxy (quick testing). No-op until a URL
    // is set → zero churn, no regression. Real trades only, never synthetic.
    //
    // Protocol the proxy must speak: accept the symbol as `?sym=TSLA` (and/or a
    // {"action":"subscribe","sym":"TSLA"} message on open), then push trades as
    // JSON — either {p,s,t} or raw Alpaca {"T":"t","p":..,"s":..,"t":..}. Both are
    // accepted below. `t` may be ms-epoch or an RFC3339 string.
    // Default to the live Railway relay so real-time stock trades/bubbles work for
    // every user out of the box — no env var or localStorage required. Still
    // overridable via NEXT_PUBLIC_ALPACA_PROXY_URL (Vercel) or wm_alpaca_proxy
    // (localStorage) if the proxy URL ever changes. The proxy URL is not a secret
    // (the Alpaca key/secret live only on the Railway service). Fails gracefully to
    // a no-op if the proxy is ever down.
    const DEFAULT_PROXY = "wss://aplacawsproxy-production.up.railway.app";
    const proxyBase = (() => {
      try { return (localStorage.getItem("wm_alpaca_proxy") || process.env.NEXT_PUBLIC_ALPACA_PROXY_URL || DEFAULT_PROXY).trim(); }
      catch { return (process.env.NEXT_PUBLIC_ALPACA_PROXY_URL || DEFAULT_PROXY).trim(); }
    })();
    let proxyWs: WebSocket | null = null;
    let proxyRetry: ReturnType<typeof setTimeout> | null = null;
    let proxyClosed = false;
    if (proxyBase && !isFuture && !isCrypto && typeof WebSocket !== "undefined") {
      let lastPx = 0;
      const connectProxy = () => {
        if (proxyClosed) return;
        let url = proxyBase;
        try { const u = new URL(proxyBase); u.searchParams.set("sym", symbol); url = u.toString(); }
        catch { url = `${proxyBase}${proxyBase.includes("?") ? "&" : "?"}sym=${encodeURIComponent(symbol)}`; }
        let sock: WebSocket;
        try { sock = new WebSocket(url); } catch { proxyRetry = setTimeout(connectProxy, 4000); return; }
        // The proxy relays Alpaca's frames as BINARY, so the browser delivers them
        // as ArrayBuffer/Blob — not text. Decode to a string before parsing (the old
        // JSON.parse(String(ev.data)) turned a Blob into "[object Blob]" and silently
        // dropped every trade). arraybuffer is synchronously decodable; Blob is the
        // async fallback.
        sock.binaryType = "arraybuffer";
        proxyWs = sock;
        const handleText = (text: string) => {
          let parsed: unknown;
          try { parsed = JSON.parse(text); } catch { return; }
          const list = Array.isArray(parsed) ? parsed : [parsed];
          let got = false;
          for (const raw of list) {
            const m = raw as { T?: string; p?: number; s?: number; t?: number | string };
            if (!m || (m.T && m.T !== "t") || typeof m.p !== "number" || m.p <= 0 || !m.s) continue;
            const t = typeof m.t === "string" ? Date.parse(m.t) : (m.t || Date.now());
            const side: "buy" | "sell" = lastPx && m.p < lastPx ? "sell" : "buy";
            lastPx = m.p;
            tapeSourceRef.current = "alpaca";
            processTick({ price: m.p, size: m.s, side, time: t }, true);
            got = true;
          }
          if (got) setState(p => (p.tapeSource === "alpaca" ? p : { ...p, source: "alpaca", tapeSource: "alpaca", connected: true }));
        };
        sock.onopen = () => { try { sock.send(JSON.stringify({ action: "subscribe", sym: symbol, trades: [symbol] })); } catch { /* proxy may not need a subscribe msg */ } };
        sock.onmessage = (ev) => {
          const d = ev.data as unknown;
          if (typeof d === "string") handleText(d);
          else if (d instanceof ArrayBuffer) handleText(new TextDecoder().decode(d));
          else if (d && typeof (d as Blob).text === "function") (d as Blob).text().then(handleText).catch(() => {});
        };
        sock.onclose = () => { if (!proxyClosed) proxyRetry = setTimeout(connectProxy, 3000); };
        sock.onerror = () => { try { sock.close(); } catch { /* already closing */ } };
      };
      connectProxy();
    }

    if (finhCleanup) cleanupFns.current.push(finhCleanup);
    if (binanceCleanup) cleanupFns.current.push(binanceCleanup);

    return () => {
      clearInterval(restRefresh);
      proxyClosed = true;
      if (proxyRetry) clearTimeout(proxyRetry);
      if (proxyWs) { try { proxyWs.close(); } catch { /* already closing */ } }
      document.removeEventListener("visibilitychange", onVisibleWS);
      cleanupFns.current.forEach(fn => fn());
      if (syntheticRef.current) clearInterval(syntheticRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // A timeframe change starts an empty live bar; only observed ticks may refill it.
  useEffect(() => {
    barRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  return state;
}
