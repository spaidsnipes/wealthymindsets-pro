/**
 * WealthyMindsets Pro — Indicator Library
 * All computations are pure functions: (bars | closes, params) → number[]
 * Sub-pane oscillators return { values, scaleId } for easy rendering.
 */

export interface Bar { time: number; open: number; high: number; low: number; close: number; volume: number; }

/* ─── Helpers ──────────────────────────────────────────────────── */
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const nz = (v: number, d = 0) => isFinite(v) && !isNaN(v) ? v : d;

/* ─── Moving Averages ──────────────────────────────────────────── */
export function sma(src: number[], p: number): number[] {
  return src.map((_, i) => {
    if (i < p - 1) return NaN;
    let s = 0; for (let j = 0; j < p; j++) s += src[i - j]; return s / p;
  });
}

export function ema(src: number[], p: number): number[] {
  const k = 2 / (p + 1); const out: number[] = [];
  for (let i = 0; i < src.length; i++) {
    if (i === 0) { out.push(src[0]); continue; }
    out.push(src[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

export function wma(src: number[], p: number): number[] {
  return src.map((_, i) => {
    if (i < p - 1) return NaN;
    let s = 0, w = 0;
    for (let j = 0; j < p; j++) { s += src[i - j] * (p - j); w += (p - j); }
    return s / w;
  });
}

export function hma(src: number[], p: number): number[] {
  const half = wma(src, Math.floor(p / 2));
  const full = wma(src, p);
  const raw = src.map((_, i) => isFinite(half[i]) && isFinite(full[i]) ? 2 * half[i] - full[i] : NaN);
  return wma(raw, Math.round(Math.sqrt(p)));
}

export function dema(src: number[], p: number): number[] {
  const e1 = ema(src, p); const e2 = ema(e1, p);
  return src.map((_, i) => 2 * e1[i] - e2[i]);
}

export function tema(src: number[], p: number): number[] {
  const e1 = ema(src, p); const e2 = ema(e1, p); const e3 = ema(e2, p);
  return src.map((_, i) => 3 * e1[i] - 3 * e2[i] + e3[i]);
}

export function zlema(src: number[], p: number): number[] {
  const lag = Math.floor((p - 1) / 2);
  const adjusted = src.map((v, i) => i >= lag ? 2 * v - src[i - lag] : v);
  return ema(adjusted, p);
}

export function alma(src: number[], p = 9, sigma = 6, offset = 0.85): number[] {
  const m = offset * (p - 1);
  const s = p / sigma;
  const wts: number[] = [];
  let wsum = 0;
  for (let i = 0; i < p; i++) { wts[i] = Math.exp(-((i - m) ** 2) / (2 * s * s)); wsum += wts[i]; }
  return src.map((_, i) => {
    if (i < p - 1) return NaN;
    let v = 0; for (let j = 0; j < p; j++) v += src[i - j] * wts[p - 1 - j];
    return v / wsum;
  });
}

export function t3(src: number[], p = 5, v = 0.7): number[] {
  const gd = (s: number[], _p: number) => { const e1 = ema(s, _p); const e2 = ema(e1, _p); return s.map((_, i) => (1 + v) * e1[i] - v * e2[i]); };
  return gd(gd(gd(src, p), p), p);
}

export function kama(src: number[], p = 10, fast = 2, slow = 30): number[] {
  const fastK = 2 / (fast + 1); const slowK = 2 / (slow + 1);
  const out: number[] = new Array(src.length).fill(NaN);
  if (src.length < p) return out;
  out[p - 1] = src[p - 1];
  for (let i = p; i < src.length; i++) {
    const dir = Math.abs(src[i] - src[i - p]);
    let noise = 0; for (let j = 0; j < p; j++) noise += Math.abs(src[i - j] - src[i - j - 1]);
    const er = noise > 0 ? dir / noise : 0;
    const sc = (er * (fastK - slowK) + slowK) ** 2;
    out[i] = out[i - 1] + sc * (src[i] - out[i - 1]);
  }
  return out;
}

export function mcginley(src: number[], p = 14): number[] {
  const out: number[] = [];
  for (let i = 0; i < src.length; i++) {
    if (i === 0) { out.push(src[0]); continue; }
    const prev = out[i - 1];
    out.push(prev + (src[i] - prev) / (p * Math.pow(src[i] / prev, 4)));
  }
  return out;
}

export function vwma(bars: Bar[], p: number): number[] {
  return bars.map((_, i) => {
    if (i < p - 1) return NaN;
    let pv = 0, v = 0;
    for (let j = 0; j < p; j++) { pv += bars[i - j].close * bars[i - j].volume; v += bars[i - j].volume; }
    return v > 0 ? pv / v : NaN;
  });
}

export function maRibbon(src: number[], periods = [8,13,21,34,55,89]): number[][] {
  return periods.map(p => ema(src, p));
}

/* ─── Trend / Channels ─────────────────────────────────────────── */
export function bollingerBands(src: number[], p = 20, mult = 2): { upper: number[]; mid: number[]; lower: number[] } {
  const mid = sma(src, p);
  const upper: number[] = []; const lower: number[] = [];
  src.forEach((_, i) => {
    if (i < p - 1) { upper.push(NaN); lower.push(NaN); return; }
    let ss = 0; for (let j = 0; j < p; j++) ss += (src[i - j] - mid[i]) ** 2;
    const std = Math.sqrt(ss / p);
    upper.push(mid[i] + mult * std); lower.push(mid[i] - mult * std);
  });
  return { upper, mid, lower };
}

export function bbWidth(src: number[], p = 20, mult = 2): number[] {
  const bb = bollingerBands(src, p, mult);
  return src.map((_, i) => isFinite(bb.mid[i]) ? (bb.upper[i] - bb.lower[i]) / bb.mid[i] * 100 : NaN);
}

export function stdDev(src: number[], p = 20): number[] {
  const m = sma(src, p);
  return src.map((_, i) => {
    if (i < p - 1) return NaN;
    let ss = 0; for (let j = 0; j < p; j++) ss += (src[i - j] - m[i]) ** 2;
    return Math.sqrt(ss / p);
  });
}

export function keltner(bars: Bar[], p = 20, mult = 2): { upper: number[]; mid: number[]; lower: number[] } {
  const closes = bars.map(b => b.close);
  const mid = ema(closes, p);
  const atrVals = atr(bars, p);
  return {
    upper: bars.map((_, i) => mid[i] + mult * atrVals[i]),
    mid,
    lower: bars.map((_, i) => mid[i] - mult * atrVals[i]),
  };
}

export function kcWidth(bars: Bar[], p = 20, mult = 2): number[] {
  const kc = keltner(bars, p, mult);
  return bars.map((_, i) => isFinite(kc.mid[i]) ? (kc.upper[i] - kc.lower[i]) / kc.mid[i] * 100 : NaN);
}

export function donchian(bars: Bar[], p = 20): { upper: number[]; mid: number[]; lower: number[] } {
  const upper: number[] = []; const lower: number[] = [];
  bars.forEach((_, i) => {
    if (i < p - 1) { upper.push(NaN); lower.push(NaN); return; }
    let hi = -Infinity, lo = Infinity;
    for (let j = 0; j < p; j++) { hi = Math.max(hi, bars[i - j].high); lo = Math.min(lo, bars[i - j].low); }
    upper.push(hi); lower.push(lo);
  });
  return { upper, mid: upper.map((u, i) => (u + lower[i]) / 2), lower };
}

export function donchianWidth(bars: Bar[], p = 20): number[] {
  const dc = donchian(bars, p);
  return bars.map((_, i) => isFinite(dc.upper[i]) ? dc.upper[i] - dc.lower[i] : NaN);
}

export function envelope(src: number[], p = 20, pct = 2.5): { upper: number[]; mid: number[]; lower: number[] } {
  const mid = sma(src, p);
  return { upper: mid.map(v => v * (1 + pct / 100)), mid, lower: mid.map(v => v * (1 - pct / 100)) };
}

export function priceChannel(bars: Bar[], p = 20): { upper: number[]; lower: number[] } {
  const upper: number[] = []; const lower: number[] = [];
  bars.forEach((_, i) => {
    if (i < p - 1) { upper.push(NaN); lower.push(NaN); return; }
    let hi = -Infinity, lo = Infinity;
    for (let j = 0; j < p; j++) { hi = Math.max(hi, bars[i - j].high); lo = Math.min(lo, bars[i - j].low); }
    upper.push(hi); lower.push(lo);
  });
  return { upper, lower };
}

export function linearRegression(src: number[], p = 14): number[] {
  return src.map((_, i) => {
    if (i < p - 1) return NaN;
    let sx = 0, sy = 0, sxy = 0, sx2 = 0;
    for (let j = 0; j < p; j++) { sx += j; sy += src[i - p + 1 + j]; sxy += j * src[i - p + 1 + j]; sx2 += j * j; }
    const slope = (p * sxy - sx * sy) / (p * sx2 - sx * sx);
    const intercept = (sy - slope * sx) / p;
    return intercept + slope * (p - 1);
  });
}

export function linearRegressionChannel(src: number[], p = 100): { upper: number[]; mid: number[]; lower: number[] } {
  const mid: number[] = []; const dev: number[] = [];
  src.forEach((_, i) => {
    if (i < p - 1) { mid.push(NaN); dev.push(NaN); return; }
    let sx = 0, sy = 0, sxy = 0, sx2 = 0;
    for (let j = 0; j < p; j++) { sx += j; sy += src[i - p + 1 + j]; sxy += j * src[i - p + 1 + j]; sx2 += j * j; }
    const slope = (p * sxy - sx * sy) / (p * sx2 - sx * sx);
    const intercept = (sy - slope * sx) / p;
    const line = intercept + slope * (p - 1);
    let ss = 0;
    for (let j = 0; j < p; j++) { const y = intercept + slope * j; ss += (src[i - p + 1 + j] - y) ** 2; }
    mid.push(line); dev.push(Math.sqrt(ss / p));
  });
  return { upper: mid.map((m, i) => m + 2 * nz(dev[i])), mid, lower: mid.map((m, i) => m - 2 * nz(dev[i])) };
}

export function parabolicSAR(bars: Bar[], step = 0.02, max = 0.2): number[] {
  const out: number[] = new Array(bars.length).fill(NaN);
  if (bars.length < 2) return out;
  let bull = true, sar = bars[0].low, ep = bars[0].high, af = step;
  out[0] = sar;
  for (let i = 1; i < bars.length; i++) {
    const prev = out[i - 1];
    let newSar = prev + af * (ep - prev);
    if (bull) {
      newSar = Math.min(newSar, bars[i - 1].low, i > 1 ? bars[i - 2].low : bars[i - 1].low);
      if (bars[i].high > ep) { ep = bars[i].high; af = Math.min(af + step, max); }
      if (bars[i].low < newSar) { bull = false; newSar = ep; ep = bars[i].low; af = step; }
    } else {
      newSar = Math.max(newSar, bars[i - 1].high, i > 1 ? bars[i - 2].high : bars[i - 1].high);
      if (bars[i].low < ep) { ep = bars[i].low; af = Math.min(af + step, max); }
      if (bars[i].high > newSar) { bull = true; newSar = ep; ep = bars[i].high; af = step; }
    }
    out[i] = newSar;
  }
  return out;
}

export function supertrend(bars: Bar[], p = 10, mult = 3): { line: number[]; dir: number[] } {
  const atrVals = atr(bars, p);
  const line: number[] = new Array(bars.length).fill(NaN);
  const dir: number[] = new Array(bars.length).fill(1);
  for (let i = 1; i < bars.length; i++) {
    if (!isFinite(atrVals[i])) continue;
    const hl2 = (bars[i].high + bars[i].low) / 2;
    const upperBand = hl2 + mult * atrVals[i];
    const lowerBand = hl2 - mult * atrVals[i];
    const prevLine = line[i - 1];
    const prevDir = dir[i - 1];
    if (!isFinite(prevLine)) { line[i] = lowerBand; dir[i] = 1; continue; }
    if (prevDir === 1) {
      line[i] = Math.max(lowerBand, prevLine);
      dir[i] = bars[i].close < line[i] ? -1 : 1;
    } else {
      line[i] = Math.min(upperBand, prevLine);
      dir[i] = bars[i].close > line[i] ? 1 : -1;
    }
  }
  return { line, dir };
}

export function alligator(bars: Bar[]): { jaw: number[]; teeth: number[]; lips: number[] } {
  const hl2 = bars.map(b => (b.high + b.low) / 2);
  const rawJaw = sma(hl2, 13); const rawTeeth = sma(hl2, 8); const rawLips = sma(hl2, 5);
  const shift = (arr: number[], n: number) => [...new Array(n).fill(NaN), ...arr.slice(0, arr.length - n)];
  return { jaw: shift(rawJaw, 8), teeth: shift(rawTeeth, 5), lips: shift(rawLips, 3) };
}

export function ichimoku(bars: Bar[]): { tenkan: number[]; kijun: number[]; senkouA: number[]; senkouB: number[]; chikou: number[] } {
  const highest = (n: number, i: number) => { let h = -Infinity; for (let j = 0; j < n && i - j >= 0; j++) h = Math.max(h, bars[i - j].high); return h; };
  const lowest  = (n: number, i: number) => { let l = Infinity;  for (let j = 0; j < n && i - j >= 0; j++) l = Math.min(l, bars[i - j].low);  return l; };
  const tenkan:  number[] = bars.map((_, i) => (highest(9,  i) + lowest(9,  i)) / 2);
  const kijun:   number[] = bars.map((_, i) => (highest(26, i) + lowest(26, i)) / 2);
  const senkouA: number[] = bars.map((_, i) => (tenkan[i] + kijun[i]) / 2);
  const senkouB: number[] = bars.map((_, i) => (highest(52, i) + lowest(52, i)) / 2);
  const chikou:  number[] = bars.map((b, i) => i >= 26 ? bars[i - 26].close : NaN);
  return { tenkan, kijun, senkouA, senkouB, chikou };
}

export function pivotPoints(bars: Bar[], type: "standard" | "fibonacci" | "camarilla" | "woodie" | "demark" | "cpr" = "standard"): { pp: number; r1: number; r2: number; r3: number; s1: number; s2: number; s3: number; tc?: number; bc?: number } {
  if (bars.length < 1) return { pp: 0, r1: 0, r2: 0, r3: 0, s1: 0, s2: 0, s3: 0 };
  const b = bars[bars.length - 1];
  const H = b.high, L = b.low, C = b.close, O = b.open;
  const HL = H - L;

  if (type === "standard") {
    const pp = (H + L + C) / 3;
    return { pp, r1: 2*pp - L, r2: pp + HL, r3: H + 2*(pp - L), s1: 2*pp - H, s2: pp - HL, s3: L - 2*(H - pp) };
  }
  if (type === "fibonacci") {
    const pp = (H + L + C) / 3;
    return { pp, r1: pp + 0.382*HL, r2: pp + 0.618*HL, r3: pp + 1.000*HL, s1: pp - 0.382*HL, s2: pp - 0.618*HL, s3: pp - 1.000*HL };
  }
  if (type === "camarilla") {
    const pp = (H + L + C) / 3;
    return { pp, r1: C + 1.0833*HL, r2: C + 1.1666*HL, r3: C + 1.2500*HL, s1: C - 1.0833*HL, s2: C - 1.1666*HL, s3: C - 1.2500*HL };
  }
  if (type === "woodie") {
    const pp = (H + L + 2*C) / 4;
    return { pp, r1: 2*pp - L, r2: pp + HL, r3: H + 2*(pp - L), s1: 2*pp - H, s2: pp - HL, s3: L - 2*(H - pp) };
  }
  if (type === "demark") {
    const x = C < O ? H + 2*L + C : C > O ? 2*H + L + C : H + L + 2*C;
    const pp = x / 4;
    return { pp, r1: x/2 - L, r2: NaN, r3: NaN, s1: x/2 - H, s2: NaN, s3: NaN };
  }
  // CPR
  const pp = (H + L + C) / 3;
  const tc = (H + L) / 2;
  const bc = 2*pp - tc;
  return { pp, r1: 2*pp - L, r2: pp + HL, r3: H + 2*(pp-L), s1: 2*pp-H, s2: pp-HL, s3: L-2*(H-pp), tc, bc };
}

/* ─── ATR / Volatility ─────────────────────────────────────────── */
export function atr(bars: Bar[], p = 14): number[] {
  const tr: number[] = bars.map((b, i) => i === 0 ? b.high - b.low : Math.max(b.high - b.low, Math.abs(b.high - bars[i-1].close), Math.abs(b.low - bars[i-1].close)));
  const out: number[] = new Array(bars.length).fill(NaN);
  if (bars.length < p) return out;
  let sum = 0; for (let i = 0; i < p; i++) sum += tr[i];
  out[p - 1] = sum / p;
  for (let i = p; i < bars.length; i++) out[i] = (out[i - 1] * (p - 1) + tr[i]) / p;
  return out;
}

export function normalizedAtr(bars: Bar[], p = 14): number[] {
  const atrVals = atr(bars, p);
  return bars.map((b, i) => isFinite(atrVals[i]) ? (atrVals[i] / b.close) * 100 : NaN);
}

export function historicalVolatility(src: number[], p = 20): number[] {
  const logRet = src.map((v, i) => i === 0 ? NaN : Math.log(v / src[i - 1]));
  return src.map((_, i) => {
    if (i < p) return NaN;
    const slice = logRet.slice(i - p + 1, i + 1).filter(isFinite);
    const mean = slice.reduce((s, v) => s + v, 0) / slice.length;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length;
    return Math.sqrt(variance * 252) * 100;
  });
}

export function volatilityStop(bars: Bar[], p = 20, mult = 1.5): { upper: number[]; lower: number[] } {
  const atrVals = atr(bars, p);
  const closes = bars.map(b => b.close);
  const upper = bars.map((_, i) => closes[i] + mult * nz(atrVals[i]));
  const lower = bars.map((_, i) => closes[i] - mult * nz(atrVals[i]));
  return { upper, lower };
}

export function massIndex(bars: Bar[], p = 9, q = 25): number[] {
  const hl = bars.map(b => b.high - b.low);
  const e1 = ema(hl, p); const e2 = ema(e1, p);
  const ratio = e1.map((v, i) => e2[i] > 0 ? v / e2[i] : NaN);
  return ratio.map((_, i) => {
    if (i < q - 1) return NaN;
    let s = 0; for (let j = 0; j < q; j++) s += nz(ratio[i - j]); return s;
  });
}

export function ulcerIndex(src: number[], p = 14): number[] {
  return src.map((_, i) => {
    if (i < p - 1) return NaN;
    let maxClose = -Infinity;
    for (let j = 0; j < p; j++) maxClose = Math.max(maxClose, src[i - j]);
    let ss = 0;
    for (let j = 0; j < p; j++) ss += ((src[i - j] - maxClose) / maxClose * 100) ** 2;
    return Math.sqrt(ss / p);
  });
}

/* ─── Momentum / Oscillators ───────────────────────────────────── */
export function rsi(src: number[], p = 14): number[] {
  const out: number[] = new Array(src.length).fill(NaN);
  let avgG = 0, avgL = 0;
  for (let i = 1; i <= p; i++) { const d = src[i] - src[i - 1]; if (d > 0) avgG += d; else avgL -= d; }
  avgG /= p; avgL /= p;
  out[p] = 100 - 100 / (1 + (avgL > 0 ? avgG / avgL : 100));
  for (let i = p + 1; i < src.length; i++) {
    const d = src[i] - src[i - 1];
    avgG = (avgG * (p - 1) + (d > 0 ? d : 0)) / p;
    avgL = (avgL * (p - 1) + (d < 0 ? -d : 0)) / p;
    out[i] = 100 - 100 / (1 + (avgL > 0 ? avgG / avgL : 100));
  }
  return out;
}

export function connorsRsi(src: number[], rsiP = 3, streakP = 2, pctRankP = 100): number[] {
  const rsiVals = rsi(src, rsiP);
  const streaks: number[] = new Array(src.length).fill(0);
  for (let i = 1; i < src.length; i++) {
    const d = src[i] - src[i - 1];
    if (d > 0) streaks[i] = Math.max(1, streaks[i - 1] + 1);
    else if (d < 0) streaks[i] = Math.min(-1, streaks[i - 1] - 1);
  }
  const streakRsi = rsi(streaks, streakP);
  const pctRank = src.map((_, i) => {
    if (i < pctRankP) return NaN;
    const roc = src[i] / src[i - 1] - 1;
    let count = 0;
    for (let j = 0; j < pctRankP; j++) {
      const r = src[i - j] / (src[i - j - 1] || src[i - j]) - 1;
      if (r <= roc) count++;
    }
    return (count / pctRankP) * 100;
  });
  return src.map((_, i) => (nz(rsiVals[i]) + nz(streakRsi[i]) + nz(pctRank[i])) / 3);
}

export function stochRsi(src: number[], rsiP = 14, stochP = 14, smoothK = 3, smoothD = 3): { k: number[]; d: number[] } {
  const rsiVals = rsi(src, rsiP);
  const rawK = rsiVals.map((_, i) => {
    if (i < stochP - 1) return NaN;
    let hi = -Infinity, lo = Infinity;
    for (let j = 0; j < stochP; j++) { hi = Math.max(hi, nz(rsiVals[i - j])); lo = Math.min(lo, nz(rsiVals[i - j])); }
    return hi > lo ? (rsiVals[i] - lo) / (hi - lo) * 100 : 50;
  });
  const k = sma(rawK, smoothK);
  const d = sma(k, smoothD);
  return { k, d };
}

export function stochastic(bars: Bar[], kP = 14, dP = 3, smooth = 3): { k: number[]; d: number[] } {
  const rawK = bars.map((_, i) => {
    if (i < kP - 1) return NaN;
    let hi = -Infinity, lo = Infinity;
    for (let j = 0; j < kP; j++) { hi = Math.max(hi, bars[i - j].high); lo = Math.min(lo, bars[i - j].low); }
    return hi > lo ? (bars[i].close - lo) / (hi - lo) * 100 : 50;
  });
  const k = sma(rawK, smooth);
  const d = sma(k, dP);
  return { k, d };
}

export function stochasticMomentumIndex(bars: Bar[], p = 13, dP = 25, smooth = 2): { smi: number[]; signal: number[] } {
  const hl2 = bars.map(b => (b.high + b.low) / 2);
  const rel = bars.map((b, i) => {
    if (i < p - 1) return NaN;
    let hi = -Infinity, lo = Infinity;
    for (let j = 0; j < p; j++) { hi = Math.max(hi, bars[i-j].high); lo = Math.min(lo, bars[i-j].low); }
    return b.close - hl2[i];
  });
  const range = bars.map((_, i) => {
    if (i < p - 1) return NaN;
    let hi = -Infinity, lo = Infinity;
    for (let j = 0; j < p; j++) { hi = Math.max(hi, bars[i-j].high); lo = Math.min(lo, bars[i-j].low); }
    return hi - lo;
  });
  const smoothRel = ema(ema(rel, smooth), smooth);
  const smoothRange = ema(ema(range, smooth), smooth);
  const smi = smoothRel.map((v, i) => smoothRange[i] > 0 ? v / (smoothRange[i] / 2) * 100 : 0);
  return { smi, signal: ema(smi, dP) };
}

export function macd(src: number[], fast = 12, slow = 26, sig = 9): { line: number[]; signal: number[]; hist: number[] } {
  const fastE = ema(src, fast); const slowE = ema(src, slow);
  const line = src.map((_, i) => fastE[i] - slowE[i]);
  const signal = ema(line, sig);
  const hist = line.map((v, i) => v - signal[i]);
  return { line, signal, hist };
}

export function trix(src: number[], p = 18): number[] {
  const e1 = ema(src, p); const e2 = ema(e1, p); const e3 = ema(e2, p);
  return e3.map((v, i) => i === 0 ? 0 : (v - e3[i - 1]) / nz(e3[i - 1], 1) * 100);
}

export function ppo(src: number[], fast = 12, slow = 26, sig = 9): { ppo: number[]; signal: number[]; hist: number[] } {
  const fastE = ema(src, fast); const slowE = ema(src, slow);
  const line = src.map((_, i) => slowE[i] > 0 ? (fastE[i] - slowE[i]) / slowE[i] * 100 : 0);
  const signal = ema(line, sig);
  return { ppo: line, signal, hist: line.map((v, i) => v - signal[i]) };
}

export function dpo(src: number[], p = 20): number[] {
  const smVals = sma(src, p);
  const shift = Math.floor(p / 2) + 1;
  return src.map((v, i) => i >= shift ? v - nz(smVals[i - shift]) : NaN);
}

export function tsi(src: number[], long = 25, short = 13): number[] {
  const diff = src.map((v, i) => i === 0 ? 0 : v - src[i - 1]);
  const absDiff = diff.map(Math.abs);
  const e1 = ema(diff, long); const e2 = ema(e1, short);
  const a1 = ema(absDiff, long); const a2 = ema(a1, short);
  return src.map((_, i) => a2[i] > 0 ? (e2[i] / a2[i]) * 100 : 0);
}

export function ultimateOscillator(bars: Bar[], p1 = 7, p2 = 14, p3 = 28): number[] {
  const bp: number[] = []; const tr2: number[] = [];
  bars.forEach((b, i) => {
    const pc = i > 0 ? bars[i - 1].close : b.close;
    const trueRange = Math.max(b.high, pc) - Math.min(b.low, pc);
    bp.push(b.close - Math.min(b.low, pc));
    tr2.push(trueRange);
  });
  const avg = (p: number, i: number) => {
    if (i < p - 1) return 50;
    let sb = 0, st = 0; for (let j = 0; j < p; j++) { sb += bp[i - j]; st += tr2[i - j]; }
    return st > 0 ? sb / st : 0;
  };
  return bars.map((_, i) => 100 * (4 * avg(p1, i) + 2 * avg(p2, i) + avg(p3, i)) / 7);
}

export function rvi(bars: Bar[], p = 10): { rvi: number[]; signal: number[] } {
  const num = bars.map((b, i) => {
    if (i < 3) return 0;
    return (b.close - b.open + 2*(bars[i-1].close-bars[i-1].open) + 2*(bars[i-2].close-bars[i-2].open) + (bars[i-3].close-bars[i-3].open)) / 6;
  });
  const den = bars.map((b, i) => {
    if (i < 3) return 1;
    return (b.high - b.low + 2*(bars[i-1].high-bars[i-1].low) + 2*(bars[i-2].high-bars[i-2].low) + (bars[i-3].high-bars[i-3].low)) / 6;
  });
  const rawRvi = num.map((_, i) => {
    if (i < p - 1) return NaN;
    let sn = 0, sd = 0; for (let j = 0; j < p; j++) { sn += nz(num[i-j]); sd += nz(den[i-j]); }
    return sd > 0 ? sn / sd : 0;
  });
  const signal = rawRvi.map((_, i) => {
    if (i < 3) return NaN;
    return (nz(rawRvi[i]) + 2*nz(rawRvi[i-1]) + 2*nz(rawRvi[i-2]) + nz(rawRvi[i-3])) / 6;
  });
  return { rvi: rawRvi, signal };
}

export function awesomeOscillator(bars: Bar[]): number[] {
  const hl2 = bars.map(b => (b.high + b.low) / 2);
  const s5 = sma(hl2, 5); const s34 = sma(hl2, 34);
  return hl2.map((_, i) => s5[i] - s34[i]);
}

export function acceleratorOscillator(bars: Bar[]): number[] {
  const ao = awesomeOscillator(bars);
  const s5 = sma(ao, 5);
  return ao.map((v, i) => v - nz(s5[i]));
}

export function cci(bars: Bar[], p = 20): number[] {
  const tp = bars.map(b => (b.high + b.low + b.close) / 3);
  const tpSma = sma(tp, p);
  return tp.map((v, i) => {
    if (i < p - 1) return NaN;
    let md = 0; for (let j = 0; j < p; j++) md += Math.abs(tp[i - j] - nz(tpSma[i]));
    md /= p;
    return md > 0 ? (v - nz(tpSma[i])) / (0.015 * md) : 0;
  });
}

export function williamsR(bars: Bar[], p = 14): number[] {
  return bars.map((b, i) => {
    if (i < p - 1) return NaN;
    let hi = -Infinity, lo = Infinity;
    for (let j = 0; j < p; j++) { hi = Math.max(hi, bars[i - j].high); lo = Math.min(lo, bars[i - j].low); }
    return hi > lo ? (hi - b.close) / (hi - lo) * -100 : -50;
  });
}

export function chandeMomentum(src: number[], p = 14): number[] {
  return src.map((_, i) => {
    if (i < p) return NaN;
    let up = 0, dn = 0;
    for (let j = 0; j < p; j++) {
      const d = src[i - j] - src[i - j - 1];
      if (d > 0) up += d; else dn -= d;
    }
    return up + dn > 0 ? (up - dn) / (up + dn) * 100 : 0;
  });
}

export function balanceOfPower(bars: Bar[]): number[] {
  return bars.map(b => b.high !== b.low ? (b.close - b.open) / (b.high - b.low) : 0);
}

export function elderRayIndex(bars: Bar[], p = 13): { bull: number[]; bear: number[] } {
  const closes = bars.map(b => b.close);
  const emaVals = ema(closes, p);
  return {
    bull: bars.map((b, i) => b.high - nz(emaVals[i])),
    bear: bars.map((b, i) => b.low  - nz(emaVals[i])),
  };
}

export function forceIndex(bars: Bar[], p = 13): number[] {
  const raw = bars.map((b, i) => i === 0 ? 0 : (b.close - bars[i - 1].close) * b.volume);
  return ema(raw, p);
}

export function ttmSqueeze(bars: Bar[], bbP = 20, bbMult = 2, kcP = 20, kcMult = 1.5): { squeeze: boolean[]; hist: number[] } {
  const closes = bars.map(b => b.close);
  const bb = bollingerBands(closes, bbP, bbMult);
  const kc = keltner(bars, kcP, kcMult);
  const squeeze = bars.map((_, i) => nz(bb.lower[i]) > nz(kc.lower[i]) && nz(bb.upper[i]) < nz(kc.upper[i]));
  const val = bars.map((b, i) => {
    if (i < kcP) return 0;
    const hl2 = (b.high + b.low) / 2;
    const delta = b.close - (nz(kc.upper[i]) + nz(kc.lower[i])) / 2;
    return delta;
  });
  return { squeeze, hist: ema(val, 5) };
}

export function schaffTrendCycle(src: number[], fast = 23, slow = 50, cycle = 10): number[] {
  const macdVals = macd(src, fast, slow, 3).line;
  const stoch1 = macdVals.map((_, i) => {
    if (i < cycle - 1) return NaN;
    let hi = -Infinity, lo = Infinity;
    for (let j = 0; j < cycle; j++) { hi = Math.max(hi, nz(macdVals[i-j])); lo = Math.min(lo, nz(macdVals[i-j])); }
    return hi > lo ? (macdVals[i] - lo) / (hi - lo) * 100 : 50;
  });
  const pf = ema(stoch1, 3);
  const stoch2 = pf.map((_, i) => {
    if (i < cycle - 1) return NaN;
    let hi = -Infinity, lo = Infinity;
    for (let j = 0; j < cycle; j++) { hi = Math.max(hi, nz(pf[i-j])); lo = Math.min(lo, nz(pf[i-j])); }
    return hi > lo ? (pf[i] - lo) / (hi - lo) * 100 : 50;
  });
  return ema(stoch2, 3);
}

export function kdj(bars: Bar[], p = 9, m1 = 3, m2 = 3): { k: number[]; d: number[]; j: number[] } {
  const rawK = bars.map((b, i) => {
    if (i < p - 1) return 50;
    let hi = -Infinity, lo = Infinity;
    for (let j = 0; j < p; j++) { hi = Math.max(hi, bars[i-j].high); lo = Math.min(lo, bars[i-j].low); }
    return hi > lo ? (b.close - lo) / (hi - lo) * 100 : 50;
  });
  const k: number[] = [50]; const d: number[] = [50];
  for (let i = 1; i < bars.length; i++) {
    k.push((k[i-1] * (m1 - 1) + rawK[i]) / m1);
    d.push((d[i-1] * (m2 - 1) + k[i])   / m2);
  }
  return { k, d, j: k.map((v, i) => 3 * v - 2 * d[i]) };
}

export function coppockCurve(src: number[], wma_p = 10, roc1 = 14, roc2 = 11): number[] {
  const roc = (p: number) => src.map((v, i) => i >= p ? (v / src[i - p] - 1) * 100 : NaN);
  const combined = roc(roc1).map((v, i) => v + nz(roc(roc2)[i]));
  return wma(combined, wma_p);
}

export function aroon(bars: Bar[], p = 25): { up: number[]; down: number[]; osc: number[] } {
  const up: number[] = []; const down: number[] = [];
  bars.forEach((_, i) => {
    if (i < p) { up.push(NaN); down.push(NaN); return; }
    let hiIdx = 0, loIdx = 0;
    for (let j = 0; j <= p; j++) {
      if (bars[i-j].high >= bars[i-hiIdx].high) hiIdx = j;
      if (bars[i-j].low  <= bars[i-loIdx].low)  loIdx = j;
    }
    up.push((p - hiIdx) / p * 100);
    down.push((p - loIdx) / p * 100);
  });
  return { up, down, osc: up.map((v, i) => v - nz(down[i])) };
}

export function adx(bars: Bar[], p = 14): { adx: number[]; diPlus: number[]; diMinus: number[] } {
  const atrVals = atr(bars, p);
  const dmPlus  = bars.map((b, i) => i === 0 ? 0 : Math.max(b.high - bars[i-1].high, 0));
  const dmMinus = bars.map((b, i) => i === 0 ? 0 : Math.max(bars[i-1].low - b.low, 0));
  const rawPlus = dmPlus.map((v, i) => dmPlus[i] > dmMinus[i] ? v : 0);
  const rawMinus= dmMinus.map((v, i)=> dmMinus[i] > dmPlus[i]  ? v : 0);
  const smoothPlus  = ema(rawPlus, p);
  const smoothMinus = ema(rawMinus, p);
  const diPlus  = smoothPlus.map((v, i) => atrVals[i] > 0 ? v / atrVals[i] * 100 : 0);
  const diMinus = smoothMinus.map((v, i)=> atrVals[i] > 0 ? v / atrVals[i] * 100 : 0);
  const dx = diPlus.map((v, i) => diPlus[i] + diMinus[i] > 0 ? Math.abs(v - diMinus[i]) / (v + diMinus[i]) * 100 : 0);
  return { adx: ema(dx, p), diPlus, diMinus };
}

export function vortex(bars: Bar[], p = 14): { viPlus: number[]; viMinus: number[] } {
  const vmPlus  = bars.map((b, i) => i === 0 ? 0 : Math.abs(b.high - bars[i-1].low));
  const vmMinus = bars.map((b, i) => i === 0 ? 0 : Math.abs(b.low  - bars[i-1].high));
  const trVals  = bars.map((b, i) => i === 0 ? b.high - b.low : Math.max(b.high - b.low, Math.abs(b.high - bars[i-1].close), Math.abs(b.low - bars[i-1].close)));
  const viPlus: number[] = []; const viMinus: number[] = [];
  bars.forEach((_, i) => {
    if (i < p) { viPlus.push(NaN); viMinus.push(NaN); return; }
    let sp = 0, sm = 0, st = 0;
    for (let j = 0; j < p; j++) { sp += vmPlus[i-j]; sm += vmMinus[i-j]; st += trVals[i-j]; }
    viPlus.push(st > 0 ? sp / st : 0); viMinus.push(st > 0 ? sm / st : 0);
  });
  return { viPlus, viMinus };
}

export function fisherTransform(bars: Bar[], p = 10): { fisher: number[]; signal: number[] } {
  const hl2 = bars.map(b => (b.high + b.low) / 2);
  const fish: number[] = []; let prev = 0;
  bars.forEach((_, i) => {
    if (i < p - 1) { fish.push(0); return; }
    let hi = -Infinity, lo = Infinity;
    for (let j = 0; j < p; j++) { hi = Math.max(hi, hl2[i-j]); lo = Math.min(lo, hl2[i-j]); }
    let val = hi > lo ? clamp((hl2[i] - lo) / (hi - lo) * 2 - 1, -0.999, 0.999) : 0;
    val = 0.5 * Math.log((1 + val) / (1 - val)) + 0.5 * prev;
    prev = val; fish.push(val);
  });
  return { fisher: fish, signal: fish.map((_, i) => i === 0 ? 0 : fish[i - 1]) };
}

export function choppinessIndex(bars: Bar[], p = 14): number[] {
  const atrVals = bars.map((b, i) => i === 0 ? b.high - b.low : Math.max(b.high - b.low, Math.abs(b.high - bars[i-1].close), Math.abs(b.low - bars[i-1].close)));
  return bars.map((_, i) => {
    if (i < p - 1) return NaN;
    let trSum = 0, hi = -Infinity, lo = Infinity;
    for (let j = 0; j < p; j++) { trSum += atrVals[i-j]; hi = Math.max(hi, bars[i-j].high); lo = Math.min(lo, bars[i-j].low); }
    return hi > lo ? 100 * Math.log10(trSum / (hi - lo)) / Math.log10(p) : 50;
  });
}

/* ─── Volume ───────────────────────────────────────────────────── */
export function obv(bars: Bar[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < bars.length; i++) {
    const d = bars[i].close > bars[i-1].close ? bars[i].volume : bars[i].close < bars[i-1].close ? -bars[i].volume : 0;
    out.push(out[i-1] + d);
  }
  return out;
}

export function accumDist(bars: Bar[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < bars.length; i++) {
    const hl = bars[i].high - bars[i].low;
    const clv = hl > 0 ? ((bars[i].close - bars[i].low) - (bars[i].high - bars[i].close)) / hl : 0;
    out.push(out[i-1] + clv * bars[i].volume);
  }
  return out;
}

export function chaikinMoneyFlow(bars: Bar[], p = 20): number[] {
  const mfv = bars.map(b => {
    const hl = b.high - b.low;
    return hl > 0 ? ((b.close - b.low) - (b.high - b.close)) / hl * b.volume : 0;
  });
  return bars.map((_, i) => {
    if (i < p - 1) return NaN;
    let smfv = 0, sv = 0;
    for (let j = 0; j < p; j++) { smfv += mfv[i-j]; sv += bars[i-j].volume; }
    return sv > 0 ? smfv / sv : 0;
  });
}

export function chaikinOscillator(bars: Bar[], fast = 3, slow = 10): number[] {
  const ad = accumDist(bars);
  const fastE = ema(ad, fast); const slowE = ema(ad, slow);
  return ad.map((_, i) => fastE[i] - slowE[i]);
}

export function mfi(bars: Bar[], p = 14): number[] {
  const tp = bars.map(b => (b.high + b.low + b.close) / 3);
  return bars.map((_, i) => {
    if (i < p) return NaN;
    let pmf = 0, nmf = 0;
    for (let j = 0; j < p; j++) {
      const mfVal = tp[i-j] * bars[i-j].volume;
      if (tp[i-j] >= tp[i-j-1 < 0 ? i-j : i-j-1]) pmf += mfVal; else nmf += mfVal;
    }
    return nmf > 0 ? 100 - 100 / (1 + pmf / nmf) : 100;
  });
}

export function klingerOscillator(bars: Bar[], fast = 34, slow = 55): { osc: number[]; signal: number[] } {
  const dm  = bars.map((b, i) => i === 0 ? 0 : (b.high + b.low + b.close) > (bars[i-1].high + bars[i-1].low + bars[i-1].close) ? b.volume : -b.volume);
  const vf  = dm.map((v, i) => {
    const tr = bars[i].high - bars[i].low;
    return tr > 0 ? 2 * (Math.abs(bars[i].high - bars[i].low) / (bars[i].high + bars[i].low + bars[i].close) - 1) * v : 0;
  });
  const fastE = ema(vf, fast); const slowE = ema(vf, slow);
  const osc = fastE.map((v, i) => v - slowE[i]);
  return { osc, signal: ema(osc, 13) };
}

export function easeOfMovement(bars: Bar[], p = 14): number[] {
  const emv = bars.map((b, i) => {
    if (i === 0 || b.volume === 0) return 0;
    const midMove = (b.high + b.low) / 2 - (bars[i-1].high + bars[i-1].low) / 2;
    const boxRatio = (b.volume / 1e8) / (b.high - b.low);
    return boxRatio > 0 ? midMove / boxRatio : 0;
  });
  return sma(emv, p);
}

export function pvt(bars: Bar[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < bars.length; i++) {
    const roc = bars[i-1].close > 0 ? (bars[i].close - bars[i-1].close) / bars[i-1].close : 0;
    out.push(out[i-1] + roc * bars[i].volume);
  }
  return out;
}

export function nvi(bars: Bar[]): number[] {
  const out: number[] = [1000];
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].volume < bars[i-1].volume) {
      const roc = bars[i-1].close > 0 ? (bars[i].close - bars[i-1].close) / bars[i-1].close : 0;
      out.push(out[i-1] + out[i-1] * roc);
    } else out.push(out[i-1]);
  }
  return out;
}

export function pvi(bars: Bar[]): number[] {
  const out: number[] = [1000];
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].volume > bars[i-1].volume) {
      const roc = bars[i-1].close > 0 ? (bars[i].close - bars[i-1].close) / bars[i-1].close : 0;
      out.push(out[i-1] + out[i-1] * roc);
    } else out.push(out[i-1]);
  }
  return out;
}

