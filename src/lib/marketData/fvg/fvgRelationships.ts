/**
 * FVG RELATIONSHIPS — context BY REFERENCE (Garden 19 §12, §16–§18).
 *
 * An FVG object can sit inside other owners' objects: a swing it broke or
 * reclaimed (STRUCTURE), a POC / VAH / VAL / HVN / LVN inside or near its
 * territory (PROFILE), an options wall, a gamma flip or a liquidity pool
 * there (WALL). This module states those relationships — it never computes
 * the other owners' readings (the caller hands their VMs in), never merges
 * them into the gap, and never upgrades their evidence: each relationship
 * carries its SOURCE owner's evidence word (FULL / PARTIAL / DEGRADED /
 * SILENCE) and provenance. An owner that had nothing to say is listed as a
 * SILENCE, never omitted and never guessed.
 *
 * EVIDENCE WORDS, from each owner's own state (a stated mapping, not a grade):
 *   structure   selectMarketStructure measured → FULL (pivots from OHLC);
 *               unreadable sequence but confirmed pivots published → PARTIAL;
 *               no pivots → SILENCE (its insufficientNote).
 *   profile     drawn/measured + trade-based → FULL; candle-estimated →
 *               PARTIAL (an estimate of where volume traded); not drawn → SILENCE.
 *   options     selectDerivativesPressure drawn: SNAPSHOT → PARTIAL, DELAYED →
 *               DEGRADED (exposure is INFERRED either way); not drawn → SILENCE
 *               with the owner's reason (incl. AFTER_REPLAY_CLOCK).
 *   liquidity   selectLiquidityLifecycle drawn: OBSERVED_BOOK → FULL (one
 *               named venue's book); CANDLE_ESTIMATED → PARTIAL; else SILENCE.
 *
 * GEOMETRY (DERIVED MEASUREMENT — arithmetic on the two owners' prices):
 *   INSIDE   the level lies within the gap's [bottom, top]
 *   NEAR     outside, within the gap's own approach distance (FVG_3C rule)
 *   OVERLAPS a band (liquidity pool) intersects the territory
 *   STRUCTURE: BROKE_SWING  — b2 CLOSED beyond the latest swing on the gap's
 *                             side that was CONFIRMED before b2 opened
 *              RECLAIMED_SWING — b1/b2 wicked beyond an opposite confirmed
 *                             swing and b2 closed back over it
 *              SWING_INSIDE — a confirmed swing price lies in the territory
 *   A swing counts only once confirmed (pivot time + lookback bars ≤ b2's
 *   open): the structure owner's own confirmation lag, so no relationship can
 *   use a pivot the market had not yet confirmed.
 *
 * EFFORT→RESPONSE and ORDER FLOW (Garden 19 §13, §14 — 2026-10-09). Two more
 * families, ANCHORED TO BARS THE GAP ALREADY NAMES — the displacement bar b2
 * and the first bar of each interaction the engine recorded — never a
 * neighbour's bar:
 *   effort      the Response Matrix cell of that bar, in its owner's word
 *               (effortEvidence.cellFor via readEffortResponseField), each bar
 *               ranked over the trailing closed bars ENDING at that bar, so no
 *               later bar can re-rank it. Real traded volume → FULL; a market
 *               that reports no traded volume (spot FX, a placeholder feed) or
 *               a bar the field could not read → SILENCE with the owner's reason.
 *   order flow  who took the larger share of that bar's SIGNED volume, in the
 *               one side owner's word (tapeSideVerdict.readTapeSide). Captured
 *               signed prints → FULL (PARTIAL when the tape cannot vouch for
 *               the whole bar); the provider's per-bar bid / ask volume →
 *               PARTIAL (an aggregate, never prints); no signed volume for the
 *               bar → SILENCE. Candles are never read as order flow.
 * The readings are handed in (fvgEffortFlow builds them from the owners); this
 * module only places them on the gap and carries the evidence word.
 *
 * PURE. No IO, no clock.
 */

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import type { FvgObject } from "./fvgEngine";
import type { MarketStructureVM } from "@/lib/marketData/viewModels/selectMarketStructure";
import type { LiquidityLifecycleVM } from "@/lib/marketData/viewModels/selectLiquidityLifecycle";
import type { DerivativesPressureVM } from "@/lib/marketData/viewModels/selectDerivativesPressure";
import { profileEstWord } from "@/lib/marketData/viewModels/profileEvidenceWord";
import { getTimeframe, normalizeTFId } from "@/lib/timeframes";

