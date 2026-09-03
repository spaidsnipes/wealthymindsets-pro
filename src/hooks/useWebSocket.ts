/**
 * useWebSocket — Optimized real-time market data hook
 *
 * Architecture:
 *  1. Crypto: Coinbase / Binance WebSocket (no key, client-safe).
 *  2. Stocks: REST polling via /api/finnhub (server proxy holds the key).
 *     Client-side Finnhub WebSocket was removed 2026-08-08 (WM-SEC-P0-03)
 *     because it required NEXT_PUBLIC_FINNHUB_KEY in the browser bundle.
 *  3. Falls back to observed REST polling when streaming is unavailable.
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
import { MarketEventGuard, type CanonicalMarketEvent } from "@/lib/marketData/marketEvent";
import { normalizeCoinbaseTicker } from "@/lib/marketData/adapters/coinbase";
import { normalizeAlpacaRelayTrade } from "@/lib/marketData/adapters/alpacaRelay";
import { applyTickToLiveBar } from "@/lib/marketData/liveBarPolicy";
import { ingestSessionNectarEvent } from "@/lib/marketData/sessionNectar";
import { normalizeBinanceUsTrade } from "@/lib/marketData/adapters/binanceUs";
import { moomooNextPollDelayMs, selectFreshMoomooTapeEvents } from "@/lib/marketData/adapters/moomooTicksBrowser";
import { selectFreshLongbridgeObservedEvents } from "@/lib/marketData/adapters/longbridgeTicksBrowser";
import { selectFreshWebullObservedEvents } from "@/lib/marketData/adapters/webullTicksBrowser";
import { electProviderTapeSource, type ProviderTapeSource } from "@/lib/marketData/providerTapeElection";
import { restQuoteNextPollDelayMs } from "@/lib/marketData/restQuotePolling";
import { tapeProtocolChannel } from "@/lib/marketData/tapeProtocol";

export interface Tick {
  price: number;
  size:  number;
  side:  "buy" | "sell";
  time:  number;
  /** True only for genuine executed trades (not bookTicker/quote/REST/synthetic
   *  price-direction ticks). Delta Bubbles consume only real trades — this flag
   *  lets the consumer include full aggressive flow without quote/synthetic noise. */
  trade?: boolean;
  /** Canonical identity/provenance for adapters migrated to the Nectar event contract. */
  marketEvent?: CanonicalMarketEvent;
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
  source:      "polygon" | "finnhub" | "yahoo" | "alpaca" | "coinbase" | "binance" | "moomoo" | "longbridge" | "webull" | "unavailable";
  /** Aggressor tape feed — set only by trade WebSockets, never downgraded by REST quotes. */
  tapeSource:  ProviderTapeSource | null;
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

type RealQuote = {
  price: number;
  change: number;
  changePct: number;
  source: string;
  /**
   * SF-D01: the REAL observation epoch-ms when the source returned a RESOLVED
   * YahooQuoteObservation; null otherwise (UNKNOWN observation, or a legacy
   * source that carries no observation). Used to stamp the synthesized tick's
   * time honestly instead of always borrowing server Date.now().
   */
  observedAt: number | null;
};

