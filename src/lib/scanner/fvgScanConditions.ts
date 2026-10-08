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
 * CONVERGENCE (Garden 19 §18): an object that met one of the five conditions
 * AND holds a relationship to another owner's reading (fvgRelationships, from
 * bars alone via fvgBarContext) is ALSO listed as
 *   FVG_PLUS_STRUCTURE  a confirmed swing it broke / reclaimed / contains
 *   FVG_PLUS_PROFILE    a POC / VAH / VAL of the range profile of the bars
 *                       before it formed, inside or near the territory
 * each carrying the relationships and the source owner's evidence word.
 *
 * Garden 19 §39 (2026-10-08) — two more, ONLY where their evidence exists:
 *   FVG_PLUS_WALL        a call / put wall or gamma flip from the ONE options
 *                        owner (selectDerivativesPressure, Cboe DELAYED open
 *                        interest, prior session) inside or near the territory.
 *                        Read only for an options-bearing listed symbol whose
 *                        chain the caller fetched; otherwise UNAVAILABLE with
 *                        the reason (no listed chain, the owner drew nothing…).
 *   FVG_PLUS_ORDER_FLOW  needs SIGNED tape at the bar that revealed the
 *                        condition. The scanner reads daily HISTORY bars, and
 *                        no signed tape exists for them — always UNAVAILABLE
 *                        here, with that reason. Never read from candles.
 * An UNAVAILABLE condition is listed per symbol with its reason; it is never
 * silently absent and never a hit.
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
import { displayPrecisionFor } from "@/lib/chart/pricePrecision";
import { fvgBarContext, fvgBarOnlyRelationships } from "@/lib/marketData/fvg/fvgBarContext";
import { fvgRelationshipRows, fvgRelationshipsFor } from "@/lib/marketData/fvg/fvgRelationships";
import type { DerivativesPressureVM } from "@/lib/marketData/viewModels/selectDerivativesPressure";

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
  /** Decimals the instrument's prices print at (pricePrecision.displayPrecisionFor). */
  readonly priceDp: number;
}

export const FVG_CONVERGENCE_CONDITIONS = ["FVG_PLUS_STRUCTURE", "FVG_PLUS_PROFILE", "FVG_PLUS_WALL", "FVG_PLUS_ORDER_FLOW"] as const;
export type FvgConvergenceCondition = (typeof FVG_CONVERGENCE_CONDITIONS)[number];
export const FVG_CONVERGENCE_LABEL: Readonly<Record<FvgConvergenceCondition, string>> = {
  FVG_PLUS_STRUCTURE: "FVG + structure",
  FVG_PLUS_PROFILE: "FVG + profile",
  FVG_PLUS_WALL: "FVG + options wall",
  FVG_PLUS_ORDER_FLOW: "FVG + order flow",
};

/** The conditions whose evidence is not in the bars: read only when it exists, else UNAVAILABLE with a reason. */
export type FvgEvidenceCondition = Extract<FvgConvergenceCondition, "FVG_PLUS_WALL" | "FVG_PLUS_ORDER_FLOW">;

export interface FvgScanUnavailable {
  readonly condition: FvgEvidenceCondition;
  readonly reason: string;
}

/** Why the scanner never reads FVG + order flow: no signed tape exists for the bars it reads. */
export const FVG_SCAN_ORDER_FLOW_UNAVAILABLE =
  "needs signed tape (trades marked at the bid or the ask) at the bar that revealed the condition; the scanner reads history bars, and no signed tape exists for them — candles are never read as order flow";

/**
 * The options evidence for one symbol, as the caller found it: the one owner's
 * reading of a fetched chain, or why there is none.
 */
export type FvgScanWallEvidence =
  | { readonly vm: DerivativesPressureVM }
  | { readonly unavailable: string };

const PRESSURE_REASON_WORDS: Readonly<Record<string, string>> = {
  NO_CHAIN: "no options chain was returned",
  NO_SPOT: "the chain carried no underlying price",
  TOO_FEW_CONTRACTS: "too few contracts with open interest to read walls",
  NO_EXPOSURE: "the chain's open interest held no exposure to read",
  AFTER_REPLAY_CLOCK: "the chain was published after the bar read",
};