export function volumeOscillator(bars: Bar[], fast = 5, slow = 10): number[] {
  const vols = bars.map(b => b.volume);
  const f = sma(vols, fast); const s = sma(vols, slow);
  return vols.map((_, i) => s[i] > 0 ? (f[i] - s[i]) / s[i] * 100 : 0);
}

export function rvol(bars: Bar[], p = 20): number[] {
  const vols = bars.map(b => b.volume);
  const avg = sma(vols, p);
  return vols.map((v, i) => isFinite(avg[i]) && avg[i] > 0 ? v / avg[i] : NaN);
}

export function cvd(bars: Bar[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < bars.length; i++) {
    const ratio = bars[i].close > bars[i].open ? 0.65 : bars[i].close < bars[i].open ? 0.35 : 0.5;
    const delta = (ratio - (1 - ratio)) * bars[i].volume;
    out.push(out[i-1] + delta);
  }
  return out;
}

export function cvdOscillator(bars: Bar[], p = 14): number[] {
  const cvdVals = cvd(bars);
  return ema(cvdVals, p).map((v, i) => cvdVals[i] - v);
}

export function volumeWeightedRsi(bars: Bar[], p = 14): number[] {
  const gains = bars.map((b, i) => i === 0 ? 0 : Math.max(b.close - bars[i-1].close, 0) * b.volume);
  const losses= bars.map((b, i) => i === 0 ? 0 : Math.max(bars[i-1].close - b.close, 0) * b.volume);
  const avgG = sma(gains, p); const avgL = sma(losses, p);
  return bars.map((_, i) => avgL[i] > 0 ? 100 - 100 / (1 + avgG[i] / avgL[i]) : 100);
}