async function fetchRealQuote(sym: string): Promise<RealQuote | null> {
  const upper = sym.toUpperCase();

  // Per-exchange crypto (e.g. "BTC.COINBASE") → that exchange's quote
  const exMatch = upper.match(/^([A-Z]{2,6})\.(COINBASE|KRAKEN|BITSTAMP|BINANCEUS|GEMINI)$/);
  if (exMatch) {
    try {
      const ex = exMatch[2].toLowerCase();
      const j = await fetch(`/api/exchange?ex=${ex}&coin=${exMatch[1]}&type=quote`, { cache: "no-store" }).then(r => r.json());
      if ((j?.price ?? 0) > 0) return { price: j.price, change: j.change ?? 0, changePct: j.changePct ?? 0, source: "binance", observedAt: null };
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
    // SF-D01: only a RESOLVED observation carries a real observation time.
    // UNKNOWN (stale meta / no live trade) → null, so we never claim its age.
    const obs = j?.observation;
    const observedAt =
      obs && obs.resolution === "RESOLVED" && typeof obs.observedAt === "number" && obs.observedAt > 0
        ? obs.observedAt
        : null;
    return { price, change, changePct, source, observedAt };
  };

  // Crypto display quotes come from the public exchange route, while the
  // executed tape remains the Coinbase/Binance WebSocket path below. Never
  // send crypto symbols through the Alpaca equity fallback.
  if (isCrypto) {
    try {
      const j = await fetch(`/api/exchange?ex=coinbase&coin=${encodeURIComponent(upper)}&type=quote`, { cache: "no-store" }).then(r => r.json());
      const q = mk(j, "coinbase"); if (q) return q;
    } catch {}
  }

  // ── Stocks & ETFs: Yahoo FIRST. Yahoo's intraday series uses includePrePost,
  // so it reflects the CONSOLIDATED last price (the number Moomoo/TradingView
  // show) in both regular AND extended hours. Alpaca's free IEX feed only sees
  // IEX's own thin prints — which match in RTH but diverge by dollars in
  // pre/post-market (e.g. TSLA 377 on IEX vs 380.89 consolidated). So Yahoo is
  // the accurate primary; Alpaca/Finnhub are fallbacks only if Yahoo fails. ───
  if (!isFutures && !isForex && !isCrypto) {
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
  const eventGuard = new MarketEventGuard();

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
          const receivedAtMs = Date.now();
          const event = normalizeBinanceUsTrade(m, symbol, receivedAtMs, Date.now());
          if (event) {
            const guarded = eventGuard.inspect(event);
            if (guarded.status !== "ACCEPTED") return;
            lastPx = event.price!;
            onTick({
              price: event.price!,
              size: event.size!,
              side: event.aggressorSide === "BUY" ? "buy" : "sell",
              time: event.timestampExchange ?? event.timestampProvider ?? event.timestampReceived,
              trade: true,
              marketEvent: event,
            }, true);
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

  const fanTick   = (t: Tick, isReal: boolean) => {
    // Record one validated collection-health observation per shared feed tick,
    // not once per React consumer. This stores coverage/receipts only—never raw
    // payloads and never durable Market Memory.
    if (t.marketEvent) ingestSessionNectarEvent(t.marketEvent);
    tickers.forEach(fn => fn(t, isReal));
  };
  const fanStatus = (ok: boolean) => { hub.lastStatus = ok; statuses.forEach(fn => fn(ok)); };

  // Single-tab / unsupported browser: open the socket locally (previous behavior).
  if (!CROSS_TAB) {
    const c = connect(fanTick, fanStatus);
    if (!c) return null;
    hub.cleanup = c;
    return hub;
  }

  // Do not join a long-lived tab running an older tick-only broadcast schema.
  // Nectar certification requires the v2 canonical-event envelope.
  const chan = tapeProtocolChannel(key);
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
  const eventGuard = new MarketEventGuard();

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
        const receivedAtMs = Date.now();
        const event = normalizeCoinbaseTicker(m, symbol, receivedAtMs, Date.now());
        if (event) {
          const guarded = eventGuard.inspect(event);
          if (guarded.status === "ACCEPTED") {
            onTick({
              price: event.price!,
              size: event.size!,
              side: event.aggressorSide === "BUY" ? "buy" : "sell",
              time: event.timestampExchange ?? event.timestampProvider ?? event.timestampReceived,
              trade: true,
              marketEvent: event,
            }, true);
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

/**
 * tryAlpacaRelay — Railway Alpaca IEX proxy connector for the shared TapeHub.
 *
 * Matches the shape of tryCoinbase / tryBinance / tryFinnhub so the equity
 * relay branch can be routed through joinTape with per-symbol dedup +
 * refcount + teardown. Fixes the 9-socket-per-/charts-mount defect: 9 hook
 * instances mounted with the same TSLA symbol now share one socket via
 * tapeHubs.get('alpaca-relay:TSLA'), not spawn 9.
 *
 * F1/F2/F3 semantics preserved (see Cycle 10 P0 trace):
 *   F1 seedFromRest: caller passes priceRef; used as prior-price seed
 *      so the first proxy trade produces a valid tick-inferred aggressor.
 *   F2 truthful ingest: the hub's fanTick calls ingestSessionNectarEvent
 *      for every accepted event (once per real tick, not once per
 *      consumer) — UNKNOWN aggressor observations are still recorded.
 *   F3 transport CONNECTED on WebSocket open — onStatus(true) fires
 *      before the first trade, so the UI's transport indicator stops
 *      false-negatives during the natural open-to-first-trade gap.
 */
function tryAlpacaRelay(
  symbol: string,
  seedFromRest: number,
  proxyBase: string,
  onTick: TapeTick,
  onStatus: TapeStatus,
): (() => void) | null {
  let sock: WebSocket | null = null;
  let closed = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPx = seedFromRest > 0 ? seedFromRest : 0;
  const eventGuard = new MarketEventGuard();

  const connectSock = () => {
    if (closed) return;
    let url = proxyBase;
    try { const u = new URL(proxyBase); u.searchParams.set("sym", symbol); url = u.toString(); }
    catch { url = `${proxyBase}${proxyBase.includes("?") ? "&" : "?"}sym=${encodeURIComponent(symbol)}`; }
    try { sock = new WebSocket(url); } catch { retryTimer = setTimeout(connectSock, 4000); return; }
    sock.binaryType = "arraybuffer";

    const handleText = (text: string) => {
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { return; }
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const raw of list) {
        const receivedAtMs = Date.now();
        const event = normalizeAlpacaRelayTrade(raw, symbol, lastPx, receivedAtMs, Date.now());
        if (!event) continue;
        const guarded = eventGuard.inspect(event);
        if (guarded.status !== "ACCEPTED") continue;
        lastPx = event.price!;
        // fanTick (in createTapeHub) calls ingestSessionNectarEvent for us.
        // Per-consumer onTick handles the UNKNOWN-aggressor gate for signed
        // indicators (see the useEffect wiring below).
        onTick({
          price: event.price!,
          size: event.size!,
          side: event.aggressorSide === "BUY" ? "buy"
              : event.aggressorSide === "SELL" ? "sell"
              : "buy", // side is only inspected when UNKNOWN is not skipped by the wrapper
          time: event.timestampProvider ?? event.timestampReceived,
          trade: true,
          marketEvent: event,
        }, true);
      }
    };

    sock.onopen = () => {
      onStatus(true);
      try { sock?.send(JSON.stringify({ action: "subscribe", sym: symbol, trades: [symbol] })); } catch { /* proxy may not need a subscribe msg */ }
    };
    sock.onmessage = (ev) => {
      const d = ev.data as unknown;
      if (typeof d === "string") handleText(d);
      else if (d instanceof ArrayBuffer) handleText(new TextDecoder().decode(d));
      else if (d && typeof (d as Blob).text === "function") (d as Blob).text().then(handleText).catch(() => {});
    };
    sock.onclose = () => { onStatus(false); if (!closed) retryTimer = setTimeout(connectSock, 3000); };
    sock.onerror = () => { try { sock?.close(); } catch { /* already closing */ } };
  };

  connectSock();

  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    try { sock?.close(); } catch { /* already closing */ }
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
  const lastBarEventAtRef = useRef<number | null>(null);
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

  // Flag: ignore non-observed ticks once real data arrives
  const hasRealDataRef = useRef(false);

  const getIntervalSec = useCallback(() => {
    const m: Record<string, number> = {
      "1t": 1, "5t": 5, "30t": 30,
      "1m": 60, "2m": 120, "3m": 180, "5m": 300, "10m": 600,
      "15m": 900, "30m": 1800, "1h": 3600, "2h": 7200,
      "4h": 14400, "1D": 86400, "1W": 604800, "1M": 2592000,
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
      // Day-change is vs the REAL prior close (from the quote). Falling back to
      // baseRef.current (the hardcoded seed, e.g. TSLA 405) produced a fabricated
      // −18% header on TSLA whenever a WS tick landed before fetchRealQuote
      // populated prevCloseRef. Truth-first: if we don't have a real reference
      // yet, do NOT touch change/changePct — keep the last known values so a
      // seed-derived fake never reaches the UI. fetchRealQuote at mount will
      // populate prevCloseRef on its first resolve.
      const hasRealRef = prevCloseRef.current > 0;
      return {
        ...prev,
        ticker: hasRealRef
          ? {
              price,
              change:    +(price - prevCloseRef.current).toFixed(2),
              changePct: +((price - prevCloseRef.current) / prevCloseRef.current * 100).toFixed(2),
              volume:    newVol,
            }
          : { ...prev.ticker, price, volume: newVol },
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
    if (isReal && !hasRealDataRef.current) {
      hasRealDataRef.current = true;
    }
    // Once observed data is present, ignore any non-observed caller.
    if (!isReal && hasRealDataRef.current) return;

    // ── Source-level corrupt-tick guard ────────────────────────────────────
    // Reject only definitively-bad prints (non-positive / NaN) here — a wrong
    // magnitude would poison barRef.low/high via Math.min/Math.max. We do NOT
    // do a deviation check at this layer because the seed can be a stale
    // hardcoded value far from the real price (that would freeze the chart).
    // The magnitude/deviation check lives in MainChart against lastBar.close,
    // which is reliably refetched per symbol.
    if (!Number.isFinite(tick.price) || tick.price <= 0) return;

    const intervalSec = getIntervalSec();
    const barUpdate = applyTickToLiveBar(barRef.current, lastBarEventAtRef.current, tick, intervalSec);
    if (barUpdate.status === "LATE_EVENT_IGNORED") return;

    priceRef.current = tick.price;
    tickBuf.current.push(tick);
    barRef.current = barUpdate.bar;
    lastBarEventAtRef.current = barUpdate.lastEventAt;

    scheduleFlush();
  }, [getIntervalSec, scheduleFlush]);

  /* Price/volume observation path. It advances the visible bar and ticker but
     intentionally never enters recentTicks, tapeSource, Delta, CVD, or DOM. */
  const processUnsignedObservation = useCallback((event: CanonicalMarketEvent, source: "longbridge" | "webull") => {
    const price = event.price;
    const size = event.size;
    const time = event.timestampProvider ?? event.timestampReceived;
    if (!(price && price > 0) || !(size && size > 0) || !Number.isFinite(time) || time <= 0) return;
    const barUpdate = applyTickToLiveBar(barRef.current, lastBarEventAtRef.current, { price, size, time }, getIntervalSec());
    if (barUpdate.status === "LATE_EVENT_IGNORED") return;
    priceRef.current = price;
    barRef.current = barUpdate.bar;
    lastBarEventAtRef.current = barUpdate.lastEventAt;
    hasRealDataRef.current = true;
    const now = Date.now();
    setState(previous => ({
      ...previous,
      ticker: { ...previous.ticker, price, volume: previous.ticker.volume + size },
      liveBar: { ...barUpdate.bar },
      source,
      connected: true,
      latency: Math.max(0, now - time),
    }));
  }, [getIntervalSec]);

  /* ── Mount / symbol change ──────────────────────────────── */
  useEffect(() => {
    // Cleanup previous
    cleanupFns.current.forEach(fn => fn());
    cleanupFns.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    tickBuf.current = [];

    const b = getBasePrice(symbol);
    baseRef.current  = b;
    priceRef.current = b;
    prevCloseRef.current = 0; // cleared on symbol change; repopulated by the next quote
    barRef.current   = null;
    lastBarEventAtRef.current = null;
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
    // WM-SEC-P0-03 (2026-08-08): client-side Finnhub WebSocket is DISABLED.
    // It required NEXT_PUBLIC_FINNHUB_KEY, which shipped the API key in the
    // browser bundle. Stocks now use REST polling via /api/finnhub (server
    // proxy holds the key). Sub-second tick smoothness for stocks is
    // sacrificed until a WM-hosted WS proxy is built (follow-up ticket) —
    // truthful over exposed key.
    //
    // Coinbase / Binance crypto WS paths below are unaffected (they need no
    // key and are already client-safe).
    const finnhubKey: string | null = null;

    // Identify instrument class
    const isFuture = symbol.endsWith("1!") || symbol.includes("=F");
    const isCrypto = binancePair(symbol) != null;
    let disposed = false;

    // Moomoo OpenD executed-print lane. This remains a bounded authenticated
    // poll because the current bridge is request-scoped; it is never described
    // as a persistent stream. A route response alone is insufficient: only a
    // current provider timestamp + exact symbol + explicit provider side can
    // elect Moomoo as the active aggressor tape.
    const providerTapeGuard = new MarketEventGuard();
    let providerTapeLastAcceptedAt = 0;
    let moomooInFlight = false;
    let moomooAbort: AbortController | null = null;
    let moomooTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleMoomooPoll = (delayMs: number) => {
      if (disposed || isFuture || isCrypto || document.visibilityState === "hidden") return;
      if (moomooTimer) clearTimeout(moomooTimer);
      moomooTimer = setTimeout(() => { void pollMoomooTicks(); }, delayMs);
    };
    const pollMoomooTicks = async () => {
      if (disposed || isFuture || isCrypto || document.visibilityState === "hidden" || moomooInFlight) return;
      moomooInFlight = true;
      moomooAbort = new AbortController();
      let nextDelayMs = 60_000;
      try {
        const response = await fetch(`/api/market-data/moomoo/ticks?symbol=${encodeURIComponent(symbol.toUpperCase())}`, {
          cache: "no-store",
          signal: moomooAbort.signal,
        });
        const body = response.ok && !disposed ? await response.json().catch(() => null) : null;
        let electedSource: "moomoo" | "longbridge" | "webull" = "moomoo";
        let events = selectFreshMoomooTapeEvents(body, symbol, Date.now());
        // Moomoo is the deterministic first choice. Longbridge may contribute
        // only unsigned observed price/volume, then Webull is the final bounded
        // fallback. A diagnostics receipt alone never reaches any consumer.
        if (events.length === 0 && !disposed) {
          const longbridgeResponse = await fetch(`/api/market-data/longbridge/ticks?symbol=${encodeURIComponent(symbol.toUpperCase())}`, {
            cache: "no-store",
            signal: moomooAbort.signal,
          });
          const longbridgeBody = longbridgeResponse.ok ? await longbridgeResponse.json().catch(() => null) : null;
          events = selectFreshLongbridgeObservedEvents(longbridgeBody, symbol, Date.now());
          electedSource = "longbridge";
        }
        if (events.length === 0 && !disposed) {
          const webullResponse = await fetch(`/api/market-data/webull/ticks?symbol=${encodeURIComponent(symbol.toUpperCase())}`, {
            cache: "no-store",
            signal: moomooAbort.signal,
          });
          const webullBody = webullResponse.ok ? await webullResponse.json().catch(() => null) : null;
          events = selectFreshWebullObservedEvents(webullBody, symbol, Date.now());
          electedSource = "webull";
        }
        // Preserve a responsive five-second tape only while this exact symbol
        // is producing fresh provider events. Missing config, auth blockers,
        // stale/no-event states, and malformed receipts back off to one minute
        // so an unavailable provider cannot burn the host request budget.
        nextDelayMs = moomooNextPollDelayMs(events.length);
        for (const event of events) {
          const inspected = providerTapeGuard.inspect(event);
          if (inspected.status !== "ACCEPTED") continue;
          ingestSessionNectarEvent(inspected.event);
          if (inspected.event.aggressorSide !== "BUY" && inspected.event.aggressorSide !== "SELL") {
            if (electedSource === "longbridge" || electedSource === "webull") {
              processUnsignedObservation(inspected.event, electedSource);
            }
            continue;
          }
          // Longbridge direction is provenance only. Even if an unexpected
          // future payload carries a side, this lane never elects it as tape.
          if (electedSource === "longbridge") continue;
          const acceptedAt = Date.now();
          const nextTapeSource = electProviderTapeSource(
            tapeSourceRef.current,
            electedSource,
            providerTapeLastAcceptedAt,
            acceptedAt,
          );
          if (nextTapeSource !== electedSource) continue;
          tapeSourceRef.current = nextTapeSource;
          providerTapeLastAcceptedAt = acceptedAt;
          // Only the elected tape owner may enter the canonical session store.
          // A valid-but-rejected alternate provider remains diagnostics evidence.
          processTick({
            price: inspected.event.price!,
            size: inspected.event.size!,
            side: inspected.event.aggressorSide === "BUY" ? "buy" : "sell",
            time: inspected.event.timestampProvider!,
            trade: true,
            marketEvent: inspected.event,
          }, true);
          setState(previous => previous.tapeSource === electedSource ? previous : { ...previous, tapeSource: electedSource });
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          // Route/provider truth is rendered by the certification surface. The
          // chart simply retains its last proven source and never invents data.
        }
      } finally {
        moomooInFlight = false;
        scheduleMoomooPoll(nextDelayMs);
      }
    };
    void pollMoomooTicks();
    const onVisibleMoomoo = () => {
      if (document.visibilityState !== "visible") return;
      if (moomooTimer) clearTimeout(moomooTimer);
      void pollMoomooTicks();
    };
    document.addEventListener("visibilitychange", onVisibleMoomoo);

    // ── CRYPTO: real-time WebSocket (US-compliant, no key, 24/7) ──
    // Primary = Coinbase (highest US volume, ~4 ticks/sec). Binance.US is kept
    // as an automatic fallback if Coinbase fails to connect.
    let cryptoCleanup: (() => void) | null = null;
    let cryptoFallback: (() => void) | null = null;
    let cryptoFallbackTimer: ReturnType<typeof setTimeout> | null = null;
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
            tapeSourceRef.current = "coinbase";
            setState(p => ({ ...p, source: "coinbase", tapeSource: "coinbase", connected: true }));
          }
        },
      );
      // If Coinbase hasn't connected within 4s, spin up Binance.US too.
      cryptoFallbackTimer = setTimeout(() => {
        cryptoFallbackTimer = null;
        if (!disposed && !gotCoinbase && !cryptoFallback) {
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
          // The effect may be disposed while joinTape is being established.
          // Never leave a late fallback subscription outside the cleanup path.
          if (disposed) cryptoFallback?.();
          else if (cryptoFallback) cleanupFns.current.push(cryptoFallback);
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
    let restFetchInFlight = false;
    let restTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRestFetch = (delayMs: number) => {
      if (disposed || document.visibilityState === "hidden") return;
      if (restTimer) clearTimeout(restTimer);
      restTimer = setTimeout(doRestFetch, delayMs);
    };
    const doRestFetch = () => {
      if (disposed || document.visibilityState === "hidden" || restFetchInFlight) return;
      restFetchInFlight = true;
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
        // SF-D01: stamp the synthesized tick with the REAL observation time when
        // the source resolved one (q.observedAt); only fall back to server
        // Date.now() when there is genuinely no observation time (legacy source
        // or UNKNOWN). This stops a stale Sunday/closed-market quote from
        // reaching the canonical store's price.eventAt as fake-fresh (~0ms age).
        if (q.observedAt != null) {
          processTick({ price: realPrice, size: 1, side, time: q.observedAt }, true);
        }
        // Real day change comes straight from the quote (not a per-poll delta).
        const tape = tapeSourceRef.current;
        setState(prev2 => ({
          ...prev2,
          // REST quote is for price display only — never downgrade an active aggressor tape feed.
          // Moomoo is an aggressor-tape identity, not a certified quote-source
          // label. Keep the independently observed REST quote provenance.
          source: tape === "moomoo" || tape === "webull"
            ? (q.observedAt != null ? (q.source as MarketState["source"]) : prev2.source)
            : tape ?? (q.observedAt != null ? (q.source as MarketState["source"]) : prev2.source),
          tapeSource: tape,
          connected: tape != null || q.observedAt != null,
          ticker: { price: realPrice, change: q.change, changePct: q.changePct, volume: prev2.ticker.volume },
          orderBook: bookRef.current,
        }));
      }).finally(() => {
        restFetchInFlight = false;
        scheduleRestFetch(restQuoteNextPollDelayMs(tapeSourceRef.current));
      });
    };

    // Fetch immediately at mount to correct stale seed price
    doRestFetch();

    // Fire REST fetch immediately when tab becomes visible (fixes background-tab throttling)
    const onVisibleWS = () => {
      if (document.visibilityState !== "visible") return;
      if (restTimer) clearTimeout(restTimer);
      doRestFetch();
    };
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
    // Route the Alpaca IEX relay through the shared TapeHub — matches the
    // crypto (Coinbase/Binance) and Finnhub pattern. Fixes the 9-socket
    // defect: N hook instances watching the same equity symbol on /charts
    // now share ONE socket via tapeHubs.get('alpaca-relay:<SYM>') instead
    // of spawning N. Founder-verified Aug 13 as a release-gate item.
    //
    // F1/F2/F3 semantics preserved in tryAlpacaRelay + the per-consumer
    // onTick wrapper below.
    const alpacaRelayCleanup = (proxyBase && !isFuture && !isCrypto && typeof WebSocket !== "undefined")
      ? joinTape(
          `alpaca-relay:${symbol.toUpperCase()}`,
          (onTick, onStatus) => tryAlpacaRelay(symbol, priceRef.current, proxyBase, onTick, onStatus),
          (tick, isReal) => {
            // F2 (Cycle 10 P0): UNKNOWN aggressor observations are already
            // ingested to Nectar in fanTick (shared TapeHub, line ~493) — do
            // not silence them. Skip only the signed downstream path here so
            // Delta/CVD/footprint/tape never see a fake "sell" coerced from
            // UNKNOWN.
            if (tick.marketEvent?.aggressorSide === "UNKNOWN") return;
            tapeSourceRef.current = "alpaca";
            processTick(tick, isReal);
            // A transport-open callback is not market data. Elect Alpaca only
            // after a normalized, signed trade reached this consumer.
            hasRealDataRef.current = true;
            setState(previous =>
              previous.source === "alpaca" && previous.tapeSource === "alpaca" && previous.connected
                ? previous
                : { ...previous, source: "alpaca", tapeSource: "alpaca", connected: true },
            );
          },
          // Socket readiness is transport truth only. It must not promote the
          // chart's source/connected state before a symbol event is observed.
          () => {},
        )
      : null;
    if (alpacaRelayCleanup) cleanupFns.current.push(alpacaRelayCleanup);

    if (finhCleanup) cleanupFns.current.push(finhCleanup);
    if (binanceCleanup) cleanupFns.current.push(binanceCleanup);

    return () => {
      disposed = true;
      moomooAbort?.abort();
      if (moomooTimer) clearTimeout(moomooTimer);
      if (cryptoFallbackTimer) clearTimeout(cryptoFallbackTimer);
      if (restTimer) clearTimeout(restTimer);
      // Alpaca relay teardown now flows through cleanupFns.current below —
      // the joinTape cleanup drops the refcount and closes the shared socket
      // when the last consumer unmounts (matches crypto/Finnhub behavior).
      document.removeEventListener("visibilitychange", onVisibleWS);
      document.removeEventListener("visibilitychange", onVisibleMoomoo);
      cleanupFns.current.forEach(fn => fn());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // A timeframe change starts an empty live bar; only observed ticks may refill it.
  useEffect(() => {
    barRef.current = null;
    lastBarEventAtRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  return state;
}
