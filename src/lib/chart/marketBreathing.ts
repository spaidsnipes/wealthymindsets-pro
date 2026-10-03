/**
 * F15 · MARKET BREATHING — PURE.
 *
 * The registry's Volatility / Breathing sense: ATR, realized volatility,
 * compression, expansion. Markets alternate between drawing in (ranges
 * shrink) and breathing out (ranges widen). This reads WHICH of the two the
 * closed bars on the camera are doing, how far from their own normal, and how
 * long since the last change — from range and dispersion only.
 *
 * Describes; never forecasts. A compressed market is not "about to break out";
 * the reading says it is compressed and by how much, nothing more. Needs at
 * least MIN_BARS closed bars or it says so.
 */

export interface BreathBar { readonly high: number; readonly low: number; readonly close: number }

export type BreathState = "COMPRESSED" | "EXPANDED" | "NORMAL";
export type BreathPhase = "DRAWING IN" | "BREATHING OUT" | "LEVEL";

export interface MarketBreathing {
  readonly state: BreathState;
  readonly phase: BreathPhase;
  /** Current ATR as a multiple of the window's median ATR. */
  readonly atrRatio: number;
  /** Percentile (0–100) of the current ATR within the window. */
  readonly atrPercentile: number;
  readonly atr: number;
  /** Standard deviation of close-to-close log returns over the last RV_LEN bars, in percent. */
  readonly realizedVolPct: number;
  /** Closed bars since the state last changed. */
  readonly barsInState: number;
  /** Compression → expansion cycles completed inside the window. */
  readonly cycles: number;
  readonly sample: number;
}

export const ATR_LEN = 14;
export const RV_LEN = 20;
export const WINDOW = 120;
export const MIN_BARS = 40;
export const COMPRESSED_AT = 0.75;
export const EXPANDED_AT = 1.3;

const median = (xs: readonly number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Wilder ATR series, aligned to bars (null until ATR_LEN bars exist). */
export function atrSeries(bars: readonly BreathBar[], len = ATR_LEN): (number | null)[] {
  const out: (number | null)[] = [];
  let atr: number | null = null;
  let seed = 0;
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const prev = i > 0 ? bars[i - 1].close : b.close;
    const tr = Math.max(b.high - b.low, Math.abs(b.high - prev), Math.abs(b.low - prev));
    if (i < len) { seed += tr; out.push(i === len - 1 ? (atr = seed / len) : null); continue; }
    atr = ((atr as number) * (len - 1) + tr) / len;
    out.push(atr);
  }
  return out;
}

const stateOf = (ratio: number): BreathState => (ratio <= COMPRESSED_AT ? "COMPRESSED" : ratio >= EXPANDED_AT ? "EXPANDED" : "NORMAL");

/**
 * `bars` are oldest → newest and CLOSED (the caller drops a forming bar).
 * Returns null when fewer than MIN_BARS bars carry a usable range.
 */
export function readMarketBreathing(bars: readonly BreathBar[]): MarketBreathing | null {
  const clean = bars.filter(b => Number.isFinite(b.high) && Number.isFinite(b.low) && Number.isFinite(b.close) && b.high >= b.low && b.close > 0);
  if (clean.length < MIN_BARS) return null;
  const atrs = atrSeries(clean);
  const startAt = Math.max(0, clean.length - WINDOW);
  const win: number[] = [];
  for (let i = startAt; i < clean.length; i++) if (atrs[i] != null) win.push(atrs[i]!);
  if (win.length < MIN_BARS - ATR_LEN) return null;
  const med = median(win);
  if (!(med > 0)) return null;
  const atr = win[win.length - 1];
  const ratio = atr / med;
  const state = stateOf(ratio);

  const lookback = Math.min(5, win.length - 1);
  const change = (atr - win[win.length - 1 - lookback]) / med;
  const phase: BreathPhase = change <= -0.05 ? "DRAWING IN" : change >= 0.05 ? "BREATHING OUT" : "LEVEL";

  const states = win.map(a => stateOf(a / med));
  let barsInState = 0;
  for (let i = states.length - 1; i >= 0 && states[i] === state; i--) barsInState++;
  let cycles = 0, sawCompression = false;
  for (const s of states) {
    if (s === "COMPRESSED") sawCompression = true;
    else if (s === "EXPANDED" && sawCompression) { cycles++; sawCompression = false; }
  }

  const rets: number[] = [];
  for (let i = Math.max(1, clean.length - RV_LEN); i < clean.length; i++) rets.push(Math.log(clean[i].close / clean[i - 1].close));
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const sd = Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(1, rets.length - 1));

  const below = win.filter(a => a < atr).length;
  return {
    state, phase,
    atrRatio: Math.round(ratio * 100) / 100,
    atrPercentile: Math.round((below / win.length) * 100),
    atr,
    realizedVolPct: Math.round(sd * 100 * 1000) / 1000,
    barsInState,
    cycles,
    sample: win.length,
  };
}

/** One plain sentence for the rail — what, how far, how long. */
export function breathingSentence(b: MarketBreathing): string {
  const what = b.state === "COMPRESSED" ? "Ranges are compressed" : b.state === "EXPANDED" ? "Ranges are expanded" : "Ranges are near their normal";
  return `${what}: ATR ${b.atrRatio.toFixed(2)}× its median over the last ${b.sample} bars (${b.atrPercentile}th percentile), ${b.phase.toLowerCase()}, ${b.barsInState} bar${b.barsInState === 1 ? "" : "s"} in this state.`;
}
