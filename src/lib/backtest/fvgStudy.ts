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
 *                            bars, so stepping the clock cannot leak. Walls
 *                            need a chain or a book: not a bar-study filter.
 *
 * PURE. DETERMINISTIC. No IO, no clock.
 */

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { fvgBarContext, fvgBarOnlyRelationships, type FvgBarContext } from "@/lib/marketData/fvg/fvgBarContext";
import { fvgRelationshipFamilies, type RelationshipFamily } from "@/lib/marketData/fvg/fvgRelationships";
import { FVG_DEFINITION_ID, FVG_DEFINITION_VERSION } from "@/lib/marketData/fvg/fvgDefinition";
import { detectFvgs, fvgStateAsOf, type FvgLedger, type FvgObject } from "@/lib/marketData/fvg/fvgEngine";
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

export type FvgStudyFacet = Exclude<FvgStatsDimension, never> | "displacement" | "structure" | "profile";

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

type Families = ReadonlyMap<string, ReadonlySet<RelationshipFamily>>;
const NO_FAMILIES: ReadonlySet<RelationshipFamily> = new Set();

const facetKeys = (families: Families): Readonly<Record<FvgStudyFacet, (o: FvgObject) => string>> => {
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
  for (const s of input.series) {
    const ledger = fvgStudyLedger(s, input.asOfMs);
    const inWindow = ledger.objects.filter(o => fromMs === null || o.createdAt >= fromMs);
    windowObjects.push(...inWindow);
    for (const o of inWindow) families.set(o.objectId, fvgStudyRelationshipFamilies(s, o));
    readings.push({
      symbolId: s.symbolId,
      timeframe: s.timeframe,
      barsRead: ledger.barCount,
      warmupTriples: ledger.warmupTriples,
      refusals: ledger.refusals.length,
      detectedInWindow: inWindow.length,
    });
  }
  const FACET_KEY = facetKeys(families);
  const objects = windowObjects.filter(o => passes(o, filters, FACET_KEY));
  const by = {} as Record<FvgStudyFacet, Readonly<Record<string, FvgOutcomeStats>>>;
  const facets = {} as Record<FvgStudyFacet, { value: string; count: number }[]>;
  for (const k of FACETS) {
    by[k] = k === "displacement" || k === "structure" || k === "profile" ? splitBy(objects, FACET_KEY[k]) : describeFvgOutcomesBy(objects, k);
    const counts = new Map<string, number>();
    for (const o of windowObjects) counts.set(FACET_KEY[k](o), (counts.get(FACET_KEY[k](o)) ?? 0) + 1);
    facets[k] = [...counts.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([value, count]) => ({ value, count }));
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
  return `${v} ${unit} (median of ${sample})`;
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
