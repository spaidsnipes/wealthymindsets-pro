/**
 * Pine Script v6 Built-in Technical Analysis Functions
 * Implements ta.*, math.*, str.* namespaces
 */

import { PineSeries } from "./types";

/* ── Math helpers ──────────────────────────────────────────── */
export function nz(v: number | null | undefined, replacement = 0): number {
  return (v == null || isNaN(v as number)) ? replacement : (v as number);
}

export function na(v: unknown): boolean {
  return v == null || (typeof v === "number" && isNaN(v));
}

/* ── Rolling series helpers ───────────────────────────────── */
function take(series: (number | null)[], n: number): (number | null)[] {
  return series.slice(Math.max(0, series.length - n));
}

/* ── Moving Averages ──────────────────────────────────────── */
export function sma(series: (number | null)[], length: number): (number | null)[] {
  return series.map((_, i) => {
    if (i < length - 1) return null;
    const slice = series.slice(i - length + 1, i + 1);
    if (slice.some(v => v == null)) return null;
    return (slice as number[]).reduce((a, b) => a + b, 0) / length;
  });
}

export function ema(series: (number | null)[], length: number): (number | null)[] {
  const k = 2 / (length + 1);
  const out: (number | null)[] = [];
  let prev: number | null = null;
  for (let i = 0; i < series.length; i++) {
    const v = series[i];
    if (v == null) { out.push(null); continue; }
    if (prev == null) {
      // Seed with SMA of first `length` bars
      if (i < length - 1) { out.push(null); continue; }
      const seed = series.slice(i - length + 1, i + 1);
      if (seed.some(s => s == null)) { out.push(null); continue; }
      prev = (seed as number[]).reduce((a, b) => a + b, 0) / length;
      out.push(prev);
    } else {
      prev = v * k + prev * (1 - k);
      out.push(prev);
    }
  }
  return out;
}

export function wma(series: (number | null)[], length: number): (number | null)[] {
  return series.map((_, i) => {
    if (i < length - 1) return null;
    const slice = series.slice(i - length + 1, i + 1);
    if (slice.some(v => v == null)) return null;
    let num = 0, den = 0;
    for (let j = 0; j < length; j++) {
      const w = j + 1;
      num += (slice[j] as number) * w;
      den += w;
    }
    return num / den;
  });
}

export function hma(series: (number | null)[], length: number): (number | null)[] {
  const half = Math.floor(length / 2);
  const sqrtLen = Math.round(Math.sqrt(length));
  const wma1 = wma(series, half);
  const wma2 = wma(series, length);
  const diff = wma1.map((v, i) => v != null && wma2[i] != null ? 2 * (v as number) - (wma2[i] as number) : null);
  return wma(diff, sqrtLen);
}

export function rma(series: (number | null)[], length: number): (number | null)[] {
  const k = 1 / length;
  const out: (number | null)[] = [];
  let prev: number | null = null;
  for (let i = 0; i < series.length; i++) {
    const v = series[i];
    if (v == null) { out.push(null); continue; }
    if (prev == null) {
      if (i < length - 1) { out.push(null); continue; }
      const slice = series.slice(i - length + 1, i + 1);
      prev = (slice.filter(s => s != null) as number[]).reduce((a, b) => a + b, 0) / length;
      out.push(prev);
    } else {
      prev = v * k + prev * (1 - k);
      out.push(prev);
    }
  }
  return out;
}

export function dema(series: (number | null)[], length: number): (number | null)[] {
  const e1 = ema(series, length);
  const e2 = ema(e1, length);
  return e1.map((v, i) => v != null && e2[i] != null ? 2 * (v as number) - (e2[i] as number) : null);
}

export function tema(series: (number | null)[], length: number): (number | null)[] {
  const e1 = ema(series, length);
  const e2 = ema(e1, length);
  const e3 = ema(e2, length);
  return e1.map((v, i) =>
    v != null && e2[i] != null && e3[i] != null
      ? 3 * (v as number) - 3 * (e2[i] as number) + (e3[i] as number)
      : null
  );
}