/* ─── Rate of Change / Momentum ───────────────────────────────── */
export function roc(src: number[], p = 12): number[] {
  return src.map((v, i) => i < p || src[i-p] === 0 ? NaN : (v / src[i-p] - 1) * 100);
}

export function momentum(src: number[], p = 10): number[] {
  return src.map((v, i) => i < p ? NaN : v - src[i-p]);
}

/* ─── VWAP ─────────────────────────────────────────────────────── */
export function vwap(bars: Bar[]): number[] {
  let cumPV = 0, cumV = 0;
  return bars.map(b => {
    const tp = (b.high + b.low + b.close) / 3;
    cumPV += tp * b.volume; cumV += b.volume;
    return cumV > 0 ? cumPV / cumV : tp;
  });
}

export function anchoredVwap(bars: Bar[], anchorIdx = 0): number[] {
  let cumPV = 0, cumV = 0;
  return bars.map((b, i) => {
    if (i < anchorIdx) return NaN;
    if (i === anchorIdx) { cumPV = 0; cumV = 0; }
    const tp = (b.high + b.low + b.close) / 3;
    cumPV += tp * b.volume; cumV += b.volume;
    return cumV > 0 ? cumPV / cumV : tp;
  });
}

/* ─── Session / Time Indicators ───────────────────────────────── */
export function priorDayHighLow(bars: Bar[]): { high: number[]; low: number[] } {
  // Returns prior day's high/low painted on current day bars
  const high: number[] = new Array(bars.length).fill(NaN);
  const low:  number[] = new Array(bars.length).fill(NaN);
  // Group by calendar day
  const days: { start: number; end: number; high: number; low: number }[] = [];
  let dayStart = 0;
  bars.forEach((b, i) => {
    const date = new Date(b.time * 1000).toDateString();
    const prevDate = i > 0 ? new Date(bars[i-1].time * 1000).toDateString() : date;
    if (date !== prevDate) {
      let dh = -Infinity, dl = Infinity;
      for (let j = dayStart; j < i; j++) { dh = Math.max(dh, bars[j].high); dl = Math.min(dl, bars[j].low); }
      days.push({ start: dayStart, end: i - 1, high: dh, low: dl });
      dayStart = i;
    }
    if (i === bars.length - 1) {
      let dh = -Infinity, dl = Infinity;
      for (let j = dayStart; j <= i; j++) { dh = Math.max(dh, bars[j].high); dl = Math.min(dl, bars[j].low); }
      days.push({ start: dayStart, end: i, high: dh, low: dl });
    }
  });
  days.forEach((d, di) => {
    if (di === 0) return;
    const prev = days[di - 1];
    for (let i = d.start; i <= d.end; i++) { high[i] = prev.high; low[i] = prev.low; }
  });
  return { high, low };
}

