/**
 * BACKTEST LAB — FVG STUDY MODE (Garden 19 §20–§21).
 *
 * A study, not a strategy. It asks the ONE engine (`detectFvgs`, FVG_3C) what
 * gaps formed in the backtest's bar history and READS them as of the study's
 * reading time through `fvgStateAsOf` — the same reducer the live chart and
 * Replay use, so the study cannot see a different past. It then tallies the
 * outcomes with the ONE descriptive tally (`describeFvgOutcomes` /
 * `describeFvgOutcomesBy`). Nothing here detects, ages or counts a gap of its
 * own, and nothing here predicts: every rate is `{count, of, share}` and the
 * whole block is labelled DESCRIPTIVE EVIDENCE.
 *
 * NO FUTURE LEAK. `asOfMs` is the study's clock. Bars after it are not read:
 * an object born at t has, as of t, no touch, no mitigation, no response —
 * even when the full history shows them (pinned in fvgStudy.test.ts).
 *
 * FILTERS (all descriptive splits of the same objects):
 *   instrument / timeframe — which series of the pool
 *   session                — the object's session segment (RTH / EXTENDED / window kind)
 *   regime                 — the regime tag at b2. Historical bars carry no
 *                            per-trade tape, and the regime owner
 *                            (selectRegimeSeries) reads the tape, so a bar-only
 *                            study is UNTAGGED and says so (`regimeNote`).
 *   direction              — BULLISH / BEARISH
 *   displacement           — b2's range in ATR(14) units, as RECORDED by the
 *                            engine (displacement context). The bands are a
 *                            reader's split, never a grade.
 *   crossesSession         — opening gaps vs within-session gaps
 *   structure / profile    — RELATIONSHIPS (fvgRelationships via fvgBarContext):
 *                            whether a confirmed swing was broken / reclaimed /
 *                            contained, and whether a POC / VAH / VAL of the
 *                            range profile of the 100 bars BEFORE the gap sits
 *                            inside or near it. Both read only pre-formation
 *                            bars, so stepping the clock cannot leak.
 *   order flow / walls     — Garden 19 §37: listed as EVIDENCE SPLITS that
 *                            say why they are not computed (`evidenceSplits`),
 *                            never silently absent:
 *                            · order flow is UNAVAILABLE — it needs signed
 *                              tape at each gap's bars, and historical bars
 *                              carry none (candles are never read as flow);
 *                            · options walls are WITHHELD — Cboe gives only the
 *                              CURRENT delayed chain, not the chain as of each
 *                              gap's formation day; reading today's walls
 *                              against past gaps would be a future leak.
 *
 * PURE. DETERMINISTIC. No IO, no clock.
 */

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { fvgBarContext, fvgBarOnlyRelationships, type FvgBarContext } from "@/lib/marketData/fvg/fvgBarContext";
import { fvgRelationshipFamilies, type RelationshipFamily } from "@/lib/marketData/fvg/fvgRelationships";
import { FVG_DEFINITION_ID, FVG_DEFINITION_VERSION } from "@/lib/marketData/fvg/fvgDefinition";
import { detectFvgs, fvgStateAsOf, type FvgLedger, type FvgObject } from "@/lib/marketData/fvg/fvgEngine";
import { FVG_VOLATILITY_FACET_VALUES, FVG_VOLATILITY_SCOPE_NOTE, fvgVolatilityAtFormationByTime, fvgVolatilityFacet, type FvgVolatilityFacet } from "@/lib/marketData/fvg/fvgFormationContext";
import {
  describeFvgOutcomes,
  describeFvgOutcomesBy,
  type FvgOutcomeStats,
  type FvgStatsDimension,
} from "@/lib/marketData/fvg/fvgStats";

export const FVG_STUDY_LABEL =
  "DESCRIPTIVE EVIDENCE — counts of what past gaps did under this definition. Not a prediction, not a probability." as const;

export const FVG_STUDY_REGIME_NOTE =
  "Regime is UNTAGGED: the regime owner reads the per-trade tape, and historical bars carry none. The split is shown, not guessed." as const;

