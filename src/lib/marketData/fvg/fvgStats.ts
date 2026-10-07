/**
 * FVG OUTCOMES — DESCRIPTIVE STATISTICS. Counts of what happened. Not
 * probabilities, not a forecast, not a grade.
 *
 * Reads only FVG objects from the one engine (`fvgEngine.ts`) — live, or as of
 * a time via `fvgStateAsOf` — and tallies them. Every rate is a `Share`
 * ({ count, of, share }) so a reader always sees the denominator: "7 of 9" is
 * a measurement, "78 %" alone reads like a promise. Nothing here may be
 * labelled a probability, a chance, an edge or a score, and nothing says a gap
 * "must" or "will" fill.
 *
 * RIGHT-CENSORING, stated: objects born near the end of the reading have had
 * little time to be revisited, so "still open" includes the young. Read
 * `stillOpenYoungerThan` before reading an open share as a property of gaps.
 *
 * PURE. DETERMINISTIC.
 */

import { FVG_DEFINITION_ID, FVG_HORIZONS, type FvgHorizon } from "./fvgDefinition";
import type { FvgObject } from "./fvgEngine";

export const FVG_STATS_LABEL = "DESCRIPTIVE — counts of what happened; not probabilities" as const;

export interface Share {
  readonly count: number;
  readonly of: number;
  /** count ÷ of, or null when `of` is 0. An observed fraction, not a probability. */
  readonly share: number | null;
}

export interface FvgOutcomeStats {
  readonly label: typeof FVG_STATS_LABEL;
  readonly definitionId: typeof FVG_DEFINITION_ID;
  readonly definitionVersions: readonly number[];
  readonly detected: number;
  readonly bullish: number;
  readonly bearish: number;
  readonly touched: Share;
  /** First-touch horizon tally (of all detected). */
  readonly revisitByHorizon: Readonly<Record<FvgHorizon, Share>>;
  /** Touched within IMMEDIATE or SAME_SESSION (of detected). */
  readonly revisitSameSession: Share;
  /** Touched in a later session — NEXT / LATER / MULTI_DAY (of detected). */
  readonly revisitLaterSession: Share;
  readonly medianBarsToFirstTouch: number | null;
  readonly medianMsToFirstTouch: number | null;
  /** Deepest tier reached, of touched. */
  readonly partialMitigation: Share;
  readonly deepMitigation: Share;
  readonly fullMitigation: Share;
  /** Objects with ≥ 1 REJECTED interaction, of touched. */
  readonly rejectionAfterTouch: Share;
  /** Objects with ≥ 1 ACCEPTED interaction, of touched. */
  readonly acceptance: Share;
  /** Objects closed through the far edge, of detected. */
  readonly tradeThrough: Share;
  /** Never touched as of the reading, of detected. */
  readonly stillOpen: Share;
  /** Of the still-open, how many are younger than 20 bars (right-censored). */
  readonly stillOpenYoungerThan: { readonly bars: number; readonly count: number };
  /** Mean deepest penetration among touched, fraction of size. */
  readonly avgMaxPenetration: number | null;
  /** Mean post-touch displacement (first interaction, completed windows only), ATR units. */
  readonly avgPostTouchDisplacementAtr: number | null;
  readonly postTouchDisplacementSample: number;
}

const share = (count: number, of: number): Share => ({ count, of, share: of > 0 ? count / of : null });

function median(xs: readonly number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const mean = (xs: readonly number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

const YOUNG_BARS = 20;

export function describeFvgOutcomes(objects: readonly FvgObject[]): FvgOutcomeStats {
  const n = objects.length;
  const touched = objects.filter(o => o.firstTouch !== null);
  const t = touched.length;
  const byHorizon = {} as Record<FvgHorizon, Share>;
  for (const h of FVG_HORIZONS) byHorizon[h] = share(objects.filter(o => o.horizon === h).length, n);
  const same = objects.filter(o => o.horizon === "IMMEDIATE" || o.horizon === "SAME_SESSION").length;
  const later = objects.filter(o => o.horizon === "NEXT_SESSION" || o.horizon === "LATER_SESSION" || o.horizon === "MULTI_DAY").length;
  const stillOpen = objects.filter(o => o.firstTouch === null);
  const disp = touched
    .map(o => o.interactions[0])
    .filter(it => it && it.displacementComplete)
    .map(it => it.displacementAtr);
  return {
    label: FVG_STATS_LABEL,
    definitionId: FVG_DEFINITION_ID,
    definitionVersions: [...new Set(objects.map(o => o.definitionVersion))].sort((a, b) => a - b),
    detected: n,
    bullish: objects.filter(o => o.direction === "BULLISH").length,
    bearish: objects.filter(o => o.direction === "BEARISH").length,
    touched: share(t, n),
    revisitByHorizon: byHorizon,
    revisitSameSession: share(same, n),
    revisitLaterSession: share(later, n),
    medianBarsToFirstTouch: median(touched.map(o => o.firstTouch!.barsAfterBirth)),
    medianMsToFirstTouch: median(touched.map(o => o.firstTouch!.msAfterBirth)),
    partialMitigation: share(touched.filter(o => o.mitigation === "PARTIAL").length, t),
    deepMitigation: share(touched.filter(o => o.mitigation === "DEEP").length, t),
    fullMitigation: share(touched.filter(o => o.mitigation === "FULL").length, t),
    rejectionAfterTouch: share(touched.filter(o => o.interactions.some(it => it.response === "REJECTED")).length, t),
    acceptance: share(touched.filter(o => o.interactions.some(it => it.response === "ACCEPTED")).length, t),
    tradeThrough: share(objects.filter(o => o.tradedThrough !== null).length, n),
    stillOpen: share(stillOpen.length, n),
    stillOpenYoungerThan: { bars: YOUNG_BARS, count: stillOpen.filter(o => o.ageBars < YOUNG_BARS).length },
    avgMaxPenetration: mean(touched.map(o => o.maxPenetration)),
    avgPostTouchDisplacementAtr: mean(disp),
    postTouchDisplacementSample: disp.length,
  };
}

export type FvgStatsDimension = "instrument" | "timeframe" | "session" | "regime" | "direction" | "crossesSession";

const KEY_OF: Readonly<Record<FvgStatsDimension, (o: FvgObject) => string>> = {
  instrument: o => o.symbolId,
  timeframe: o => o.timeframe,
  session: o => o.session.segment,
  regime: o => o.regime,
  direction: o => o.direction,
  crossesSession: o => (o.session.crossesSession ? "CROSSES_SESSION" : "WITHIN_SESSION"),
};

/** The same tally, split by one dimension. Keys sorted for a deterministic order. */
export function describeFvgOutcomesBy(
  objects: readonly FvgObject[],
  dimension: FvgStatsDimension,
): Readonly<Record<string, FvgOutcomeStats>> {
  const groups = new Map<string, FvgObject[]>();
  for (const o of objects) {
    const k = KEY_OF[dimension](o);
    const g = groups.get(k);
    if (g) g.push(o);
    else groups.set(k, [o]);
  }
  const out: Record<string, FvgOutcomeStats> = {};
  for (const k of [...groups.keys()].sort()) out[k] = describeFvgOutcomes(groups.get(k)!);
  return out;
}