export type RelationshipEvidence = "FULL" | "PARTIAL" | "DEGRADED" | "SILENCE";
export type RelationshipFamily = "STRUCTURE" | "PROFILE" | "WALL" | "EFFORT_RESPONSE" | "ORDER_FLOW";

export interface RelationshipSource {
  readonly family: RelationshipFamily;
  /** The owning module, e.g. "selectMarketStructure". */
  readonly owner: string;
  /** Which reading of that owner, e.g. "Living Profile", "Visible Range". */
  readonly label: string;
  readonly evidence: RelationshipEvidence;
  /** How the owner knew it, in its own words. */
  readonly provenance: string;
}

export type RelationshipKind =
  | "BROKE_SWING" | "RECLAIMED_SWING" | "SWING_INSIDE"
  | "POC" | "VAH" | "VAL" | "HVN" | "LVN"
  | "CALL_WALL" | "PUT_WALL" | "GAMMA_FLIP" | "LIQUIDITY_POOL"
  | "DISPLACEMENT_EFFORT" | "TOUCH_EFFORT" | "DISPLACEMENT_FLOW" | "TOUCH_FLOW";

export type RelationshipRelation = "INSIDE" | "NEAR" | "OVERLAPS" | "AT_FORMATION" | "AT_TOUCH";

export interface FvgRelationship {
  readonly family: RelationshipFamily;
  readonly kind: RelationshipKind;
  readonly relation: RelationshipRelation;
  /** The other object's price (a band's low when `priceHigh` is set). */
  readonly price: number;
  readonly priceHigh: number | null;
  /** Distance from the territory (0 inside), price units. */
  readonly distance: number;
  /** The other owner's own state word, verbatim, when it has one (wall life, pool stage). */
  readonly ownerState: string | null;
  /** The owner's own plain words for a bar reading (effort / order flow), or absent. */
  readonly note?: string | null;
  /** Which interaction a touch-bar reading belongs to (the engine's episode number), or absent. */
  readonly episode?: number | null;
  readonly source: RelationshipSource;
  readonly tag: "DERIVED MEASUREMENT";
}

export interface FvgRelationshipReading {
  readonly objectId: string;
  /** Spatially ordered, highest price first — the order Inspect lists them. */
  readonly relationships: readonly FvgRelationship[];
  /** Every owner consulted, with its evidence word — SILENCE included. */
  readonly sources: readonly RelationshipSource[];
  /**
   * An owner that DREW levels, none of them inside or near this gap: said, with the nearest one, so
   * "no row" is never mistaken for "nothing was read" (options walls, 2026-10-09).
   */
  readonly absences?: readonly RelationshipAbsence[];
}

export interface RelationshipAbsence {
  readonly family: RelationshipFamily;
  readonly label: string;
  /** The owner's nearest level to the territory, and its distance from it (price units). */
  readonly nearest: number;
  readonly distance: number;
}

/* ── SOURCES: owner VM → evidence word + the levels it publishes ───────────── */

export interface StructureInput {
  readonly vm: MarketStructureVM;
  /** Bar length (seconds) of the bars the owner read — for the confirmation lag. */
  readonly barSec: number;
}

export interface ProfileInput {
  readonly owner: string;
  readonly label: string;
  readonly drawn: boolean;
  readonly quality: string | null;
  readonly poc: number | null;
  readonly vah: number | null;
  readonly val: number | null;
  readonly hvn?: readonly number[];
  readonly lvn?: readonly number[];
  /** Why the owner did not draw, in its words. */
  readonly reason?: string | null;
}