export function openingRangeBreakout(bars: Bar[], minutes = 30): { high: number[]; low: number[] } {
  const high: number[] = new Array(bars.length).fill(NaN);
  const low:  number[] = new Array(bars.length).fill(NaN);
  let orHigh = NaN, orLow = NaN, orDate = "";
  bars.forEach((b, i) => {
    const d = new Date(b.time * 1000);
    const date = d.toDateString();
    const minInDay = d.getHours() * 60 + d.getMinutes();
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    if (date !== orDate) { orHigh = NaN; orLow = NaN; orDate = date; }
    if (minInDay >= marketOpen && minInDay < marketOpen + minutes) {
      orHigh = isNaN(orHigh) ? b.high : Math.max(orHigh, b.high);
      orLow  = isNaN(orLow)  ? b.low  : Math.min(orLow,  b.low);
    }
    if (minInDay >= marketOpen + minutes) { high[i] = orHigh; low[i] = orLow; }
  });
  return { high, low };
}

/* ─── Statistical ──────────────────────────────────────────────── */
export function zScore(src: number[], p = 20): number[] {
  const m = sma(src, p); const std = stdDev(src, p);
  return src.map((v, i) => std[i] > 0 ? (v - m[i]) / std[i] : 0);
}

export function percentileRank(src: number[], p = 100): number[] {
  return src.map((v, i) => {
    if (i < p - 1) return NaN;
    let count = 0;
    for (let j = 0; j < p; j++) if (src[i - j] <= v) count++;
    return count / p * 100;
  });
}