/** The wall evidence's plain reason when it cannot be read, or null when walls were read. */
export function fvgScanWallUnavailable(walls: FvgScanWallEvidence | undefined): string | null {
  if (!walls) return "options walls were not read for this symbol";
  if ("unavailable" in walls) return walls.unavailable;
  if (!walls.vm.drawn) return `Cboe delayed open interest: ${PRESSURE_REASON_WORDS[walls.vm.reason] ?? walls.vm.reason}`;
  return null;
}

export interface FvgConvergenceHit extends Omit<FvgScanHit, "condition"> {
  readonly condition: FvgConvergenceCondition;
  /** The FVG conditions this object met on the newest closed bar. */
  readonly with: readonly FvgScanCondition[];
  /** The relationships, as Inspect words them (spatial order), with their source evidence. */
  readonly relationships: readonly string[];
}

export interface FvgScanFeed {
  /** Trader words for the bars read, e.g. "daily history bars". */
  readonly label: string;
  /** The bars' own fidelity word (INDICATIVE …), or null. */
  readonly fidelity: string | null;
  /** Open time (epoch ms) of the newest closed bar read — the reading's as-of bar. */
  readonly barOpenMs: number;
}

/** "daily history bars" / "4h history bars"; "… built from finer bars" when the route reconstructed them. */
export function fvgScanFeedLabel(timeframe: string, provenance: string | null): string {
  const tf = timeframe === "1D" || timeframe === "D" ? "daily" : timeframe;
  return provenance === "DERIVED" ? `${tf} bars built from finer history` : `${tf} history bars`;
}

/** The sentence the strip prints under its results: whose bars, as of when, and that the chart may differ. */
export const FVG_SCAN_FEED_NOTE = "the chart reads its own feed, so a gap's state there can differ";

export type FvgScanReading =
  | {
      readonly status: "READ";
      readonly symbol: string;
      readonly timeframe: string;
      readonly definition: { readonly id: typeof FVG_DEFINITION_ID; readonly version: number };
      readonly barsRead: number;
      /** Close time of the newest closed bar read. */
      readonly asOfMs: number;
      /**
       * WHICH bars were read (chart lane serving read: the strip said "born"
       * while the chart's own feed read the same gap FULLY_MITIGATED). The
       * scanner reads the bar route's history; the chart may read a live
       * broker feed. Two readings are two truths — each says whose it is.
       */
      readonly feed: FvgScanFeed;
      readonly hits: readonly FvgScanHit[];
      /** Convergence (FVG + another owner's reading). Never a grade; each line names its source evidence. */
      readonly convergence: readonly FvgConvergenceHit[];
      /** Evidence conditions that could not be read for this symbol's hits, with the reason. Empty when nothing was hit. */
      readonly unavailable: readonly FvgScanUnavailable[];
    }
  | { readonly status: "REFUSED"; readonly symbol: string; readonly timeframe: string; readonly reason: string };

function hit(condition: FvgScanCondition, o: FvgObject, symbol: string, timeframe: string, knownAt: number, priceDp: number): FvgScanHit {
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
    href: fvgChartHref({ symbol, timeframe, objectId: o.objectId, territory: { bottom: o.bottom, top: o.top } }),
    priceDp,
  };
}