/** b2's range in ATR(14) units — the engine's recorded displacement context. */
export const FVG_DISPLACEMENT_BANDS = ["RANGE_UNDER_1_ATR", "RANGE_1_TO_2_ATR", "RANGE_2_ATR_PLUS"] as const;
export type FvgDisplacementBand = (typeof FVG_DISPLACEMENT_BANDS)[number];

export const FVG_DISPLACEMENT_BAND_LABEL: Readonly<Record<FvgDisplacementBand, string>> = {
  RANGE_UNDER_1_ATR: "b2 range < 1× ATR",
  RANGE_1_TO_2_ATR: "b2 range 1–2× ATR",
  RANGE_2_ATR_PLUS: "b2 range ≥ 2× ATR",
};

export function fvgDisplacementBand(o: Pick<FvgObject, "displacement">): FvgDisplacementBand {
  const r = o.displacement.rangeAtr;
  if (r >= 2) return "RANGE_2_ATR_PLUS";
  if (r >= 1) return "RANGE_1_TO_2_ATR";
  return "RANGE_UNDER_1_ATR";
}

/**
 * A relationship split the study does NOT compute, with the reason — shown as
 * its own row, never silently absent (Garden 19 §37). UNAVAILABLE: the evidence
 * does not exist for these bars. WITHHELD: evidence exists but only from after
 * the gaps formed, so using it would leak the future.
 */
export interface FvgStudyEvidenceSplit {
  readonly split: "orderFlow" | "wall";
  readonly label: string;
  readonly status: "UNAVAILABLE" | "WITHHELD";
  readonly reason: string;
}

export const FVG_STUDY_ORDER_FLOW_SPLIT: FvgStudyEvidenceSplit = {
  split: "orderFlow",
  label: "Order-flow relationship",
  status: "UNAVAILABLE",
  reason: "needs signed tape (trades marked at the bid or the ask) at each gap's bars; historical bars carry none, and candles are never read as order flow",
};

export const FVG_STUDY_WALL_SPLIT: FvgStudyEvidenceSplit = {
  split: "wall",
  label: "Options-wall relationship",
  status: "WITHHELD",
  reason: "Cboe gives only the current delayed chain (open interest of the prior session), not the chain as of each gap's formation day — reading today's walls against past gaps would be a future leak, so the split is withheld",
};

export const FVG_STUDY_EVIDENCE_SPLITS: readonly FvgStudyEvidenceSplit[] = [FVG_STUDY_ORDER_FLOW_SPLIT, FVG_STUDY_WALL_SPLIT];

export interface FvgStudyFilters {
  readonly instrument?: string | "ALL";
  readonly timeframe?: string | "ALL";
  readonly session?: string | "ALL";
  readonly regime?: string | "ALL";
  readonly direction?: "BULLISH" | "BEARISH" | "ALL";
  readonly displacement?: FvgDisplacementBand | "ALL";
  readonly crossesSession?: "CROSSES_SESSION" | "WITHIN_SESSION" | "ALL";
  readonly structure?: "WITH_STRUCTURE" | "NO_STRUCTURE" | "ALL";
  readonly profile?: "WITH_PROFILE" | "NO_PROFILE" | "ALL";
  /** Volatility at formation, from closed bars up to the gap's middle bar (BARS scope — not the regime). */
  readonly volatility?: FvgVolatilityFacet | "ALL";
}

export interface FvgStudySeries {
  readonly symbolId: string;
  readonly timeframe: string;
  /** Closed canonical bars, oldest first. */
  readonly bars: readonly CanonicalBar[];
  readonly extendedHours?: boolean;
}

export interface FvgStudyInput {
  readonly series: readonly FvgStudySeries[];
  /** The study's clock (epoch ms). Nothing revealed after it is read. */
  readonly asOfMs: number;
  /** Only objects CREATED at or after this instant count (the Date Range). Earlier bars still warm ATR up. */
  readonly fromMs?: number;
  readonly filters?: FvgStudyFilters;
}

export interface FvgStudySeriesReading {
  readonly symbolId: string;
  readonly timeframe: string;
  readonly barsRead: number;
  readonly warmupTriples: number;
  readonly refusals: number;
  readonly detectedInWindow: number;
}

