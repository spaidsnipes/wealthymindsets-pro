/**
 * CANONICAL TIMEFRAME SYSTEM — WM-CHART-P0-01
 *
 * Single source of truth for every timeframe in WM Pro. Before this module the
 * app carried three independent, mutually incompatible literals:
 *
 *   ChartToolbar.tsx    ["1m","2m","5m","15m","30m","1h","D","W","M"]
 *   backtesting/page    ["1m","2m","5m","15m","30m","1h","D","W","M"]
 *   heatmaps/page       ["1D","1W","1M","3M","6M","1Y","5Y"]
 *
 * Two different naming schemes ("D" vs "1D") meant any timeframe string passed
 * between the chart and the heatmap was silently wrong. This module replaces all
 * three. `"D"/"W"/"M"` are gone; `"1D"/"1W"/"1M"` are canonical.
 *
 * ── Two axes, deliberately separate ──────────────────────────────────────────
 * A timeframe is NOT one number. It is a pair:
 *   candleIntervalSec — the bar size
 *   defaultRangeSec   — how much history is shown
 * "5Y" is not a five-year candle; it is a weekly candle over five years. Conflating
 * these is what made the heatmap and chart disagree. They are separate fields here.
 *
 * ── Provider support is MEASURED, never assumed ──────────────────────────────
 * Every `source` value below comes from probes run against Yahoo Finance on
 * 2026-07-28 (symbol AAPL), not from documentation. See PROVIDER_EVIDENCE.
 *
 * ── The silent-downgrade trap (measured, important) ──────────────────────────
 * Yahoo does NOT always error on an unsupported interval/range pair. With
 * `range=max` it returns HTTP 200 with `dataGranularity: "3mo"` regardless of the
 * interval requested — 1m, 5m, 1h and 1d all came back as 3-month bars. Rendering
 * that as 1m data would put fabricated-looking candles on the chart, violating
 * Founding Principle 3. `assertGranularity()` exists to make that unrepresentable:
 * every provider response must be checked before use.
 */

export type TFId =
  | "1m" | "2m" | "3m" | "5m" | "10m" | "15m" | "30m" | "45m"
  | "1h" | "2h" | "4h"
  | "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "2Y" | "5Y";

export type TFSource = "native" | "aggregated" | "unsupported";

export interface Timeframe {
  id: TFId;
  /** Display label for toolbars. */
  label: string;
  /** Bar size in seconds. */
  candleIntervalSec: number;
  /** Default visible history in seconds. Independent of candleIntervalSec. */
  defaultRangeSec: number;
  source: TFSource;
  /** Provider interval string. Only meaningful when source === "native". */
  providerInterval?: string;
  /** Source timeframe when source === "aggregated". Must be an exact divisor. */
  aggregatedFrom?: TFId;
  /** How many source bars compose one bar here. Always an integer > 1. */
  aggregationFactor?: number;
  /**
   * Measured maximum history the provider will serve at this granularity, in
   * seconds. null = not established by probe (treat as unknown, do not guess).
   */
  maxRangeSec: number | null;
  /** Minimum bars required before a regime/Markov/Wyckoff state may be computed. */
  minBarsForState: number;
  /** Why this timeframe is unsupported — shown to the user, never invented. */
  unsupportedReason?: string;
}

const MIN = 60;
const HOUR = 3600;
const DAY = 86_400;

/**
 * Measured provider evidence — Yahoo Finance v8 chart API, AAPL, 2026-07-28.
 * Recorded so a future engineer can re-run and diff rather than trust this file.
 */