/** One bar's reading from an owner, placed on the gap by its anchor. */
export interface AnchoredBarReading {
  readonly anchor: "DISPLACEMENT" | "TOUCH";
  /** The engine's episode number for a TOUCH reading; null for the displacement bar. */
  readonly episode: number | null;
  /** That bar's close. */
  readonly price: number;
  /** The owner's state word, verbatim (a Response Matrix cell; a tape side). */
  readonly state: string;
  /** The owner's plain words for the bar. */
  readonly words: string;
  /** Order flow only: the tape cannot vouch for the whole bar. */
  readonly partial?: boolean;
}

export interface EffortInput {
  /** volumeTruth's verdict for this market. */
  readonly volumeReal: boolean;
  /** Why nothing could be read, in the owner's words. */
  readonly silenceWhy: string | null;
  /** How many trailing closed bars each bar was ranked over. */
  readonly windowBars: number;
  readonly readings: readonly AnchoredBarReading[];
}

export interface FlowInput {
  /** TAPE = captured signed prints; SIDES = the provider's per-bar bid / ask volume; null = neither. */
  readonly basis: "TAPE" | "SIDES" | null;
  readonly silenceWhy: string | null;
  readonly readings: readonly AnchoredBarReading[];
}

export interface FvgRelationshipInputs {
  readonly effort?: EffortInput | null;
  readonly flow?: FlowInput | null;
  readonly structure?: StructureInput | null;
  readonly profiles?: readonly ProfileInput[];
  readonly derivatives?: DerivativesPressureVM | null;
  readonly liquidity?: LiquidityLifecycleVM | null;
}

export function structureSource(s: StructureInput | null | undefined): RelationshipSource {
  if (!s) return { family: "STRUCTURE", owner: "selectMarketStructure", label: "Market structure", evidence: "SILENCE", provenance: "no structure reading attached" };
  if (s.vm.measured) return { family: "STRUCTURE", owner: "selectMarketStructure", label: "Market structure", evidence: "FULL", provenance: `confirmed ${s.vm.lookback}-bar pivots from OHLC; ${s.vm.confirmationLagNote}` };
  // The owner still publishes the pivots that DID confirm when the sequence is
  // unreadable ("withholding them would be a second refusal") — real pivots,
  // no readable sequence: PARTIAL, in the owner's own words.
  if (s.vm.swingHighs.length || s.vm.swingLows.length) {
    return { family: "STRUCTURE", owner: "selectMarketStructure", label: "Market structure", evidence: "PARTIAL", provenance: `confirmed pivots only — ${s.vm.insufficientNote ?? "no readable swing sequence"}` };
  }
  return { family: "STRUCTURE", owner: "selectMarketStructure", label: "Market structure", evidence: "SILENCE", provenance: s.vm.insufficientNote ?? "no readable swing sequence" };
}

export function profileSource(p: ProfileInput): RelationshipSource {
  if (!p.drawn || p.poc === null) {
    return { family: "PROFILE", owner: p.owner, label: p.label, evidence: "SILENCE", provenance: p.reason ?? "the profile did not draw" };
  }
  const est = profileEstWord(p.quality);
  return {
    family: "PROFILE",
    owner: p.owner,
    label: p.label,
    evidence: est ? "PARTIAL" : "FULL",
    provenance: est ? "volume placed by candle estimate (CANDLE-EST)" : "volume placed by classified prints (trade-based)",
  };
}