export function linearRegressionSlope(src: number[], p = 14): number[] {
  return src.map((_, i) => {
    if (i < p - 1) return NaN;
    let sx = 0, sy = 0, sxy = 0, sx2 = 0;
    for (let j = 0; j < p; j++) { sx += j; sy += src[i-p+1+j]; sxy += j*src[i-p+1+j]; sx2 += j*j; }
    const denom = p*sx2 - sx*sx;
    return denom > 0 ? (p*sxy - sx*sy) / denom : 0;
  });
}

/* ─── Smart Money Concepts (visual, approximate) ──────────────── */
export function fairValueGaps(bars: Bar[]): { time: number; top: number; bot: number; bull: boolean }[] {
  const gaps: { time: number; top: number; bot: number; bull: boolean }[] = [];
  for (let i = 2; i < bars.length; i++) {
    const prev2 = bars[i - 2]; const curr = bars[i];
    // Bullish FVG: candle[i-2].high < candle[i].low
    if (prev2.high < curr.low) gaps.push({ time: bars[i-1].time, top: curr.low, bot: prev2.high, bull: true });
    // Bearish FVG: candle[i-2].low > candle[i].high
    if (prev2.low > curr.high) gaps.push({ time: bars[i-1].time, top: prev2.low, bot: curr.high, bull: false });
  }
  return gaps;
}

