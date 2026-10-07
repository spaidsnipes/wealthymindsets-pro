/**
 * SCANNER — FVG CONDITIONS (Garden 19 §22).
 *
 * Five conditions, all read from the ONE engine (`detectFvgs`, FVG_3C) over
 * the closed bars the scanner reads, and all decided at the NEWEST CLOSED BAR
 * by comparing the object as of that bar's close with the object as of the
 * previous close — both through `fvgStateAsOf`, the one as-of accessor:
 *
 *   NEW_FVG                the object exists now and did not at the previous close
 *   PRICE_APPROACHING_FVG  untouched, and its latest state is APPROACHING
 *   FIRST_TOUCH            its first touch happened on the newest closed bar
 *   PARTIAL_MITIGATION     its deepest reach ENTERED partial (> 0, < 50 %) on that bar
 *   DEEP_MITIGATION        its deepest reach ENTERED deep (≥ 50 %, < 100 %) on that bar
 *
 * Only these for now. Convergence conditions (an FVG plus order flow, plus
 * derivatives …) are omitted until an owner provides that evidence by
 * reference — never faked here.
 *
 * REFUSALS, in plain words: bars unavailable, too few closed bars for ATR(14),
 * or bars too old to be a current reading (the newest close is older than the
 * timeframe's freshness allowance). A refused symbol is listed with its reason;
 * it is never silently absent and never read from stale bars.
 *
 * Every condition names the object it is about (OBJECT_ID) and the bar that
 * revealed it; the scanner's door to the chart is `fvgChartHref`.
 *
 * Nothing here predicts. A condition is an observed lifecycle fact, not a
 * signal grade, and nothing says price "has to" fill anything.
 *
 * PURE. No IO, no clock.
 */

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { FVG_DEFINITION_ID, FVG_DEFINITION_VERSION, type FvgDirection, type FvgMitigation, type FvgState } from "@/lib/marketData/fvg/fvgDefinition";
import { detectFvgs, fvgStateAsOf, type FvgObject } from "@/lib/marketData/fvg/fvgEngine";
import type { FvgBarFetch } from "@/lib/marketData/fvg/fvgBarSource";
import { fvgChartHref } from "@/lib/marketData/fvg/fvgChartLink";
import { getTimeframe, normalizeTFId } from "@/lib/timeframes";

export const FVG_SCAN_CONDITIONS = [
  "NEW_FVG",
  "PRICE_APPROACHING_FVG",
  "FIRST_TOUCH",
  "PARTIAL_MITIGATION",
  "DEEP_MITIGATION",
] as const;
export type FvgScanCondition = (typeof FVG_SCAN_CONDITIONS)[number];

export const FVG_SCAN_CONDITION_LABEL: Readonly<Record<FvgScanCondition, string>> = {
  NEW_FVG: "New FVG",
  PRICE_APPROACHING_FVG: "Price approaching FVG",
  FIRST_TOUCH: "First touch",
  PARTIAL_MITIGATION: "Partial mitigation",
  DEEP_MITIGATION: "Deep mitigation",
};

/** ATR(14) needs 14 true ranges at b2, plus b3: fewer closed bars can never hold a gap. */
export const FVG_SCAN_MIN_BARS = 17;

/**
 * How old the newest CLOSED bar may be (from its close) and still be a current
 * reading: for daily-and-longer bars, four days (a weekend plus a holiday) or
 * two bar intervals, whichever is longer; for intraday bars, three bar
 * intervals — an intraday reading from before a weekend is not current.
 */
export function fvgScanFreshnessMs(timeframe: string): number | null {
  const id = normalizeTFId(timeframe.trim());
  if (!id) return null;
  const sec = getTimeframe(id).candleIntervalSec;
  return sec >= 86_400 ? Math.max(4 * 86_400_000, 2 * sec * 1000) : 3 * sec * 1000;
}

export interface FvgScanHit {
  readonly condition: FvgScanCondition;
  readonly symbol: string;
  readonly timeframe: string;
  readonly objectId: string;
  readonly direction: FvgDirection;
  readonly bottom: number;
  readonly top: number;
  readonly state: FvgState;
  readonly mitigation: FvgMitigation;
  /** Close time (epoch ms) of the bar that revealed the condition. */
  readonly knownAt: number;
  readonly href: string;
}

export type FvgScanReading =
  | {
      readonly status: "READ";
      readonly symbol: string;
      readonly timeframe: string;
      readonly definition: { readonly id: typeof FVG_DEFINITION_ID; readonly version: number };
      readonly barsRead: number;
      /** Close time of the newest closed bar read. */
      readonly asOfMs: number;
      readonly hits: readonly FvgScanHit[];
    }
  | { readonly status: "REFUSED"; readonly symbol: string; readonly timeframe: string; readonly reason: string };