export function derivativesSource(vm: DerivativesPressureVM | null | undefined): RelationshipSource {
  if (!vm) return { family: "WALL", owner: "selectDerivativesPressure", label: "Options walls", evidence: "SILENCE", provenance: "no options positioning attached" };
  if (!vm.drawn) return { family: "WALL", owner: "selectDerivativesPressure", label: "Options walls", evidence: "SILENCE", provenance: `the owner drew nothing: ${vm.reason}` };
  return {
    family: "WALL",
    owner: "selectDerivativesPressure",
    label: "Options walls",
    evidence: vm.fidelity === "DELAYED" ? "DEGRADED" : "PARTIAL",
    provenance: `${vm.fidelity} chain (${vm.contracts} contracts); exposure ${vm.epistemic.exposure}, tests ${vm.epistemic.tests}`,
  };
}

export function liquiditySource(vm: LiquidityLifecycleVM | null | undefined): RelationshipSource {
  if (!vm) return { family: "WALL", owner: "selectLiquidityLifecycle", label: "Liquidity pools", evidence: "SILENCE", provenance: "no liquidity reading attached" };
  if (!vm.drawn) return { family: "WALL", owner: "selectLiquidityLifecycle", label: "Liquidity pools", evidence: "SILENCE", provenance: `the owner drew nothing: ${vm.reason}` };
  return vm.basis === "OBSERVED_BOOK"
    ? { family: "WALL", owner: "selectLiquidityLifecycle", label: "Liquidity pools", evidence: "FULL", provenance: `resting size observed on ${vm.venue ?? "one venue"}'s book` }
    : { family: "WALL", owner: "selectLiquidityLifecycle", label: "Liquidity pools", evidence: "PARTIAL", provenance: "volume-at-price estimated from candles" };
}

export const EFFORT_NOT_ATTACHED = "no effort→response reading attached";
export const FLOW_NOT_ATTACHED = "no signed volume attached for the gap's bars — candles are never read as order flow";

export function effortSource(e: EffortInput | null | undefined): RelationshipSource {
  const base = { family: "EFFORT_RESPONSE" as const, owner: "readEffortResponseField", label: "Effort→response" };
  if (!e) return { ...base, evidence: "SILENCE", provenance: EFFORT_NOT_ATTACHED };
  if (!e.volumeReal) return { ...base, evidence: "SILENCE", provenance: e.silenceWhy ?? "this market reports no traded volume, so effort cannot be weighed" };
  if (!e.readings.length) return { ...base, evidence: "SILENCE", provenance: e.silenceWhy ?? "the field could not read the gap's bars" };
  return { ...base, evidence: "FULL", provenance: `traded volume; each bar ranked over the ${e.windowBars} closed bars ending at that bar` };
}

export function flowSource(f: FlowInput | null | undefined): RelationshipSource {
  const base = { family: "ORDER_FLOW" as const, owner: "readTapeSide", label: "Order flow" };
  if (!f || f.basis === null || !f.readings.length) return { ...base, evidence: "SILENCE", provenance: f?.silenceWhy ?? FLOW_NOT_ATTACHED };
  if (f.basis === "SIDES") return { ...base, evidence: "PARTIAL", provenance: "the provider's per-bar bid / ask volume — an aggregate for the bar, not prints" };
  return f.readings.some(r => r.partial)
    ? { ...base, evidence: "PARTIAL", provenance: "captured signed prints; the tape cannot vouch for the whole of at least one of these bars" }
    : { ...base, evidence: "FULL", provenance: "captured signed prints for these bars" };
}

function anchoredRelationships(family: "EFFORT_RESPONSE" | "ORDER_FLOW", readings: readonly AnchoredBarReading[], src: RelationshipSource): FvgRelationship[] {
  if (src.evidence === "SILENCE") return [];
  return readings.map(r => ({
    family,
    kind: (family === "EFFORT_RESPONSE" ? (r.anchor === "DISPLACEMENT" ? "DISPLACEMENT_EFFORT" : "TOUCH_EFFORT") : (r.anchor === "DISPLACEMENT" ? "DISPLACEMENT_FLOW" : "TOUCH_FLOW")) as RelationshipKind,
    relation: (r.anchor === "DISPLACEMENT" ? "AT_FORMATION" : "AT_TOUCH") as RelationshipRelation,
    price: r.price, priceHigh: null, distance: 0, ownerState: r.state, note: r.words, episode: r.episode, source: src, tag: "DERIVED MEASUREMENT" as const,
  }));
}