/* ── Oscillators ───────────────────────────────────────────── */
export function rsi(series: (number | null)[], length: number): (number | null)[] {
  const gains: (number | null)[] = [null];
  const losses: (number | null)[] = [null];
  for (let i = 1; i < series.length; i++) {
    const diff = (series[i] ?? NaN) - (series[i - 1] ?? NaN);
    if (isNaN(diff)) { gains.push(null); losses.push(null); }
    else { gains.push(Math.max(0, diff)); losses.push(Math.max(0, -diff)); }
  }
  const avgGain = rma(gains, length);
  const avgLoss = rma(losses, length);
  return avgGain.map((g, i) => {
    const l = avgLoss[i];
    if (g == null || l == null) return null;
    if (l === 0) return 100;
    const rs = (g as number) / (l as number);
    return 100 - 100 / (1 + rs);
  });
}

export function macd(
  series: (number | null)[],
  fast = 12, slow = 26, signal = 9
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const fastEma = ema(series, fast);
  const slowEma = ema(series, slow);
  const macdLine = fastEma.map((v, i) =>
    v != null && slowEma[i] != null ? (v as number) - (slowEma[i] as number) : null
  );
  const signalLine = ema(macdLine, signal);
  const histogram  = macdLine.map((v, i) =>
    v != null && signalLine[i] != null ? (v as number) - (signalLine[i] as number) : null
  );
  return { macd: macdLine, signal: signalLine, histogram };
}

export function stoch(
  closeS: (number | null)[], highS: (number | null)[], lowS: (number | null)[],
  k = 14, dSmooth = 3, smooth = 3
): { k: (number | null)[]; d: (number | null)[] } {
  const rawK = closeS.map((c, i) => {
    if (c == null || i < k - 1) return null;
    const highs  = highS.slice(i - k + 1, i + 1).filter(v => v != null) as number[];
    const lows   = lowS.slice(i - k + 1,  i + 1).filter(v => v != null) as number[];
    if (!highs.length) return null;
    const maxH = Math.max(...highs), minL = Math.min(...lows);
    return maxH === minL ? 0 : ((c as number) - minL) / (maxH - minL) * 100;
  });
  const smoothK = sma(rawK, smooth);
  const smoothD = sma(smoothK, dSmooth);
  return { k: smoothK, d: smoothD };
}

export function bb(
  series: (number | null)[], length = 20, mult = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = sma(series, length);
  const stddev = series.map((_, i) => {
    if (i < length - 1) return null;
    const slice = series.slice(i - length + 1, i + 1).filter(v => v != null) as number[];
    if (slice.length < length) return null;
    const mean = slice.reduce((a, b) => a + b, 0) / length;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / length;
    return Math.sqrt(variance);
  });
  return {
    upper:  middle.map((m, i) => m != null && stddev[i] != null ? (m as number) + mult * (stddev[i] as number) : null),
    middle,
    lower:  middle.map((m, i) => m != null && stddev[i] != null ? (m as number) - mult * (stddev[i] as number) : null),
  };
}

export function keltner(
  closeS: (number | null)[], highS: (number | null)[], lowS: (number | null)[],
  length = 20, mult = 2, atrLength = 14
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = ema(closeS, length);
  const atrSeries = atr(closeS, highS, lowS, atrLength);
  return {
    upper:  middle.map((m, i) => m != null && atrSeries[i] != null ? (m as number) + mult * (atrSeries[i] as number) : null),
    middle,
    lower:  middle.map((m, i) => m != null && atrSeries[i] != null ? (m as number) - mult * (atrSeries[i] as number) : null),
  };
}

export function atr(
  closeS: (number | null)[], highS: (number | null)[], lowS: (number | null)[],
  length = 14
): (number | null)[] {
  const tr: (number | null)[] = [null];
  for (let i = 1; i < closeS.length; i++) {
    const h = highS[i], l = lowS[i], pc = closeS[i - 1];
    if (h == null || l == null || pc == null) { tr.push(null); continue; }
    tr.push(Math.max((h as number) - (l as number), Math.abs((h as number) - (pc as number)), Math.abs((l as number) - (pc as number))));
  }
  return rma(tr, length);
}