export type FvgStudyFacet = Exclude<FvgStatsDimension, never> | "displacement" | "structure" | "profile" | "volatility";

export interface FvgStudy {
  readonly label: typeof FVG_STUDY_LABEL;
  readonly definition: { readonly id: typeof FVG_DEFINITION_ID; readonly version: number };
  readonly asOfMs: number;
  readonly fromMs: number | null;
  readonly series: readonly FvgStudySeriesReading[];
  /** Objects in the window before filters. */
  readonly detectedInWindow: number;
  /** Objects that passed the filters (the denominator of `stats`). */
  readonly filtered: number;
  readonly stats: FvgOutcomeStats;
  /** The filtered objects split along each dimension. */
  readonly by: Readonly<Record<FvgStudyFacet, Readonly<Record<string, FvgOutcomeStats>>>>;
  /** Values each filter can take, with object counts (before filters). */
  readonly facets: Readonly<Record<FvgStudyFacet, readonly { readonly value: string; readonly count: number }[]>>;
  readonly regimeNote: string | null;
  /** What the volatility facet is — and is not: bars scope, never the regime (the helper's own line). */
  readonly volatilityNote: typeof FVG_VOLATILITY_SCOPE_NOTE;
  /** Relationship splits not computed here, each with its reason (§37). */
  readonly evidenceSplits: readonly FvgStudyEvidenceSplit[];
  readonly objects: readonly FvgObject[];
}

/** Relationship families per object, cached per bars array (they read only pre-formation bars). */
const relCache = new WeakMap<readonly CanonicalBar[], { ctx: FvgBarContext; byId: Map<string, ReadonlySet<RelationshipFamily>> }>();

export function fvgStudyRelationshipFamilies(s: FvgStudySeries, o: FvgObject): ReadonlySet<RelationshipFamily> {
  let c = relCache.get(s.bars);
  if (!c) { c = { ctx: fvgBarContext(s.bars, s.symbolId, s.timeframe), byId: new Map() }; relCache.set(s.bars, c); }
  let f = c.byId.get(o.objectId);
  if (!f) { f = fvgRelationshipFamilies(fvgBarOnlyRelationships(c.ctx, o)); c.byId.set(o.objectId, f); }
  return f;
}

/**
 * Volatility at each gap's formation (Garden 19 §5, ruling 2026-10-09): the ONE
 * helper reads only the closed bars up to and including the gap's middle bar,
 * so a later bar can never change a gap's group. Cached per bars array.
 */
const volCache = new WeakMap<readonly CanonicalBar[], Map<string, FvgVolatilityFacet>>();

export function fvgStudyVolatility(s: FvgStudySeries, o: FvgObject): FvgVolatilityFacet {
  let c = volCache.get(s.bars);
  if (!c) { c = new Map(); volCache.set(s.bars, c); }
  let v = c.get(o.objectId);
  if (!v) {
    v = fvgVolatilityFacet(fvgVolatilityAtFormationByTime({ bars: s.bars, b2OpenMs: o.bars.b2.asOf, timeOf: b => b.asOf }));
    c.set(o.objectId, v);
  }
  return v;
}

type Volatilities = ReadonlyMap<string, FvgVolatilityFacet>;
type Families = ReadonlyMap<string, ReadonlySet<RelationshipFamily>>;
const NO_FAMILIES: ReadonlySet<RelationshipFamily> = new Set();

const facetKeys = (families: Families, volatilities: Volatilities = new Map()): Readonly<Record<FvgStudyFacet, (o: FvgObject) => string>> => {
  const fam = (o: FvgObject) => families.get(o.objectId) ?? NO_FAMILIES;
  return {
  instrument: o => o.symbolId,
  timeframe: o => o.timeframe,
  session: o => o.session.segment,
  regime: o => o.regime,
  direction: o => o.direction,
  crossesSession: o => (o.session.crossesSession ? "CROSSES_SESSION" : "WITHIN_SESSION"),
  displacement: o => fvgDisplacementBand(o),
  structure: o => (fam(o).has("STRUCTURE") ? "WITH_STRUCTURE" : "NO_STRUCTURE"),
  profile: o => (fam(o).has("PROFILE") ? "WITH_PROFILE" : "NO_PROFILE"),
  volatility: o => volatilities.get(o.objectId) ?? "NOT_READ",
  };
};

