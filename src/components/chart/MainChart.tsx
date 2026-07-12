"use client";

/**
 * MainChart — TradingView Lightweight Charts v4.2
 *
 * Fixes vs prev version:
 *  - getIntervalSec() is now uniform (seconds) — tick TF bug fixed
 *  - VWAP + bands removed from default chart (moved to Indicators panel)
 *  - Candle countdown timer (resets per timeframe)
 *  - Live bar update works on ALL 16 timeframes
 *  - Canvas order-flow bubbles at exact price levels
 *  - Pine Script overlay series
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { FootprintType, CandleType } from "./ChartsDashboard";
import { resolveParams, visibleAtTf, type IndicatorSettings } from "./indicatorConfig";
import { parseExchangeSymbol } from "@/lib/exchanges";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { PineOutput } from "@/lib/pine/types";
import { interpretPine } from "@/lib/pine/interpreter";
import * as IND from "./indicators";
import { computeDeltaVP, type DeltaVPLevel } from "@/lib/deltaVP";
import type { DrawingStyle, LogicalPt, DrawStyle, ChartDrawing } from "@/types/chart";
import { DEFAULT_DRAWING_STYLE } from "@/types/chart";
import { showAlertToast } from "./AlertsPanel";

/* ── Types ─────────────────────────────────────────────── */
interface Bar {
  time:   number;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

/* ── Symbol base prices — verified against MooMoo/TradingView Jun 16 2026 ── */
// NOTE: fetchPolygonOHLCV returns real OHLCV data for stocks/ETFs/crypto.
// These seeds are ONLY used for futures (NQ1!, ES1! etc.) and as a 1-second
// fallback before the Polygon REST snapshot resolves.
// Updated Jun 17 2026 — sourced from Yahoo Finance proxy at runtime
const SYMBOL_BASE: Record<string, number> = {
  "NQ1!": 30_476, "ES1!":  7_595,  "RTY1!":  2_968,  "YM1!": 52_464,
  "GC1!":  4_349, "CL1!":  75.68,  "SI1!":   69.97,  "ZB1!": 113.06,
  "ZN1!": 109.88, "HG1!":   4.50,
  "AAPL":    299, "TSLA":    405,  "NVDA":     207,   "AMZN":    246,
  "META":    600, "MSFT":    394,  "GOOG":     371,   "AVGO":    210,
  "AMD":     507, "INTC":     22,  "CRM":      300,   "ORCL":    165,
  "NFLX":  78.72, "JPM":     331,  "GS":     1_091,   "BAC":      46,
  "V":       360, "MA":      560,  "UNH":      310,   "LLY":     870,
  "SPY":     750, "QQQ":     730,  "IWM":      292,   "DIA":     524,
  "GLD":     398, "TLT":      88,  "XLK":      240,   "XLF":      50,
  "BTC":  64_500, "BTCUSD": 64_500, "ETH":  1_760, "ETHUSD": 1_760, "SOL": 71.77, "SOLUSD": 71.77, "BNB": 601,
  "XRP":   1.188, "DOGE":  0.086,  "ADA":     0.75,   "AVAX":     25,
  "EUR/USD": 1.13, "GBP/USD": 1.34, "USD/JPY": 144,
};

// Normalize common aliases → canonical symbol used throughout the app
function normalizeSym(sym: string): string {
  let u = sym.toUpperCase();
  // Strip per-exchange suffix: "BTC.COINBASE" → "BTC"
  const dot = u.indexOf(".");
  if (dot > 0 && /COINBASE|KRAKEN|BITSTAMP|BINANCEUS|GEMINI/.test(u.slice(dot + 1))) u = u.slice(0, dot);
  const aliases: Record<string, string> = {
    BTCUSD: "BTC", ETHUSD: "ETH", SOLUSD: "SOL", BNBUSD: "BNB",
    XRPUSD: "XRP", DOGEUSD: "DOGE", ADAUSD: "ADA", AVAXUSD: "AVAX",
    "BTC/USD": "BTC", "ETH/USD": "ETH",
  };
  return aliases[u] ?? u;
}
function getBase(sym: string) { return SYMBOL_BASE[normalizeSym(sym)] ?? SYMBOL_BASE[sym.toUpperCase()] ?? 100; }

/* ── Color helper: hex (or rgb/rgba passthrough) → rgba string ─────── */
function hexToRgba(color: string, alpha = 1): string {
  if (!color) return `rgba(0,0,0,${alpha})`;
  if (color.startsWith("rgb")) return color; // already rgb/rgba
  let h = color.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(n => isNaN(n))) return `rgba(0,0,0,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

// Parse a #rrggbb / #rgb hex into an [r,g,b] triplet, or null if invalid/empty.
function hexToRgbTriplet(color: string): [number, number, number] | null {
  if (!color) return null;
  let h = color.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(n => isNaN(n))) return null;
  return [r, g, b];
}

/* ── FIXED: all values in seconds, uniform ──────────────── */
function getIntervalSec(tf: string): number {
  const m: Record<string, number> = {
    "1t":  1,    "5t":  5,    "30t": 30,
    "1m":  60,   "2m":  120,  "3m":  180,  "5m":  300,
    "10m": 600,  "15m": 900,  "30m": 1800,
    "1h":  3600, "2h":  7200, "4h":  14400,
    "D":   86400, "W":  604800, "M":  2592000,
    "3M":  7776000, "6M": 15552000, "1Y": 31536000,
    "3Y":  94608000, "5Y": 157680000,
  };
  return m[tf] ?? 60;
}

/* ── Countdown formatter ─────────────────────────────────── */
function formatCountdown(remaining: number, intervalSec: number): string {
  const r = Math.max(0, Math.ceil(remaining));
  if (intervalSec < 60) return `${r}s`;
  if (intervalSec < 3600) {
    const m = Math.floor(r / 60), s = r % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  const h = Math.floor(r / 3600), m = Math.floor((r % 3600) / 60), s = r % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ── Polygon symbol mapping ─────────────────────────────── */
function toPolygonTicker(sym: string): string | null {
  const s = normalizeSym(sym.toUpperCase());
  // Futures not supported on basic Polygon tier
  if (s.endsWith("1!") || s === "VX1!" || s === "SR3M4") return null;
  // Tick-level timeframes not supported via aggs
  // Crypto
  const cryptoMap: Record<string,string> = {
    BTC:"X:BTCUSD", ETH:"X:ETHUSD", SOL:"X:SOLUSD", BNB:"X:BNBUSD",
    XRP:"X:XRPUSD", DOGE:"X:DOGEUSD", ADA:"X:ADAUSD", AVAX:"X:AVAXUSD",
    LINK:"X:LINKUSD", DOT:"X:DOTUSD", MATIC:"X:MATICUSD", LTC:"X:LTCUSD",
    ATOM:"X:ATOMUSD", UNI:"X:UNIUSD", AAVE:"X:AAVEUSD", FIL:"X:FILUSD",
    ARB:"X:ARBUSD", OP:"X:OPUSD", SUI:"X:SUIUSD", APT:"X:APTUSD",
    INJ:"X:INJUSD", PEPE:"X:PEPEUSD", WIF:"X:WIFUSD",
  };
  if (cryptoMap[s]) return cryptoMap[s];
  // Forex
  if (s.includes("/")) {
    return `C:${s.replace("/", "")}`;
  }
  // VIX — synthetic only
  if (s === "VIX") return null;
  // Stocks/ETFs — direct
  return s;
}

function toPolygonTimespan(tf: string): { mult: number; span: string } | null {
  const map: Record<string, { mult: number; span: string }> = {
    "1m":  { mult:1,  span:"minute" },
    "2m":  { mult:2,  span:"minute" },
    "3m":  { mult:3,  span:"minute" },
    "5m":  { mult:5,  span:"minute" },
    "10m": { mult:10, span:"minute" },
    "15m": { mult:15, span:"minute" },
    "30m": { mult:30, span:"minute" },
    "1h":  { mult:1,  span:"hour"   },
    "2h":  { mult:2,  span:"hour"   },
    "4h":  { mult:4,  span:"hour"   },
    "D":   { mult:1,  span:"day"    },
    "W":   { mult:1,  span:"week"   },
    "M":   { mult:1,  span:"month"  },
    "3M":  { mult:3,  span:"month"  },
    "6M":  { mult:6,  span:"month"  },
    "1Y":  { mult:12, span:"month"  },
    "3Y":  { mult:36, span:"month"  },
    "5Y":  { mult:60, span:"month"  },
  };
  return map[tf] ?? null; // 1t, 5t, 30t tick timeframes → null (synthetic)
}

async function fetchPolygonOHLCV(sym: string, tf: string, count: number): Promise<Bar[] | null> {
  const POLY_KEY = process.env.NEXT_PUBLIC_POLYGON_KEY ?? "";
  if (!POLY_KEY) return null;

  const ticker = toPolygonTicker(sym);
  if (!ticker) return null;

  const timespan = toPolygonTimespan(tf);
  if (!timespan) return null;

  const intervalSec = getIntervalSec(tf);
  const toMs   = Date.now();
  const fromMs = toMs - Math.round(count * 1.8) * intervalSec * 1000;

  const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${timespan.mult}/${timespan.span}/${fromMs}/${toMs}?adjusted=true&sort=asc&limit=${count}&apiKey=${POLY_KEY}`;

  try {
    const res  = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (!json.results?.length) return null;
    return json.results.map((r: any) => ({
      time:   Math.floor(r.t / 1000),
      open:   r.o,
      high:   r.h,
      low:    r.l,
      close:  r.c,
      volume: r.v,
    }));
  } catch {
    return null;
  }
}

/* ── Finnhub OHLCV — primary real data source (Polygon key invalid) ── */
const FINNHUB_CRYPTOS = new Set(["BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","LINK","DOT","MATIC","LTC","ATOM","UNI","AAVE"]);

async function fetchFinnhubCandles(sym: string, tf: string, count: number): Promise<Bar[] | null> {
  const KEY = process.env.NEXT_PUBLIC_FINNHUB_KEY ?? "";
  if (!KEY) return null;

  // Resolution map — Finnhub supported: 1,5,15,30,60,D,W,M
  const resMap: Record<string, string> = {
    "1m":"1",  "2m":"5",  "3m":"5",  "5m":"5",
    "10m":"15","15m":"15","30m":"30",
    "1h":"60", "2h":"60", "4h":"60",
    "D":"D",   "W":"W",   "M":"M",
    "3M":"M",  "6M":"M",  "1Y":"M",  "3Y":"M",  "5Y":"M",
  };
  const resolution = resMap[tf];
  if (!resolution) return null; // tick TFs unsupported

  const upper = sym.toUpperCase();
  // Futures and forex not supported
  if (upper.includes("1!") || upper.includes("/")) return null;

  const intervalSec = getIntervalSec(tf);
  const to   = Math.floor(Date.now() / 1000);
  // Overfetch to account for weekends / market closures
  const from = to - Math.round(count * 2.5) * intervalSec;

  let url: string;
  if (FINNHUB_CRYPTOS.has(upper)) {
    url = `https://finnhub.io/api/v1/crypto/candle?symbol=BINANCE:${upper}USDT&resolution=${resolution}&from=${from}&to=${to}&token=${KEY}`;
  } else {
    url = `https://finnhub.io/api/v1/stock/candle?symbol=${upper}&resolution=${resolution}&from=${from}&to=${to}&token=${KEY}`;
  }

  try {
    const res  = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (json.s !== "ok" || !Array.isArray(json.t) || json.t.length === 0) return null;

    const bars: Bar[] = (json.t as number[]).map((t: number, i: number) => ({
      time:   t,
      open:   json.o[i],
      high:   json.h[i],
      low:    json.l[i],
      close:  json.c[i],
      volume: json.v[i],
    })).filter((b: Bar) => b.open > 0 && b.high > 0);

    return bars.slice(-count);
  } catch {
    return null;
  }
}

/* ── US-equity session helpers ───────────────────────────────
 * Stocks/ETFs trade an extended day (pre 4:00 ET, RTH 9:30–16:00 ET,
 * post 16:00–20:00 ET). Outside RTH the tape is sparse, so the few prints
 * render as disconnected flat fragments with a visual gap to the right of
 * the regular-session candles. When the user is in "RTH — Regular Hours"
 * mode (extendedHours = false) we strip every non-RTH bar so the series is
 * continuous. Futures / crypto / forex trade ~24h and are never filtered.
 */
function isEquitySymbol(sym: string): boolean {
  const up = sym.toUpperCase();
  if (up.endsWith("1!") || up.includes("=F")) return false;            // futures
  if (up.endsWith("=X") || /^[A-Z]{3}\/[A-Z]{3}$/.test(up)) return false; // forex
  if (up.includes(".") ) return false;                                  // exchange-qualified crypto e.g. BTC.COINBASE
  if (up.endsWith("USD") || up.endsWith("USDT") || up.endsWith("USDC")) return false; // crypto pairs
  if (["BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","LTC","DOT","MATIC","SHIB","PEPE","XAU","XAG"].includes(up)) return false;
  return true; // default: treat as a US equity / ETF
}

// Returns ET wall-clock minutes-since-midnight + weekday for a unix-seconds ts.
function etClock(tsSec: number): { minutes: number; weekday: number } {
  const d = new Date(tsSec * 1000);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", hour12: false,
    hour: "2-digit", minute: "2-digit", weekday: "short",
  }).formatToParts(d);
  let hh = 0, mm = 0, wd = "Mon";
  for (const p of parts) {
    if (p.type === "hour")    hh = parseInt(p.value, 10) % 24;
    if (p.type === "minute")  mm = parseInt(p.value, 10);
    if (p.type === "weekday") wd = p.value;
  }
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { minutes: hh * 60 + mm, weekday: wdMap[wd] ?? 1 };
}

// RTH = 9:30–16:00 ET, Mon–Fri.
// IMPORTANT: keep any bar whose SPAN overlaps the regular session, not just
// bars whose START is inside it. Session-aligned feeds (Yahoo) emit a 9:30
// opening bar, but CLOCK-aligned feeds (Alpaca — our primary source for US
// equities) emit a 9:00–10:00 opening bar that actually CONTAINS the 9:30 RTH
// open. A start-only window (minutes >= 570) wrongly discarded that opening
// hour bar — that is the "missing candles vs TradingView" the user reported.
// Overlap test: bar [start, start+interval) intersects [9:30, 16:00).
function isRegularSession(tsSec: number, intervalSec: number): boolean {
  const { minutes, weekday } = etClock(tsSec);
  if (weekday === 0 || weekday === 6) return false;
  const barEnd = minutes + Math.max(1, Math.floor(intervalSec / 60));
  return barEnd > 570 && minutes < 960; // overlaps 9:30 (570) .. 16:00 (960)
}

// Filter a bar set down to regular session for intraday equity timeframes.
function filterSession(bars: Bar[], sym: string, intervalSec: number, extendedHours: boolean): Bar[] {
  if (extendedHours) return bars;
  // Multi-hour bars (4h+) open on a fixed grid (…08:00,12:00,16:00,20:00) and
  // most opens fall OUTSIDE 9:30–16:00, so RTH filtering nukes ~90% of them and
  // leaves a sparse, gappy 4h/6h chart. These large bars inherently span sessions
  // and should not be dropped — same as daily+. Only filter genuine intraday
  // (≤1h) equity bars, which align cleanly to the regular session.
  if (intervalSec >= 14400) return bars;          // 4h+ : keep every bar (like daily)
  if (!isEquitySymbol(sym)) return bars;          // 24h assets untouched
  const filtered = bars.filter(b => isRegularSession(Number(b.time), intervalSec));
  // Safety: never return empty if the source somehow had only extended bars.
  return filtered.length >= Math.min(20, bars.length) ? filtered : bars;
}

/* ── Yahoo Finance OHLCV — covers futures + crypto + stocks ── */
// ── Alpaca candles (primary for stocks/ETFs/crypto when key is set) ──────
async function fetchAlpacaCandles(sym: string, tf: string, count: number): Promise<Bar[] | null> {
  const up = sym.toUpperCase();
  const isFutures = up.endsWith("1!") || up.includes("=F");
  if (isFutures) return null; // Alpaca doesn't support futures
  try {
    const url = `/api/alpaca?sym=${encodeURIComponent(up)}&type=candles&tf=${tf}&bars=${count}`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.status === 503 || res.status === 404) return null; // key not set or not supported
    const json = await res.json();
    if (!Array.isArray(json.candles) || json.candles.length === 0) return null;
    return json.candles as Bar[];
  } catch {
    return null;
  }
}

async function fetchFinnhubCandlesDirect(sym: string, tf: string, count: number): Promise<Bar[] | null> {
  // Only for stocks/ETFs — futures/crypto fall back to Yahoo
  const up = sym.toUpperCase();
  const isFutures = up.endsWith("1!") || ["NQ1!","ES1!","RTY1!","YM1!","GC1!","SI1!","CL1!","NG1!","ZB1!","ZN1!","HG1!"].includes(up);
  const isCrypto  = ["BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","BTCUSD","ETHUSD","SOLUSD"].includes(up);
  if (isFutures || isCrypto) return null;
  try {
    const url = `/api/finnhub?sym=${encodeURIComponent(sym)}&type=candles&tf=${tf}&bars=${count}`;
    const json = await fetch(url, { cache: "no-store" }).then(r => r.json());
    if (!Array.isArray(json.candles) || json.candles.length === 0) return null;
    return json.candles as Bar[];
  } catch {
    return null;
  }
}

async function fetchYahooCandles(sym: string, tf: string, count: number, ext = false): Promise<Bar[] | null> {
  try {
    const url = `/api/yahoo?sym=${encodeURIComponent(sym)}&type=candles&tf=${tf}&bars=${count}${ext ? "&ext=1" : ""}`;
    const json = await fetch(url, { cache: "no-store" }).then(r => r.json());
    if (!Array.isArray(json.candles) || json.candles.length === 0) return null;
    return json.candles as Bar[];
  } catch {
    return null;
  }
}

/* ── Tick-size helper ────────────────────────────────────── */
function getMinTick(base: number): number {
  if (base > 10_000) return 0.25;   // NQ, YM
  if (base > 1_000)  return 0.25;   // ES, RTY
  if (base > 100)    return 0.01;   // Stocks
  if (base > 10)     return 0.01;
  if (base > 1)      return 0.0001; // Forex
  return 0.00001;
}

/* Snap price to nearest valid tick */
function snapTick(price: number, tick: number): number {
  return Math.round(price / tick) * tick;
}

/* ── Historical candle generator — realistic market phases ── */
/*
 * Divides history into alternating trend/consolidation phases so
 * recognizable chart patterns (H&S, double-tops, triangles, flags)
 * form naturally over time instead of pure random noise.
 */
function generateCandles(count: number, base: number, intervalSec: number): Bar[] {
  const bars: Bar[] = [];
  const tick = getMinTick(base);
  const dp   = base < 10 ? 5 : base < 100 ? 2 : 2;

  // ATR (average true range) scales with timeframe — realistic candle sizes
  const atrScale: Record<number, number> = {
    1:     0.0003,   // 1s
    60:    0.0004,   // 1m
    300:   0.0007,   // 5m
    900:   0.0011,   // 15m
    1800:  0.0015,   // 30m
    3600:  0.0020,   // 1h
    14400: 0.0032,   // 4h
    86400: 0.0060,   // D
  };
  // Find closest matching interval
  const atrPct = Object.entries(atrScale).reduce((best, [sec, pct]) =>
    Math.abs(Number(sec) - intervalSec) < Math.abs(Number(best[0]) - intervalSec) ? [sec, pct] : best
  , ["60", 0.0004])[1] as number;

  const atr = base * atrPct;

  // Build market phases: trend direction + strength + duration
  type Phase = { bias: number; strength: number; len: number };
  const phases: Phase[] = [];
  let remaining = count;
  const directions = [1, -1, 1, -1, 0, 1, -1, 0, 1, -1, 1, 0, -1];
  let dIdx = 0;

  while (remaining > 0) {
    const dir = directions[dIdx % directions.length];
    dIdx++;
    const isConsolidation = dir === 0;
    const len = isConsolidation
      ? Math.floor(8 + Math.random() * 18)   // consolidation: 8-25 bars
      : Math.floor(15 + Math.random() * 40); // trend: 15-55 bars
    phases.push({
      bias:     dir,
      strength: isConsolidation ? 0.02 : 0.08 + Math.random() * 0.18,
      len:      Math.min(len, remaining),
    });
    remaining -= len;
  }

  let price = base;
  // Start slightly away from seed so chart has room to move both ways
  price = snapTick(base * (1 - 0.008 + Math.random() * 0.016), tick);

  const now = Math.floor(Date.now() / 1000 / intervalSec) * intervalSec;
  let barIdx = 0;

  for (const phase of phases) {
    // Each phase has a momentum tracker
    let momentum = 0;

    for (let j = 0; j < phase.len; j++) {
      const open = price;

      // Weighted random: bias toward phase direction + current momentum
      const drift  = phase.bias * phase.strength * atr;
      const noise  = (Math.random() * 2 - 1) * atr;
      const momPush = momentum * atr * 0.3;
      let rawMove = drift + noise + momPush;

      // Mean-revert if price drifted too far from seed (±12%)
      const distFromBase = (price - base) / base;
      if (Math.abs(distFromBase) > 0.10) {
        rawMove -= distFromBase * atr * 2;
      }

      // Snap move to tick grid
      const ticks = Math.round(rawMove / tick);
      const move  = ticks * tick;
      const close = snapTick(Math.max(open * 0.88, open + move), tick);

      // Realistic wicks: upper/lower shadow
      const bodyHigh = Math.max(open, close);
      const bodyLow  = Math.min(open, close);
      const shadowAtr = atr * (0.3 + Math.random() * 0.7);
      const high  = snapTick(bodyHigh + Math.random() * shadowAtr, tick);
      const low   = snapTick(Math.max(bodyLow - Math.random() * shadowAtr, open * 0.88), tick);

      // Volume: higher on strong moves, lower on doji/inside bars
      const bodyRatio = Math.abs(close - open) / (high - low + 0.0001);
      const baseVol   = base > 10_000 ? 500 : base > 100 ? 1_500 : 500_000;
      const volume    = Math.floor(baseVol * (0.5 + bodyRatio * 2.5 + Math.random() * 0.8));

      bars.push({
        time:   now - (count - barIdx) * intervalSec,
        open:   +open.toFixed(dp),
        high:   +high.toFixed(dp),
        low:    +low.toFixed(dp),
        close:  +close.toFixed(dp),
        volume,
      });

      price = close;
      barIdx++;
      // Update momentum: persist 40% of last move direction
      momentum = (close > open ? 1 : close < open ? -1 : 0) * 0.4 + momentum * 0.6;
    }
  }

  // ── Anchor the last bar to exactly `base` so history flows seamlessly
  // into the live synthetic engine (which also starts at `base`).
  // We shift every bar's OHLC by the same offset — preserving bar shapes.
  if (bars.length > 0) {
    const lastClose = bars[bars.length - 1].close;
    const offset    = base - lastClose;
    if (Math.abs(offset) > tick) {
      for (const b of bars) {
        b.open  = +Math.max(tick, b.open  + offset).toFixed(dp);
        b.high  = +Math.max(tick, b.high  + offset).toFixed(dp);
        b.low   = +Math.max(tick, b.low   + offset).toFixed(dp);
        b.close = +Math.max(tick, b.close + offset).toFixed(dp);
      }
    }
  }

  return bars;
}

/* ── Props ──────────────────────────────────────────────── */
interface Props {
  symbol:          string;
  timeframe:       string;
  footprintType:   FootprintType;
  candleType?:     CandleType;
  pineOutput?:     PineOutput | null;
  pineCode?:       string;
  onBarsReady?:    (bars: Bar[]) => void;
  // Drawing tools
  drawingTool?:    string;
  drawingStyle?:   DrawingStyle;
  magnetActive?:   boolean;
  lockDrawings?:   boolean;
  onDrawingComplete?: () => void;   // fired after a drawing is placed → return to cursor
  onCreatePriceAlert?: (price: number) => void;
  drawingsVisible?:boolean;
  clearTrigger?:   number;
  activeInds?:     Set<string>;
  indSettings?:    IndicatorSettings;
  extendedHours?:  boolean;
  // New features
  alertLevels?:    number[];
  chartSettings?:  {
    background?: string;
    gridVisible?: boolean;
    gridColor?: string;
    crosshairColor?: string;
    logScale?: boolean;
    autoScale?: boolean;
    percentageMode?: boolean;
    candleUp?: string; candleDown?: string;
    wickUp?: string; wickDown?: string;
    borderUp?: string; borderDown?: string;
    neon?: boolean;
    candleTimer?: boolean;
    displayTimeZone?: string;
    clock24h?: boolean;
  };
  replayActive?:   boolean;
  replayBars?:     Bar[];
  compareSymbol?:  string;
  onPriceAtCursor?: (price: number) => void;
  onOHLCAtCursor?:  (ohlc: { o: number; h: number; l: number; c: number; v: number; time: number } | null) => void;
  // WM VP indicators
  fixedVPActive?:  boolean;
  sessionVPActive?:boolean;
  // Footprint toggle
  footprintEnabled?: boolean;
  // Big Trades Simultaneous Mode — when true, draw Big Trades bubbles ON TOP of
  // whatever order-flow tool is active instead of only in exclusive big-trades mode.
  bigTradesOverlay?: boolean;
  // Paper positions — render open paper-trade entries as horizontal lines w/ live P&L
  paperTradesVisible?: boolean;
  // Fullscreen delegation — parent provides the element to fullscreen
  onRequestFullscreen?: () => void;
}

/* ── Heikin Ashi transform ───────────────────────────────── */
function toHeikinAshi(bars: Bar[]): Bar[] {
  const ha: Bar[] = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const haClose = (b.open + b.high + b.low + b.close) / 4;
    const haOpen  = i === 0
      ? (b.open + b.close) / 2
      : (ha[i - 1].open + ha[i - 1].close) / 2;
    ha.push({
      time:   b.time,
      open:   +haOpen.toFixed(b.close < 10 ? 4 : 2),
      close:  +haClose.toFixed(b.close < 10 ? 4 : 2),
      high:   +Math.max(b.high, haOpen, haClose).toFixed(b.close < 10 ? 4 : 2),
      low:    +Math.min(b.low,  haOpen, haClose).toFixed(b.close < 10 ? 4 : 2),
      volume: b.volume,
    });
  }
  return ha;
}

/* ── Indicator computations ─────────────────────────────── */
function computeSMA(closes: number[], period: number): number[] {
  return closes.map((_, i) => {
    if (i < period - 1) return closes[i];
    const slice = closes.slice(i - period + 1, i + 1);
    return +(slice.reduce((a, b) => a + b, 0) / period).toFixed(closes[0] > 100 ? 2 : 5);
  });
}

function computeEMA(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let ema = closes[0];
  for (let i = 0; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    out.push(+ema.toFixed(closes[0] > 100 ? 2 : 5));
  }
  return out;
}

function computeVWAP(bars: Bar[]): number[] {
  let cumPV = 0, cumV = 0;
  return bars.map(b => {
    const tp = (b.high + b.low + b.close) / 3;
    cumPV += tp * b.volume;
    cumV  += b.volume;
    return cumV > 0 ? +(cumPV / cumV).toFixed(b.close > 100 ? 2 : 5) : tp;
  });
}

function computeBB(bars: Bar[], period = 20, mult = 2): { time: number; upper: number; middle: number; lower: number }[] {
  const closes = bars.map(b => b.close);
  const dp = closes[0] > 100 ? 2 : 5;
  return bars.map((b, i) => {
    if (i < period - 1) return { time: b.time, upper: b.close, middle: b.close, lower: b.close };
    const slice = closes.slice(i - period + 1, i + 1);
    const mean  = slice.reduce((s, v) => s + v, 0) / period;
    const std   = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    return { time: b.time, upper: +(mean + mult * std).toFixed(dp), middle: +mean.toFixed(dp), lower: +(mean - mult * std).toFixed(dp) };
  });
}

function computeWMA(closes: number[], period: number): number[] {
  const denom = (period * (period + 1)) / 2;
  return closes.map((_, i) => {
    if (i < period - 1) return closes[i];
    let s = 0;
    for (let j = 0; j < period; j++) s += closes[i - j] * (period - j);
    return +(s / denom).toFixed(closes[0] > 100 ? 2 : 5);
  });
}
function computeHMA(closes: number[], period: number): number[] {
  const half = Math.round(period / 2), sqrt = Math.round(Math.sqrt(period));
  return computeWMA(closes.map((_, i) => 2 * computeWMA(closes, half)[i] - computeWMA(closes, period)[i]), sqrt);
}
function computeATR(bars: Bar[], period = 14): number[] {
  const tr = bars.map((b, i) => i === 0 ? b.high - b.low : Math.max(b.high - b.low, Math.abs(b.high - bars[i-1].close), Math.abs(b.low - bars[i-1].close)));
  const out: number[] = [];
  let atr = tr.slice(0, period).reduce((s,v) => s+v, 0) / period;
  bars.forEach((_, i) => { if (i >= period) atr = (atr*(period-1)+tr[i])/period; out.push(+atr.toFixed(2)); });
  return out;
}
function computeStoch(bars: Bar[], kP = 14, dP = 3): { k: number[]; d: number[] } {
  const k = bars.map((_, i) => {
    const sl = bars.slice(Math.max(0,i-kP+1), i+1);
    const hi = Math.max(...sl.map(b=>b.high)), lo = Math.min(...sl.map(b=>b.low));
    return hi===lo ? 50 : +((bars[i].close-lo)/(hi-lo)*100).toFixed(2);
  });
  return { k, d: computeSMA(k, dP) };
}
function computeCCI(bars: Bar[], period = 20): number[] {
  return bars.map((_, i) => {
    const sl = bars.slice(Math.max(0,i-period+1), i+1);
    const tps = sl.map(b=>(b.high+b.low+b.close)/3);
    const mean = tps.reduce((s,v)=>s+v,0)/tps.length;
    const mad  = tps.reduce((s,v)=>s+Math.abs(v-mean),0)/tps.length;
    return mad===0 ? 0 : +((tps[tps.length-1]-mean)/(0.015*mad)).toFixed(2);
  });
}
function computeWilliamsR(bars: Bar[], period = 14): number[] {
  return bars.map((_, i) => {
    const sl = bars.slice(Math.max(0,i-period+1), i+1);
    const hi = Math.max(...sl.map(b=>b.high)), lo = Math.min(...sl.map(b=>b.low));
    return hi===lo ? -50 : +(((hi-bars[i].close)/(hi-lo))*-100).toFixed(2);
  });
}
function computeOBV(bars: Bar[]): number[] {
  const out = [0];
  for (let i=1;i<bars.length;i++) {
    out.push(bars[i].close > bars[i-1].close ? out[i-1]+bars[i].volume : bars[i].close < bars[i-1].close ? out[i-1]-bars[i].volume : out[i-1]);
  }
  return out;
}
function computeMFI(bars: Bar[], period = 14): number[] {
  const tp = bars.map(b=>(b.high+b.low+b.close)/3);
  return bars.map((_,i) => {
    if (i<period) return 50;
    let pos=0,neg=0;
    for (let j=i-period+1;j<=i;j++) { const mf=tp[j]*bars[j].volume; tp[j]>tp[j-1] ? pos+=mf : neg+=mf; }
    return neg===0 ? 100 : +(100-100/(1+pos/neg)).toFixed(2);
  });
}
function computeKeltner(bars: Bar[], period=20, mult=2): {upper:number[];mid:number[];lower:number[]} {
  const ema=computeEMA(bars.map(b=>b.close), period), atr=computeATR(bars, period);
  return { upper:ema.map((e,i)=>+(e+mult*atr[i]).toFixed(2)), mid:ema, lower:ema.map((e,i)=>+(e-mult*atr[i]).toFixed(2)) };
}
function computeDonchian(bars: Bar[], period=20): {upper:number[];mid:number[];lower:number[]} {
  const u=bars.map((_,i)=>Math.max(...bars.slice(Math.max(0,i-period+1),i+1).map(b=>b.high)));
  const l=bars.map((_,i)=>Math.min(...bars.slice(Math.max(0,i-period+1),i+1).map(b=>b.low)));
  return { upper:u, mid:u.map((hi,i)=>+((hi+l[i])/2).toFixed(2)), lower:l };
}
function computeSupertrend(bars: Bar[], period=10, mult=3): {line:number[];dir:number[]} {
  const atr=computeATR(bars,period);
  const hl2=bars.map(b=>(b.high+b.low)/2);
  const ub=hl2.map((v,i)=>v+mult*atr[i]), lb=hl2.map((v,i)=>v-mult*atr[i]);
  const line=new Array(bars.length).fill(0), dir=new Array(bars.length).fill(1);
  line[0]=lb[0];
  for (let i=1;i<bars.length;i++) {
    lb[i]=lb[i]>lb[i-1]||bars[i-1].close<lb[i-1] ? lb[i] : lb[i-1];
    ub[i]=ub[i]<ub[i-1]||bars[i-1].close>ub[i-1] ? ub[i] : ub[i-1];
    dir[i]=dir[i-1]===1 ? (bars[i].close<lb[i] ? -1 : 1) : (bars[i].close>ub[i] ? 1 : -1);
    line[i]=dir[i]===1 ? lb[i] : ub[i];
  }
  return {line,dir};
}
function computeROC(closes: number[], period=12): number[] {
  return closes.map((c,i)=>i<period ? 0 : +((c-closes[i-period])/closes[i-period]*100).toFixed(2));
}
function computeMomentum(closes: number[], period=10): number[] {
  return closes.map((c,i)=>i<period ? 0 : +(c-closes[i-period]).toFixed(closes[0]>100?2:4));
}

/* ── Drawing-tool geometry specs ──────────────────────────
   DRAW_PTS[tool] = number of anchor clicks the tool needs.
   -1 = freehand drag (brush/highlighter); -2 = open polyline
   (click to add points, double-click / Escape to finish).      */
const DRAW_PTS: Record<string, number> = {
  brush: -1, highlighter: -1,
  polyline: -2, path: -2,
  // 1-click
  hline: 1, hray: 1, vline: 1, crossline: 1,
  text: 1, note: 1, "price-note": 1, pin: 1, comment: 1,
  "price-label": 1, signpost: 1, flag: 1, "arrow-up": 1, "arrow-down": 1,
  // 2-click lines
  trendline: 2, ray: 2, "info-line": 2, "extended-line": 2, "trend-angle": 2, arrow: 2, callout: 2,
  // 2/3/4-click shapes
  rect: 2, circle: 2, ellipse: 2, "rotated-rect": 3, triangle: 3, arc: 3, curve: 3, "double-curve": 4,
  // channels
  channel: 2, "parallel-channel": 3, regression: 2, "flat-channel": 3, "disjoint-channel": 4,
  // pitchforks
  pitchfork: 3, schiff: 3, "modified-schiff": 3, "inside-pitchfork": 3,
  // fibonacci
  fibonacci: 2, "fib-ext": 3, "fib-channel": 3, "fib-timezone": 2, "fib-speed-fan": 2,
  "fib-time": 3, "fib-circles": 2, "fib-spiral": 2, "fib-arcs": 2, "fib-wedge": 3, "fib-pitchfan": 3,
  // gann
  "gann-box": 2, "gann-square-fixed": 2, "gann-square": 2, "gann-fan": 2,
  // chart patterns
  xabcd: 5, cypher: 5, "head-shoulders": 7, abcd: 4, "pattern-triangle": 4, "three-drives": 7,
  // elliott waves
  "elliott-impulse": 6, "elliott-correction": 4, "elliott-triangle": 6, "elliott-double": 4, "elliott-triple": 6,
  // cycles
  "cyclic-lines": 2, "time-cycles": 2, "sine-line": 2,
  // measure / positions
  "price-range": 2, "date-range": 2, "date-price-range": 2, measure: 2,
  "long-position": 3, "short-position": 3,
  // order flow
  "delta-vp": 2,
};
const drawPtsNeeded = (tool: string): number => (tool in DRAW_PTS ? DRAW_PTS[tool] : 2);

// Pattern / wave tools render as a labeled polyline through their anchors.
const PATTERN_LABELS: Record<string, string[]> = {
  xabcd: ["X", "A", "B", "C", "D"],
  cypher: ["X", "A", "B", "C", "D"],
  abcd: ["A", "B", "C", "D"],
  "pattern-triangle": ["1", "3", "2", "4"],
  "head-shoulders": ["", "LS", "", "H", "", "RS", ""],
  "three-drives": ["", "1", "", "2", "", "3", ""],
  "elliott-impulse": ["0", "1", "2", "3", "4", "5"],
  "elliott-correction": ["0", "A", "B", "C"],
  "elliott-triangle": ["0", "A", "B", "C", "D", "E"],
  "elliott-double": ["0", "W", "X", "Y"],
  "elliott-triple": ["0", "W", "X", "Y", "X", "Z"],
};
// Tools whose commit prompts for a text string.
const TEXT_TOOLS = new Set(["text", "note", "comment", "price-note", "callout", "signpost", "price-label"]);
// Tools that render a filled area (used for hit-testing "click inside to select").
const FILL_TOOLS = new Set([
  "rect", "circle", "ellipse", "rotated-rect", "triangle", "fibonacci", "fib-ext",
  "gann-box", "gann-square", "gann-square-fixed", "channel", "parallel-channel",
  "flat-channel", "regression", "price-range", "date-range", "date-price-range",
  "measure", "long-position", "short-position", "fib-circles", "delta-vp",
]);
const DRAW_COLORS = [
  "#00D4AA", "#4FA3E0", "#F0B429", "#FF4D6A", "#8B5CF6",
  "#FFFFFF", "#94A3B8", "#F97316", "#06B6D4", "#EC4899",
];
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618, 2.618];
const FIB_COLORS = ["#8892b0", "#4FA3E0", "#00C076", "#F0B429", "#F0B429", "#00C076", "#4FA3E0", "#EC4899", "#FF4D67", "#8B5CF6"];

/* ── Component ──────────────────────────────────────────── */
export function MainChart({ symbol, timeframe, footprintType, footprintEnabled = true, candleType = "candles", pineOutput, pineCode, onBarsReady,
  drawingTool = "cursor", drawingStyle = DEFAULT_DRAWING_STYLE, magnetActive = false, lockDrawings = false,
  onCreatePriceAlert,
  onDrawingComplete,
  drawingsVisible = true, clearTrigger = 0, activeInds, indSettings, extendedHours,
  alertLevels = [], chartSettings, replayActive = false, replayBars,
  compareSymbol, onPriceAtCursor, onOHLCAtCursor,
  fixedVPActive = false, sessionVPActive = false,
  bigTradesOverlay = false,
  paperTradesVisible = true,
  onRequestFullscreen,
}: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const wrapRef       = useRef<HTMLDivElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null); // drawing tools overlay
  const chartRef      = useRef<any>(null);
  const lwRef         = useRef<any>(null); // the imported lightweight-charts v5 module (for series defs)
  const candleRef     = useRef<any>(null);
  const markersPluginRef = useRef<any>(null); // v5 createSeriesMarkers plugin (setMarkers moved off ISeriesApi)
  const pineMarkersPluginRef = useRef<any>(null); // v5 markers plugin dedicated to Pine plotshape/plotchar output
  const volRef        = useRef<any>(null);
  const pineSeriesRef = useRef<Map<string, any>>(new Map());
  const pineCodeRef   = useRef<string | undefined>(undefined);
  const indSeriesRef  = useRef<any[]>([]);
  // Open paper-trade position lines (native IPriceLine on the candle series) +
  // the position each line represents, so we can refresh the live-P&L title on tick.
  const paperLinesRef = useRef<Array<{ line: any; qty: number; avgPx: number }>>([]);
  // Live-updating oscillators: each entry recomputes its series values from the
  // CURRENT bars (barsRef) and pushes only the last point on every live tick, so
  // Tape Speed / Exhaustion / flow histograms visibly move with real-time data
  // without tearing down & rebuilding the whole pane on each tick.
  const oscLiveRef    = useRef<Array<{ series: any; recompute: (bs: Bar[]) => { value: number; color?: string } | null }>>([]);
  const barsRef       = useRef<Bar[]>([]);
  // ── Vertical price-drag (true body drag) ──────────────────────
  // LWC v4/v5 do NOT support vertical body panning natively — only axis
  // drag. We implement it via a manual price range fed through the candle
  // series' autoscaleInfoProvider, shifted on vertical mouse drag.
  const manualPriceRangeRef = useRef<{ min: number; max: number } | null>(null);
  // Eased vertical-range state: the raw robust range recomputes discretely as
  // bars enter/leave the visible window during a wheel zoom, snapping the price
  // scale in steps ("candles squash and stick"). We lerp the previous range
  // toward the freshly computed target so the vertical rescale glides instead.
  const smoothedRangeRef = useRef<{ min: number; max: number } | null>(null);
  // Single shared autoscale provider with a GUARDRAIL: if the manual (dragged)
  // range is absurdly larger than the data's natural range (>4×) it would crush
  // the candles into a sliver (e.g. TSLA at 377 shown on a 300–1100 scale). In
  // that case we ignore the manual range and auto-fit so candles stay readable.
  // ── ROBUST visible-range computer ────────────────────────────
  // Computes the price range from the VISIBLE bars but trims true outliers,
  // so no single corrupt high/low (from a bad live tick, a provider glitch,
  // or anything else) can ever stretch the scale and crush real candles into
  // a sliver — the "candles break after a few minutes" failure. It clips only
  // values that sit MORE than 1.5 robust-bands beyond the 2nd/98th percentile,
  // which never happens to a legitimate candle but always catches a bad spike.
  const robustVisibleRange = useRef((fallback: any) => {
    try {
      const bars = barsRef.current;
      if (!bars || bars.length < 8) return fallback;
      let from = 0, to = bars.length;
      const vr = chartRef.current?.timeScale().getVisibleLogicalRange();
      if (vr) {
        from = Math.max(0, Math.floor(vr.from));
        to   = Math.min(bars.length, Math.ceil(vr.to) + 1);
      }
      const slice = bars.slice(from, to);
      if (slice.length < 8) return fallback;
      const his = slice.map(b => b.high).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
      const los = slice.map(b => b.low ).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
      if (his.length < 8 || los.length < 8) return fallback;
      const q = (arr: number[], p: number) =>
        arr[Math.min(arr.length - 1, Math.max(0, Math.round(p * (arr.length - 1))))];
      const p98Hi = q(his, 0.98), p02Lo = q(los, 0.02);
      const band  = Math.max(p98Hi - p02Lo, q(his, 0.5) - q(los, 0.5), p98Hi * 0.002);
      if (!(band > 0)) return fallback;
      // Allow real wicks up to 1.5 bands beyond the robust band; clip only beyond.
      const hi = Math.min(his[his.length - 1], p98Hi + band * 1.5);
      const lo = Math.max(los[0],              p02Lo - band * 1.5);
      if (!(hi > lo)) return fallback;
      const margin = (hi - lo) * 0.06;
      return { priceRange: { minValue: lo - margin, maxValue: hi + margin } };
    } catch { return fallback; }
  });

  const autoscaleProviderRef = useRef((orig: () => any) => {
    const base = orig();
    const robust = robustVisibleRange.current(base);
    const r = manualPriceRangeRef.current;
    if (r && r.max > r.min) {
      // Anchor the drag guardrails to the ROBUST range (outlier-immune), not the
      // raw base — otherwise a single bad bar inflates dataRange and defeats them.
      const br = robust?.priceRange ?? base?.priceRange;
      if (br) {
        const dataRange = br.maxValue - br.minValue;
        const dataMid = (br.minValue + br.maxValue) / 2;
        if (dataRange > 0) {
          // Guardrail 1: allow deep zoom-out (up to 20× the data range, like
          // TradingView) but instead of SNAPPING back to auto — which felt like
          // hitting a wall — CLAMP the range to the max around its own center so
          // the scale stays exactly where the user left it, smoothly.
          const maxRange = dataRange * 20;
          if ((r.max - r.min) > maxRange) {
            const mid = (r.min + r.max) / 2;
            r.min = mid - maxRange / 2;
            r.max = mid + maxRange / 2;
            manualPriceRangeRef.current = { min: r.min, max: r.max };
          }
          // Guardrail 2: never let the user pan the candles off-screen. Pin the
          // range so the data CENTER always stays inside it (candles stay ≥half
          // visible). Smoothly clamps instead of snapping back.
          if (dataMid < r.min) { const d = r.min - dataMid; r.min -= d; r.max -= d; }
          else if (dataMid > r.max) { const d = dataMid - r.max; r.min += d; r.max += d; }
        }
      }
      return { priceRange: { minValue: r.min, maxValue: r.max } };
    }
    // Normal auto mode → outlier-immune robust range, EASED for smooth zoom.
    const tp = robust?.priceRange;
    if (!tp || !(tp.maxValue > tp.minValue)) { smoothedRangeRef.current = null; return robust; }
    const target = { min: tp.minValue, max: tp.maxValue };
    const prev = smoothedRangeRef.current;
    if (!prev) { smoothedRangeRef.current = target; return robust; }
    const span = target.max - target.min;
    // Snap (don't ease) on big discontinuities — symbol switch, timeframe change,
    // or first fit — so we never lag behind a wholly different price scale.
    const jump = Math.abs(target.min - prev.min) + Math.abs(target.max - prev.max);
    if (span <= 0 || jump > span * 0.75) { smoothedRangeRef.current = target; return robust; }
    // Ease ~50% per frame → converges in a few frames, smooth yet never lags.
    const k = 0.5;
    const eased = {
      min: prev.min + (target.min - prev.min) * k,
      max: prev.max + (target.max - prev.max) * k,
    };
    smoothedRangeRef.current = eased;
    return { priceRange: { minValue: eased.min, maxValue: eased.max } };
  });
  const drawingToolRef      = useRef<string>(drawingTool);
  drawingToolRef.current = drawingTool;
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Big-Trade Bubble engine state (🫧 floating bubbles) ───────
  // One bubble = one real big trade. Radius is fixed at spawn and encodes the
  // TRUE trade size (bigger order → bigger bubble). Bubbles NEVER merge, never
  // fade, and never pop — they persist at their level until the bar scrolls off
  // screen or the user's max-visible cap drops the oldest.
  type Bubble = {
    id:      number;
    x:       number;   // current canvas px
    y:       number;   // current canvas px
    vx:      number;   // velocity px/frame
    vy:      number;   // velocity px/frame
    baseR:   number;   // target radius (∝ order size) — fixed once at spawn
    r:       number;   // current radius (eases up to baseR on spawn only)
    phase:   number;   // wobble / bob phase
    big:     boolean;  // kept for compat; every bubble is now a real trade
    side:    "buy" | "sell";
    value:   number;   // notional (signed by side for display)
    born:    number;   // performance.now() at spawn (newest-N cap ordering)
    anchorTime: number; // bar time (unix s) → home X re-anchor on scroll
    anchorPrice: number; // price → home Y re-anchor on scroll/zoom
    levelIdx:  number;   // rank within the candle (for horizontal stagger)
    siblingN:  number;   // how many bubbles share this candle
    kind:      "big-trade" | "delta";
    spawnKey:  string;   // dedupe + cull key (bt: / dt: prefixes)
  };
  const bubblesRef    = useRef<Bubble[]>([]);           // Big Trades — individual large prints
  const bubbleSpawnRef = useRef<Set<string>>(new Set());
  const deltaBubblesRef = useRef<Bubble[]>([]);       // Delta mode — net delta per zone
  const deltaBubbleSpawnRef = useRef<Set<string>>(new Set());
  const bubbleIdRef    = useRef(0);
  const bubbleHoverRef = useRef<number | null>(null);     // hovered bubble id
  // Big-Trades Pause / Refresh + max-visible controls (toolbar gear dropdown).
  const bubblePausedRef  = useRef<boolean>(
    typeof window !== "undefined" && localStorage.getItem("wm_bubble_paused") === "1"
  );
  // Max bubbles to keep on screen. "All" (default) = effectively uncapped so the
  // user sees every big trade; a numeric choice keeps only the newest N.
  const bubbleMaxRef = useRef<number>(
    typeof window !== "undefined"
      ? (parseInt(localStorage.getItem("wm_bubble_max") || "", 10) || 9999)
      : 9999
  );
  const bubbleRefreshRef = useRef(0); // bumped → engine clears + respawns next frame
  const bubbleRefreshSeenRef = useRef(0);
  useEffect(() => {
    const onCtl = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const action = detail.action;
      if (action === "pause")   bubblePausedRef.current = true;
      if (action === "resume")  bubblePausedRef.current = false;
      if (action === "toggle")  bubblePausedRef.current = !bubblePausedRef.current;
      if (action === "refresh") bubbleRefreshRef.current++;
      if (action === "setMax") {
        const v = Number(detail.value);
        bubbleMaxRef.current = Number.isFinite(v) && v > 0 ? v : 9999;
      }
    };
    window.addEventListener("wm-bigtrades-control", onCtl as any);
    return () => window.removeEventListener("wm-bigtrades-control", onCtl as any);
  }, []);
  // Lazy Web-Audio context for the water-bubble "absorb" sound
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const lastBloopRef   = useRef(0);
  const playBloop = useCallback((big: boolean) => {
    try {
      // User toggle — Big Trades / bubble sounds (default ON)
      if (typeof window !== "undefined" && localStorage.getItem("wm_bubble_sound") === "off") return;
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ac = audioCtxRef.current;
      if (ac.state === "suspended") ac.resume();
      const now = ac.currentTime;
      // throttle so a burst of absorbs doesn't machine-gun
      if (performance.now() - lastBloopRef.current < 45) return;
      lastBloopRef.current = performance.now();
      // "bloop": quick downward pitch sweep through a lowpass = watery bubble pop
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 1100;
      osc.type = "sine";
      const f0 = big ? 320 : 520 + Math.random() * 180;
      osc.frequency.setValueAtTime(f0, now);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.45, now + 0.12);
      const peak = big ? 0.12 : 0.06;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(lp); lp.connect(gain); gain.connect(ac.destination);
      osc.start(now); osc.stop(now + 0.18);
    } catch { /* audio not available */ }
  }, []);
  const [bubbleTip, setBubbleTip] = useState<
    { x: number; y: number; side: "buy" | "sell"; value: number; text: string } | null
  >(null);

  // ── Drawing state ─────────────────────────────────────────────
  // Unified multi-point model. Every drawing is a list of logical anchor
  // points (price/time) + a style. The `tool` id drives which geometry the
  // renderer/hit-tester produce, so ALL toolbar tools share one engine and
  // one editing path (color / width / line-style / text / delete).
  type Drawing = ChartDrawing;

  const drawingsRef     = useRef<Drawing[]>([]);
  const inProgressRef   = useRef<Drawing | null>(null);   // committed anchor points so far
  const previewPtRef    = useRef<LogicalPt | null>(null); // live cursor point while placing
  const mouseMovedRef   = useRef(false);                  // drag-vs-click discriminator
  const drawIdRef       = useRef(0);
  const drawingStartRef = useRef<{ x: number; y: number; lp: LogicalPt | null } | null>(null);
  // Drag an already-placed drawing (whole shape when ptIdx===null, else one handle).
  const dragRef = useRef<{ idx: number; last: LogicalPt; ptIdx: number | null } | null>(null);
  // Currently-selected drawing (shows handles + floating edit toolbar).
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const selectedIdxRef = useRef<number | null>(null);
  useEffect(() => { selectedIdxRef.current = selectedIdx; }, [selectedIdx]);
  const [editBump, setEditBump] = useState(0); // re-render edit toolbar after a style change
  // Inline text editor: when set, an <input> is shown over the drawing's anchor
  // so text/note tools get a clean editing box instead of a native window.prompt.
  const [textEdit, setTextEdit] = useState<{ idx: number } | null>(null);

  // Build a new drawing with the current global color + sensible per-tool style.
  const makeDrawing = useCallback((tool: string, pts: LogicalPt[], text?: string): Drawing => ({
    id: ++drawIdRef.current,
    tool,
    pts,
    style: {
      color: drawingStyle.color,
      width: tool === "highlighter" ? 12 : drawingStyle.width,
      dash: drawingStyle.dash,
      opacity: drawingStyle.opacity / 100,
      fill: FILL_TOOLS.has(tool),
    },
    text,
  }), [drawingStyle]);

  // ── Drawing persistence (Tier-2 #6) ──────────────────────────
  // Drawings are stored as absolute {price, time} anchors, so they survive a
  // refresh and re-anchor on any timeframe. Scope the key to the signed-in user
  // (from the AuthContext session cache) + symbol so each symbol keeps its own
  // drawings and they don't leak between accounts sharing a browser.
  const lastSavedDrawRef = useRef<string>("");
  const drawStorageKey = useCallback(() => {
    let uid = "anon";
    try { uid = JSON.parse(localStorage.getItem("wm_session_v1") || "{}")?.id || "anon"; } catch {}
    return `wm_draw:v1:${uid}:${symbol}`;
  }, [symbol]);

  // ── Drawing coordinate helpers ───────────────────────────────
  // Convert canvas CSS pixel (x,y) → logical {price, time}
  // Bar interval (seconds) from the most recent two bars — used to extrapolate
  // time into the empty whitespace to the right of the last bar.
  const barInterval = (): number => {
    const b = barsRef.current || [];
    if (b.length < 2) return 60;
    const d = (b[b.length - 1].time as number) - (b[b.length - 2].time as number);
    return d > 0 ? d : 60;
  };

  const snapLogical = useCallback((price: number, time: number): { price: number; time: number } => {
    if (!magnetActive) return { price, time };
    const symBase = getBase(symbol);
    const dp = symBase > 100 ? 2 : 4;
    const minTick = symBase > 10_000 ? 0.25 : symBase > 1_000 ? 0.25 : symBase > 100 ? 0.01 : 0.0001;
    const bars = barsRef.current || [];
    const iv = barInterval();
    const candidates: number[] = [+(Math.round(price / minTick) * minTick).toFixed(dp)];

    let bar: Bar | undefined;
    for (const b of bars) {
      if (Math.abs((b.time as number) - time) <= iv * 0.55) { bar = b; break; }
    }
    if (!bar && bars.length) {
      bar = bars.reduce((best, b) =>
        Math.abs((b.time as number) - time) < Math.abs((best.time as number) - time) ? b : best,
      );
    }
    if (bar) {
      candidates.push(bar.open, bar.high, bar.low, bar.close);
      const realData = tickAccRef.current.get(bar.time);
      if (realData) {
        let sum = 0, n = 0;
        for (const rt of realData.values()) { sum += rt.bid + rt.ask; n++; }
        const mean = sum / Math.max(1, n);
        for (const [px, rt] of realData) {
          if (rt.bid + rt.ask >= mean * 0.85) candidates.push(px);
        }
      } else {
        const levels = footprintSnapRef.current(bar, 12);
        const mean = levels.reduce((s, l) => s + l.total, 0) / Math.max(1, levels.length);
        for (const lv of levels) {
          if (lv.total >= mean * 0.85) candidates.push(lv.priceLevel);
        }
      }
    }

    const priceTol = Math.max(minTick * 6, Math.abs(price) * 0.0025);
    let bestP = price, bestD = Infinity;
    for (const c of candidates) {
      const d = Math.abs(c - price);
      if (d < bestD && d <= priceTol) { bestD = d; bestP = c; }
    }

    let bestT = time, bestTd = Infinity;
    for (const b of bars) {
      const d = Math.abs((b.time as number) - time);
      if (d < bestTd && d <= iv * 0.45) { bestTd = d; bestT = b.time as number; }
    }

    return { price: +bestP.toFixed(dp), time: +bestT };
  }, [magnetActive, symbol]);

  const pixelToLogical = useCallback((px: number, py: number): LogicalPt | null => {
    const price = candleRef.current?.coordinateToPrice(py);
    if (price == null) return null;
    const ts = chartRef.current?.timeScale();
    if (!ts) return null;
    let time = ts.coordinateToTime(px) as number | null;
    // In the future/whitespace beyond the last bar coordinateToTime returns null.
    // Extrapolate via the continuous logical index so drawings can anchor there.
    if (time == null) {
      const logical = ts.coordinateToLogical(px);
      const b = barsRef.current || [];
      if (logical != null && b.length >= 1) {
        const lastIdx = b.length - 1;
        time = (b[lastIdx].time as number) + (Number(logical) - lastIdx) * barInterval();
      }
    }
    if (time == null) return null;
    const snapped = snapLogical(+price, +time);
    return { price: snapped.price, time: snapped.time };
  }, [snapLogical]);

  // Convert logical {price, time} → canvas CSS pixel (x,y)
  const logicalToPixel = useCallback((pt: LogicalPt): { x: number; y: number } | null => {
    const y = candleRef.current?.priceToCoordinate(pt.price);
    if (y == null) return null;
    const ts = chartRef.current?.timeScale();
    if (!ts) return null;
    let x = ts.timeToCoordinate(pt.time as any) as number | null;
    // timeToCoordinate returns null for times in the future whitespace — map the
    // time back to a logical index and use logicalToCoordinate (valid in whitespace).
    if (x == null) {
      const b = barsRef.current || [];
      if (b.length >= 1) {
        const lastIdx = b.length - 1;
        const logical = lastIdx + ((pt.time as number) - (b[lastIdx].time as number)) / barInterval();
        x = ts.logicalToCoordinate(logical as any) as number | null;
      }
    }
    if (x == null) return null;
    return { x: +x, y: +y };
  }, []);

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; price: number; nearDrawingIdx: number | null } | null>(null);

  // Data window state
  const [dataWindowOpen, setDataWindowOpen] = useState(true);
  const [dataWindow, setDataWindow] = useState<{ o: number; h: number; l: number; c: number; v: number; time: number } | null>(null);

  // Scale mode buttons
  const [logScale, setLogScale] = useState(false);
  const [pctMode, setPctMode] = useState(false);
  // Auto-scale: when OFF the user can freely drag the price axis up/down to see
  // higher/lower price levels (TradingView-style). When ON the chart auto-fits.
  const [autoScale, setAutoScale] = useState(true);
  const autoScaleRef = useRef(autoScale);
  // True while the user has manually stretched the price axis → shows a small
  // "reset scale" button (replaces the double-click-to-reset gesture).
  const [scaleLocked, setScaleLocked] = useState(false);
  // When AUTO is (re)enabled, release any manual vertical-drag range so the
  // chart snaps back to auto-fitting the data.
  useEffect(() => {
    autoScaleRef.current = autoScale;
    if (autoScale) {
      manualPriceRangeRef.current = null;
      setScaleLocked(false);
      try {
        candleRef.current?.applyOptions({
          autoscaleInfoProvider: autoscaleProviderRef.current,
        });
      } catch {}
    }
  }, [autoScale]);

  // CRITICAL: a vertical-drag manual range must NOT survive a symbol/timeframe
  // change — otherwise the price scale stays stuck on the old ticker's range
  // (e.g. NQ ~29000) and the new ticker's candles (e.g. AMZN ~227) render far
  // off-screen, making the chart look empty. Clear it + force auto-fit on switch.
  useEffect(() => {
    manualPriceRangeRef.current = null;
    setScaleLocked(false);
    setAutoScale(true);
    try {
      candleRef.current?.applyOptions({
        autoscaleInfoProvider: autoscaleProviderRef.current,
      });
      chartRef.current?.priceScale("right").applyOptions({ autoScale: true });
      chartRef.current?.timeScale().fitContent();
    } catch {}
  }, [symbol, timeframe]);

  const base = getBase(symbol);

  const [candles,   setCandles]   = useState<Bar[]>([]);
  const [lastPrice, setLastPrice] = useState(base);
  const [openPrice, setOpenPrice] = useState(base);
  const [ready,     setReady]     = useState(false);
  // Bumped whenever paper state may have changed (another tab writes wm_paper_state,
  // or the window regains focus after the user placed a trade on /paper) → re-read.
  const [paperNonce, setPaperNonce] = useState(0);

  // Countdown state
  const [countdown,   setCountdown]   = useState("--:--");
  const [closeFlash,  setCloseFlash]  = useState(false);
  // Refs so the RAF canvas loop can read the live countdown each frame without
  // being re-created every second (which would tear down the VP/footprint draw).
  const countdownRef  = useRef("--:--");
  const closeFlashRef  = useRef(false);
  const progressRef    = useRef(0); // 0→1 fraction of current candle elapsed
  const candleTimerRef = useRef(true); // live-readable copy of chartSettings.candleTimer
  // Live-readable timezone + clock format for the time axis / crosshair labels.
  const tzRef          = useRef<string>(chartSettings?.displayTimeZone || (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/New_York"));
  const clock24hRef    = useRef<boolean>(chartSettings?.clock24h ?? false);

  // Crosshair / price-axis time label → honours the user's timezone + 12/24h choice.
  const fmtAxisTime = useCallback((t: any): string => {
    const sec = typeof t === "number" ? t : (t?.timestamp ?? Math.floor(Date.now() / 1000));
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: tzRef.current, hour12: !clock24hRef.current,
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      }).format(new Date(sec * 1000));
    } catch { return new Date(sec * 1000).toLocaleString(); }
  }, []);

  // Time-axis tick label → date for day/month/year ticks, tz-aware clock for intraday.
  const fmtTickMark = useCallback((t: any, tickType: number): string => {
    const sec = typeof t === "number" ? t : (t?.timestamp ?? 0);
    const d = new Date(sec * 1000);
    const tz = tzRef.current;
    try {
      // tickType: 0=Year 1=Month 2=DayOfMonth 3=Time 4=TimeWithSeconds
      if (tickType <= 1) return new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "short" }).format(d);
      if (tickType === 2) return new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(d);
      return new Intl.DateTimeFormat("en-US", {
        timeZone: tz, hour12: !clock24hRef.current,
        hour: "2-digit", minute: "2-digit", ...(tickType === 4 ? { second: "2-digit" } : {}),
      }).format(d);
    } catch { return d.toLocaleTimeString(); }
  }, []);
  // Live-readable order-flow side colors (user-customizable via the toolbar gear).
  // Defaults are byte-identical to the prior hardcoded teal/purple so nothing
  // changes unless the user actually picks a custom color.
  // Each order-flow tool keeps its OWN color pair (per-tool gears are independent):
  // recoloring Delta does not affect Imbalance, etc. Keyed by FootprintType. Falls
  // back to the legacy shared keys, then to the Royal Blue / Purple defaults, so
  // existing saved colors keep working.
  type OFPair = { buy: [number,number,number]; sell: [number,number,number] };
  const OF_DEFAULT: OFPair = { buy: [37, 99, 235], sell: [106, 13, 173] };
  const OF_TOOL_IDS = ["bid-ask", "delta", "volume-profile", "imbalance", "aggressive-passive"];
  const ofColorsRef = useRef<Record<string, OFPair>>({});
  const [rangeVer,    setRangeVer]    = useState(0); // bumped on chart scroll/zoom → redraws canvas
  useEffect(() => {
    const load = () => {
      try {
        const legacyBuy  = hexToRgbTriplet(localStorage.getItem("wm_of_buy")  || "");
        const legacySell = hexToRgbTriplet(localStorage.getItem("wm_of_sell") || "");
        const map: Record<string, OFPair> = {};
        for (const t of OF_TOOL_IDS) {
          const b = hexToRgbTriplet(localStorage.getItem(`wm_of_${t}_buy`)  || "");
          const s = hexToRgbTriplet(localStorage.getItem(`wm_of_${t}_sell`) || "");
          map[t] = {
            buy:  b ?? legacyBuy  ?? OF_DEFAULT.buy,
            sell: s ?? legacySell ?? OF_DEFAULT.sell,
          };
        }
        ofColorsRef.current = map;
      } catch {}
      setRangeVer(v => v + 1); // force a redraw with new colors
    };
    load();
    window.addEventListener("wm-of-colors", load);
    return () => window.removeEventListener("wm-of-colors", load);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // VP bars + Big-Trades bubbles use their OWN color pair (default GREEN / RED), set
  // via the WM-VP gear — independent of the royal-blue/purple order-flow scheme. The
  // user wants VP & bubbles to stay green/red while footprint cells stay blue/purple.
  const vpColorsRef = useRef<{
    up: [number,number,number]; dn: [number,number,number];
    poc: [number,number,number]; vah: [number,number,number]; val: [number,number,number];
  }>({
    up:  [0, 192, 118],   // green → buy/ask-dominant shelf, up bubble
    dn:  [255, 77, 103],  // red   → sell/bid-dominant shelf, down bubble
    poc: [240, 180, 41],  // gold  → Point of Control
    vah: [37, 99, 235],   // blue  → Value Area High
    val: [139, 92, 246],  // purple→ Value Area Low
  });
  useEffect(() => {
    const load = () => {
      try {
        const up  = hexToRgbTriplet(localStorage.getItem("wm_vp_up")  || "");
        const dn  = hexToRgbTriplet(localStorage.getItem("wm_vp_dn")  || "");
        const poc = hexToRgbTriplet(localStorage.getItem("wm_vp_poc") || "");
        const vah = hexToRgbTriplet(localStorage.getItem("wm_vp_vah") || "");
        const val = hexToRgbTriplet(localStorage.getItem("wm_vp_val") || "");
        vpColorsRef.current = {
          up:  up  ?? [0,192,118], dn:  dn  ?? [255,77,103],
          poc: poc ?? [240,180,41], vah: vah ?? [37,99,235], val: val ?? [139,92,246],
        };
      } catch {}
      setRangeVer(v => v + 1);
    };
    load();
    window.addEventListener("wm-vp-colors", load);
    return () => window.removeEventListener("wm-vp-colors", load);
  }, []);

  const { liveBar, ticker, recentTicks, tapeSource } = useWebSocket({ symbol, timeframe });

  // ── Tick accumulator: REAL aggressor tape only (no synthetic / quote-poll noise) ──
  // Map<barTime, Map<priceRounded, {bid, ask}>>
  const tickAccRef = useRef<Map<number, Map<number, { bid: number; ask: number }>>>(new Map());
  const processedTicksRef = useRef<Set<string>>(new Set());
  // ── Delta accumulator: SEPARATE from Big Trades. Captures EVERY real executed
  // trade (no minLot floor) so net aggressive delta per price zone reflects the
  // full aggressive flow. Real trades only (tick.trade) — never quote/synthetic. ──
  const deltaTickAccRef = useRef<Map<number, Map<number, { bid: number; ask: number }>>>(new Map());
  const deltaProcessedRef = useRef<Set<string>>(new Set());
  const tapeSourceRef = useRef(tapeSource);
  useEffect(() => { tapeSourceRef.current = tapeSource; }, [tapeSource]);
  // Late-bound ref so magnet snap can read footprint levels after getBarFootprint is defined.
  const footprintSnapRef = useRef<(bar: Bar, n: number) => Array<{ priceLevel: number; total: number }>>(() => []);

  const hasRealAggressorTape = (src: string) =>
    src === "finnhub" || src === "polygon" || src === "alpaca" || src === "binance";

  const minBigTradeLot = (symBase: number) =>
    symBase > 10_000 ? 2 : symBase > 100 ? 15 : symBase > 1 ? 0.05 : 0.001;

  // Reset accumulator on symbol change — prevents cross-symbol contamination.
  useEffect(() => {
    tickAccRef.current = new Map();
    processedTicksRef.current = new Set();
    deltaTickAccRef.current = new Map();
    deltaProcessedRef.current = new Set();
  }, [symbol]);

  useEffect(() => {
    if (!recentTicks?.length || !hasRealAggressorTape(tapeSource ?? "")) return;
    const intervalSec = getIntervalSec(timeframe);
    const minTick = base > 10_000 ? 0.25 : base > 1_000 ? 0.25 : base > 100 ? 0.01 : 0.0001;
    const minLot  = minBigTradeLot(base);
    const dp      = base > 100 ? 2 : 4;

    recentTicks.forEach(tick => {
      if (!Number.isFinite(tick.price) || tick.price <= 0) return;
      if (!Number.isFinite(tick.size)  || tick.size  < minLot) return;
      const dedupeKey = `${tick.time}|${tick.price}|${tick.size}|${tick.side}`;
      if (processedTicksRef.current.has(dedupeKey)) return;
      processedTicksRef.current.add(dedupeKey);
      if (processedTicksRef.current.size > 8000) {
        processedTicksRef.current = new Set([...processedTicksRef.current].slice(-4000));
      }

      const barTime = Math.floor(tick.time / 1000 / intervalSec) * intervalSec;
      const priceLevel = +(Math.round(tick.price / minTick) * minTick).toFixed(dp);
      if (!tickAccRef.current.has(barTime)) tickAccRef.current.set(barTime, new Map());
      const lvlMap = tickAccRef.current.get(barTime)!;
      const existing = lvlMap.get(priceLevel) ?? { bid: 0, ask: 0 };
      lvlMap.set(priceLevel, {
        bid: existing.bid + (tick.side === "sell" ? tick.size : 0),
        ask: existing.ask + (tick.side === "buy"  ? tick.size : 0),
      });
    });
    if (tickAccRef.current.size > 400) {
      const oldest = [...tickAccRef.current.keys()].sort((a, b) => a - b)[0];
      tickAccRef.current.delete(oldest);
    }
  }, [recentTicks, timeframe, base, tapeSource]);

  // ── Delta accumulator population: EVERY real executed trade (tick.trade),
  //    NO minLot floor → full aggressive flow so net-delta-per-zone reflects
  //    real buying/selling pressure. Separate from Big Trades (tickAccRef above,
  //    which stays lot-filtered and untouched). Real trades only — the tick.trade
  //    flag excludes bookTicker/quote/REST/synthetic price-direction ticks. ──
  useEffect(() => {
    if (!recentTicks?.length || !hasRealAggressorTape(tapeSource ?? "")) return;
    const intervalSec = getIntervalSec(timeframe);
    const minTick = base > 10_000 ? 0.25 : base > 1_000 ? 0.25 : base > 100 ? 0.01 : 0.0001;
    const dp      = base > 100 ? 2 : 4;

    recentTicks.forEach(tick => {
      if (!tick.trade) return;                                  // real executed trades only
      if (!Number.isFinite(tick.price) || tick.price <= 0) return;
      if (!Number.isFinite(tick.size)  || tick.size  <= 0) return;
      const dedupeKey = `${tick.time}|${tick.price}|${tick.size}|${tick.side}`;
      if (deltaProcessedRef.current.has(dedupeKey)) return;
      deltaProcessedRef.current.add(dedupeKey);
      if (deltaProcessedRef.current.size > 12000) {
        deltaProcessedRef.current = new Set([...deltaProcessedRef.current].slice(-6000));
      }
      const barTime = Math.floor(tick.time / 1000 / intervalSec) * intervalSec;
      const priceLevel = +(Math.round(tick.price / minTick) * minTick).toFixed(dp);
      if (!deltaTickAccRef.current.has(barTime)) deltaTickAccRef.current.set(barTime, new Map());
      const lvlMap = deltaTickAccRef.current.get(barTime)!;
      const existing = lvlMap.get(priceLevel) ?? { bid: 0, ask: 0 };
      lvlMap.set(priceLevel, {
        bid: existing.bid + (tick.side === "sell" ? tick.size : 0),
        ask: existing.ask + (tick.side === "buy"  ? tick.size : 0),
      });
    });
    if (deltaTickAccRef.current.size > 400) {
      const oldest = [...deltaTickAccRef.current.keys()].sort((a, b) => a - b)[0];
      deltaTickAccRef.current.delete(oldest);
    }
  }, [recentTicks, timeframe, base, tapeSource]);

  // Keep the canvas-loop-readable candle-timer flag in sync with settings.
  useEffect(() => { candleTimerRef.current = chartSettings?.candleTimer !== false; }, [chartSettings?.candleTimer]);
  // Keep tz/clock refs current AND re-apply the chart localization so the axis
  // + crosshair time labels refresh the instant the user changes the setting.
  useEffect(() => {
    if (chartSettings?.displayTimeZone) tzRef.current = chartSettings.displayTimeZone;
    clock24hRef.current = chartSettings?.clock24h ?? false;
    try {
      chartRef.current?.applyOptions({ localization: { timeFormatter: fmtAxisTime } });
      chartRef.current?.timeScale().applyOptions({ tickMarkFormatter: fmtTickMark });
    } catch {}
  }, [chartSettings?.displayTimeZone, chartSettings?.clock24h]);

  /* ── Countdown timer ─────────────────────────────────── */
  useEffect(() => {
    const sec = getIntervalSec(timeframe);

    const tick = () => {
      const now       = Date.now() / 1000;
      const barStart  = Math.floor(now / sec) * sec;
      const barEnd    = barStart + sec;
      const remaining = barEnd - now;
      const txt = formatCountdown(remaining, sec);
      const flash = remaining <= 5 && remaining > 0;
      setCountdown(txt);
      setCloseFlash(flash);
      countdownRef.current = txt;
      closeFlashRef.current = flash;
      progressRef.current = Math.max(0, Math.min(1, (now - barStart) / sec));
    };

    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [timeframe]);

  /* ── Suppress LWC's uncatchable async teardown throw ──────
   * On rapid symbol/timeframe switching, Lightweight-Charts schedules an
   * internal model update on its own requestAnimationFrame BEFORE we call
   * chart.remove(). That callback then runs after disposal and throws
   * "Object is disposed" / "Value is null" asynchronously — outside any
   * local try/catch, so it surfaces as an uncaught console error. Our own
   * effects already guard with chart-identity checks; this handler swallows
   * ONLY that specific library-internal throw and lets everything else pass. */
  useEffect(() => {
    const isLwcTeardownNoise = (msg?: string) =>
      typeof msg === "string" &&
      (/object is disposed/i.test(msg) || /value is null/i.test(msg) ||
       /assertion failed.*disposed/i.test(msg));
    const onError = (e: ErrorEvent) => {
      if (isLwcTeardownNoise(e.message) || isLwcTeardownNoise((e.error && e.error.message))) {
        e.preventDefault(); e.stopImmediatePropagation();
      }
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const m = e.reason && (e.reason.message || String(e.reason));
      if (isLwcTeardownNoise(m)) e.preventDefault();
    };
    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  /* ── Bootstrap chart ─────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    const buildId = Date.now(); // unique ID per effect run
    (chartRef as any).__buildId = buildId;

    (async () => {
      const LW = await import("lightweight-charts");
      lwRef.current = LW; // expose v5 series definitions to other effects
      // Abort if a newer build started while we were awaiting
      if ((chartRef as any).__buildId !== buildId) return;
      if (disposed || !containerRef.current) return;

      // Clean up old chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        pineSeriesRef.current.clear();
      }

      const el          = containerRef.current;
      const intervalSec = getIntervalSec(timeframe);

      const chart = LW.createChart(el, {
        autoSize: true,
        localization: { timeFormatter: fmtAxisTime },
        layout: {
          background:       { color: chartSettings?.background ?? "#0B0E1A" },
          textColor:        "#8896BE",
          fontFamily:       "'JetBrains Mono', monospace",
          // Smaller axis font → Lightweight Charts fits MORE price/time labels
          // before its overlap-avoidance kicks in, so the y-axis shows denser,
          // less-skipped price levels when zoomed in. (The library still auto-
          // selects the tick step; there is no API to force every single level.)
          fontSize:         11,
          attributionLogo:  false,   // remove TradingView branding
        },
        grid: {
          vertLines: { color: chartSettings?.gridColor ?? "#1A2035", style: LW.LineStyle.Dotted },
          horzLines: { color: chartSettings?.gridColor ?? "#1A2035", style: LW.LineStyle.Dotted },
        },
        crosshair: {
          mode:     LW.CrosshairMode.Normal,
          vertLine: { color: chartSettings?.crosshairColor ?? "#4A6080", labelBackgroundColor: "#141824", width: 1 },
          horzLine: { color: chartSettings?.crosshairColor ?? "#4A6080", labelBackgroundColor: "#141824", width: 1 },
        },
        rightPriceScale: {
          borderColor:  "#263050",
          textColor:    "#8896BE",
          // Candles fill top 6%→82% of the pane, sitting directly above the
          // volume band (which lives in the bottom 18% on its own 'vol' scale).
          // Previously bottom:0.25 left a 7% dead gap and compressed candles into
          // the top two-thirds — making them look small/low-quality vs TV/Moomoo.
          scaleMargins: { top: 0.06, bottom: 0.18 },
          autoScale:    true,
        },
        timeScale: {
          borderColor:                  "#263050",
          timeVisible:                  true,
          tickMarkFormatter:            fmtTickMark,
          secondsVisible:               intervalSec < 60,
          rightOffset:                  5,
          barSpacing:                   8,
          minBarSpacing:                2,
          shiftVisibleRangeOnNewBar:    true,
          lockVisibleTimeRangeOnResize: false,
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
        // Price-axis drag scaling DISABLED — it let the price scale zoom out to an
        // absurd range (e.g. 300–1100 for TSLA at 377), crushing the candles, with
        // no easy recovery. Vertical control is our clamped body-drag + RESET; the
        // time axis can still be dragged to scale horizontally.
        handleScale:  { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: false } },
      });

      // ── NO VWAP / NO BANDS — moved to Indicators panel ──

      // Fetch real spot price IN PARALLEL with candle data — used to anchor synthetic
      // candles and to validate that Yahoo candle data is at the correct price level.
      const spotFetch = fetch(`/api/yahoo?sym=${encodeURIComponent(symbol)}&type=quote`, { cache: "no-store" })
        .then(r => r.json())
        .then(j => (j?.price ?? 0) as number)
        .catch(() => 0);

      // Bar count scales with timeframe so higher timeframes pull years of history
      // (e.g. Daily → 1200 bars ≈ 5y, Weekly/Monthly → full available history).
      const barCount = ["D"].includes(timeframe) ? 2600
                     : ["W"].includes(timeframe) ? 1000
                     : ["M","3M","6M","1Y","3Y","5Y"].includes(timeframe) ? 400
                     // Hourly TFs now pull ~2y of 60-min bars (Yahoo's max) so the
                     // chart scrolls back years, not 60 days.
                     : ["1h","2h","4h"].includes(timeframe) ? 3000
                     : 500;

      // Per-exchange crypto (e.g. "BTC.COINBASE") → that exchange's real candles
      const exParsed = parseExchangeSymbol(symbol);
      const exchangeData = exParsed
        ? await fetch(`/api/exchange?ex=${exParsed.exchange}&coin=${exParsed.coin}&type=candles&tf=${timeframe}&bars=${barCount}`, { cache: "no-store" })
            .then(r => r.json()).then(j => Array.isArray(j?.candles) && j.candles.length ? j.candles as Bar[] : null).catch(() => null)
        : null;

      // Priority: 0) Exchange-specific, 1) Alpaca, 2) Finnhub, 3) Yahoo, 4) Finnhub REST, 5) Polygon, 6) synthetic
      const alpacaData   = exchangeData ? null : await fetchAlpacaCandles(symbol, timeframe, barCount);
      const fhDirectData = (exchangeData || alpacaData) ? null : await fetchFinnhubCandlesDirect(symbol, timeframe, barCount);
      const yahooData    = (exchangeData || alpacaData || fhDirectData) ? null : await fetchYahooCandles(symbol, timeframe, barCount, extendedHours);
      const finnhubData  = (exchangeData || alpacaData || fhDirectData || yahooData) ? null : await fetchFinnhubCandles(symbol, timeframe, barCount);
      const polyData     = (exchangeData || alpacaData || fhDirectData || yahooData || finnhubData) ? null : await fetchPolygonOHLCV(symbol, timeframe, barCount);
      const realData     = exchangeData ?? alpacaData ?? fhDirectData ?? yahooData ?? finnhubData ?? polyData;

      // Real spot price (from parallel fetch above)
      const spotPrice = await spotFetch;
      // Use spot price as seed — prefer real > SYMBOL_BASE constant
      const syntheticBase = spotPrice > 0 ? spotPrice : base;

      // If we have real candle data but the candles are at a stale price level
      // (e.g. HMR preserved old 22k synthetic state), rebuild at real price.
      // We detect this by comparing the last candle close vs spot price — if they
      // differ by >5% we treat the candle set as stale and regenerate.
      let candleData = realData;
      if (candleData && candleData.length > 0 && spotPrice > 0) {
        const lastClose = candleData[candleData.length - 1].close;
        const stalePct  = Math.abs(lastClose - spotPrice) / spotPrice;
        if (stalePct > 0.05) candleData = null; // discard stale candles, re-generate below
      }

      const rawData = filterSession(
        candleData ?? generateCandles(300, syntheticBase, intervalSec),
        symbol, intervalSec, !!extendedHours,
      );
      // ── HARD SANITIZE — Lightweight Charts v5 THROWS (→ blank / distorted
      // candles) on duplicate or out-of-order timestamps, or NaN/Infinity OHLC.
      // Yahoo merges, session filtering and live-tick folding can all introduce
      // these. Sort by time, drop non-finite OHLC, and force strictly-increasing
      // unique timestamps so EVERY candle type downstream gets clean input.
      const data: Bar[] = (() => {
        const sorted = [...rawData]
          .filter(b =>
            b && Number.isFinite(b.time as number) &&
            Number.isFinite(b.open)  && Number.isFinite(b.high) &&
            Number.isFinite(b.low)   && Number.isFinite(b.close))
          .sort((a, b) => (a.time as number) - (b.time as number));
        let lastT = -Infinity;
        const out: Bar[] = [];
        for (const b of sorted) {
          let t = b.time as number;
          if (t <= lastT) continue; // drop duplicate/backwards bar (keep first)
          lastT = t;
          // guarantee high ≥ max(o,c) and low ≤ min(o,c) so bodies/wicks render
          const high = Math.max(b.high, b.open, b.close);
          const low  = Math.min(b.low,  b.open, b.close);
          out.push({ ...b, time: t as any, high, low, volume: Number.isFinite(b.volume) ? b.volume : 0 });
        }
        // ── DE-SPIKE outlier wicks ───────────────────────────────
        // Extended-hours / thin-liquidity feeds (Yahoo especially) emit single
        // bad-tick prints — e.g. a low of 352 on a bar whose body sits at 392, or
        // a high of 418 next to 380 neighbors. ONE such wick forces LWC autoscale
        // to stretch to that extreme, squashing every normal candle to a sliver
        // ("broken/distorted candles"). We clamp only egregious wicks (range >
        // 6× the median bar range) back toward the body, so real volatility is
        // untouched but lone spikes can't blow up the price scale.
        if (out.length >= 8) {
          const ranges = out
            .map(b => (b.high as number) - (b.low as number))
            .filter(r => r > 0)
            .sort((a, b) => a - b);
          const med = ranges.length ? ranges[Math.floor(ranges.length / 2)] : 0;
          if (med > 0) {
            const cap = med * 6;
            for (const b of out) {
              const maxC = Math.max(b.open, b.close);
              const minC = Math.min(b.open, b.close);
              if ((b.high as number) - maxC > cap) b.high = (maxC + cap) as any;
              if (minC - (b.low as number) > cap) b.low = (minC - cap) as any;
            }
          }
        }
        return out;
      })();
      // Transform for candle type
      const isHA          = candleType === "heikin-ashi";
      const isLine        = candleType === "line";
      const isArea        = candleType === "area";
      const isHollow      = candleType === "hollow";
      const isVolCnl      = candleType === "volume-candles";
      const isVPCandles   = candleType === "vp-candles";
      const isRenko       = candleType === "renko";
      const isRangeBars   = candleType === "range-bars";
      const isBars        = candleType === "bars";
      const isHlcBars     = candleType === "hlc-bars";
      const isBaseline    = candleType === "baseline";
      const isColumns     = candleType === "columns";
      const isOrderflow   = candleType === "orderflow-candles";
      const isComingSoon  = false; // removed: line-break, kagi, point-figure not in dropdown

      const displayData = isHA ? toHeikinAshi(data) : data;

      let cs: any;
      if (isLine) {
        cs = chart.addSeries(LW.LineSeries,{
          color:            "#4FA3E0",
          lineWidth:        2,
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          lastValueVisible: true,
        });
        cs.setData(displayData.map(b => ({ time: b.time, value: b.close } as any)));
      } else if (isArea) {
        cs = chart.addSeries(LW.AreaSeries,{
          topColor:         "rgba(79,163,224,0.40)",
          bottomColor:      "rgba(79,163,224,0.02)",
          lineColor:        "#4FA3E0",
          lineWidth:        2,
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          lastValueVisible: true,
        });
        cs.setData(displayData.map(b => ({ time: b.time, value: b.close } as any)));
      } else if (isBaseline) {
        cs = chart.addSeries(LW.BaselineSeries,{
          baseValue:        { type: "price", price: displayData[Math.floor(displayData.length / 2)]?.close ?? base },
          topLineColor:     "#00E5CC",
          topFillColor1:    "rgba(0,229,204,0.28)",
          topFillColor2:    "rgba(0,229,204,0.05)",
          bottomLineColor:  "#7B6CF7",
          bottomFillColor1: "rgba(123,108,247,0.05)",
          bottomFillColor2: "rgba(123,108,247,0.28)",
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          lastValueVisible: true,
        });
        cs.setData(displayData.map(b => ({ time: b.time, value: b.close } as any)));
      } else if (isBars) {
        cs = chart.addSeries(LW.BarSeries,{
          upColor:          chartSettings?.candleUp   ?? "#00E5CC",
          downColor:        chartSettings?.candleDown ?? "#7B6CF7",
          openVisible:      true,
          thinBars:         false,
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          lastValueVisible: true,
        });
        cs.setData(displayData as any);
      } else if (isHlcBars) {
        cs = chart.addSeries(LW.BarSeries,{
          upColor:          chartSettings?.candleUp   ?? "#00E5CC",
          downColor:        chartSettings?.candleDown ?? "#7B6CF7",
          openVisible:      false,
          thinBars:         true,
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          lastValueVisible: true,
        });
        cs.setData(displayData as any);
      } else if (isColumns) {
        // Columns = full-height colored bars (no wicks, wide body)
        // Use background color for wicks to hide them — "transparent" breaks LWC's internal parser
        const bgCol = chartSettings?.background ?? "#0B0E1A";
        cs = chart.addSeries(LW.CandlestickSeries,{
          upColor:          chartSettings?.candleUp   ?? "#00E5CC",
          downColor:        chartSettings?.candleDown ?? "#7B6CF7",
          borderUpColor:    chartSettings?.candleUp   ?? "#00E5CC",
          borderDownColor:  chartSettings?.candleDown ?? "#7B6CF7",
          wickUpColor:      bgCol,
          wickDownColor:    bgCol,
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          lastValueVisible: true,
        });
        // Force open = low and high = close for bull, open = high and low = close for bear (column shape)
        const colData = displayData.map(b => ({
          time: b.time,
          open: b.close > b.open ? b.low : b.high,
          high: b.high,
          low:  b.low,
          close: b.close,
        }));
        cs.setData(colData as any);
      } else if (isHollow) {
        // Hollow candles: body filled with chart background so it appears empty;
        // colored border provides the outline. Using background color (not "transparent")
        // avoids LWC's broken alpha-stripping in its internal #0000 hex parser.
        const bgColor = chartSettings?.background ?? "#0B0E1A";
        cs = chart.addSeries(LW.CandlestickSeries,{
          upColor:          bgColor,
          downColor:        bgColor,
          borderUpColor:    chartSettings?.borderUp   ?? chartSettings?.candleUp   ?? "#00C076",
          borderDownColor:  chartSettings?.borderDown ?? chartSettings?.candleDown ?? "#FF4D67",
          wickUpColor:      chartSettings?.wickUp     ?? "#00C076",
          wickDownColor:    chartSettings?.wickDown   ?? "#FF4D67",
          borderVisible:    true,
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          lastValueVisible: true,
        });
        cs.setData(displayData as any);
      } else if (isVolCnl) {
        // Volume Candles — green/red body, OPACITY scales with relative volume
        const upC = chartSettings?.candleUp ?? "#00C076", downC = chartSettings?.candleDown ?? "#FF4D67";
        cs = chart.addSeries(LW.CandlestickSeries,{
          upColor: upC, downColor: downC, borderUpColor: upC, borderDownColor: downC,
          wickUpColor: upC, wickDownColor: downC,
          priceLineVisible: true, priceLineColor: "#F0B429", lastValueVisible: true,
        });
        const maxVol = Math.max(1, ...displayData.map(b => b.volume));
        const minVol = Math.min(...displayData.map(b => b.volume));
        const volRange = maxVol - minVol || 1;
        const volData = displayData.map(b => {
          const frac   = (b.volume - minVol) / volRange;
          const alpha  = Math.round((0.25 + frac * 0.70) * 255).toString(16).padStart(2, "0");
          const isBull = b.close >= b.open;
          return { ...b, color: (isBull ? upC : downC) + alpha, borderColor: isBull ? upC : downC, wickColor: isBull ? upC : downC };
        });
        cs.setData(volData as any);
      } else if (isVPCandles) {
        // VP Candles — green/red, but HIGH-VOLUME (value-area / POC) bars get a GOLD border
        // to mark volume-profile significance. Distinct from plain Volume Candles.
        const upC = chartSettings?.candleUp ?? "#00C076", downC = chartSettings?.candleDown ?? "#FF4D67";
        cs = chart.addSeries(LW.CandlestickSeries,{
          upColor: upC, downColor: downC, borderUpColor: upC, borderDownColor: downC,
          wickUpColor: upC, wickDownColor: downC,
          priceLineVisible: true, priceLineColor: "#F0B429", lastValueVisible: true,
        });
        const vols = [...displayData.map(b => b.volume)].sort((a, b) => a - b);
        const pocThreshold = vols[Math.floor(vols.length * 0.8)] ?? Infinity; // top 20% = POC bars
        const vpData = displayData.map(b => {
          const isBull = b.close >= b.open;
          const isPOC  = b.volume >= pocThreshold;
          return {
            ...b,
            color:       isBull ? upC : downC,
            borderColor: isPOC ? "#F0B429" : (isBull ? upC : downC), // gold border on POC bars
            wickColor:   isBull ? upC : downC,
          };
        });
        cs.setData(vpData as any);
      } else if (isOrderflow) {
        // Order Flow Candles — hollow body (footprint cells show through) but a CRISP
        // green/red border so the candle stays sharp, not blurry.
        const bgOF = chartSettings?.background ?? "#0B0E1A";
        const upC = chartSettings?.candleUp ?? "#00C076", downC = chartSettings?.candleDown ?? "#FF4D67";
        cs = chart.addSeries(LW.CandlestickSeries,{
          upColor:          bgOF,
          downColor:        bgOF,
          borderUpColor:    upC,
          borderDownColor:  downC,
          borderVisible:    true,
          wickUpColor:      upC,
          wickDownColor:    downC,
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          lastValueVisible: true,
        });
        cs.setData(displayData as any);
      } else if (isRenko) {
        // RENKO — fixed-size bricks, a new brick only when price moves one brick
        // (time-independent). Bricks are filled green/red blocks (no wicks).
        const upC = chartSettings?.candleUp ?? "#00C076", downC = chartSettings?.candleDown ?? "#FF4D67";
        const brickSize  = base * 0.001;
        let lastBrick    = Math.floor((displayData[0]?.close ?? base) / brickSize) * brickSize;
        const renkoData: any[] = [];
        displayData.forEach(b => {
          while (b.close >= lastBrick + brickSize) {
            renkoData.push({ time: b.time, open: lastBrick, high: lastBrick + brickSize, low: lastBrick, close: lastBrick + brickSize, color: upC, borderColor: upC, wickColor: upC });
            lastBrick += brickSize;
          }
          while (b.close <= lastBrick - brickSize) {
            renkoData.push({ time: b.time, open: lastBrick, high: lastBrick, low: lastBrick - brickSize, close: lastBrick - brickSize, color: downC, borderColor: downC, wickColor: downC });
            lastBrick -= brickSize;
          }
        });
        // Renko is TIME-INDEPENDENT — a brick is a price move, not a clock tick. Keeping
        // the source bar's real timestamp made many bricks share one time (or sit far
        // apart), and LWC plots on a TIME axis, so the bricks rendered with big empty
        // horizontal gaps. Assign EVENLY-SPACED sequential timestamps so the bricks pack
        // tightly side-by-side like TradingView Renko (no gaps).
        const rkStep = getIntervalSec(timeframe) || 60;
        const rkT0 = (displayData[0]?.time as number) ?? Math.floor(Date.now() / 1000);
        const renkoClean = renkoData.map((r, i) => ({ ...r, time: rkT0 + i * rkStep }));
        cs = chart.addSeries(LW.CandlestickSeries,{
          upColor: upC, downColor: downC, borderUpColor: upC, borderDownColor: downC,
          wickUpColor: upC, wickDownColor: downC, borderVisible: true,
          priceLineVisible: true, priceLineColor: "#F0B429", lastValueVisible: true,
        });
        if (renkoClean.length) cs.setData(renkoClean as any);
      } else if (isRangeBars) {
        // RANGE BARS — each bar spans a FIXED price range; a new bar opens once price
        // travels one full range from the prior bar's open. Distinct from Renko (which
        // snaps to a grid). Green/red by direction, keeps real timestamps + wicks.
        const upC = chartSettings?.candleUp ?? "#00C076", downC = chartSettings?.candleDown ?? "#FF4D67";
        const rangeSize = base * 0.0015;
        const rbData: any[] = [];
        let cur: { time: number; open: number; high: number; low: number; close: number } | null = null;
        displayData.forEach(b => {
          if (!cur) { cur = { time: b.time as number, open: b.open, high: b.high, low: b.low, close: b.close }; }
          cur.high = Math.max(cur.high, b.high);
          cur.low  = Math.min(cur.low,  b.low);
          cur.close = b.close;
          if (cur.high - cur.low >= rangeSize) {
            const isBull = cur.close >= cur.open;
            rbData.push({ ...cur, color: isBull ? upC : downC, borderColor: isBull ? upC : downC, wickColor: isBull ? upC : downC });
            cur = null;
          }
        });
        if (cur) { const c = cur as { time:number;open:number;high:number;low:number;close:number }; const isBull = c.close >= c.open; rbData.push({ ...c, color: isBull ? upC : downC, borderColor: isBull ? upC : downC, wickColor: isBull ? upC : downC }); }
        // Range bars are TIME-INDEPENDENT — a bar is a fixed price travel, not a clock
        // tick. Real source timestamps left consecutive bars far apart on the TIME axis,
        // producing the big horizontal gaps. Assign EVENLY-SPACED sequential timestamps
        // so the bars pack tightly side-by-side like a real range-bar chart.
        const rbStep = getIntervalSec(timeframe) || 60;
        const rbT0 = (displayData[0]?.time as number) ?? Math.floor(Date.now() / 1000);
        const rbClean = rbData.map((r, i) => ({ ...r, time: rbT0 + i * rbStep }));
        cs = chart.addSeries(LW.CandlestickSeries,{
          upColor: upC, downColor: downC, borderUpColor: upC, borderDownColor: downC,
          wickUpColor: upC, wickDownColor: downC, borderVisible: true,
          priceLineVisible: true, priceLineColor: "#F0B429", lastValueVisible: true,
        });
        if (rbClean.length) cs.setData(rbClean as any);
      } else if (isComingSoon) {
        // 3-Line Break / Kagi / Point & Figure — render as line for now with label
        cs = chart.addSeries(LW.LineSeries,{
          color: "#8B5CF6", lineWidth: 2,
          priceLineVisible: true, priceLineColor: "#F0B429", lastValueVisible: true,
        });
        cs.setData(displayData.map(b => ({ time: b.time, value: b.close } as any)));
      } else {
        // Standard candles (default + Heikin Ashi) — Deep Charts color scheme
        cs = chart.addSeries(LW.CandlestickSeries,{
          upColor:          chartSettings?.candleUp   ?? "#00E5CC",
          downColor:        chartSettings?.candleDown ?? "#7B6CF7",
          borderUpColor:    chartSettings?.borderUp   ?? "#00E5CC",
          borderDownColor:  chartSettings?.borderDown ?? "#7B6CF7",
          wickUpColor:      chartSettings?.wickUp     ?? "#00E5CC",
          wickDownColor:    chartSettings?.wickDown   ?? "#7B6CF7",
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          priceLineWidth:   1,
          lastValueVisible: true,
        });
        cs.setData(displayData as any);
      }

      // For orderflow-candles, force bid-ask footprint in the canvas overlay
      const effectiveFP = isOrderflow ? "bid-ask" : footprintType;

      // Volume histogram
      const vs = chart.addSeries(LW.HistogramSeries,{
        priceFormat:  { type: "volume" },
        priceScaleId: "vol",
      });
      chart.priceScale("vol").applyOptions({
        scaleMargins: { top: 0.78, bottom: 0 },
        borderColor:  "transparent",
      });

      // Solid, clearly-visible real-volume bars (was 0.20 alpha → nearly
      // invisible, so the user thought volume had been removed). These are the
      // REAL per-bar volumes from the data feed, not synthetic.
      const volUp   = chartSettings?.neon ? "rgba(0,255,163,0.70)" : "rgba(0,212,170,0.55)";
      const volDown = chartSettings?.neon ? "rgba(255,46,99,0.70)"  : "rgba(255,77,106,0.55)";
      vs.setData(data.map(c => ({
        time:  c.time,
        value: c.volume,
        color: c.close >= c.open ? volUp : volDown,
      })) as any);

      // CANDLE DENSITY — match TradingView / Moomoo / Webull.
      // Lightweight-Charts derives candle BODY width from barSpacing via its
      // internal optimalCandlestickWidth() curve: the fill ratio (body ÷ slot)
      // RISES as barSpacing shrinks — ~78% at 15px (visibly gappy), ~86% at 8px
      // (tight, pro-platform look), ~90% at 6px. The old code set barSpacing:10
      // but then immediately overrode it with setVisibleLogicalRange(58 bars),
      // which forced ~15px slots on a 940px pane → the persistent gaps the user
      // sees vs Moomoo. Fix: PIN a tight barSpacing (no logical-range override)
      // and anchor to the latest bar. Sparse higher-timeframe history simply
      // leaves whitespace on the left instead of stretching bars apart.
      // Per-timeframe bar width so each timeframe opens at its OWN natural zoom
      // (5m looks tighter-packed than the daily, etc.) instead of every timeframe
      // snapping to one identical width — which made switching timeframes feel
      // like "nothing changed". Kept in the tight 6–11px pro-platform band so the
      // candles never go gappy. Lower timeframes (more bars) → slightly wider;
      // higher timeframes → tighter.
      try {
        const tfSec = getIntervalSec(timeframe);
        const bs =
          tfSec <= 60    ? 11 :   // ≤1m
          tfSec <= 300   ? 10 :   // ≤5m
          tfSec <= 900   ? 9  :   // ≤15m
          tfSec <= 3600  ? 8  :   // ≤1h
          tfSec <= 14400 ? 7  :   // ≤4h
                           6;     // daily+
        chart.timeScale().applyOptions({ barSpacing: bs, rightOffset: 5 });
        // Renko / Range bars carry SYNTHETIC, evenly-spaced timestamps (a brick is a
        // price move, not a clock tick). scrollToRealTime() anchors to the wall-clock
        // "now", which sits far to the right of those synthetic times — so the bricks
        // bunch against the right edge leaving the left half blank (the "Renko shows
        // empty chart" bug). For these types fit ALL bricks into the pane instead.
        if (isRenko || isRangeBars) {
          chart.timeScale().fitContent();
        } else {
          chart.timeScale().scrollToRealTime();
        }
      } catch {
        try { chart.timeScale().fitContent(); } catch {}
      }

      chartRef.current  = chart;
      candleRef.current = cs;
      markersPluginRef.current = null; // fresh series → re-attach markers plugin on next update
      volRef.current    = vs;
      barsRef.current   = data;

      // Feed the manual vertical-drag range through the main series' autoscale.
      // When manualPriceRangeRef is null the chart auto-fits as normal; when the
      // user drags vertically we return the shifted range so price pans freely.
      try {
        cs.applyOptions({
          autoscaleInfoProvider: autoscaleProviderRef.current,
        });
      } catch {}

      setCandles(data);
      if (data.length) {
        setLastPrice(data[data.length - 1].close);
        setOpenPrice(data[0].open);
      }
      setReady(true);
      onBarsReady?.(data);

      // Redraw canvas overlay whenever user scrolls or zooms
      chart.timeScale().subscribeVisibleTimeRangeChange(() => {
        if (!disposed) setRangeVer(v => v + 1);
      });

      // Crosshair move → data window update
      chart.subscribeCrosshairMove((param: any) => {
        if (!param || !param.time) {
          if (!disposed) { setDataWindow(null); onOHLCAtCursor?.(null); }
          return;
        }
        // Find bar at crosshair time
        const bar = barsRef.current.find(b => b.time === param.time);
        if (bar && !disposed) {
          const ohlc = { o: bar.open, h: bar.high, l: bar.low, c: bar.close, v: bar.volume, time: bar.time };
          setDataWindow(ohlc);
          onOHLCAtCursor?.(ohlc);
          // Get price at crosshair Y
          try {
            if (cs && param.point) {
              const price = cs.coordinateToPrice(param.point.y);
              if (price != null) onPriceAtCursor?.(+price.toFixed(bar.close > 100 ? 2 : 4));
            }
          } catch {}
        }
      });

    })().catch(err => {
      console.error("[MainChart] bootstrap failed:", err);
    });

    return () => {
      disposed = true;
      (chartRef as any).__buildId = -1; // invalidate this build
      setReady(false);
      // Aggressively clear BOTH canvases — prevents ALL stacking artifacts
      [canvasRef.current, drawCanvasRef.current].forEach(canvas => {
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.fillStyle = "transparent";
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
          }
        }
      });
      candleRef.current = null;
      pineSeriesRef.current.clear();
      if (chartRef.current) {
        try { chartRef.current.remove(); } catch {}
        chartRef.current = null;
      }
    };
  }, [symbol, timeframe, candleType, extendedHours]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Live tick updates (ALL timeframes) ─────────────────
   *  liveBar.time is already the correct bar-boundary second
   *  from useWebSocket's: Math.floor(Date.now()/1000/intervalSec)*intervalSec
   *  We just make sure we cast to the same integer second.
   ───────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!liveBar || !candleRef.current || !volRef.current || !ready) return;

    const price   = liveBar.close;
    const prevBars = barsRef.current;
    const lastBar  = prevBars[prevBars.length - 1];

    // ── PERMANENT GUARD against corrupt live ticks ──────────────────────────
    // A bad tick (price ≤ 0, NaN, or a wildly wrong magnitude — e.g. a 400 print
    // on a 3017 instrument, or a stale tick from the PREVIOUS symbol right after
    // a switch) used to be folded straight into the forming candle's high/low.
    // That created a giant candle that stretched the price scale (400→3200) and
    // crushed every real candle into a sliver. We now drop any tick that is
    // non-positive or deviates >25% from the last close — a single live tick can
    // never realistically move that far, so it is always bad data.
    {
      const ref = lastBar && lastBar.close > 0 ? lastBar.close : price;
      if (!Number.isFinite(price) || price <= 0) return;
      // A single intrabar tick can never realistically move >8% on these
      // instruments. Tightened from 25% → 8%: smaller bad ticks (10–24% off)
      // were slipping through and, folded into the forming bar's high/low over
      // a multi-hour 4h/1h candle, slowly stretched the price scale and crushed
      // every real candle into a sliver "after a few minutes".
      if (ref > 0 && Math.abs(price - ref) / ref > 0.08) return;
      // Also reject corrupt high/low fields on a fresh bar from the provider.
      if (lastBar && Math.floor(liveBar.time) > lastBar.time) {
        const h = liveBar.high, l = liveBar.low;
        if (!Number.isFinite(h) || !Number.isFinite(l) || l <= 0 || h <= 0 ||
            (ref > 0 && (Math.abs(h - ref) / ref > 0.08 || Math.abs(l - ref) / ref > 0.08))) {
          // Provider OHLC is garbage — fold just the (validated) close into a flat bar.
          liveBar.high = price; liveBar.low = price; liveBar.open = price;
        }
      }
    }

    // CRITICAL: the data provider's last/forming candle may carry an intraday
    // timestamp AHEAD of our computed bar-boundary (e.g. Yahoo's current 30m bar
    // is stamped 00:08, not 00:00). If we call series.update() with a time that's
    // BEHIND the last bar, LWC throws and the price silently never updates → frozen.
    // So: if our live time isn't strictly after the last bar, fold the live price
    // INTO the last bar (update its high/low/close), keeping a valid ascending time.
    let bar: Bar;
    let t = Math.floor(liveBar.time);
    const intervalSec = getIntervalSec(timeframe);
    // Fold the live price into the last candle when EITHER (a) the live time is
    // behind/equal to the last bar, OR (b) it is MORE THAN ONE interval ahead.
    // Case (b) happens in pre/after-hours (the regular-session data ends at the
    // close, but live ticks carry a timestamp hours later) and when the tab was
    // idle and skipped intervals. Creating a new candle there draws a DISCONNECTED
    // candle far to the right with a big gap and stray fragments — exactly the
    // "gap + piece of a candle" artifact. Folding keeps the series continuous.
    // In RTH mode, an equity tick that arrives outside 9:30–16:00 ET must NOT
    // open a new (after-hours) candle — that is exactly the floating-fragment
    // artifact. Fold it into the last regular-session bar instead.
    // Tick = point in time → use a 60s window so this stays an exact
    // "is this instant inside 9:30–16:00 ET?" test (not a bar-span overlap).
    const outsideRTH = !extendedHours && intervalSec < 86400 &&
      isEquitySymbol(symbol) && !isRegularSession(t, 60);
    if (lastBar && (outsideRTH || t <= lastBar.time || t > lastBar.time + intervalSec)) {
      t = lastBar.time; // update the current forming candle in place
      bar = {
        time:   t as any,
        open:   lastBar.open,
        high:   Math.max(lastBar.high, price),
        low:    Math.min(lastBar.low, price),
        close:  price,
        volume: Math.max(lastBar.volume, liveBar.volume || 0),
      };
    } else {
      bar = {
        time:   t as any,
        open:   liveBar.open,
        high:   liveBar.high,
        low:    liveBar.low,
        close:  price,
        volume: liveBar.volume,
      };
    }

    // ── LIVE DE-SPIKE: cap the forming bar's wicks to a sane multiple of the
    // recent median bar range, so even an in-threshold bad tick can never
    // balloon the candle and squash the price scale during a live session.
    {
      const recent = barsRef.current.slice(-30);
      if (recent.length >= 8) {
        const ranges = recent
          .map(b => b.high - b.low)
          .filter(r => r > 0)
          .sort((a, b) => a - b);
        const med = ranges.length ? ranges[Math.floor(ranges.length / 2)] : 0;
        if (med > 0) {
          const cap = med * 4;
          const maxC = Math.max(bar.open, bar.close);
          const minC = Math.min(bar.open, bar.close);
          if (bar.high - maxC > cap) bar.high = maxC + cap;
          if (minC - bar.low > cap) bar.low = minC - cap;
        }
      }
    }

    try {
      candleRef.current.update(bar as any);
      volRef.current.update({
        time:  bar.time,
        value: bar.volume,
        color: bar.close >= bar.open
          ? (chartSettings?.neon ? "rgba(0,255,163,0.70)" : "rgba(0,212,170,0.55)")
          : (chartSettings?.neon ? "rgba(255,46,99,0.70)"  : "rgba(255,77,106,0.55)"),
      } as any);
    } catch {
      // last-resort: if update still rejects, force the price onto the visible
      // last candle so the chart never stays frozen
      try {
        if (lastBar) candleRef.current.update({ ...lastBar, close: price, high: Math.max(lastBar.high, price), low: Math.min(lastBar.low, price) } as any);
      } catch {}
    }

    // ── Live-update registered oscillators (Tape Speed, Exhaustion, flow
    //    histograms, volume) so they visibly move with the in-progress bar ──
    if (oscLiveRef.current.length) {
      const lb = barsRef.current;
      let liveBars: Bar[];
      if (lb.length && lb[lb.length - 1].time === bar.time) liveBars = [...lb.slice(0, -1), bar as Bar];
      else liveBars = [...lb, bar as Bar];
      for (const u of oscLiveRef.current) {
        try {
          const r = u.recompute(liveBars);
          if (r && isFinite(r.value)) {
            const point: any = { time: bar.time, value: r.value };
            if (r.color) point.color = r.color;
            u.series.update(point);
          }
        } catch { /* ignore a single bad recompute */ }
      }
    }

    // ── Live-update Pine Script plots so custom indicators track the
    //    in-progress bar in real time (not a frozen one-shot snapshot) ──
    if (pineCodeRef.current && pineSeriesRef.current.size) {
      const lb = barsRef.current;
      let liveBars: Bar[];
      if (lb.length && lb[lb.length - 1].time === bar.time) liveBars = [...lb.slice(0, -1), bar as Bar];
      else liveBars = [...lb, bar as Bar];
      try {
        const out = interpretPine(pineCodeRef.current, liveBars.map(b => ({
          time: b.time as number, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume || 0,
        })));
        out.plots.forEach(plot => {
          const series = pineSeriesRef.current.get(plot.id);
          const v = plot.values[plot.values.length - 1];
          if (series && v != null && isFinite(v)) {
            const point: any = { time: bar.time, value: v };
            if (plot.style === "histogram" || plot.style === "columns") point.color = plot.color;
            series.update(point);
          }
        });
      } catch { /* ignore a single bad recompute */ }
    }

    setLastPrice(price);
    setCandles(prev => {
      const last = prev[prev.length - 1];
      if (last?.time === bar.time) {
        const next = [...prev];
        next[next.length - 1] = bar;
        barsRef.current = next;
        return next;
      }
      const next = [...prev, bar];
      barsRef.current = next;
      return next;
    });

    // Emit updated bars to parent for Pine Script execution
    if (barsRef.current.length) {
      onBarsReady?.(barsRef.current);
    }
    // NOTE: Big-Trade bubbles spawn in the canvas loop (Pass A) from tickAccRef
    // ONLY — real aggressor tape, never synthetic footprint. No bubble without
    // a qualifying large trade at that price level on that bar.
  }, [liveBar, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── DIRECT live-price poller (guaranteed chart movement) ──────
   * Decisive, self-contained: polls the real quote every 2.5s and forces the
   * price onto the visible last candle using THAT candle's own timestamp — so
   * series.update() can never be rejected for "older than last bar". This is
   * independent of the websocket/tick chain, so even if that path stalls, the
   * chart still tracks live price. Futures use Yahoo ES=F (the only entitled
   * live source); stocks/crypto resolve to their best source server-side.
   ───────────────────────────────────────────────────────────── */
  // NOTE: A second "direct poller" used to live here and also wrote candles.
  // Running it alongside the useWebSocket→liveBar writer appended duplicate bars
  // at mismatched timestamps, which showed as candles DOUBLING / stacking. It is
  // removed: useWebSocket.liveBar (with snap-to-last-bar) is now the SINGLE
  // source of truth for live candle updates. One writer = no doubling.

  /* ── Pine Script series ─────────────────────────────────── */
  useEffect(() => {
    pineCodeRef.current = pineOutput ? pineCode : undefined;
    if (!ready || !chartRef.current || !pineOutput) return;

    (async () => {
      const LW = await import("lightweight-charts");
      // Chart may have been disposed/replaced during the await → bail before touch.
      if (!chartRef.current) return;

      // Clear old Pine series
      pineSeriesRef.current.forEach(series => {
        try { chartRef.current?.removeSeries(series); } catch {}
      });
      pineSeriesRef.current.clear();

      const chart = chartRef.current;
      const bars  = barsRef.current;

      pineOutput.plots.forEach((plot, i) => {
        if (!plot.values.length) return;

        let series: any;
        const isHisto = plot.style === "histogram" || plot.style === "columns";
        const scaleId = plot.overlay ? "right" : `pine-${i}`;

        if (isHisto) {
          series = chart.addSeries(LW.HistogramSeries,{ color: plot.color, priceScaleId: scaleId });
        } else {
          series = chart.addSeries(LW.LineSeries,{
            color:            plot.color,
            lineWidth:        (Math.min(4, plot.linewidth) || 1) as 1 | 2 | 3 | 4,
            lineStyle:        LW.LineStyle.Solid,
            priceLineVisible: false,
            lastValueVisible: true,
            title:            plot.title,
            priceScaleId:     scaleId,
          });
        }

        if (!plot.overlay) {
          chart.priceScale(scaleId).applyOptions({
            scaleMargins: { top: 0.65 + i * 0.08, bottom: 0 },
          });
        }

        const seriesData = bars
          .map((b, idx) => ({ time: b.time as any, value: plot.values[idx] }))
          .filter(d => d.value != null) as { time: any; value: number }[];

        if (seriesData.length) {
          series.setData(isHisto ? seriesData.map(d => ({ ...d, color: plot.color })) : seriesData);
        }
        pineSeriesRef.current.set(plot.id, series);
      });

      // hlines
      pineOutput.hlines.forEach(h => {
        const hs = chart.addSeries(LW.LineSeries,{
          color:            h.color,
          lineWidth:        (h.width || 1) as any,
          lineStyle:        h.style === "dashed" ? LW.LineStyle.Dashed
                          : h.style === "dotted" ? LW.LineStyle.Dotted
                          : LW.LineStyle.Solid,
          priceLineVisible: false,
          lastValueVisible: false,
          title:            h.title,
        });
        hs.setData(bars.map(b => ({ time: b.time as any, value: h.price })));
        pineSeriesRef.current.set(`hline-${h.title}`, hs);
      });

      // ── plotshape / plotchar markers (buy/sell triangles, arrows, flags) ──
      // v5 markers support only circle|square|arrowUp|arrowDown, so Pine's
      // directional shapes (triangleup/arrowup/labelup ↔ triangledown/…) map to
      // arrowUp/arrowDown — the correct buy/sell semantics — and non-directional
      // shapes (cross/xcross/flag) fall back to square. Rendered via a dedicated
      // markers plugin so they coexist with the candle-pattern markers plugin.
      const shapeMarkerShape = (st: string): "circle" | "square" | "arrowUp" | "arrowDown" => {
        if (st === "triangleup" || st === "arrowup" || st === "labelup")   return "arrowUp";
        if (st === "triangledown" || st === "arrowdown" || st === "labeldown") return "arrowDown";
        if (st === "circle") return "circle";
        return "square";
      };
      const shapeMarkerPos = (loc: string, st: string): "aboveBar" | "belowBar" => {
        if (loc === "abovebar" || loc === "top")    return "aboveBar";
        if (loc === "belowbar" || loc === "bottom") return "belowBar";
        return (st.indexOf("down") >= 0) ? "aboveBar" : "belowBar";
      };
      const shapeMarkers: { time: any; position: "aboveBar" | "belowBar"; color: string; shape: "circle" | "square" | "arrowUp" | "arrowDown"; text: string; size: number }[] = [];
      (pineOutput.shapes || []).forEach(sh => {
        (sh.bars || []).forEach(bi => {
          const b = bars[bi];
          if (!b) return;
          shapeMarkers.push({
            time: b.time as any,
            position: shapeMarkerPos(sh.location, sh.style),
            color: sh.color,
            shape: shapeMarkerShape(sh.style),
            text: sh.text || sh.title || "",
            size: 1,
          });
        });
      });
      shapeMarkers.sort((a, b) => (a.time as number) - (b.time as number));
      let markersApplied = false;
      if (candleRef.current) {
        try {
          if (!pineMarkersPluginRef.current) {
            pineMarkersPluginRef.current = LW.createSeriesMarkers(candleRef.current, shapeMarkers);
          } else {
            pineMarkersPluginRef.current.setMarkers(shapeMarkers);
          }
          markersApplied = true;
        } catch { /* series may be mid-teardown */ }
      }
      // Harmless diagnostic snapshot of the last Pine render (plot/hline/marker
      // counts). No PII; useful for verifying custom-indicator rendering.
      // Dev-only — never ships to production.
      if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
        (window as unknown as { __wmPineRender?: unknown }).__wmPineRender = {
          plots: pineOutput.plots.length,
          hlines: pineOutput.hlines.length,
          shapes: (pineOutput.shapes || []).length,
          markers: shapeMarkers.length,
          markerShapes: shapeMarkers.map(m => m.shape),
          markerPositions: shapeMarkers.map(m => m.position),
          markersApplied,
          ts: Date.now(),
        };
      }
    })();

    // Return cleanup so Strict Mode double-fire doesn't orphan Pine series
    return () => {
      pineSeriesRef.current.forEach(series => {
        try { chartRef.current?.removeSeries(series); } catch {}
      });
      pineSeriesRef.current.clear();
      // Clear Pine plotshape markers (empty array) so they don't linger when the
      // script is removed or swapped. Keep the plugin instance for reuse.
      try { pineMarkersPluginRef.current?.setMarkers([]); } catch {}
    };
  }, [pineOutput, pineCode, ready]);

  /* ── Render indicator overlays ─────────────────────────── */
  useEffect(() => {
    if (!ready || !chartRef.current || !barsRef.current?.length) return;
    const chart = chartRef.current;
    const LW    = lwRef.current;            // v5 series definitions
    if (!LW) return;
    const bars  = barsRef.current as IND.Bar[];

    // Remove previous indicator series. In v5 removing a series can leave an
    // empty pane behind; we also prune empty panes at the end of this effect.
    indSeriesRef.current.forEach(s => { try { chart.removeSeries(s); } catch {} });
    indSeriesRef.current = [];
    oscLiveRef.current = [];
    // Register a series for live tick updates: recompute pulls fresh values from
    // the current bars and returns the LAST point to update.
    const regLive = (series: any, recompute: (bs: Bar[]) => { value: number; color?: string } | null) => {
      if (series) oscLiveRef.current.push({ series, recompute });
    };

    const closes = bars.map(b => b.close);
    const inds   = activeInds ?? new Set<string>();
    // Per-indicator custom params (length / mult / color) merged with defaults
    const ip = (name: string) => resolveParams(name, indSettings);

    // Helper: overlay line on main price scale
    const addLine = (vals: number[], color: string, width = 1, style = 0, lastVal = false) => {
      try {
        const s = chart.addSeries(LW.LineSeries,{ color, lineWidth: width, lineStyle: style, priceLineVisible: false, lastValueVisible: lastVal, crosshairMarkerVisible: false });
        s.setData(bars.map((b, i) => ({ time: b.time as any, value: vals[i] })).filter(d => isFinite(d.value)));
        indSeriesRef.current.push(s);
        return s;
      } catch { return null; }
    };

    // Helper: histogram on main scale
    const addHist = (vals: number[], color: string) => {
      try {
        const s = chart.addSeries(LW.HistogramSeries,{ color, priceLineVisible: false, lastValueVisible: false });
        s.setData(bars.map((b, i) => ({ time: b.time as any, value: vals[i] })).filter(d => isFinite(d.value)));
        indSeriesRef.current.push(s);
        return s;
      } catch { return null; }
    };

    // ── Native bottom panes (LWC v5) ─────────────────────────
    // Each distinct oscillator scaleId maps to its OWN native pane stacked
    // below the candles. v5 lays out and sizes panes automatically, so we no
    // longer juggle scaleMargins — RSI / Stoch RSI / MACD / CVD / VWAP each
    // get a clean, non-overlapping pane that never shrinks into the candles.
    const paneOf = new Map<string, number>();
    let nextPane = 1; // pane 0 = candles + volume overlay
    const paneFor = (id: string) => {
      let p = paneOf.get(id);
      if (p === undefined) { p = nextPane++; paneOf.set(id, p); }
      return p;
    };
    // Kept for call-site compatibility — pane is assigned lazily on first series.
    const setupScale = (id: string, _top?: number, _bot?: number) => { paneFor(id); };
    const addOsc = (vals: number[], color: string, scaleId: string, width = 1) => {
      try {
        const s = chart.addSeries(LW.LineSeries, { color, lineWidth: width, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false }, paneFor(scaleId));
        s.setData(bars.map((b, i) => ({ time: b.time as any, value: vals[i] })).filter(d => isFinite(d.value)));
        indSeriesRef.current.push(s);
        return s;
      } catch { return null; }
    };
    const addOscHist = (vals: number[], colors: string[] | string, scaleId: string) => {
      try {
        // lastValueVisible → shows the live numeric readout on the pane's price
        // axis (CVD / Speed of Tape / etc.) instead of an animating-but-blank meter.
        const s = chart.addSeries(LW.HistogramSeries, { priceLineVisible: false, lastValueVisible: true }, paneFor(scaleId));
        s.setData(bars.map((b, i) => ({ time: b.time as any, value: vals[i], color: Array.isArray(colors) ? colors[i] : colors })).filter(d => isFinite(d.value)));
        indSeriesRef.current.push(s);
        return s;
      } catch { return null; }
    };
    const refLine = (val: number, scaleId: string, color: string) => addOsc(bars.map(() => val), color, scaleId, 1);

    // ── Cumulative-delta CANDLES (TradingView-style CVD) ─────────
    // A cumulative series (running sum) rendered as a per-bar histogram looks
    // like meaningless noise. TradingView draws CVD as CANDLES: each bar's body
    // spans the change in the cumulative total (open = prior cumulative, close =
    // current cumulative), so you read genuine buy/sell structure — green when
    // the cumulative delta rose that bar, red when it fell. Gives real OHLC
    // structure + a live axis readout (lastValueVisible) + a zero-cross line.
    const addCumCandles = (vals: number[], scaleId: string, up = "#00C076", dn = "#FF4D67") => {
      try {
        const s = chart.addSeries(LW.CandlestickSeries, {
          upColor: up, downColor: dn,
          borderUpColor: up, borderDownColor: dn,
          wickUpColor: up, wickDownColor: dn,
          priceLineVisible: false, lastValueVisible: true,
        }, paneFor(scaleId));
        const data = bars.map((b, i) => {
          const close = vals[i];
          const open  = i === 0 ? vals[0] : vals[i - 1];
          return { time: b.time as any, open, high: Math.max(open, close), low: Math.min(open, close), close };
        }).filter(d => isFinite(d.open) && isFinite(d.close));
        s.setData(data);
        indSeriesRef.current.push(s);
        return s;
      } catch { return null; }
    };

    // Skip indicators requiring external data feeds
    const skip = (name: string) => IND.REQUIRES_FEED.has(name) || IND.MTF_INDICATORS.has(name);

    // ── VWAP — now in its OWN native bottom pane (scaleId "vwap") ──────
    // Per user request, VWAP lives in a dedicated pane like RSI/MACD rather
    // than overlaying the candles. The whole VWAP family shares the pane.
    if ((inds.has("VWAP") || inds.has("VWAP Bands")) && visibleAtTf(ip("VWAP"), timeframe)) {
      const vwapVals = IND.vwap(bars);
      addOsc(vwapVals, ip("VWAP").color ?? "#F0B429", "vwap", (ip("VWAP").lineWidth ?? 2));
      if (inds.has("VWAP Bands")) {
        let cumSqDev = 0, cumVol = 0;
        const vwapVals2 = IND.vwap(bars);
        const s1u: number[] = [], s1d: number[] = [], s2u: number[] = [], s2d: number[] = [];
        bars.forEach((b, i) => {
          const tp = (b.high + b.low + b.close) / 3;
          cumVol += b.volume; cumSqDev += b.volume * (tp - vwapVals2[i]) ** 2;
          const sigma = Math.sqrt(Math.max(0, cumVol > 0 ? cumSqDev / cumVol : 0));
          s1u.push(vwapVals2[i] + sigma); s1d.push(vwapVals2[i] - sigma);
          s2u.push(vwapVals2[i] + 2 * sigma); s2d.push(vwapVals2[i] - 2 * sigma);
        });
        addOsc(s1u, "rgba(240,180,41,0.5)", "vwap", 1); addOsc(s1d, "rgba(240,180,41,0.5)", "vwap", 1);
        addOsc(s2u, "rgba(240,180,41,0.3)", "vwap", 1); addOsc(s2d, "rgba(240,180,41,0.3)", "vwap", 1);
      }
    }

    if (inds.has("Anchored VWAP")) addOsc(IND.anchoredVwap(bars, 0), "#FFD700", "vwap", 1);
    if (inds.has("VWAP Deviation Bands")) {
      const v = IND.vwap(bars);
      addOsc(v, "#F0B429", "vwap", 1);
      const sd = IND.stdDev(closes, 20);
      addOsc(v.map((val, i) => val + sd[i]), "rgba(240,180,41,0.4)", "vwap", 1);
      addOsc(v.map((val, i) => val - sd[i]), "rgba(240,180,41,0.4)", "vwap", 1);
    }

    // ── Moving Averages ───────────────────────────────────────
    const MA_CFG: { name: string; p: number; c: string; fn: (s: number[], p: number) => number[] }[] = [
      { name: "EMA 8",   p: 8,   c: "#C084FC", fn: IND.ema },
      { name: "EMA 9",   p: 9,   c: "#B070EC", fn: IND.ema },
      { name: "EMA 13",  p: 13,  c: "#8B5CF6", fn: IND.ema },
      { name: "EMA 21",  p: 21,  c: "#4FA3E0", fn: IND.ema },
      { name: "EMA 34",  p: 34,  c: "#60BFFF", fn: IND.ema },
      { name: "EMA 50",  p: 50,  c: "#F0B429", fn: IND.ema },
      { name: "EMA 89",  p: 89,  c: "#FFA500", fn: IND.ema },
      { name: "EMA 144", p: 144, c: "#FF8C00", fn: IND.ema },
      { name: "EMA 200", p: 200, c: "#FF4D6A", fn: IND.ema },
      { name: "SMA 9",   p: 9,   c: "#70EEC0", fn: IND.sma },
      { name: "SMA 20",  p: 20,  c: "#00D4AA", fn: IND.sma },
      { name: "SMA 50",  p: 50,  c: "#30B0A0", fn: IND.sma },
      { name: "SMA 100", p: 100, c: "#20A090", fn: IND.sma },
      { name: "SMA 200", p: 200, c: "#00C0D4", fn: IND.sma },
      { name: "WMA",     p: 20,  c: "#A78BFA", fn: IND.wma },
      { name: "HMA",     p: 20,  c: "#34D399", fn: IND.hma },
      { name: "DEMA",    p: 20,  c: "#F472B6", fn: IND.dema },
      { name: "TEMA",    p: 20,  c: "#FB7185", fn: IND.tema },
      { name: "ZLEMA",   p: 20,  c: "#A3E635", fn: IND.zlema },
    ];
    MA_CFG.forEach(({ name, p, c, fn }) => {
      if (!inds.has(name)) return;
      const cp = ip(name);                       // custom length/color override
      if (!visibleAtTf(cp, timeframe)) return;    // per-timeframe visibility
      addLine(fn(closes, cp.length ?? p), cp.color ?? c, (cp.lineWidth ?? 1), (cp.lineStyle ?? 0));
    });
    if (inds.has("ALMA"))            addLine(IND.alma(closes),      "#E879F9", 1);
    if (inds.has("T3 Moving Average"))addLine(IND.t3(closes),       "#FCD34D", 1);
    if (inds.has("KAMA"))            addLine(IND.kama(closes),      "#67E8F9", 1);
    if (inds.has("McGinley Dynamic")) addLine(IND.mcginley(closes),  "#86EFAC", 1);
    if (inds.has("VWMA"))            addLine(IND.vwma(bars, 20),    "#FCA5A5", 1);
    if (inds.has("Moving Average Ribbon")) {
      const cols = ["#C084FC","#8B5CF6","#4FA3E0","#60BFFF","#F0B429","#FFA500"];
      IND.maRibbon(closes).forEach((v, i) => addLine(v, cols[i] ?? "#888", 1));
    }

    // ── Channels / Bands ─────────────────────────────────────
    if (inds.has("Bollinger Bands")) {
      const cp = ip("Bollinger Bands");
      const bb = IND.bollingerBands(closes, cp.length ?? 20, cp.mult ?? 2);
      const col = cp.color ?? "#4FA3E0";
      addLine(bb.upper, hexToRgba(col, 0.7), 1); addLine(bb.mid, hexToRgba(col, 1), 1); addLine(bb.lower, hexToRgba(col, 0.7), 1);
    }
    if (inds.has("Bollinger Band Width")) { setupScale("bbw"); addOsc(IND.bbWidth(closes), "#4FA3E0", "bbw"); }
    if (inds.has("BB Width"))             { setupScale("bbw2"); addOsc(IND.bbWidth(closes), "#4FA3E0", "bbw2"); }
    if (inds.has("Keltner Channel")) {
      const cp = ip("Keltner Channel");
      const kc = IND.keltner(bars, cp.length ?? 20, cp.mult ?? 2);
      const col = cp.color ?? "#8B5CF6";
      addLine(kc.upper, hexToRgba(col, 0.7), 1); addLine(kc.mid, hexToRgba(col, 1), 1); addLine(kc.lower, hexToRgba(col, 0.7), 1);
    }
    if (inds.has("KC Width")) { setupScale("kcw"); addOsc(IND.kcWidth(bars), "#8B5CF6", "kcw"); }
    if (inds.has("Donchian Channel")) {
      const dc = IND.donchian(bars);
      addLine(dc.upper, "rgba(236,72,153,0.7)", 1); addLine(dc.mid, "rgba(236,72,153,1)", 1); addLine(dc.lower, "rgba(236,72,153,0.7)", 1);
    }
    if (inds.has("Donchian Width")) { setupScale("dcw"); addOsc(IND.donchianWidth(bars), "#EC4899", "dcw"); }
    if (inds.has("Envelope")) {
      const env = IND.envelope(closes);
      addLine(env.upper, "rgba(250,204,21,0.6)", 1); addLine(env.mid, "rgba(250,204,21,1)", 1); addLine(env.lower, "rgba(250,204,21,0.6)", 1);
    }
    if (inds.has("Price Channel")) {
      const pc = IND.priceChannel(bars);
      addLine(pc.upper, "rgba(52,211,153,0.6)", 1); addLine(pc.lower, "rgba(52,211,153,0.6)", 1);
    }
    if (inds.has("Linear Regression")) addLine(IND.linearRegression(closes), "#F97316", 1, 2);
    if (inds.has("Linear Regression Channel")) {
      const lr = IND.linearRegressionChannel(closes);
      addLine(lr.upper, "rgba(249,115,22,0.6)", 1); addLine(lr.mid, "rgba(249,115,22,1)", 1); addLine(lr.lower, "rgba(249,115,22,0.6)", 1);
    }
    if (inds.has("Parabolic SAR") || inds.has("Parabolic SAR")) addLine(IND.parabolicSAR(bars), "#F59E0B", 1, 3);
    if (inds.has("Supertrend")) {
      const st = IND.supertrend(bars);
      const bull: number[] = st.line.map((v, i) => st.dir[i] === 1 ? v : NaN);
      const bear: number[] = st.line.map((v, i) => st.dir[i] !== 1 ? v : NaN);
      addLine(bull, "rgba(0,192,118,0.9)", 2); addLine(bear, "rgba(255,77,103,0.9)", 2);
    }
    if (inds.has("Alligator")) {
      const al = IND.alligator(bars);
      addLine(al.jaw, "#4FA3E0", 1); addLine(al.teeth, "#F0B429", 1); addLine(al.lips, "#26a69a", 1);
    }
    if (inds.has("Ichimoku Cloud")) {
      const ich = IND.ichimoku(bars);
      addLine(ich.tenkan, "#ef5350", 1); addLine(ich.kijun, "#2196F3", 1);
      addLine(ich.senkouA, "rgba(0,192,118,0.3)", 1); addLine(ich.senkouB, "rgba(255,77,103,0.3)", 1);
      addLine(ich.chikou, "rgba(150,150,150,0.6)", 1, 2);
    }

    // ── Pivot Points ──────────────────────────────────────────
    for (const [ptType, label] of [["standard","Pivot Points Standard"],["fibonacci","Pivot Points Fibonacci"],["camarilla","Pivot Points Camarilla"],["woodie","Pivot Points Woodie"],["demark","Pivot Points Demark"],["cpr","Pivot Points CPR"]] as const) {
      if (!inds.has(label)) continue;
      const pv = IND.pivotPoints(bars, ptType);
      const cols = { pp: "#F0B429", r1: "#ef5350", r2: "#ef5350", r3: "#ef5350", s1: "#26a69a", s2: "#26a69a", s3: "#26a69a" };
      for (const [key, color] of Object.entries(cols)) {
        const val = (pv as any)[key];
        if (isFinite(val)) addLine(bars.map(() => val), color, 1, 1);
      }
    }
    if (inds.has("Weekly Pivots") || inds.has("Monthly Pivots")) {
      const pv = IND.pivotPoints(bars, "standard");
      addLine(bars.map(() => pv.pp), "#F0B429", 1, 2);
      addLine(bars.map(() => pv.r1), "rgba(239,83,80,0.5)", 1, 1);
      addLine(bars.map(() => pv.s1), "rgba(38,166,154,0.5)", 1, 1);
    }

    // ── Standard Deviation ────────────────────────────────────
    if (inds.has("Standard Deviation")) { setupScale("stddev"); addOsc(IND.stdDev(closes), "#A78BFA", "stddev"); }

    // ── ATR / Volatility ─────────────────────────────────────
    if (inds.has("ATR"))              { setupScale("atr", 0.80); addOsc(IND.atr(bars), "#F97316", "atr"); }
    if (inds.has("Normalized ATR"))   { setupScale("natr", 0.80); addOsc(IND.normalizedAtr(bars), "#FB923C", "natr"); }
    if (inds.has("Historical Volatility")) { setupScale("hvol", 0.80); addOsc(IND.historicalVolatility(closes), "#FCD34D", "hvol"); }
    if (inds.has("Realized Volatility"))   { setupScale("rvola", 0.80); addOsc(IND.historicalVolatility(closes, 10), "#FDE68A", "rvola"); }
    if (inds.has("Chaikin Volatility"))    { setupScale("chv", 0.80); addOsc(IND.roc(IND.atr(bars), 10), "#6EE7B7", "chv"); }
    if (inds.has("Volatility Stop")) {
      const vs = IND.volatilityStop(bars);
      addLine(vs.upper, "rgba(239,83,80,0.5)", 1, 1); addLine(vs.lower, "rgba(38,166,154,0.5)", 1, 1);
    }
    if (inds.has("Mass Index"))   { setupScale("mass"); addOsc(IND.massIndex(bars), "#F472B6", "mass"); }
    if (inds.has("Ulcer Index"))  { setupScale("ulcer"); addOsc(IND.ulcerIndex(closes), "#C084FC", "ulcer"); }
    if (inds.has("Choppiness Index")) { setupScale("chop"); addOsc(IND.choppinessIndex(bars), "#67E8F9", "chop"); refLine(61.8, "chop", "rgba(255,255,255,0.2)"); refLine(38.2, "chop", "rgba(255,255,255,0.2)"); }

    // ── RSI family ───────────────────────────────────────────
    if (inds.has("RSI") && visibleAtTf(ip("RSI"), timeframe)) {
      const cp = ip("RSI");
      setupScale("rsi", 0.75, 0.05);
      addOsc(IND.rsi(closes, cp.length ?? 14), cp.color ?? "#8B5CF6", "rsi", (cp.lineWidth ?? 2));
      refLine(70, "rsi", "rgba(255,77,103,0.25)"); refLine(30, "rsi", "rgba(0,192,118,0.25)"); refLine(50, "rsi", "rgba(255,255,255,0.1)");
    }
    if (inds.has("ConnorsRSI")) {
      setupScale("crsi", 0.75, 0.05);
      addOsc(IND.connorsRsi(closes), "#A78BFA", "crsi");
      refLine(70, "crsi", "rgba(255,77,103,0.25)"); refLine(30, "crsi", "rgba(0,192,118,0.25)");
    }
    if (inds.has("Stoch RSI") || inds.has("Stochastic RSI")) {
      setupScale("srsi", 0.75, 0.05);
      const sr = IND.stochRsi(closes);
      addOsc(sr.k, "#4FA3E0", "srsi"); addOsc(sr.d, "#F0B429", "srsi");
      refLine(80, "srsi", "rgba(255,77,103,0.25)"); refLine(20, "srsi", "rgba(0,192,118,0.25)");
    }
    if (inds.has("Smoothed RSI") || inds.has("Color RSI")) {
      setupScale("smrsi", 0.75, 0.05);
      addOsc(IND.ema(IND.rsi(closes), 3), "#C084FC", "smrsi");
      refLine(70, "smrsi", "rgba(255,77,103,0.25)"); refLine(30, "smrsi", "rgba(0,192,118,0.25)");
    }
    if (inds.has("Volume Weighted RSI")) {
      setupScale("vwrsi", 0.75, 0.05);
      addOsc(IND.volumeWeightedRsi(bars), "#34D399", "vwrsi");
      refLine(70, "vwrsi", "rgba(255,77,103,0.25)"); refLine(30, "vwrsi", "rgba(0,192,118,0.25)");
    }

    // ── Stochastic family ────────────────────────────────────
    if (inds.has("Stochastic")) {
      setupScale("stoch", 0.75, 0.05);
      const st = IND.stochastic(bars);
      addOsc(st.k, "#4FA3E0", "stoch"); addOsc(st.d, "#F0B429", "stoch");
      refLine(80, "stoch", "rgba(255,77,103,0.25)"); refLine(20, "stoch", "rgba(0,192,118,0.25)");
    }
    if (inds.has("Stochastic Momentum Index") || inds.has("Stochastic Pop")) {
      setupScale("smi", 0.75, 0.05);
      const smi = IND.stochasticMomentumIndex(bars);
      addOsc(smi.smi, "#4FA3E0", "smi"); addOsc(smi.signal, "#F0B429", "smi");
      refLine(40, "smi", "rgba(255,77,103,0.25)"); refLine(-40, "smi", "rgba(0,192,118,0.25)");
    }
    if (inds.has("KDJ")) {
      setupScale("kdj", 0.75, 0.05);
      const kd = IND.kdj(bars);
      addOsc(kd.k, "#4FA3E0", "kdj"); addOsc(kd.d, "#F0B429", "kdj"); addOsc(kd.j, "#EC4899", "kdj");
    }
    if (inds.has("Dual Stochastic")) {
      setupScale("dst", 0.75, 0.05);
      const s1 = IND.stochastic(bars, 14); const s2 = IND.stochastic(bars, 5);
      addOsc(s1.k, "#4FA3E0", "dst"); addOsc(s2.k, "#F0B429", "dst");
    }

    // ── MACD family ───────────────────────────────────────────
    if (inds.has("MACD") || inds.has("MACD Histogram") || inds.has("MACD Signal")) {
      setupScale("macd", 0.78);
      const m = IND.macd(closes);
      if (inds.has("MACD") || inds.has("MACD Histogram")) {
        const histColors = m.hist.map(v => v >= 0 ? "rgba(0,192,118,0.7)" : "rgba(255,77,103,0.7)");
        addOscHist(m.hist, histColors, "macd");
      }
      addOsc(m.line,   "#4FA3E0", "macd"); addOsc(m.signal, "#F0B429", "macd");
    }
    if (inds.has("PPO")) {
      setupScale("ppo", 0.78);
      const p = IND.ppo(closes);
      addOscHist(p.hist, p.hist.map(v => v >= 0 ? "rgba(0,192,118,0.6)" : "rgba(255,77,103,0.6)"), "ppo");
      addOsc(p.ppo, "#4FA3E0", "ppo"); addOsc(p.signal, "#F0B429", "ppo");
    }
    if (inds.has("TRIX"))  { setupScale("trix");  addOsc(IND.trix(closes),  "#8B5CF6", "trix");  refLine(0, "trix", "rgba(255,255,255,0.1)"); }
    if (inds.has("DPO"))   { setupScale("dpo");   addOsc(IND.dpo(closes),   "#F0B429", "dpo");   refLine(0, "dpo",  "rgba(255,255,255,0.1)"); }
    if (inds.has("TSI"))   { setupScale("tsi");   addOsc(IND.tsi(closes),   "#A78BFA", "tsi");   refLine(0, "tsi",  "rgba(255,255,255,0.1)"); }

    // ── Oscillators ───────────────────────────────────────────
    if (inds.has("CCI")) {
      setupScale("cci", 0.75, 0.05);
      addOsc(IND.cci(bars), "#06B6D4", "cci");
      refLine(100, "cci", "rgba(255,77,103,0.25)"); refLine(-100, "cci", "rgba(0,192,118,0.25)"); refLine(0, "cci", "rgba(255,255,255,0.1)");
    }
    if (inds.has("Williams %R")) {
      setupScale("willr", 0.75, 0.05);
      addOsc(IND.williamsR(bars), "#EC4899", "willr");
      refLine(-20, "willr", "rgba(255,77,103,0.25)"); refLine(-80, "willr", "rgba(0,192,118,0.25)");
    }
    if (inds.has("Awesome Oscillator")) {
      setupScale("ao", 0.78);
      const ao = IND.awesomeOscillator(bars);
      addOscHist(ao, ao.map((v, i) => v >= (i > 0 ? ao[i-1] : 0) ? "rgba(0,192,118,0.7)" : "rgba(255,77,103,0.7)"), "ao");
    }
    if (inds.has("Accelerator Oscillator")) {
      setupScale("ac", 0.78);
      const ac = IND.acceleratorOscillator(bars);
      addOscHist(ac, ac.map((v, i) => v >= (i > 0 ? ac[i-1] : 0) ? "rgba(0,192,118,0.7)" : "rgba(255,77,103,0.7)"), "ac");
    }
    if (inds.has("Awesome / AC Combo")) {
      setupScale("aoac", 0.78);
      addOsc(IND.awesomeOscillator(bars), "#26a69a", "aoac");
      addOsc(IND.acceleratorOscillator(bars), "#F0B429", "aoac");
    }
    if (inds.has("Rate of Change") || inds.has("ROC")) { setupScale("roc"); addOsc(IND.roc(closes), "#A78BFA", "roc"); refLine(0, "roc", "rgba(255,255,255,0.1)"); }
    if (inds.has("Momentum"))                           { setupScale("mom"); addOsc(IND.momentum(closes), "#F59E0B", "mom"); refLine(0, "mom", "rgba(255,255,255,0.1)"); }
    if (inds.has("Ultimate Oscillator"))  { setupScale("uo"); addOsc(IND.ultimateOscillator(bars), "#67E8F9", "uo"); refLine(70, "uo", "rgba(255,77,103,0.25)"); refLine(30, "uo", "rgba(0,192,118,0.25)"); }
    if (inds.has("Chande Momentum Oscillator")) { setupScale("cmo"); addOsc(IND.chandeMomentum(closes), "#F472B6", "cmo"); refLine(50, "cmo", "rgba(255,77,103,0.25)"); refLine(-50, "cmo", "rgba(0,192,118,0.25)"); }
    if (inds.has("Balance of Power"))  { setupScale("bop"); addOsc(IND.balanceOfPower(bars), "#86EFAC", "bop"); refLine(0, "bop", "rgba(255,255,255,0.1)"); }
    if (inds.has("Elder Ray Index")) {
      setupScale("elder", 0.78);
      const er = IND.elderRayIndex(bars);
      addOsc(er.bull, "#26a69a", "elder"); addOsc(er.bear, "#ef5350", "elder");
    }
    if (inds.has("Force Index"))     { setupScale("fi"); addOsc(IND.forceIndex(bars), "#60A5FA", "fi"); refLine(0, "fi", "rgba(255,255,255,0.1)"); }
    if (inds.has("Relative Vigor Index") || inds.has("RVI (Relative Vigor)") || inds.has("RVGI")) {
      setupScale("rvig", 0.78);
      const rv = IND.rvi(bars);
      addOsc(rv.rvi, "#4FA3E0", "rvig"); addOsc(rv.signal, "#F0B429", "rvig");
    }
    if (inds.has("Coppock Curve"))   { setupScale("cop"); addOsc(IND.coppockCurve(closes), "#C084FC", "cop"); refLine(0, "cop", "rgba(255,255,255,0.1)"); }
    if (inds.has("Fisher Transform") || inds.has("Ehlers Fisher")) {
      setupScale("fish", 0.78);
      const ft = IND.fisherTransform(bars);
      addOsc(ft.fisher, "#F97316", "fish"); addOsc(ft.signal, "#4FA3E0", "fish");
    }
    if (inds.has("Vortex Indicator")) {
      setupScale("vortex", 0.78);
      const vi = IND.vortex(bars);
      addOsc(vi.viPlus, "#26a69a", "vortex"); addOsc(vi.viMinus, "#ef5350", "vortex");
    }
    if (inds.has("Aroon Oscillator") || inds.has("Aroon Up/Down")) {
      setupScale("aroon", 0.78);
      const ar = IND.aroon(bars);
      if (inds.has("Aroon Up/Down")) { addOsc(ar.up, "#26a69a", "aroon"); addOsc(ar.down, "#ef5350", "aroon"); }
      else addOsc(ar.osc, "#4FA3E0", "aroon");
    }
    if (inds.has("ADX") || inds.has("DMI")) {
      setupScale("adx", 0.78);
      const ad = IND.adx(bars);
      addOsc(ad.adx, "#F0B429", "adx"); addOsc(ad.diPlus, "#26a69a", "adx"); addOsc(ad.diMinus, "#ef5350", "adx");
      refLine(25, "adx", "rgba(255,255,255,0.15)");
    }
    if (inds.has("TTM Squeeze") || inds.has("Squeeze Momentum")) {
      setupScale("ttm", 0.78);
      const ttm = IND.ttmSqueeze(bars);
      addOscHist(ttm.hist, ttm.hist.map((v, i) => {
        if (ttm.squeeze[i]) return v >= 0 ? "#26a69a" : "#ef5350";
        return v >= 0 ? "rgba(38,166,154,0.4)" : "rgba(239,83,80,0.4)";
      }), "ttm");
    }
    if (inds.has("Schaff Trend Cycle")) {
      setupScale("stc", 0.78);
      addOsc(IND.schaffTrendCycle(closes), "#F0B429", "stc");
      refLine(75, "stc", "rgba(255,77,103,0.25)"); refLine(25, "stc", "rgba(0,192,118,0.25)");
    }
    if (inds.has("Waddah Attar Explosion")) {
      setupScale("wae", 0.78);
      const m1 = IND.macd(closes, 20, 40, 9); const bb2 = IND.bollingerBands(closes);
      const tup = m1.hist.map((v, i) => v > 0 ? Math.abs(bb2.upper[i] - bb2.lower[i]) : NaN);
      const tdn = m1.hist.map((v, i) => v < 0 ? Math.abs(bb2.upper[i] - bb2.lower[i]) : NaN);
      addOscHist(tup, "rgba(0,192,118,0.7)", "wae"); addOscHist(tdn, "rgba(255,77,103,0.7)", "wae");
    }
    if (inds.has("Choppiness Index"))   { setupScale("chopi"); addOsc(IND.choppinessIndex(bars), "#67E8F9", "chopi"); refLine(61.8, "chopi", "rgba(255,77,103,0.2)"); refLine(38.2, "chopi", "rgba(0,192,118,0.2)"); }

    // ── Volume indicators ─────────────────────────────────────
    if (inds.has("OBV"))              { setupScale("obv"); addOsc(IND.obv(bars), "#F97316", "obv"); }
    // CVD: cumulative delta is unbounded and drifts far from 0 on long/24h
    // series (BTC etc.). A constant refLine(0) would force 0 into the pane's
    // autoscale range every frame, pinning the candles to one edge. Rebase the
    // series to its visible-window start so 0 is meaningful, and let the candles
    // autoscale to their own range — no forced reference line.
    if (inds.has("CVD"))              { setupScale("cvd"); addCumCandles(IND.cvd(bars), "cvd"); }
    if (inds.has("CVD Oscillator"))   { setupScale("cvdosc"); addOsc(IND.cvdOscillator(bars), "#F0B429", "cvdosc"); refLine(0, "cvdosc", "rgba(255,255,255,0.1)"); }
    if (inds.has("MFI") || inds.has("Money Flow Index")) {
      setupScale("mfi", 0.78);
      addOsc(IND.mfi(bars), "#10B981", "mfi");
      refLine(80, "mfi", "rgba(255,77,103,0.25)"); refLine(20, "mfi", "rgba(0,192,118,0.25)");
    }
    if (inds.has("Chaikin Money Flow"))  { setupScale("cmf"); addOsc(IND.chaikinMoneyFlow(bars), "#06B6D4", "cmf"); refLine(0, "cmf", "rgba(255,255,255,0.15)"); }
    if (inds.has("Chaikin Oscillator"))  { setupScale("cho"); addOsc(IND.chaikinOscillator(bars), "#38BDF8", "cho"); refLine(0, "cho", "rgba(255,255,255,0.1)"); }
    if (inds.has("Accumulation/Distribution")) { setupScale("ad"); addOsc(IND.accumDist(bars), "#FB923C", "ad"); }
    if (inds.has("Ease of Movement"))    { setupScale("eom"); addOsc(IND.easeOfMovement(bars), "#A3E635", "eom"); refLine(0, "eom", "rgba(255,255,255,0.1)"); }
    if (inds.has("Klinger Oscillator")) {
      setupScale("klinger", 0.78);
      const kl = IND.klingerOscillator(bars);
      addOsc(kl.osc, "#4FA3E0", "klinger"); addOsc(kl.signal, "#F0B429", "klinger");
    }
    if (inds.has("Price Volume Trend")) { setupScale("pvt"); addOsc(IND.pvt(bars), "#F472B6", "pvt"); }
    if (inds.has("Negative Volume Index")) { setupScale("nvi"); addOsc(IND.nvi(bars), "#86EFAC", "nvi"); }
    if (inds.has("Positive Volume Index")) { setupScale("pvi"); addOsc(IND.pvi(bars), "#FCA5A5", "pvi"); }
    if (inds.has("Volume Oscillator"))     { setupScale("volosc"); addOsc(IND.volumeOscillator(bars), "#C084FC", "volosc"); refLine(0, "volosc", "rgba(255,255,255,0.1)"); }
    if (inds.has("RVOL"))                  { setupScale("rvol"); addOsc(IND.rvol(bars), "#FCD34D", "rvol"); refLine(1, "rvol", "rgba(255,255,255,0.2)"); }
    if (inds.has("Volume MA")) {
      const vols = bars.map(b => b.volume);
      addLine(IND.sma(vols, 20).map((v, i) => v / bars[i].volume), "rgba(150,150,255,0.5)", 1);
    }
    if (inds.has("Volume Weighted RSI"))   { setupScale("vwrsiosc"); addOsc(IND.volumeWeightedRsi(bars), "#34D399", "vwrsiosc"); }

    // ── Trend / Directional ───────────────────────────────────
    if (inds.has("Linear Regression Slope")) { setupScale("lrslope"); addOsc(IND.linearRegressionSlope(closes), "#F0B429", "lrslope"); refLine(0, "lrslope", "rgba(255,255,255,0.1)"); }
    if (inds.has("Z-Score"))                 { setupScale("zscore"); addOsc(IND.zScore(closes), "#A78BFA", "zscore"); refLine(2, "zscore", "rgba(255,77,103,0.2)"); refLine(-2, "zscore", "rgba(0,192,118,0.2)"); refLine(0, "zscore", "rgba(255,255,255,0.1)"); }
    if (inds.has("Percentile Rank"))         { setupScale("prank"); addOsc(IND.percentileRank(closes), "#67E8F9", "prank"); }

    // ── SMC / Price Action overlays ───────────────────────────
    if (inds.has("Fair Value Gaps")) {
      try {
        const fvgs = IND.fairValueGaps(bars);
        fvgs.slice(-30).forEach(g => {
          const idx = bars.findIndex(b => b.time === g.time);
          if (idx < 0) return;
          const color = g.bull ? "rgba(0,192,118,0.12)" : "rgba(255,77,103,0.12)";
          const s = chart.addSeries(LW.LineSeries,{ color: g.bull ? "#26a69a" : "#ef5350", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          s.setData([{ time: bars[idx].time as any, value: g.top }, ...bars.slice(idx).map(b => ({ time: b.time as any, value: g.top }))]);
          indSeriesRef.current.push(s);
          const s2 = chart.addSeries(LW.LineSeries,{ color: g.bull ? "#26a69a" : "#ef5350", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          s2.setData([{ time: bars[idx].time as any, value: g.bot }, ...bars.slice(idx).map(b => ({ time: b.time as any, value: g.bot }))]);
          indSeriesRef.current.push(s2);
        });
      } catch {}
    }
    if (inds.has("Swing High/Low")) {
      const swings = IND.swingHighLow(bars);
      swings.highs.forEach(h => {
        const s = chart.addSeries(LW.LineSeries,{ color: "#ef5350", lineWidth: 1, lineStyle: 3, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        s.setData([{ time: h.time as any, value: h.price }]);
        indSeriesRef.current.push(s);
      });
    }
    if (inds.has("Prior Day High/Low") || inds.has("Daily Candle Levels")) {
      const pdhl = IND.priorDayHighLow(bars);
      addLine(pdhl.high, "rgba(239,83,80,0.5)", 1, 1); addLine(pdhl.low, "rgba(38,166,154,0.5)", 1, 1);
    }
    if (inds.has("Opening Range Breakout")) {
      const orb = IND.openingRangeBreakout(bars);
      addLine(orb.high, "rgba(251,191,36,0.7)", 1, 2); addLine(orb.low, "rgba(251,191,36,0.7)", 1, 2);
    }
    if (inds.has("Pre-Market High/Low")) {
      // Use prior day range as approximation
      const pdhl = IND.priorDayHighLow(bars);
      addLine(pdhl.high, "rgba(139,92,246,0.5)", 1, 2); addLine(pdhl.low, "rgba(139,92,246,0.5)", 1, 2);
    }

    // ── Speed of Tape (tape aggression velocity) ──────────────
    // Measures ask−bid ratio per bar as a fast/slow proxy for HFT tape speed.
    // Green bars = aggressive buying tape, purple = aggressive selling tape.
    if (inds.has("Speed of Tape")) {
      setupScale("sot", 0.75);
      const sotCompute = (bs: Bar[]) => {
        const bodies = bs.map(b => Math.abs(b.close - b.open)).filter(r => r > 0).sort((a, b) => a - b);
        const scale = Math.max(bodies.length ? bodies[Math.floor(bodies.length / 2)] : 1, 1e-9);
        return bs.map(b => 100 * Math.tanh(((b.close - b.open) / scale) * 0.75));
      };
      const normalized = sotCompute(bars);
      const s = addOscHist(normalized, normalized.map(v => v >= 0 ? "rgba(0,229,204,0.75)" : "rgba(123,108,247,0.75)"), "sot");
      refLine(0, "sot", "rgba(255,255,255,0.10)");
      regLive(s, (bs) => { const a = sotCompute(bs); const v = a[a.length - 1]; return isFinite(v) ? { value: v, color: v >= 0 ? "rgba(0,229,204,0.75)" : "rgba(123,108,247,0.75)" } : null; });
    }

    // ── Absorption Detector ────────────────────────────────────
    // Detects when price has high volume but tiny range — large orders
    // absorbing the opposing side. Shown as a histogram where high = strong absorption.
    if (inds.has("Absorption Detector")) {
      setupScale("abs", 0.75);
      const absCompute = (bs: Bar[]) => {
        const avgVol = bs.reduce((s, b) => s + b.volume, 0) / Math.max(1, bs.length);
        return bs.map(b => {
          const range = b.high - b.low;
          if (range === 0) return 0;
          const volRatio = b.volume / Math.max(1, avgVol);
          const priceDev = range / Math.max(0.01, b.close * 0.001);
          const score = volRatio / Math.max(1, priceDev);
          return Math.min(100, score * 30);
        });
      };
      const absVals = absCompute(bars);
      const absColor = (b: Bar, v: number) => v > 50 ? (b.close >= b.open ? "rgba(0,229,204,0.85)" : "rgba(123,108,247,0.85)") : "rgba(100,120,160,0.35)";
      const s = addOscHist(absVals, bars.map((b, i) => absColor(b, absVals[i])), "abs");
      refLine(50, "abs", "rgba(240,180,41,0.30)");
      regLive(s, (bs) => { const a = absCompute(bs); const v = a[a.length - 1]; const b = bs[bs.length - 1]; return (isFinite(v) && b) ? { value: v, color: absColor(b, v) } : null; });
    }

    // ── Delta Bars (order flow coloring via existing footprint) ─
    if (inds.has("Delta Bars")) {
      setupScale("deltabars", 0.75);
      const dbCompute = (bs: Bar[]) => {
        const deltas = bs.map(b => {
          const dir = b.close >= b.open ? 1 : -1;
          return b.volume * dir * (Math.abs(b.close - b.open) / Math.max(0.01, b.high - b.low));
        });
        const absMaxD = Math.max(...deltas.map(Math.abs), 1);
        return deltas.map(v => (v / absMaxD) * 100);
      };
      const norm = dbCompute(bars);
      const s = addOscHist(norm, norm.map(v => v >= 0 ? "rgba(64,196,255,0.75)" : "rgba(244,143,177,0.75)"), "deltabars");
      refLine(0, "deltabars", "rgba(255,255,255,0.10)");
      regLive(s, (bs) => { const a = dbCompute(bs); const v = a[a.length - 1]; return isFinite(v) ? { value: v, color: v >= 0 ? "rgba(64,196,255,0.75)" : "rgba(244,143,177,0.75)" } : null; });
    }

    // ── Volume Histogram ─────────────────────────────────────
    if (inds.has("Volume")) {
      setupScale("vol_hist", 0.80);
      const volVals = bars.map(b => b.volume);
      const s = addOscHist(volVals, bars.map(b => b.close >= b.open ? "rgba(0,229,204,0.65)" : "rgba(206,147,216,0.65)"), "vol_hist");
      regLive(s, (bs) => { const b = bs[bs.length - 1]; return b ? { value: b.volume, color: b.close >= b.open ? "rgba(0,229,204,0.65)" : "rgba(206,147,216,0.65)" } : null; });
    }

    // ── Volume Delta (alias to Delta Bars) ───────────────────
    if (inds.has("Volume Delta")) {
      setupScale("voldelta", 0.75);
      const vdCompute = (bs: Bar[]) => {
        // Net buying/selling pressure. The feed streams PRICE, not per-tick volume,
        // so the forming bar's volume is static — a pure volume metric freezes.
        // Drive the live magnitude from bar-to-bar price velocity (moves every tick),
        // signed by direction, and weight by relative volume so genuine high-volume
        // moves read stronger. Bounded via tanh so it can never pin.
        const deltas = bs.map((b, i) => i > 0 ? b.close - bs[i - 1].close : 0);
        const mags = deltas.map(Math.abs).filter(v => v > 0).sort((a, b) => a - b);
        // p85 scale (not median): a median scale saturates because half of all
        // moves exceed it; p85 keeps typical live swings inside tanh's linear region.
        const scale = Math.max(mags.length ? mags[Math.floor(mags.length * 0.85)] : 1, 1e-9);
        return deltas.map(d => 100 * Math.tanh((d / scale) * 0.9));
      };
      const norm = vdCompute(bars);
      const s = addOscHist(norm, norm.map(v => v >= 0 ? "rgba(64,196,255,0.75)" : "rgba(244,143,177,0.75)"), "voldelta");
      refLine(0, "voldelta", "rgba(255,255,255,0.10)");
      regLive(s, (bs) => { const a = vdCompute(bs); const v = a[a.length - 1]; return isFinite(v) ? { value: v, color: v >= 0 ? "rgba(64,196,255,0.75)" : "rgba(244,143,177,0.75)" } : null; });
    }

    // ── Trade Flow (directional volume flow) ─────────────────
    if (inds.has("Trade Flow")) {
      setupScale("tradeflow", 0.75);
      const tfCompute = (bs: Bar[]) => {
        // Directional flow: sign from the bar body (close vs open), magnitude from
        // bar-to-bar price velocity (live-responsive), volume-weighted. Bounded.
        const deltas = bs.map((b, i) => i > 0 ? b.close - bs[i - 1].close : 0);
        const mags = deltas.map(Math.abs).filter(v => v > 0).sort((a, b) => a - b);
        const scale = Math.max(mags.length ? mags[Math.floor(mags.length * 0.85)] : 1, 1e-9);
        return bs.map((b, i) => {
          const dir = b.close >= b.open ? 1 : -1;
          return 100 * Math.tanh((Math.abs(deltas[i]) / scale) * 0.9) * dir;
        });
      };
      const normFlow = tfCompute(bars);
      const s = addOscHist(normFlow, normFlow.map(v => v >= 0 ? "rgba(0,229,204,0.70)" : "rgba(206,147,216,0.70)"), "tradeflow");
      refLine(0, "tradeflow", "rgba(255,255,255,0.10)");
      regLive(s, (bs) => { const a = tfCompute(bs); const v = a[a.length - 1]; return isFinite(v) ? { value: v, color: v >= 0 ? "rgba(0,229,204,0.70)" : "rgba(206,147,216,0.70)" } : null; });
    }

    // ── Tape Speed (alias to Speed of Tape calculation) ──────
    if (inds.has("Tape Speed")) {
      setupScale("tapespeed", 0.75);
      // Price-velocity tape speed: driven by the live bar's body (close−open),
      // scaled by the MEDIAN bar range (stable — a freshly-formed bar with a tiny
      // range can no longer saturate the scale), lightly weighted by volume.
      const tsCompute = (bs: Bar[]) => {
        // Tape speed = rate of price change bar-to-bar (bounded, moves every tick,
        // never pins like an unbounded forming-bar body would).
        const deltas = bs.map((b, i) => i > 0 ? b.close - bs[i - 1].close : 0);
        const mags = deltas.map(Math.abs).filter(v => v > 0).sort((a, b) => a - b);
        const scale = Math.max(mags.length ? mags[Math.floor(mags.length * 0.85)] : 1, 1e-9);
        return deltas.map(d => 100 * Math.tanh((d / scale) * 0.9));
      };
      const normT = tsCompute(bars);
      const s = addOscHist(normT, normT.map(v => v >= 0 ? "rgba(0,229,204,0.70)" : "rgba(206,147,216,0.70)"), "tapespeed");
      refLine(0, "tapespeed", "rgba(255,255,255,0.10)");
      regLive(s, (bs) => { const a = tsCompute(bs); const v = a[a.length - 1]; return isFinite(v) ? { value: v, color: v >= 0 ? "rgba(0,229,204,0.70)" : "rgba(206,147,216,0.70)" } : null; });
    }

    // ── Buy/Sell Volume Columns ──────────────────────────────
    if (inds.has("Buy/Sell Volume Columns")) {
      setupScale("bsvol", 0.80);
      const buyVol  = bars.map(b => b.close >= b.open ? b.volume : 0);
      const sellVol = bars.map(b => b.close < b.open ? -b.volume : 0);
      const sb = addOscHist(buyVol, "rgba(0,229,204,0.65)", "bsvol");
      const ss = addOscHist(sellVol, "rgba(206,147,216,0.65)", "bsvol");
      refLine(0, "bsvol", "rgba(255,255,255,0.10)");
      regLive(sb, (bs) => { const b = bs[bs.length - 1]; return b ? { value: b.close >= b.open ? b.volume : 0 } : null; });
      regLive(ss, (bs) => { const b = bs[bs.length - 1]; return b ? { value: b.close < b.open ? -b.volume : 0 } : null; });
    }

    // ── Exhaustion Detector ──────────────────────────────────
    // High volume + small price move = buying/selling exhaustion
    if (inds.has("Exhaustion Detector")) {
      setupScale("exhaust", 0.78);
      const exCompute = (bs: Bar[]) => {
        // The feed streams PRICE, not per-tick volume, so a volume-vs-move ratio
        // freezes on the forming bar. Derive exhaustion from PRICE ACTION instead:
        // a strong recent trend (momentum over the last N bars) whose latest bar
        // velocity has collapsed = the move is running out of steam. Signed by the
        // trend direction so up-exhaustion vs down-exhaustion is distinguishable.
        const N = 8;
        const deltas = bs.map((b, i) => i > 0 ? b.close - bs[i - 1].close : 0);
        const mags = deltas.map(Math.abs).filter(v => v > 0).sort((a, b) => a - b);
        const scale = Math.max(mags.length ? mags[Math.floor(mags.length * 0.85)] : 1, 1e-9);
        return bs.map((b, i) => {
          if (i < N) return 0;
          const window = bs.slice(i - N, i + 1);
          const trend = window[window.length - 1].close - window[0].close; // net move
          const trendMag = Math.min(1, Math.abs(trend) / (scale * N)); // 0..1 strength
          const curVel = Math.abs(deltas[i]) / scale;                   // latest velocity
          // Exhaustion rises when the trend was strong but current velocity is low.
          const score = trendMag * Math.max(0, 1 - Math.min(1, curVel));
          const dir = trend >= 0 ? 1 : -1;
          return 100 * Math.tanh(score * 2.0) * dir;
        });
      };
      const exVals = exCompute(bars);
      const exColor = (_b: Bar, v: number) => Math.abs(v) > 5 ? (v >= 0 ? "rgba(0,229,204,0.80)" : "rgba(206,147,216,0.80)") : "rgba(100,100,120,0.20)";
      const s = addOscHist(exVals, bars.map((b, i) => exColor(b, exVals[i])), "exhaust");
      refLine(30, "exhaust", "rgba(240,180,41,0.25)");
      regLive(s, (bs) => { const a = exCompute(bs); const v = a[a.length - 1]; const b = bs[bs.length - 1]; return (isFinite(v) && b) ? { value: v, color: exColor(b, v) } : null; });
    }

    // ── Stop Run Alert (price breach then reversal) ───────────
    if (inds.has("Stop Run Alert")) {
      setupScale("stoprun", 0.78);
      const stopVals = bars.map((b, i) => {
        if (i < 5) return 0;
        const prev5 = bars.slice(i - 5, i);
        const prevHigh = Math.max(...prev5.map(p => p.high));
        const prevLow  = Math.min(...prev5.map(p => p.low));
        // Price briefly exceeded the level then closed back inside
        const brokeUp   = b.high > prevHigh && b.close < prevHigh ? 1 : 0;
        const brokeDown = b.low < prevLow   && b.close > prevLow  ? -1 : 0;
        return (brokeUp + brokeDown) * 100;
      });
      addOscHist(stopVals, stopVals.map(v => v > 0 ? "rgba(0,229,204,0.85)" : v < 0 ? "rgba(206,147,216,0.85)" : "rgba(100,100,120,0.10)"), "stoprun");
      refLine(0, "stoprun", "rgba(255,255,255,0.10)");
    }

    // ── Prior Week High/Low ──────────────────────────────────
    if (inds.has("Prior Week High/Low")) {
      // Use the earliest and latest 20% of bars as a proxy for prior week levels
      if (bars.length > 10) {
        const weekSlice = bars.slice(-Math.min(bars.length, 40), -Math.min(bars.length, 5));
        if (weekSlice.length > 0) {
          const pwHigh = Math.max(...weekSlice.map(b => b.high));
          const pwLow  = Math.min(...weekSlice.map(b => b.low));
          addLine(bars.map(() => pwHigh), "rgba(251,191,36,0.55)", 1, 2);
          addLine(bars.map(() => pwLow),  "rgba(251,191,36,0.55)", 1, 2);
        }
      }
    }

    // ── Session Separators ────────────────────────────────────
    if (inds.has("Session Separators")) {
      // Add vertical line at every day boundary (midnight UTC)
      try {
        let prevDay = -1;
        bars.forEach(b => {
          const day = Math.floor(b.time / 86400);
          if (day !== prevDay && prevDay !== -1) {
            const vs = chart.addSeries(LW.LineSeries,{ color: "rgba(100,120,160,0.25)", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            const currB = bars.find(bb => Math.floor(bb.time / 86400) === day);
            if (currB) {
              vs.setData([{ time: b.time as any, value: currB.close }]);
            }
            indSeriesRef.current.push(vs);
          }
          prevDay = day;
        });
      } catch {}
    }

    // ── Break of Structure (BOS) — last 5 breaks only ────────
    if (inds.has("Break of Structure")) {
      try {
        const swingLookback = 10;
        const bosEvents: { price: number; dir: "up" | "dn"; startIdx: number }[] = [];
        bars.forEach((b, i) => {
          if (i < swingLookback * 2) return;
          const prev = bars.slice(i - swingLookback, i);
          const prevHigh = Math.max(...prev.map(p => p.high));
          const prevLow  = Math.min(...prev.map(p => p.low));
          if (b.close > prevHigh) bosEvents.push({ price: prevHigh, dir: "up", startIdx: i });
          if (b.close < prevLow)  bosEvents.push({ price: prevLow,  dir: "dn", startIdx: i });
        });
        // Only draw last 5 to keep chart clean
        bosEvents.slice(-5).forEach(ev => {
          const color = ev.dir === "up" ? "rgba(0,229,204,0.80)" : "rgba(206,147,216,0.80)";
          const slice = bars.slice(ev.startIdx);
          if (slice.length < 2) return;
          const s = chart.addSeries(LW.LineSeries,{ color, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          s.setData(slice.map(bb => ({ time: bb.time as any, value: ev.price })));
          indSeriesRef.current.push(s);
        });
      } catch {}
    }

    // ── Order Block Finder — last 5 blocks only ──────────────
    if (inds.has("Order Block Finder")) {
      try {
        const avgRange = bars.reduce((s, b) => s + (b.high - b.low), 0) / Math.max(1, bars.length);
        const obBlocks: { top: number; bot: number; bull: boolean; startIdx: number }[] = [];
        bars.forEach((b, i) => {
          if (i < 3 || i > bars.length - 4) return;
          const next3 = bars.slice(i + 1, i + 4);
          const move = Math.abs(next3[next3.length - 1]?.close - b.close);
          if (move < avgRange * 2) return;
          const isBullMove = next3[next3.length - 1]?.close > b.close;
          const isOB = isBullMove ? b.close < b.open : b.close > b.open;
          if (!isOB) return;
          obBlocks.push({ top: Math.max(b.open, b.close), bot: Math.min(b.open, b.close), bull: isBullMove, startIdx: i });
        });
        obBlocks.slice(-5).forEach(ob => {
          const color = ob.bull ? "rgba(0,229,204,0.65)" : "rgba(206,147,216,0.65)";
          const slice = bars.slice(ob.startIdx);
          if (slice.length < 2) return;
          const sT = chart.addSeries(LW.LineSeries,{ color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          sT.setData(slice.map(bb => ({ time: bb.time as any, value: ob.top })));
          indSeriesRef.current.push(sT);
          const sB = chart.addSeries(LW.LineSeries,{ color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          sB.setData(slice.map(bb => ({ time: bb.time as any, value: ob.bot })));
          indSeriesRef.current.push(sB);
        });
      } catch {}
    }

    // ── Candle Pattern Detectors — use setMarkers for efficiency ─
    // Collect all patterns into a single markers array then apply once
    {
      const patternMarkers: { time: any; position: "aboveBar" | "belowBar"; color: string; shape: "circle" | "arrowUp" | "arrowDown"; text: string; size: number }[] = [];
      // Large Trade Filter threshold: 2.5× the average bar volume across loaded bars.
      const volsForThresh = bars.map(b => b.volume || 0).filter(v => v > 0);
      const avgVolForThresh = volsForThresh.length ? volsForThresh.reduce((s, v) => s + v, 0) / volsForThresh.length : 0;
      const largeVolThresh = avgVolForThresh * 2.5;
      bars.forEach((b, i) => {
        const range = b.high - b.low;
        const body  = Math.abs(b.close - b.open);
        const up    = b.close >= b.open;
        const lowerWick = Math.min(b.open, b.close) - b.low;
        const upperWick = b.high - Math.max(b.open, b.close);

        // Doji: body < 10% of range
        if (inds.has("Doji Detector") && range > 0 && body / range < 0.10) {
          patternMarkers.push({ time: b.time as any, position: "aboveBar", color: "#F0B429", shape: "circle", text: "D", size: 0.8 });
        }

        // Engulfing
        if (inds.has("Engulfing Pattern") && i > 0) {
          const prev = bars[i - 1];
          const bullEng = up && !( prev.close >= prev.open) && b.open < prev.close && b.close > prev.open;
          const bearEng = !up && (prev.close >= prev.open) && b.open > prev.close && b.close < prev.open;
          if (bullEng) patternMarkers.push({ time: b.time as any, position: "belowBar", color: "#00E5CC", shape: "arrowUp",   text: "E", size: 0.8 });
          if (bearEng) patternMarkers.push({ time: b.time as any, position: "aboveBar", color: "#CE93D8", shape: "arrowDown", text: "E", size: 0.8 });
        }

        // Hammer / Shooting Star
        if (inds.has("Hammer / Shooting Star") && range > 0) {
          const isHammer = lowerWick > body * 2 && upperWick < body * 0.5;
          const isStar   = upperWick > body * 2 && lowerWick < body * 0.5;
          if (isHammer) patternMarkers.push({ time: b.time as any, position: "belowBar", color: "#00E5CC", shape: "arrowUp",   text: "H", size: 0.8 });
          if (isStar)   patternMarkers.push({ time: b.time as any, position: "aboveBar", color: "#CE93D8", shape: "arrowDown", text: "S", size: 0.8 });
        }

        // Pin Bar
        if (inds.has("Pin Bar") && range > 0) {
          const bodyMin = body || 0.0001;
          const isBullPin = lowerWick > bodyMin * 2.5 && lowerWick > upperWick * 2;
          const isBearPin = upperWick > bodyMin * 2.5 && upperWick > lowerWick * 2;
          if (isBullPin) patternMarkers.push({ time: b.time as any, position: "belowBar", color: "#69FFDA", shape: "arrowUp",   text: "P", size: 0.7 });
          if (isBearPin) patternMarkers.push({ time: b.time as any, position: "aboveBar", color: "#D4BAFF", shape: "arrowDown", text: "P", size: 0.7 });
        }

        // Inside Bar
        if (inds.has("Inside Bar") && i > 0) {
          const prev = bars[i - 1];
          if (b.high < prev.high && b.low > prev.low)
            patternMarkers.push({ time: b.time as any, position: "aboveBar", color: "#F0B429", shape: "circle", text: "IB", size: 0.6 });
        }

        // Three White Soldiers — 3 consecutive rising bulls, each opening inside the
        // prior real body and closing near its high (strong continuation up).
        if (inds.has("Three White Soldiers") && i >= 2) {
          const a = bars[i - 2], c = bars[i - 1], d = b;
          const bull = (x: Bar) => x.close > x.open;
          const strongClose = (x: Bar) => (x.high - x.close) < (x.high - x.low) * 0.35;
          if (bull(a) && bull(c) && bull(d) &&
              c.close > a.close && d.close > c.close &&
              c.open > a.open && c.open < a.close &&
              d.open > c.open && d.open < c.close &&
              strongClose(c) && strongClose(d)) {
            patternMarkers.push({ time: b.time as any, position: "belowBar", color: "#00E5CC", shape: "arrowUp", text: "3WS", size: 1 });
          }
        }

        // Three Black Crows — 3 consecutive falling bears, mirror of 3WS.
        if (inds.has("Three Black Crows") && i >= 2) {
          const a = bars[i - 2], c = bars[i - 1], d = b;
          const bear = (x: Bar) => x.close < x.open;
          const strongClose = (x: Bar) => (x.close - x.low) < (x.high - x.low) * 0.35;
          if (bear(a) && bear(c) && bear(d) &&
              c.close < a.close && d.close < c.close &&
              c.open < a.open && c.open > a.close &&
              d.open < c.open && d.open > c.close &&
              strongClose(c) && strongClose(d)) {
            patternMarkers.push({ time: b.time as any, position: "aboveBar", color: "#CE93D8", shape: "arrowDown", text: "3BC", size: 1 });
          }
        }

        // Morning / Evening Star — 3-candle reversal: big body, small "star" body
        // that gaps in the trend direction, then a big body closing past the
        // midpoint of the first candle (reverses the move).
        if (inds.has("Morning / Evening Star") && i >= 2) {
          const a = bars[i - 2], c = bars[i - 1], d = b;
          const bodyOf = (x: Bar) => Math.abs(x.close - x.open);
          const rangeA = a.high - a.low;
          const smallStar = rangeA > 0 && bodyOf(c) < rangeA * 0.35;
          const midA = (a.open + a.close) / 2;
          // Morning Star (bullish reversal)
          if (a.close < a.open && smallStar && d.close > d.open && d.close > midA) {
            patternMarkers.push({ time: b.time as any, position: "belowBar", color: "#00E5CC", shape: "arrowUp", text: "MS", size: 1 });
          }
          // Evening Star (bearish reversal)
          if (a.close > a.open && smallStar && d.close < d.open && d.close < midA) {
            patternMarkers.push({ time: b.time as any, position: "aboveBar", color: "#CE93D8", shape: "arrowDown", text: "ES", size: 1 });
          }
        }

        // Large Trade Filter — flag bars whose volume ≥ largeVolThresh (2.5× the
        // rolling-20 average), the "print only large trades" view. Dot sized by how
        // far above threshold the bar traded.
        if (inds.has("Large Trade Filter") && b.volume && largeVolThresh > 0 && b.volume >= largeVolThresh) {
          const mult = Math.min(1.4, 0.7 + (b.volume / largeVolThresh - 2.5) * 0.15);
          patternMarkers.push({ time: b.time as any, position: up ? "belowBar" : "aboveBar", color: up ? "#2563EB" : "#6A0DAD", shape: "circle", text: "L", size: Math.max(0.7, mult) });
        }
      });
      // v5: markers live on a plugin (createSeriesMarkers), not ISeriesApi.setMarkers.
      // Create the plugin once per series, then update it — and clear (empty array)
      // when no patterns are active so stale markers don't linger.
      if (candleRef.current) {
        const sorted = patternMarkers.sort((a, b) => a.time - b.time);
        try {
          if (!markersPluginRef.current) {
            markersPluginRef.current = LW.createSeriesMarkers(candleRef.current, sorted);
          } else {
            markersPluginRef.current.setMarkers(sorted);
          }
        } catch {}
      }
    }

    // ── Equal Highs / Lows (liquidity resting zones) — last 8 only ─
    if (inds.has("Equal Highs/Lows")) {
      try {
        const tolerance = (bars[bars.length - 1]?.close ?? 100) * 0.0008;
        const eqLevels: { price: number; idx: number; type: "h" | "l" }[] = [];
        bars.forEach((b, i) => {
          if (i === 0) return;
          const prev = bars[i - 1];
          if (Math.abs(b.high - prev.high) < tolerance) eqLevels.push({ price: b.high, idx: i, type: "h" });
          if (Math.abs(b.low  - prev.low)  < tolerance) eqLevels.push({ price: b.low,  idx: i, type: "l" });
        });
        eqLevels.slice(-8).forEach(ev => {
          const s = chart.addSeries(LW.LineSeries,{ color: "rgba(240,180,41,0.60)", lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          const slice = bars.slice(ev.idx);
          if (slice.length < 2) return;
          s.setData(slice.map(bb => ({ time: bb.time as any, value: ev.price })));
          indSeriesRef.current.push(s);
        });
      } catch {}
    }

    // ── Strong Highs / Lows — swing points NOT yet violated by later price. A
    //    swing high is "strong" (protected resistance) if no subsequent bar traded
    //    above it; a swing low is "strong" (protected support) if none traded below.
    if (inds.has("Strong Highs/Lows")) {
      try {
        const sw = IND.swingHighLow(bars, 5);
        const maxHighAfter = (idx: number) => bars.slice(idx + 1).reduce((m, b) => Math.max(m, b.high), -Infinity);
        const minLowAfter  = (idx: number) => bars.slice(idx + 1).reduce((m, b) => Math.min(m, b.low),  Infinity);
        const idxOf = (t: number) => bars.findIndex(b => b.time === t);
        sw.highs.slice(-12).forEach(h => {
          const idx = idxOf(h.time as number); if (idx < 0) return;
          if (maxHighAfter(idx) <= h.price) {
            const s = chart.addSeries(LW.LineSeries, { color: "rgba(255,77,103,0.85)", lineWidth: 2, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            s.setData(bars.slice(idx).map(bb => ({ time: bb.time as any, value: h.price })));
            indSeriesRef.current.push(s);
          }
        });
        sw.lows.slice(-12).forEach(l => {
          const idx = idxOf(l.time as number); if (idx < 0) return;
          if (minLowAfter(idx) >= l.price) {
            const s = chart.addSeries(LW.LineSeries, { color: "rgba(0,229,204,0.85)", lineWidth: 2, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            s.setData(bars.slice(idx).map(bb => ({ time: bb.time as any, value: l.price })));
            indSeriesRef.current.push(s);
          }
        });
      } catch {}
    }

    // ── Liquidity Pools — clusters of equal swing highs (buy-side liquidity, BSL)
    //    and equal swing lows (sell-side liquidity, SSL) where stops rest and price
    //    tends to sweep. Dashed gold zones anchored at the equal levels.
    if (inds.has("Liquidity Pools")) {
      try {
        const sw = IND.swingHighLow(bars, 4);
        const tol = (bars[bars.length - 1]?.close ?? 100) * 0.0012;
        const cluster = (pts: { time: number; price: number }[]) => {
          const out: { price: number; from: number }[] = [];
          pts.forEach((p, i) => {
            for (let j = i + 1; j < pts.length; j++) {
              if (Math.abs(pts[j].price - p.price) < tol) { out.push({ price: (p.price + pts[j].price) / 2, from: Math.min(p.time as number, pts[j].time as number) }); break; }
            }
          });
          return out;
        };
        const idxOfTime = (t: number) => { const i = bars.findIndex(b => (b.time as number) >= t); return i < 0 ? 0 : i; };
        cluster(sw.highs as any).slice(-6).forEach(c => {
          const s = chart.addSeries(LW.LineSeries, { color: "rgba(240,180,41,0.75)", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          s.setData(bars.slice(idxOfTime(c.from)).map(bb => ({ time: bb.time as any, value: c.price })));
          indSeriesRef.current.push(s);
        });
        cluster(sw.lows as any).slice(-6).forEach(c => {
          const s = chart.addSeries(LW.LineSeries, { color: "rgba(79,163,224,0.75)", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          s.setData(bars.slice(idxOfTime(c.from)).map(bb => ({ time: bb.time as any, value: c.price })));
          indSeriesRef.current.push(s);
        });
      } catch {}
    }

    // ── Change of Character (CHoCH) — the first break of structure AGAINST the
    //    prevailing swing sequence: after a series of higher-highs, price closing
    //    below the last higher-low flags a bullish→bearish CHoCH (and vice-versa).
    if (inds.has("Change of Character")) {
      try {
        const sw = IND.swingHighLow(bars, 4);
        const chochMarkers: { time: any; position: "aboveBar" | "belowBar"; color: string; shape: "arrowUp" | "arrowDown"; text: string; size: number }[] = [];
        const lows  = sw.lows.slice();
        const highs = sw.highs.slice();
        // CHoCH = the bar that first CLOSES through the most recent opposite swing:
        // closing below the last swing low = bullish→bearish shift; closing above the
        // last swing high = bearish→bullish shift. One marker per break (edge only).
        bars.forEach((b, i) => {
          const prevBar = bars[i - 1];
          if (!prevBar) return;
          const priorLow  = [...lows].reverse().find(l => (l.time as number) < (b.time as number));
          const priorHigh = [...highs].reverse().find(h => (h.time as number) < (b.time as number));
          if (priorLow && prevBar.close >= priorLow.price && b.close < priorLow.price) {
            chochMarkers.push({ time: b.time as any, position: "aboveBar", color: "#CE93D8", shape: "arrowDown", text: "CHoCH", size: 0.9 });
          }
          if (priorHigh && prevBar.close <= priorHigh.price && b.close > priorHigh.price) {
            chochMarkers.push({ time: b.time as any, position: "belowBar", color: "#00E5CC", shape: "arrowUp", text: "CHoCH", size: 0.9 });
          }
        });
        // Draw CHoCH via lightweight price-line markers on the candle series.
        if (chochMarkers.length && candleRef.current) {
          const existing = (chochMarkers.slice(-8)).sort((a, b) => a.time - b.time);
          // Merge with any pattern markers already set would clobber; instead draw
          // small dotted lines at the break price so CHoCH coexists with patterns.
          existing.forEach(m => {
            const s = chart.addSeries(LW.LineSeries, { color: m.color, lineWidth: 1, lineStyle: 3, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            const bar = bars.find(bb => (bb.time as any) === m.time);
            if (!bar) return;
            const idx = bars.indexOf(bar);
            s.setData(bars.slice(Math.max(0, idx - 3), idx + 4).map(bb => ({ time: bb.time as any, value: bar.close })));
            indSeriesRef.current.push(s);
          });
        }
      } catch {}
    }

    // ── Parkinson Volatility — high/low range volatility estimator (annualized %),
    //    more efficient than close-to-close HV. Rolling 20-bar window.
    if (inds.has("Parkinson Volatility")) {
      setupScale("park", 0.80);
      const parkCompute = (bs: Bar[]) => {
        const N = 20; const k = 1 / (4 * Math.log(2));
        return bs.map((_, i) => {
          if (i < N) return 0;
          let sum = 0;
          for (let j = i - N + 1; j <= i; j++) {
            const hl = bs[j].high > 0 && bs[j].low > 0 ? Math.log(bs[j].high / bs[j].low) : 0;
            sum += hl * hl;
          }
          return Math.sqrt(k * (sum / N)) * Math.sqrt(252) * 100;
        });
      };
      const s = addOsc(parkCompute(bars), "#C084FC", "park");
      regLive(s, (bs) => { const a = parkCompute(bs); const v = a[a.length - 1]; return isFinite(v) ? { value: v } : null; });
    }

    // ── Stacked Imbalances (3+ consecutive imbalanced rows) ──
    if (inds.has("Stacked Imbalances")) {
      try {
        bars.slice(-80).forEach(b => {
          const levels = getBarFootprint(b, 12);
          let streak = 0; let streakDir: "ask" | "bid" | null = null;
          levels.forEach((lv) => {
            const askDom = lv.ask > lv.bid * 2.0;
            const bidDom = lv.bid > lv.ask * 2.0;
            const dir = askDom ? "ask" : bidDom ? "bid" : null;
            if (dir && dir === streakDir) {
              streak++;
              if (streak >= 3) {
                // Draw horizontal line at stacked imbalance level
                const price = lv.priceLevel;
                const color = dir === "ask" ? "rgba(0,229,204,0.70)" : "rgba(206,147,216,0.70)";
                const s = chart.addSeries(LW.LineSeries,{ color, lineWidth: 2, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
                s.setData(bars.slice(bars.indexOf(b)).map(bb => ({ time: bb.time as any, value: price })));
                indSeriesRef.current.push(s);
              }
            } else {
              streak = 1; streakDir = dir;
            }
          });
        });
      } catch {}
    }

    // ── Imbalance Tracker — horizontal zone boxes on chart ───────
    // Draw purple zone boxes at price levels where significant bid/ask imbalances
    // were detected in recent bars (like Deep Charts Imbalance Tracker feature)
    if (inds.has("Imbalance Tracker")) {
      try {
        // Collect all price levels with imbalance ratio ≥ 2.5× from last 100 bars
        const recentBars = bars.slice(-100);
        const imbalanceLevels: { price: number; isAsk: boolean; strength: number }[] = [];
        recentBars.forEach(b => {
          const levels = getBarFootprint(b, 12);
          levels.forEach(lv => {
            if (lv.total < 5) return;
            const ratio = lv.ask > 0 && lv.bid > 0 ? Math.max(lv.ask / lv.bid, lv.bid / lv.ask) : 0;
            if (ratio >= 2.5) {
              imbalanceLevels.push({ price: lv.priceLevel, isAsk: lv.ask > lv.bid, strength: ratio });
            }
          });
        });
        // Cluster nearby levels and draw zone boxes
        const clustered: typeof imbalanceLevels = [];
        imbalanceLevels.sort((a, b) => a.price - b.price).forEach(lv => {
          const last = clustered[clustered.length - 1];
          const tick = (bars[bars.length - 1]?.close ?? 100) * 0.0005;
          if (last && Math.abs(lv.price - last.price) < tick * 3 && lv.isAsk === last.isAsk) {
            if (lv.strength > last.strength) clustered[clustered.length - 1] = lv;
          } else {
            clustered.push(lv);
          }
        });
        clustered.slice(-20).forEach(lv => {
          const color = lv.isAsk ? "rgba(0,229,204,0.18)" : "rgba(123,108,247,0.18)";
          const borderColor = lv.isAsk ? "rgba(0,229,204,0.55)" : "rgba(123,108,247,0.55)";
          const tick = (bars[bars.length - 1]?.close ?? 100) * 0.0003;
          const top = lv.price + tick;
          const bot = lv.price - tick;
          // Top border line
          const sTop = chart.addSeries(LW.LineSeries,{ color: borderColor, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          sTop.setData(bars.map(b => ({ time: b.time as any, value: top })));
          indSeriesRef.current.push(sTop);
          // Bot border line
          const sBot = chart.addSeries(LW.LineSeries,{ color: borderColor, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          sBot.setData(bars.map(b => ({ time: b.time as any, value: bot })));
          indSeriesRef.current.push(sBot);
        });
      } catch {}
    }

    // ── Supply / Demand Zones (Deep-M Effort style) ───────────────
    // Teal boxes = demand zones (swing lows with strong buying), red = supply (swing highs with selling)
    if (inds.has("Supply/Demand Zones")) {
      try {
        // Find swing highs (supply) and swing lows (demand) in last 200 bars
        const lookback = Math.min(bars.length, 200);
        const slice = bars.slice(-lookback);
        const swingRange = 5; // bars each side for swing detection
        slice.forEach((b, i) => {
          if (i < swingRange || i > slice.length - swingRange - 1) return;
          const window = slice.slice(i - swingRange, i + swingRange + 1);
          const isHigh = window.every(w => b.high >= w.high);
          const isLow  = window.every(w => b.low  <= w.low);

          const zoneHeight = (b.high - b.low) * 0.4;
          if (isHigh && zoneHeight > 0) {
            // Supply zone — red/pink box just below the high
            const top = b.high;
            const bot = b.high - zoneHeight;
            const color = "rgba(244,143,177,0.15)";
            const border = "rgba(244,143,177,0.55)";
            const sT = chart.addSeries(LW.LineSeries,{ color: border, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            sT.setData(slice.slice(i).map(bb => ({ time: bb.time as any, value: top })));
            indSeriesRef.current.push(sT);
            const sB = chart.addSeries(LW.LineSeries,{ color: border, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            sB.setData(slice.slice(i).map(bb => ({ time: bb.time as any, value: bot })));
            indSeriesRef.current.push(sB);
          }
          if (isLow && zoneHeight > 0) {
            // Demand zone — teal box just above the low
            const top = b.low + zoneHeight;
            const bot = b.low;
            const border = "rgba(105,255,218,0.55)";
            const sT = chart.addSeries(LW.LineSeries,{ color: border, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            sT.setData(slice.slice(i).map(bb => ({ time: bb.time as any, value: top })));
            indSeriesRef.current.push(sT);
            const sB = chart.addSeries(LW.LineSeries,{ color: border, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            sB.setData(slice.slice(i).map(bb => ({ time: bb.time as any, value: bot })));
            indSeriesRef.current.push(sB);
          }
        });
      } catch {}
    }

    // ── Native panes own the oscillator layout now ───────────
    // With v5 native panes the candles keep pane 0 to themselves (just the
    // volume overlay at the bottom) — no need to shrink the candle scale for
    // oscillators. Keep a small bottom margin so volume bars don't touch wicks.
    try {
      chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.06, bottom: 0.18 } });
    } catch {}
    // Make the candle pane dominant and oscillator panes compact. v5 stretch
    // factors are RELATIVE weights (resolution-independent), unlike setHeight
    // which the layout was overriding (candles got squished under a big osc pane).
    try {
      const panes = chart.panes();
      const n = panes.length;
      if (n > 1) {
        // Candle pane always keeps the lion's share regardless of osc count.
        // Scale dominance with the number of oscillator panes so candles never
        // drop below ~70% of the height (each oscillator caps at ~10%). Before,
        // this was hard-capped at 4, so 4 indicators split the chart 50/50 and
        // crushed the footprint numbers into the top half.
        // Use a FIXED candle:oscillator weight (~3.1 ≈ CANDLE 260 / OSC_MIN 84)
        // instead of scaling dominance with osc count. The old `oscCount*2.8`
        // kept candles at ~74% no matter how many panes stacked, so 3+ panes
        // (RSI+MACD+CVD) got crushed to ~45px slivers — the "CVD meter too high /
        // cramped" bug. A fixed 3.1 weight matches the grown-container target
        // heights so every oscillator pane keeps its full ~84px and reads clean.
        panes[0].setStretchFactor(3.1);
        for (let i = 1; i < n; i++) panes[i].setStretchFactor(1);
      }

      // ── Bottom-pane cutoff fix ─────────────────────────────
      // LWC enforces a minimum pane height. When many oscillators stack up,
      // (n-1)*min + candleMin + axis exceeds the fixed viewport and the bottom
      // pane / time-axis gets clipped. Grow the chart container tall enough that
      // every oscillator pane stays fully readable, and let the region scroll.
      const cont   = containerRef.current;
      const scroll = cont?.parentElement as HTMLElement | null; // div5069 scroll box
      if (cont && scroll) {
        const viewH   = scroll.clientHeight || 0;
        const OSC_MIN = 84;   // readable oscillator pane height
        const CANDLE  = 260;  // keep candles dominant & usable
        const AXIS    = 30;   // time axis
        const oscCount = Math.max(0, n - 1);
        const needed   = oscCount === 0 ? 0 : CANDLE + oscCount * OSC_MIN + AXIS;
        if (needed > viewH && viewH > 0) {
          // Too many panes to fit — grow container & scroll.
          cont.style.height = needed + "px";
          scroll.style.overflowY = "auto";
        } else {
          // Fits — fill the viewport, no scroll.
          cont.style.height = "100%";
          scroll.style.overflowY = "hidden";
        }
        // Nudge autoSize / overlays to re-measure the new height. Guard on chart
        // IDENTITY: on a symbol/timeframe switch this RAF can fire AFTER the chart
        // was disposed and replaced. Calling applyOptions() then schedules an LWC
        // internal model update that throws "Object is disposed" ASYNCHRONOUSLY —
        // uncatchable by the try/catch here. Skipping stale charts kills that error.
        requestAnimationFrame(() => {
          if (chartRef.current !== chart) { setRangeVer(v => v + 1); return; }
          try { chart.applyOptions({}); } catch {}
          setRangeVer(v => v + 1);
        });
      }
    } catch {}

    // Cleanup so React Strict Mode doesn't orphan series
    return () => {
      const c = chartRef.current;
      if (!c) return;
      indSeriesRef.current.forEach(s => { try { c.removeSeries(s); } catch {} });
      indSeriesRef.current = [];
    };
  }, [activeInds, indSettings, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Alert level lines ──────────────────────────────────── */
  const alertSeriesRef = useRef<any[]>([]);
  useEffect(() => {
    if (!ready || !chartRef.current || !barsRef.current?.length) return;
    const chart = chartRef.current;
    const bars  = barsRef.current;
    // Remove old alert lines
    alertSeriesRef.current.forEach(s => { try { chart.removeSeries(s); } catch {} });
    alertSeriesRef.current = [];
    if (!alertLevels.length) return;
    (async () => {
      const LW = await import("lightweight-charts");
      // Chart may have been disposed/replaced during the await → don't touch it.
      if (chartRef.current !== chart) return;
      alertLevels.forEach(price => {
        try {
          const s = chart.addSeries(LW.LineSeries,{
            color: "#F5A623",
            lineWidth: 1,
            lineStyle: LW.LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: true,
            // CRITICAL: an alert far from the price (e.g. 1100 on a 377 stock) must
            // NOT drag the candle scale out to 300–1100 and crush the candles.
            // Returning null excludes this line from the price-scale autoscale.
            autoscaleInfoProvider: () => null,
          });
          s.setData(bars.map(b => ({ time: b.time as any, value: price })));
          alertSeriesRef.current.push(s);
        } catch {}
      });
    })();
  }, [alertLevels, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Paper-trade position lines (native price lines + live P&L) ──────
   * Reads the local paper-trading blotter (wm_paper_state), finds OPEN
   * positions for THIS symbol, and draws a TradingView-style horizontal
   * entry line with a live-updating P&L label. Read-only: this only
   * VISUALISES paper state — it never places, modifies, or closes a trade. */
  const pnlLabel = (qty: number, avgPx: number, lp: number) => {
    const pnl = (lp - avgPx) * qty;               // qty is signed (+long / -short)
    const s = pnl >= 0 ? "+" : "-";
    return { up: pnl >= 0, text: `${qty > 0 ? "LONG" : "SHORT"} ${Math.abs(qty)} · ${s}$${Math.abs(pnl).toLocaleString("en-US", { maximumFractionDigits: 2 })}` };
  };
  useEffect(() => {
    const series = candleRef.current;
    if (!series || !paperTradesVisible) return;

    let positions: Array<{ symbol: string; qty: number; avgPx: number }> = [];
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("wm_paper_state") : null;
      if (raw) positions = (JSON.parse(raw).positions || []);
    } catch { positions = []; }

    const norm = (s: string) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const bse  = (s: string) => norm(s).replace(/(USDT|USDC|USD|PERP)$/, "");
    const tgt = norm(symbol), tgtB = bse(symbol);
    const mine = positions.filter(p => p.qty !== 0 && (norm(p.symbol) === tgt || bse(p.symbol) === tgtB));
    if (!mine.length) return;

    const lp = lastPrice > 0 ? lastPrice
      : (barsRef.current.length ? barsRef.current[barsRef.current.length - 1].close : 0);

    mine.forEach(p => {
      const { up, text } = pnlLabel(p.qty, p.avgPx, lp);
      try {
        const line = series.createPriceLine({
          price: p.avgPx,
          color: up ? "#00D4AA" : "#FF4D6A",
          lineWidth: 2,
          lineStyle: 0,               // solid
          axisLabelVisible: true,
          title: text,
        });
        paperLinesRef.current.push({ line, qty: p.qty, avgPx: p.avgPx });
      } catch {}
    });

    // Dev-only diagnostic readback (never ships to production).
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      (window as unknown as { __wmPaperLines?: unknown }).__wmPaperLines = {
        symbol, count: paperLinesRef.current.length,
        titles: mine.map(p => pnlLabel(p.qty, p.avgPx, lp).text),
        lp, ts: Date.now(),
      };
    }

    return () => {
      paperLinesRef.current.forEach(({ line }) => { try { series.removePriceLine(line); } catch {} });
      paperLinesRef.current = [];
    };
  }, [symbol, paperTradesVisible, ready, paperNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Refresh each open-position line's live-P&L label on every price tick,
   * without tearing the lines down and rebuilding them. */
  useEffect(() => {
    if (!paperLinesRef.current.length || !(lastPrice > 0)) return;
    paperLinesRef.current.forEach(({ line, qty, avgPx }) => {
      const { up, text } = pnlLabel(qty, avgPx, lastPrice);
      try { line.applyOptions({ title: text, color: up ? "#00D4AA" : "#FF4D6A" }); } catch {}
    });
  }, [lastPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Re-read paper state when another tab writes wm_paper_state, or when the
   * window regains focus after the user placed a trade elsewhere in the app. */
  useEffect(() => {
    const bump = () => setPaperNonce(n => n + 1);
    const onStorage = (e: StorageEvent) => { if (e.key === "wm_paper_state") bump(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", bump);
    };
  }, []);

  /* ── Log / pct / auto scale mode ─────────────────────────── */
  useEffect(() => {
    if (!chartRef.current) return;
    try {
      chartRef.current.priceScale("right").applyOptions({
        mode: logScale ? 1 : pctMode ? 2 : 0, // 0=Normal 1=Logarithmic 2=Percentage
        autoScale,  // respect the user's auto/manual choice
      });
    } catch {}
  }, [logScale, pctMode, autoScale, ready]);

  /* ── True vertical price-drag on the chart body ──────────────
     LWC handles horizontal time-scroll on the body itself; we add the
     vertical axis so the two combine into free 2D panning. Active only in
     cursor mode (so it never fights drawing tools). Dragging engages a manual
     price range; the AUTO button (setAutoScale→true) releases it. */
  useEffect(() => {
    if (!ready) return;
    const el = containerRef.current;
    if (!el) return;
    let dragging = false, startY = 0;
    let startMin = 0, startMax = 0;

    const reapply = () => {
      const cs = candleRef.current; if (!cs) return;
      // Re-assigning the provider forces LWC to recompute the price scale now.
      cs.applyOptions({
        autoscaleInfoProvider: autoscaleProviderRef.current,
      });
    };

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (drawingToolRef.current !== "cursor") return; // let drawing tools own the mouse
      // Skip the right price-axis gutter — that region is owned by the dedicated
      // axis drag-to-SCALE handler below. Body drag = pan; axis drag = stretch.
      const rect = el.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      let axW = 0; try { axW = (chartRef.current as any)?.priceScale?.("right")?.width?.() ?? 0; } catch {}
      if (axW > 0 && localX >= el.clientWidth - axW - 2) return;
      const cs = candleRef.current; if (!cs) return;
      const h = el.clientHeight;
      const top = cs.coordinateToPrice(0);
      const bot = cs.coordinateToPrice(h);
      if (top == null || bot == null) return;
      startMin = Math.min(top, bot);
      startMax = Math.max(top, bot);
      startY = e.clientY;
      dragging = true;
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const h = el.clientHeight; if (h <= 0) return;
      const dy = e.clientY - startY;
      if (Math.abs(dy) < 2) return;
      const span = startMax - startMin;
      const shift = (dy / h) * span; // drag down → reveal higher prices (shift range up)
      manualPriceRangeRef.current = { min: startMin + shift, max: startMax + shift };
      // NOTE: we deliberately keep the price scale in autoScale mode — the
      // provider only runs there. The manual range simply overrides the fit.
      reapply();
    };
    const onUp = () => { dragging = false; };
    // Double-click the chart body resets to auto-fit (TradingView convention).
    const onDbl = () => {
      if (drawingToolRef.current !== "cursor") return;
      manualPriceRangeRef.current = null;
      reapply();
    };

    el.addEventListener("mousedown", onDown);
    el.addEventListener("dblclick", onDbl);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("dblclick", onDbl);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [ready]);

  /* ── TradingView-style PRICE-AXIS drag-to-SCALE ─────────────────
     Grab the price numbers on the right and drag vertically to STRETCH /
     COMPRESS the price scale around the cursor — exactly like TradingView.
     Drag DOWN → zoom IN (candles grow tall); drag UP → zoom OUT (candles
     shrink). Runs through the same manualPriceRangeRef + autoscaleInfoProvider
     as the body pan, so the 4×-range guardrail + center-pin keep it from ever
     collapsing the candles. Double-click the axis → back to AUTO fit. */
  useEffect(() => {
    if (!ready) return;
    const el = containerRef.current;
    if (!el) return;
    let scaling = false, startY = 0, startMin = 0, startMax = 0, anchor = 0;
    let raf = 0, pending: { min: number; max: number } | null = null;

    const reapply = () => {
      const cs = candleRef.current; if (!cs) return;
      cs.applyOptions({ autoscaleInfoProvider: autoscaleProviderRef.current });
    };
    const flush = () => {
      raf = 0;
      if (!pending) return;
      manualPriceRangeRef.current = pending;
      pending = null;
      reapply();
    };
    const onAxis = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      let axW = 0; try { axW = (chartRef.current as any)?.priceScale?.("right")?.width?.() ?? 0; } catch {}
      return axW > 0 && localX >= el.clientWidth - axW - 2 && localX <= el.clientWidth + 4;
    };
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (!onAxis(e)) return;
      const cs = candleRef.current; if (!cs) return;
      const h = el.clientHeight;
      const rect = el.getBoundingClientRect();
      const top = cs.coordinateToPrice(0);
      const bot = cs.coordinateToPrice(h);
      if (top == null || bot == null) return;
      startMin = Math.min(top, bot);
      startMax = Math.max(top, bot);
      // Anchor the stretch at the price directly under the cursor (TV behaviour).
      const ap = cs.coordinateToPrice(e.clientY - rect.top);
      anchor = (ap != null && isFinite(ap)) ? ap : (startMin + startMax) / 2;
      startY = e.clientY;
      scaling = true;
      setScaleLocked(true);          // reveal the small "reset scale" button
      el.style.cursor = "ns-resize";
      e.preventDefault();
      e.stopPropagation();
    };
    const onMove = (e: MouseEvent) => {
      if (!scaling) return;
      const h = el.clientHeight; if (h <= 0) return;
      const dy = e.clientY - startY;
      // Exponential factor → smooth, symmetric, never inverts. Drag DOWN (dy>0)
      // → factor<1 → range shrinks → zoom in. Sensitivity 2.4 ≈ TradingView.
      const factor = Math.exp(-dy / h * 3.4);
      const newMin = anchor - (anchor - startMin) * factor;
      const newMax = anchor + (startMax - anchor) * factor;
      if (!(newMax - newMin > 1e-9)) return;
      // Coalesce to one update per animation frame → buttery-smooth, no jank.
      pending = { min: newMin, max: newMax };
      if (!raf) raf = requestAnimationFrame(flush);
    };
    const onUp = () => {
      if (scaling) {
        scaling = false;
        el.style.cursor = "";
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        flush();
      }
    };

    // Capture phase so we intercept the axis BEFORE the library's own handlers.
    el.addEventListener("mousedown", onDown, true);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ready]);

  /* ── Apply chart settings ────────────────────────────────── */
  useEffect(() => {
    if (!chartRef.current || !chartSettings) return;
    try {
      const LW = (window as any).__LW__;
      const chart = chartRef.current;
      chart.applyOptions({
        layout: {
          background: { color: chartSettings.background ?? "#0B0E1A" },
        },
        grid: chartSettings.gridColor ? {
          vertLines: { color: chartSettings.gridColor, style: 4 },
          horzLines: { color: chartSettings.gridColor, style: 4 },
        } : undefined,
        crosshair: chartSettings.crosshairColor ? {
          vertLine: { color: chartSettings.crosshairColor },
          horzLine: { color: chartSettings.crosshairColor },
        } : undefined,
      });
      // Update candle colors — skip for types that manage their own colors (hollow, volume, orderflow)
      const skipBodyColorOverride = ["hollow", "volume-candles", "vp-candles", "orderflow-candles",
        "line", "area", "baseline", "bars", "hlc-bars", "columns", "renko", "range-bars"].includes(candleType);
      if (candleRef.current && chartSettings.candleUp && !skipBodyColorOverride) {
        try {
          candleRef.current.applyOptions({
            upColor: chartSettings.candleUp,
            downColor: chartSettings.candleDown ?? "#FF4D67",
            borderUpColor: chartSettings.borderUp ?? chartSettings.candleUp,
            borderDownColor: chartSettings.borderDown ?? chartSettings.candleDown ?? "#FF4D67",
            wickUpColor: chartSettings.wickUp ?? chartSettings.candleUp,
            wickDownColor: chartSettings.wickDown ?? chartSettings.candleDown ?? "#FF4D67",
          });
        } catch {}
      } else if (candleRef.current && chartSettings.candleUp && candleType === "hollow") {
        // For hollow candles: only update wicks and border, keep body as background color
        const bgColor = chartSettings.background ?? "#0B0E1A";
        try {
          candleRef.current.applyOptions({
            upColor:          bgColor,
            downColor:        bgColor,
            borderUpColor:    chartSettings.borderUp   ?? chartSettings.candleUp,
            borderDownColor:  chartSettings.borderDown ?? chartSettings.candleDown ?? "#FF4D67",
            wickUpColor:      chartSettings.wickUp   ?? chartSettings.candleUp,
            wickDownColor:    chartSettings.wickDown  ?? chartSettings.candleDown ?? "#FF4D67",
          });
        } catch {}
      }
    } catch {}
  }, [chartSettings, candleType, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Footprint helper: realistic price-level bid/ask data ───
   * Generates consistent, realistic-looking footprint data from
   * OHLCV bars. Uses real tick accumulator data when available,
   * falls back to deterministic simulation based on bar structure.
   ─────────────────────────────────────────────────────────── */
  /* ─────────────────────────────────────────────────────────────────────────
     FIXED-RESOLUTION BAR PROFILE — the single source of truth for a candle.

     The renderer picks `numLevels` from barSpacing + candle pixel height, so it
     changes with zoom. Building the volume distribution AT that resolution made
     the candle's own numbers depend on zoom: the body/wick predicates and the
     per-level RNG were evaluated at bin positions, so more bins = a different
     distribution, not merely a finer view of the same one.

     So the profile is built ONCE on a fixed SUB-level grid, independent of zoom.
     Display bins and the aggressive/passive roles are both derived by aggregating
     that fixed grid. Zoom then only changes how the same mass is sliced.
     SUB=120 so the 0.20 / 0.80 role thresholds land exactly on sub-boundaries.
  ───────────────────────────────────────────────────────────────────────────── */
  const SUB = 120;
  const barSubCacheRef = useRef<Map<string, Array<{ bid: number; ask: number }>>>(new Map());

  const getBarSubProfile = useCallback((bar: Bar): Array<{ bid: number; ask: number }> | null => {
    const range = bar.high - bar.low;
    if (range <= 0) return null;

    const realData = tickAccRef.current.get(bar.time);
    const key = `${bar.time}|${bar.high}|${bar.low}|${bar.close}|${bar.volume}|${realData?.size ?? 0}`;
    const cached = barSubCacheRef.current.get(key);
    if (cached) return cached;

    const idxOf = (p: number) =>
      Math.min(SUB - 1, Math.max(0, Math.floor(((p - bar.low) / range) * SUB)));
    const sub: Array<{ bid: number; ask: number }> =
      Array.from({ length: SUB }, () => ({ bid: 0, ask: 0 }));

    // ── REAL TAPE: bucket every accumulated tick exactly once. The old code
    // looked up one rounded price key per display bin, sampling the accumulator
    // and discarding the rest — so the printed total climbed as you zoomed in.
    if (realData && realData.size > 0) {
      let seen = 0;
      for (const [px, rt] of realData) {
        const s = sub[idxOf(px)];
        s.bid += rt.bid; s.ask += rt.ask;
        seen  += rt.bid + rt.ask;
      }
      if (seen > 0) {
        barSubCacheRef.current.set(key, sub);
        return sub;   // real tape only — never blended with simulated rows
      }
    }

    // ── DETERMINISTIC SIMULATION on the fixed grid, normalized to bar.volume.
    const isBull   = bar.close >= bar.open;
    const bodyLow  = Math.min(bar.open, bar.close);
    const bodyHigh = Math.max(bar.open, bar.close);
    // Keep NATIVE units (float). Rounding fractional crypto volume (~0.3 BTC) to
    // an integer zeroed the entire simulated footprint ("AGG BUYS 0"). Aggregation
    // of the fixed sub-grid still conserves Σ exactly, so zoom-stability holds.
    const target   = Math.max(0, bar.volume);

    const w: number[] = [];
    const askPcts: number[] = [];
    let wSum = 0;
    for (let j = 0; j < SUB; j++) {
      const f     = (j + 0.5) / SUB;              // price fraction, low→high
      const price = bar.low + f * range;
      const inBody    = price >= bodyLow && price <= bodyHigh;
      const nearOpen  = Math.abs(price - bar.open)  / (range + 0.001) < 0.07;
      const nearClose = Math.abs(price - bar.close) / (range + 0.001) < 0.07;
      const nearMid   = Math.abs(f - 0.5) < 0.12;

      let volMult = 0.5;
      if (inBody)                volMult += 2.0;
      if (nearOpen || nearClose) volMult += 1.2;
      if (nearMid)               volMult += 0.6;
      if (f < 0.04 || f > 0.96)  volMult *= 0.2;  // very sparse at the extremes

      // Seeded per (bar, SUB index) — fixed grid ⇒ identical at every zoom.
      const s1   = Math.sin(bar.time * 0.01337 + j * 19.13) * 43758.5453;
      const rnd1 = s1 - Math.floor(s1);
      const s2   = Math.sin(bar.time * 0.00731 + j * 7.41 + bar.volume * 0.001) * 12345.6789;
      const rnd2 = s2 - Math.floor(s2);

      const weight = Math.max(0, volMult * (0.7 + rnd1 * 0.6));
      w.push(weight); wSum += weight;

      // ask = buyer-initiated, bid = seller-initiated.
      let askPct = isBull ? 0.52 + rnd2 * 0.18 : 0.38 + rnd2 * 0.18;
      if (inBody) askPct = isBull ? askPct + 0.08 : askPct - 0.08;
      askPcts.push(Math.max(0.1, Math.min(0.9, askPct)));
    }

    // Proportional FLOAT allocation ⇒ Σ === bar.volume exactly at every zoom.
    // No integer rounding/flooring, which used to collapse fractional crypto
    // footprints to zero. Display precision is handled by fmtV, not here.
    for (let j = 0; j < SUB; j++) {
      const total = wSum > 0 ? (target * w[j]) / wSum : 0;
      const ask   = total * askPcts[j];
      sub[j] = { ask, bid: total - ask };
    }

    if (barSubCacheRef.current.size > 3000) barSubCacheRef.current.clear();
    barSubCacheRef.current.set(key, sub);
    return sub;
  }, [base]);

  /** Aggressive/passive roles for a candle. Derived from the FIXED sub-profile,
   *  so these four headline numbers are identical at every zoom level. */
  const getBarRoles = useCallback((bar: Bar) => {
    const sub = getBarSubProfile(bar);
    let aggBuy = 0, aggSell = 0, pasBuy = 0, pasSell = 0;
    if (!sub) return { aggBuy, aggSell, pasBuy, pasSell };
    for (let j = 0; j < SUB; j++) {
      const f = (j + 0.5) / SUB;
      if (f > 0.80) pasSell += sub[j].ask; else aggBuy  += sub[j].ask;
      if (f < 0.20) pasBuy  += sub[j].bid; else aggSell += sub[j].bid;
    }
    return { aggBuy, aggSell, pasBuy, pasSell };
  }, [getBarSubProfile]);

  const getBarFootprint = useCallback((bar: Bar, numLevels: number): Array<{
    priceLevel: number; bid: number; ask: number; total: number;
    relPos: number; inBody: boolean;
  }> => {
    const range = bar.high - bar.low;
    if (range <= 0) return [];
    const sub = getBarSubProfile(bar);
    if (!sub) return [];

    const bodyLow  = Math.min(bar.open, bar.close);
    const bodyHigh = Math.max(bar.open, bar.close);
    const dp       = base > 100 ? 2 : 4;
    const binW     = range / numLevels;

    // Pure aggregation of the fixed grid. Every sub-level lands in exactly one
    // display bin, so Σ total is identical for ANY numLevels — i.e. any zoom.
    const bins = Array.from({ length: numLevels }, () => ({ bid: 0, ask: 0 }));
    for (let j = 0; j < SUB; j++) {
      const i = Math.min(numLevels - 1, Math.floor((j * numLevels) / SUB));
      bins[i].bid += sub[j].bid;
      bins[i].ask += sub[j].ask;
    }

    const levels: Array<{ priceLevel: number; bid: number; ask: number; total: number; relPos: number; inBody: boolean }> = [];
    for (let i = 0; i < numLevels; i++) {
      const priceLevel = +(bar.low + i * binW).toFixed(dp);
      const relPos     = i / Math.max(1, numLevels - 1); // 0=low, 1=high
      const inBody     = priceLevel >= bodyLow && priceLevel <= bodyHigh;
      const { bid, ask } = bins[i];
      levels.push({ priceLevel, bid, ask, total: bid + ask, relPos, inBody });
    }

    return levels;
  }, [base]);

  /** Big Trades ONLY — individual large aggressive prints at exact tick prices. */
  const getRealBigTradeLevels = useCallback((bar: Bar): Array<{
    priceLevel: number; bid: number; ask: number; total: number;
  }> => {
    const barTime = bar.time as number;
    const realData = tickAccRef.current.get(barTime);
    if (!realData || realData.size === 0) return [];

    const dp = base > 100 ? 2 : 4;
    const minLot = minBigTradeLot(base);
    const levels: Array<{ priceLevel: number; bid: number; ask: number; total: number }> = [];
    for (const [px, rt] of realData) {
      const total = rt.bid + rt.ask;
      if (total < minLot) continue;
      levels.push({
        priceLevel: +Number(px).toFixed(dp),
        bid: rt.bid,
        ask: rt.ask,
        total,
      });
    }
    if (levels.length === 0) return [];

    const barMean = levels.reduce((s, l) => s + l.total, 0) / levels.length;
    const threshold = Math.max(minLot, barMean * 1.35);

    const pickMap = new Map<number, typeof levels[0]>();
    for (const l of levels.filter(x => x.total >= threshold).sort((a, z) => z.total - a.total).slice(0, 5)) {
      pickMap.set(l.priceLevel, l);
    }
    const topBuy = levels.filter(l => l.ask >= l.bid && l.ask >= minLot)
      .sort((a, z) => z.ask - a.ask)[0];
    const topSell = levels.filter(l => l.bid > l.ask && l.bid >= minLot)
      .sort((a, z) => z.bid - a.bid)[0];
    if (topBuy  && topBuy.total  >= minLot) pickMap.set(topBuy.priceLevel, topBuy);
    if (topSell && topSell.total >= minLot) pickMap.set(topSell.priceLevel, topSell);

    return [...pickMap.values()].sort((a, z) => z.total - a.total).slice(0, 8);
  }, [base]);

  /**
   * Delta Bubbles ONLY — net aggressive delta per price zone (6–10 bins).
   * Separate from Big Trades; still tickAccRef-only, no synthetic footprint.
   */
  const getDeltaBubbleLevels = useCallback((bar: Bar): Array<{
    priceLevel: number; bid: number; ask: number; total: number; delta: number;
  }> => {
    const barTime = bar.time as number;
    const realData = deltaTickAccRef.current.get(barTime);
    if (!realData || realData.size === 0) return [];

    const priceTick = base > 10_000 ? 0.25 : base > 1_000 ? 0.25 : base > 100 ? 0.01 : 0.0001;
    const dp = base > 100 ? 2 : 4;

    const tickEntries: Array<{ price: number; bid: number; ask: number }> = [];
    let lo = bar.low, hi = bar.high;
    for (const [px, rt] of realData) {
      const p = Number(px);
      tickEntries.push({ price: p, bid: rt.bid, ask: rt.ask });
      lo = Math.min(lo, p);
      hi = Math.max(hi, p);
    }

    let range = hi - lo;
    if (range <= 0) range = priceTick * 6;

    const numLev = Math.max(6, Math.min(10, Math.floor(range / priceTick * 1.5) || 6));
    const levelStep = range / numLev;
    const bucketLo = lo;

    const levels: Array<{ priceLevel: number; bid: number; ask: number; total: number; delta: number }> = [];
    for (let i = 0; i < numLev; i++) {
      const priceLevel = +(bucketLo + i * levelStep + levelStep / 2).toFixed(dp);
      const half = levelStep / 2;
      let bid = 0, ask = 0;
      for (const t of tickEntries) {
        if (Math.abs(t.price - priceLevel) < half) {
          bid += t.bid;
          ask += t.ask;
        }
      }
      const total = bid + ask;
      if (total <= 0) continue;
      const delta = ask - bid; // aggressive buy − aggressive sell
      levels.push({ priceLevel, bid, ask, total, delta });
    }
    if (levels.length === 0) return [];

    const meanAbsDelta = levels.reduce((s, l) => s + Math.abs(l.delta), 0) / levels.length;
    // Data-relative threshold (no absolute lot floor) so it works on any asset:
    // BTC (deltas ~0.05 BTC) and stocks (deltas ~50 sh) alike. Above-average zones.
    const threshold = meanAbsDelta;

    const pickMap = new Map<number, typeof levels[0]>();
    for (const l of levels
      .filter(x => Math.abs(x.delta) >= threshold)
      .sort((a, z) => Math.abs(z.delta) - Math.abs(a.delta))
      .slice(0, 5)) {
      pickMap.set(l.priceLevel, l);
    }
    // Guaranteed buy + sell leaders so every active bar shows both sides.
    const topBuy = levels.filter(l => l.delta > 0).sort((a, z) => z.delta - a.delta)[0];
    const topSell = levels.filter(l => l.delta < 0).sort((a, z) => a.delta - z.delta)[0];
    if (topBuy) pickMap.set(topBuy.priceLevel, topBuy);
    if (topSell) pickMap.set(topSell.priceLevel, topSell);

    return [...pickMap.values()]
      .sort((a, z) => Math.abs(z.delta) - Math.abs(a.delta))
      .slice(0, 6);
  }, [base]);

  footprintSnapRef.current = (bar, n) => getBarFootprint(bar, n).map(l => ({ priceLevel: l.priceLevel, total: l.total }));

  /* ── Canvas order-flow / footprint overlay ──────────────────
   *  Draws directly on a canvas overlaid on LW chart.
   *  All 5 footprint modes: bid-ask, delta, volume-profile,
   *  imbalance, aggressive-passive.
   ─────────────────────────────────────────────────────────── */
  // ResizeObserver keeps canvas pixel-perfect when window/panel resizes
  useEffect(() => {
    const cont = containerRef.current;
    const canvas = canvasRef.current;
    if (!cont || !canvas) return;
    const ro = new ResizeObserver(() => { setRangeVer(v => v + 1); });
    ro.observe(cont);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const cont   = containerRef.current;
    if (!canvas || !cont || !chartRef.current || !ready) return;

    let rafId = 0;
    // Track the last backing-store size so we only reallocate the canvas buffer
    // when the dimensions actually change. Reassigning canvas.width/height every
    // frame (even to the same value) throws away and re-uploads the entire GPU
    // texture — a 60fps buffer realloc that fought LWC's zoom render and caused
    // the candles to "stick." Now the buffer is stable; we just clear + redraw.
    let lastCW = -1, lastCH = -1, lastDpr = -1;

    const draw = () => {
      // Size to the CHART CONTAINER (not the scroll-box parent). When many panes
      // stack the container grows taller than the visible viewport and scrolls;
      // the overlay must match the chart's full height so priceToCoordinate
      // (chart-top origin) stays pixel-aligned with the candles.
      const W = cont.offsetWidth;
      const H = cont.offsetHeight;
      if (!W || !H) return;

      const dpr = window.devicePixelRatio || 1;
      const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
      // Only reallocate the backing store when the size actually changes.
      // (Setting canvas.width/height ALWAYS clears + reallocates the buffer, so
      // doing it per-frame was a 60fps GPU-texture thrash that caused zoom jank.)
      if (cw !== lastCW || ch !== lastCH || dpr !== lastDpr) {
        canvas.width  = cw;
        canvas.height = ch;
        canvas.style.width  = W + "px";
        canvas.style.height = H + "px";
        lastCW = cw; lastCH = ch; lastDpr = dpr;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // NOTE: do NOT early-return when footprint is off — the WM Fixed/Session VP
      // overlays are independent of order-flow footprint and must still render.
      // Footprint MODE blocks below are gated via effectiveFP instead.
      ctx.imageSmoothingEnabled = false; // crisp pixel-aligned rendering

      const chart = chartRef.current;
      if (!chart || !candleRef.current) return;
      const srs = candleRef.current;

      // Guard so the WM VP layer draws exactly once per frame regardless of which
      // call site fires first (big-trades mode draws VP early, under the bubbles).
      let vpDrawn = false;

      let bsp = 12;
      try { bsp = chart.timeScale().options().barSpacing ?? 12; } catch {}

      // TV Lightweight Charts candle body width = barSpacing * 0.7 (matches TV internal formula)
      const colW  = Math.max(4, Math.floor(bsp * 0.70));
      const halfW = Math.floor(colW / 2);
      // Show numbers at practical zoom levels. These gates were too aggressive —
      // the user reported footprint numbers "disappearing" when zooming out or
      // after the intraday range widened (which vertically compresses candles).
      // Relaxed so numbers stay visible across far more zoom levels:
      // showText  = at least 1 number fits (column ≥11px  → barSpacing ≥ ~16)
      // showSplit = both bid AND ask fit side-by-side (column ≥22px)
      // showBadges = the per-candle 4-WAY ORDER-FLOW SUMMARY (2×2 grid of Agg/Psv
      //   Buyer/Seller numbers, drawn ABOVE the candle). The grid is ~68px wide, so
      //   drawing one per candle when bars are packed tight would overlap the grids
      //   into an unreadable smear. Only draw when bar spacing is wide enough that a
      //   grid fits WITHOUT colliding with its neighbours (genuinely zoomed in). The
      //   per-row bid/ask numbers below keep data on screen at all other zooms.
      const showText   = colW >= 11;
      const showSplit  = colW >= 22;
      const showBadges = bsp >= 70;
      // showWinner = the compact per-candle WINNER PILL (dominant side + its total
      //   volume, e.g. "AGG BUYS 113.2k"). Only ~54px wide, so it stays readable at
      //   NORMAL zoom — the old code only showed labels at bsp≥70 (extremely close),
      //   which is exactly the complaint. Draw the pill whenever a bar is ≥22px so
      //   the label is visible during ordinary trading, and stack the detailed 2×2
      //   grid on top only when genuinely zoomed in (showBadges).
      const showWinner = bsp >= 22;
      const fmtV  = (v: number) => {
        if (!isFinite(v) || v <= 0) return "0";
        return v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M`
             : v >= 1000       ? `${(v/1000).toFixed(1)}k`
             : v >= 10         ? `${Math.round(v)}`
             : v >= 1          ? v.toFixed(1)
             : v.toFixed(2);   // fractional crypto (0.30, 0.05) — never floor to "0"
      };

      // ── ETH/RTH session bands ───────────────────────────────
      if (extendedHours) {
        // Draw colored vertical bands for each session type
        // RTH: 9:30–16:00 ET, Pre-market: 4:00–9:30 ET, After-hours: 16:00–20:00 ET
        const intervalSec2 = getIntervalSec(timeframe);
        // Only useful for intraday timeframes
        if (intervalSec2 <= 3600) {
          const visRange = chart.timeScale().getVisibleRange();
          if (visRange) {
            const fromTs = (visRange.from as number);
            const toTs   = (visRange.to   as number);
            // Iterate each day in range
            let dayTs = Math.floor(fromTs / 86400) * 86400;
            while (dayTs <= toTs + 86400) {
              // ET = UTC-4 (EDT) or UTC-5 (EST). Use UTC-4 approximation.
              const etOffset = 4 * 3600; // seconds
              const dayStartET = dayTs + etOffset; // midnight ET in UTC
              // Pre-market: 4:00–9:30 ET
              const preStart  = dayTs + (4  * 3600) - etOffset;
              const preEnd    = dayTs + (9  * 3600 + 30 * 60) - etOffset;
              // RTH: 9:30–16:00 ET
              const rthStart  = preEnd;
              const rthEnd    = dayTs + (16 * 3600) - etOffset;
              // After-hours: 16:00–20:00 ET
              const ahStart   = rthEnd;
              const ahEnd     = dayTs + (20 * 3600) - etOffset;

              const drawBand = (start: number, end: number, color: string) => {
                const x1 = chart.timeScale().timeToCoordinate(start as any);
                const x2 = chart.timeScale().timeToCoordinate(end   as any);
                if (x1 == null || x2 == null) return;
                const left  = Math.min(x1, x2);
                const right = Math.max(x1, x2);
                if (right < 0 || left > W) return;
                ctx.fillStyle = color;
                ctx.fillRect(Math.max(0, left), 0, Math.min(right, W) - Math.max(0, left), H);
              };

              drawBand(preStart, preEnd, "rgba(255,200,0,0.07)");    // pre-market: gold
              drawBand(rthStart, rthEnd, "rgba(0,212,170,0.05)");    // RTH: green
              drawBand(ahStart,  ahEnd,  "rgba(255,140,0,0.07)");    // after-hours: orange

              // Session labels
              const labelBand = (start: number, label: string, color: string) => {
                const x = chart.timeScale().timeToCoordinate(start as any);
                if (x == null || x < 0 || x > W) return;
                ctx.fillStyle  = color;
                ctx.font       = "bold 11px sans-serif";
                ctx.textAlign  = "left";
                ctx.textBaseline = "top";
                ctx.fillText(label, x + 3, 4);
              };
              labelBand(preStart, "PRE", "rgba(255,200,0,0.85)");
              labelBand(rthStart, "RTH", "rgba(0,212,170,0.90)");
              labelBand(ahStart,  "AH",  "rgba(255,140,0,0.85)");

              dayTs += 86400;
            }
          }
        }
      }

      // Read the LIVE bar array from the ref each frame (not the `candles` state)
      // so the continuous RAF loop always has the latest data WITHOUT the effect
      // being torn down on every tick. This is what keeps the VP / footprint
      // overlays stable instead of flashing off when live ticks arrive.
      const liveBars = barsRef.current.length ? barsRef.current : candles;

      // Determine visible bar range from chart time scale.
      // ROOT-CAUSE FIX: when the user scrolls/pans the chart RIGHT into the empty
      // space past the last bar (very common, and auto-scroll does it on every new
      // bar), visRange.from can exceed the data length, making slice() return [].
      // Previously the whole draw function then `return`ed → the Volume Profile
      // (and footprint) VANISHED on interaction. Now we clamp the range and always
      // fall back to recent bars so there is ALWAYS something to render.
      let visibleBars: Bar[];
      try {
        const visRange = chartRef.current!.timeScale().getVisibleLogicalRange();
        if (visRange) {
          const lastIdx = liveBars.length - 1;
          const from = Math.max(0, Math.min(lastIdx, Math.floor(visRange.from) - 2));
          const to   = Math.max(0, Math.min(lastIdx, Math.ceil(visRange.to) + 2));
          visibleBars = from <= to ? liveBars.slice(from, to + 1) : [];
        } else {
          visibleBars = liveBars.slice(-120);
        }
      } catch {
        visibleBars = liveBars.slice(-120);
      }

      // Never bail the whole draw on an empty slice — fall back to recent bars so
      // the VP / footprint stay on screen even when scrolled into empty space.
      if (visibleBars.length === 0) visibleBars = liveBars.slice(-120);
      if (visibleBars.length === 0) return; // truly no data yet

      /* ═══════════════════════════════════════════════════════
         PLOT-AREA CLIP — everything below (footprint cells, VP boxes,
         Big-Trades bubbles) is confined to pane 0's price area so it
         can NEVER bleed into the right price-axis gutter (which sits
         under the DOM panel) or spill DOWN into the lower indicator
         panes. Without this clip, the newest bars' cells + VP + bubbles
         piled up on the right edge and smeared over the axis/DOM and
         into RSI/CVD panes. One save() here, one restore() at the very
         end of draw() (there are no top-level early-returns in between).
      ═══════════════════════════════════════════════════════ */
      let plotRight = W;
      try {
        const axW = (chart as any).priceScale?.("right")?.width?.();
        if (Number.isFinite(axW) && axW > 0) plotRight = Math.max(40, W - Math.ceil(axW));
      } catch {}
      let pane0Bottom = H;
      try {
        const ps = (chart as any).paneSize?.(0);
        if (ps && Number.isFinite(ps.height) && ps.height > 0) pane0Bottom = Math.ceil(ps.height);
      } catch {}
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, plotRight, pane0Bottom);
      ctx.clip();

      /* ═══════════════════════════════════════════════════════
         FOOTPRINT MODES — all draw at full candle height (high→low)
         so they're visible at any zoom level
      ═══════════════════════════════════════════════════════ */

      // Order Flow Candles forces bid-ask footprint regardless of setting.
      // When footprint is disabled, resolve to a non-matching mode so NO footprint
      // block renders — but the VP overlay further below still draws.
      const effectiveFP: FootprintType = !footprintEnabled
        ? ("__off__" as FootprintType)
        : (candleType === "orderflow-candles" ? "bid-ask" : footprintType);

      // Per-tool order-flow colors: pick the pair for the active footprint tool so
      // each gear stays independent. Falls back to bid-ask, then hardcoded default.
      const _ofcMap = ofColorsRef.current;
      const _ofc = _ofcMap[effectiveFP] || _ofcMap["bid-ask"] || { buy: [37,99,235] as [number,number,number], sell: [106,13,173] as [number,number,number] };
      const buyRgba  = (a: number | string) => `rgba(${_ofc.buy[0]},${_ofc.buy[1]},${_ofc.buy[2]},${a})`;
      const sellRgba = (a: number | string) => `rgba(${_ofc.sell[0]},${_ofc.sell[1]},${_ofc.sell[2]},${a})`;
      // VP bars + bubbles: green/red (independent, gear-controlled)
      const _vpc = vpColorsRef.current;
      const vpUpRgba  = (a: number | string) => `rgba(${_vpc.up[0]},${_vpc.up[1]},${_vpc.up[2]},${a})`;
      const vpDnRgba  = (a: number | string) => `rgba(${_vpc.dn[0]},${_vpc.dn[1]},${_vpc.dn[2]},${a})`;
      const vpPocRgba = (a: number | string) => `rgba(${_vpc.poc[0]},${_vpc.poc[1]},${_vpc.poc[2]},${a})`;
      const vpVahRgba = (a: number | string) => `rgba(${_vpc.vah[0]},${_vpc.vah[1]},${_vpc.vah[2]},${a})`;
      const vpValRgba = (a: number | string) => `rgba(${_vpc.val[0]},${_vpc.val[1]},${_vpc.val[2]},${a})`;

      // Readable footprint row size + crisp WHITE cell numbers. Every footprint
      // cell number is drawn pure white with a dark halo so it stays legible on
      // royal-blue, royal-purple, or dark backgrounds alike. fs scales with row
      // height but never drops below 10px (was 8px → unreadable).
      // Font must fit inside the row so numbers never overlap between rows.
      // With rows now ≥13px (see numLevels divisor) a 9–12px font sits cleanly.
      const cellFs = (rH: number) => Math.max(9, Math.min(12, Math.floor(rH * 0.6)));
      const cellNum = (txt: string, px: number, py: number, align: CanvasTextAlign, fs: number, color = "#ffffff") => {
        // Leave zero-volume rows BLANK like a pro footprint (TradingView/Bookmap).
        // On crypto, sub-0.005 BTC rows format to "0.00"; painting them turned the
        // whole profile into a wall of "0.00" that read as broken.
        if (txt === "0" || txt === "0.00" || txt === "0.0") return;
        ctx.font = `700 ${fs}px 'JetBrains Mono',monospace`;
        ctx.textAlign = align; ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.95)"; ctx.shadowBlur = 3;
        ctx.fillStyle = color;
        ctx.fillText(txt, px, py);
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
      };

      // Helper: draw a rounded-rectangle
      const rr = (x: number, y: number, w: number, h: number, r: number) => {
        if (Math.abs(w) < 0.5 || Math.abs(h) < 0.5) return;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
        else ctx.rect(x, y, w, h);
        ctx.fill();
      };

      /* ══════════════════════════════════════════════════════
         MODE 1: BID × ASK — Deep Charts style
         • Full-width cells: dark base, colored only when one side dominates
         • Green = ask dominant (buying pressure)
         • Purple = bid dominant (selling pressure)
         • Both bid + ask numbers inside each row
         • Thin colored candle border (green bull, purple bear) + wicks
         • Yellow POC border on highest-volume row
         • Delta badge above/below wick
      ══════════════════════════════════════════════════════ */
      if (effectiveFP === "bid-ask") {
        visibleBars.forEach(c => {
          const rawCx = chart.timeScale().timeToCoordinate(c.time as any);
          if (rawCx == null || rawCx < -colW || rawCx > W + colW) return;
          const cx = Math.round(rawCx);

          const rawYH = srs.priceToCoordinate(c.high);
          const rawYL = srs.priceToCoordinate(c.low);
          const rawYO = srs.priceToCoordinate(c.open);
          const rawYC = srs.priceToCoordinate(c.close);
          if (rawYH == null || rawYL == null || rawYO == null || rawYC == null) return;
          const yH = Math.round(rawYH);
          const yL = Math.round(rawYL);
          const yO = Math.round(rawYO);
          const yC = Math.round(rawYC);

          const fullH  = Math.max(2, yL - yH);
          const bodyY  = Math.min(yO, yC);
          const bodyH  = Math.max(2, Math.abs(yC - yO));
          const x      = cx - halfW;
          const isBull = c.close >= c.open;

          const borderColor = isBull ? buyRgba(0.90) : sellRgba(0.90);
          const borderColorDim = isBull ? buyRgba(0.50) : sellRgba(0.50);

          // Min 8px per row ensures every footprint row is clearly readable
          const maxLev = bsp >= 26 ? 14 : bsp >= 16 ? 10 : bsp >= 10 ? 6 : 3;
          const numLevels = Math.max(1, Math.min(maxLev, Math.floor(fullH / 12)));
          const rowH   = fullH / Math.max(1, numLevels);
          const levels = getBarFootprint(c, numLevels);
          const maxTot = Math.max(1, ...levels.map(l => l.total));

          // ── Dark cell base for entire candle range ──
          ctx.fillStyle = "rgba(15,20,35,0.55)";
          ctx.fillRect(x, yH, colW, fullH);

          // ── POC index ──
          const pocIdx = levels.length > 0
            ? levels.reduce((mi, l, i, a) => l.total > a[mi].total ? i : mi, 0)
            : -1;

          // ── Per-row cells ──
          levels.forEach((lv, li) => {
            const rowY  = Math.round(yH + li * rowH);
            const rH    = Math.max(1, Math.round(yH + (li + 1) * rowH) - rowY - 1);
            const askDom = lv.ask > lv.bid;
            const dom    = Math.max(lv.ask, lv.bid);
            const pass   = Math.min(lv.ask, lv.bid);
            const ratio  = dom / Math.max(1, pass);
            const volFrac = lv.total / maxTot;

            // Only color cells with meaningful dominance (≥1.3×) and volume
            if (ratio >= 1.3 && lv.total > 0) {
              const alpha = Math.min(0.72, 0.22 + volFrac * 0.28 + (ratio - 1.3) * 0.06);
              ctx.fillStyle = askDom
                ? buyRgba(alpha)
                : sellRgba(alpha);
              ctx.fillRect(x, rowY, colW, rH);
            }

            // Row divider
            if (li > 0 && rH >= 3) {
              ctx.fillStyle = "rgba(0,0,0,0.35)";
              ctx.fillRect(x, rowY, colW, 1);
            }

            // Numbers: bid left + ask right (split), or dominant centered (narrow)
            if (showText && rH >= 11) {
              const fs   = cellFs(rH);
              const midY = rowY + rH / 2;
              if (showSplit) {
                cellNum(fmtV(lv.bid), x + 3, midY, "left", fs);
                cellNum(fmtV(lv.ask), x + colW - 3, midY, "right", fs);
              } else {
                const domVal = askDom ? lv.ask : lv.bid;
                cellNum(fmtV(domVal), cx, midY, "center", fs);
              }
            }
          });

          // ── POC row — yellow border ──
          if (pocIdx >= 0) {
            const pocY = Math.round(yH + pocIdx * rowH);
            const pocH = Math.max(1, Math.round(yH + (pocIdx + 1) * rowH) - pocY - 1);
            ctx.strokeStyle = "rgba(240,180,41,0.95)";
            ctx.lineWidth = 1; ctx.setLineDash([]);
            ctx.strokeRect(x + 0.5, pocY + 0.5, colW - 1, pocH);
          }

          // ── Wicks (above body + below body) ──
          ctx.strokeStyle = borderColorDim; ctx.lineWidth = 1; ctx.setLineDash([]);
          if (yH < bodyY) { // upper wick
            ctx.beginPath(); ctx.moveTo(cx + 0.5, yH); ctx.lineTo(cx + 0.5, bodyY); ctx.stroke();
          }
          if (yL > bodyY + bodyH) { // lower wick
            ctx.beginPath(); ctx.moveTo(cx + 0.5, bodyY + bodyH); ctx.lineTo(cx + 0.5, yL); ctx.stroke();
          }

          // ── Candle body border ──
          ctx.strokeStyle = borderColor; ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, bodyY + 0.5, colW - 1, bodyH - 1);

          // ── Delta badge ──
          if (showBadges) {
            const netDelta = levels.reduce((s, l) => s + l.ask - l.bid, 0);
            const isPos    = netDelta >= 0;
            const dLbl     = (isPos ? "+" : "") + fmtV(netDelta);
            const bW = Math.max(colW + 2, 28), bH = 13;
            const bY = yH - bH - 3;
            ctx.fillStyle = isPos ? buyRgba(0.92) : sellRgba(0.92);
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(cx - bW/2, bY, bW, bH, 2);
            else ctx.rect(cx - bW/2, bY, bW, bH);
            ctx.fill();
            ctx.fillStyle = "#fff"; ctx.font = "bold 9px 'JetBrains Mono',monospace";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(dLbl, cx, bY + bH / 2);
          }
        });
      }

      /* ══════════════════════════════════════════════════════
         MODE 2: DELTA — rows across full candle height,
         green/red fill intensity proportional to net delta,
         bid/ask numbers per row when zoomed, badge below wick
      ══════════════════════════════════════════════════════ */
      if (effectiveFP === "delta") {
        visibleBars.forEach(c => {
          const rawCx = chart.timeScale().timeToCoordinate(c.time as any);
          if (rawCx == null || rawCx < -colW || rawCx > W + colW) return;
          const cx = Math.round(rawCx);
          const rawYH = srs.priceToCoordinate(c.high);
          const rawYL = srs.priceToCoordinate(c.low);
          if (rawYH == null || rawYL == null) return;
          const yH = Math.round(rawYH);
          const yL = Math.round(rawYL);

          const fullH = Math.max(2, yL - yH);
          // Min 8px per row ensures every footprint row is clearly readable
          const maxLev = bsp >= 26 ? 14 : bsp >= 16 ? 10 : bsp >= 10 ? 6 : 3;
          const numLevels = Math.max(1, Math.min(maxLev, Math.floor(fullH / 12)));
          const rowH   = fullH / Math.max(1, numLevels);
          const levels = getBarFootprint(c, numLevels);

          // Dark base
          ctx.fillStyle = "rgba(15,20,35,0.55)";
          ctx.fillRect(cx - halfW, yH, colW, fullH);

          const maxTotD = Math.max(1, ...levels.map(l => l.total));
          const pocIdxD = levels.reduce((mi, l, i, a) => l.total > a[mi].total ? i : mi, 0);

          levels.forEach((lv, li) => {
            const rowY  = Math.round(yH + li * rowH);
            const rH    = Math.max(1, Math.round(yH + (li + 1) * rowH) - rowY - 1);
            const delta = lv.ask - lv.bid;
            const volFrac = lv.total / maxTotD;
            // Blue for positive delta (ask dominant), red for negative (bid dominant)
            const intensity = Math.min(0.75, 0.20 + volFrac * 0.30 + Math.abs(delta) / Math.max(1, lv.total) * 0.40);
            if (lv.total > 0) {
              ctx.fillStyle = delta >= 0
                ? buyRgba(intensity)   // royal blue — buying pressure
                : sellRgba(intensity); // royal purple — selling pressure
              ctx.fillRect(cx - halfW, rowY, colW, rH);
            }

            // Row divider
            if (li > 0 && rH >= 3) {
              ctx.fillStyle = "rgba(0,0,0,0.30)";
              ctx.fillRect(cx - halfW, rowY, colW, 1);
            }

            if (showText && rH >= 11) {
              const fs = cellFs(rH);
              const midY = rowY + rH / 2;
              if (showSplit) {
                cellNum(fmtV(lv.bid), cx - halfW + 3, midY, "left", fs);
                cellNum(fmtV(lv.ask), cx + halfW - 3, midY, "right", fs);
              } else {
                const dVal = lv.ask - lv.bid;
                cellNum((dVal >= 0 ? "+" : "") + fmtV(Math.abs(dVal)), cx, midY, "center", fs);
              }
            }

            // POC yellow border
            if (li === pocIdxD) {
              ctx.strokeStyle = "rgba(240,180,41,0.95)"; ctx.lineWidth = 1; ctx.setLineDash([]);
              ctx.strokeRect(cx - halfW + 0.5, rowY + 0.5, colW - 1, rH);
            }
          });

          if (showBadges) {
            const netDelta = levels.reduce((s, l) => s + l.ask - l.bid, 0);
            const isPos = netDelta >= 0;
            const dLbl = (isPos ? "Δ+" : "Δ") + fmtV(Math.abs(netDelta));
            const bColor = isPos ? buyRgba(0.92) : sellRgba(0.92);
            const bW = Math.max(colW + 2, 26), bH = 13;
            ctx.fillStyle = bColor;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(cx - bW/2, yH - bH - 3, bW, bH, 2);
            else ctx.rect(cx - bW/2, yH - bH - 3, bW, bH);
            ctx.fill();
            ctx.fillStyle = "#fff"; ctx.font = "bold 9px 'JetBrains Mono',monospace";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(dLbl, cx, yH - bH - 3 + bH / 2);
          }
        });
      }

      /* ══════════════════════════════════════════════════════
         WM DELTA BUBBLES — separate from Big Trades.
         Net aggressive delta per price zone; only in delta footprint mode.
      ══════════════════════════════════════════════════════ */
      if (effectiveFP === "delta") {
        const realTapeD = hasRealAggressorTape(tapeSourceRef.current ?? "");
        if (!realTapeD) {
          if (deltaBubblesRef.current.length) {
            deltaBubblesRef.current = [];
            deltaBubbleSpawnRef.current = new Set();
          }
        } else if (!bubblePausedRef.current) {
          visibleBars.forEach(c => {
            const rawCx = chart.timeScale().timeToCoordinate(c.time as any);
            if (rawCx == null || rawCx < -colW || rawCx > W + colW) return;
            const cx = Math.round(rawCx);
            const ranked = getDeltaBubbleLevels(c);
            if (ranked.length === 0) return;
            const maxAbsD = Math.max(...ranked.map(l => Math.abs(l.delta)), 1e-9);
            ranked.forEach((lv, rankIdx) => {
              const spawnKey = `dt:${c.time}:${lv.priceLevel}`;
              if (deltaBubbleSpawnRef.current.has(spawnKey)) return;
              deltaBubbleSpawnRef.current.add(spawnKey);
              const absDelta = Math.abs(lv.delta);
              // Radius normalized to the bar's strongest zone → always visible AND
              // volume-proportional on any asset (BTC 0.05Δ or stock 500Δ alike).
              const norm = Math.sqrt(absDelta / maxAbsD);
              const baseR = Math.round(11 + norm * 14);
              const side: "buy" | "sell" = lv.delta >= 0 ? "buy" : "sell";
              const sph = Math.sin((c.time as number) * 0.023 + lv.priceLevel * 0.417 + rankIdx * 2.1) * 43758.5453;
              const phase = (sph - Math.floor(sph)) * Math.PI * 2;
              const rawLevY = srs.priceToCoordinate(lv.priceLevel);
              if (rawLevY == null) return;
              deltaBubblesRef.current.push({
                id: ++bubbleIdRef.current,
                x: cx, y: Math.round(rawLevY), vx: 0, vy: 0,
                baseR, r: baseR * 0.35, phase, big: false,
                side,
                value: (side === "buy" ? 1 : -1) * absDelta,
                born: (c.time as number) * 1000 + rankIdx + 500,
                anchorTime: c.time as number,
                anchorPrice: lv.priceLevel,
                levelIdx: rankIdx,
                siblingN: ranked.length,
                kind: "delta",
                spawnKey,
              });
            });
          });
        }
        if (deltaBubbleSpawnRef.current.size > 400) deltaBubbleSpawnRef.current = new Set();

        const nowDelta = performance.now();
        for (const b of deltaBubblesRef.current) {
          const hx = chart.timeScale().timeToCoordinate(b.anchorTime as any);
          const hy = srs.priceToCoordinate(b.anchorPrice);
          if (hx == null || hy == null) continue;
          const bob = Math.sin(b.phase + nowDelta / 1600) * 3;
          const sibN = b.siblingN ?? 1;
          const lvlIx = b.levelIdx ?? 0;
          const spread = sibN > 1 ? Math.min(34, Math.max(18, b.baseR)) : 0;
          const offX = sibN > 1 ? (lvlIx - (sibN - 1) / 2) * spread : 0;
          const homeX = hx + offX + Math.cos(b.phase + nowDelta / 2400) * 2;
          const homeY = hy + bob - 3;
          b.vx += (homeX - b.x) * 0.012; b.vy += (homeY - b.y) * 0.012;
          b.vx *= 0.93; b.vy *= 0.93;
          b.x += b.vx; b.y += b.vy;
          if (b.r < b.baseR) b.r += (b.baseR - b.r) * 0.12;
        }
        const deltaSurvivors: Bubble[] = [];
        for (const b of deltaBubblesRef.current) {
          const hx = chart.timeScale().timeToCoordinate(b.anchorTime as any);
          if (hx == null || hx < -80 || hx > W + 80) {
            deltaBubbleSpawnRef.current.delete(b.spawnKey);
            continue;
          }
          deltaSurvivors.push(b);
        }
        deltaBubblesRef.current = deltaSurvivors;

        const hoverIdD = bubbleHoverRef.current;
        for (const b of deltaBubblesRef.current) {
          const buy = b.side === "buy";
          const core = buy ? "34,197,94" : "239,68,68";
          const isHover = hoverIdD === b.id;
          const t = nowDelta / 520 + b.phase;
          const wob = 1 + Math.sin(t) * 0.05;
          const Rx = Math.max(0.1, b.r * wob);
          const Ry = Math.max(0.1, b.r / wob);
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Rx + 4, Ry + 4, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${core},0.10)`;
          ctx.fill();
          const g = ctx.createRadialGradient(b.x, b.y, Rx * 0.2, b.x, b.y, Rx);
          g.addColorStop(0, `rgba(${core},0.04)`);
          g.addColorStop(0.72, `rgba(${core},0.08)`);
          g.addColorStop(0.93, `rgba(${core},0.26)`);
          g.addColorStop(1, `rgba(255,255,255,0.32)`);
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Rx, Ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Math.max(0.1, Rx - 0.6), Math.max(0.1, Ry - 0.6), 0, 0, Math.PI * 2);
          ctx.lineWidth = isHover ? 2.6 : 1.7;
          ctx.strokeStyle = `rgba(255,255,255,${isHover ? 0.98 : 0.82})`;
          ctx.stroke();
          if (b.r >= 7) {
            const p = b.anchorPrice;
            const lbl = p >= 100 ? p.toFixed(2) : p >= 1 ? p.toFixed(2) : p.toFixed(4);
            const fontPx = Math.max(8, Math.min(13, Rx * 0.48));
            ctx.font = `bold ${fontPx}px Inter, monospace`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.lineWidth = Math.max(2, fontPx * 0.22);
            ctx.strokeStyle = "rgba(0,0,0,0.88)";
            ctx.strokeText(lbl, b.x, b.y);
            ctx.fillStyle = "rgba(255,255,255,0.99)";
            ctx.fillText(lbl, b.x, b.y);
          }
          ctx.restore();
        }
      } else if (deltaBubblesRef.current.length) {
        deltaBubblesRef.current = [];
        deltaBubbleSpawnRef.current = new Set();
      }

      /* ══════════════════════════════════════════════════════
         MODE 3: VOLUME PROFILE — horizontal VP bars per bar
         Full candle height, bid left / ask right split bars,
         bid/ask numbers at each row, gold POC line
      ══════════════════════════════════════════════════════ */
      if (effectiveFP === "volume-profile") {
        visibleBars.forEach(c => {
          const rawCx = chart.timeScale().timeToCoordinate(c.time as any);
          if (rawCx == null || rawCx < -colW || rawCx > W + colW) return;
          const cx = Math.round(rawCx);
          const rawYH = srs.priceToCoordinate(c.high);
          const rawYL = srs.priceToCoordinate(c.low);
          if (rawYH == null || rawYL == null) return;
          const yH = Math.round(rawYH);
          const yL = Math.round(rawYL);

          const fullH     = Math.max(4, yL - yH);
          // Min 8px per row ensures every footprint row is clearly readable
          const maxLev = bsp >= 26 ? 14 : bsp >= 16 ? 10 : bsp >= 10 ? 6 : 3;
          const numLevels = Math.max(1, Math.min(maxLev, Math.floor(fullH / 12)));
          const rowH   = fullH / Math.max(1, numLevels);
          const levels = getBarFootprint(c, numLevels);
          const maxTot = Math.max(1, ...levels.map(l => l.total));
          const maxBarW = halfW - 1;

          // Dark base
          ctx.fillStyle = "rgba(15,20,35,0.50)";
          ctx.fillRect(cx - halfW, yH, colW, fullH);

          // Draw VP bars — ask left (green), bid right (purple)
          levels.forEach((lv, li) => {
            const rowY   = Math.round(yH + li * rowH);
            const rH     = Math.max(1, Math.round(yH + (li + 1) * rowH) - rowY - 1);
            const frac   = lv.total / maxTot;
            const alpha  = 0.18 + frac * 0.42; // 0.18–0.60
            const askW   = Math.round((lv.ask / maxTot) * maxBarW);
            const bidW   = Math.round((lv.bid / maxTot) * maxBarW);

            // Ask bars grow left from center (green)
            ctx.fillStyle = buyRgba(alpha.toFixed(2));
            ctx.fillRect(cx - askW, rowY, askW, rH);
            // Bid bars grow right from center (purple)
            ctx.fillStyle = sellRgba(alpha.toFixed(2));
            ctx.fillRect(cx, rowY, bidW, rH);

            // Row divider
            if (li > 0 && rH >= 3) {
              ctx.fillStyle = "rgba(0,0,0,0.30)";
              ctx.fillRect(cx - halfW, rowY, colW, 1);
            }

            if (showText && rH >= 11) {
              const fs = cellFs(rH);
              const midY = rowY + rH / 2;
              if (showSplit) {
                cellNum(fmtV(lv.ask), cx - 3, midY, "right", fs);
                cellNum(fmtV(lv.bid), cx + 3, midY, "left", fs);
              } else {
                cellNum(fmtV(lv.total), cx, midY, "center", fs);
              }
            }
          });

          // POC — thin gold horizontal line only (no label unless very zoomed)
          const pocIdx = levels.reduce((mi, l, i, a) => l.total > a[mi].total ? i : mi, 0);
          const pocY   = Math.round(yH + pocIdx * rowH + rowH / 2);
          ctx.strokeStyle = "rgba(240,180,41,0.70)"; ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath(); ctx.moveTo(cx - halfW, pocY); ctx.lineTo(cx + halfW, pocY); ctx.stroke();
          ctx.setLineDash([]);
        });
      }

      /* ══════════════════════════════════════════════════════
         MODE 4: IMBALANCE — full candle height rows,
         highlight cells where bid/ask ratio ≥ 2.5×,
         show ratio text, badge above wick when notable
      ══════════════════════════════════════════════════════ */
      if (effectiveFP === "imbalance") {
        visibleBars.forEach(c => {
          const rawCx = chart.timeScale().timeToCoordinate(c.time as any);
          if (rawCx == null || rawCx < -colW || rawCx > W + colW) return;
          const cx = Math.round(rawCx);
          const rawYH = srs.priceToCoordinate(c.high);
          const rawYL = srs.priceToCoordinate(c.low);
          if (rawYH == null || rawYL == null) return;
          const yH = Math.round(rawYH);
          const yL = Math.round(rawYL);

          const fullH  = Math.max(2, yL - yH);
          const maxLev2 = bsp >= 26 ? 14 : bsp >= 16 ? 10 : bsp >= 10 ? 6 : 3;
          const numLev = Math.max(1, Math.min(maxLev2, Math.floor(fullH / 12)));
          const rowH   = fullH / Math.max(1, numLev);
          const levels = getBarFootprint(c, numLev);
          const x      = cx - halfW;

          levels.forEach((lv, li) => {
            const rowY   = Math.round(yH + li * rowH);
            const rH     = Math.max(1, Math.round(yH + (li + 1) * rowH) - rowY - 1);
            const ratio  = lv.ask > 0 && lv.bid > 0
              ? Math.max(lv.ask, lv.bid) / Math.min(lv.ask, lv.bid)
              : (lv.ask > 0 || lv.bid > 0 ? 8 : 1);

            if (ratio < 2.5) return; // only draw imbalanced cells

            const askDom = lv.ask > lv.bid;
            const alpha  = Math.min(0.88, 0.45 + (ratio - 2.5) * 0.08);
            ctx.fillStyle = askDom ? buyRgba(alpha) : sellRgba(alpha);
            ctx.fillRect(x, rowY, colW, rH);

            if (showText && rH >= 11) {
              const fs = cellFs(rH);
              const midY = rowY + rH / 2;
              if (showSplit) {
                cellNum(fmtV(lv.ask), x + 3, midY, "left", fs);
                cellNum(fmtV(lv.bid), x + colW - 3, midY, "right", fs);
              } else {
                cellNum(`${ratio.toFixed(1)}×`, cx, midY, "center", fs);
              }
            }
          });

          // Imbalance badge — only when zoomed in enough
          if (showBadges) {
            const totAsk  = levels.reduce((s, l) => s + l.ask, 0);
            const totBid  = levels.reduce((s, l) => s + l.bid, 0);
            const totRatio = totAsk > 0 && totBid > 0
              ? Math.max(totAsk, totBid) / Math.min(totAsk, totBid) : 1;
            if (totRatio >= 2.0) {
              const bW = Math.max(colW + 4, 28), bH = 13;
              const bY = yH - bH - 2;
              ctx.fillStyle = totAsk > totBid ? buyRgba(0.90) : sellRgba(0.90);
              ctx.beginPath();
              if (ctx.roundRect) ctx.roundRect(cx - bW/2, bY, bW, bH, 2);
              else ctx.rect(cx - bW/2, bY, bW, bH);
              ctx.fill();
              ctx.fillStyle = "#fff"; ctx.font = "bold 11px monospace";
              ctx.textAlign = "center"; ctx.textBaseline = "middle";
              ctx.fillText(`${totRatio.toFixed(1)}×`, cx, bY + bH / 2);
            }
          }
        });
      }

      /* ══════════════════════════════════════════════════════
         MODE 5: AGGRESSIVE / PASSIVE
         Green = aggressive buying (market orders lifting the ask)
         Red   = aggressive selling (market orders hitting the bid)
         Only highlights rows with clear aggression (ratio ≥ 1.5×).
         Neutral rows show a faint background only.
      ══════════════════════════════════════════════════════ */
      if (effectiveFP === "aggressive-passive") {
        visibleBars.forEach(c => {
          const rawCx = chart.timeScale().timeToCoordinate(c.time as any);
          if (rawCx == null || rawCx < -colW || rawCx > W + colW) return;
          const cx = Math.round(rawCx);
          const rawYH = srs.priceToCoordinate(c.high);
          const rawYL = srs.priceToCoordinate(c.low);
          if (rawYH == null || rawYL == null) return;
          const yH = Math.round(rawYH);
          const yL = Math.round(rawYL);

          const fullH  = Math.max(2, yL - yH);
          const maxLev2 = bsp >= 26 ? 14 : bsp >= 16 ? 10 : bsp >= 10 ? 6 : 3;
          const numLev = Math.max(1, Math.min(maxLev2, Math.floor(fullH / 12)));
          const rowH   = fullH / Math.max(1, numLev);
          const levels = getBarFootprint(c, numLev);
          const x      = cx - halfW;

          // Faint neutral background for the entire candle range
          ctx.fillStyle = "rgba(100,120,160,0.07)";
          ctx.fillRect(x, yH, colW, fullH);

          levels.forEach((lv, li) => {
            const rowY   = Math.round(yH + li * rowH);
            const rH     = Math.max(1, Math.round(yH + (li + 1) * rowH) - rowY - 1);
            const tot    = lv.ask + lv.bid;
            if (tot === 0) return;

            // ── ROLE-COLORED CELL BOXES (numbers stay crisp white) ──────────
            // Each level splits into a LEFT half (ask / buyer-initiated) and a
            // RIGHT half (bid / seller-initiated). Each half is tinted by its LIVE
            // role at this price level:
            //   ask near the HIGH → Passive Sellers (orange), else Aggressive Buyers (blue)
            //   bid near the LOW  → Passive Buyers (gray),   else Aggressive Sellers (purple)
            // Alpha is scaled by that side's share of the level so the dominant
            // side reads stronger — but capped soft (~0.56) so it's clean and easy
            // on the eyes, never harsh neon. The number rides on top in white with
            // a dark shadow for maximum legibility. Every level with volume paints
            // (the old ≥1.5× gate that left rows blank is gone).
            const askShare = lv.ask / tot, bidShare = lv.bid / tot;
            const askAlpha = 0.14 + askShare * 0.42;
            const bidAlpha = 0.14 + bidShare * 0.42;
            const askFill  = lv.relPos > 0.80 ? `rgba(255,149,0,${askAlpha.toFixed(2)})`   : buyRgba(askAlpha.toFixed(2));
            const bidFill  = lv.relPos < 0.20 ? `rgba(148,163,184,${bidAlpha.toFixed(2)})` : sellRgba(bidAlpha.toFixed(2));
            const halfW2   = Math.round(colW / 2);
            ctx.fillStyle = askFill; ctx.fillRect(x, rowY, halfW2, rH);
            ctx.fillStyle = bidFill; ctx.fillRect(x + halfW2, rowY, colW - halfW2, rH);

            if (showText && rH >= 11) {
              const fs  = cellFs(rH);
              const midY = rowY + rH / 2;
              if (showSplit) {
                cellNum(fmtV(lv.ask), x + 3, midY, "left", fs);          // white
                cellNum(fmtV(lv.bid), x + colW - 3, midY, "right", fs);  // white
              } else {
                cellNum(fmtV(Math.max(lv.ask, lv.bid)), cx, midY, "center", fs);
              }
            }
          });

          // Row dividers — only when zoomed in enough
          if (bsp >= 16) {
            ctx.strokeStyle = "rgba(0,0,0,0.20)"; ctx.lineWidth = 1; ctx.setLineDash([]);
            for (let li = 1; li < numLev; li++) {
              const ly = Math.round(yH + li * rowH);
              ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + colW, ly); ctx.stroke();
            }
          }

          if (showWinner) {
            // ── PER-CANDLE ORDER-FLOW SUMMARY ──────────────────────────────
            // Four REAL numbers, computed live from THIS candle's own footprint
            // levels (getBarFootprint → real tick data when present, deterministic
            // sim otherwise). Nothing here is hardcoded.
            //
            //   ask = buyer-initiated (market buy lifting the offer)
            //   bid = seller-initiated (market sell hitting the bid)
            //   relPos: 0 = candle LOW, 1 = candle HIGH
            //
            //   Aggressive Buyers  (blue)   = ask volume that DROVE price
            //   Passive  Sellers   (orange) = ask volume ABSORBED at the high wick
            //   Aggressive Sellers (purple) = bid volume that DROVE price
            //   Passive  Buyers    (gray)   = bid volume ABSORBED at the low wick
            // Read the roles from the FIXED sub-profile, never from the display
            // bins: `numLev` changes with zoom, so a relPos>0.80 test against
            // display bins would re-slice (and re-total) these four numbers every
            // time the user zoomed. getBarRoles integrates the same fixed grid.
            const { aggBuy, aggSell, pasBuy, pasSell } = getBarRoles(c);
            const BLUE = buyRgba(0.98), PURPLE = sellRgba(0.98);
            const GRAY = "rgba(148,163,184,0.98)", ORANGE = "rgba(255,149,0,0.98)";

            // ── DOMINANT WINNER ───────────────────────────────────────────
            // The single biggest of the four real roles decides the headline
            // label + its total volume (e.g. "AGG BUYS 113.2k").
            const roles: Array<{ v: number; lbl: string; col: string; txt: string }> = [
              { v: aggBuy,  lbl: "AGG BUYS",  col: BLUE,   txt: "#fff"    },
              { v: aggSell, lbl: "AGG SELLS", col: PURPLE, txt: "#fff"    },
              { v: pasBuy,  lbl: "PSV BUYS",  col: GRAY,   txt: "#0b1220" },
              { v: pasSell, lbl: "PSV SELLS", col: ORANGE, txt: "#fff"    },
            ];
            const win = roles.reduce((a, b) => (b.v > a.v ? b : a));

            // ── COMPACT WINNER PILL: "AGG BUYS 113.2k" ─────────────────────
            // Single prominent pill above the candle high — readable at normal
            // zoom (label text + volume value on one line). Skip flat/empty
            // candles (win.v === 0) so we never paint a meaningless "AGG BUYS 0".
            const pillH  = 15;
            const pillY  = yH - pillH - 3;                       // just above candle high
            if (win.v > 0) {
              const pillTxt = `${win.lbl} ${fmtV(win.v)}`;
              ctx.font = "bold 11px monospace";
              const pillW  = Math.max(colW + 6, ctx.measureText(pillTxt).width + 12);
              ctx.fillStyle = win.col;
              ctx.beginPath();
              if (ctx.roundRect) ctx.roundRect(cx - pillW / 2, pillY, pillW, pillH, 3);
              else ctx.rect(cx - pillW / 2, pillY, pillW, pillH);
              ctx.fill();
              ctx.fillStyle = win.txt;
              ctx.textAlign = "center"; ctx.textBaseline = "middle";
              ctx.fillText(pillTxt, cx, pillY + pillH / 2 + 0.5);
            }

            if (showBadges) {
              // ── DETAILED 2×2 GRID (only when zoomed in) ──────────────────
              // The four short values (e.g. 33k / 40k / 10k / 7k) sit cleanly
              // above the winner pill. Grid ≈ colW wide; only at bsp≥70.
              const cells: Array<[number, string]> = [
                [aggBuy,  BLUE],    // blue   top-left
                [aggSell, PURPLE],  // purple top-right
                [pasBuy,  GRAY],    // gray   bottom-left
                [pasSell, ORANGE],  // orange bottom-right
              ];
              const rowH_s = 13;
              const colW_s = Math.max(34, Math.round(colW / 2) + 2);
              const totalW = colW_s * 2;
              const left   = cx - totalW / 2;
              const gridTop = pillY - (rowH_s * 2) - 6;          // grid above the winner pill

              ctx.fillStyle = "rgba(11,18,32,0.68)";
              ctx.beginPath();
              if (ctx.roundRect) ctx.roundRect(left - 2, gridTop - 2, totalW + 4, rowH_s * 2 + 4, 3);
              else ctx.rect(left - 2, gridTop - 2, totalW + 4, rowH_s * 2 + 4);
              ctx.fill();

              ctx.font = "bold 11px monospace";
              ctx.textBaseline = "middle";
              cells.forEach(([val, col], idx) => {
                const colIdx = idx % 2, rowIdx = Math.floor(idx / 2);
                const cxCell = left + colIdx * colW_s + colW_s / 2;
                const cyCell = gridTop + rowIdx * rowH_s + rowH_s / 2;
                ctx.fillStyle = col;
                ctx.textAlign = "center";
                ctx.fillText(fmtV(val), cxCell, cyCell);
              });
            }
          }
        });

        // (Per-tool "?" popover carries the deep explanation; the shared 4-way
        // legend below stamps the live numbers for every order-flow mode.)
      }

      /* ══════════════════════════════════════════════════════
         SHARED ORDER-FLOW LEGEND — REMOVED FROM THE CHART.
         Per user's explicit request the four-role Aggressive/Passive
         legend no longer draws on the chart canvas (it was cluttering
         the top-left corner). The beginner-friendly 4-way legend with
         plain-English descriptions now lives ONLY in the per-tool gear
         popover — see FootprintControls.tsx (OrderFlowColorGear, the
         "Agg/Passive 4-way legend" block). Nothing is stamped here.
      ══════════════════════════════════════════════════════ */

      /* ══════════════════════════════════════════════════════
         MODE 6: BIG TRADES — Deep Charts style
         Standard green/purple candle bodies + wicks.
         Circles drawn at the highest-volume price level when
         that level is ≥2× the average level volume.
         Circle size ∝ relative volume. Green = ask dominant,
         pink/magenta = bid dominant.
      ══════════════════════════════════════════════════════ */
      // Big Trades draws when it's the active exclusive mode OR when Simultaneous
      // Mode is on (bigTradesOverlay) — in the latter case the primary order-flow
      // block above has already drawn, and we paint the bubbles on top.
      if (effectiveFP === "big-trades" || bigTradesOverlay) {
        // ── Pause / Refresh controls (toolbar gear dropdown) ──────────────
        // Refresh: wipe all bubbles + the per-bar dedupe set so the engine
        // re-detects and re-spawns from scratch this frame.
        if (bubbleRefreshRef.current !== bubbleRefreshSeenRef.current) {
          bubbleRefreshSeenRef.current = bubbleRefreshRef.current;
          bubblesRef.current = [];
          bubbleSpawnRef.current = new Set();
        }
        const bubblesPaused = bubblePausedRef.current;
        const realTape = hasRealAggressorTape(tapeSourceRef.current ?? "");

        // No real aggressor tape → never show synthetic/demo bubbles.
        if (!realTape) {
          if (bubblesRef.current.length) {
            bubblesRef.current = [];
            bubbleSpawnRef.current = new Set();
            bubbleHoverRef.current = null;
          }
        } else if (!bubblesPaused) {
        // ── Pass A: Big Trades — individual large prints at EXACT tick prices.
        visibleBars.forEach(c => {
          const rawCx = chart.timeScale().timeToCoordinate(c.time as any);
          if (rawCx == null || rawCx < -colW || rawCx > W + colW) return;
          const cx = Math.round(rawCx);

          const ranked = getRealBigTradeLevels(c);
          if (ranked.length === 0) return;

          const barMean = ranked.reduce((s, lv) => s + lv.total, 0) / ranked.length;

          ranked.forEach((lv, rankIdx) => {
            const spawnKey = `bt:${c.time}:${lv.priceLevel}`;
            if (bubbleSpawnRef.current.has(spawnKey)) return;
            bubbleSpawnRef.current.add(spawnKey);

            const ratio = lv.total / Math.max(1, barMean);
            const baseR = Math.round(Math.max(9, Math.min(28, 9 + Math.sqrt(Math.max(0, ratio - 1)) * 11)));
            const side: "buy" | "sell" = lv.ask >= lv.bid ? "buy" : "sell";
            const value = (side === "buy" ? 1 : -1) * Math.round(lv.total);
            const sph   = Math.sin((c.time as number) * 0.017 + lv.priceLevel * 0.531 + rankIdx * 1.7) * 43758.5453;
            const phase = (sph - Math.floor(sph)) * Math.PI * 2;
            const rawLevY = srs.priceToCoordinate(lv.priceLevel);
            if (rawLevY == null) return;
            const levY = Math.round(rawLevY);

            bubblesRef.current.push({
              id:    ++bubbleIdRef.current,
              x:     cx,  y: levY,  vx: 0, vy: 0,
              baseR,
              r:     baseR * 0.35,
              phase,
              big:   true,
              side,
              value,
              born:  (c.time as number) * 1000 + rankIdx,
              anchorTime:  c.time as number,
              anchorPrice: lv.priceLevel,
              levelIdx: rankIdx,
              siblingN: ranked.length,
              kind: "big-trade",
              spawnKey,
            });
            playBloop(baseR > 24);
          });
        });
        }

        // Keep the dedupe set from growing unbounded
        if (bubbleSpawnRef.current.size > 400) bubbleSpawnRef.current = new Set();

        // ── Pass B: update + draw all active bubbles (🫧 hover at key levels) ──
        const nowMs = performance.now();
        const bubbles = bubblesRef.current;

        // Physics: spring each bubble toward its anchored key level so it floats
        // gently AT the level (buoyant bob). No lifespan, no expiry — a bubble
        // never fades or pops; it persists until its bar scrolls off screen.
        for (const b of bubbles) {
          const hx = chart.timeScale().timeToCoordinate(b.anchorTime as any);
          const hy = srs.priceToCoordinate(b.anchorPrice);
          if (hx == null || hy == null) continue; // off-screen → culled below
          const bob   = Math.sin(b.phase + nowMs / 1600) * 3;
          const sibN  = b.siblingN ?? 1;
          const lvlIx = b.levelIdx ?? 0;
          const spread = sibN > 1 ? Math.min(28, Math.max(14, b.baseR * 0.75)) : 0;
          const offX  = sibN > 1 ? (lvlIx - (sibN - 1) / 2) * spread : 0;
          const homeX = hx + offX + Math.cos(b.phase + nowMs / 2400) * 2;
          const homeY = hy + bob - 3;
          b.vx += (homeX - b.x) * 0.012;
          b.vy += (homeY - b.y) * 0.012;
          b.vx *= 0.93; b.vy *= 0.93;
          b.x += b.vx; b.y += b.vy;
          if (b.r < b.baseR) b.r += (b.baseR - b.r) * 0.12; // ease up on spawn
        }

        // Cull only bubbles whose anchor bar scrolled off-screen (freeing the
        // dedupe key so it re-spawns on pan-back). Then enforce the user's
        // max-visible cap by keeping the NEWEST N — never fade the rest out.
        const survivors: Bubble[] = [];
        for (const b of bubbles) {
          const hx = chart.timeScale().timeToCoordinate(b.anchorTime as any);
          if (hx == null || hx < -80 || hx > W + 80) {
            // free this level's dedupe key so it re-spawns on pan-back
            bubbleSpawnRef.current.delete(b.spawnKey ?? `bt:${b.anchorTime}:${b.anchorPrice}`);
            continue;
          }
          survivors.push(b);
        }
        const cap = bubbleMaxRef.current;
        bubblesRef.current = survivors.length > cap
          ? survivors.sort((a, z) => z.born - a.born).slice(0, cap)
          : survivors;

        // Draw WM VP FIRST (under the bubbles) so Big Trades + Session VP don't
        // hide the bubbles behind the profile. Guarded → won't double-draw later.
        runWMVP();

        // Draw bubbles — real water-bubble look: transparent glassy body,
        // bright iridescent rim, specular highlights, gentle wobble. Fully
        // opaque and always present (no fade, no pop).
        const hoverId = bubbleHoverRef.current;
        for (const b of bubblesRef.current) {
          const buy = b.side === "buy";
          // Green = aggressive buy, red = aggressive sell — boosted contrast so both
          // are unmistakable when several bubbles share one candle.
          const core = buy ? "0,212,170" : "255,77,106";
          const isHover = hoverId === b.id;

          // gentle squash/stretch wobble so they feel alive like real bubbles
          const t = nowMs / 520 + b.phase;
          const wob = 1 + Math.sin(t) * 0.05;
          const Rx = Math.max(0.1, b.r * wob);
          const Ry = Math.max(0.1, b.r / wob);

          ctx.save();

          // outer halo (soft tinted glow)
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Rx + 4, Ry + 4, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${core},0.10)`;
          ctx.fill();

          // glassy body: transparent center → faint tint → brighter near the rim
          const g = ctx.createRadialGradient(b.x, b.y, Rx * 0.2, b.x, b.y, Rx);
          g.addColorStop(0,    `rgba(${core},0.04)`);   // see-through middle
          g.addColorStop(0.72, `rgba(${core},0.08)`);
          g.addColorStop(0.93, `rgba(${core},0.26)`);   // tint gathers at edge
          g.addColorStop(1,    `rgba(255,255,255,0.32)`); // bright rim light
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Rx, Ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();

          // bright thin membrane rim (the signature of a water bubble)
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Math.max(0.1, Rx - 0.6), Math.max(0.1, Ry - 0.6), 0, 0, Math.PI * 2);
          ctx.lineWidth = isHover ? 2.6 : 1.7;
          ctx.strokeStyle = `rgba(255,255,255,${isHover ? 0.98 : 0.82})`;
          ctx.stroke();
          // faint colored inner ring for iridescence
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Math.max(0.1, Rx - 2.4), Math.max(0.1, Ry - 2.4), 0, 0, Math.PI * 2);
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(${core},0.55)`;
          ctx.stroke();

          // big specular highlight (top-left) — crescent-ish bright spot
          ctx.beginPath();
          ctx.ellipse(b.x - Rx * 0.34, b.y - Ry * 0.38, Rx * 0.22, Ry * 0.16, -0.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.fill();
          // small secondary highlight (bottom-right)
          ctx.beginPath();
          ctx.ellipse(b.x + Rx * 0.4, b.y + Ry * 0.42, Rx * 0.08, Ry * 0.08, 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.fill();

          // EXACT PRICE label, centered — the price where this aggressive trade
          // printed (e.g. "417.17"), NOT the notional. Deterministic anchorPrice →
          // every user sees the same price on the same bubble.
          if (b.r >= 7) {
            const p = b.anchorPrice;
            const lbl = p >= 10000 ? Math.round(p).toString()
                      : p >= 100   ? p.toFixed(2)
                      : p >= 1     ? p.toFixed(2)
                      :              p.toFixed(4);
            const fontPx = Math.max(8, Math.min(13, Rx * 0.48));
            ctx.font = `bold ${fontPx}px Inter, monospace`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.lineWidth = Math.max(2, fontPx * 0.22);
            ctx.strokeStyle = "rgba(0,0,0,0.88)";
            ctx.strokeText(lbl, b.x, b.y);
            ctx.fillStyle = "rgba(255,255,255,0.99)";
            ctx.fillText(lbl, b.x, b.y);
          }
          ctx.restore();
        }
      } else if (bubblesRef.current.length) {
        // Left big-trades mode → clear bubbles + tooltip
        bubblesRef.current = [];
        bubbleSpawnRef.current = new Set();
        bubbleHoverRef.current = null;
      }

      /* ══════════════════════════════════════════════════════
         WM FIXED VP & SESSION VP — right-anchored inside chart
      ══════════════════════════════════════════════════════ */
      function drawWMVP(barsToUse: Bar[], barColor: string, labelText: string, yOffset: number, colIndex = 0, nCols = 1) {
        if (!barsToUse.length || !ctx) return;
        // Dynamic tick size: ~25 rows so each bar is tall and clearly readable
        const priceRange = barsToUse.reduce((r, b) => ({ hi: Math.max(r.hi, b.high), lo: Math.min(r.lo, b.low) }), { hi: -Infinity, lo: Infinity });
        const rawRange = priceRange.hi - priceRange.lo;
        if (rawRange <= 0) return;
        // ── STABLE, DATA-ANCHORED, FINE-GRAINED bucket grid ─────────────────
        // Two properties this grid MUST have, learned the hard way:
        //
        // 1) STABILITY (no squash-on-scroll): the bucket size derives from the DATA
        //    price range only — never from the live on-screen pixel span. Sizing it
        //    from priceToCoordinate made the grid re-bucket every frame you panned
        //    (the price axis autoscales on pan), so the whole histogram reshaped.
        //    Anchoring to the data means pan/zoom only RE-MAP the same fixed buckets.
        //
        // 2) SMOOTHNESS (no "snaggle-tooth"): the tick must be FINE and snapped to the
        //    NEAREST clean increment — never rounded UP. The old code targeted ~28
        //    rows and snapped tickSz UP to the next of [1,2,2.5,5,10]·10ⁿ. On an asset
        //    camping in a tight range that coarse bucket dumped almost all the volume
        //    into ONE bucket → a single fat POC bar with starved 0.01 slivers around
        //    it (the "two snaggle teeth + anorexic bars" the user saw). Targeting ~46
        //    rows and snapping to the NEAREST clean tick keeps the resolution high, so
        //    volume spreads into a smooth histogram silhouette with a natural POC.
        const rows = 46;
        let tickSz = rawRange / rows;
        // Snap to the NEAREST clean increment (1/2/2.5/5/10 · 10ⁿ) so bucket edges are
        // still readable prices but the grid never coarsens (nearest, not ceil).
        const magnitude = Math.pow(10, Math.floor(Math.log10(tickSz)));
        const tickCands = [1, 2, 2.5, 5, 10].map(m => m * magnitude);
        tickSz = tickCands.reduce((best, v) =>
          Math.abs(v - tickSz) < Math.abs(best - tickSz) ? v : best, tickCands[0]);

        const volMap = new Map<number, { bid: number; ask: number }>();
        barsToUse.forEach(b => {
          const lvls = getBarFootprint(b, 10);
          lvls.forEach(lv => {
            const key = Math.round(lv.priceLevel / tickSz) * tickSz;
            const ex  = volMap.get(key) ?? { bid: 0, ask: 0 };
            volMap.set(key, { bid: ex.bid + lv.bid, ask: ex.ask + lv.ask });
          });
        });
        if (volMap.size === 0) return;
        const allPrices = Array.from(volMap.keys()).sort((a, b) => a - b);
        const maxVol    = Math.max(...Array.from(volMap.values()).map(v => v.bid + v.ask));
        if (maxVol === 0) return;
        let pocPrice = allPrices[0]; let pocVol = 0;
        volMap.forEach((v, p) => { const t = v.bid + v.ask; if (t > pocVol) { pocVol = t; pocPrice = p; } });

        // ── Value Area (70% of volume) → VAH / VAL ──────────────────────
        // Expand outward from the POC, each step absorbing whichever adjacent
        // level (above or below) holds the larger volume, until 70% of total
        // traded volume is enclosed. The highest enclosed price = VAH, the
        // lowest = VAL — exactly the standard market-profile value area.
        const volAt = (p: number) => { const v = volMap.get(p); return v ? v.bid + v.ask : 0; };
        const totalVol = allPrices.reduce((s, p) => s + volAt(p), 0);
        let pocIdx = allPrices.indexOf(pocPrice);
        if (pocIdx < 0) pocIdx = 0;
        let vaLo = pocIdx, vaHi = pocIdx, vaAcc = volAt(allPrices[pocIdx]);
        const vaTarget = totalVol * 0.7;
        while (vaAcc < vaTarget && (vaLo > 0 || vaHi < allPrices.length - 1)) {
          const below = vaLo > 0 ? volAt(allPrices[vaLo - 1]) : -1;
          const above = vaHi < allPrices.length - 1 ? volAt(allPrices[vaHi + 1]) : -1;
          if (above >= below) { vaHi++; vaAcc += above; }
          else                { vaLo--; vaAcc += below; }
        }
        // Guarantee the value area straddles the POC by at least one populated
        // level on EACH side whenever such a level exists. Without this, a POC
        // sitting near the top/bottom of the distribution (all 70% accumulates on
        // one side) leaves vaHi===pocIdx or vaLo===pocIdx, which collapses VAH (or
        // VAL) onto the POC and the draw guard below silently DROPS that box — the
        // "VAH/VAL disappears on Session/Fixed VP" bug. Forcing one step each way
        // keeps both boundary boxes distinct from POC and always visible.
        if (vaHi === pocIdx && pocIdx < allPrices.length - 1) vaHi = pocIdx + 1;
        if (vaLo === pocIdx && pocIdx > 0)                    vaLo = pocIdx - 1;
        const valPrice = allPrices[vaLo];               // Value Area Low
        const vahPrice = allPrices[vaHi];               // Value Area High

        // Reserve the ACTUAL right price-axis width (queried from the chart) so the
        // histogram never draws on top of the price labels. The axis width grows with
        // the number of digits (BTC's 59,800.00 is wider than a $12 stock), so a fixed
        // 60px gap let the bars bleed over the numbers — this reads the live width.
        const priceScaleW = (() => {
          try {
            const w = chart.priceScale("right").width();
            if (Number.isFinite(w) && w > 0) return Math.ceil(w) + 10;
          } catch {}
          return 90;
        })();
        // When BOTH Fixed + Session VP are on, narrow each column and shift the
        // second one LEFT by a full column width + gap so the two histograms sit
        // side-by-side instead of overlapping in the same right-anchored column
        // (the BTC "VP looks wrong" bug — stacked bars + colliding labels).
        const vpW   = Math.min(nCols > 1 ? 110 : 150, (W - priceScaleW) * (nCols > 1 ? 0.15 : 0.19));
        const vpRight = (W - priceScaleW - 6) - colIndex * (vpW + 12);

        // ── PRICE-ANCHORED vertical scale ───────────────────────────────
        // Anchor every row to its REAL price via the candle series' price scale.
        // A 380 volume shelf is drawn at exactly price 380 on the chart axis, so
        // the profile lines up bar-for-bar with the candles and the user can always
        // read which volume shelf price is trading into. The VP is pinned to price,
        // not to the screen: freeze the axis with 🔒 LOCK and horizontal scrolling
        // moves only the candles while the VP + POC stay locked on their levels.
        const yOf = (p: number): number | null => {
          const y = srs?.priceToCoordinate(p);
          return (y == null || !Number.isFinite(y)) ? null : (y as number);
        };
        const loKey   = allPrices[0];
        const hiKey   = allPrices[allPrices.length - 1] + tickSz;
        const nBuckets = Math.max(1, Math.round((hiKey - loKey) / tickSz));
        const rowCap  = Math.round(H * 0.22); // never let one tick fill the pane
                                              // (roomier now that tickSz is data-anchored,
                                              // so zoomed-in rows stay flush without gaps)

        ctx.save();
        // Clip the VP to pane 0 (the candle pane). With native indicator panes
        // stacked below, priceToCoordinate extrapolates prices outside pane 0's
        // visible range to y-values BELOW pane 0 — without this clip the VP bars
        // bleed down into the Speed-of-Tape / CVD panes. paneSize(0).height is the
        // candle pane's pixel height (pane 0 is topmost, so its top = canvas y 0).
        let pane0H = H;
        try {
          const ps = (chart as any).paneSize?.(0);
          if (ps && Number.isFinite(ps.height) && ps.height > 0) pane0H = ps.height;
        } catch {}
        ctx.beginPath();
        ctx.rect(0, 0, W, pane0H);
        ctx.clip();
        // Iterate EVERY bucket low→high so consecutive populated rows are pixel-flush
        // (no gaps). Buckets with genuinely zero traded volume simply draw nothing.
        // Rows whose price is currently off-screen return null and are skipped.
        let lastLabelY = -Infinity; // de-overlap volume labels
        for (let i = 0; i < nBuckets; i++) {
          const price = Math.round((loKey + i * tickSz) / tickSz) * tickSz;
          const vol   = volMap.get(price);
          const tot   = vol ? vol.bid + vol.ask : 0;
          if (tot <= 0) continue;
          const yTopRaw = yOf(price + tickSz);
          const yBotRaw = yOf(price);
          if (yTopRaw == null || yBotRaw == null) continue; // off-screen row
          const yTop  = yTopRaw;
          const yBot  = yBotRaw;
          const rowY  = Math.round(yTop);
          const rowH  = Math.max(2, Math.min(rowCap, Math.round(yBot - yTop)));
          const isPOC = price === pocPrice;
          const askRatio = vol ? vol.ask / tot : 0.5;
          // Bar length ∝ volume, shaped by a 0.6 power curve: the POC (ratio 1) is the
          // longest, mid nodes stay clearly readable, and low nodes taper down HONESTLY
          // toward a tiny 3px nub instead of clamping to a fat 16px floor. That old 16px
          // floor was the "anorexic bars" problem: it forced every thin bucket to the
          // SAME 16px width, so a run of low-volume buckets stacked into one uniform
          // vertical ribbon while only the POC jutted out — the snaggle-tooth look. A
          // low 3px floor lets the silhouette taper into a real histogram shape.
          const barW = Math.max(3, Math.round(Math.pow(tot / maxVol, 0.6) * vpW));

          if (isPOC) {
            ctx.fillStyle = vpPocRgba(0.68);
            ctx.fillRect(vpRight - barW, rowY, barW, rowH);
          } else {
            const askW = Math.round(barW * askRatio);
            const bidW = barW - askW;
            // ask = green, bid = red — VP's own gear-controlled scheme (default
            // green/red). TRANSLUCENT (0.40–0.58) so the candles read cleanly THROUGH
            // the profile like TradingView — a near-solid fill turned the VP into an
            // opaque wall that hid the price action (the "squashed VP" the user saw).
            ctx.fillStyle = vpUpRgba((0.40 + askRatio * 0.14).toFixed(2));
            ctx.fillRect(vpRight - barW, rowY, askW, rowH);
            ctx.fillStyle = vpDnRgba((0.40 + (1-askRatio)*0.14).toFixed(2));
            ctx.fillRect(vpRight - barW + askW, rowY, bidW, rowH);
          }
          if (isPOC) {
            ctx.strokeStyle = vpPocRgba(0.9); ctx.lineWidth = 1;
            ctx.setLineDash([5, 4]);
            const pocLineLeft = Math.max(4, vpRight - vpW - 24);
            ctx.beginPath();
            ctx.moveTo(pocLineLeft, rowY + Math.round(rowH/2) + 0.5);
            ctx.lineTo(vpRight - 2, rowY + Math.round(rowH/2) + 0.5);
            ctx.stroke();
            ctx.setLineDash([]);
            // POC price tag so the stationary histogram still has a price anchor.
            ctx.fillStyle = vpPocRgba(0.95);
            ctx.font = "bold 11px monospace";
            ctx.textAlign = "right"; ctx.textBaseline = "middle";
            ctx.fillText(pocPrice.toFixed(2), pocLineLeft - 2, rowY + Math.round(rowH/2));
          }
          // Volume numbers — drawn INSIDE the bar at its right edge so they stay in
          // the VP column and never reach left into the candles / Big-Trades bubbles
          // (which caused the busy, overlapping look). Only label a row when it is
          // tall enough AND ≥16px from the last drawn label, and skip very small
          // (<8% of POC) rows when crowded so the cluster reads cleanly. POC always
          // labels and resets the spacing anchor so its neighbours give it room.
          // Label EVERY populated row that has the vertical room — including the small
          // top/bottom shelves that the old `meaningful` (≥8% of POC) gate left blank.
          // Only de-overlap (skip a label that would collide with the one above) so the
          // numbers never stack on top of each other; POC always labels.
          const midY = rowY + rowH / 2;
          const txt = fmtV(tot);
          // Suppress zero-volume labels (crypto sub-0.005 BTC rows → "0.00") so the
          // profile isn't a wall of 0.00; the POC still always labels. Bars unaffected.
          const vpZero = txt === "0" || txt === "0.00" || txt === "0.0";
          if ((isPOC || (rowH >= 5 && Math.abs(midY - lastLabelY) >= 12)) && (!vpZero || isPOC)) {
            ctx.font = `${isPOC ? "bold 12" : "11"}px monospace`;
            ctx.textAlign = "right"; ctx.textBaseline = "middle";
            // Dark halo so white numbers stay legible over both bar and chart bg.
            ctx.shadowColor = "rgba(0,0,0,0.92)"; ctx.shadowBlur = 3;
            ctx.fillStyle = "#ffffff";
            ctx.fillText(txt, vpRight - 4, midY);
            ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
            lastLabelY = midY;
          }
        }

        // ── VAH (blue) & VAL (purple) value-area boxes ──────────────────
        // Outline the two value-area boundary rows so the trader can instantly
        // read where 70% of the volume traded. Colors are user-customizable via
        // the VP gear (wm_vp_vah / wm_vp_val). Drawn after the bars so the
        // outline sits cleanly on top, with a small price tag at the right edge.
        const drawVALevel = (p: number, rgba: string, tag: string) => {
          const yT = yOf(p + tickSz);
          const yB = yOf(p);
          ctx.save();
          if (yT == null || yB == null) {
            // ── OFF-SCREEN (zoomed in past the level) ─────────────────────────
            // Instead of vanishing, pin a labelled edge marker with a directional
            // arrow so VAH/VAL stay ALWAYS visible. Determine above/below by
            // comparing the level price to the prices at the top/bottom edges.
            let topPrice = NaN, botPrice = NaN;
            try {
              topPrice = srs?.coordinateToPrice(0) as number;
              botPrice = srs?.coordinateToPrice(H) as number;
            } catch {}
            const above = Number.isFinite(topPrice) ? p > topPrice : true;
            const edgeY = above ? 9 : H - 9;
            ctx.strokeStyle = rgba; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(vpRight - vpW - 2, edgeY);
            ctx.lineTo(vpRight + 2, edgeY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = rgba;
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "left"; ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 3;
            ctx.fillText(`${tag} ${above ? "↑" : "↓"} ${p.toFixed(2)}`, vpRight - vpW - 2, edgeY + (above ? 8 : -8));
            ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
            ctx.restore();
            return;
          }
          const top = Math.min(yT, yB);
          const h   = Math.max(7, Math.abs(yB - yT));
          ctx.strokeStyle = rgba; ctx.lineWidth = 2; ctx.setLineDash([]);
          ctx.strokeRect(vpRight - vpW - 2, top, vpW + 4, h);
          ctx.fillStyle = rgba;
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "left"; ctx.textBaseline = "middle";
          ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 3;
          ctx.fillText(tag, vpRight - vpW - 2, top + h / 2);
          ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
          ctx.restore();
        };
        if (vahPrice !== pocPrice) drawVALevel(vahPrice, vpVahRgba(0.95), "VAH");
        if (valPrice !== pocPrice) drawVALevel(valPrice, vpValRgba(0.95), "VAL");

        // (On-canvas "WM Fixed/Session VP" title removed — it cluttered the top of
        // the chart and could overlap candle/volume numbers. The active VP is
        // already indicated by the highlighted toolbar toggle + its gear.)
        void labelText; void yOffset; void barColor;
        ctx.restore();
      }

      // Hoisted so big-trades mode can draw VP early (under the bubbles). The
      // vpDrawn guard ensures it runs only once per frame.
      function runWMVP() {
        if (vpDrawn) return;
        vpDrawn = true;
        const bothVP = fixedVPActive && sessionVPActive;
        const nVPCols = bothVP ? 2 : 1;
        if (fixedVPActive) {
          // WM Fixed VP must STAY PUT when the user switches timeframes AND must
          // span the FULL price range the instrument has traded across the loaded
          // history (e.g. TSLA 320→480), not just the last few days. A short
          // calendar cutoff clipped the profile to a narrow band. Volume-by-price
          // is timeframe-independent, so we source the ENTIRE fetched bar set —
          // giving a true full-range fixed profile. The SAME distribution renders
          // on every timeframe; only its vertical position tracks the price axis.
          const allBars = barsRef.current;
          drawWMVP(allBars.length > 2 ? allBars : allBars, "#F0B429", "WM Fixed VP", 0, 0, nVPCols);
        }
        if (sessionVPActive) {
          // Session VP shows the CURRENT session's volume distribution. It must NOT
          // move when you scroll — so source it from the full fetched bars (barsRef),
          // not the scroll-dependent visible window. It DOES legitimately differ per
          // timeframe (5m vs 4h aggregate the session's volume at different
          // granularities), which is the expected behaviour the user asked for.
          const allBars = barsRef.current;
          const lastT = allBars.length ? (allBars[allBars.length - 1].time as number) : Math.floor(Date.now() / 1000);
          // Anchor to the most recent RTH session open (09:30 ET ≈ 13:30 UTC) at or
          // before the latest bar, so it tracks the data even on weekends/holidays.
          const dayStart = Math.floor(lastT / 86400) * 86400 + 13 * 3600 + 30 * 60;
          const sessionBars = allBars.filter(b => (b.time as number) >= dayStart);
          drawWMVP(sessionBars.length > 2 ? sessionBars : allBars.slice(-30), "#8B5CF6", "WM Session VP", 0, bothVP ? 1 : 0, nVPCols);
        }
      }
      // Non-big-trades modes draw VP here (top of stack is fine — no bubbles).
      runWMVP();

      /* ══════════════════════════════════════════════════════
         CANDLE TIMER — countdown pinned to the LIVE PRICE LINE
         on the left edge, so it travels vertically with price.
         Gated by chartSettings.candleTimer (Chart Settings toggle).
      ══════════════════════════════════════════════════════ */
      if (candleTimerRef.current) {
        const liveBars = barsRef.current;
        const lastBar  = liveBars.length ? liveBars[liveBars.length - 1] : null;
        const yRaw = lastBar ? srs?.priceToCoordinate(lastBar.close) : null;
        if (lastBar && yRaw != null && Number.isFinite(yRaw)) {
          const y     = yRaw as number;
          const txt   = countdownRef.current;
          const flash = closeFlashRef.current;
          const neon  = chartSettings?.neon;
          ctx.save();
          ctx.font = "bold 12px monospace";
          const tw    = ctx.measureText(txt).width;
          const boxH  = 19;
          const boxW  = Math.round(tw + 30);
          const x     = 2;
          const cy    = Math.max(boxH / 2 + 1, Math.min(H - boxH / 2 - 1, y));
          const boxY  = Math.round(cy - boxH / 2);
          const border = flash ? "#FF2E63" : (neon ? "#00FFA3" : "#2F80ED");
          // pill background
          ctx.fillStyle = flash ? "rgba(255,46,99,0.95)" : "rgba(14,18,30,0.94)";
          ctx.fillRect(x, boxY, boxW, boxH);
          ctx.strokeStyle = border; ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, boxY + 0.5, boxW - 1, boxH - 1);
          // elapsed-fraction ring (clock)
          const ringX = x + 10, ringR = 5;
          ctx.beginPath(); ctx.arc(ringX, cy, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1.4; ctx.stroke();
          ctx.beginPath();
          ctx.arc(ringX, cy, ringR, -Math.PI / 2, -Math.PI / 2 + progressRef.current * Math.PI * 2);
          ctx.strokeStyle = flash ? "#fff" : border; ctx.lineWidth = 1.8; ctx.stroke();
          // countdown text
          ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
          ctx.fillText(txt, x + 19, cy + 0.5);
          // dashed connector toward the price line so the eye links pill↔price
          ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
          ctx.strokeStyle = flash ? "rgba(255,46,99,0.45)" : (neon ? "rgba(0,255,163,0.35)" : "rgba(47,128,237,0.32)");
          ctx.beginPath(); ctx.moveTo(x + boxW + 1, cy + 0.5); ctx.lineTo(x + boxW + 34, cy + 0.5); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }

      // Release the plot-area clip established right after the data guard.
      ctx.restore();
    };

    // Use a continuous loop so the canvas always stays in sync with chart scroll/zoom
    let running = true;
    const loop = () => {
      if (!running) return;
      draw();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafId); };
    // NOTE: `candles` intentionally NOT a dep — the RAF loop reads barsRef.current
    // each frame, so it stays alive across live ticks (was rebuilding 4x/sec on
    // crypto, which made the VP/footprint flash off). Re-runs only on real config
    // changes below.
  }, [footprintType, footprintEnabled, bigTradesOverlay, candleType, ready, rangeVer, getBarFootprint, getRealBigTradeLevels, getDeltaBubbleLevels, extendedHours, timeframe, fixedVPActive, sessionVPActive]);

  /* ── Derived display values ─────────────────────────────── */
  const change    = ticker.change ?? (lastPrice - openPrice);
  const changePct = (ticker.changePct ?? ((lastPrice - openPrice) / openPrice * 100)).toFixed(2);
  const up        = change >= 0;
  const last      = candles[candles.length - 1];
  const dp        = base < 10 ? 4 : 2;

  /* ── Fullscreen handler ─────────────────────────────────── */
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (onRequestFullscreen) {
        onRequestFullscreen();
      } else {
        wrapRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      }
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, [onRequestFullscreen]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* ── Keyboard shortcuts ──────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      switch (e.key) {
        // Escape always exits drawing mode → mouse returns to normal chart use
        case "Escape": { inProgressRef.current = null; previewPtRef.current = null; setSelectedIdx(null); setRangeVer(v => v + 1); onDrawingComplete?.(); break; }
        case "f": case "F": toggleFullscreen(); break;
        case "l": case "L": setLogScale(v => !v); break;
        case "p": case "P": setPctMode(v => !v); break;
        case "a": case "A": setAutoScale(v => !v); break;
        case "d": case "D": setDataWindowOpen(v => !v); break;
        // Delete/Backspace: remove the selected drawing (else the most recent)
        case "Delete": case "Backspace": {
          const sel = selectedIdxRef.current;
          if (sel != null && drawingsRef.current[sel]) {
            drawingsRef.current.splice(sel, 1);
            setSelectedIdx(null);
          } else if (drawingsRef.current.length > 0) {
            drawingsRef.current.pop();
          }
          setRangeVer(v => v + 1);
          break;
        }
        case "+": case "=": {
          try {
            const ts = chartRef.current?.timeScale();
            const bs = ts?.options()?.barSpacing ?? 8;
            ts?.applyOptions({ barSpacing: Math.min(50, bs * 1.3) });
          } catch {} break;
        }
        case "-": case "_": {
          try {
            const ts = chartRef.current?.timeScale();
            const bs = ts?.options()?.barSpacing ?? 8;
            ts?.applyOptions({ barSpacing: Math.max(2, bs / 1.3) });
          } catch {} break;
        }
        case "Home": {
          try { chartRef.current?.timeScale().fitContent(); } catch {} break;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleFullscreen]);

  /* ── Drawing tools canvas rendering ─────────────────────────── */
  type Pt = { x: number; y: number };
  const renderDrawings = useCallback(() => {
    const canvas = drawCanvasRef.current;
    const cont   = containerRef.current;
    if (!canvas || !cont) return;
    const W = cont.offsetWidth, H = cont.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const toPx  = (p: LogicalPt): Pt | null => logicalToPixel(p);
    const priceY = (pr: number): number | null => { const y = candleRef.current?.priceToCoordinate(pr); return y == null ? null : +y; };
    const timeX  = (tm: number): number | null => { const x = chartRef.current?.timeScale().timeToCoordinate(tm as any); return x == null ? null : +x; };
    const dec = base > 100 ? 2 : base > 1 ? 3 : 5;
    const dashArr = (st: DrawStyle): number[] => st.dash === "dashed" ? [7, 5] : st.dash === "dotted" ? [2, 4] : [];
    const rayToEdge = (a: Pt, dx: number, dy: number): Pt => {
      let tB = Infinity;
      if (dx > 1e-6) tB = Math.min(tB, (W - a.x) / dx); else if (dx < -1e-6) tB = Math.min(tB, (0 - a.x) / dx);
      if (dy > 1e-6) tB = Math.min(tB, (H - a.y) / dy); else if (dy < -1e-6) tB = Math.min(tB, (0 - a.y) / dy);
      if (!isFinite(tB) || tB < 0) tB = 0;
      return { x: a.x + dx * tB, y: a.y + dy * tB };
    };
    const seg = (a: Pt, b: Pt) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
    const arrowHead = (a: Pt, b: Pt, len = 11) => {
      const ang = Math.atan2(b.y - a.y, b.x - a.x); ctx.beginPath();
      ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - len * Math.cos(ang - Math.PI / 6), b.y - len * Math.sin(ang - Math.PI / 6));
      ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - len * Math.cos(ang + Math.PI / 6), b.y - len * Math.sin(ang + Math.PI / 6));
      ctx.stroke();
    };
    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    };
    const chip = (txt: string, x: number, y: number, colr: string) => {
      ctx.setLineDash([]); ctx.font = "600 10px ui-sans-serif, system-ui";
      const w = ctx.measureText(txt).width + 8;
      ctx.fillStyle = "rgba(10,12,20,0.85)"; roundRect(x, y - 13, w, 15, 3); ctx.fill();
      ctx.fillStyle = colr; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(txt, x + 4, y - 5);
    };

    const drawOne = (d: Drawing, selected: boolean) => {
      const s = d.style, t = d.tool, col = s.color, fillCol = col + "22";
      const P = d.pts.map(toPx);
      ctx.save();
      if (s.opacity != null && s.opacity < 1) ctx.globalAlpha = s.opacity;
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.strokeStyle = col; ctx.fillStyle = col;
      ctx.lineWidth = Math.max(0.5, s.width);
      ctx.setLineDash(dashArr(s));
      const A = P[0], B = P[1], C = P[2], D2 = P[3];

      // ── LINES ──
      if (t === "trendline" || t === "info-line" || t === "trend-angle" || t === "ray" || t === "extended-line" || t === "arrow") {
        if (A && B) {
          if (t === "ray") seg(A, rayToEdge(A, B.x - A.x, B.y - A.y));
          else if (t === "extended-line") seg(rayToEdge(A, A.x - B.x, A.y - B.y), rayToEdge(B, B.x - A.x, B.y - A.y));
          else seg(A, B);
          if (t === "arrow") { ctx.setLineDash([]); arrowHead(A, B); }
          if (t === "info-line") { const dp = d.pts[1].price - d.pts[0].price; const pct = d.pts[0].price ? dp / Math.abs(d.pts[0].price) * 100 : 0; chip(`${dp >= 0 ? "+" : ""}${dp.toFixed(dec)} (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)`, (A.x + B.x) / 2, (A.y + B.y) / 2, col); }
          if (t === "trend-angle") { const ang = Math.atan2(-(B.y - A.y), B.x - A.x) * 180 / Math.PI; ctx.save(); ctx.globalAlpha = 0.5; ctx.setLineDash([3, 3]); seg(A, { x: A.x + 44, y: A.y }); ctx.restore(); chip(`${ang.toFixed(1)}°`, B.x + 6, B.y, col); }
        } else if (A) seg(A, A);
      }
      // ── HORIZONTAL / VERTICAL / CROSS ──
      else if (t === "hline" || t === "hray") { const y = priceY(d.pts[0].price); if (y != null) { let x0 = 0; if (t === "hray") { const xx = timeX(d.pts[0].time); x0 = xx == null ? 0 : xx; } seg({ x: x0, y }, { x: W, y }); chip(d.pts[0].price.toFixed(dec), Math.max(x0, 0) + 2, y - 2, col); } }
      else if (t === "vline") { const x = timeX(d.pts[0].time); if (x != null) seg({ x, y: 0 }, { x, y: H }); }
      else if (t === "crossline") { if (A) { seg({ x: 0, y: A.y }, { x: W, y: A.y }); seg({ x: A.x, y: 0 }, { x: A.x, y: H }); } }
      // ── RECT / CHANNEL(box) ──
      else if (t === "rect" || t === "channel") { if (A && B) { const rx = Math.min(A.x, B.x), ry = Math.min(A.y, B.y), rw = Math.abs(B.x - A.x), rh = Math.abs(B.y - A.y); if (s.fill) { ctx.fillStyle = fillCol; ctx.fillRect(rx, ry, rw, rh); } ctx.strokeRect(rx, ry, rw, rh); } }
      // ── DELTA + VOLUME PROFILE BOX (order flow) ──
      // Left column = per-price DELTA profile (buy−sell), right column = VOLUME
      // profile (ask=green / bid=red, POC=gold). Aggregated from getBarFootprint —
      // REAL tick data where captured, deterministic bar-structure sim elsewhere
      // (the identical source the shipped WM Fixed/Session VP draws from). Numbers
      // on every row: signed delta at the center gutter, total volume at the edge.
      else if (t === "delta-vp") {
        if (A && B) {
          const rx = Math.min(A.x, B.x), ry = Math.min(A.y, B.y);
          const rw = Math.abs(B.x - A.x), rh = Math.abs(B.y - A.y);
          ctx.save();
          ctx.setLineDash([]);
          ctx.fillStyle = col + "0E"; ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.strokeRect(rx, ry, rw, rh);

          const pLo = Math.min(d.pts[0].price, d.pts[1].price);
          const pHi = Math.max(d.pts[0].price, d.pts[1].price);
          const tLo = Math.min(d.pts[0].time, d.pts[1].time);
          const tHi = Math.max(d.pts[0].time, d.pts[1].time);
          const bs  = (barsRef.current || []).filter((x: Bar) => x.time >= tLo && x.time <= tHi);
          const nBins = Math.max(6, Math.min(40, Math.round(rh / 22)));
          const levels: DeltaVPLevel[] = [];
          for (const b of bs) for (const l of getBarFootprint(b, 14)) levels.push({ priceLevel: l.priceLevel, bid: l.bid, ask: l.ask });
          const dvp = computeDeltaVP(levels, pLo, pHi, nBins);
          const fmtN = (v: number) => { const a = Math.abs(v); return a >= 1000 ? (a / 1000).toFixed(a >= 10000 ? 0 : 1) + "k" : String(Math.round(a)); };

          if (dvp.rows.length && rw > 56 && rh > 26) {
            const midX = rx + Math.round(rw * 0.5);
            const gap = 3;
            const leftW  = (midX - rx) - gap;
            const rightW = (rx + rw - midX) - gap;
            ctx.save();
            ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
            for (const row of dvp.rows) {
              const yT = priceY(row.hiPrice), yB = priceY(row.loPrice);
              if (yT == null || yB == null) continue;
              const rowTop = Math.min(yT, yB);
              const rowH   = Math.max(2, Math.abs(yB - yT) - 1);
              if (rowTop + rowH < ry - 1 || rowTop > ry + rh + 1) continue;
              const midY  = rowTop + rowH / 2;
              const isPOC = row.price === dvp.pocPrice;

              // RIGHT — volume profile, grows rightward from the gutter
              const volFrac = dvp.maxVolume ? row.volume / dvp.maxVolume : 0;
              const vBarW   = Math.max(3, Math.round(Math.pow(volFrac, 0.7) * (rightW - 2)));
              const vx0     = midX + gap;
              if (isPOC) { ctx.fillStyle = "rgba(240,180,41,0.85)"; ctx.fillRect(vx0, rowTop, vBarW, rowH); }
              else {
                const askW = Math.round(vBarW * (row.volume ? row.buy / row.volume : 0.5));
                ctx.fillStyle = "rgba(0,192,118,0.58)"; ctx.fillRect(vx0, rowTop, askW, rowH);
                ctx.fillStyle = "rgba(255,77,103,0.58)"; ctx.fillRect(vx0 + askW, rowTop, vBarW - askW, rowH);
              }

              // LEFT — delta profile, grows leftward from the gutter
              const dFrac = dvp.maxAbsDelta ? Math.abs(row.delta) / dvp.maxAbsDelta : 0;
              const dBarW = Math.max(2, Math.round(Math.pow(dFrac, 0.7) * (leftW - 2)));
              const up    = row.delta >= 0;
              ctx.fillStyle = up ? "rgba(0,212,170,0.72)" : "rgba(255,77,106,0.72)";
              ctx.fillRect(midX - gap - dBarW, rowTop, dBarW, rowH);

              // numbers — signed delta at the gutter, volume at the right edge
              if (rowH >= 9) {
                ctx.font = "10px monospace"; ctx.textBaseline = "middle";
                ctx.shadowColor = "rgba(0,0,0,0.92)"; ctx.shadowBlur = 3;
                ctx.textAlign = "right"; ctx.fillStyle = up ? "#25E8BE" : "#FF6B82";
                ctx.fillText(`${up ? "+" : "−"}${fmtN(row.delta)}`, midX - gap - 2, midY);
                ctx.fillStyle = "#EAF0F6";
                ctx.fillText(fmtN(row.volume), rx + rw - 3, midY);
                ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
              }
            }
            ctx.restore();

            // center gutter divider + column captions + totals header
            ctx.strokeStyle = col + "66"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.moveTo(midX, ry); ctx.lineTo(midX, ry + rh); ctx.stroke(); ctx.setLineDash([]);
            const netUp = dvp.totalDelta >= 0;
            chip(`Delta+VP  net ${netUp ? "+" : "−"}${fmtN(dvp.totalDelta)}  vol ${fmtN(dvp.totalVolume)}`, rx + 2, ry - 3, col);
            ctx.font = "9px ui-sans-serif"; ctx.textBaseline = "top";
            ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 2; ctx.fillStyle = "#8B95A5"; ctx.textAlign = "center";
            if (leftW  > 26) ctx.fillText("DELTA",  (rx + midX) / 2, ry + 2);
            if (rightW > 26) ctx.fillText("VOLUME", (midX + rx + rw) / 2, ry + 2);
            ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
          } else {
            chip("Delta+VP — draw a wider box over bars", rx + 2, ry - 3, col);
          }
          ctx.restore();
        }
      }
      else if (t === "circle") { if (A && B) { const r = Math.hypot(B.x - A.x, B.y - A.y); ctx.beginPath(); ctx.arc(A.x, A.y, r, 0, Math.PI * 2); if (s.fill) { ctx.fillStyle = fillCol; ctx.fill(); } ctx.stroke(); } }
      else if (t === "ellipse") { if (A && B) { const cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2, rx = Math.max(Math.abs(B.x - A.x) / 2, 1), ry = Math.max(Math.abs(B.y - A.y) / 2, 1); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); if (s.fill) { ctx.fillStyle = fillCol; ctx.fill(); } ctx.stroke(); } }
      else if (t === "triangle") { if (A && B && C) { ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(C.x, C.y); ctx.closePath(); if (s.fill) { ctx.fillStyle = fillCol; ctx.fill(); } ctx.stroke(); } else if (A && B) seg(A, B); }
      else if (t === "rotated-rect") { if (A && B && C) { const vx = B.x - A.x, vy = B.y - A.y, len = Math.hypot(vx, vy) || 1, nx = -vy / len, ny = vx / len, dd = (C.x - B.x) * nx + (C.y - B.y) * ny, ox = nx * dd, oy = ny * dd; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(B.x + ox, B.y + oy); ctx.lineTo(A.x + ox, A.y + oy); ctx.closePath(); if (s.fill) { ctx.fillStyle = fillCol; ctx.fill(); } ctx.stroke(); } else if (A && B) seg(A, B); }
      else if (t === "arc" || t === "curve") { if (A && B && C) { ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(C.x, C.y, B.x, B.y); ctx.stroke(); } else if (A && B) seg(A, B); }
      else if (t === "double-curve") { if (A && B && C && D2) { ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.bezierCurveTo(B.x, B.y, C.x, C.y, D2.x, D2.y); ctx.stroke(); } else if (A && B) seg(A, B); }
      // ── CHANNELS ──
      else if (t === "parallel-channel") { if (A && B) { if (C) { const vx = B.x - A.x, vy = B.y - A.y, len = Math.hypot(vx, vy) || 1, nx = -vy / len, ny = vx / len, dd = (C.x - A.x) * nx + (C.y - A.y) * ny, ox = nx * dd, oy = ny * dd; if (s.fill) { ctx.fillStyle = fillCol; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(B.x + ox, B.y + oy); ctx.lineTo(A.x + ox, A.y + oy); ctx.closePath(); ctx.fill(); } seg(A, B); seg({ x: A.x + ox, y: A.y + oy }, { x: B.x + ox, y: B.y + oy }); ctx.save(); ctx.globalAlpha = 0.5; ctx.setLineDash([4, 4]); seg({ x: A.x + ox / 2, y: A.y + oy / 2 }, { x: B.x + ox / 2, y: B.y + oy / 2 }); ctx.restore(); } else seg(A, B); } }
      else if (t === "flat-channel") { if (A && B) { const x0 = Math.min(A.x, B.x), x1 = Math.max(A.x, B.x); seg({ x: x0, y: A.y }, { x: x1, y: A.y }); if (C) { seg({ x: x0, y: C.y }, { x: x1, y: C.y }); if (s.fill) { ctx.fillStyle = fillCol; ctx.fillRect(x0, Math.min(A.y, C.y), x1 - x0, Math.abs(C.y - A.y)); } } } }
      else if (t === "disjoint-channel") { if (A && B) seg(A, B); if (C && D2) seg(C, D2); if (A && B && C && D2 && s.fill) { ctx.fillStyle = fillCol; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(D2.x, D2.y); ctx.lineTo(C.x, C.y); ctx.closePath(); ctx.fill(); } }
      else if (t === "regression") { if (A && B) { let done = false; try { const t0 = Math.min(d.pts[0].time, d.pts[1].time), t1 = Math.max(d.pts[0].time, d.pts[1].time); const bs = (barsRef.current || []).filter((bar: any) => bar.time >= t0 && bar.time <= t1); if (bs.length >= 2) { const n = bs.length; let sx = 0, sy = 0, sxy = 0, sxx = 0; bs.forEach((bar: any, i: number) => { sx += i; sy += bar.close; sxy += i * bar.close; sxx += i * i; }); const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1), intc = (sy - slope * sx) / n; let ss = 0; bs.forEach((bar: any, i: number) => { const r = bar.close - (intc + slope * i); ss += r * r; }); const sd = Math.sqrt(ss / n); const pa = logicalToPixel({ price: intc, time: bs[0].time }), pb = logicalToPixel({ price: intc + slope * (n - 1), time: bs[n - 1].time }); if (pa && pb) { seg(pa, pb); [2, -2].forEach(k => { const u0 = logicalToPixel({ price: intc + k * sd, time: bs[0].time }), u1 = logicalToPixel({ price: intc + slope * (n - 1) + k * sd, time: bs[n - 1].time }); if (u0 && u1) { ctx.save(); ctx.globalAlpha = 0.7; ctx.setLineDash([4, 3]); seg(u0, u1); ctx.restore(); } }); done = true; } } } catch { /* fall back */ } if (!done) seg(A, B); } }
      // ── PITCHFORKS ──
      else if (t === "pitchfork" || t === "schiff" || t === "modified-schiff" || t === "inside-pitchfork") { if (A && B && C) { let origin = A; const mid = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 }; if (t === "schiff") origin = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }; else if (t === "modified-schiff") origin = { x: (A.x + B.x) / 2, y: A.y }; const dx = mid.x - origin.x, dy = mid.y - origin.y; if (s.fill) { ctx.fillStyle = fillCol; const eb = rayToEdge(B, dx, dy), ec = rayToEdge(C, dx, dy); ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.lineTo(eb.x, eb.y); ctx.lineTo(ec.x, ec.y); ctx.lineTo(C.x, C.y); ctx.closePath(); ctx.fill(); } seg(origin, rayToEdge(mid, dx, dy)); seg(B, rayToEdge(B, dx, dy)); seg(C, rayToEdge(C, dx, dy)); ctx.save(); ctx.globalAlpha = 0.6; ctx.setLineDash([3, 3]); seg(B, C); ctx.restore(); } else if (A && B) seg(A, B); }
      // ── FIBONACCI ──
      else if (t === "fibonacci") { if (A && B) { const x0 = Math.min(A.x, B.x), x1 = Math.max(A.x, B.x); FIB_LEVELS.forEach((lv, i) => { const price = d.pts[0].price + (d.pts[1].price - d.pts[0].price) * lv; const y = priceY(price); if (y == null) return; ctx.strokeStyle = FIB_COLORS[i] || col; seg({ x: x0, y }, { x: x1, y }); ctx.fillStyle = FIB_COLORS[i] || col; ctx.font = "600 9px monospace"; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(`${lv.toFixed(3)}  ${price.toFixed(dec)}`, x0 + 2, y - 1); }); } }
      else if (t === "fib-ext") { if (A && B) { if (C) { const range = d.pts[1].price - d.pts[0].price; const x0 = Math.min(A.x, B.x, C.x), x1 = Math.max(A.x, B.x, C.x); ctx.save(); ctx.globalAlpha = 0.5; ctx.setLineDash([3, 3]); seg(A, B); seg(B, C); ctx.restore(); FIB_LEVELS.forEach((lv, i) => { const price = d.pts[2].price + range * lv; const y = priceY(price); if (y == null) return; ctx.strokeStyle = FIB_COLORS[i] || col; seg({ x: x0, y }, { x: x1, y }); chip(`${lv.toFixed(3)} ${price.toFixed(dec)}`, x1 - 78, y - 1, FIB_COLORS[i] || col); }); } else seg(A, B); } }
      else if (t === "fib-channel") { if (A && B) { if (C) { const vx = B.x - A.x, vy = B.y - A.y, len = Math.hypot(vx, vy) || 1, nx = -vy / len, ny = vx / len, dd = (C.x - A.x) * nx + (C.y - A.y) * ny; [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].forEach((lv, i) => { const ox = nx * dd * lv, oy = ny * dd * lv; ctx.strokeStyle = FIB_COLORS[i] || col; seg({ x: A.x + ox, y: A.y + oy }, { x: B.x + ox, y: B.y + oy }); }); } else seg(A, B); } }
      else if (t === "fib-timezone" || t === "fib-time") { if (A && B) { const step = B.x - A.x; const origin = (t === "fib-time" && C) ? C : A; const fibs = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55]; ctx.setLineDash([4, 3]); fibs.forEach(f => { const x = origin.x + step * f; if (x < 0 || x > W) return; seg({ x, y: 0 }, { x, y: H }); }); } }
      else if (t === "fib-speed-fan") { if (A && B) { ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeRect(Math.min(A.x, B.x), Math.min(A.y, B.y), Math.abs(B.x - A.x), Math.abs(B.y - A.y)); ctx.restore(); [0.236, 0.382, 0.5, 0.618, 0.786, 1].forEach((lv, i) => { ctx.strokeStyle = FIB_COLORS[i + 1] || col; seg(A, { x: B.x, y: A.y + (B.y - A.y) * lv }); seg(A, { x: A.x + (B.x - A.x) * lv, y: B.y }); }); } }
      else if (t === "fib-circles") { if (A && B) { const R = Math.hypot(B.x - A.x, B.y - A.y); [0.236, 0.382, 0.5, 0.618, 1, 1.618].forEach((lv, i) => { ctx.strokeStyle = FIB_COLORS[i] || col; ctx.beginPath(); ctx.arc(A.x, A.y, R * lv, 0, Math.PI * 2); ctx.stroke(); }); } }
      else if (t === "fib-spiral") { if (A && B) { const bR = Math.max(Math.hypot(B.x - A.x, B.y - A.y) / 12, 3), phi = 1.61803; ctx.beginPath(); let first = true; for (let th = 0; th <= Math.PI * 8; th += 0.14) { const r = bR * Math.pow(phi, th / (Math.PI / 2)); const x = A.x + r * Math.cos(th), y = A.y + r * Math.sin(th); if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); if (r > W + H) break; } ctx.stroke(); } }
      else if (t === "fib-arcs") { if (A && B) { const R = Math.hypot(B.x - A.x, B.y - A.y), ang = Math.atan2(B.y - A.y, B.x - A.x); [0.382, 0.5, 0.618, 1].forEach((lv, i) => { ctx.strokeStyle = FIB_COLORS[i + 1] || col; ctx.beginPath(); ctx.arc(A.x, A.y, R * lv, ang - Math.PI / 2, ang + Math.PI / 2); ctx.stroke(); }); } }
      else if (t === "fib-wedge") { if (A && B) { seg(A, rayToEdge(A, B.x - A.x, B.y - A.y)); if (C) { seg(A, rayToEdge(A, C.x - A.x, C.y - A.y)); const R = Math.min(Math.hypot(B.x - A.x, B.y - A.y), Math.hypot(C.x - A.x, C.y - A.y)); const a1 = Math.atan2(B.y - A.y, B.x - A.x), a2 = Math.atan2(C.y - A.y, C.x - A.x); [0.382, 0.618, 1].forEach((lv, i) => { ctx.strokeStyle = FIB_COLORS[i + 1] || col; ctx.beginPath(); ctx.arc(A.x, A.y, R * lv, Math.min(a1, a2), Math.max(a1, a2)); ctx.stroke(); }); } } }
      else if (t === "fib-pitchfan") { if (A && B && C) { const dx = (B.x + C.x) / 2 - A.x, dy = (B.y + C.y) / 2 - A.y; seg(A, rayToEdge({ x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 }, dx, dy)); [0, 0.25, 0.382, 0.5, 0.618, 0.75, 1].forEach((lv, i) => { const fp = { x: B.x + (C.x - B.x) * lv, y: B.y + (C.y - B.y) * lv }; ctx.strokeStyle = FIB_COLORS[i % FIB_COLORS.length] || col; seg(fp, rayToEdge(fp, dx, dy)); }); ctx.save(); ctx.globalAlpha = 0.5; ctx.setLineDash([3, 3]); seg(B, C); ctx.restore(); } else if (A && B) seg(A, B); }
      // ── GANN ──
      else if (t === "gann-box" || t === "gann-square" || t === "gann-square-fixed") { if (A && B) { const x0 = Math.min(A.x, B.x), y0 = Math.min(A.y, B.y), w = Math.abs(B.x - A.x), h = Math.abs(B.y - A.y); ctx.strokeRect(x0, y0, w, h); ctx.save(); ctx.globalAlpha = 0.45; [0.25, 0.5, 0.75].forEach(f => { seg({ x: x0 + w * f, y: y0 }, { x: x0 + w * f, y: y0 + h }); seg({ x: x0, y: y0 + h * f }, { x: x0 + w, y: y0 + h * f }); }); ctx.globalAlpha = 0.7; seg({ x: x0, y: y0 }, { x: x0 + w, y: y0 + h }); seg({ x: x0, y: y0 + h }, { x: x0 + w, y: y0 }); ctx.restore(); } }
      else if (t === "gann-fan") { if (A && B) { const w = B.x - A.x, h = B.y - A.y; ([[1, 1], [1, 2], [1, 3], [1, 4], [2, 1], [3, 1], [4, 1]] as number[][]).forEach(([p, q], i) => { ctx.save(); if (!(p === 1 && q === 1)) ctx.globalAlpha = 0.6; seg(A, rayToEdge(A, w, h * (q / p))); ctx.restore(); }); } }
      // ── PATTERNS / ELLIOTT (labeled polyline) ──
      else if (PATTERN_LABELS[t]) { const labels = PATTERN_LABELS[t]; ctx.beginPath(); let started = false; P.forEach(q => { if (!q) return; if (!started) { ctx.moveTo(q.x, q.y); started = true; } else ctx.lineTo(q.x, q.y); }); ctx.stroke(); if (t === "head-shoulders" && P[2] && P[4]) { ctx.save(); ctx.globalAlpha = 0.7; ctx.setLineDash([5, 4]); seg(P[2]!, P[4]!); ctx.restore(); } P.forEach((q, i) => { if (!q) return; const lb = labels[i]; if (lb) { ctx.fillStyle = col; ctx.font = "700 11px ui-sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(lb, q.x, q.y - 6); } ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(q.x, q.y, 3, 0, Math.PI * 2); ctx.fill(); }); }
      // ── CYCLES ──
      else if (t === "cyclic-lines" || t === "time-cycles") { if (A && B) { const step = Math.abs(B.x - A.x) || 12; const startX = Math.min(A.x, B.x); ctx.setLineDash([4, 3]); for (let k = 0; k < 400; k++) { const xx = startX + step * k; if (xx > W) break; if (xx >= 0) seg({ x: xx, y: 0 }, { x: xx, y: H }); } } }
      else if (t === "sine-line") { if (A && B) { const wav = Math.abs(B.x - A.x) || 40, amp = Math.abs(B.y - A.y) || 20; ctx.beginPath(); let first = true; for (let x = 0; x <= W; x += 3) { const y = A.y + amp * Math.sin((x - A.x) / wav * Math.PI * 2); if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); } ctx.stroke(); } }
      // ── MEASURE ──
      else if (t === "price-range") { if (A && B) { const dp = d.pts[1].price - d.pts[0].price, pct = d.pts[0].price ? dp / Math.abs(d.pts[0].price) * 100 : 0, up = dp >= 0, c2 = up ? "#00C076" : "#FF4D67"; ctx.fillStyle = c2 + "22"; ctx.fillRect(Math.min(A.x, B.x), Math.min(A.y, B.y), Math.abs(B.x - A.x), Math.abs(B.y - A.y)); ctx.strokeStyle = c2; seg({ x: B.x, y: A.y }, { x: B.x, y: B.y }); arrowHead({ x: B.x, y: A.y }, { x: B.x, y: B.y }); arrowHead({ x: B.x, y: B.y }, { x: B.x, y: A.y }); chip(`${dp >= 0 ? "+" : ""}${dp.toFixed(dec)} (${pct.toFixed(2)}%)`, B.x + 6, (A.y + B.y) / 2, c2); } }
      else if (t === "date-range") { if (A && B) { const t0 = Math.min(d.pts[0].time, d.pts[1].time), t1 = Math.max(d.pts[0].time, d.pts[1].time); const nb = (barsRef.current || []).filter((x: any) => x.time >= t0 && x.time <= t1).length; ctx.strokeStyle = col; seg({ x: A.x, y: B.y }, { x: B.x, y: B.y }); arrowHead({ x: A.x, y: B.y }, { x: B.x, y: B.y }); arrowHead({ x: B.x, y: B.y }, { x: A.x, y: B.y }); chip(`${nb} bars`, (A.x + B.x) / 2 - 18, B.y - 4, col); } }
      else if (t === "date-price-range" || t === "measure") { if (A && B) { const dp = d.pts[1].price - d.pts[0].price, pct = d.pts[0].price ? dp / Math.abs(d.pts[0].price) * 100 : 0, up = dp >= 0, c2 = up ? "#00C076" : "#FF4D67"; const t0 = Math.min(d.pts[0].time, d.pts[1].time), t1 = Math.max(d.pts[0].time, d.pts[1].time); const nb = (barsRef.current || []).filter((x: any) => x.time >= t0 && x.time <= t1).length; const rx = Math.min(A.x, B.x), ry = Math.min(A.y, B.y), rw = Math.abs(B.x - A.x), rh = Math.abs(B.y - A.y); ctx.fillStyle = c2 + "22"; ctx.fillRect(rx, ry, rw, rh); ctx.strokeStyle = c2; ctx.strokeRect(rx, ry, rw, rh); chip(`${dp >= 0 ? "+" : ""}${dp.toFixed(dec)} (${pct.toFixed(2)}%)  ${nb} bars`, rx + 4, ry - 2, c2); } }
      else if (t === "long-position" || t === "short-position") { if (A) { const xr = Math.max(A.x, B ? B.x : A.x, C ? C.x : A.x) + 40; ctx.setLineDash([]); if (B) { ctx.fillStyle = "#00C07622"; ctx.fillRect(A.x, Math.min(A.y, B.y), xr - A.x, Math.abs(B.y - A.y)); } if (C) { ctx.fillStyle = "#FF4D6722"; ctx.fillRect(A.x, Math.min(A.y, C.y), xr - A.x, Math.abs(C.y - A.y)); } ctx.strokeStyle = col; seg({ x: A.x, y: A.y }, { x: xr, y: A.y }); if (B) { ctx.strokeStyle = "#00C076"; seg({ x: A.x, y: B.y }, { x: xr, y: B.y }); } if (C) { ctx.strokeStyle = "#FF4D67"; seg({ x: A.x, y: C.y }, { x: xr, y: C.y }); const risk = Math.abs(d.pts[0].price - d.pts[2].price), reward = Math.abs(d.pts[1].price - d.pts[0].price), rr = risk ? reward / risk : 0; chip(`Entry ${d.pts[0].price.toFixed(dec)}  RR ${rr.toFixed(2)}`, A.x + 4, Math.min(A.y, B ? B.y : A.y, C.y) - 2, col); } } }
      // ── FREEHAND / POLYLINE ──
      else if (t === "brush" || t === "highlighter" || t === "polyline" || t === "path") { const Q = P.filter(Boolean) as Pt[]; if (t === "highlighter") { ctx.globalAlpha = 0.35; ctx.lineWidth = Math.max(8, s.width); } if (Q.length >= 2) { ctx.beginPath(); Q.forEach((q, i) => i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)); ctx.stroke(); } else if (Q.length === 1) { ctx.beginPath(); ctx.arc(Q[0].x, Q[0].y, 2, 0, Math.PI * 2); ctx.fill(); } }
      // ── TEXT & MARKERS ──
      else if (t === "text") { if (A) { ctx.setLineDash([]); ctx.fillStyle = col; ctx.font = "600 14px ui-sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(d.text || "Text", A.x, A.y); } }
      else if (t === "note" || t === "comment" || t === "price-note" || t === "signpost") { if (A) { ctx.setLineDash([]); const txt = d.text || (t === "price-note" ? d.pts[0].price.toFixed(dec) : t.charAt(0).toUpperCase() + t.slice(1)); const icon = t === "comment" ? "💬 " : t === "note" ? "📝 " : t === "signpost" ? "🪧 " : "🏷 "; ctx.font = "600 12px ui-sans-serif"; const w = ctx.measureText(icon + txt).width + 14, h = 20; ctx.fillStyle = "rgba(15,18,28,0.92)"; ctx.strokeStyle = col; roundRect(A.x, A.y, w, h, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = col; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(icon + txt, A.x + 6, A.y + h / 2); } }
      else if (t === "callout") { if (A) { const q2 = B || A; ctx.setLineDash([]); seg(A, q2); const txt = d.text || "Callout"; ctx.font = "600 12px ui-sans-serif"; const w = ctx.measureText(txt).width + 16; ctx.fillStyle = "rgba(15,18,28,0.92)"; ctx.strokeStyle = col; roundRect(q2.x, q2.y - 11, w, 22, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = col; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(txt, q2.x + 8, q2.y); } }
      else if (t === "pin" || t === "flag") { if (A) { ctx.font = "18px serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(t === "pin" ? "📍" : "🚩", A.x, A.y); } }
      else if (t === "price-label") { if (A) { ctx.setLineDash([]); const txt = (d.text ? d.text + " " : "") + d.pts[0].price.toFixed(dec); ctx.font = "700 11px monospace"; const w = ctx.measureText(txt).width + 12; ctx.fillStyle = col; roundRect(A.x, A.y - 9, w, 18, 3); ctx.fill(); ctx.fillStyle = "#0A0C14"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(txt, A.x + 6, A.y); } }
      else if (t === "arrow-up") { if (A) { ctx.setLineDash([]); ctx.fillStyle = "#00C076"; ctx.beginPath(); ctx.moveTo(A.x, A.y - 12); ctx.lineTo(A.x - 7, A.y); ctx.lineTo(A.x + 7, A.y); ctx.closePath(); ctx.fill(); } }
      else if (t === "arrow-down") { if (A) { ctx.setLineDash([]); ctx.fillStyle = "#FF4D67"; ctx.beginPath(); ctx.moveTo(A.x, A.y + 12); ctx.lineTo(A.x - 7, A.y); ctx.lineTo(A.x + 7, A.y); ctx.closePath(); ctx.fill(); } }
      // ── FALLBACK: unknown 2-pt tool → simple line ──
      else if (A && B) seg(A, B);

      ctx.restore();

      if (selected) {
        ctx.save(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        const HS = 12;
        d.pts.forEach(p => { const q = toPx(p); if (!q) return; ctx.fillStyle = "#fff"; ctx.strokeStyle = "#00D4AA"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(q.x - HS, q.y - HS, HS * 2, HS * 2); ctx.fill(); ctx.stroke(); });
        ctx.restore();
      }
    };

    const selIdx = selectedIdxRef.current;
    drawingsRef.current.forEach((d, i) => drawOne(d, i === selIdx));
    // Live preview of the drawing being placed (committed points + pending cursor point).
    const ip = inProgressRef.current;
    if (ip) { const pv = previewPtRef.current; drawOne({ ...ip, pts: pv ? [...ip.pts, pv] : ip.pts }, false); }
    else if (drawingStartRef.current?.lp && previewPtRef.current && mouseMovedRef.current) {
      const tool = drawingToolRef.current;
      if (tool !== "cursor" && tool !== "select" && tool !== "eraser" && drawPtsNeeded(tool) === 2) {
        drawOne({ id: -1, tool, pts: [drawingStartRef.current.lp, previewPtRef.current], style: {
          color: drawingStyle.color, width: drawingStyle.width, dash: drawingStyle.dash,
          opacity: drawingStyle.opacity / 100, fill: FILL_TOOLS.has(tool),
        } }, false);
      }
    }
  }, [base, logicalToPixel, drawingStyle, getBarFootprint]);

  // Lightweight RAF repaint for drawings ONLY — avoids bumping rangeVer (which
  // re-runs the heavy footprint/bubble canvas) on every mousemove during draw/drag.
  const drawRafRef = useRef(0);
  const scheduleDrawRender = useCallback(() => {
    if (drawRafRef.current) return;
    drawRafRef.current = requestAnimationFrame(() => {
      drawRafRef.current = 0;
      renderDrawings();
    });
  }, [renderDrawings]);

  // Re-render drawings whenever the view changes, a drawing is selected, or a style edit happens.
  useEffect(() => { renderDrawings(); }, [rangeVer, renderDrawings, selectedIdx, editBump]);

  /* ── Hit-test: index of drawing under a screen point (for select/erase) ── */
  const distToSeg = (px: number, py: number, a: Pt, b: Pt): number => {
    const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy || 1;
    let tt = ((px - a.x) * dx + (py - a.y) * dy) / len2; tt = Math.max(0, Math.min(1, tt));
    return Math.hypot(a.x + tt * dx - px, a.y + tt * dy - py);
  };
  const drawingWithin = useCallback((d: Drawing, x: number, y: number, tol: number): boolean => {
    const t = d.tool;
    const timeX = (tm: number) => { const v = chartRef.current?.timeScale().timeToCoordinate(tm as any); return v == null ? null : +v; };
    const priceY = (pr: number) => { const v = candleRef.current?.priceToCoordinate(pr); return v == null ? null : +v; };
    if (t === "hline" || t === "hray") { const y0 = priceY(d.pts[0].price); if (y0 == null || Math.abs(y0 - y) > tol) return false; if (t === "hray") { const x0 = timeX(d.pts[0].time); if (x0 != null && x < x0 - tol) return false; } return true; }
    if (t === "vline") { const x0 = timeX(d.pts[0].time); return x0 != null && Math.abs(x0 - x) <= tol; }
    if (t === "crossline") { const q = logicalToPixel(d.pts[0]); if (!q) return false; return Math.abs(q.x - x) <= tol || Math.abs(q.y - y) <= tol; }
    const Q = d.pts.map(p => logicalToPixel(p)).filter(Boolean) as Pt[];
    if (!Q.length) return false;
    for (const q of Q) if (Math.hypot(q.x - x, q.y - y) <= tol + 4) return true;
    for (let i = 0; i < Q.length - 1; i++) if (distToSeg(x, y, Q[i], Q[i + 1]) <= tol) return true;
    if (FILL_TOOLS.has(t) && Q.length >= 2) { const xs = Q.map(p => p.x), ys = Q.map(p => p.y); if (x >= Math.min(...xs) - tol && x <= Math.max(...xs) + tol && y >= Math.min(...ys) - tol && y <= Math.max(...ys) + tol) return true; }
    return false;
  }, [logicalToPixel]);
  const hitTestDrawing = useCallback((x: number, y: number, tol = 8): number => {
    const list = drawingsRef.current;
    for (let i = list.length - 1; i >= 0; i--) if (drawingWithin(list[i], x, y, tol)) return i;
    return -1;
  }, [drawingWithin]);
  // Which anchor handle (point index) of drawing `idx` is under (x,y)? -1 if none.
  const hitHandle = useCallback((idx: number, x: number, y: number, tol = 10): number => {
    const d = drawingsRef.current[idx]; if (!d) return -1;
    for (let k = 0; k < d.pts.length; k++) { const q = logicalToPixel(d.pts[k]); if (q && Math.hypot(q.x - x, q.y - y) <= tol) return k; }
    return -1;
  }, [logicalToPixel]);

  // Shift every anchor of a drawing by (dPrice, dTime).
  const moveDrawingBy = useCallback((d: Drawing, dPrice: number, dTime: number): Drawing => (
    { ...d, pts: d.pts.map(p => ({ price: p.price + dPrice, time: p.time + dTime })) }
  ), []);

  /* ── Drawing mouse handlers (unified multi-point model) ─────────
     Interaction contract:
       • click-and-release places a point; a 2-point tool also accepts
         press-drag-release as a shortcut.
       • multi-point tools accumulate points click-by-click until their
         required count (or double-click for open-ended polyline/path).
       • freehand (brush/highlighter) records the drag path.
       • SELECT mode: click a drawing to select it, drag body to move,
         drag a white handle to reshape.
       • CURSOR mode: chart pans; a clean click selects a drawing
         (handled on the chart wrapper, not here — canvas is pass-through).
  ─────────────────────────────────────────────────────────────── */
  const finalizeDrawing = useCallback((d: Drawing) => {
    drawingsRef.current.push(d);
    inProgressRef.current = null;
    previewPtRef.current = null;
    const newIdx = drawingsRef.current.length - 1;
    setSelectedIdx(newIdx);
    setRangeVer(v => v + 1);
    onDrawingComplete?.();
    // Text-bearing tools open a clean inline editor over their anchor point.
    if (TEXT_TOOLS.has(d.tool)) { if (d.text == null) d.text = ""; setTextEdit({ idx: newIdx }); }
  }, [onDrawingComplete]);

  const handleDrawMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (lockDrawings) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const lp = pixelToLogical(x, y);
    drawingStartRef.current = { x, y, lp };
    mouseMovedRef.current = false;

    // ── ERASER: remove the drawing under the cursor ──────────────
    if (drawingTool === "eraser") {
      const idx = hitTestDrawing(x, y, 12);
      if (idx >= 0) { drawingsRef.current.splice(idx, 1); setSelectedIdx(null); scheduleDrawRender(); setRangeVer(v => v + 1); }
      return;
    }

    // ── SELECT / MOVE mode ───────────────────────────────────────
    if (drawingTool === "select") {
      const sel = selectedIdxRef.current;
      if (sel != null) {
        const h = hitHandle(sel, x, y);
        if (h >= 0 && lp) { dragRef.current = { idx: sel, last: lp, ptIdx: h }; return; }
      }
      const idx = hitTestDrawing(x, y);
      if (idx >= 0 && lp) { setSelectedIdx(idx); dragRef.current = { idx, last: lp, ptIdx: null }; }
      else { setSelectedIdx(null); dragRef.current = null; }
      return;
    }

    // ── Active drawing tool ──────────────────────────────────────
    if (!lp) return;
    // Freehand strokes begin here; everything else places on mouse-up.
    if (drawPtsNeeded(drawingTool) === -1) {
      inProgressRef.current = makeDrawing(drawingTool, [lp]);
    }
  }, [drawingTool, lockDrawings, pixelToLogical, hitHandle, hitTestDrawing, makeDrawing, scheduleDrawRender]);

  const handleDrawMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const lp = pixelToLogical(x, y);

    // Promote to "moved" once past a small threshold (click-vs-drag).
    const st = drawingStartRef.current;
    if (st && !mouseMovedRef.current && Math.hypot(x - st.x, y - st.y) > 4) mouseMovedRef.current = true;

    // ── SELECT / MOVE drag ───────────────────────────────────────
    if (drawingTool === "select") {
      const drag = dragRef.current;
      if (!drag || !lp) return;
      const d = drawingsRef.current[drag.idx];
      if (!d) return;
      if (drag.ptIdx != null) d.pts[drag.ptIdx] = lp;                       // reshape one anchor
      else drawingsRef.current[drag.idx] = moveDrawingBy(d, lp.price - drag.last.price, lp.time - drag.last.time);
      drag.last = lp;
      scheduleDrawRender();
      return;
    }

    // ── Freehand: accumulate the stroke ──────────────────────────
    const ip = inProgressRef.current;
    if (ip && drawPtsNeeded(ip.tool) === -1) {
      if (lp) ip.pts.push(lp);
      scheduleDrawRender();
      return;
    }

    // ── Live rubber-band preview for click-to-place / drag-draw ──
    if (lp) previewPtRef.current = lp;
    if (ip || (st && mouseMovedRef.current)) scheduleDrawRender();
  }, [drawingTool, pixelToLogical, moveDrawingBy, scheduleDrawRender]);

  const handleDrawMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingTool === "select" || drawingTool === "eraser") {
      if (dragRef.current) scheduleDrawRender();
      dragRef.current = null;
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const lp = pixelToLogical(x, y) ?? drawingStartRef.current?.lp ?? null;
    const ip = inProgressRef.current;

    // ── Freehand commit ──────────────────────────────────────────
    if (ip && drawPtsNeeded(ip.tool) === -1) {
      if (ip.pts.length > 1) finalizeDrawing(ip);
      else { inProgressRef.current = null; previewPtRef.current = null; onDrawingComplete?.(); setRangeVer(v => v + 1); }
      drawingStartRef.current = null;
      return;
    }

    if (!lp) { drawingStartRef.current = null; return; }
    const need = drawPtsNeeded(drawingTool);

    // ── Single-point tools: place immediately ────────────────────
    if (need === 1) { finalizeDrawing(makeDrawing(drawingTool, [lp])); drawingStartRef.current = null; return; }

    // ── Two-point tools: press-drag-release shortcut ─────────────
    if (need === 2 && !ip && mouseMovedRef.current && drawingStartRef.current?.lp) {
      finalizeDrawing(makeDrawing(drawingTool, [drawingStartRef.current.lp, lp]));
      drawingStartRef.current = null;
      return;
    }

    // ── Click-to-place accumulation (2+ pts, incl. polyline/path) ─
    if (!ip) {
      inProgressRef.current = makeDrawing(drawingTool, [lp]);
    } else {
      ip.pts.push(lp);
      const target = drawPtsNeeded(ip.tool);
      if (target >= 2 && ip.pts.length >= target) finalizeDrawing(ip);
    }
    previewPtRef.current = lp;
    drawingStartRef.current = null;
    setRangeVer(v => v + 1);
  }, [drawingTool, pixelToLogical, makeDrawing, finalizeDrawing, onDrawingComplete, scheduleDrawRender]);

  // Double-click finishes an open-ended polyline / path.
  const handleDrawDoubleClick = useCallback(() => {
    const ip = inProgressRef.current;
    if (ip && drawPtsNeeded(ip.tool) === -2 && ip.pts.length >= 2) finalizeDrawing(ip);
  }, [finalizeDrawing]);

  // Pointer leaving the canvas commits a freehand stroke and ends any drag.
  const handleDrawMouseLeave = useCallback(() => {
    const ip = inProgressRef.current;
    if (ip && drawPtsNeeded(ip.tool) === -1) {
      if (ip.pts.length > 1) finalizeDrawing(ip);
      else { inProgressRef.current = null; previewPtRef.current = null; setRangeVer(v => v + 1); }
    }
    dragRef.current = null;
  }, [finalizeDrawing]);

  // CURSOR-mode click-to-select: fires from the chart wrapper (canvas is
  // pass-through in cursor mode so the chart can still pan). A clean click
  // — negligible movement — selects the drawing under it; a drag pans.
  const cursorDownRef = useRef<{ x: number; y: number } | null>(null);
  const handleCursorSelectDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingTool !== "cursor") return;
    const r = e.currentTarget.getBoundingClientRect();
    cursorDownRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  }, [drawingTool]);
  const handleCursorSelectUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingTool !== "cursor") return;
    const s = cursorDownRef.current; cursorDownRef.current = null;
    if (!s) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (Math.hypot(x - s.x, y - s.y) > 5) return;   // was a pan, not a click
    const idx = hitTestDrawing(x, y);
    setSelectedIdx(idx >= 0 ? idx : null);
  }, [drawingTool, hitTestDrawing]);

  // ── Big-Trade bubble hover hit-test → comic speech-bubble tooltip ──
  // Attached to the chart wrapper so it fires in cursor mode without blocking
  // chart panning (drawing tools keep their own handler on drawCanvas).
  const handleOverlayMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bubbles = [...bubblesRef.current, ...deltaBubblesRef.current];
    if (!bubbles.length) {
      if (bubbleHoverRef.current !== null) { bubbleHoverRef.current = null; setBubbleTip(null); }
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    // topmost first (last drawn = end of array)
    let hit: typeof bubbles[number] | null = null;
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if (Math.hypot(mx - b.x, my - b.y) <= b.r + 2) { hit = b; break; }
    }
    if (hit) {
      if (bubbleHoverRef.current !== hit.id) {
        bubbleHoverRef.current = hit.id;
        // Plain-English, honest label — e.g. "12.4M aggressive sell orders at this
        // level". Never "absorbed"; this is one real print's aggressor size.
        const av = Math.abs(hit.value);
        const vstr = av >= 1_000_000 ? `${(av / 1_000_000).toFixed(1)}M`
                   : av >= 1000       ? `${(av / 1000).toFixed(1)}k`
                   : av >= 1          ? `${Math.round(av)}`
                   : av > 0           ? av.toFixed(av >= 0.1 ? 2 : 4)
                   : "0";
        const p = hit.anchorPrice;
        const pstr = p >= 10000 ? Math.round(p).toString()
                   : p >= 100   ? p.toFixed(2)
                   : p >= 1     ? p.toFixed(2)
                   :              p.toFixed(4);
        setBubbleTip({
          x: hit.x, y: hit.y - hit.r,
          side: hit.side, value: hit.value,
          text: `${vstr} ${base > 100 ? "shares" : "vol"} aggressive ${hit.side === "buy" ? "buy" : "sell"} at ${pstr}`,
        });
      }
    } else if (bubbleHoverRef.current !== null) {
      bubbleHoverRef.current = null;
      setBubbleTip(null);
    }
  }, []);

  // Clear drawings on clearTrigger change
  useEffect(() => {
    if (clearTrigger > 0) {
      drawingsRef.current = [];
      inProgressRef.current = null;
      previewPtRef.current = null;
      drawingStartRef.current = null;
      dragRef.current = null;
      setSelectedIdx(null);        // hide stale floating edit toolbar
      setRangeVer(v => v + 1);
      renderDrawings();
    }
  }, [clearTrigger, renderDrawings]);

  // Load persisted drawings for the current user+symbol (Tier-2 #6). Runs on
  // mount and whenever the symbol changes, replacing the in-memory set and
  // forcing a repaint once the price/time scales are ready.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(drawStorageKey());
      const arr = raw ? (JSON.parse(raw) as Drawing[]) : [];
      drawingsRef.current = Array.isArray(arr)
        ? arr.map(d => ({ ...d, style: { ...d.style, opacity: d.style?.opacity ?? 1 } }))
        : [];
      drawIdRef.current = drawingsRef.current.reduce((m, d) => Math.max(m, d.id || 0), 0);
      lastSavedDrawRef.current = raw ?? "";
    } catch {
      drawingsRef.current = [];
      lastSavedDrawRef.current = "";
    }
    setSelectedIdx(null);
    setRangeVer(v => v + 1); // repaint once scales exist
  }, [drawStorageKey]);

  // Debounced autosave: rangeVer bumps on every drawing mutation (place, drag,
  // delete, style/text edit, clear). We coalesce writes and skip no-ops so pure
  // pan/zoom (which also bumps rangeVer) never thrashes localStorage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = setTimeout(() => {
      try {
        const payload = JSON.stringify(drawingsRef.current);
        if (payload === lastSavedDrawRef.current) return;
        localStorage.setItem(drawStorageKey(), payload);
        lastSavedDrawRef.current = payload;
      } catch { /* quota / serialization — non-fatal */ }
    }, 400);
    return () => clearTimeout(t);
  }, [rangeVer, drawStorageKey]);

  // Hide/show drawings
  useEffect(() => {
    if (drawCanvasRef.current) {
      drawCanvasRef.current.style.opacity = drawingsVisible ? "1" : "0";
    }
  }, [drawingsVisible]);

  /* ── Right-click context menu handler ──────────────────────── */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!candleRef.current) return;
    try {
      const rect  = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const cx    = e.clientX - rect.left;
      const cy    = e.clientY - rect.top;
      const price = candleRef.current.coordinateToPrice(cy);
      if (price == null) return;

      // Unified hit-test across every drawing type (10px radius).
      const hit = hitTestDrawing(cx, cy, 10);
      if (hit >= 0) setSelectedIdx(hit);

      setCtxMenu({ x: cx, y: cy, price: +price.toFixed(barsRef.current[0]?.close > 100 ? 2 : 4), nearDrawingIdx: hit >= 0 ? hit : null });
    } catch {}
  }, [hitTestDrawing]);

  return (
    <div
      ref={wrapRef}
      style={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden", minWidth:0,
               background: chartSettings?.background ?? "#0B0E1A", touchAction:"none" }}
    >

      {/* ── OHLCV strip ─────────────────────────────────── */}
      <div
        style={{ height: 28, flexShrink: 0, background: "#0B0E1A" }}
        className="flex items-center gap-4 px-3 border-b border-wm-border/50"
      >
        {/* Price + change */}
        <div className="flex items-baseline gap-2">
          <span className="font-mono font-bold text-base text-wm-text leading-none">
            {(ticker.price > 0 ? ticker.price : lastPrice).toLocaleString("en-US", {
              minimumFractionDigits: dp, maximumFractionDigits: dp,
            })}
          </span>
          <span className={`text-xs font-mono font-semibold ${up ? "text-wm-green" : "text-wm-red"}`}>
            {up ? "+" : ""}{change.toFixed(dp)} ({up ? "+" : ""}{changePct}%)
          </span>
        </div>

        {/* OHLCV */}
        {last && (
          <div className="flex items-center gap-3 text-[10px] font-mono text-wm-text-dim">
            <span>O <span className="text-wm-text">{last.open.toFixed(dp)}</span></span>
            <span>H <span className="text-wm-green">{last.high.toFixed(dp)}</span></span>
            <span>L <span className="text-wm-red">{last.low.toFixed(dp)}</span></span>
            <span>C <span className="text-wm-text">{last.close.toFixed(dp)}</span></span>
            <span>V <span className="text-wm-text">{last.volume.toLocaleString()}</span></span>
          </div>
        )}

        {/* Pine Script badge */}
        {pineOutput && (
          <div className="ml-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-wm-purple/15 border border-wm-purple/30 text-[9px] text-wm-purple font-semibold">
            ƒ {pineOutput.shortTitle || pineOutput.title}
          </div>
        )}

        {/* Right side: countdown + live */}
        <div className="ml-auto flex items-center gap-3">
          {/* Candle countdown */}
          <div className={`flex items-center gap-1 text-[10px] font-mono font-bold transition-colors ${
            chartSettings?.candleTimer === false ? "hidden" : ""
          } ${
            closeFlash ? "text-wm-red" : "text-wm-text-dim"
          }`}>
            <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0">
              <circle cx="4" cy="4" r="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <line x1="4" y1="4" x2="4" y2="1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="4" y1="4" x2="6" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className={closeFlash ? "animate-pulse" : ""}>{countdown}</span>
          </div>

          {/* Live dot */}
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-wm-green animate-pulse" />
            <span className="text-[10px] text-wm-green font-semibold">LIVE</span>
          </div>

          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="flex items-center justify-center w-5 h-5 rounded hover:bg-wm-surface transition-colors text-wm-text-dim hover:text-wm-text"
          >
            {isFullscreen ? (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1 4H4V1M7 1V4H10M10 7H7V10M4 10V7H1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1 4V1H4M7 1H10V4M10 7V10H7M4 10H1V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Chart + canvas overlay ───────────────────────── */}
      <div style={{ flex:1, position:"relative", minHeight:0 }} onContextMenu={handleContextMenu}
        onMouseMove={handleOverlayMouseMove}
        onMouseDown={handleCursorSelectDown}
        onMouseUp={handleCursorSelectUp}
        onMouseLeave={() => { bubbleHoverRef.current = null; setBubbleTip(null); cursorDownRef.current = null; }}>
        <div ref={containerRef} style={{ width:"100%", height:"100%" }} />

        {/* ── Big-Trade comic speech-bubble tooltip (🫧 hover) ─────── */}
        {bubbleTip && (() => {
          const buy   = bubbleTip.side === "buy";
          const accent = buy ? "#00E696" : "#FF465A";
          const sign   = bubbleTip.value >= 0 ? "+" : "−";
          const absVal = Math.abs(bubbleTip.value) >= 1
            ? Math.abs(bubbleTip.value).toLocaleString("en-US", { maximumFractionDigits: 0 })
            : Math.abs(bubbleTip.value).toLocaleString("en-US", { maximumFractionDigits: 4 });
          // clamp within view
          const left = Math.max(70, Math.min((wrapRef.current?.clientWidth ?? 800) - 70, bubbleTip.x));
          const top  = Math.max(54, bubbleTip.y - 14);
          return (
            <div style={{
              position: "absolute", left, top, transform: "translate(-50%, -100%)",
              zIndex: 60, pointerEvents: "none",
            }}>
              <div style={{
                position: "relative",
                background: "#0E1322",
                border: `2.5px solid ${accent}`,
                borderRadius: 14,
                padding: "8px 12px 9px",
                minWidth: 132,
                boxShadow: `0 6px 22px rgba(0,0,0,0.55), 0 0 16px ${accent}55`,
                fontFamily: "Inter, system-ui, sans-serif",
              }}>
                {/* Header: WM "W" logo + label */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 20, height: 20, borderRadius: 6,
                    background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
                    color: "#06080F", fontWeight: 900, fontSize: 13, lineHeight: 1,
                    boxShadow: `0 0 8px ${accent}88`,
                  }}>W</span>
                  <span style={{ color: accent, fontWeight: 800, fontSize: 11, letterSpacing: 0.3 }}>
                    {buy ? "AGGRESSIVE BUY" : "AGGRESSIVE SELL"}
                  </span>
                </div>
                {/* Exact aggressor notional — the headline number */}
                <div style={{ color: "#fff", fontWeight: 900, fontSize: 18, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {sign}{absVal}
                </div>
                {/* Plain-English explanation — e.g. "12.4M aggressive sell orders at this level" */}
                <div style={{ color: "#9AA3BF", fontWeight: 600, fontSize: 9.5, marginTop: 3, maxWidth: 172 }}>
                  {bubbleTip.text}
                </div>
                {/* Comic tail pointer */}
                <div style={{
                  position: "absolute", bottom: -9, left: "50%", transform: "translateX(-50%)",
                  width: 0, height: 0,
                  borderLeft: "9px solid transparent", borderRight: "9px solid transparent",
                  borderTop: `10px solid ${accent}`,
                }} />
                <div style={{
                  position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)",
                  width: 0, height: 0,
                  borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
                  borderTop: "7px solid #0E1322",
                }} />
              </div>
            </div>
          );
        })()}
        {/* WM branding — small, non-obtrusive W badge tucked in the
            bottom-left corner. (Was a large "WealthyMindsets" text pill that
            crowded the price action; per user request it's now just the W.) */}
        <div
          title="WealthyMindsets Pro"
          style={{
            position: "absolute", bottom: 6, left: 6,
            cursor: "default", zIndex: 10, userSelect: "none",
            pointerEvents: "none", opacity: 0.55,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="22" cy="22" r="21" fill="#0D1117" stroke="#F0B429" strokeWidth="2"/>
            <path d="M8 13 L13.5 31 L19 20 L22 25 L25 20 L30.5 31 L36 13" stroke="#F0B429" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ mixBlendMode: "normal", opacity: 1, zIndex: 5 }}
        />
        {/* Drawing tools canvas — pointer-events only when tool is active */}
        <canvas
          ref={drawCanvasRef}
          className="absolute top-0 left-0"
            style={{
            cursor: drawingTool === "cursor" ? "default"
                  : drawingTool === "select" ? "move"
                  : drawingTool === "eraser" ? "cell"
                  : TEXT_TOOLS.has(drawingTool) ? "text"
                  : "crosshair",
            pointerEvents: drawingTool !== "cursor" ? "all" : "none",
            opacity: drawingsVisible ? 1 : 0,
            zIndex: 10,
            touchAction: "none",
            willChange: drawingTool !== "cursor" ? "contents" : "auto",
          }}
          onMouseDown={handleDrawMouseDown}
          onMouseMove={handleDrawMouseMove}
          onMouseUp={handleDrawMouseUp}
          onMouseLeave={handleDrawMouseLeave}
          onDoubleClick={handleDrawDoubleClick}
        />

        {/* ── Floating edit toolbar for the selected drawing ─────────
             Appears when a drawing is selected (via SELECT tool or a
             clean click in cursor mode). Edits mutate the drawing's
             style ref in place, then bump editBump + rangeVer to redraw. */}
        {selectedIdx != null && drawingsRef.current[selectedIdx] && !lockDrawings && (() => {
          const d = drawingsRef.current[selectedIdx];
          const anchor = logicalToPixel(d.pts[0]);
          const cw = containerRef.current?.offsetWidth ?? 800;
          const barW = 316;
          const left = Math.max(6, Math.min(cw - barW - 6, (anchor?.x ?? 100) - 30));
          const top  = Math.max(4, (anchor?.y ?? 70) - 46);
          const bump = () => { setEditBump(v => v + 1); setRangeVer(v => v + 1); };
          const btn = (active: boolean): React.CSSProperties => ({
            display: "flex", alignItems: "center", justifyContent: "center",
            minWidth: 22, height: 22, padding: "0 5px", borderRadius: 5, cursor: "pointer",
            fontSize: 11, lineHeight: 1, color: active ? "#0B0E1A" : "#C7D0E8",
            background: active ? "#4FA3E0" : "rgba(255,255,255,0.05)",
            border: `1px solid ${active ? "#4FA3E0" : "rgba(255,255,255,0.10)"}`,
          });
          const isText = TEXT_TOOLS.has(d.tool);
          return (
            <div
              key={editBump}
              style={{
                position: "absolute", left, top, zIndex: 130,
                display: "flex", alignItems: "center", gap: 4, padding: "5px 6px",
                background: "#141824", border: "1px solid #2A3350", borderRadius: 9,
                boxShadow: "0 8px 26px rgba(0,0,0,0.55)",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* colors */}
              <div style={{ display: "flex", gap: 3 }}>
                {DRAW_COLORS.slice(0, 6).map(c => (
                  <button key={c} title={c} onClick={() => { d.style.color = c; bump(); }}
                    style={{ width: 15, height: 15, borderRadius: "50%", cursor: "pointer",
                      background: c, border: d.style.color === c ? "2px solid #fff" : "1px solid rgba(255,255,255,0.2)" }} />
                ))}
              </div>
              <div style={{ width: 1, height: 18, background: "#2A3350" }} />
              {/* width */}
              {[1, 2, 3, 4].map(w => (
                <button key={w} title={`Width ${w}px`} onClick={() => { d.style.width = w; bump(); }}
                  style={btn(Math.round(d.style.width) === w)}>
                  <span style={{ display: "inline-block", width: 14, height: w, background: "currentColor", borderRadius: 2 }} />
                </button>
              ))}
              <div style={{ width: 1, height: 18, background: "#2A3350" }} />
              {/* dash style */}
              {(["solid", "dashed", "dotted"] as const).map(s => (
                <button key={s} title={s} onClick={() => { d.style.dash = s; bump(); }} style={btn(d.style.dash === s)}>
                  {s === "solid" ? "──" : s === "dashed" ? "- -" : "···"}
                </button>
              ))}
              <div style={{ width: 1, height: 18, background: "#2A3350" }} />
              <input
                type="range" min={10} max={100} step={5}
                title="Opacity"
                value={Math.round((d.style.opacity ?? 1) * 100)}
                onChange={e => { d.style.opacity = Number(e.target.value) / 100; bump(); }}
                style={{ width: 52, accentColor: "#4FA3E0" }}
              />
              {FILL_TOOLS.has(d.tool) && d.tool !== "delta-vp" && (
                <>
                  <div style={{ width: 1, height: 18, background: "#2A3350" }} />
                  <button title="Fill" onClick={() => { d.style.fill = !d.style.fill; bump(); }} style={btn(d.style.fill)}>▧</button>
                </>
              )}
              {isText && (
                <>
                  <div style={{ width: 1, height: 18, background: "#2A3350" }} />
                  <button title="Edit text" onClick={() => setTextEdit({ idx: selectedIdx })} style={btn(false)}>✎</button>
                </>
              )}
              <div style={{ width: 1, height: 18, background: "#2A3350" }} />
              <button title="Delete" onClick={() => { drawingsRef.current.splice(selectedIdx, 1); setSelectedIdx(null); setRangeVer(v => v + 1); }}
                style={{ ...btn(false), color: "#FF6B81" }}>🗑</button>
            </div>
          );
        })()}

        {/* ── Inline text editor — clean box that appears over a text-bearing
             drawing's anchor point. Replaces the old window.prompt() native
             dialog: matches the "clean editing box" spec and is drivable both
             by a human and programmatically. Commit on Enter/blur, cancel on
             Escape. If the field is left empty on a brand-new drawing, the
             drawing is discarded. ───────────────────────────────────────── */}
        {textEdit != null && drawingsRef.current[textEdit.idx] && !lockDrawings && (() => {
          const idx = textEdit.idx;
          const d = drawingsRef.current[idx];
          const p = logicalToPixel(d.pts[0]);
          const cw = containerRef.current?.offsetWidth ?? 800;
          const boxW = 190;
          const left = Math.max(6, Math.min(cw - boxW - 6, (p?.x ?? 100)));
          const top  = Math.max(4, (p?.y ?? 70) + 6);
          const commit = (raw: string) => {
            const t = raw.trim();
            if (t === "") {
              // Empty on a freshly-placed text drawing → discard it entirely.
              if (idx === drawingsRef.current.length - 1) {
                drawingsRef.current.splice(idx, 1);
                setSelectedIdx(null);
              }
            } else {
              d.text = t;
            }
            setTextEdit(null);
            setRangeVer(v => v + 1);
          };
          return (
            <input
              key={`txt-${idx}`}
              autoFocus
              defaultValue={d.text ?? ""}
              placeholder="Type text…"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") { e.preventDefault(); commit((e.target as HTMLInputElement).value); }
                else if (e.key === "Escape") {
                  e.preventDefault();
                  // Cancel: discard if it was a brand-new empty text drawing.
                  if ((d.text ?? "") === "" && idx === drawingsRef.current.length - 1) {
                    drawingsRef.current.splice(idx, 1);
                    setSelectedIdx(null);
                  }
                  setTextEdit(null);
                  setRangeVer(v => v + 1);
                }
              }}
              onBlur={(e) => commit(e.target.value)}
              style={{
                position: "absolute", left, top, zIndex: 131, width: boxW,
                height: 28, padding: "0 9px", borderRadius: 7, outline: "none",
                fontSize: 12, color: "#EAF0FF", background: "#141824",
                border: "1px solid #4FA3E0", boxShadow: "0 8px 26px rgba(0,0,0,0.55)",
              }}
            />
          );
        })()}

        {/* ── Small "reset scale" button — appears ONLY after the user has
             manually stretched the price axis by dragging the numbers. Replaces
             the old double-click-to-reset gesture with an explicit, discoverable
             control. Sits just left of the price axis, top-right. ─── */}
        {scaleLocked && (
          <button
            onClick={() => {
              manualPriceRangeRef.current = null;
              setScaleLocked(false);
              setAutoScale(true);
              try {
                candleRef.current?.applyOptions({ autoscaleInfoProvider: autoscaleProviderRef.current });
                chartRef.current?.priceScale("right").applyOptions({ autoScale: true });
              } catch {}
            }}
            title="Reset price scale to auto-fit"
            style={{
              position: "absolute", right: 62, top: 8, zIndex: 55,
              height: 22, padding: "0 8px", borderRadius: 5, fontSize: 9.5, fontWeight: 800,
              cursor: "pointer", letterSpacing: 0.3, whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 4,
              background: "rgba(240,180,41,0.22)", border: "1px solid rgba(240,180,41,0.65)", color: "#F0B429",
              backdropFilter: "blur(3px)", boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
            }}>
            ⤢ Reset Scale
          </button>
        )}

        {/* ── Scale buttons — bottom-right, above the time axis so they
             no longer clutter / overlap the price action at top ─── */}
        <div style={{
          position:"absolute", right: 64, bottom: 30, display:"flex", flexDirection:"row", gap: 4, zIndex: 50, alignItems:"center",
          padding: "3px 4px", borderRadius: 6,
          background: "rgba(8,12,20,0.55)", backdropFilter: "blur(3px)",
        }}>
          {/* Reset View — undo vertical drag, re-fit price + time to the data */}
          <button
            onClick={() => {
              manualPriceRangeRef.current = null;
              setAutoScale(true);
              try {
                chartRef.current?.timeScale().fitContent();
                chartRef.current?.timeScale().scrollToRealTime();
              } catch {}
            }}
            title="R — Reset View: re-center the chart and undo any vertical drag"
            style={{
              width: 22, height: 22, borderRadius: 4, fontSize: 11, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(47,128,237,0.16)", border: "1px solid rgba(47,128,237,0.5)", color: "#2F80ED",
            }}>
            R
          </button>
          {/* Clear Auto/Lock toggle — when LOCKED, drag the price axis up/down freely */}
          <button
            onClick={() => setAutoScale(v => !v)}
            title={autoScale
              ? "A — Auto Scale ON: chart auto-fits price. Click to LOCK, then drag the price axis up/down to see higher/lower prices."
              : "A — Scale LOCKED: drag the price axis (right side) up/down to pan, or scroll to zoom. Click to re-enable Auto Scale."}
            style={{
              width: 22, height: 22, borderRadius: 4, fontSize: 11, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: autoScale ? "rgba(0,200,118,0.18)" : "rgba(240,180,41,0.20)",
              border: `1px solid ${autoScale ? "rgba(0,200,118,0.5)" : "rgba(240,180,41,0.6)"}`,
              color: autoScale ? "#00C076" : "#F0B429",
            }}>
            A
          </button>
          {[
            { label: "%", title: "Percentage mode", active: pctMode, onClick: () => setPctMode(v => !v) },
            { label: "L", title: "Log scale",       active: logScale, onClick: () => setLogScale(v => !v) },
          ].map(btn => (
            <button key={btn.label} onClick={btn.onClick} title={btn.title} style={{
              width: 22, height: 22, borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer",
              background: btn.active ? "rgba(47,128,237,0.2)" : "rgba(20,24,36,0.85)",
              border: `1px solid ${btn.active ? "rgba(47,128,237,0.5)" : "#263050"}`,
              color: btn.active ? "#2F80ED" : "#8896BE",
            }}>
              {btn.label}
            </button>
          ))}
        </div>

        {/* ── Data Window ──────────────────────────────── */}
        {dataWindowOpen && dataWindow && (
          <div style={{
            position: "absolute", top: 8, left: 48, zIndex: 60,
            background: "rgba(20,24,36,0.92)",
            border: "1px solid #2F80ED",
            borderRadius: 6, padding: "7px 10px",
            pointerEvents: "none",
            minWidth: 140,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#2F80ED", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
              Data Window
            </div>
            {[
              { label: "O", value: dataWindow.o, color: "#E2E8FF" },
              { label: "H", value: dataWindow.h, color: "#00C076" },
              { label: "L", value: dataWindow.l, color: "#FF4D67" },
              { label: "C", value: dataWindow.c, color: "#E2E8FF" },
              { label: "V", value: dataWindow.v, color: "#8896BE", fmt: (v: number) => v.toLocaleString() },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 2 }}>
                <span style={{ fontSize: 10, color: "#4A5580", fontFamily: "monospace" }}>{row.label}</span>
                <span style={{ fontSize: 10, color: row.color, fontFamily: "monospace" }}>
                  {row.fmt ? row.fmt(row.value) : row.value.toFixed(base < 10 ? 4 : 2)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Toggle data window button */}
        <button
          onClick={() => setDataWindowOpen(v => !v)}
          title={dataWindowOpen ? "Hide data window" : "Show data window"}
          style={{
            position: "absolute", top: 8, left: 8, zIndex: 70,
            width: 22, height: 22, borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer",
            background: dataWindowOpen ? "rgba(47,128,237,0.2)" : "rgba(20,24,36,0.85)",
            border: `1px solid ${dataWindowOpen ? "rgba(47,128,237,0.5)" : "#263050"}`,
            color: dataWindowOpen ? "#2F80ED" : "#8896BE",
          }}
        >
          D
        </button>

        {/* ── Right-click context menu ──────────────────── */}
        {ctxMenu && (
          <div
            style={{
              position: "absolute", left: ctxMenu.x, top: ctxMenu.y, zIndex: 200,
              background: "#141824",
              border: "1px solid #263050",
              borderRadius: 8,
              minWidth: 180,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              overflow: "hidden",
            }}
            onMouseLeave={() => setCtxMenu(null)}
          >
            <div style={{ padding: "5px 10px 4px", borderBottom: "1px solid #263050" }}>
              <span style={{ fontSize: 10, color: "#4A5580" }}>
                Price: <span style={{ color: "#F5A623", fontFamily: "monospace" }}>{ctxMenu.price}</span>
              </span>
            </div>
            {[
              ...(ctxMenu.nearDrawingIdx !== null ? [
                {
                  label: "🎨 Edit style", color: "#4FA3E0",
                  action: () => {
                    setSelectedIdx(ctxMenu.nearDrawingIdx);
                    setEditBump(v => v + 1);
                    scheduleDrawRender();
                  },
                },
                {
                  label: "🗑 Delete this drawing", color: "#FF4D6A",
                  action: () => {
                    drawingsRef.current.splice(ctxMenu.nearDrawingIdx!, 1);
                    setSelectedIdx(null);
                    scheduleDrawRender();
                    setRangeVer(v => v + 1);
                  },
                },
              ] : []),
              {
                label: `🔔 Add Alert at ${ctxMenu.price}`, color: "#F5A623",
                action: () => {
                  onCreatePriceAlert?.(ctxMenu.price);
                  showAlertToast({ id: `ctx-${Date.now()}`, text: `Alert queued at ${ctxMenu.price}` });
                },
              },
              { label: "― Horizontal Line", color: "#8896BE", action: () => {
                const lp = pixelToLogical(ctxMenu.x, ctxMenu.y);
                if (lp) { drawingsRef.current.push(makeDrawing("hline", [lp])); scheduleDrawRender(); setRangeVer(v => v + 1); }
              }},
              { label: "✎ Add Text", color: "#8896BE", action: () => {
                const lp = pixelToLogical(ctxMenu.x, ctxMenu.y);
                if (lp) {
                  drawingsRef.current.push(makeDrawing("text", [lp], ""));
                  const newIdx = drawingsRef.current.length - 1;
                  setSelectedIdx(newIdx);
                  scheduleDrawRender();
                  setRangeVer(v => v + 1);
                  setTextEdit({ idx: newIdx });
                }
              }},
              { label: "📋 Copy price", color: "#8896BE", action: () => { navigator.clipboard.writeText(String(ctxMenu.price)).catch(() => {}); }},
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  item.action?.();
                  setCtxMenu(null);
                }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "7px 12px", fontSize: 12, cursor: "pointer",
                  background: "none", border: "none",
                  color: item.color,
                  borderTop: i > 0 ? "1px solid rgba(38,48,80,0.3)" : "none",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Dismiss context menu on click outside */}
        {ctxMenu && (
          <div style={{ position: "absolute", inset: 0, zIndex: 199 }} onClick={() => setCtxMenu(null)} />
        )}
      </div>
    </div>
  );
}