export function cci(
  closeS: (number | null)[], highS: (number | null)[], lowS: (number | null)[],
  length = 20
): (number | null)[] {
  const tp = closeS.map((c, i) => c != null && highS[i] != null && lowS[i] != null
    ? ((c as number) + (highS[i] as number) + (lowS[i] as number)) / 3 : null);
  return tp.map((_, i) => {
    if (i < length - 1) return null;
    const slice = tp.slice(i - length + 1, i + 1).filter(v => v != null) as number[];
    if (slice.length < length) return null;
    const mean = slice.reduce((a, b) => a + b, 0) / length;
    const md = slice.reduce((a, b) => a + Math.abs(b - mean), 0) / length;
    const curr = tp[i];
    return md === 0 ? 0 : ((curr as number) - mean) / (0.015 * md);
  });
}

export function williamsr(
  closeS: (number | null)[], highS: (number | null)[], lowS: (number | null)[],
  length = 14
): (number | null)[] {
  return closeS.map((c, i) => {
    if (c == null || i < length - 1) return null;
    const highs = highS.slice(i - length + 1, i + 1).filter(v => v != null) as number[];
    const lows  = lowS.slice(i - length + 1,  i + 1).filter(v => v != null) as number[];
    const maxH  = Math.max(...highs), minL = Math.min(...lows);
    return maxH === minL ? -50 : ((maxH - (c as number)) / (maxH - minL)) * -100;
  });
}

export function mfi(
  closeS: (number | null)[], highS: (number | null)[], lowS: (number | null)[],
  volumeS: (number | null)[], length = 14
): (number | null)[] {
  const tp  = closeS.map((c, i) => c != null && highS[i] != null && lowS[i] != null
    ? ((c as number) + (highS[i] as number) + (lowS[i] as number)) / 3 : null);
  const mfv = tp.map((t, i) => t != null && volumeS[i] != null ? (t as number) * (volumeS[i] as number) : null);
  return tp.map((_, i) => {
    if (i < length) return null;
    let pf = 0, nf = 0;
    for (let j = i - length + 1; j <= i; j++) {
      const prev = tp[j - 1];
      const curr = tp[j];
      if (prev == null || curr == null || mfv[j] == null) continue;
      if ((curr as number) > (prev as number)) pf += mfv[j] as number;
      else nf += mfv[j] as number;
    }
    return nf === 0 ? 100 : 100 - 100 / (1 + pf / nf);
  });
}

export function vwap(
  closeS: (number | null)[], highS: (number | null)[], lowS: (number | null)[],
  volumeS: (number | null)[]
): (number | null)[] {
  let cumPV = 0, cumV = 0;
  return closeS.map((c, i) => {
    if (c == null || highS[i] == null || lowS[i] == null || volumeS[i] == null) return null;
    const tp = ((c as number) + (highS[i] as number) + (lowS[i] as number)) / 3;
    cumPV += tp * (volumeS[i] as number);
    cumV  += volumeS[i] as number;
    return cumV === 0 ? null : cumPV / cumV;
  });
}

export function obv(closeS: (number | null)[], volumeS: (number | null)[]): (number | null)[] {
  const out: (number | null)[] = [volumeS[0]];
  for (let i = 1; i < closeS.length; i++) {
    const prev = out[i - 1];
    const c = closeS[i], pc = closeS[i - 1], v = volumeS[i];
    if (c == null || pc == null || v == null || prev == null) { out.push(null); continue; }
    if ((c as number) > (pc as number)) out.push((prev as number) + (v as number));
    else if ((c as number) < (pc as number)) out.push((prev as number) - (v as number));
    else out.push(prev);
  }
  return out;
}