const FACETS = Object.keys(facetKeys(new Map())) as FvgStudyFacet[];

function passes(o: FvgObject, f: FvgStudyFilters, FACET_KEY: ReturnType<typeof facetKeys>): boolean {
  const want: Record<FvgStudyFacet, string | undefined> = {
    instrument: f.instrument,
    timeframe: f.timeframe,
    session: f.session,
    regime: f.regime,
    direction: f.direction,
    crossesSession: f.crossesSession,
    displacement: f.displacement,
    structure: f.structure,
    profile: f.profile,
    volatility: f.volatility,
  };
  for (const k of FACETS) {
    const w = want[k];
    if (w && w !== "ALL" && FACET_KEY[k](o) !== w) return false;
  }
  return true;
}

/** The ledger as of the study clock — the ONE as-of accessor, nothing else. */
export function fvgStudyLedger(s: FvgStudySeries, asOfMs: number): FvgLedger {
  const full = detectFvgs(s.bars, { symbolId: s.symbolId, timeframe: s.timeframe, extendedHours: s.extendedHours });
  return fvgStateAsOf(full, asOfMs);
}

export function runFvgStudy(input: FvgStudyInput): FvgStudy {
  const fromMs = input.fromMs ?? null;
  const filters = input.filters ?? {};
  const readings: FvgStudySeriesReading[] = [];
  const windowObjects: FvgObject[] = [];
  const families = new Map<string, ReadonlySet<RelationshipFamily>>();
  const volatilities = new Map<string, FvgVolatilityFacet>();
  for (const s of input.series) {
    const ledger = fvgStudyLedger(s, input.asOfMs);
    const inWindow = ledger.objects.filter(o => fromMs === null || o.createdAt >= fromMs);
    windowObjects.push(...inWindow);
    for (const o of inWindow) families.set(o.objectId, fvgStudyRelationshipFamilies(s, o));
    for (const o of inWindow) volatilities.set(o.objectId, fvgStudyVolatility(s, o));
    readings.push({
      symbolId: s.symbolId,
      timeframe: s.timeframe,
      barsRead: ledger.barCount,
      warmupTriples: ledger.warmupTriples,
      refusals: ledger.refusals.length,
      detectedInWindow: inWindow.length,
    });
  }
  const FACET_KEY = facetKeys(families, volatilities);
  const objects = windowObjects.filter(o => passes(o, filters, FACET_KEY));
  const by = {} as Record<FvgStudyFacet, Readonly<Record<string, FvgOutcomeStats>>>;
  const facets = {} as Record<FvgStudyFacet, { value: string; count: number }[]>;
  for (const k of FACETS) {
    by[k] = k === "displacement" || k === "structure" || k === "profile" || k === "volatility" ? splitBy(objects, FACET_KEY[k]) : describeFvgOutcomesBy(objects, k);
    const counts = new Map<string, number>();
    for (const o of windowObjects) counts.set(FACET_KEY[k](o), (counts.get(FACET_KEY[k](o)) ?? 0) + 1);
    // Volatility reads in the helper's own order (compressed → normal → expanded → not read); the rest alphabetically.
    const rank = (v: string) => (k === "volatility" ? String((FVG_VOLATILITY_FACET_VALUES as readonly string[]).indexOf(v)).padStart(2, "0") : v);
    facets[k] = [...counts.entries()].sort(([a], [b]) => (rank(a) < rank(b) ? -1 : rank(a) > rank(b) ? 1 : 0)).map(([value, count]) => ({ value, count }));
  }
  const allUntagged = windowObjects.length > 0 && windowObjects.every(o => o.regime === "UNTAGGED");
  return {
    label: FVG_STUDY_LABEL,
    definition: { id: FVG_DEFINITION_ID, version: FVG_DEFINITION_VERSION },
    asOfMs: input.asOfMs,
    fromMs,
    series: readings,
    detectedInWindow: windowObjects.length,
    filtered: objects.length,
    stats: describeFvgOutcomes(objects),
    by,
    facets,
    regimeNote: allUntagged ? FVG_STUDY_REGIME_NOTE : null,
    volatilityNote: FVG_VOLATILITY_SCOPE_NOTE,
    evidenceSplits: FVG_STUDY_EVIDENCE_SPLITS,
    objects,
  };
}