/** The five conditions on closed canonical bars. */
export function fvgScanConditionsFromBars(input: {
  readonly symbol: string;
  readonly timeframe: string;
  readonly bars: readonly CanonicalBar[];
  readonly nowMs: number;
  readonly extendedHours?: boolean;
  readonly provenance?: string | null;
  /** Options evidence for FVG + options wall; absent = not read (UNAVAILABLE when anything was hit). */
  readonly walls?: FvgScanWallEvidence;
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
  const dp = displayPrecisionFor(symbol, input.bars);
  const hits: FvgScanHit[] = [];
  for (const o of now.objects) {
    const p = before.get(o.objectId) ?? null;
    if (!p) { hits.push(hit("NEW_FVG", o, symbol, timeframe, tNow, dp)); continue; }
    if (o.coreState === "APPROACHING" && o.firstTouch === null) hits.push(hit("PRICE_APPROACHING_FVG", o, symbol, timeframe, tNow, dp));
    if (o.firstTouch !== null && p.firstTouch === null) hits.push(hit("FIRST_TOUCH", o, symbol, timeframe, tNow, dp));
    if (o.mitigation === "PARTIAL" && p.mitigation !== "PARTIAL") hits.push(hit("PARTIAL_MITIGATION", o, symbol, timeframe, tNow, dp));
    if (o.mitigation === "DEEP" && p.mitigation !== "DEEP") hits.push(hit("DEEP_MITIGATION", o, symbol, timeframe, tNow, dp));
  }
  const convergence: FvgConvergenceHit[] = [];
  const unavailable: FvgScanUnavailable[] = [];
  const hitIds = [...new Set(hits.map(h => h.objectId))];
  const wallReason = fvgScanWallUnavailable(input.walls);
  const wallVm = wallReason === null && input.walls && "vm" in input.walls ? input.walls.vm : null;
  if (hitIds.length) {
    if (wallReason !== null) unavailable.push({ condition: "FVG_PLUS_WALL", reason: wallReason });
    unavailable.push({ condition: "FVG_PLUS_ORDER_FLOW", reason: FVG_SCAN_ORDER_FLOW_UNAVAILABLE });
    const ctx = fvgBarContext(input.bars, symbol, timeframe);
    const fmt = (x: number) => x.toFixed(dp);
    for (const id of hitIds) {
      const o = now.objects.find(x => x.objectId === id)!;
      const reading = fvgBarOnlyRelationships(ctx, o);
      const base = hits.find(h => h.objectId === id)!;
      const withC = hits.filter(h => h.objectId === id).map(h => h.condition);
      for (const [family, condition] of [["STRUCTURE", "FVG_PLUS_STRUCTURE"], ["PROFILE", "FVG_PLUS_PROFILE"]] as const) {
        const fam = { ...reading, relationships: reading.relationships.filter(x => x.family === family) };
        if (!fam.relationships.length) continue;
        convergence.push({ ...base, condition, with: withC, relationships: fvgRelationshipRows(fam, fmt).rows });
      }
      // FVG + options wall: the ONE options owner's walls / flip, through the one relationship owner.
      if (wallVm) {
        const walls = fvgRelationshipsFor(o, { derivatives: wallVm });
        const fam = { ...walls, relationships: walls.relationships.filter(x => x.family === "WALL") };
        if (fam.relationships.length) convergence.push({ ...base, condition: "FVG_PLUS_WALL", with: withC, relationships: fvgRelationshipRows(fam, fmt).rows });
      }
    }
  }
  return {
    status: "READ",
    symbol,
    timeframe,
    definition: { id: FVG_DEFINITION_ID, version: FVG_DEFINITION_VERSION },
    barsRead: n,
    asOfMs: tNow,
    feed: {
      label: fvgScanFeedLabel(timeframe, input.provenance ?? null),
      fidelity: input.bars[input.bars.length - 1]?.fidelity ?? null,
      barOpenMs: input.bars[input.bars.length - 1]?.asOf ?? tNow,
    },
    hits,
    convergence,
    unavailable,
  };
}

/** The five conditions from one bar fetch (refusal passes through in plain words). */
export function fvgScanConditions(input: {
  readonly symbol: string;
  readonly timeframe: string;
  readonly fetch: FvgBarFetch;
  readonly nowMs: number;
  readonly walls?: FvgScanWallEvidence;
}): FvgScanReading {
  if (!input.fetch.ok) return { status: "REFUSED", symbol: input.symbol, timeframe: input.timeframe, reason: input.fetch.reason };
  return fvgScanConditionsFromBars({ symbol: input.symbol, timeframe: input.timeframe, bars: input.fetch.bars, nowMs: input.nowMs, provenance: input.fetch.provenance, walls: input.walls });
}

/**
 * Does this symbol carry a listed options chain the scanner may ask Cboe for?
 * Null when yes; otherwise the plain reason (futures, crypto and forex list no
 * options at Cboe — the scanner does not fall back to another provider).
 */
export function fvgScanWallChainRefusal(symbol: string, assetClass: string, cboeSymbol: string | null): string | null {
  if (assetClass === "FUTURES" || assetClass === "CRYPTO" || assetClass === "FOREX") {
    return `${symbol} has no listed options chain at Cboe (Cboe lists no ${assetClass.toLowerCase()} options), so no option wall is read`;
  }
  if (!cboeSymbol) return `${symbol} is not a symbol Cboe lists options for, so no option wall is read`;
  return null;
}

/** The denominator line: "read 24 of 30 symbols · 6 refused". */
export function fvgScanCoverage(readings: readonly FvgScanReading[]): { readonly read: number; readonly refused: number; readonly of: number } {
  const read = readings.filter(r => r.status === "READ").length;
  return { read, refused: readings.length - read, of: readings.length };
}