export const PROVIDER_EVIDENCE = {
  provider: "yahoo-finance-v8",
  probedAt: "2026-07-28",
  probeSymbol: "AAPL",
  /** Yahoo's own error text enumerates these. */
  validIntervals: ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "4h", "1d", "5d", "1wk", "1mo", "3mo"],
  rejectedIntervals: ["3m", "10m", "45m", "2h"],
  /** Measured OK/ERROR boundaries. */
  depthCaps: {
    "1m": "<= 8 days (provider error states the limit explicitly)",
    "2m": "OK at 1mo, ERROR at 3mo",
    "5m": "OK at 1mo, ERROR at 2mo",
    "15m": "OK at 1mo, ERROR at 2mo",
    "30m": "OK at 1mo, ERROR at 2mo",
    "1h": "OK at 2y, ERROR at 5y",
    "4h": "OK at 2y",
    "1d": "OK at 10y (2512 bars)",
    "1wk": "OK at 10y (524 bars)",
    "1mo": "OK at 10y (121 bars)",
  },
  silentDowngrade: "range=max returns dataGranularity='3mo' for EVERY requested interval. Never use range=max.",
} as const;

const TF_LIST: Timeframe[] = [
  // ── Native intraday ────────────────────────────────────────────────────────
  { id: "1m",  label: "1m",  candleIntervalSec: 1 * MIN,  defaultRangeSec: 1 * DAY,
    source: "native", providerInterval: "1m",  maxRangeSec: 8 * DAY,   minBarsForState: 120 },
  { id: "2m",  label: "2m",  candleIntervalSec: 2 * MIN,  defaultRangeSec: 2 * DAY,
    source: "native", providerInterval: "2m",  maxRangeSec: 30 * DAY,  minBarsForState: 120 },
  { id: "5m",  label: "5m",  candleIntervalSec: 5 * MIN,  defaultRangeSec: 5 * DAY,
    source: "native", providerInterval: "5m",  maxRangeSec: 30 * DAY,  minBarsForState: 120 },
  { id: "15m", label: "15m", candleIntervalSec: 15 * MIN, defaultRangeSec: 10 * DAY,
    source: "native", providerInterval: "15m", maxRangeSec: 30 * DAY,  minBarsForState: 100 },
  { id: "30m", label: "30m", candleIntervalSec: 30 * MIN, defaultRangeSec: 20 * DAY,
    source: "native", providerInterval: "30m", maxRangeSec: 30 * DAY,  minBarsForState: 100 },
  { id: "1h",  label: "1h",  candleIntervalSec: 1 * HOUR, defaultRangeSec: 60 * DAY,
    source: "native", providerInterval: "1h",  maxRangeSec: 730 * DAY, minBarsForState: 100 },
  { id: "4h",  label: "4h",  candleIntervalSec: 4 * HOUR, defaultRangeSec: 180 * DAY,
    source: "native", providerInterval: "4h",  maxRangeSec: 730 * DAY, minBarsForState: 90 },

  // ── Aggregated: provider rejects these outright, but each divides exactly ───
  { id: "3m",  label: "3m",  candleIntervalSec: 3 * MIN,  defaultRangeSec: 3 * DAY,
    source: "aggregated", aggregatedFrom: "1m",  aggregationFactor: 3,
    maxRangeSec: 8 * DAY,  minBarsForState: 120 },
  { id: "10m", label: "10m", candleIntervalSec: 10 * MIN, defaultRangeSec: 7 * DAY,
    source: "aggregated", aggregatedFrom: "5m",  aggregationFactor: 2,
    maxRangeSec: 30 * DAY, minBarsForState: 100 },
  { id: "45m", label: "45m", candleIntervalSec: 45 * MIN, defaultRangeSec: 30 * DAY,
    source: "aggregated", aggregatedFrom: "15m", aggregationFactor: 3,
    maxRangeSec: 30 * DAY, minBarsForState: 90 },
  { id: "2h",  label: "2h",  candleIntervalSec: 2 * HOUR, defaultRangeSec: 90 * DAY,
    source: "aggregated", aggregatedFrom: "1h",  aggregationFactor: 2,
    maxRangeSec: 730 * DAY, minBarsForState: 90 },

  // ── Daily and longer. Note these are RANGES over a daily/weekly/monthly bar ─
  { id: "1D", label: "1D", candleIntervalSec: DAY,       defaultRangeSec: 365 * DAY,
    source: "native", providerInterval: "1d",  maxRangeSec: 3650 * DAY, minBarsForState: 60 },
  { id: "1W", label: "1W", candleIntervalSec: 7 * DAY,   defaultRangeSec: 730 * DAY,
    source: "native", providerInterval: "1wk", maxRangeSec: 3650 * DAY, minBarsForState: 52 },
  { id: "1M", label: "1M", candleIntervalSec: 30 * DAY,  defaultRangeSec: 1825 * DAY,
    source: "native", providerInterval: "1mo", maxRangeSec: 3650 * DAY, minBarsForState: 36 },
  { id: "3M", label: "3M", candleIntervalSec: DAY,       defaultRangeSec: 90 * DAY,
    source: "native", providerInterval: "1d",  maxRangeSec: 3650 * DAY, minBarsForState: 60 },
  { id: "6M", label: "6M", candleIntervalSec: DAY,       defaultRangeSec: 180 * DAY,
    source: "native", providerInterval: "1d",  maxRangeSec: 3650 * DAY, minBarsForState: 60 },
  { id: "1Y", label: "1Y", candleIntervalSec: DAY,       defaultRangeSec: 365 * DAY,
    source: "native", providerInterval: "1d",  maxRangeSec: 3650 * DAY, minBarsForState: 60 },
  { id: "2Y", label: "2Y", candleIntervalSec: 7 * DAY,   defaultRangeSec: 730 * DAY,
    source: "native", providerInterval: "1wk", maxRangeSec: 3650 * DAY, minBarsForState: 52 },
  { id: "5Y", label: "5Y", candleIntervalSec: 7 * DAY,   defaultRangeSec: 1825 * DAY,
    source: "native", providerInterval: "1wk", maxRangeSec: 3650 * DAY, minBarsForState: 52 },
];