function splitBy(objects: readonly FvgObject[], key: (o: FvgObject) => string): Readonly<Record<string, FvgOutcomeStats>> {
  const groups = new Map<string, FvgObject[]>();
  for (const o of objects) {
    const k = key(o);
    const g = groups.get(k);
    if (g) g.push(o);
    else groups.set(k, [o]);
  }
  const out: Record<string, FvgOutcomeStats> = {};
  for (const k of [...groups.keys()].sort()) out[k] = describeFvgOutcomes(groups.get(k)!);
  return out;
}

/* ── READING HELPERS (every number with its denominator) ─────────────────── */

export interface ShareLike { readonly count: number; readonly of: number; readonly share: number | null }

/**
 * A split group with fewer gaps than this is INSUFFICIENT: its counts are
 * shown (n of m) but no percentage is printed — a share of 3 of 5 reads like
 * a property of gaps and is not one.
 */
export const FVG_STUDY_MIN_SAMPLE = 20;

/** The sample word for a group of `detected` gaps. */
export function fvgSampleText(detected: number): string {
  return detected < FVG_STUDY_MIN_SAMPLE ? `${detected} · INSUFFICIENT (fewer than ${FVG_STUDY_MIN_SAMPLE})` : String(detected);
}

/**
 * "7 of 9 (78%)", or "0 of 0 — nothing to count". Never a bare percent. With
 * `insufficient`, the percentage is withheld: "3 of 5 — no share below 20 gaps".
 */
export function fvgShareText(s: ShareLike, opts: { readonly insufficient?: boolean } = {}): string {
  if (s.of === 0) return "0 of 0 — nothing to count";
  if (opts.insufficient) return `${s.count} of ${s.of} — no share below ${FVG_STUDY_MIN_SAMPLE} gaps`;
  return `${s.count} of ${s.of} (${Math.round((s.share ?? 0) * 100)}%)`;
}

/** Median bars to first touch with its sample, or why there is none. */
export function fvgMedianText(median: number | null, sample: number, unit: string): string {
  if (median === null || sample === 0) return `none touched — no median (0 of ${sample})`;
  const v = Number.isInteger(median) ? String(median) : median.toFixed(1);
  // "1 bars" was read on serving ada59d4 (NQ1! 5m, 2026-10-09): exactly one takes the singular.
  const word = median === 1 && unit.endsWith("s") ? unit.slice(0, -1) : unit;
  return `${v} ${word} (median of ${sample})`;
}

/**
 * A median or mean over `sample` gaps of a group of `detected`: printed only at
 * FVG_STUDY_MIN_SAMPLE gaps or more, like a share; below, the sample stands and
 * the number is withheld (a median of 3 reads like a property of gaps).
 */
export function fvgWithheldText(sample: number, detected: number, what: "median" | "mean"): string | null {
  return detected < FVG_STUDY_MIN_SAMPLE ? `${sample} of ${detected} — no ${what} below ${FVG_STUDY_MIN_SAMPLE} gaps` : null;
}

export interface FvgStudyStatRow {
  readonly label: string;
  readonly value: string;
  readonly testId?: string;
  /** Which column of the block (the §21 list in its order: revisits, then reach and response). */
  readonly column: 0 | 1;
}

/**
 * EVERY §21 outcome of one group, worded once — for the whole study and for
 * each split group alike. n-of-m always; INSUFFICIENT below
 * FVG_STUDY_MIN_SAMPLE withholds every share, median and mean.
 */