export function swingHighLow(bars: Bar[], lookback = 5): { highs: { time: number; price: number }[]; lows: { time: number; price: number }[] } {
  const highs: { time: number; price: number }[] = [];
  const lows:  { time: number; price: number }[] = [];
  for (let i = lookback; i < bars.length - lookback; i++) {
    let isHigh = true, isLow = true;
    for (let j = -lookback; j <= lookback; j++) {
      if (j === 0) continue;
      if (bars[i].high <= bars[i+j].high) isHigh = false;
      if (bars[i].low  >= bars[i+j].low)  isLow  = false;
    }
    if (isHigh) highs.push({ time: bars[i].time, price: bars[i].high });
    if (isLow)  lows.push( { time: bars[i].time, price: bars[i].low  });
  }
  return { highs, lows };
}

export function orderBlocks(bars: Bar[]): { time: number; top: number; bot: number; bull: boolean }[] {
  const blocks: { time: number; top: number; bot: number; bull: boolean }[] = [];
  for (let i = 1; i < bars.length - 1; i++) {
    const b = bars[i]; const next = bars[i + 1];
    // Bearish OB: down candle followed by strong up move
    if (b.close < b.open && next.close > b.high) {
      blocks.push({ time: b.time, top: b.open, bot: b.close, bull: false });
    }
    // Bullish OB: up candle followed by strong down move
    if (b.close > b.open && next.close < b.low) {
      blocks.push({ time: b.time, top: b.close, bot: b.open, bull: true });
    }
  }
  return blocks;
}

