/**
 * CANONICAL TIMEFRAME SYSTEM — WM-CHART-P0-01
 *
 * Single source of truth for every timeframe in WM Pro. Before this module the
 * app carried three independent, mutually incompatible literals:
 *
 *   ChartToolbar.tsx    ["1m","2m","5m","15m","30m","1h","D","W","M"]
 *   backtesting/page    ["1m","2m","5m","15m","30m","1h","D","W","M"]
 *   scanner/map/page    ["1D","1W","1M","3M","6M","1Y","5Y"]
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

/*
 * THE TIMEFRAME REGISTRY NO LONGER DECLARES ITS OWN `Candle` (2026-09-18).
 *
 * Byte-for-byte `LegacyOhlcvTuple`, and its only importer was its own test file.
 *
 * This one is worth a sentence beyond the rename, because `aggregateCandles`
 * below is one of the few places in the codebase that MANUFACTURES a bar that
 * never arrived from a provider: it folds N source bars into one. Under the old
 * local `Candle` that was invisible — the output looked exactly like an input.
 * Under a shared legacy-tuple name it is STILL invisible, because the tuple
 * carries no provenance either.
 *
 * THAT IS THE POINT, AND IT IS NOT FIXED HERE. A folded bar has a genuinely
 * different fidelity from a provider bar, and a CanonicalBar would be obliged to
 * say so (`fidelity`, `source`, `provenance`, `truthEpoch`). This rename gives
 * the aggregator nowhere to record that. It removes one duplicate DECISION about
 * what a bar is and nothing else. The aggregation-provenance gap stays open and
 * is named here so it is not mistaken for closed.
 */
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

/**
 * Aggregate N source bars into one. Only exact integer divisors are permitted —
 * aggregating 45m from 30m would straddle bar boundaries and silently misreport
 * OHLC, so it is rejected rather than approximated.
 *
 * Trailing partial groups are dropped: a half-formed bar is not a bar.
 */