/* ── GEOMETRY ──────────────────────────────────────────────────────────────── */

const distanceTo = (o: Pick<FvgObject, "bottom" | "top">, p: number) => (p < o.bottom ? o.bottom - p : p > o.top ? p - o.top : 0);

function levelRelation(o: Pick<FvgObject, "bottom" | "top" | "approachDistance">, p: number): RelationshipRelation | null {
  if (!Number.isFinite(p)) return null;
  const d = distanceTo(o, p);
  if (d === 0) return "INSIDE";
  return d <= o.approachDistance ? "NEAR" : null;
}

function rel(family: RelationshipFamily, kind: RelationshipKind, relation: RelationshipRelation, price: number, priceHigh: number | null, distance: number, ownerState: string | null, source: RelationshipSource): FvgRelationship {
  return { family, kind, relation, price, priceHigh, distance, ownerState, source, tag: "DERIVED MEASUREMENT" };
}

/** Structure relationships, using only swings CONFIRMED before b2 opened. */
/** The bar fields the break / reclaim test reads (a CanonicalBar, or a renderer tuple keyed by asOf). */
export type RelationshipBar = Pick<CanonicalBar, "asOf" | "low" | "high" | "close"> & { readonly barId?: string };

function structureRelationships(o: FvgObject, s: StructureInput, src: RelationshipSource, bars: readonly RelationshipBar[]): FvgRelationship[] {
  if (src.evidence === "SILENCE") return [];
  const out: FvgRelationship[] = [];
  const b2OpenSec = o.bars.b2.asOf / 1000;
  const lagSec = s.vm.lookback * s.barSec;
  const confirmed = (pts: readonly { time: number; price: number }[]) => pts.filter(p => p.time + lagSec <= b2OpenSec);
  const highs = confirmed(s.vm.swingHighs);
  const lows = confirmed(s.vm.swingLows);
  const byId = new Map<string, RelationshipBar>();
  const byAsOf = new Map<number, RelationshipBar>();
  for (const b of bars) { if (b.barId) byId.set(b.barId, b); byAsOf.set(b.asOf, b); }
  const b1 = byId.get(o.bars.b1.barId) ?? byAsOf.get(o.bars.b1.asOf);
  const b2 = byId.get(o.bars.b2.barId) ?? byAsOf.get(o.bars.b2.asOf);
  if (b1 && b2) {
    const bull = o.direction === "BULLISH";
    const lastSame = ((xs) => xs[xs.length - 1])(bull ? highs : lows);
    if (lastSame && (bull ? b2.close > lastSame.price && b1.close <= lastSame.price : b2.close < lastSame.price && b1.close >= lastSame.price)) {
      out.push(rel("STRUCTURE", "BROKE_SWING", "AT_FORMATION", lastSame.price, null, distanceTo(o, lastSame.price), null, src));
    }
    const lastOpp = ((xs) => xs[xs.length - 1])(bull ? lows : highs);
    if (lastOpp) {
      const wick = bull ? Math.min(b1.low, b2.low) : Math.max(b1.high, b2.high);
      if (bull ? wick < lastOpp.price && b2.close > lastOpp.price : wick > lastOpp.price && b2.close < lastOpp.price) {
        out.push(rel("STRUCTURE", "RECLAIMED_SWING", "AT_FORMATION", lastOpp.price, null, distanceTo(o, lastOpp.price), null, src));
      }
    }
  }
  for (const p of [...highs, ...lows]) {
    if (distanceTo(o, p.price) === 0) out.push(rel("STRUCTURE", "SWING_INSIDE", "INSIDE", p.price, null, 0, null, src));
  }
  return out;
}