export function fvgStudyStatRows(s: FvgOutcomeStats, horizonLabel: Readonly<Record<string, string>>): readonly FvgStudyStatRow[] {
  const touched = s.touched.count;
  const insufficient = s.detected < FVG_STUDY_MIN_SAMPLE;
  const sh = (x: ShareLike) => fvgShareText(x, { insufficient });
  const clock = fvgDurationText(s.medianMsToFirstTouch);
  const rows: FvgStudyStatRow[] = [
    { column: 0, label: "Gaps counted", value: `${fvgSampleText(s.detected)} (${s.bullish} bullish · ${s.bearish} bearish)`, testId: "fvg-study-detected" },
    { column: 0, label: "Revisited (touched)", value: sh(s.touched), testId: "fvg-study-touched" },
    ...Object.keys(s.revisitByHorizon).map(h => ({ column: 0 as const, label: `· ${horizonLabel[h] ?? h}`, value: sh(s.revisitByHorizon[h as keyof typeof s.revisitByHorizon]) })),
    { column: 0, label: "Revisited in the same session", value: sh(s.revisitSameSession), testId: "fvg-study-same-session" },
    { column: 0, label: "Revisited in a later session", value: sh(s.revisitLaterSession), testId: "fvg-study-later-session" },
    { column: 0, label: "Time to first touch", value: touched === 0 ? fvgMedianText(null, 0, "bars") : fvgWithheldText(touched, s.detected, "median") ?? fvgMedianText(s.medianBarsToFirstTouch, touched, "bars") },
    { column: 0, label: "Time to first touch (clock)", value: touched === 0 || !clock ? `none touched (0 of ${s.detected})` : fvgWithheldText(touched, s.detected, "median") ?? `${clock} (median of ${touched})` },
    { column: 1, label: "Deepest reach · partial (<50%)", value: sh(s.partialMitigation) },
    { column: 1, label: "Deepest reach · deep (50–99%)", value: sh(s.deepMitigation) },
    { column: 1, label: "Deepest reach · full (100%)", value: sh(s.fullMitigation) },
    { column: 1, label: "Rejected after a touch", value: sh(s.rejectionAfterTouch) },
    { column: 1, label: "Accepted inside", value: sh(s.acceptance) },
    { column: 1, label: "Closed through the far edge", value: sh(s.tradeThrough) },
    { column: 1, label: "Still open", value: sh(s.stillOpen), testId: "fvg-study-still-open" },
    { column: 1, label: `· of those, younger than ${s.stillOpenYoungerThan.bars} bars (too young to judge)`, value: `${s.stillOpenYoungerThan.count} of ${s.stillOpen.count}` },
    { column: 1, label: "Average deepest penetration", value: s.avgMaxPenetration === null ? `none touched (0 of ${s.detected})` : fvgWithheldText(touched, s.detected, "mean") ?? `${Math.round(s.avgMaxPenetration * 100)}% of size (mean of ${touched})` },
    { column: 1, label: "Post-touch move away (ATR)", value: s.avgPostTouchDisplacementAtr === null ? `no complete window (0 of ${touched})` : fvgWithheldText(s.postTouchDisplacementSample, s.detected, "mean") ?? `${s.avgPostTouchDisplacementAtr.toFixed(2)}× ATR (mean of ${s.postTouchDisplacementSample} of ${touched})` },
  ];
  return rows;
}

/** A human duration for a median in ms. */
export function fvgDurationText(ms: number | null): string | null {
  if (ms === null || !Number.isFinite(ms)) return null;
  const min = ms / 60_000;
  if (min < 90) return `${Math.round(min)} min`;
  const h = min / 60;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} days`;
}

/** The study clock (epoch ms) at bar index i of a series: that bar's CLOSE, per the engine's own ledger. */
export function fvgStudyClockAt(s: FvgStudySeries, i: number): number | null {
  const full = detectFvgs(s.bars, { symbolId: s.symbolId, timeframe: s.timeframe, extendedHours: s.extendedHours });
  if (!full.closeTimes.length) return null;
  const k = Math.max(0, Math.min(full.closeTimes.length - 1, Math.floor(i)));
  return full.closeTimes[k];
}