export function supertrend(
  closeS: (number | null)[], highS: (number | null)[], lowS: (number | null)[],
  mult = 3, atrLen = 10
): { trend: (number | null)[]; direction: (1 | -1 | null)[] } {
  const atrS  = atr(closeS, highS, lowS, atrLen);
  const trend: (number | null)[]    = new Array(closeS.length).fill(null);
  const dir:   (1 | -1 | null)[]   = new Array(closeS.length).fill(null);
  let upTrend = 0, dnTrend = 0, prevDir = 1;

  for (let i = 1; i < closeS.length; i++) {
    const c = closeS[i], h = highS[i], l = lowS[i], a = atrS[i];
    if (c == null || h == null || l == null || a == null) continue;
    const hl2  = ((h as number) + (l as number)) / 2;
    const upB  = hl2 - mult * (a as number);
    const dnB  = hl2 + mult * (a as number);
    upTrend = upB > upTrend ? upB : upTrend;
    dnTrend = dnB < dnTrend ? dnB : dnTrend;
    if ((c as number) > dnTrend) { prevDir = 1;  dir[i] = 1;  trend[i] = upTrend; upTrend = upB; }
    else                         { prevDir = -1; dir[i] = -1; trend[i] = dnTrend; dnTrend = dnB; }
  }
  return { trend, direction: dir };
}

export function donchian(
  highS: (number | null)[], lowS: (number | null)[], length = 20
): { upper: (number | null)[]; lower: (number | null)[]; mid: (number | null)[] } {
  const upper = highS.map((_, i) => {
    if (i < length - 1) return null;
    return Math.max(...(highS.slice(i - length + 1, i + 1).filter(v => v != null) as number[]));
  });
  const lower = lowS.map((_, i) => {
    if (i < length - 1) return null;
    return Math.min(...(lowS.slice(i - length + 1, i + 1).filter(v => v != null) as number[]));
  });
  const mid = upper.map((u, i) => u != null && lower[i] != null ? ((u as number) + (lower[i] as number)) / 2 : null);
  return { upper, lower, mid };
}

export function roc(series: (number | null)[], length = 9): (number | null)[] {
  return series.map((v, i) => {
    if (v == null || i < length) return null;
    const prev = series[i - length];
    if (prev == null || prev === 0) return null;
    return ((v as number) - (prev as number)) / (prev as number) * 100;
  });
}

/* ── True Range (per-bar, no smoothing) ────────────────────── */
export function trueRange(
  closeS: (number | null)[], highS: (number | null)[], lowS: (number | null)[], handleNaN = true
): (number | null)[] {
  return closeS.map((_, i) => {
    const h = highS[i], l = lowS[i], pc = i > 0 ? closeS[i - 1] : null;
    if (h == null || l == null) return null;
    if (pc == null) return handleNaN ? (h as number) - (l as number) : null;
    return Math.max(
      (h as number) - (l as number),
      Math.abs((h as number) - (pc as number)),
      Math.abs((l as number) - (pc as number)),
    );
  });
}

/* ── Cumulative sum ────────────────────────────────────────── */
export function cum(series: (number | null)[]): (number | null)[] {
  let acc = 0;
  return series.map(v => { if (v == null) return acc || null; acc += v as number; return acc; });
}

/* ── Linear regression (endpoint of the fitted line) ───────── */
export function linreg(series: (number | null)[], length: number, offset = 0): (number | null)[] {
  return series.map((_, i) => {
    if (i < length - 1) return null;
    const sl = series.slice(i - length + 1, i + 1);
    if (sl.some(v => v == null)) return null;
    const n = length;
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (let j = 0; j < n; j++) {
      const x = j, y = sl[j] as number;
      sx += x; sy += y; sxy += x * y; sxx += x * x;
    }
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1);
    const intercept = (sy - slope * sx) / n;
    return intercept + slope * (n - 1 - offset);
  });
}

/* ── Percent rank of current value over lookback ───────────── */
export function percentrank(series: (number | null)[], length: number): (number | null)[] {
  return series.map((v, i) => {
    if (v == null || i < length) return null;
    const sl = series.slice(i - length, i).filter(x => x != null) as number[];
    if (!sl.length) return null;
    const below = sl.filter(x => x < (v as number)).length;
    return (below / sl.length) * 100;
  });
}

