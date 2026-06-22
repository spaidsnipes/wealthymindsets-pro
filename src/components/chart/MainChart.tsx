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
import { resolveParams, type IndicatorSettings } from "./indicatorConfig";
import { parseExchangeSymbol } from "@/lib/exchanges";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { PineOutput } from "@/lib/pine/types";
import * as IND from "./indicators";

/* ── Types ─────────────────────────────────────────────── */
interface Bar {
  time:   number;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

interface OrderFlowBubble {
  price: number;
  vol:   number;
  side:  "buy" | "sell";
  time:  number;
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

async function fetchYahooCandles(sym: string, tf: string, count: number): Promise<Bar[] | null> {
  try {
    const url = `/api/yahoo?sym=${encodeURIComponent(sym)}&type=candles&tf=${tf}&bars=${count}`;
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
  onBarsReady?:    (bars: Bar[]) => void;
  // Drawing tools
  drawingTool?:    string;
  drawingColor?:   string;
  magnetActive?:   boolean;
  lockDrawings?:   boolean;
  onDrawingComplete?: () => void;   // fired after a drawing is placed → return to cursor
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

/* ── Component ──────────────────────────────────────────── */
export function MainChart({ symbol, timeframe, footprintType, footprintEnabled = true, candleType = "candles", pineOutput, onBarsReady,
  drawingTool = "cursor", drawingColor = "#00D4AA", magnetActive = false, lockDrawings = false,
  onDrawingComplete,
  drawingsVisible = true, clearTrigger = 0, activeInds, indSettings, extendedHours,
  alertLevels = [], chartSettings, replayActive = false, replayBars,
  compareSymbol, onPriceAtCursor, onOHLCAtCursor,
  fixedVPActive = false, sessionVPActive = false,
  onRequestFullscreen,
}: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const wrapRef       = useRef<HTMLDivElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null); // drawing tools overlay
  const chartRef      = useRef<any>(null);
  const candleRef     = useRef<any>(null);
  const volRef        = useRef<any>(null);
  const pineSeriesRef = useRef<Map<string, any>>(new Map());
  const indSeriesRef  = useRef<any[]>([]);
  const barsRef       = useRef<Bar[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Big-Trade Bubble engine state (🫧 floating bubbles) ───────
  type Bubble = {
    id:      number;
    x:       number;   // current canvas px
    y:       number;   // current canvas px
    vx:      number;   // velocity px/frame
    vy:      number;   // velocity px/frame
    baseR:   number;   // target radius (∝ order size)
    r:       number;   // current radius (eases up on spawn, shrinks on pop)
    phase:   number;   // wobble / orbit phase
    big:     boolean;  // true = the main big-trade bubble (persists at level)
    side:    "buy" | "sell";
    value:   number;   // order size (signed by side for display)
    born:    number;   // timestamp ms
    life:    number;   // ms to live (big bubbles auto-refresh)
    popping: boolean;  // currently in pop / absorb animation
    popT:    number;   // 0→1 pop progress
    anchorTime: number; // bar time (unix s) → home X re-anchor on scroll
    anchorPrice: number; // price → home Y re-anchor on scroll/zoom
    absorbedBy?: number; // id of bubble that absorbed this one (pop pulls toward it)
    absorbFlash?: number; // 0→1 swell flash when this bubble absorbs another
  };
  const bubblesRef    = useRef<Bubble[]>([]);
  const bubbleSpawnRef = useRef<Set<string>>(new Set()); // dedupe main spawns per bar-key
  const bubbleIdRef    = useRef(0);
  const bubbleHoverRef = useRef<number | null>(null);     // hovered bubble id
  const bubbleSpawnTickRef = useRef(0);                   // throttle continuous companion spawns
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
  // All drawings store logical price/time coords so they stay anchored when chart scrolls.
  type LogicalPt = { price: number; time: number }; // time = unix seconds (LightweightCharts UTCTimestamp)
  type Drawing =
    | { type: "trendline"|"ray"|"extended-line"|"arrow"|"rectangle"|"channel"|"ellipse"|"triangle"|"fibonacci";
        p1: LogicalPt; p2: LogicalPt; color: string }
    | { type: "hline"|"hray"; price: number; color: string }
    | { type: "vline"; time: number; color: string }
    | { type: "text"; price: number; time: number; text: string; color: string }
    | { type: "brush"; points: LogicalPt[]; color: string };

  const drawingsRef     = useRef<Drawing[]>([]);
  const inProgressRef   = useRef<Drawing | null>(null);
  const drawingStartRef = useRef<{x:number;y:number}|null>(null);

  // ── Drawing coordinate helpers ───────────────────────────────
  // Convert canvas CSS pixel (x,y) → logical {price, time}
  const pixelToLogical = useCallback((px: number, py: number): LogicalPt | null => {
    const price = candleRef.current?.coordinateToPrice(py);
    const time  = chartRef.current?.timeScale().coordinateToTime(px);
    if (price == null || time == null) return null;
    return { price: +price, time: +time };
  }, []);

  // Convert logical {price, time} → canvas CSS pixel (x,y)
  const logicalToPixel = useCallback((pt: LogicalPt): { x: number; y: number } | null => {
    const y = candleRef.current?.priceToCoordinate(pt.price);
    const x = chartRef.current?.timeScale().timeToCoordinate(pt.time as any);
    if (y == null || x == null) return null;
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

  const base = getBase(symbol);

  const [candles,   setCandles]   = useState<Bar[]>([]);
  const [lastPrice, setLastPrice] = useState(base);
  const [openPrice, setOpenPrice] = useState(base);
  const [ready,     setReady]     = useState(false);
  const [bubbles,   setBubbles]   = useState<OrderFlowBubble[]>([]);

  // Countdown state
  const [countdown,   setCountdown]   = useState("--:--");
  const [closeFlash,  setCloseFlash]  = useState(false);
  const [rangeVer,    setRangeVer]    = useState(0); // bumped on chart scroll/zoom → redraws canvas

  const { liveBar, ticker, recentTicks } = useWebSocket({ symbol, timeframe });

  // ── Tick accumulator: tracks bid/ask volume by price level per bar ──
  // Map<barTime, Map<priceRounded, {bid, ask}>>
  const tickAccRef = useRef<Map<number, Map<number, { bid: number; ask: number }>>>(new Map());
  useEffect(() => {
    if (!recentTicks?.length) return;
    const intervalSec = getIntervalSec(timeframe);
    const minTick = base > 10_000 ? 0.25 : base > 1_000 ? 0.25 : base > 100 ? 0.01 : 0.0001;
    recentTicks.forEach(tick => {
      const barTime = Math.floor(tick.time / 1000 / intervalSec) * intervalSec;
      const priceLevel = Math.round(tick.price / minTick) * minTick;
      if (!tickAccRef.current.has(barTime)) {
        tickAccRef.current.set(barTime, new Map());
      }
      const lvlMap = tickAccRef.current.get(barTime)!;
      const existing = lvlMap.get(priceLevel) ?? { bid: 0, ask: 0 };
      lvlMap.set(priceLevel, {
        bid: existing.bid + (tick.side === "sell" ? tick.size : 0),
        ask: existing.ask + (tick.side === "buy"  ? tick.size : 0),
      });
    });
    // Keep only last 200 bars in memory
    if (tickAccRef.current.size > 200) {
      const oldest = [...tickAccRef.current.keys()].sort()[0];
      tickAccRef.current.delete(oldest);
    }
  }, [recentTicks, timeframe, base]);

  /* ── Countdown timer ─────────────────────────────────── */
  useEffect(() => {
    const sec = getIntervalSec(timeframe);

    const tick = () => {
      const now       = Date.now() / 1000;
      const barStart  = Math.floor(now / sec) * sec;
      const barEnd    = barStart + sec;
      const remaining = barEnd - now;
      setCountdown(formatCountdown(remaining, sec));
      setCloseFlash(remaining <= 5 && remaining > 0);
    };

    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [timeframe]);

  /* ── Bootstrap chart ─────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    const buildId = Date.now(); // unique ID per effect run
    (chartRef as any).__buildId = buildId;

    (async () => {
      const LW = await import("lightweight-charts");
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
        layout: {
          background:       { color: chartSettings?.background ?? "#0B0E1A" },
          textColor:        "#8896BE",
          fontFamily:       "'JetBrains Mono', monospace",
          fontSize:         13,
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
          scaleMargins: { top: 0.08, bottom: 0.25 },
          autoScale:    true,
        },
        timeScale: {
          borderColor:                  "#263050",
          timeVisible:                  true,
          secondsVisible:               intervalSec < 60,
          rightOffset:                  5,
          barSpacing:                   12,
          shiftVisibleRangeOnNewBar:    true,
          lockVisibleTimeRangeOnResize: false,
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
        handleScale:  { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
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
      const barCount = ["D"].includes(timeframe) ? 1300
                     : ["W"].includes(timeframe) ? 600
                     : ["M","3M","6M","1Y","3Y","5Y"].includes(timeframe) ? 400
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
      const yahooData    = (exchangeData || alpacaData || fhDirectData) ? null : await fetchYahooCandles(symbol, timeframe, barCount);
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

      const data = candleData ?? generateCandles(300, syntheticBase, intervalSec);
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
        cs = chart.addLineSeries({
          color:            "#4FA3E0",
          lineWidth:        2,
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          lastValueVisible: true,
        });
        cs.setData(displayData.map(b => ({ time: b.time, value: b.close } as any)));
      } else if (isArea) {
        cs = chart.addAreaSeries({
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
        cs = chart.addBaselineSeries({
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
        cs = chart.addBarSeries({
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
        cs = chart.addBarSeries({
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
        cs = chart.addCandlestickSeries({
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
        cs = chart.addCandlestickSeries({
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
        cs = chart.addCandlestickSeries({
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
        cs = chart.addCandlestickSeries({
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
        cs = chart.addCandlestickSeries({
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
        // LWC requires strictly-increasing unique times — bump duplicates forward
        let lastT = -Infinity;
        const renkoClean = renkoData.map(r => {
          let t = r.time as number;
          if (t <= lastT) t = lastT + 0.001;
          lastT = t;
          return { ...r, time: t };
        });
        cs = chart.addCandlestickSeries({
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
        // ensure strictly-increasing unique timestamps
        let lastRT = -Infinity;
        const rbClean = rbData.map(r => {
          let t = r.time as number;
          if (t <= lastRT) t = lastRT + 0.001;
          lastRT = t;
          return { ...r, time: t };
        });
        cs = chart.addCandlestickSeries({
          upColor: upC, downColor: downC, borderUpColor: upC, borderDownColor: downC,
          wickUpColor: upC, wickDownColor: downC, borderVisible: true,
          priceLineVisible: true, priceLineColor: "#F0B429", lastValueVisible: true,
        });
        if (rbClean.length) cs.setData(rbClean as any);
      } else if (isComingSoon) {
        // 3-Line Break / Kagi / Point & Figure — render as line for now with label
        cs = chart.addLineSeries({
          color: "#8B5CF6", lineWidth: 2,
          priceLineVisible: true, priceLineColor: "#F0B429", lastValueVisible: true,
        });
        cs.setData(displayData.map(b => ({ time: b.time, value: b.close } as any)));
      } else {
        // Standard candles (default + Heikin Ashi) — Deep Charts color scheme
        cs = chart.addCandlestickSeries({
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
      const vs = chart.addHistogramSeries({
        priceFormat:  { type: "volume" },
        priceScaleId: "vol",
      });
      chart.priceScale("vol").applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 },
        borderColor:  "transparent",
      });

      const volUp   = chartSettings?.neon ? "rgba(0,255,163,0.55)" : "rgba(0,212,170,0.20)";
      const volDown = chartSettings?.neon ? "rgba(255,46,99,0.55)"  : "rgba(255,77,106,0.20)";
      vs.setData(data.map(c => ({
        time:  c.time,
        value: c.volume,
        color: c.close >= c.open ? volUp : volDown,
      })) as any);

      // Show ~40 bars by default — gives ~22px/bar on 900px canvas, footprint cells visible
      try {
        chart.timeScale().setVisibleLogicalRange({
          from: Math.max(0, data.length - 40),
          to:   data.length + 3,
        });
      } catch {
        try {
          chart.timeScale().fitContent();
        } catch {}
      }

      chartRef.current  = chart;
      candleRef.current = cs;
      volRef.current    = vs;
      barsRef.current   = data;

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
  }, [symbol, timeframe, candleType]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // CRITICAL: the data provider's last/forming candle may carry an intraday
    // timestamp AHEAD of our computed bar-boundary (e.g. Yahoo's current 30m bar
    // is stamped 00:08, not 00:00). If we call series.update() with a time that's
    // BEHIND the last bar, LWC throws and the price silently never updates → frozen.
    // So: if our live time isn't strictly after the last bar, fold the live price
    // INTO the last bar (update its high/low/close), keeping a valid ascending time.
    let bar: Bar;
    let t = Math.floor(liveBar.time);
    if (lastBar && t <= lastBar.time) {
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

    try {
      candleRef.current.update(bar as any);
      volRef.current.update({
        time:  bar.time,
        value: bar.volume,
        color: bar.close >= bar.open
          ? (chartSettings?.neon ? "rgba(0,255,163,0.55)" : "rgba(0,212,170,0.20)")
          : (chartSettings?.neon ? "rgba(255,46,99,0.55)"  : "rgba(255,77,106,0.20)"),
      } as any);
    } catch {
      // last-resort: if update still rejects, force the price onto the visible
      // last candle so the chart never stays frozen
      try {
        if (lastBar) candleRef.current.update({ ...lastBar, close: price, high: Math.max(lastBar.high, price), low: Math.min(lastBar.low, price) } as any);
      } catch {}
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

    // Generate order-flow bubble (~40% of ticks)
    if (Math.random() > 0.60) {
      const side      = bar.close > bar.open ? "buy" : "sell";
      const range     = bar.high - bar.low;
      const bubbleVol = Math.floor(bar.volume * (0.25 + Math.random() * 0.55));
      // Place bubble INSIDE the candle body at a realistic price level
      const price = side === "buy"
        ? bar.low  + range * (0.15 + Math.random() * 0.35)
        : bar.high - range * (0.15 + Math.random() * 0.35);
      setBubbles(prev => [{ price, vol: bubbleVol, side, time: bar.time }, ...prev.slice(0, 15)]);
    }
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
    if (!ready || !chartRef.current || !pineOutput) return;

    (async () => {
      const LW = await import("lightweight-charts");

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
          series = chart.addHistogramSeries({ color: plot.color, priceScaleId: scaleId });
        } else {
          series = chart.addLineSeries({
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
        const hs = chart.addLineSeries({
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
    })();

    // Return cleanup so Strict Mode double-fire doesn't orphan Pine series
    return () => {
      pineSeriesRef.current.forEach(series => {
        try { chartRef.current?.removeSeries(series); } catch {}
      });
      pineSeriesRef.current.clear();
    };
  }, [pineOutput, ready]);

  /* ── Render indicator overlays ─────────────────────────── */
  useEffect(() => {
    if (!ready || !chartRef.current || !barsRef.current?.length) return;
    const chart = chartRef.current;
    const bars  = barsRef.current as IND.Bar[];

    // Remove previous indicator series
    indSeriesRef.current.forEach(s => { try { chart.removeSeries(s); } catch {} });
    indSeriesRef.current = [];

    const closes = bars.map(b => b.close);
    const inds   = activeInds ?? new Set<string>();
    // Per-indicator custom params (length / mult / color) merged with defaults
    const ip = (name: string) => resolveParams(name, indSettings);

    // Helper: overlay line on main price scale
    const addLine = (vals: number[], color: string, width = 1, style = 0, lastVal = false) => {
      try {
        const s = chart.addLineSeries({ color, lineWidth: width, lineStyle: style, priceLineVisible: false, lastValueVisible: lastVal, crosshairMarkerVisible: false });
        s.setData(bars.map((b, i) => ({ time: b.time as any, value: vals[i] })).filter(d => isFinite(d.value)));
        indSeriesRef.current.push(s);
        return s;
      } catch { return null; }
    };

    // Helper: histogram on main scale
    const addHist = (vals: number[], color: string) => {
      try {
        const s = chart.addHistogramSeries({ color, priceLineVisible: false, lastValueVisible: false });
        s.setData(bars.map((b, i) => ({ time: b.time as any, value: vals[i] })).filter(d => isFinite(d.value)));
        indSeriesRef.current.push(s);
        return s;
      } catch { return null; }
    };

    // Helper: sub-pane oscillator — each unique oscillator gets its OWN stacked
    // band at the BOTTOM (TradingView-style), above the volume zone, so RSI /
    // Stoch RSI / CVD / MACD don't pile on top of each other or the candles.
    const oscSlotMap = new Map<string, number>();
    const oscMargins = new Map<string, { top: number; bottom: number }>();
    let oscNext = 0;
    const VOL_ZONE = 0.18;   // bottom 18% reserved for volume bars
    const PANE_H   = 0.15;   // each oscillator pane height
    const setupScale = (id: string, _top?: number, _bot?: number) => {
      let slot = oscSlotMap.get(id);
      if (slot === undefined) { slot = oscNext++; oscSlotMap.set(id, slot); }
      const bottom = Math.min(0.7, VOL_ZONE + slot * PANE_H);
      const top    = Math.max(0.26, 1 - VOL_ZONE - (slot + 1) * PANE_H);
      oscMargins.set(id, { top, bottom });
      // The price scale may not exist until a series is attached to it, so this
      // first attempt can no-op. applyMargins() re-applies after the series is
      // created (in addOsc/addOscHist) — that's what actually makes it stick.
      try { chart.priceScale(id).applyOptions({ scaleMargins: { top, bottom }, borderColor: "transparent" }); } catch {}
    };
    // Re-apply the stored bottom-pane margins once the scale truly exists.
    const applyMargins = (id: string) => {
      const m = oscMargins.get(id);
      if (!m) return;
      try { chart.priceScale(id).applyOptions({ scaleMargins: m, borderColor: "transparent" }); } catch {}
    };
    const addOsc = (vals: number[], color: string, scaleId: string, width = 1) => {
      try {
        const s = chart.addLineSeries({ color, lineWidth: width, priceScaleId: scaleId, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
        s.setData(bars.map((b, i) => ({ time: b.time as any, value: vals[i] })).filter(d => isFinite(d.value)));
        indSeriesRef.current.push(s);
        applyMargins(scaleId);   // ← scale now exists → margins stick (fixes RSI/etc. sprawling over candles)
        return s;
      } catch { return null; }
    };
    const addOscHist = (vals: number[], colors: string[] | string, scaleId: string) => {
      try {
        const s = chart.addHistogramSeries({ priceScaleId: scaleId, priceLineVisible: false, lastValueVisible: false });
        s.setData(bars.map((b, i) => ({ time: b.time as any, value: vals[i], color: Array.isArray(colors) ? colors[i] : colors })).filter(d => isFinite(d.value)));
        indSeriesRef.current.push(s);
        applyMargins(scaleId);
        return s;
      } catch { return null; }
    };
    const refLine = (val: number, scaleId: string, color: string) => addOsc(bars.map(() => val), color, scaleId, 1);

    // Skip indicators requiring external data feeds
    const skip = (name: string) => IND.REQUIRES_FEED.has(name) || IND.MTF_INDICATORS.has(name);

    // ── VWAP ─────────────────────────────────────────────────
    if (inds.has("VWAP") || inds.has("VWAP Bands")) {
      const vwapVals = IND.vwap(bars);
      addLine(vwapVals, ip("VWAP").color ?? "#F0B429", 2);
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
        addLine(s1u, "rgba(240,180,41,0.5)", 1); addLine(s1d, "rgba(240,180,41,0.5)", 1);
        addLine(s2u, "rgba(240,180,41,0.3)", 1); addLine(s2d, "rgba(240,180,41,0.3)", 1);
      }
    }

    if (inds.has("Anchored VWAP")) addLine(IND.anchoredVwap(bars, 0), "#FFD700", 1, 2);
    if (inds.has("VWAP Deviation Bands")) {
      const v = IND.vwap(bars);
      addLine(v, "#F0B429", 1);
      const sd = IND.stdDev(closes, 20);
      addLine(v.map((val, i) => val + sd[i]), "rgba(240,180,41,0.4)", 1);
      addLine(v.map((val, i) => val - sd[i]), "rgba(240,180,41,0.4)", 1);
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
      addLine(fn(closes, cp.length ?? p), cp.color ?? c, 1);
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
    if (inds.has("RSI")) {
      const cp = ip("RSI");
      setupScale("rsi", 0.75, 0.05);
      addOsc(IND.rsi(closes, cp.length ?? 14), cp.color ?? "#8B5CF6", "rsi", 2);
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
    if (inds.has("CVD"))              { setupScale("cvd"); addOscHist(IND.cvd(bars), bars.map(b => b.close >= b.open ? "rgba(0,192,118,0.7)" : "rgba(255,77,103,0.7)"), "cvd"); }
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
          const s = chart.addLineSeries({ color: g.bull ? "#26a69a" : "#ef5350", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          s.setData([{ time: bars[idx].time as any, value: g.top }, ...bars.slice(idx).map(b => ({ time: b.time as any, value: g.top }))]);
          indSeriesRef.current.push(s);
          const s2 = chart.addLineSeries({ color: g.bull ? "#26a69a" : "#ef5350", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          s2.setData([{ time: bars[idx].time as any, value: g.bot }, ...bars.slice(idx).map(b => ({ time: b.time as any, value: g.bot }))]);
          indSeriesRef.current.push(s2);
        });
      } catch {}
    }
    if (inds.has("Swing High/Low")) {
      const swings = IND.swingHighLow(bars);
      swings.highs.forEach(h => {
        const s = chart.addLineSeries({ color: "#ef5350", lineWidth: 1, lineStyle: 3, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
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
      const sotVals = bars.map(b => {
        // Use volume-weighted directional proxy: bull bar = positive, bear = negative
        const dir = b.close >= b.open ? 1 : -1;
        // Faster bars (more movement per unit time) get higher score
        const range = b.high - b.low;
        const speed = range > 0 ? (b.volume / Math.max(1, range)) * dir : 0;
        return speed;
      });
      // Normalize to -100..100 range
      const absMax = Math.max(...sotVals.map(Math.abs), 1);
      const normalized = sotVals.map(v => (v / absMax) * 100);
      addOscHist(normalized, normalized.map(v => v >= 0 ? "rgba(0,229,204,0.75)" : "rgba(123,108,247,0.75)"), "sot");
      refLine(0, "sot", "rgba(255,255,255,0.10)");
    }

    // ── Absorption Detector ────────────────────────────────────
    // Detects when price has high volume but tiny range — large orders
    // absorbing the opposing side. Shown as a histogram where high = strong absorption.
    if (inds.has("Absorption Detector")) {
      setupScale("abs", 0.75);
      const avgVol = bars.reduce((s, b) => s + b.volume, 0) / Math.max(1, bars.length);
      const absVals = bars.map(b => {
        const range = b.high - b.low;
        if (range === 0) return 0;
        // High volume + low range = high absorption score
        const volRatio = b.volume / Math.max(1, avgVol);
        // Normalize by bar range (pip-based normalization)
        const priceDev = range / Math.max(0.01, b.close * 0.001);
        const score = volRatio / Math.max(1, priceDev);
        return Math.min(100, score * 30);
      });
      // Bull absorption (volume absorbed at support) vs bear absorption
      const colors = bars.map((b, i) =>
        absVals[i] > 50
          ? (b.close >= b.open ? "rgba(0,229,204,0.85)" : "rgba(123,108,247,0.85)")
          : "rgba(100,120,160,0.35)"
      );
      addOscHist(absVals, colors, "abs");
      refLine(50, "abs", "rgba(240,180,41,0.30)");
    }

    // ── Delta Bars (order flow coloring via existing footprint) ─
    if (inds.has("Delta Bars")) {
      setupScale("deltabars", 0.75);
      // Net delta per bar as a histogram
      const deltas = bars.map(b => {
        const dir = b.close >= b.open ? 1 : -1;
        return b.volume * dir * (Math.abs(b.close - b.open) / Math.max(0.01, b.high - b.low));
      });
      const absMaxD = Math.max(...deltas.map(Math.abs), 1);
      const norm = deltas.map(v => (v / absMaxD) * 100);
      addOscHist(norm, norm.map(v => v >= 0 ? "rgba(64,196,255,0.75)" : "rgba(244,143,177,0.75)"), "deltabars");
      refLine(0, "deltabars", "rgba(255,255,255,0.10)");
    }

    // ── Volume Histogram ─────────────────────────────────────
    if (inds.has("Volume")) {
      setupScale("vol_hist", 0.80);
      const volVals = bars.map(b => b.volume);
      addOscHist(volVals, bars.map(b => b.close >= b.open ? "rgba(0,229,204,0.65)" : "rgba(206,147,216,0.65)"), "vol_hist");
    }

    // ── Volume Delta (alias to Delta Bars) ───────────────────
    if (inds.has("Volume Delta")) {
      setupScale("voldelta", 0.75);
      const deltas = bars.map(b => {
        const dir = b.close >= b.open ? 1 : -1;
        return b.volume * dir * (Math.abs(b.close - b.open) / Math.max(0.01, b.high - b.low));
      });
      const absMaxD = Math.max(...deltas.map(Math.abs), 1);
      const norm = deltas.map(v => (v / absMaxD) * 100);
      addOscHist(norm, norm.map(v => v >= 0 ? "rgba(64,196,255,0.75)" : "rgba(244,143,177,0.75)"), "voldelta");
      refLine(0, "voldelta", "rgba(255,255,255,0.10)");
    }

    // ── Trade Flow (directional volume flow) ─────────────────
    if (inds.has("Trade Flow")) {
      setupScale("tradeflow", 0.75);
      const flow = bars.map(b => b.volume * (b.close >= b.open ? 1 : -1));
      const absMaxF = Math.max(...flow.map(Math.abs), 1);
      const normFlow = flow.map(v => (v / absMaxF) * 100);
      addOscHist(normFlow, normFlow.map(v => v >= 0 ? "rgba(0,229,204,0.70)" : "rgba(206,147,216,0.70)"), "tradeflow");
      refLine(0, "tradeflow", "rgba(255,255,255,0.10)");
    }

    // ── Tape Speed (alias to Speed of Tape calculation) ──────
    if (inds.has("Tape Speed")) {
      setupScale("tapespeed", 0.75);
      const tsVals = bars.map(b => {
        const dir = b.close >= b.open ? 1 : -1;
        const range = b.high - b.low;
        return range > 0 ? (b.volume / Math.max(1, range)) * dir : 0;
      });
      const absMaxT = Math.max(...tsVals.map(Math.abs), 1);
      const normT = tsVals.map(v => (v / absMaxT) * 100);
      addOscHist(normT, normT.map(v => v >= 0 ? "rgba(0,229,204,0.70)" : "rgba(206,147,216,0.70)"), "tapespeed");
      refLine(0, "tapespeed", "rgba(255,255,255,0.10)");
    }

    // ── Buy/Sell Volume Columns ──────────────────────────────
    if (inds.has("Buy/Sell Volume Columns")) {
      setupScale("bsvol", 0.80);
      const buyVol  = bars.map(b => b.close >= b.open ? b.volume : 0);
      const sellVol = bars.map(b => b.close < b.open ? -b.volume : 0);
      addOscHist(buyVol, "rgba(0,229,204,0.65)", "bsvol");
      addOscHist(sellVol, "rgba(206,147,216,0.65)", "bsvol");
      refLine(0, "bsvol", "rgba(255,255,255,0.10)");
    }

    // ── Exhaustion Detector ──────────────────────────────────
    // High volume + small price move = buying/selling exhaustion
    if (inds.has("Exhaustion Detector")) {
      setupScale("exhaust", 0.78);
      const avgVol = bars.reduce((s, b) => s + b.volume, 0) / Math.max(1, bars.length);
      const avgRange = bars.reduce((s, b) => s + (b.high - b.low), 0) / Math.max(1, bars.length);
      const exVals = bars.map(b => {
        const volRatio = b.volume / Math.max(1, avgVol);
        const rangeRatio = (b.high - b.low) / Math.max(0.0001, avgRange);
        // High volume + small range = exhaustion
        return volRatio > 1.5 && rangeRatio < 0.7 ? volRatio * (1.5 - rangeRatio) * 30 : 0;
      });
      addOscHist(exVals, bars.map((b, i) => exVals[i] > 0
        ? (b.close >= b.open ? "rgba(0,229,204,0.80)" : "rgba(206,147,216,0.80)")
        : "rgba(100,100,120,0.20)"), "exhaust");
      refLine(30, "exhaust", "rgba(240,180,41,0.25)");
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
            const vs = chart.addLineSeries({ color: "rgba(100,120,160,0.25)", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
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
          const s = chart.addLineSeries({ color, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
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
          const sT = chart.addLineSeries({ color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          sT.setData(slice.map(bb => ({ time: bb.time as any, value: ob.top })));
          indSeriesRef.current.push(sT);
          const sB = chart.addLineSeries({ color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          sB.setData(slice.map(bb => ({ time: bb.time as any, value: ob.bot })));
          indSeriesRef.current.push(sB);
        });
      } catch {}
    }

    // ── Candle Pattern Detectors — use setMarkers for efficiency ─
    // Collect all patterns into a single markers array then apply once
    {
      const patternMarkers: { time: any; position: "aboveBar" | "belowBar"; color: string; shape: "circle" | "arrowUp" | "arrowDown"; text: string; size: number }[] = [];
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
      });
      if (patternMarkers.length > 0 && candleRef.current) {
        try { candleRef.current.setMarkers(patternMarkers.sort((a, b) => a.time - b.time)); } catch {}
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
          const s = chart.addLineSeries({ color: "rgba(240,180,41,0.60)", lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          const slice = bars.slice(ev.idx);
          if (slice.length < 2) return;
          s.setData(slice.map(bb => ({ time: bb.time as any, value: ev.price })));
          indSeriesRef.current.push(s);
        });
      } catch {}
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
                const s = chart.addLineSeries({ color, lineWidth: 2, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
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
          const sTop = chart.addLineSeries({ color: borderColor, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          sTop.setData(bars.map(b => ({ time: b.time as any, value: top })));
          indSeriesRef.current.push(sTop);
          // Bot border line
          const sBot = chart.addLineSeries({ color: borderColor, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
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
            const sT = chart.addLineSeries({ color: border, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            sT.setData(slice.slice(i).map(bb => ({ time: bb.time as any, value: top })));
            indSeriesRef.current.push(sT);
            const sB = chart.addLineSeries({ color: border, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            sB.setData(slice.slice(i).map(bb => ({ time: bb.time as any, value: bot })));
            indSeriesRef.current.push(sB);
          }
          if (isLow && zoneHeight > 0) {
            // Demand zone — teal box just above the low
            const top = b.low + zoneHeight;
            const bot = b.low;
            const border = "rgba(105,255,218,0.55)";
            const sT = chart.addLineSeries({ color: border, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            sT.setData(slice.slice(i).map(bb => ({ time: bb.time as any, value: top })));
            indSeriesRef.current.push(sT);
            const sB = chart.addLineSeries({ color: border, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            sB.setData(slice.slice(i).map(bb => ({ time: bb.time as any, value: bot })));
            indSeriesRef.current.push(sB);
          }
        });
      } catch {}
    }

    // ── Reserve candle space for the oscillator stack (TradingView-style) ──
    // In LWC v4's single pane, non-overlapping bottom panes require the main
    // candle area to make room below it. Push the candle scale's bottom margin
    // down by however many oscillator panes are active so they never overlap the
    // candles. When no oscillators are active, restore the default.
    try {
      const candleBottom = oscNext > 0 ? Math.min(0.72, VOL_ZONE + oscNext * PANE_H) : 0.25;
      chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.06, bottom: candleBottom } });
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
      alertLevels.forEach(price => {
        try {
          const s = chart.addLineSeries({
            color: "#F5A623",
            lineWidth: 1,
            lineStyle: LW.LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: true,
          });
          s.setData(bars.map(b => ({ time: b.time as any, value: price })));
          alertSeriesRef.current.push(s);
        } catch {}
      });
    })();
  }, [alertLevels, ready]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const getBarFootprint = useCallback((bar: Bar, numLevels: number): Array<{
    priceLevel: number; bid: number; ask: number; total: number;
    relPos: number; inBody: boolean;
  }> => {
    const minTick  = base > 10_000 ? 0.25 : base > 1_000 ? 0.25 : base > 100 ? 0.01 : 0.0001;
    const range    = bar.high - bar.low;
    if (range <= 0) return [];
    const step     = Math.max(minTick, range / numLevels);
    const isBull   = bar.close >= bar.open;
    const bodyLow  = Math.min(bar.open, bar.close);
    const bodyHigh = Math.max(bar.open, bar.close);
    const dp       = base > 100 ? 2 : 4;

    // Check if we have real accumulated tick data for this bar
    const realData = tickAccRef.current.get(bar.time);
    const levels: Array<{ priceLevel: number; bid: number; ask: number; total: number; relPos: number; inBody: boolean }> = [];

    for (let i = 0; i < numLevels; i++) {
      const priceLevel = +(bar.low + i * step).toFixed(dp);
      const relPos     = i / Math.max(1, numLevels - 1); // 0=low, 1=high
      const inBody     = priceLevel >= bodyLow && priceLevel <= bodyHigh;
      const nearOpen   = Math.abs(priceLevel - bar.open)  / (range + 0.001) < 0.07;
      const nearClose  = Math.abs(priceLevel - bar.close) / (range + 0.001) < 0.07;
      const nearMid    = Math.abs(relPos - 0.5) < 0.12;

      if (realData) {
        // Use real tick data — find closest price level
        const key = Math.round(priceLevel / minTick) * minTick;
        const rt  = realData.get(+(key.toFixed(dp)));
        if (rt && (rt.bid + rt.ask) > 0) {
          levels.push({ priceLevel, bid: rt.bid, ask: rt.ask, total: rt.bid + rt.ask, relPos, inBody });
          continue;
        }
      }

      // Deterministic simulation from bar structure
      // Volume distribution: concentrated in body, at open/close, sparse at extremes
      const baseVol = Math.max(1, bar.volume / numLevels);
      let volMult   = 0.5;
      if (inBody)               volMult += 2.0;
      if (nearOpen || nearClose) volMult += 1.2;
      if (nearMid)               volMult += 0.6;
      if (relPos < 0.04 || relPos > 0.96) volMult *= 0.2; // very sparse at extremes

      // Seeded random per (bar, level) — consistent across renders
      const s1   = Math.sin(bar.time * 0.01337 + i * 19.13) * 43758.5453;
      const rnd1 = s1 - Math.floor(s1);
      const s2   = Math.sin(bar.time * 0.00731 + i * 7.41 + bar.volume * 0.001) * 12345.6789;
      const rnd2 = s2 - Math.floor(s2);

      const totalVol = Math.max(1, Math.floor(baseVol * volMult * (0.7 + rnd1 * 0.6)));

      // Bid/ask split: bull candles have more ask volume (buyers aggressive),
      // bear candles have more bid volume (sellers aggressive)
      // Convention: ask = buyer-initiated, bid = seller-initiated
      let askPct = isBull ? 0.52 + rnd2 * 0.18 : 0.38 + rnd2 * 0.18;
      // Body levels reinforce direction; wick levels more balanced
      if (inBody) askPct = isBull ? askPct + 0.08 : askPct - 0.08;
      askPct = Math.max(0.1, Math.min(0.9, askPct));

      const ask = Math.floor(totalVol * askPct);
      const bid = totalVol - ask;
      levels.push({ priceLevel, bid, ask, total: totalVol, relPos, inBody });
    }

    return levels;
  }, [base]);

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

    const draw = () => {
      // Use the canvas's own parent (the position:relative wrapper) for dimensions
      const parent = canvas.parentElement;
      const W = parent ? parent.offsetWidth  : cont.offsetWidth;
      const H = parent ? parent.offsetHeight : cont.offsetHeight;
      if (!W || !H) return;

      const dpr = window.devicePixelRatio || 1;
      // Always sync canvas pixel size to container
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width  = W + "px";
      canvas.style.height = H + "px";

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

      let bsp = 12;
      try { bsp = chart.timeScale().options().barSpacing ?? 12; } catch {}

      // TV Lightweight Charts candle body width = barSpacing * 0.7 (matches TV internal formula)
      const colW  = Math.max(4, Math.floor(bsp * 0.70));
      const halfW = Math.floor(colW / 2);
      // Show numbers at practical zoom levels:
      // showText  = at least 1 number fits (column ≥14px)
      // showSplit = both bid AND ask fit side-by-side (column ≥26px)
      const showText   = colW >= 14;
      const showSplit  = colW >= 26;
      const showBadges = bsp >= 14;
      const fmtV  = (v: number) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M`
                                  : v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`;

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
         FOOTPRINT MODES — all draw at full candle height (high→low)
         so they're visible at any zoom level
      ═══════════════════════════════════════════════════════ */

      // Order Flow Candles forces bid-ask footprint regardless of setting.
      // When footprint is disabled, resolve to a non-matching mode so NO footprint
      // block renders — but the VP overlay further below still draws.
      const effectiveFP: FootprintType = !footprintEnabled
        ? ("__off__" as FootprintType)
        : (candleType === "orderflow-candles" ? "bid-ask" : footprintType);

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

          const borderColor = isBull ? "rgba(0,229,204,0.90)" : "rgba(123,108,247,0.90)";
          const borderColorDim = isBull ? "rgba(0,229,204,0.50)" : "rgba(123,108,247,0.50)";

          // Min 8px per row ensures every footprint row is clearly readable
          const maxLev = bsp >= 20 ? 8 : bsp >= 10 ? 5 : 3;
          const numLevels = Math.max(1, Math.min(maxLev, Math.floor(fullH / 8)));
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
                ? `rgba(0,229,204,${alpha})`
                : `rgba(123,108,247,${alpha})`;
              ctx.fillRect(x, rowY, colW, rH);
            }

            // Row divider
            if (li > 0 && rH >= 3) {
              ctx.fillStyle = "rgba(0,0,0,0.35)";
              ctx.fillRect(x, rowY, colW, 1);
            }

            // Numbers: bid left + ask right (split), or dominant centered (narrow)
            if (showText && rH >= 8) {
              const fs   = Math.max(8, Math.min(13, Math.floor(rH * 0.55)));
              const midY = rowY + rH / 2;
              ctx.textBaseline = "middle";
              if (showSplit) {
                ctx.font = `600 ${fs}px 'JetBrains Mono',monospace`;
                const bidBright = !askDom && ratio >= 1.3;
                ctx.fillStyle = bidBright ? "#D4BAFF" : "rgba(200,210,230,0.65)";
                ctx.textAlign = "left";
                ctx.fillText(fmtV(lv.bid), x + 2, midY);
                const askBright = askDom && ratio >= 1.3;
                ctx.fillStyle = askBright ? "#80FFEC" : "rgba(200,210,230,0.65)";
                ctx.textAlign = "right";
                ctx.fillText(fmtV(lv.ask), x + colW - 2, midY);
              } else {
                // narrow bar — show dominant side centered
                const domVal  = askDom ? lv.ask : lv.bid;
                ctx.font = `bold ${fs}px 'JetBrains Mono',monospace`;
                ctx.fillStyle = askDom ? "rgba(0,229,204,0.95)" : "rgba(180,150,255,0.95)";
                ctx.textAlign = "center";
                ctx.fillText(fmtV(domVal), cx, midY);
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
            ctx.fillStyle = isPos ? "rgba(0,229,204,0.92)" : "rgba(123,108,247,0.92)";
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
          const maxLev = bsp >= 20 ? 8 : bsp >= 10 ? 5 : 3;
          const numLevels = Math.max(1, Math.min(maxLev, Math.floor(fullH / 8)));
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
                ? `rgba(64,196,255,${intensity})`   // blue — buying pressure
                : `rgba(244,143,177,${intensity})`;  // red — selling pressure
              ctx.fillRect(cx - halfW, rowY, colW, rH);
            }

            // Row divider
            if (li > 0 && rH >= 3) {
              ctx.fillStyle = "rgba(0,0,0,0.30)";
              ctx.fillRect(cx - halfW, rowY, colW, 1);
            }

            if (showText && rH >= 8) {
              const fs = Math.max(8, Math.min(13, Math.floor(rH * 0.55)));
              ctx.textBaseline = "middle";
              const midY = rowY + rH / 2;
              if (showSplit) {
                ctx.font = `600 ${fs}px 'JetBrains Mono',monospace`;
                ctx.fillStyle = delta < 0 ? "#D4BAFF" : "rgba(200,210,230,0.55)";
                ctx.textAlign = "left";
                ctx.fillText(fmtV(lv.bid), cx - halfW + 2, midY);
                ctx.fillStyle = delta >= 0 ? "#80FFEC" : "rgba(200,210,230,0.55)";
                ctx.textAlign = "right";
                ctx.fillText(fmtV(lv.ask), cx + halfW - 2, midY);
              } else {
                const dVal = lv.ask - lv.bid;
                ctx.font = `bold ${fs}px 'JetBrains Mono',monospace`;
                ctx.fillStyle = dVal >= 0 ? "rgba(0,229,204,0.95)" : "rgba(180,150,255,0.95)";
                ctx.textAlign = "center";
                ctx.fillText((dVal >= 0 ? "+" : "") + fmtV(Math.abs(dVal)), cx, midY);
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
            const bColor = isPos ? "rgba(64,196,255,0.92)" : "rgba(244,143,177,0.92)";
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
          const maxLev = bsp >= 20 ? 8 : bsp >= 10 ? 5 : 3;
          const numLevels = Math.max(1, Math.min(maxLev, Math.floor(fullH / 8)));
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
            ctx.fillStyle = `rgba(0,229,204,${alpha.toFixed(2)})`;
            ctx.fillRect(cx - askW, rowY, askW, rH);
            // Bid bars grow right from center (purple)
            ctx.fillStyle = `rgba(123,108,247,${alpha.toFixed(2)})`;
            ctx.fillRect(cx, rowY, bidW, rH);

            // Row divider
            if (li > 0 && rH >= 3) {
              ctx.fillStyle = "rgba(0,0,0,0.30)";
              ctx.fillRect(cx - halfW, rowY, colW, 1);
            }

            if (showText && rH >= 8) {
              const fs = Math.max(8, Math.min(13, Math.floor(rH * 0.55)));
              ctx.textBaseline = "middle";
              const midY = rowY + rH / 2;
              if (showSplit) {
                ctx.font = `600 ${fs}px 'JetBrains Mono',monospace`;
                ctx.fillStyle = "rgba(80,220,160,0.90)"; ctx.textAlign = "right";
                ctx.fillText(fmtV(lv.ask), cx - 2, midY);
                ctx.fillStyle = "rgba(190,130,255,0.90)"; ctx.textAlign = "left";
                ctx.fillText(fmtV(lv.bid), cx + 2, midY);
              } else {
                ctx.font = `bold ${fs}px 'JetBrains Mono',monospace`;
                ctx.fillStyle = "rgba(240,180,41,0.90)"; ctx.textAlign = "center";
                ctx.fillText(fmtV(lv.total), cx, midY);
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
          const maxLev2 = bsp >= 20 ? 8 : bsp >= 10 ? 5 : 3;
          const numLev = Math.max(1, Math.min(maxLev2, Math.floor(fullH / 8)));
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
            ctx.fillStyle = askDom ? `rgba(0,229,204,${alpha})` : `rgba(206,147,216,${alpha})`;
            ctx.fillRect(x, rowY, colW, rH);

            if (showText && rH >= 8) {
              const fs = Math.max(8, Math.min(13, Math.floor(rH * 0.55)));
              const midY = rowY + rH / 2;
              ctx.textBaseline = "middle";
              if (showSplit) {
                ctx.font = `bold ${fs}px monospace`;
                ctx.fillStyle = "#80FFEC"; ctx.textAlign = "left";
                ctx.fillText(fmtV(lv.ask), x + 2, midY);
                ctx.fillStyle = "#D4BAFF"; ctx.textAlign = "right";
                ctx.fillText(fmtV(lv.bid), x + colW - 2, midY);
              } else {
                ctx.font = `bold ${fs}px monospace`;
                ctx.fillStyle = askDom ? "rgba(0,229,204,0.95)" : "rgba(180,150,255,0.95)";
                ctx.textAlign = "center";
                ctx.fillText(`${ratio.toFixed(1)}×`, cx, midY);
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
              ctx.fillStyle = totAsk > totBid ? "rgba(0,229,204,0.90)" : "rgba(206,147,216,0.90)";
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
          const maxLev2 = bsp >= 20 ? 8 : bsp >= 10 ? 5 : 3;
          const numLev = Math.max(1, Math.min(maxLev2, Math.floor(fullH / 8)));
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

            const askDom  = lv.ask > lv.bid;
            const dominant = Math.max(lv.ask, lv.bid);
            const passive  = Math.min(lv.ask, lv.bid);
            const ratio    = dominant / Math.max(1, passive);

            // Only paint rows where aggression is meaningful (≥1.5×)
            if (ratio < 1.5) return;

            const alpha = Math.min(0.80, 0.30 + (ratio - 1.5) * 0.12);
            ctx.fillStyle = askDom ? `rgba(0,229,204,${alpha})` : `rgba(206,147,216,${alpha})`;
            ctx.fillRect(x, rowY, colW, rH);

            if (showText && rH >= 8) {
              const fs  = Math.max(8, Math.min(13, Math.floor(rH * 0.55)));
              const midY = rowY + rH / 2;
              ctx.textBaseline = "middle";
              if (showSplit) {
                ctx.font = `bold ${fs}px monospace`;
                ctx.fillStyle = askDom ? "#80FFEC" : "#D4BAFF"; ctx.textAlign = "left";
                ctx.fillText(fmtV(lv.ask), x + 2, midY);
                ctx.fillStyle = "rgba(200,210,230,0.55)"; ctx.textAlign = "right";
                ctx.fillText(fmtV(lv.bid), x + colW - 2, midY);
              } else {
                ctx.font = `bold ${fs}px monospace`;
                ctx.fillStyle = askDom ? "rgba(0,229,204,0.95)" : "rgba(180,150,255,0.95)";
                ctx.textAlign = "center";
                ctx.fillText(fmtV(Math.max(lv.ask, lv.bid)), cx, midY);
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

          if (showBadges) {
            const netDelta = levels.reduce((s, l) => s + l.ask - l.bid, 0);
            const isAgg    = netDelta >= 0;
            // "AGG" = net aggressive buying, "PSV" = net passive (selling pressure absorbed)
            const dLbl     = (isAgg ? "AGG " : "PSV ") + fmtV(Math.abs(netDelta));
            const bColor   = isAgg ? "rgba(0,229,204,0.92)" : "rgba(206,147,216,0.92)";
            const bW = Math.max(colW + 4, 34), bH = 13;
            const bY = yH - bH - 2;
            ctx.fillStyle = bColor;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(cx - bW/2, bY, bW, bH, 2);
            else ctx.rect(cx - bW/2, bY, bW, bH);
            ctx.fill();
            ctx.fillStyle = "#fff"; ctx.font = "bold 11px monospace";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(dLbl, cx, bY + bH / 2);
          }
        });

        // ── Legend (top-right corner of canvas, always visible in this mode) ──
        if (W > 200) {
          const lx = W - 72, ly = 8, lw = 64, lh = 50;
          ctx.fillStyle = "rgba(11,14,26,0.85)";
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(lx, ly, lw, lh, 4);
          else ctx.rect(lx, ly, lw, lh);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.lineWidth = 1; ctx.setLineDash([]);
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(lx + 0.5, ly + 0.5, lw - 1, lh - 1, 4);
          else ctx.rect(lx + 0.5, ly + 0.5, lw - 1, lh - 1);
          ctx.stroke();

          ctx.font = "bold 9px Inter,monospace"; ctx.textBaseline = "middle"; ctx.textAlign = "left";
          // Title
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          ctx.fillText("AGG/PASSIVE", lx + 6, ly + 9);
          // Green row
          ctx.fillStyle = "rgba(0,192,118,0.75)";
          ctx.fillRect(lx + 6, ly + 19, 8, 8);
          ctx.fillStyle = "rgba(200,220,255,0.70)";
          ctx.font = "9px Inter,monospace";
          ctx.fillText("Aggressive Buy", lx + 17, ly + 23);
          // Red row
          ctx.fillStyle = "rgba(255,77,103,0.75)";
          ctx.fillRect(lx + 6, ly + 31, 8, 8);
          ctx.fillStyle = "rgba(200,220,255,0.70)";
          ctx.fillText("Aggressive Sell", lx + 17, ly + 35);
          // Note
          ctx.fillStyle = "rgba(150,160,180,0.55)";
          ctx.fillText("ratio ≥ 1.5×", lx + 6, ly + 46);
        }
      }

      /* ══════════════════════════════════════════════════════
         MODE 6: BIG TRADES — Deep Charts style
         Standard green/purple candle bodies + wicks.
         Circles drawn at the highest-volume price level when
         that level is ≥2× the average level volume.
         Circle size ∝ relative volume. Green = ask dominant,
         pink/magenta = bid dominant.
      ══════════════════════════════════════════════════════ */
      if (effectiveFP === "big-trades") {
        // Factory for a small companion bubble (spawned around a big trade so it gets absorbed)
        const makeCompanion = (
          hx: number, hy: number, bigR: number, side: "buy" | "sell",
          bigVal: number, aTime: number, aPrice: number, bornAt: number
        ): Bubble => {
          const cr = bigR * (0.18 + Math.random() * 0.24); // much smaller than the big one
          const ang = Math.random() * Math.PI * 2;
          const dd  = bigR * (1.1 + Math.random() * 1.3);
          return {
            id:    ++bubbleIdRef.current,
            x:     hx + Math.cos(ang) * dd,
            y:     hy + Math.sin(ang) * dd,
            vx:    (Math.random() - 0.5) * 0.6,
            vy:    (Math.random() - 0.5) * 0.6,
            baseR: cr,
            r:     cr * 0.4,
            phase: Math.random() * Math.PI * 2,
            big:   false,
            side,
            value: Math.max(1, Math.round(Math.abs(bigVal) * (0.08 + Math.random() * 0.2))) * (side === "buy" ? 1 : -1),
            born:  bornAt,
            life:  4200 + Math.random() * 3000,
            popping: false,
            popT:  0,
            anchorTime:  aTime,
            anchorPrice: aPrice,
          };
        };

        // First pass: compute average level volume across all visible bars
        let totalLevVol = 0, totalLevCount = 0;
        visibleBars.forEach(c => {
          const rawYH = srs.priceToCoordinate(c.high);
          const rawYL = srs.priceToCoordinate(c.low);
          if (rawYH == null || rawYL == null) return;
          const fullH = Math.max(2, Math.round(rawYL) - Math.round(rawYH));
          const numLev = Math.max(1, Math.min(bsp >= 20 ? 8 : bsp >= 10 ? 5 : 3, Math.floor(fullH / 8)));
          const lvls = getBarFootprint(c, numLev);
          lvls.forEach(lv => { totalLevVol += lv.total; totalLevCount++; });
        });
        const avgLevVol = totalLevCount > 0 ? totalLevVol / totalLevCount : 1;

        // ── Pass A: draw candle bodies/wicks + detect big trades → spawn bubbles ──
        const recentCut = visibleBars.length > 50 ? visibleBars[visibleBars.length - 50].time : 0;
        visibleBars.forEach(c => {
          const rawCx = chart.timeScale().timeToCoordinate(c.time as any);
          if (rawCx == null || rawCx < -colW || rawCx > W + colW) return;
          const cx = Math.round(rawCx);
          const rawYH = srs.priceToCoordinate(c.high);
          const rawYL = srs.priceToCoordinate(c.low);
          if (rawYH == null || rawYL == null) return;
          const yH = Math.round(rawYH);
          const yL = Math.round(rawYL);
          // NOTE: do NOT redraw candle bodies/wicks here — the real Lightweight
          // Charts candlestick series already renders them underneath. Drawing a
          // second set on the canvas was causing the "overlapping/doubled" candles
          // in Big Trades mode (and wasted render time). We only overlay bubbles.

          // Find "big trade" — highest volume level
          const fullH  = Math.max(2, yL - yH);
          const numLev = Math.max(1, Math.min(bsp >= 20 ? 8 : bsp >= 10 ? 5 : 3, Math.floor(fullH / 8)));
          const levels = getBarFootprint(c, numLev);
          if (levels.length === 0) return;
          const rowH = fullH / Math.max(1, numLev);

          const pocIdx = levels.reduce((mi, l, i, a) => l.total > a[mi].total ? i : mi, 0);
          const poc    = levels[pocIdx];

          // Only treat as a "big trade" if significantly larger than average
          if (poc.total < avgLevVol * 1.8) return;
          // Only spawn bubbles for recent bars (avoid a swarm of historical bubbles)
          if ((c.time as number) < (recentCut as number)) return;

          const pocY  = Math.round(yH + (pocIdx + 0.5) * rowH);
          // Bubble radius scales with order size (∝ how big the trade is)
          const scale = Math.min(1, (poc.total / avgLevVol - 1.8) / 3);
          const baseR = Math.round(14 + scale * 30); // 14 → 44 px
          const side: "buy" | "sell" = poc.ask >= poc.bid ? "buy" : "sell";
          // Show NOTIONAL dollar size (volume × price), not raw volume — otherwise
          // crypto (volume in coins, e.g. 5 BTC) shows a meaningless "5" while
          // stocks/futures show "11k". Notional is consistent + meaningful on every
          // asset class (BTC: 5 × $64k = "$320k"; AAPL/NQ scale the same way).
          const notional = poc.total * (poc.priceLevel || c.close || 1);
          const value = (side === "buy" ? 1 : -1) * Math.round(notional);

          // Spawn once per bar (dedupe by bar time). Cap active bubbles.
          const key = String(c.time);
          if (!bubbleSpawnRef.current.has(key) && bubblesRef.current.length < 60) {
            bubbleSpawnRef.current.add(key);
            const now0 = performance.now();
            // Main big-trade bubble
            bubblesRef.current.push({
              id:    ++bubbleIdRef.current,
              x:     cx,  y: pocY,  vx: 0, vy: 0,
              baseR,
              r:     baseR * 0.3,        // grows in
              phase: Math.random() * Math.PI * 2,
              big:   true,               // the persistent big-trade bubble at this level
              side,
              value,
              born:  now0,
              life:  9000,               // linger ~9s at the level then refresh (not forever)
              popping: false,
              popT:  0,
              anchorTime:  c.time as number,
              anchorPrice: poc.priceLevel,
            });
            // small companion bubbles so the big one visibly absorbs them
            const companions = 2 + Math.floor(scale * 2);
            for (let k = 0; k < companions; k++) {
              bubblesRef.current.push(
                makeCompanion(cx, pocY, baseR, side, value, c.time as number, poc.priceLevel, now0 + k * 120)
              );
            }
          }
        });

        // Keep the dedupe set from growing unbounded
        if (bubbleSpawnRef.current.size > 400) bubbleSpawnRef.current = new Set();

        // ── Pass B: update + draw all active bubbles (🫧 float around key levels) ──
        const nowMs = performance.now();
        const bubbles = bubblesRef.current;

        // Continuous companion spawning — keeps each big bubble fed with small
        // bubbles to absorb so the x-ray stays alive (throttled).
        if (nowMs - bubbleSpawnTickRef.current > 950 && bubbles.length < 56) {
          bubbleSpawnTickRef.current = nowMs;
          const bigs = bubbles.filter(b => b.big && !b.popping);
          if (bigs.length) {
            const bg = bigs[Math.floor(Math.random() * bigs.length)];
            const hx = chart.timeScale().timeToCoordinate(bg.anchorTime as any);
            const hy = srs.priceToCoordinate(bg.anchorPrice);
            if (hx != null && hy != null) {
              bubblesRef.current.push(
                makeCompanion(hx, hy, bg.baseR, bg.side, bg.value, bg.anchorTime, bg.anchorPrice, nowMs)
              );
            }
          }
        }

        // Physics: spring each bubble toward its anchored key level so they
        // float AROUND the level (buoyant bob) instead of drifting off-screen.
        for (const b of bubbles) {
          const hx = chart.timeScale().timeToCoordinate(b.anchorTime as any);
          const hy = srs.priceToCoordinate(b.anchorPrice);
          if (hx == null || hy == null) { b.popping = b.popping || true; continue; }
          // buoyant target: bob gently above the level (slow, readable motion)
          const bob = Math.sin(b.phase + nowMs / 1600) * (b.big ? 4 : 7);
          const homeX = hx + Math.cos(b.phase + nowMs / 2400) * (b.big ? 3 : 9);
          const homeY = hy + bob - (b.big ? 4 : 12);
          // spring toward home (small bubbles looser so they roam, big ones anchored)
          const k = b.big ? 0.012 : 0.006;
          b.vx += (homeX - b.x) * k;
          b.vy += (homeY - b.y) * k;
          // small bubbles are gently drawn toward the nearest big bubble at the same level → absorbed
          if (!b.big) {
            let near: typeof b | null = null, nd = 1e9;
            for (const o of bubbles) {
              if (!o.big || o.popping) continue;
              if (o.anchorTime !== b.anchorTime) continue;
              const d = Math.hypot(o.x - b.x, o.y - b.y);
              if (d < nd) { nd = d; near = o; }
            }
            if (near) { b.vx += (near.x - b.x) * 0.0035; b.vy += (near.y - b.y) * 0.0035; }
          }
          // integrate + damping (higher damping = calmer, slower drift)
          b.vx *= 0.93; b.vy *= 0.93;
          b.x += b.vx; b.y += b.vy;
          // ease radius in toward baseR
          if (!b.popping && b.r < b.baseR) b.r += (b.baseR - b.r) * 0.12;
          const age = nowMs - b.born;
          if (age > b.life && !b.popping) { b.popping = true; } // big bubbles have Infinite life
        }
        // ABSORB: a noticeably larger bubble that overlaps a smaller one swallows it —
        // the smaller pops, the larger grows (gains the absorbed size) and gets tugged toward it.
        for (let i = 0; i < bubbles.length; i++) {
          for (let j = 0; j < bubbles.length; j++) {
            if (i === j) continue;
            const a = bubbles[i], s = bubbles[j];
            if (s.popping || a.popping) continue;
            if (a.baseR > s.baseR * 1.3) {
              const dx = a.x - s.x, dy = a.y - s.y;
              const dist = Math.hypot(dx, dy);
              if (dist < a.r + s.r * 0.55) {
                s.popping = true;
                s.absorbedBy = a.id;        // pop pulls toward the absorber
                // absorber grows by area-equivalent of the swallowed bubble (capped)
                const grown = Math.sqrt(a.baseR * a.baseR + s.baseR * s.baseR * 0.55);
                a.baseR = Math.min(66, grown);
                // NOTE: do NOT accumulate value here. Big bubbles have a long life
                // and absorb a new companion every ~second, so "value += ..." would
                // compound unbounded into garbage like 19,646,512,705,155M. The
                // bubble's number stays its own (real) trade notional; only the
                // RADIUS grows to show it's absorbing.
                a.absorbFlash = 1;          // brief swell flash on the absorber
                playBloop(a.baseR > 40);    // water-bubble "bloop" on absorb
              }
            }
          }
        }
        // Advance pop animations + cull dead bubbles
        const byId = new Map(bubbles.map(b => [b.id, b]));
        bubblesRef.current = bubbles.filter(b => {
          if (b.absorbFlash && b.absorbFlash > 0) b.absorbFlash = Math.max(0, b.absorbFlash - 0.07);
          if (b.popping) {
            b.popT += 0.09;
            // absorbed bubbles slide toward the bubble that swallowed them
            if (b.absorbedBy != null) {
              const a = byId.get(b.absorbedBy);
              if (a) { b.x += (a.x - b.x) * 0.22; b.y += (a.y - b.y) * 0.22; }
            }
            if (b.popT >= 1) return false;
          }
          // cull if its anchor scrolled off-screen
          const hx = chart.timeScale().timeToCoordinate(b.anchorTime as any);
          if (hx == null || hx < -80 || hx > W + 80) return false;
          return true;
        });

        // Draw bubbles — real water-bubble look: transparent glassy body,
        // bright iridescent rim, specular highlights, gentle wobble.
        const hoverId = bubbleHoverRef.current;
        for (const b of bubblesRef.current) {
          const buy = b.side === "buy";
          // soft neon green for buyers, soft neon red for sellers (rim/tint only — body stays glassy)
          const core = buy ? "70,235,170" : "255,90,110";
          const isHover = hoverId === b.id;

          // gentle squash/stretch wobble so they feel alive like real bubbles
          const t = nowMs / 520 + b.phase;
          const wob = b.popping ? 1 : 1 + Math.sin(t) * 0.05;
          const swell = b.absorbFlash ? 1 + b.absorbFlash * 0.22 : 1;
          const baseR = b.r * swell;
          const rx = baseR * wob;
          const ry = baseR / wob;
          // pop animation: expand outward + fade (absorbed ones shrink as they slide in)
          const popScale = b.popping ? (b.absorbedBy != null ? 1 - b.popT * 0.6 : 1 + b.popT * 0.8) : 1;
          const alpha = b.popping ? (1 - b.popT) : 1;
          const Rx = rx * popScale, Ry = ry * popScale;

          ctx.save();

          // outer halo (soft tinted glow)
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Rx + 4, Ry + 4, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${core},${0.10 * alpha})`;
          ctx.fill();

          // glassy body: transparent center → faint tint → brighter near the rim
          const g = ctx.createRadialGradient(b.x, b.y, Rx * 0.2, b.x, b.y, Rx);
          g.addColorStop(0,    `rgba(${core},${0.03 * alpha})`);   // see-through middle
          g.addColorStop(0.72, `rgba(${core},${0.06 * alpha})`);
          g.addColorStop(0.93, `rgba(${core},${0.22 * alpha})`);   // tint gathers at edge
          g.addColorStop(1,    `rgba(255,255,255,${0.30 * alpha})`); // bright rim light
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Rx, Ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();

          // bright thin membrane rim (the signature of a water bubble)
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Rx - 0.6, Ry - 0.6, 0, 0, Math.PI * 2);
          ctx.lineWidth = isHover ? 2.4 : 1.6;
          ctx.strokeStyle = `rgba(255,255,255,${(isHover ? 0.95 : 0.78) * alpha})`;
          ctx.stroke();
          // faint colored inner ring for iridescence
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Rx - 2.4, Ry - 2.4, 0, 0, Math.PI * 2);
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(${core},${0.5 * alpha})`;
          ctx.stroke();

          // big specular highlight (top-left) — crescent-ish bright spot
          ctx.beginPath();
          ctx.ellipse(b.x - Rx * 0.34, b.y - Ry * 0.38, Rx * 0.22, Ry * 0.16, -0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${0.85 * alpha})`;
          ctx.fill();
          // small secondary highlight (bottom-right)
          ctx.beginPath();
          ctx.ellipse(b.x + Rx * 0.4, b.y + Ry * 0.42, Rx * 0.08, Ry * 0.08, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${0.4 * alpha})`;
          ctx.fill();

          // order size number, centered.
          // While being absorbed the number shrinks toward 0 as it's swallowed.
          const beingAbsorbed = b.popping && b.absorbedBy != null;
          const showNum = (!b.popping && b.r >= 13) || (beingAbsorbed && b.r >= 10);
          if (showNum) {
            const shrink = beingAbsorbed ? (1 - b.popT) : 1;       // value counts down to 0
            const numVal = Math.abs(Math.round(b.value * shrink));
            const lbl = fmtV(numVal);
            const fontPx = Math.max(8, Math.min(16, Rx * 0.5)) * (beingAbsorbed ? Math.max(0.4, 1 - b.popT * 0.7) : 1);
            ctx.font = `bold ${fontPx}px Inter, monospace`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 4;
            ctx.fillStyle = `rgba(255,255,255,${0.97 * alpha})`;
            ctx.fillText(lbl, b.x, b.y);
            ctx.shadowBlur = 0;
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
      const drawWMVP = (barsToUse: Bar[], barColor: string, labelText: string, yOffset: number) => {
        if (!barsToUse.length) return;
        // Dynamic tick size: ~25 rows so each bar is tall and clearly readable
        const priceRange = barsToUse.reduce((r, b) => ({ hi: Math.max(r.hi, b.high), lo: Math.min(r.lo, b.low) }), { hi: -Infinity, lo: Infinity });
        const rawRange = priceRange.hi - priceRange.lo;
        if (rawRange <= 0) return;
        const targetRows = 25;
        let tickSz = rawRange / targetRows;
        // Snap to a clean tick
        const magnitude = Math.pow(10, Math.floor(Math.log10(tickSz)));
        const rounded = [1, 2, 2.5, 5, 10].map(m => m * magnitude).find(v => v >= tickSz) ?? (magnitude * 10);
        tickSz = rounded;

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

        const priceScaleW = 60;
        // VP bars: 45% width up to 340px — large, prominent, DeepCharts-style
        const vpW   = Math.min(340, (W - priceScaleW) * 0.45);
        const vpRight = W - priceScaleW - 6;

        ctx.save();
        allPrices.forEach(price => {
          const vol  = volMap.get(price)!;
          const tot  = vol.bid + vol.ask;
          const yPx  = srs.priceToCoordinate(price);
          const yPx2 = srs.priceToCoordinate(price + tickSz);
          if (yPx == null || yPx2 == null) return;
          // Row height: thick bars, minimum 6px, up to 60px
          const rawH = Math.abs(+yPx2 - +yPx);
          const rowH = Math.max(6, Math.min(60, rawH - 1));
          const rowY = Math.round(Math.min(+yPx, +yPx2));
          // Bar width: minimum 14px for any bar (makes all bars clearly visible)
          const barW = Math.max(14, Math.round((tot / maxVol) * vpW));
          const isPOC = price === pocPrice;
          const askRatio = tot > 0 ? vol.ask / tot : 0.5;

          const neon = chartSettings?.neon;
          if (isPOC) {
            ctx.fillStyle = neon ? "rgba(255,224,77,0.92)" : "rgba(240,180,41,0.80)";
            ctx.fillRect(vpRight - barW, rowY, barW, rowH);
          } else {
            const askW = Math.round(barW * askRatio);
            const bidW = barW - askW;
            // ask = green, bid = red — neon-bright when neon theme is on
            ctx.fillStyle = neon ? `rgba(0,255,163,${0.45 + askRatio * 0.45})` : `rgba(0,229,204,${0.28 + askRatio * 0.35})`;
            ctx.fillRect(vpRight - barW, rowY, askW, rowH);
            ctx.fillStyle = neon ? `rgba(255,46,99,${0.45 + (1-askRatio)*0.45})` : `rgba(123,108,247,${0.28 + (1-askRatio)*0.35})`;
            ctx.fillRect(vpRight - barW + askW, rowY, bidW, rowH);
          }
          if (isPOC) {
            ctx.strokeStyle = "rgba(240,180,41,0.95)"; ctx.lineWidth = 1;
            ctx.setLineDash([6, 4]);
            ctx.beginPath(); ctx.moveTo(4, rowY + Math.round(rowH/2) + 0.5); ctx.lineTo(vpRight - 2, rowY + Math.round(rowH/2) + 0.5); ctx.stroke();
            ctx.setLineDash([]);
          }
          // Volume numbers — show on any bar tall enough to read
          if (rowH >= 7) {
            ctx.fillStyle = isPOC ? "#fff" : "rgba(255,255,255,0.75)";
            ctx.font = `${isPOC ? "bold " : ""}${isPOC ? 13 : 12}px monospace`;
            ctx.textAlign = "right"; ctx.textBaseline = "middle";
            ctx.fillText(fmtV(tot), vpRight - barW - 3, rowY + rowH / 2);
          }
        });
        // Bold label
        ctx.fillStyle = barColor; ctx.font = "bold 14px Inter,monospace";
        ctx.textAlign = "right"; ctx.textBaseline = "top";
        ctx.fillText(labelText, vpRight - 2, 4 + yOffset);
        ctx.restore();
      };

      if (fixedVPActive)   drawWMVP(visibleBars, "#F0B429", "WM Fixed VP",   0);
      if (sessionVPActive) {
        const nowSec = Math.floor(Date.now() / 1000);
        const dayStart = Math.floor(nowSec / 86400) * 86400 + 13 * 3600 + 30 * 60;
        const sessionBars = visibleBars.filter(b => (b.time as number) >= dayStart);
        drawWMVP(sessionBars.length > 2 ? sessionBars : visibleBars.slice(-30), "#8B5CF6", "WM Session VP", fixedVPActive ? 12 : 0);
      }
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
  }, [footprintType, footprintEnabled, candleType, ready, rangeVer, getBarFootprint, extendedHours, timeframe, fixedVPActive, sessionVPActive]);

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
        case "Escape": { inProgressRef.current = null; renderDrawings(); onDrawingComplete?.(); break; }
        case "f": case "F": toggleFullscreen(); break;
        case "l": case "L": setLogScale(v => !v); break;
        case "p": case "P": setPctMode(v => !v); break;
        case "a": case "A": setAutoScale(v => !v); break;
        case "d": case "D": setDataWindowOpen(v => !v); break;
        // Delete key: remove the most recently added drawing
        case "Delete": {
          if (drawingsRef.current.length > 0) {
            drawingsRef.current.pop();
            // Trigger redraw via rangeVer bump — renderDrawings defined later
            setRangeVer(v => v + 1);
          }
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
  const renderDrawings = useCallback(() => {
    const canvas = drawCanvasRef.current;
    const cont   = containerRef.current;
    if (!canvas || !cont) return;
    const W = cont.offsetWidth, H = cont.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const allDrawings = [...drawingsRef.current, ...(inProgressRef.current ? [inProgressRef.current] : [])];

    allDrawings.forEach(d => {
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);

      if (d.type === "trendline" || d.type === "ray" || d.type === "extended-line" || d.type === "arrow") {
        const a = logicalToPixel(d.p1), b = logicalToPixel(d.p2);
        if (!a || !b) return;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        if (d.type === "arrow") {
          const angle = Math.atan2(b.y - a.y, b.x - a.x), aLen = 10;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x - aLen * Math.cos(angle - Math.PI/6), b.y - aLen * Math.sin(angle - Math.PI/6));
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x - aLen * Math.cos(angle + Math.PI/6), b.y - aLen * Math.sin(angle + Math.PI/6));
          ctx.stroke();
        }
        if (d.type === "ray") {
          const dx = b.x - a.x, dy = b.y - a.y;
          const t = dx !== 0 ? (W - b.x) / dx : (dy !== 0 ? (dy > 0 ? H : 0) - b.y : 0) / (dy || 1);
          ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + t * dx, b.y + t * dy); ctx.stroke();
        }
        if (d.type === "extended-line") {
          const dx = b.x - a.x, dy = b.y - a.y;
          if (Math.abs(dx) > 0.1) {
            const slope = dy / dx;
            ctx.beginPath(); ctx.moveTo(0, a.y - a.x * slope); ctx.lineTo(W, a.y + (W - a.x) * slope); ctx.stroke();
          }
        }
        [a, b].forEach(pt => { ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, 3, 0, Math.PI*2); ctx.fill(); });
      }

      if (d.type === "hline" || d.type === "hray") {
        const y = candleRef.current?.priceToCoordinate(d.price);
        if (y == null) return;
        ctx.setLineDash([6,3]);
        ctx.beginPath(); ctx.moveTo(0, +y); ctx.lineTo(W, +y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = d.color; ctx.font = "bold 11px monospace";
        ctx.textAlign = "left"; ctx.textBaseline = "bottom";
        ctx.fillText(d.price.toFixed(base > 100 ? 2 : 4), 4, +y - 2);
      }

      if (d.type === "vline") {
        const x = chartRef.current?.timeScale().timeToCoordinate(d.time as any);
        if (x == null) return;
        ctx.setLineDash([6,3]);
        ctx.beginPath(); ctx.moveTo(+x, 0); ctx.lineTo(+x, H); ctx.stroke();
        ctx.setLineDash([]);
      }

      if (d.type === "rectangle" || d.type === "channel") {
        const a = logicalToPixel(d.p1), b = logicalToPixel(d.p2);
        if (!a || !b) return;
        const rx = Math.min(a.x,b.x), ry = Math.min(a.y,b.y);
        const rw = Math.abs(b.x-a.x), rh = Math.abs(b.y-a.y);
        ctx.fillStyle = `${d.color}18`; ctx.fillRect(rx,ry,rw,rh); ctx.strokeRect(rx,ry,rw,rh);
      }

      if (d.type === "ellipse") {
        const a = logicalToPixel(d.p1), b = logicalToPixel(d.p2);
        if (!a || !b) return;
        const cx = (a.x+b.x)/2, cy = (a.y+b.y)/2;
        const rx2 = Math.max(Math.abs(b.x-a.x)/2, 1), ry2 = Math.max(Math.abs(b.y-a.y)/2, 1);
        ctx.beginPath(); ctx.ellipse(cx, cy, rx2, ry2, 0, 0, Math.PI*2);
        ctx.fillStyle = `${d.color}18`; ctx.fill(); ctx.stroke();
      }

      if (d.type === "triangle") {
        const a = logicalToPixel(d.p1), b = logicalToPixel(d.p2);
        if (!a || !b) return;
        ctx.beginPath(); ctx.moveTo((a.x+b.x)/2, a.y); ctx.lineTo(a.x, b.y); ctx.lineTo(b.x, b.y);
        ctx.closePath(); ctx.fillStyle = `${d.color}18`; ctx.fill(); ctx.stroke();
      }

      if (d.type === "fibonacci") {
        const a = logicalToPixel(d.p1), b = logicalToPixel(d.p2);
        if (!a || !b) return;
        const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.618];
        const FIB_COLORS = ["#aaa","#4FA3E0","#00C076","#F0B429","#F0B429","#00C076","#4FA3E0","#FF4D67"];
        const dy = b.y - a.y;
        FIB_LEVELS.forEach((lvl, li) => {
          const fy = a.y + dy * lvl;
          ctx.strokeStyle = FIB_COLORS[li] ?? d.color; ctx.setLineDash([4,2]);
          ctx.beginPath(); ctx.moveTo(a.x, fy); ctx.lineTo(b.x, fy); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = FIB_COLORS[li] ?? d.color; ctx.font = "bold 8px monospace";
          ctx.textAlign = "right"; ctx.textBaseline = "bottom";
          ctx.fillText(`${(lvl*100).toFixed(1)}%`, b.x - 2, fy - 1);
        });
      }

      if (d.type === "text") {
        const x = chartRef.current?.timeScale().timeToCoordinate(d.time as any);
        const y = candleRef.current?.priceToCoordinate(d.price);
        if (x == null || y == null) return;
        ctx.fillStyle = d.color; ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(d.text, +x, +y);
      }

      if (d.type === "brush") {
        const pts = d.points.map(p => logicalToPixel(p)).filter(Boolean) as {x:number;y:number}[];
        if (pts.length < 2) return;
        ctx.beginPath();
        pts.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
      }
    });
  }, [base, logicalToPixel]);

  // Re-render drawings whenever rangeVer changes (user scrolled) or tool changes
  useEffect(() => { renderDrawings(); }, [rangeVer, renderDrawings]);

  /* ── Drawing mouse handlers ──────────────────────────────────── */
  const handleDrawMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingTool === "cursor" || lockDrawings) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    drawingStartRef.current = { x, y };

    const color = drawingColor;
    const lp0 = pixelToLogical(x, y);
    if (drawingTool === "brush") {
      if (!lp0) return;
      inProgressRef.current = { type: "brush", points: [lp0], color };
    } else if (drawingTool === "hline" || drawingTool === "hray") {
      if (!lp0) return;
      drawingsRef.current.push({ type: drawingTool, price: lp0.price, color });
      renderDrawings();
    } else if (drawingTool === "vline") {
      if (!lp0) return;
      drawingsRef.current.push({ type: "vline", time: lp0.time, color });
      renderDrawings();
    } else if (drawingTool === "text") {
      if (!lp0) return;
      const text = prompt("Enter text:") ?? "Label";
      if (text) { drawingsRef.current.push({ type: "text", price: lp0.price, time: lp0.time, text, color }); renderDrawings(); }
    } else {
      // Normalize tool IDs to drawing type names
      if (drawingTool === "eraser") {
        // Remove drawing nearest to click point (using screen distance)
        drawingsRef.current = drawingsRef.current.filter(dr => {
          if ("p1" in dr && "p2" in dr) {
            const a = logicalToPixel(dr.p1), b = logicalToPixel(dr.p2);
            if (!a || !b) return true;
            return Math.hypot((a.x+b.x)/2-x, (a.y+b.y)/2-y) > 30;
          }
          if ("price" in dr) {
            const py = candleRef.current?.priceToCoordinate(dr.price);
            return py == null || Math.abs(+py - y) > 30;
          }
          if ("time" in dr && !("price" in dr)) {
            const px = chartRef.current?.timeScale().timeToCoordinate((dr as any).time);
            return px == null || Math.abs(+px - x) > 30;
          }
          return true;
        });
        renderDrawings();
        return;
      }
      const typeMap: Record<string, string> = {
        "rect": "rectangle",
        "parallel-channel": "channel",
        "disjoint-channel": "channel",
        "fib-ext": "fibonacci",
        "fib-fan": "fibonacci",
        "fib-arc": "fibonacci",
        "fib-time": "fibonacci",
        "fib-channel": "fibonacci",
        "gann-fan": "ray",
        "pitchfork": "trendline",
        "regression": "trendline",
        "long-position": "rectangle",
        "short-position": "rectangle",
        "date-range": "rectangle",
        "price-range": "rectangle",
        "measure": "rectangle",
        "xabcd": "trendline",
        "abcd": "trendline",
        "head-shoulders": "trendline",
        "callout": "text",
        "note": "text",
        "price-label": "hline",
        "highlighter": "brush",
        "path": "brush",
        "crosshair": "trendline",
      };
      const resolvedType = typeMap[drawingTool] ?? drawingTool;
      const lp = pixelToLogical(x, y);
      if (!lp) return;
      if (resolvedType === "text") {
        const text = prompt("Enter label:") ?? "";
        if (text) { drawingsRef.current.push({ type: "text", price: lp.price, time: lp.time, text, color }); renderDrawings(); }
        return;
      }
      if (resolvedType === "hline" || resolvedType === "hray") {
        drawingsRef.current.push({ type: resolvedType as "hline"|"hray", price: lp.price, color });
        renderDrawings();
        return;
      }
      if (resolvedType === "vline") {
        drawingsRef.current.push({ type: "vline", time: lp.time, color });
        renderDrawings();
        return;
      }
      inProgressRef.current = { type: resolvedType as any, p1: lp, p2: lp, color };
    }
    // If this click committed a drawing immediately (no drag in progress), return
    // to the normal cursor so the mouse isn't stuck in drawing mode.
    if (!inProgressRef.current) onDrawingComplete?.();
  }, [drawingTool, drawingColor, lockDrawings, renderDrawings, pixelToLogical, logicalToPixel, onDrawingComplete]);

  const handleDrawMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!inProgressRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const d = inProgressRef.current;
    if (d.type === "brush") {
      const lp = pixelToLogical(x, y);
      if (lp) d.points.push(lp);
    } else if ("p2" in d) {
      const lp = pixelToLogical(x, y);
      if (lp) (d as any).p2 = lp;
    }
    renderDrawings();
  }, [renderDrawings, pixelToLogical]);

  const handleDrawMouseUp = useCallback(() => {
    if (!inProgressRef.current) return;
    drawingsRef.current.push(inProgressRef.current);
    inProgressRef.current = null;
    renderDrawings();
    // Return to normal cursor so the mouse isn't stuck in drawing mode.
    onDrawingComplete?.();
  }, [renderDrawings, onDrawingComplete]);

  // ── Big-Trade bubble hover hit-test → comic speech-bubble tooltip ──
  // Attached to the chart wrapper so it fires in cursor mode without blocking
  // chart panning (drawing tools keep their own handler on drawCanvas).
  const handleOverlayMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bubbles = bubblesRef.current;
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
      if (b.popping) continue;
      if (Math.hypot(mx - b.x, my - b.y) <= b.r + 2) { hit = b; break; }
    }
    if (hit) {
      if (bubbleHoverRef.current !== hit.id) {
        bubbleHoverRef.current = hit.id;
        setBubbleTip({
          x: hit.x, y: hit.y - hit.r,
          side: hit.side, value: hit.value,
          text: hit.side === "buy" ? "Aggressive buying absorbed" : "Aggressive selling absorbed",
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
      renderDrawings();
    }
  }, [clearTrigger, renderDrawings]);

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

      // Find nearest drawing within 30px hit radius — checks ALL drawing types
      let nearIdx: number | null = null;
      let nearDist = 30;
      drawingsRef.current.forEach((d, i) => {
        try {
          if (d.type === "hline" || d.type === "hray") {
            const py = candleRef.current!.priceToCoordinate(d.price!);
            if (py != null && Math.abs(cy - +py) < nearDist) { nearIdx = i; nearDist = Math.abs(cy - +py); }
          } else if (d.type === "vline") {
            const px = chartRef.current?.timeScale().timeToCoordinate(d.time as any);
            if (px != null && Math.abs(cx - +px) < nearDist) { nearIdx = i; nearDist = Math.abs(cx - +px); }
          } else if ("p1" in d && "p2" in d) {
            const a = logicalToPixel(d.p1), b = logicalToPixel(d.p2);
            if (a && b) {
              // Point-to-segment distance
              const dx = b.x - a.x, dy = b.y - a.y;
              const lenSq = dx*dx + dy*dy;
              let dist: number;
              if (lenSq === 0) {
                dist = Math.hypot(cx - a.x, cy - a.y);
              } else {
                const t = Math.max(0, Math.min(1, ((cx-a.x)*dx + (cy-a.y)*dy) / lenSq));
                dist = Math.hypot(cx - (a.x + t*dx), cy - (a.y + t*dy));
              }
              if (dist < nearDist) { nearIdx = i; nearDist = dist; }
            }
          } else if (d.type === "text") {
            const px = chartRef.current?.timeScale().timeToCoordinate(d.time as any);
            const py = candleRef.current?.priceToCoordinate(d.price!);
            if (px != null && py != null && Math.hypot(cx - +px, cy - +py) < nearDist) { nearIdx = i; nearDist = Math.hypot(cx - +px, cy - +py); }
          } else if (d.type === "brush" && d.points.length > 0) {
            for (const pt of d.points) {
              const p = logicalToPixel(pt);
              if (p && Math.hypot(cx - p.x, cy - p.y) < nearDist) { nearIdx = i; nearDist = Math.hypot(cx - p.x, cy - p.y); break; }
            }
          }
        } catch {}
      });

      setCtxMenu({ x: cx, y: cy, price: +price.toFixed(barsRef.current[0]?.close > 100 ? 2 : 4), nearDrawingIdx: nearIdx });
    } catch {}
  }, [logicalToPixel]);

  return (
    <div
      ref={wrapRef}
      style={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden", minWidth:0,
               background: chartSettings?.background ?? "#0B0E1A" }}
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
        onMouseLeave={() => { bubbleHoverRef.current = null; setBubbleTip(null); }}>
        <div ref={containerRef} style={{ width:"100%", height:"100%" }} />

        {/* ── Big-Trade comic speech-bubble tooltip (🫧 hover) ─────── */}
        {bubbleTip && (() => {
          const buy   = bubbleTip.side === "buy";
          const accent = buy ? "#00E696" : "#FF465A";
          const sign   = bubbleTip.value >= 0 ? "+" : "−";
          const absVal = Math.abs(bubbleTip.value).toLocaleString("en-US");
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
                    absorbed
                  </span>
                </div>
                {/* Signed size — the headline number from the sketch */}
                <div style={{ color: "#fff", fontWeight: 900, fontSize: 18, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {sign}{absVal}
                </div>
                {/* Plain-English explanation */}
                <div style={{ color: "#9AA3BF", fontWeight: 600, fontSize: 9.5, marginTop: 3, maxWidth: 168 }}>
                  {bubbleTip.text} at this level
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
        {/* Cover TradingView watermark with WM branding */}
        <div
          title="WealthyMindsets Pro"
          style={{
            position: "absolute", bottom: 4, left: 4,
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(11,14,26,0.95)", backdropFilter: "blur(6px)",
            borderRadius: 7, padding: "4px 10px 4px 6px",
            border: "1px solid rgba(240,180,41,0.25)",
            cursor: "default", zIndex: 10, userSelect: "none",
            pointerEvents: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          {/* Official WealthyMindsets W badge */}
          <svg width="22" height="22" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="22" cy="22" r="21" fill="#0D1117" stroke="#F0B429" strokeWidth="2"/>
            {/* Bold W — WealthyMindsets signature shape */}
            <path d="M8 13 L13.5 31 L19 20 L22 25 L25 20 L30.5 31 L36 13" stroke="#F0B429" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#F0B429", letterSpacing: "0.5px", fontFamily: "Inter, sans-serif" }}>
            WealthyMindsets
          </span>
        </div>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ mixBlendMode: "normal", opacity: 0.9, zIndex: 5 }}
        />
        {/* Drawing tools canvas — pointer-events only when tool is active */}
        <canvas
          ref={drawCanvasRef}
          className="absolute inset-0"
          style={{
            cursor: drawingTool === "cursor" ? "crosshair"
                  : drawingTool === "hline" || drawingTool === "hray" ? "ns-resize"
                  : drawingTool === "vline" ? "ew-resize"
                  : drawingTool === "brush" ? "crosshair"
                  : drawingTool === "text" ? "text"
                  : "crosshair",
            pointerEvents: drawingTool !== "cursor" ? "all" : "none",
            opacity: drawingsVisible ? 1 : 0,
            zIndex: 10,
          }}
          onMouseDown={handleDrawMouseDown}
          onMouseMove={handleDrawMouseMove}
          onMouseUp={handleDrawMouseUp}
          onMouseLeave={handleDrawMouseUp}
        />

        {/* ── Scale buttons (right side) ───────────────── */}
        <div style={{
          position:"absolute", right: 64, top: 8, display:"flex", flexDirection:"column", gap: 3, zIndex: 50, alignItems:"flex-end",
        }}>
          {/* Clear Auto/Lock toggle — when LOCKED, drag the price axis up/down freely */}
          <button
            onClick={() => setAutoScale(v => !v)}
            title={autoScale
              ? "Auto Scale ON — chart auto-fits price. Click to LOCK, then drag the price axis up/down to see higher/lower prices."
              : "Scale LOCKED — drag the price axis (right side) up/down to pan, or scroll to zoom. Click to re-enable Auto Scale."}
            style={{
              height: 22, padding: "0 8px", borderRadius: 4, fontSize: 9.5, fontWeight: 800, cursor: "pointer",
              letterSpacing: 0.4, whiteSpace: "nowrap",
              background: autoScale ? "rgba(0,200,118,0.18)" : "rgba(240,180,41,0.20)",
              border: `1px solid ${autoScale ? "rgba(0,200,118,0.5)" : "rgba(240,180,41,0.6)"}`,
              color: autoScale ? "#00C076" : "#F0B429",
            }}>
            {autoScale ? "● AUTO" : "🔒 LOCK"}
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
              // Delete nearest drawing if cursor is close to one
              ...(ctxMenu.nearDrawingIdx !== null ? [{
                label: "🗑 Delete this drawing", color: "#FF4D6A",
                action: () => {
                  drawingsRef.current.splice(ctxMenu.nearDrawingIdx!, 1);
                  renderDrawings();
                }
              }] : []),
              { label: `🔔 Add Alert at ${ctxMenu.price}`, color: "#F5A623", action: () => {
                const lp = pixelToLogical(ctxMenu.x, ctxMenu.y);
                if (lp) { drawingsRef.current.push({ type: "hline", price: lp.price, color: "#F5A623" }); renderDrawings(); }
              }},
              { label: "― Horizontal Line", color: "#8896BE", action: () => {
                const lp = pixelToLogical(ctxMenu.x, ctxMenu.y);
                if (lp) { drawingsRef.current.push({ type: "hline", price: lp.price, color: drawingColor }); renderDrawings(); }
              }},
              { label: "✎ Add Text", color: "#8896BE", action: () => {
                const text = window.prompt("Enter text:"); if (!text) return;
                const lp = pixelToLogical(ctxMenu.x, ctxMenu.y);
                if (lp) { drawingsRef.current.push({ type: "text", price: lp.price, time: lp.time, text, color: drawingColor }); renderDrawings(); }
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