function profileRelationships(o: FvgObject, p: ProfileInput, src: RelationshipSource): FvgRelationship[] {
  if (src.evidence === "SILENCE") return [];
  const out: FvgRelationship[] = [];
  const levels: [RelationshipKind, number | null][] = [["POC", p.poc], ["VAH", p.vah], ["VAL", p.val]];
  for (const n of p.hvn ?? []) levels.push(["HVN", n]);
  for (const n of p.lvn ?? []) levels.push(["LVN", n]);
  for (const [kind, price] of levels) {
    if (price === null) continue;
    const r = levelRelation(o, price);
    if (r) out.push(rel("PROFILE", kind, r, price, null, distanceTo(o, price), null, src));
  }
  return out;
}

function derivativesRelationships(o: FvgObject, vm: DerivativesPressureVM | null | undefined, src: RelationshipSource): FvgRelationship[] {
  if (!vm || !vm.drawn || src.evidence === "SILENCE") return [];
  const out: FvgRelationship[] = [];
  for (const w of vm.walls) {
    const r = levelRelation(o, w.strike);
    // CALL / PUT by the owner's own open interest at that strike (whichever is larger).
    if (r) out.push(rel("WALL", w.callOi >= w.putOi ? "CALL_WALL" : "PUT_WALL", r, w.strike, null, distanceTo(o, w.strike), w.life, src));
  }
  if (vm.zeroGamma !== null) {
    const r = levelRelation(o, vm.zeroGamma);
    if (r) out.push(rel("WALL", "GAMMA_FLIP", r, vm.zeroGamma, null, distanceTo(o, vm.zeroGamma), null, src));
  }
  return out;
}

function liquidityRelationships(o: FvgObject, vm: LiquidityLifecycleVM | null | undefined, src: RelationshipSource): FvgRelationship[] {
  if (!vm || !vm.drawn || src.evidence === "SILENCE") return [];
  const out: FvgRelationship[] = [];
  for (const p of vm.pools) {
    const lo = Math.min(p.low, p.high), hi = Math.max(p.low, p.high);
    const overlaps = lo <= o.top && hi >= o.bottom;
    const d = overlaps ? 0 : lo > o.top ? lo - o.top : o.bottom - hi;
    if (overlaps || d <= o.approachDistance) out.push(rel("WALL", "LIQUIDITY_POOL", overlaps ? "OVERLAPS" : "NEAR", lo, hi, d, p.stage, src));
  }
  return out;
}

/** The bar length (seconds) for a timeframe id, or null. */
export function relationshipBarSec(timeframe: string): number | null {
  const id = normalizeTFId(timeframe.trim());
  return id ? getTimeframe(id).candleIntervalSec : null;
}

/**
 * Every relationship of one FVG object to the owners' readings handed in.
 * `bars` are the closed canonical bars the object was detected on (b1/b2 are
 * looked up by barId for the break/reclaim test).
 */