/* ── Median over lookback ──────────────────────────────────── */
export function median(series: (number | null)[], length: number): (number | null)[] {
  return series.map((_, i) => {
    if (i < length - 1) return null;
    const sl = (series.slice(i - length + 1, i + 1).filter(v => v != null) as number[]).sort((a, b) => a - b);
    if (!sl.length) return null;
    const m = Math.floor(sl.length / 2);
    return sl.length % 2 ? sl[m] : (sl[m - 1] + sl[m]) / 2;
  });
}

/* ── Pivot high / low (leftbars/rightbars fractal) ─────────── */
export function pivot(series: (number | null)[], left: number, right: number, high: boolean): (number | null)[] {
  const out: (number | null)[] = new Array(series.length).fill(null);
  for (let i = left; i < series.length - right; i++) {
    const c = series[i];
    if (c == null) continue;
    let isPivot = true;
    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue;
      const o = series[j];
      if (o == null) { isPivot = false; break; }
      if (high ? (o as number) > (c as number) : (o as number) < (c as number)) { isPivot = false; break; }
    }
    // Pine reports the pivot `right` bars later (confirmation delay)
    if (isPivot) out[i + right] = c as number;
  }
  return out;
}

/* ── Parabolic SAR ─────────────────────────────────────────── */
export function sar(
  highS: (number | null)[], lowS: (number | null)[], start = 0.02, inc = 0.02, max = 0.2
): (number | null)[] {
  const out: (number | null)[] = new Array(highS.length).fill(null);
  if (highS.length < 2) return out;
  let uptrend = true;
  let af = start;
  let ep = highS[0] as number;
  let sarV = lowS[0] as number;
  for (let i = 1; i < highS.length; i++) {
    const h = highS[i] as number, l = lowS[i] as number;
    if (h == null || l == null) { out[i] = sarV; continue; }
    sarV = sarV + af * (ep - sarV);
    if (uptrend) {
      if (l < sarV) { uptrend = false; sarV = ep; ep = l; af = start; }
      else if (h > ep) { ep = h; af = Math.min(max, af + inc); }
    } else {
      if (h > sarV) { uptrend = true; sarV = ep; ep = h; af = start; }
      else if (l < ep) { ep = l; af = Math.min(max, af + inc); }
    }
    out[i] = sarV;
  }
  return out;
}

/* ── Math namespace ────────────────────────────────────────── */
export const mathFns = {
  abs:   (x: number) => Math.abs(x),
  ceil:  (x: number) => Math.ceil(x),
  floor: (x: number) => Math.floor(x),
  round: (x: number) => Math.round(x),
  sqrt:  (x: number) => Math.sqrt(x),
  pow:   (x: number, y: number) => Math.pow(x, y),
  log:   (x: number) => Math.log(x),
  exp:   (x: number) => Math.exp(x),
  max:   (...args: number[]) => Math.max(...args),
  min:   (...args: number[]) => Math.min(...args),
  sign:  (x: number) => Math.sign(x),
  sin:   (x: number) => Math.sin(x),
  cos:   (x: number) => Math.cos(x),
  tan:   (x: number) => Math.tan(x),
  pi:    Math.PI,
  e:     Math.E,
  phi:   1.618033988749895,
  rphi:  0.6180339887498949,
  nan:   NaN,
  huge:  1e308,
};

/* ── Color helpers ─────────────────────────────────────────── */
export function colorFromPine(val: string): string {
  const map: Record<string, string> = {
    "color.green":   "#00D4AA",
    "color.red":     "#FF4D6A",
    "color.blue":    "#4FA3E0",
    "color.yellow":  "#F0B429",
    "color.orange":  "#F97316",
    "color.purple":  "#8B5CF6",
    "color.white":   "#FFFFFF",
    "color.black":   "#000000",
    "color.gray":    "#8B95A5",
    "color.silver":  "#C0C0C0",
    "color.lime":    "#00FF7F",
    "color.teal":    "#008080",
    "color.aqua":    "#00FFFF",
    "color.navy":    "#000080",
    "color.fuchsia": "#FF00FF",
    "color.maroon":  "#800000",
    "color.olive":   "#808000",
  };
  return map[val] ?? val;
}