/* ─── Pattern detection ────────────────────────────────────────── */
export function dojiDetector(bars: Bar[]): boolean[] {
  return bars.map(b => {
    const bodySize = Math.abs(b.close - b.open);
    const totalRange = b.high - b.low;
    return totalRange > 0 && bodySize / totalRange < 0.1;
  });
}

export function engulfingPattern(bars: Bar[]): { time: number; bull: boolean }[] {
  const out: { time: number; bull: boolean }[] = [];
  for (let i = 1; i < bars.length; i++) {
    const p = bars[i-1]; const c = bars[i];
    if (c.close > c.open && p.close < p.open && c.open < p.close && c.close > p.open)
      out.push({ time: c.time, bull: true });
    if (c.close < c.open && p.close > p.open && c.open > p.close && c.close < p.open)
      out.push({ time: c.time, bull: false });
  }
  return out;
}

export function hammerShootingStar(bars: Bar[]): { time: number; type: "hammer" | "shooting_star" }[] {
  const out: { time: number; type: "hammer" | "shooting_star" }[] = [];
  bars.forEach(b => {
    const body   = Math.abs(b.close - b.open);
    const total  = b.high - b.low;
    if (total === 0) return;
    const upperWick = b.high - Math.max(b.open, b.close);
    const lowerWick = Math.min(b.open, b.close) - b.low;
    if (lowerWick > 2 * body && upperWick < body) out.push({ time: b.time, type: "hammer" });
    if (upperWick > 2 * body && lowerWick < body) out.push({ time: b.time, type: "shooting_star" });
  });
  return out;
}

/* ─── Breadth / Market (require external data — stubs) ──────────
   These return empty arrays and are labelled as "requires data feed"
────────────────────────────────────────────────────────────────── */
export const REQUIRES_FEED = new Set([
  "VIX Overlay", "McClellan Oscillator", "McClellan Summation", "TICK Index",
  "TRIN (Arms Index)", "Put/Call Ratio", "New Highs/New Lows", "% Above 50 SMA",
  "% Above 200 SMA", "High-Low Logic Index", "Zweig Breadth Thrust",
  "NASDAQ A/D Line", "Up/Down Volume Ratio", "Sector Rotation Heatmap",
  "Fear & Greed Meter", "VIX Term Structure", "COT Net Positioning",
  "Insider Buying Signal", "Short Interest Ratio", "Dollar Strength Index",
  "Yield Curve Spread", "Credit Spread Monitor", "NYSE Advance/Decline Line",
]);

/* ─── MTF stub ─────────────────────────────────────────────────── */
export const MTF_INDICATORS = new Set([
  "MTF EMA", "MTF RSI", "MTF VWAP", "MTF Bollinger Bands",
  "MTF Volume Profile", "MTF Candlestick",
]);
