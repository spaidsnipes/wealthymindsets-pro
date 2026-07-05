/**
 * Real backtest engine — runs over ACTUAL historical OHLCV bars pulled from the
 * same Yahoo feed the charts use (/api/yahoo). No synthetic/random data: every
 * trade comes from a transparent rule evaluated on real candles, exits are
 * ATR-based stop/target, and position sizing is fixed-fractional (1% risk).
 *
 * Honesty notes surfaced to the UI:
 *  - Intraday history from Yahoo is range-limited (e.g. 5m ≈ 60 days max), so the
 *    actual covered period can be shorter than the requested range. We report the
 *    real bar count and date span back to the caller.
 *  - These are rule backtests on close-to-close bars, not tick-level fills.
 */

export interface Bar {
  time:   number; // unix seconds
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

export interface BTTrade {
  id:     number;
  date:   string;
  symbol: string;
  side:   "long" | "short";
  entry:  number;
  exit:   number;
  pnl:    number;
  pct:    number;
  result: "win" | "loss" | "be";
  bars:   number;
  signal: string;
}

export interface BTResult {
  trades:         BTTrade[];
  totalPnl:       number;
  winRate:        number;
  avgWin:         number;
  avgLoss:        number;
  profitFactor:   number;
  maxDrawdown:    number;
  maxDrawdownPct: number;
  sharpe:         number;
  totalTrades:    number;
  wins:           number;
  losses:         number;
  bestTrade:      number;
  worstTrade:     number;
  avgBarsHeld:    number;
  equity:         { t: number; v: number }[];
  // Provenance — proves the run used real data and how much.
  meta: {
    barCount:   number;
    fromDate:   string;
    toDate:     string;
    rangeNote?: string; // set when Yahoo couldn't cover the requested span
  };
}

/* ── Data fetch (real bars) ─────────────────────────────────── */
export async function fetchBars(symbol: string, tf: string): Promise<Bar[]> {
  // Ask for the maximum the endpoint allows; Yahoo decides the real coverage.
  const url = `/api/yahoo?sym=${encodeURIComponent(symbol)}&type=candles&tf=${encodeURIComponent(tf)}&bars=3000`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Data fetch failed (${res.status})`);
  const json = await res.json() as { candles?: Bar[]; error?: string };
  if (json.error) throw new Error(json.error);
  const bars = (json.candles ?? []).filter(
    b => b && [b.open, b.high, b.low, b.close].every(n => typeof n === "number" && isFinite(n) && n > 0)
  );
  return bars;
}

/* ── Indicator helpers ──────────────────────────────────────── */
function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0] ?? 0;
  values.forEach((v, i) => { prev = i === 0 ? v : v * k + prev * (1 - k); out.push(prev); });
  return out;
}
function atr(bars: Bar[], period: number): number[] {
  const tr: number[] = bars.map((b, i) => {
    if (i === 0) return b.high - b.low;
    const pc = bars[i - 1].close;
    return Math.max(b.high - b.low, Math.abs(b.high - pc), Math.abs(b.low - pc));
  });
  return ema(tr, period);
}
function rollingMax(vals: number[], i: number, n: number): number {
  let m = -Infinity; for (let j = Math.max(0, i - n); j < i; j++) m = Math.max(m, vals[j]); return m;
}
function rollingMin(vals: number[], i: number, n: number): number {
  let m = Infinity; for (let j = Math.max(0, i - n); j < i; j++) m = Math.min(m, vals[j]); return m;
}
function rollingAvg(vals: number[], i: number, n: number): number {
  let s = 0, c = 0; for (let j = Math.max(0, i - n); j < i; j++) { s += vals[j]; c++; } return c ? s / c : 0;
}

/* ── Per-strategy entry signal: returns +1 long, -1 short, 0 none ─── */
function signalAt(strategyId: string, bars: Bar[], i: number, ind: {
  emaF: number[]; emaS: number[]; atr: number[]; cvd: number[];
}): number {
  if (i < 25) return 0;
  const b = bars[i];
  const closes = bars.map(x => x.close);
  const vols   = bars.map(x => x.volume);
  const avgVol = rollingAvg(vols, i, 20);
  const range  = b.high - b.low;
  const bull   = b.close > b.open;

  switch (strategyId) {
    case "momentum": {
      const hi = rollingMax(bars.map(x => x.high), i, 20);
      const lo = rollingMin(bars.map(x => x.low),  i, 20);
      if (b.close > hi && b.volume > avgVol * 1.4) return 1;
      if (b.close < lo && b.volume > avgVol * 1.4) return -1;
      return 0;
    }
    case "vwap": {
      // Rolling VWAP + std over the last 20 bars; fade ±2σ deviations.
      let pv = 0, vv = 0; const win = 20;
      for (let j = Math.max(0, i - win); j <= i; j++) { const tp = (bars[j].high + bars[j].low + bars[j].close) / 3; pv += tp * bars[j].volume; vv += bars[j].volume; }
      const vwap = vv ? pv / vv : b.close;
      let sq = 0, c = 0; for (let j = Math.max(0, i - win); j <= i; j++) { sq += (bars[j].close - vwap) ** 2; c++; }
      const sd = Math.sqrt(sq / Math.max(1, c));
      if (sd <= 0) return 0;
      const dev = (b.close - vwap) / sd;
      if (dev > 2)  return -1; // overextended above → fade short
      if (dev < -2) return 1;  // overextended below → fade long
      return 0;
    }
    case "wyckoff": {
      const lo = rollingMin(bars.map(x => x.low),  i, 20);
      const hi = rollingMax(bars.map(x => x.high), i, 20);
      // Spring: dips below range low intrabar but closes back inside → long.
      if (b.low < lo && b.close > lo) return 1;
      // UTAD: pokes above range high but closes back inside → short.
      if (b.high > hi && b.close < hi) return -1;
      return 0;
    }
    case "clc": {
      // Context (trend) + Location (pullback to fast EMA) + Confirmation (vol bar).
      const up = ind.emaF[i] > ind.emaS[i];
      const near = Math.abs(b.close - ind.emaF[i]) < ind.atr[i] * 0.5;
      const conf = b.volume > avgVol * 1.1;
      if (up && near && bull && conf) return 1;
      if (!up && near && !bull && conf) return -1;
      return 0;
    }
    case "cvd": {
      // Divergence between price low/high and cumulative volume delta.
      const pLowNow  = b.low  < rollingMin(bars.map(x => x.low),  i, 10);
      const pHighNow = b.high > rollingMax(bars.map(x => x.high), i, 10);
      const cvdUp    = ind.cvd[i] > rollingMin(ind.cvd, i, 10);
      const cvdDn    = ind.cvd[i] < rollingMax(ind.cvd, i, 10);
      if (pLowNow && cvdUp)  return 1;  // price LL, CVD HL → bullish divergence
      if (pHighNow && cvdDn) return -1; // price HH, CVD LH → bearish divergence
      return 0;
    }
    case "darkpool": {
      // Absorption: tiny-range bar on heavy volume = block accumulation/distribution.
      const absorb = range < ind.atr[i] * 0.6 && b.volume > avgVol * 2;
      if (absorb && bull)  return 1;
      if (absorb && !bull) return -1;
      return 0;
    }
    default: {
      void closes;
      return 0;
    }
  }
}

/* ── Engine ─────────────────────────────────────────────────── */
export function runRealBacktest(
  bars: Bar[], symbol: string, strategyId: string, strategyLabel: string,
): BTResult {
  const START = 100_000;
  const RISK  = 0.01;       // 1% of equity risked per trade
  const STOP_ATR = 1.0, TARGET_ATR = 2.0, MAX_HOLD = 20;

  const emaF = ema(bars.map(b => b.close), 9);
  const emaS = ema(bars.map(b => b.close), 21);
  const atrA = atr(bars, 14);
  const cvd: number[] = []; let run = 0;
  bars.forEach(b => { run += (b.close >= b.open ? 1 : -1) * b.volume; cvd.push(run); });
  const ind = { emaF, emaS, atr: atrA, cvd };

  const trades: BTTrade[] = [];
  const equityCurve: { t: number; v: number }[] = [{ t: bars[0]?.time ?? 0, v: START }];
  let equity = START, tId = 0, i = 25;

  while (i < bars.length - 1) {
    const sig = signalAt(strategyId, bars, i, ind);
    const a = atrA[i];
    if (sig === 0 || !isFinite(a) || a <= 0) { i++; continue; }

    const side: "long" | "short" = sig > 0 ? "long" : "short";
    const entry = bars[i + 1].open;              // realistic: fill next bar open
    const stop   = side === "long" ? entry - a * STOP_ATR   : entry + a * STOP_ATR;
    const target = side === "long" ? entry + a * TARGET_ATR : entry - a * TARGET_ATR;
    const stopDist = Math.abs(entry - stop);
    if (stopDist <= 0) { i++; continue; }
    const shares = (equity * RISK) / stopDist;   // fixed-fractional sizing

    // Walk forward bar-by-bar until stop/target/time exit.
    let exit = entry, heldBars = 0, j = i + 1;
    for (; j < bars.length && heldBars < MAX_HOLD; j++, heldBars++) {
      const bj = bars[j];
      if (side === "long") {
        if (bj.low  <= stop)   { exit = stop;   break; }
        if (bj.high >= target) { exit = target; break; }
      } else {
        if (bj.high >= stop)   { exit = stop;   break; }
        if (bj.low  <= target) { exit = target; break; }
      }
      exit = bj.close; // time-exit fallback = close of last held bar
    }

    const dir = side === "long" ? 1 : -1;
    const pnl = (exit - entry) * dir * shares;
    const pct = ((exit - entry) / entry) * dir * 100;
    equity += pnl;
    tId++;
    trades.push({
      id: tId,
      date: new Date((bars[i + 1].time) * 1000).toLocaleDateString(),
      symbol, side, entry: +entry.toFixed(2), exit: +exit.toFixed(2),
      pnl: +pnl.toFixed(2), pct: +pct.toFixed(2),
      result: pnl > 1 ? "win" : pnl < -1 ? "loss" : "be",
      bars: heldBars, signal: strategyLabel,
    });
    equityCurve.push({ t: bars[j] ? bars[j].time : bars[i + 1].time, v: +equity.toFixed(2) });
    i = j + 1; // no overlapping positions
  }

  const wins   = trades.filter(t => t.result === "win");
  const losses = trades.filter(t => t.result === "loss");
  const totalPnl = equity - START;

  let peak = START, maxDD = 0;
  equityCurve.forEach(({ v }) => { if (v > peak) peak = v; const dd = (peak - v) / peak; if (dd > maxDD) maxDD = dd; });

  const grossWin  = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const avgWin  = wins.length   ? grossWin / wins.length   : 0;
  const avgLoss = losses.length ? -grossLoss / losses.length : 0;
  const pf      = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? 99 : 0);

  // Sharpe from per-trade returns (annualization-agnostic, honest unit-Sharpe).
  const rets = trades.map(t => t.pct / 100);
  const mean = rets.length ? rets.reduce((s, r) => s + r, 0) / rets.length : 0;
  const variance = rets.length ? rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length : 0;
  const sd = Math.sqrt(variance);
  const sharpe = sd > 0 ? +(mean / sd * Math.sqrt(trades.length || 1)).toFixed(2) : 0;

  return {
    trades,
    totalPnl:       +totalPnl.toFixed(2),
    winRate:        trades.length ? +(wins.length / trades.length * 100).toFixed(1) : 0,
    avgWin:         +avgWin.toFixed(2),
    avgLoss:        +avgLoss.toFixed(2),
    profitFactor:   +pf.toFixed(2),
    maxDrawdown:    +(maxDD * peak).toFixed(2),
    maxDrawdownPct: +(maxDD * 100).toFixed(1),
    sharpe,
    totalTrades:    trades.length,
    wins:           wins.length,
    losses:         losses.length,
    bestTrade:      trades.length ? Math.max(...trades.map(t => t.pnl)) : 0,
    worstTrade:     trades.length ? Math.min(...trades.map(t => t.pnl)) : 0,
    avgBarsHeld:    trades.length ? +(trades.reduce((s, t) => s + t.bars, 0) / trades.length).toFixed(1) : 0,
    equity:         equityCurve,
    meta: {
      barCount: bars.length,
      fromDate: bars.length ? new Date(bars[0].time * 1000).toLocaleDateString() : "—",
      toDate:   bars.length ? new Date(bars[bars.length - 1].time * 1000).toLocaleDateString() : "—",
    },
  };
}