export function fvgRelationshipsFor(o: FvgObject, inputs: FvgRelationshipInputs, bars: readonly RelationshipBar[] = []): FvgRelationshipReading {
  const sources: RelationshipSource[] = [];
  const out: FvgRelationship[] = [];
  const sSrc = structureSource(inputs.structure);
  sources.push(sSrc);
  if (inputs.structure) out.push(...structureRelationships(o, inputs.structure, sSrc, bars));
  const profiles = inputs.profiles ?? [];
  if (!profiles.length) sources.push({ family: "PROFILE", owner: "profile owners", label: "Profiles", evidence: "SILENCE", provenance: "no profile reading attached" });
  for (const p of profiles) {
    const src = profileSource(p);
    sources.push(src);
    out.push(...profileRelationships(o, p, src));
  }
  const dSrc = derivativesSource(inputs.derivatives);
  sources.push(dSrc);
  const wallRels = derivativesRelationships(o, inputs.derivatives, dSrc);
  out.push(...wallRels);
  const absences: RelationshipAbsence[] = [];
  if (inputs.derivatives?.drawn && dSrc.evidence !== "SILENCE" && !wallRels.length) {
    const levels = [...inputs.derivatives.walls.map(w => w.strike), ...(inputs.derivatives.zeroGamma !== null ? [inputs.derivatives.zeroGamma] : [])].filter(Number.isFinite);
    if (levels.length) {
      const nearest = levels.reduce((a, b) => (distanceTo(o, b) < distanceTo(o, a) ? b : a));
      absences.push({ family: "WALL", label: dSrc.label, nearest, distance: distanceTo(o, nearest) });
    }
  }
  const lSrc = liquiditySource(inputs.liquidity);
  sources.push(lSrc);
  out.push(...liquidityRelationships(o, inputs.liquidity, lSrc));
  out.sort((a, b) => (b.priceHigh ?? b.price) - (a.priceHigh ?? a.price));
  // Bar readings follow the spatial ones, in time order (formation, then each touch) — they are about a bar, not a level.
  const eSrc = effortSource(inputs.effort);
  sources.push(eSrc);
  if (inputs.effort) out.push(...anchoredRelationships("EFFORT_RESPONSE", inputs.effort.readings, eSrc));
  const fSrc = flowSource(inputs.flow);
  sources.push(fSrc);
  if (inputs.flow) out.push(...anchoredRelationships("ORDER_FLOW", inputs.flow.readings, fSrc));
  return { objectId: o.objectId, relationships: out, sources, ...(absences.length ? { absences } : {}) };
}

/** The families that hold at least one relationship (for scanner / backtest splits). */
export function fvgRelationshipFamilies(r: FvgRelationshipReading): ReadonlySet<RelationshipFamily> {
  return new Set(r.relationships.map(x => x.family));
}

/** Inspect rows, one per relationship, spatially ordered; then the silences. Numbers formatted by the caller's `fmt`. */
export function fvgRelationshipRows(r: FvgRelationshipReading, fmt: (p: number) => string): { readonly rows: readonly string[]; readonly silences: readonly string[]; readonly absences: readonly string[] } {
  const KIND: Readonly<Record<RelationshipKind, string>> = {
    BROKE_SWING: "broke the swing", RECLAIMED_SWING: "reclaimed the swing", SWING_INSIDE: "swing inside",
    POC: "POC", VAH: "VAH", VAL: "VAL", HVN: "HVN", LVN: "LVN",
    CALL_WALL: "call wall", PUT_WALL: "put wall", GAMMA_FLIP: "gamma flip", LIQUIDITY_POOL: "liquidity pool",
    DISPLACEMENT_EFFORT: "displacement bar", TOUCH_EFFORT: "touch bar", DISPLACEMENT_FLOW: "displacement bar", TOUCH_FLOW: "touch bar",
  };
  const rows = r.relationships.map(x => {
    if (x.family === "EFFORT_RESPONSE" || x.family === "ORDER_FLOW") {
      const which = x.relation === "AT_FORMATION" ? "at formation" : `at touch${x.episode != null ? ` ${x.episode}` : ""}`;
      return `${x.source.label} ${KIND[x.kind]} — ${which} · owner says ${x.ownerState}${x.note ? ` · ${x.note}` : ""} · ${x.source.evidence} (${x.source.provenance})`;
    }
    const where = x.priceHigh !== null ? `${fmt(x.price)}–${fmt(x.priceHigh)}` : fmt(x.price);
    const how = x.relation === "AT_FORMATION" ? "at formation" : x.relation === "NEAR" ? `near (${fmt(x.distance)} away)` : x.relation.toLowerCase();
    return `${x.source.label} ${KIND[x.kind]} ${where} — ${how}${x.ownerState ? ` · owner says ${x.ownerState}` : ""} · ${x.source.evidence} (${x.source.provenance})`;
  });
  const silences = r.sources.filter(s => s.evidence === "SILENCE").map(s => `${s.label}: SILENCE — ${s.provenance}`);
  const absences = (r.absences ?? []).map(a => `${a.label}: none near this gap — nearest ${fmt(a.nearest)}, ${fmt(a.distance)} away`);
  return { rows, silences, absences };
}