/* ── The full ta namespace ────────────────────────────────── */
export const ta = {
  sma, ema, wma, hma, rma, dema, tema,
  rsi, macd, stoch, bb, keltner, atr, cci,
  williamsr, mfi, vwap, obv, supertrend, donchian, roc,
  tr: trueRange, cum, linreg, percentrank, median, pivot, sar,
  lowest:  (series: (number | null)[], len: number) => series.map((_, i) =>
    i < len - 1 ? null : Math.min(...(series.slice(i - len + 1, i + 1).filter(v => v != null) as number[]))),
  highest: (series: (number | null)[], len: number) => series.map((_, i) =>
    i < len - 1 ? null : Math.max(...(series.slice(i - len + 1, i + 1).filter(v => v != null) as number[]))),
  stdev:   (series: (number | null)[], len: number) => series.map((_, i) => {
    if (i < len - 1) return null;
    const sl = series.slice(i - len + 1, i + 1).filter(v => v != null) as number[];
    const mean = sl.reduce((a, b) => a + b, 0) / len;
    return Math.sqrt(sl.reduce((a, b) => a + (b - mean) ** 2, 0) / len);
  }),
  variance: (series: (number | null)[], len: number) => series.map((_, i) => {
    if (i < len - 1) return null;
    const sl = series.slice(i - len + 1, i + 1).filter(v => v != null) as number[];
    const mean = sl.reduce((a, b) => a + b, 0) / len;
    return sl.reduce((a, b) => a + (b - mean) ** 2, 0) / len;
  }),
  crossover:  (a: (number | null)[], b: (number | null)[]) => a.map((v, i) =>
    i === 0 || v == null || b[i] == null || a[i-1] == null || b[i-1] == null
      ? false : (a[i-1] as number) < (b[i-1] as number) && (v as number) >= (b[i] as number)),
  crossunder: (a: (number | null)[], b: (number | null)[]) => a.map((v, i) =>
    i === 0 || v == null || b[i] == null || a[i-1] == null || b[i-1] == null
      ? false : (a[i-1] as number) > (b[i-1] as number) && (v as number) <= (b[i] as number)),
  rising:  (series: (number | null)[], len: number) => series.map((v, i) => {
    if (v == null || i < len) return false;
    for (let j = 1; j <= len; j++) {
      const prev = series[i - j];
      if (prev == null || (prev as number) >= (v as number)) return false;
    }
    return true;
  }),
  falling: (series: (number | null)[], len: number) => series.map((v, i) => {
    if (v == null || i < len) return false;
    for (let j = 1; j <= len; j++) {
      const prev = series[i - j];
      if (prev == null || (prev as number) <= (v as number)) return false;
    }
    return true;
  }),
  change: (series: (number | null)[], len = 1) => series.map((v, i) =>
    v != null && i >= len && series[i - len] != null ? (v as number) - (series[i - len] as number) : null),
  mom:    (series: (number | null)[], len: number) => series.map((v, i) =>
    v != null && i >= len && series[i - len] != null ? (v as number) - (series[i - len] as number) : null),
  sum:    (series: (number | null)[], len: number) => series.map((_, i) => {
    if (i < len - 1) return null;
    const sl = series.slice(i - len + 1, i + 1);
    if (sl.some(v => v == null)) return null;
    return (sl as number[]).reduce((a, b) => a + b, 0);
  }),
  barssince: (cond: boolean[]) => {
    const out: (number | null)[] = [];
    let count: number | null = null;
    for (const c of cond) {
      if (c) count = 0;
      else if (count != null) count++;
      out.push(count);
    }
    return out;
  },
  valuewhen: (cond: boolean[], src: (number | null)[], occurrence = 0) => {
    const out: (number | null)[] = [];
    const found: (number | null)[] = [];
    for (let i = 0; i < src.length; i++) {
      if (cond[i] && src[i] != null) found.unshift(src[i]);
      out.push(found[occurrence] ?? null);
    }
    return out;
  },
};