export function aggregateCandles(src: readonly LegacyOhlcvTuple[], factor: number): LegacyOhlcvTuple[] {
  if (!Number.isInteger(factor) || factor < 1) {
    throw new Error(`Aggregation factor must be a positive integer, got ${factor}`);
  }
  if (factor === 1) return [...src];

  const out: LegacyOhlcvTuple[] = [];
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
 *
 * ── 2026-09-26 · STILL THE PRIMARY SET, NO LONGER THE WHOLE REACH ─────────
 * These nine stay the calm strip (Garden 16 §24: "UX COMPRESSION ≠ FEATURE
 * DELETION"). The rest of the canonical ladder is reached through ONE "More"
 * control on the same strip, and what that control may offer is owned by
 * CANON_LADDER below — not by this list. The paragraph above was written
 * against the Yahoo evidence only; read against the chart's FIRST bar route,
 * /api/alpaca maps 3m/10m/2h/4h to 3Min/10Min/2Hour/4Hour, buckets of exactly
 * that size, so they are NATIVE there. 45m is not (no route maps it and the
 * canon's current family drops it). See CANON_LADDER for the per-rung record.
 */
export const CHART_TF_SHIPPED: readonly TFId[] = Object.freeze([
  "1m", "2m", "5m", "15m", "30m", "1h", "1D", "1W", "1M",
]);

/** Period-style views used by the heatmap. Same ids — no second vocabulary. */
export const HEATMAP_TF_ORDER: readonly TFId[] = Object.freeze([
  "1D", "1W", "1M", "3M", "6M", "1Y", "5Y",
]);

/**
 * THE TWO TIMEFRAMES A SCREEN READER CANNOT TELL APART.
 *
 * ── MEASURED LIVE on https://wealthymindsetspro.com/charts, 2026-09-17 ──────
 * One DOM read of all nine toolbar timeframe buttons returned, for every one
 * of them:
 *
 *     aria-pressed: null   aria-current: null   aria-selected: null
 *     role: null           aria-label: null     title: ""
 *
 * The selected timeframe was distinguished by ONE thing — a `bg-wm-blue/20`
 * class on the 30m button. Colour was carrying the entire state.
 *
 * That is not a cosmetic gap on this particular page. The timeframe is the
 * PROVENANCE WORD on every number in the header: the price cell reads
 * "29699.75 LAST 30m BAR CLOSE", the decision rail repeats it, and neither
 * sentence means anything without knowing which interval is selected. WM built
 * a compiler whose whole job is that a number never travels without its
 * provenance, and then shipped the control that sets that provenance as nine
 * anonymous buttons.
 *
 * ── AND THE LABELS COLLIDE ─────────────────────────────────────────────────
 * `1m` and `1M` are different timeframes — one minute and one month, a factor
 * of about 43,200. Screen readers are not case-sensitive when announcing a
 * token like this, so BOTH are spoken the same way. A trader using one cannot
 * distinguish a one-minute chart from a one-month chart by listening, and the
 * visual difference is a single letter's case. Adding `aria-pressed` alone
 * would have told them WHICH button was on while leaving them unable to tell
 * what it was.
 *
 * So the spoken name is DERIVED from `candleIntervalSec` — the same field the
 * fetch path uses to ask the provider for bars — rather than from a second
 * hand-written table beside `label`. A table would agree with the interval
 * until someone edited one of them; this cannot disagree with the chart,
 * because it is reading the chart's own number.
 *
 * Returns a phrase, not a sentence: it is composed into button labels.
 */
export function timeframeSpokenName(id: TFId): string {
  const sec = getTimeframe(id).candleIntervalSec;
  // Months are the one unit that is not a fixed multiple of a day, so the
  // canonical table stores 1M as 30 days. Naming it "30 days" would be a
  // different claim than the button makes, so the calendar units are named
  // from the id where the id IS the calendar unit.
  const cal = /^(\d+)([DWMY])$/.exec(id);
  if (cal) {
    const n = Number(cal[1]);
    const unit = ({ D: "day", W: "week", M: "month", Y: "year" } as const)[cal[2] as "D" | "W" | "M" | "Y"];
    return spokenBars(n, unit);
  }
  if (sec % 3600 === 0) return spokenBars(sec / 3600, "hour");
  return spokenBars(sec / 60, "minute");
}

/**
 * The one phrase builder both spoken-name functions use (2026-09-26). It was a
 * local `plural` inside timeframeSpokenName; the canonical ladder needs the same
 * words for rungs that have no TFId ("1 second bars", "1 quarter bars"), and a
 * second copy is how "1 minute bars" and "1 minutes bars" end up side by side.
 */
function spokenBars(n: number, unit: CanonUnit): string {
  return `${n} ${unit}${n === 1 ? "" : "s"} bars`;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * THE CANONICAL LADDER — every rung the Founder's timeframe law names, and
 * what the chart's bar path can honestly do with each one TODAY (2026-09-26).
 *
 * ── WHERE THE LIST COMES FROM (Garden 16 §21 "Recover the actual registry.
 * DO NOT GUESS THE MIDDLE") ──────────────────────────────────────────────────
 * Recovered from Drive, verbatim in four current documents (Build Order,
 * ATH Command Center, Master Index "TIMEFRAME CONTRACT", Living Market Visual
 * Systems Canon), the 2026-09-21 "CURRENT WM PRO TIMEFRAME FAMILY":
 *
 *   TICK / 1s / 5s / 10s / 15s / 30s / 1m / 2m / 3m / 5m / 10m / 15m / 20m /
 *   30m / 1h / 2h / 4h / 1D / 1W / 1M / 1Q / 6M / 1Y
 *
 * That is TWENTY-THREE rungs. The research note that carried it here called it
 * a "26-rung ladder" and then listed these 23; the list is the evidence, the
 * count was not, so the list wins and the count is recorded as a discrepancy
 * rather than padded to match. 45m appears in the first 2026-09-21 ladder and
 * NOT in the current family — it is left out here and stays an open question.
 *
 * ── WHAT EACH RUNG MAY SAY ABOUT ITSELF ──────────────────────────────────────
 * Canon: "A timeframe may be: NATIVE_PROVIDER / DERIVED_CANONICAL /
 * UNAVAILABLE. The UI must never pretend a derived interval is
 * provider-native." Measured against the chart's bar path as it is wired
 * today (MainChart's history waterfall: /api/exchange for a venue symbol,
 * then /api/alpaca, /api/finnhub, /api/yahoo):
 *
 *   NATIVE_PROVIDER    the chart's FIRST equity route, /api/alpaca, maps this
 *                      rung's id to a bucket of EXACTLY this size (1Min …
 *                      4Hour, 1Day, 1Week, 1Month). A fallback vendor may
 *                      reconstruct it instead — /api/yahoo folds 3m/10m/2h/4h
 *                      from a finer interval — and those bars are stamped
 *                      DERIVED at ingress (yahooCandleIngress), so the bars
 *                      carry their own truth even when the rung's claim is
 *                      about the first route.
 *   DERIVED_CANONICAL  only where a real aggregation owner feeds the chart for
 *                      this rung. NONE does today: the one tape-to-CanonicalBar
 *                      builder (dxlinkProtocol.aggregateCandles, 15s windows)
 *                      has no production importer. No rung claims this IN
 *                      THIS TABLE; per symbol, Yahoo's reconstruction does
 *                      (see "THIS TABLE IS THE EQUITY ANSWER" below).
 *   UNAVAILABLE        everything else, with the reason a human reads.
 *
 * A route pinning test (timeframeLadder.test.ts) reads ALPACA_TF_MAP (now
 * owned by src/lib/marketData/alpacaBarRoute.ts, which the route imports) and
 * fails if a NATIVE rung stops mapping to its exact bucket, or if an
 * UNAVAILABLE rung's id starts being served — so this table cannot quietly
 * outlive the routes it describes.
 *
 * ── THIS TABLE IS THE EQUITY ANSWER, NOT EVERY SYMBOL'S (2026-09-26, §26) ───
 * "NATIVE" above is true of the chart's first EQUITY route. It is not true of
 * ES1! (Alpaca is never asked for futures; Yahoo folds 3m/10m/2h/4h from finer
 * bars) nor of every crypto spelling. The glass therefore never reads this
 * table raw: canonAvailabilityFor(rung, symbol) in
 * src/lib/marketData/chartBarRoute.ts walks the chart's real bar waterfall for
 * the symbol on screen, and a rung whose bars are REBUILT is DERIVED_CANONICAL
 * there — Yahoo's aggregateYahooBars being the aggregation owner that feeds
 * the chart for it.
 *
 * ── STILL OPEN, AND NOT DECIDED HERE ─────────────────────────────────────────
 * Which N-tick counts exist (canon names only "TICK"), whether 45m stays, and
 * whether 6M / 1Y are candles (canon) or ranges (the TFIds above). Nothing in
 * this block chooses for the Founder; the reasons below say so out loud.
 * ═══════════════════════════════════════════════════════════════════════════ */

export type CanonRungId =
  | "TICK" | "1s" | "5s" | "10s" | "15s" | "30s"
  | "1m" | "2m" | "3m" | "5m" | "10m" | "15m" | "20m" | "30m"
  | "1h" | "2h" | "4h"
  | "1D" | "1W" | "1M" | "1Q" | "6M" | "1Y";

export type CanonAvailability = "NATIVE_PROVIDER" | "DERIVED_CANONICAL" | "UNAVAILABLE";

export type CanonRungGroup = "TICK_SECONDS" | "MINUTES" | "HOURS" | "DAYS_LONGER";

export type CanonUnit =
  | "tick" | "second" | "minute" | "hour" | "day" | "week" | "month" | "quarter" | "year";

interface CanonRungBase {
  id: CanonRungId;
  group: CanonRungGroup;
  /** Rung size: `n` of `unit`. null only for TICK, whose trade count is undecided. */
  n: number | null;
  unit: CanonUnit;
}

/**
 * A discriminated union on purpose: an UNAVAILABLE rung has no `chartTf`, so no
 * picker can wire it to the timeframe setter without a type error, and a
 * servable rung has no `reason`, so it cannot carry an excuse it does not need.
 */
export type CanonRung =
  | (CanonRungBase & { availability: "NATIVE_PROVIDER" | "DERIVED_CANONICAL"; chartTf: TFId })
  | (CanonRungBase & { availability: "UNAVAILABLE"; reason: string });

/** The reasons a human reads. Short, true, and none of them a promise. */
const NO_TAPE = "Needs a certified trade tape — none on this path.";
const NOT_BUILT_20M = "Not built yet — no bar route serves 20-minute bars.";
const NOT_BUILT_1Q = "Not built yet — no chart timeframe asks a route for quarterly candles.";
const OPEN_6M = "Open decision — a half-year candle, or six months of daily bars.";
const OPEN_1Y = "Open decision — a yearly candle, or one year of daily bars.";

const off = (id: CanonRungId, group: CanonRungGroup, n: number | null, unit: CanonUnit, reason: string): CanonRung =>
  ({ id, group, n, unit, availability: "UNAVAILABLE", reason });
const native = (id: CanonRungId & TFId, group: CanonRungGroup, n: number, unit: CanonUnit): CanonRung =>
  ({ id, group, n, unit, availability: "NATIVE_PROVIDER", chartTf: id });

export const CANON_LADDER: readonly CanonRung[] = Object.freeze([
  off("TICK", "TICK_SECONDS", null, "tick",   NO_TAPE),
  off("1s",   "TICK_SECONDS", 1,    "second", NO_TAPE),
  off("5s",   "TICK_SECONDS", 5,    "second", NO_TAPE),
  off("10s",  "TICK_SECONDS", 10,   "second", NO_TAPE),
  off("15s",  "TICK_SECONDS", 15,   "second", NO_TAPE),
  off("30s",  "TICK_SECONDS", 30,   "second", NO_TAPE),

  native("1m",  "MINUTES", 1,  "minute"),
  native("2m",  "MINUTES", 2,  "minute"),
  native("3m",  "MINUTES", 3,  "minute"),
  native("5m",  "MINUTES", 5,  "minute"),
  native("10m", "MINUTES", 10, "minute"),
  native("15m", "MINUTES", 15, "minute"),
  off("20m",    "MINUTES", 20, "minute", NOT_BUILT_20M),
  native("30m", "MINUTES", 30, "minute"),

  native("1h", "HOURS", 1, "hour"),
  native("2h", "HOURS", 2, "hour"),
  native("4h", "HOURS", 4, "hour"),

  native("1D", "DAYS_LONGER", 1, "day"),
  native("1W", "DAYS_LONGER", 1, "week"),
  native("1M", "DAYS_LONGER", 1, "month"),
  off("1Q",    "DAYS_LONGER", 1, "quarter", NOT_BUILT_1Q),
  off("6M",    "DAYS_LONGER", 6, "month",   OPEN_6M),
  off("1Y",    "DAYS_LONGER", 1, "year",    OPEN_1Y),
]);

/** Display order and human names of the ladder's four groups. */
export const CANON_LADDER_GROUPS: readonly { id: CanonRungGroup; label: string }[] = Object.freeze([
  { id: "TICK_SECONDS", label: "Tick & seconds" },
  { id: "MINUTES",      label: "Minutes" },
  { id: "HOURS",        label: "Hours" },
  { id: "DAYS_LONGER",  label: "Days & longer" },
]);

/**
 * What a rung is called out loud. A servable rung borrows its chart id's name
 * so the ladder and the strip can never announce the same bars two ways; the
 * rest are named from their own size. TICK has no size yet, so it says so.
 */
export function canonRungSpokenName(rung: CanonRung): string {
  if (rung.availability !== "UNAVAILABLE") return timeframeSpokenName(rung.chartTf);
  if (rung.n === null) return "tick bars, trade count not yet chosen";
  return spokenBars(rung.n, rung.unit);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * THE LIVE FORMING BAR'S CLOCK — answered here, not in the hook (2026-09-26).
 *
 * `useWebSocket` carried its own table (Garden 16 §22: one registry, many
 * consumers) with three extra keys, "1t" / "5t" / "30t" — 1-, 5- and 30-SECOND
 * buckets whose names read like trade counts — and a `?? 60` default. No
 * caller could ever pass those keys (every mount hands it a TFId or the
 * literal "1m"), and the default meant that ANY id it did not know, a future
 * tick id included, was silently clocked as one-minute bars.
 *
 * Now: a TFId gets its registry candle; anything else gets null, and the hook
 * builds no forming bar for it. Fail closed.
 *
 * PRESERVED, NOT ENDORSED. Six TFIds were never in the hook's table and have
 * always fallen to that 60 s default: 45m and the five range ids. Their meaning
 * is the open decision named above (and in TIME_ENGINE_TRUTH §2: on a 1Y chart
 * the registry says daily bars, MainChart says a 365-day interval, Alpaca
 * serves monthly bars and the live bar forms by the minute). Moving them to
 * their registry candle would be choosing a meaning. So their current live
 * clock is kept exactly, and named here where the choice will be made.
 * ═══════════════════════════════════════════════════════════════════════════ */
const LIVE_BAR_SEC_PENDING_DECISION: Readonly<Partial<Record<TFId, number>>> = Object.freeze({
  "45m": 60, "3M": 60, "6M": 60, "1Y": 60, "2Y": 60, "5Y": 60,
});

/**
 * Is this id one whose MEANING is still the Founder's to decide — 45m (does it
 * stay?) and the five range ids (a candle of that size, or that much history
 * of daily/weekly bars?). Read off the table above, the one place these six are
 * already named as pending, so the ladder's words and the live clock cannot
 * disagree about which ids are open.
 */
export function timeframePendingFounderDecision(raw: string): boolean {
  return isTFId(raw) && LIVE_BAR_SEC_PENDING_DECISION[raw] !== undefined;
}

/** Seconds per live forming bar, or null when the id is not a registry clock. */
export function liveBarBucketSec(raw: string): number | null {
  if (!isTFId(raw)) return null;
  return LIVE_BAR_SEC_PENDING_DECISION[raw] ?? getTimeframe(raw).candleIntervalSec;
}