function hit(condition: FvgScanCondition, o: FvgObject, symbol: string, timeframe: string, knownAt: number): FvgScanHit {
  return {
    condition,
    symbol,
    timeframe,
    objectId: o.objectId,
    direction: o.direction,
    bottom: o.bottom,
    top: o.top,
    state: o.state,
    mitigation: o.mitigation,
    knownAt,
    href: fvgChartHref({ symbol, timeframe, objectId: o.objectId }),
  };
}

/** The five conditions on closed canonical bars. */
export function fvgScanConditionsFromBars(input: {
  readonly symbol: string;
  readonly timeframe: string;
  readonly bars: readonly CanonicalBar[];
  readonly nowMs: number;
  readonly extendedHours?: boolean;
}): FvgScanReading {
  const { symbol, timeframe } = input;
  const refuse = (reason: string): FvgScanReading => ({ status: "REFUSED", symbol, timeframe, reason });
  if (input.bars.length < FVG_SCAN_MIN_BARS) {
    return refuse(`Only ${input.bars.length} closed ${timeframe} bars — at least ${FVG_SCAN_MIN_BARS} are needed before ATR(14) exists and a gap can be read.`);
  }
  const fresh = fvgScanFreshnessMs(timeframe);
  if (fresh === null) return refuse(`The ${timeframe} timeframe has no bar clock, so no condition can be dated.`);
  const ledger = detectFvgs(input.bars, { symbolId: symbol, timeframe, extendedHours: input.extendedHours });
  const n = ledger.closeTimes.length;
  if (n < FVG_SCAN_MIN_BARS) return refuse(`Only ${n} of ${input.bars.length} bars were admitted by the engine — not enough to read a gap.`);
  const tNow = ledger.closeTimes[n - 1];
  const age = input.nowMs - tNow;
  if (age > fresh) {
    const days = age / 86_400_000;
    const ago = days >= 1 ? `${days.toFixed(1)} days` : `${Math.round(age / 60_000)} min`;
    return refuse(`The newest closed ${timeframe} bar closed ${ago} ago — too old to be a current reading, so no condition is claimed.`);
  }
  const now = fvgStateAsOf(ledger, tNow);
  const prev = fvgStateAsOf(ledger, ledger.closeTimes[n - 2]);
  const before = new Map(prev.objects.map(o => [o.objectId, o]));
  const hits: FvgScanHit[] = [];
  for (const o of now.objects) {
    const p = before.get(o.objectId) ?? null;
    if (!p) { hits.push(hit("NEW_FVG", o, symbol, timeframe, tNow)); continue; }
    if (o.coreState === "APPROACHING" && o.firstTouch === null) hits.push(hit("PRICE_APPROACHING_FVG", o, symbol, timeframe, tNow));
    if (o.firstTouch !== null && p.firstTouch === null) hits.push(hit("FIRST_TOUCH", o, symbol, timeframe, tNow));
    if (o.mitigation === "PARTIAL" && p.mitigation !== "PARTIAL") hits.push(hit("PARTIAL_MITIGATION", o, symbol, timeframe, tNow));
    if (o.mitigation === "DEEP" && p.mitigation !== "DEEP") hits.push(hit("DEEP_MITIGATION", o, symbol, timeframe, tNow));
  }
  return {
    status: "READ",
    symbol,
    timeframe,
    definition: { id: FVG_DEFINITION_ID, version: FVG_DEFINITION_VERSION },
    barsRead: n,
    asOfMs: tNow,
    hits,
  };
}

/** The five conditions from one bar fetch (refusal passes through in plain words). */
export function fvgScanConditions(input: {
  readonly symbol: string;
  readonly timeframe: string;
  readonly fetch: FvgBarFetch;
  readonly nowMs: number;
}): FvgScanReading {
  if (!input.fetch.ok) return { status: "REFUSED", symbol: input.symbol, timeframe: input.timeframe, reason: input.fetch.reason };
  return fvgScanConditionsFromBars({ symbol: input.symbol, timeframe: input.timeframe, bars: input.fetch.bars, nowMs: input.nowMs });
}

/** The denominator line: "read 24 of 30 symbols · 6 refused". */
export function fvgScanCoverage(readings: readonly FvgScanReading[]): { readonly read: number; readonly refused: number; readonly of: number } {
  const read = readings.filter(r => r.status === "READ").length;
  return { read, refused: readings.length - read, of: readings.length };
}