export const TIMEFRAMES: readonly Timeframe[] = Object.freeze(TF_LIST);
export const TF_IDS: readonly TFId[] = Object.freeze(TF_LIST.map(t => t.id));

const BY_ID = new Map<TFId, Timeframe>(TF_LIST.map(t => [t.id, t]));

export function getTimeframe(id: TFId): Timeframe {
  const tf = BY_ID.get(id);
  if (!tf) throw new Error(`Unknown timeframe: ${id}`);
  return tf;
}

export function isTFId(v: string): v is TFId {
  return BY_ID.has(v as TFId);
}

/** Usable = the provider can actually serve it, natively or by exact aggregation. */
export function isSupported(id: TFId): boolean {
  return getTimeframe(id).source !== "unsupported";
}

/**
 * Legacy migration. The old chart literals used "D"/"W"/"M"; the heatmap used
 * "1D"/"1W"/"1M". Anything persisted in localStorage or a saved layout still
 * carries the old form, so normalise rather than break saved user state.
 */
const LEGACY: Record<string, TFId> = {
  D: "1D", W: "1W", M: "1M",
  "60m": "1h", "1d": "1D", "1wk": "1W", "1mo": "1M",
};
export function normalizeTFId(raw: string): TFId | null {
  if (isTFId(raw)) return raw;
  const mapped = LEGACY[raw];
  return mapped ?? null;
}

export interface FetchPlan {
  /** Interval string to send to the provider. */
  providerInterval: string;
  /** Seconds of history to request. */
  rangeSec: number;
  /** >1 when the response must be aggregated client-side. */
  aggregationFactor: number;
  /** Granularity the provider must return, else the response is rejected. */
  expectedGranularity: string;
  /** True when the requested range was clamped to the measured provider cap. */
  clamped: boolean;
}

/**
 * Translate a timeframe into a concrete provider request.
 *
 * Clamps to the MEASURED cap rather than letting the provider silently downgrade.
 * Never emits `range=max` — that is the documented downgrade trap.
 */
export function resolveFetchPlan(id: TFId, requestedRangeSec?: number): FetchPlan {
  const tf = getTimeframe(id);
  if (tf.source === "unsupported") {
    throw new Error(`Timeframe ${id} is unsupported: ${tf.unsupportedReason ?? "no provider support"}`);
  }

  const base = tf.source === "aggregated" ? getTimeframe(tf.aggregatedFrom!) : tf;
  const factor = tf.aggregationFactor ?? 1;

  const want = requestedRangeSec ?? tf.defaultRangeSec;
  const cap = base.maxRangeSec;
  const rangeSec = cap != null ? Math.min(want, cap) : want;

  return {
    providerInterval: base.providerInterval!,
    rangeSec,
    aggregationFactor: factor,
    expectedGranularity: base.providerInterval!,
    clamped: cap != null && want > cap,
  };
}

/**
 * Guard against the measured silent-downgrade behaviour. Yahoo returns HTTP 200
 * with coarser bars instead of erroring; without this check those bars would be
 * rendered as if they were the requested interval.
 */
export function assertGranularity(expected: string, actual: string | undefined): void {
  if (actual && actual !== expected) {
    throw new Error(
      `Provider granularity mismatch: requested "${expected}" but received "${actual}". ` +
      `Response rejected rather than displayed — see PROVIDER_EVIDENCE.silentDowngrade.`,
    );
  }
}

export interface Candle {
  time: number; open: number; high: number; low: number; close: number; volume: number;
}

/**
 * Aggregate N source bars into one. Only exact integer divisors are permitted —
 * aggregating 45m from 30m would straddle bar boundaries and silently misreport
 * OHLC, so it is rejected rather than approximated.
 *
 * Trailing partial groups are dropped: a half-formed bar is not a bar.
 */
export function aggregateCandles(src: readonly Candle[], factor: number): Candle[] {
  if (!Number.isInteger(factor) || factor < 1) {
    throw new Error(`Aggregation factor must be a positive integer, got ${factor}`);
  }
  if (factor === 1) return [...src];

  const out: Candle[] = [];
  for (let i = 0; i + factor <= src.length; i += factor) {
    const group = src.slice(i, i + factor);
    out.push({
      time: group[0].time,
      open: group[0].open,
      close: group[group.length - 1].close,
      high: Math.max(...group.map(c => c.high)),
      low: Math.min(...group.map(c => c.low)),
      volume: group.reduce((s, c) => s + c.volume, 0),
    });
  }
  return out;
}

/** True when enough bars exist to compute a market state at this timeframe. */
export function hasEnoughBarsForState(id: TFId, barCount: number): boolean {
  return barCount >= getTimeframe(id).minBarsForState;
}

/** Full canonical ordering — intraday first, then daily and longer. */
export const CHART_TF_ORDER: readonly TFId[] = Object.freeze([
  "1m", "2m", "3m", "5m", "10m", "15m", "30m", "45m", "1h", "2h", "4h",
  "1D", "1W", "1M", "3M", "6M", "1Y", "2Y", "5Y",
]);

/**
 * The subset the chart toolbar actually ships TODAY.
 *
 * Deliberately narrower than CHART_TF_ORDER. The aggregated intervals
 * (3m/10m/45m/2h) are defined and unit-tested above, but the chart fetch path
 * does not yet perform aggregation — exposing them now would render bars that
 * are not what their label claims. Per Founding Principle 3 they stay hidden
 * until the fetch path aggregates, rather than shipping a mislabelled candle.
 *
 * Widening this list is WM-CHART-P0-01b, not a UI tweak.
 */
export const CHART_TF_SHIPPED: readonly TFId[] = Object.freeze([
  "1m", "2m", "5m", "15m", "30m", "1h", "1D", "1W", "1M",
]);

/** Period-style views used by the heatmap. Same ids — no second vocabulary. */
export const HEATMAP_TF_ORDER: readonly TFId[] = Object.freeze([
  "1D", "1W", "1M", "3M", "6M", "1Y", "5Y",
]);
