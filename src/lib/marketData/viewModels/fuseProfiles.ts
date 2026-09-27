/**
 * PROFILE FUSION — the OBJECT (H-601 #3; Garden 16 §21 / §23).
 *
 * "Use compatible lawful profiles. Test real overlap. Fuse their
 *  distributions. Preserve provenance. Preserve parents. Recompute fused
 *  POC/value area from the fused distribution. Inspect. Unfuse. Prove
 *  Composite remains a different invention. Do not fake Fusion by averaging
 *  POCs."
 *
 * Two live profile objects are fused into a NEW, DERIVED profile:
 *
 *   LAWFUL PAIR    both sources must describe the SAME instrument, count
 *                  volume in the SAME unit (tape print size is not vendor bar
 *                  volume — an IEX-only tape summed with consolidated bars is
 *                  two different universes), and cover DISJOINT time windows.
 *                  A profile fused with a window it already contains counts
 *                  the same trades twice (Living-over-all-bars + Composite,
 *                  Visible Range + the sessions it shows), so overlapping or
 *                  unknown windows are refused, named. That is the overlap
 *                  policy: fused volume = parent A + parent B, EXACTLY, and it
 *                  is only lawful because no trade is in both.
 *   PRICE OVERLAP  the two price ranges must share at least one row of the
 *                  common grid; otherwise the fusion is refused, named.
 *   SHARED GRID    ONE grid whose step is the coarser of the two sources (a
 *                  finer grid would invent resolution the coarser source never
 *                  had), anchored on the coarser source's own rows so they map
 *                  one-to-one. A finer source's row [p, p+s) is re-bucketed by
 *                  OVERLAP: its volume is split across the grid rows it covers
 *                  in proportion to the covered length. Volume is conserved.
 *   ROW SUM        source VOLUME is combined by row. Shares are never summed.
 *   RECOMPUTED     the fused POC is the heaviest fused row (ties → the lower
 *                  price); the value area is re-expanded from it to 70 % of
 *                  fused volume — both by vpEngine's pocAndValueArea, the ONE
 *                  owner, so VAH / VAL are bucket LOW edges exactly as on every
 *                  other profile. Source POCs are NEVER averaged.
 *   PROVENANCE     sources[] (id, species, own POC, volume, window, evidence),
 *                  method, version, asOf (the OLDER source — the fusion is only
 *                  as fresh as its stalest part), fidelity and evidence (the
 *                  WEAKER source), and the label DERIVED.
 *
 * The sources are not consumed: they keep drawing and stay inspectable, and
 * unfusing is dropping this object — nothing about either source changes.
 *
 * COMPOSITE IS A DIFFERENT INVENTION (selectCompositeProfile): it re-profiles
 * the raw BARS of N completed sessions of one market through vpEngine — one
 * profile of one bar set. Fusion never sees a bar; it sums two finished
 * distributions row by row and keeps both parents alive. Fusing a Composite
 * with another profile does not make the Composite a fusion.
 *
 * PURE. DETERMINISTIC.
 */

export const FUSION_OBJECT_VERSION = 2;
export const FUSION_METHOD = "ROW_VOLUME_SUM_OVERLAP_REBIN_COARSER_GRID";
export const FUSION_OVERLAP_POLICY = "DISJOINT_WINDOWS_ONLY";
export const VALUE_AREA_SHARE = 0.7;

import { MARKET_FIDELITIES, type MarketFidelity } from "../marketFidelityAlgebra";
import { pocAndValueArea } from "@/lib/vpEngine";

/** The one fidelity vocabulary; null = the source's bars carry none. */
export type Fidelity = MarketFidelity | null;
/** Strongest → weakest; "not carried" ranks weakest of all. */
const FIDELITY_ORDER: readonly Fidelity[] = [
  MARKET_FIDELITIES.EXECUTABLE, MARKET_FIDELITIES.INDICATIVE, MARKET_FIDELITIES.PARTIAL,
  MARKET_FIDELITIES.DEGRADED, MARKET_FIDELITIES.STALE, null,
];

/** How the source's rows were known: prints placed at their price, or bar volume spread over each bar's range. */
export type FusionEvidence = "TRADE_BASED" | "CANDLE_ESTIMATED";

/** Inclusive span of the bar / print times a profile was built from. */
export interface FusionWindow { readonly from: number; readonly to: number }

export interface FusionSourceProfile {
  readonly id: string;
  readonly species: string;
  readonly rows: readonly { readonly price: number; readonly volume: number }[];
  readonly poc: number | null;
  readonly asOf: number | null;
  readonly fidelity: Fidelity;
  /** Canonical instrument the rows describe. */
  readonly instrument: string;
  /** What one unit of `volume` counts, e.g. "BAR_VOLUME" or "PRINT_SIZE". */
  readonly volumeUnit: string;
  readonly evidence: FusionEvidence;
  /** The time the rows cover; null = not known, and an unknown window cannot be proven disjoint. */
  readonly window: FusionWindow | null;
  /** The source's own bucket size, when it knows it; else read from its rows. */
  readonly step?: number;
}

export interface FusedSource {
  readonly id: string;
  readonly species: string;
  readonly poc: number | null;
  readonly volume: number;
  readonly window: FusionWindow;
  readonly evidence: FusionEvidence;
}

export interface FusedProfileObject {
  readonly version: number;
  readonly id: string;
  /** Always DERIVED: a fused object is computed from two profiles, never observed. */
  readonly label: "DERIVED";
  readonly method: string;
  readonly overlapPolicy: string;
  readonly step: number;
  readonly rows: readonly { readonly price: number; readonly volume: number; readonly bySource: readonly number[] }[];
  readonly poc: number;
  readonly vah: number;
  readonly val: number;
  readonly totalVolume: number;
  /** Grid rows where BOTH parents traded — the real overlap, counted. */
  readonly sharedRows: number;
  readonly instrument: string;
  readonly volumeUnit: string;
  readonly sources: readonly FusedSource[];
  readonly asOf: number | null;
  readonly fidelity: Fidelity;
  readonly evidence: FusionEvidence;
}

export type FusionRefusal =
  | "NEEDS_TWO_SOURCES"
  | "INSTRUMENT_MISMATCH"
  | "UNIT_MISMATCH"
  | "WINDOW_UNKNOWN"
  | "TIME_OVERLAP"
  | "NO_VOLUME"
  | "NO_OVERLAP";

export type FusionResult =
  | { readonly ok: true; readonly fused: FusedProfileObject }
  | { readonly ok: false; readonly reason: FusionRefusal };

/** The trader's sentence for each refusal — one owner, so the stack bar and the glass say the same thing. */
export const FUSION_REFUSAL_WORDS: Readonly<Record<FusionRefusal, string>> = {
  NEEDS_TWO_SOURCES: "needs two drawn profiles",
  INSTRUMENT_MISMATCH: "different instruments",
  UNIT_MISMATCH: "volume counted in different units (tape prints vs bar volume)",
  WINDOW_UNKNOWN: "a parent's time window is unknown",
  TIME_OVERLAP: "parents share bars — their volume would be counted twice",
  NO_VOLUME: "a parent carries no volume",
  NO_OVERLAP: "price ranges do not overlap",
};

export function fusionRefusalWords(reason: string | null | undefined): string | null {
  if (!reason) return null;
  return (FUSION_REFUSAL_WORDS as Record<string, string>)[reason] ?? reason.replace(/_/g, " ").toLowerCase();
}

const speciesWord = (s: string) => s.replace(/_/g, " ");

/** The fused object's caption on the glass: what it is (DERIVED), what it was made of, and how its volume was known. */
export function fusedCaption(f: Pick<FusedProfileObject, "sources" | "evidence">): string {
  return `FUSED · DERIVED · ${f.sources.map(s => speciesWord(s.species)).join(" + ")}${f.evidence === "CANDLE_ESTIMATED" ? " · CANDLE-EST" : ""}`;
}

/** A refused pair says so on the glass, with the pair and the reason — never a silent lane. */
export function fusionRefusalCaption(pair: readonly string[], reason: string): string {
  return `FUSION REFUSED · ${pair.map(speciesWord).join(" + ")} · ${fusionRefusalWords(reason)}`;
}

/** Smallest positive gap between adjacent distinct row prices (0 when one row). */
function rowStep(rows: readonly { price: number }[]): number {
  const ps = [...new Set(rows.map(r => r.price))].sort((a, b) => a - b);
  let step = Infinity;
  for (let i = 1; i < ps.length; i++) step = Math.min(step, ps[i] - ps[i - 1]);
  return Number.isFinite(step) && step > 0 ? step : 0;
}

const round8 = (x: number) => Math.round(x * 1e8) / 1e8;
const EVIDENCE_ORDER: readonly FusionEvidence[] = ["TRADE_BASED", "CANDLE_ESTIMATED"];

export function fuseProfiles(a: FusionSourceProfile | null, b: FusionSourceProfile | null): FusionResult {
  if (!a || !b || a.id === b.id) return { ok: false, reason: "NEEDS_TWO_SOURCES" };
  if (!a.instrument || a.instrument !== b.instrument) return { ok: false, reason: "INSTRUMENT_MISMATCH" };
  if (!a.volumeUnit || a.volumeUnit !== b.volumeUnit) return { ok: false, reason: "UNIT_MISMATCH" };
  if (!a.window || !b.window || !(a.window.from <= a.window.to) || !(b.window.from <= b.window.to)) {
    return { ok: false, reason: "WINDOW_UNKNOWN" };
  }
  if (a.window.from <= b.window.to && b.window.from <= a.window.to) return { ok: false, reason: "TIME_OVERLAP" };

  const srcs = [a, b].map(s => ({ ...s, rows: s.rows.filter(r => Number.isFinite(r.price) && Number.isFinite(r.volume) && r.volume > 0) }));
  if (srcs.some(s => s.rows.length === 0)) return { ok: false, reason: "NO_VOLUME" };

  // Each source's own bucket; the grid takes the coarser, anchored on its rows.
  const steps = srcs.map(s => (s.step && s.step > 0 ? s.step : rowStep(s.rows)));
  const coarse = steps[0] >= steps[1] ? 0 : 1;
  const step = round8(Math.max(...steps) || 0.01);
  const own = steps.map(s => (s > 0 ? s : step));
  const origin = Math.min(...srcs[coarse].rows.map(r => r.price));
  const eps = step * 1e-6;
  const idxOf = (p: number) => Math.floor((p - origin) / step + 1e-7);
  const priceOf = (k: number) => round8(origin + k * step);

  const bins = new Map<number, [number, number]>();
  const span: [number, number][] = [[Infinity, -Infinity], [Infinity, -Infinity]];
  srcs.forEach((s, k) => {
    const w = own[k];
    for (const r of s.rows) {
      const lo = r.price, hi = r.price + w;
      const k0 = idxOf(lo), k1 = idxOf(hi - eps);
      span[k][0] = Math.min(span[k][0], k0);
      span[k][1] = Math.max(span[k][1], k1);
      for (let g = k0; g <= k1; g++) {
        const covered = Math.min(hi, origin + (g + 1) * step) - Math.max(lo, origin + g * step);
        if (covered <= 0) continue;
        const cell = bins.get(g) ?? [0, 0];
        cell[k] += r.volume * (k0 === k1 ? 1 : covered / w);
        bins.set(g, cell);
      }
    }
  });
  // Real price overlap on the shared grid: the two row spans must intersect.
  if (Math.max(span[0][0], span[1][0]) > Math.min(span[0][1], span[1][1])) return { ok: false, reason: "NO_OVERLAP" };

  const rows = [...bins.entries()]
    .sort((x, y) => x[0] - y[0])
    .map(([g, bySource]) => ({ price: priceOf(g), bySource: bySource as readonly number[], volume: bySource[0] + bySource[1] }));
  const total = rows.reduce((s, r) => s + r.volume, 0);
  // POC and value area: vpEngine's ONE routine over the fused rows — the same
  // tie-breaks and the same convention (VAH / VAL are bucket LOW edges) as
  // every other profile on the glass.
  const { pocIdx, vahIdx: hiI, valIdx: loI } = pocAndValueArea(rows.map(r => ({ total: r.volume })), VALUE_AREA_SHARE);

  const asOfs = srcs.map(s => s.asOf).filter((t): t is number => t != null);
  const fidelity = srcs.map(s => s.fidelity).reduce((w, f) => (FIDELITY_ORDER.indexOf(f) > FIDELITY_ORDER.indexOf(w) ? f : w));
  const evidence = srcs.map(s => s.evidence).reduce((w, e) => (EVIDENCE_ORDER.indexOf(e) > EVIDENCE_ORDER.indexOf(w) ? e : w));
  return {
    ok: true,
    fused: {
      version: FUSION_OBJECT_VERSION,
      id: `fusion:${a.id}+${b.id}`,
      label: "DERIVED",
      method: FUSION_METHOD,
      overlapPolicy: FUSION_OVERLAP_POLICY,
      step,
      rows,
      poc: rows[pocIdx].price,
      vah: rows[hiI].price,
      val: rows[loI].price,
      totalVolume: total,
      sharedRows: rows.filter(r => r.bySource[0] > 0 && r.bySource[1] > 0).length,
      instrument: a.instrument,
      volumeUnit: a.volumeUnit,
      sources: srcs.map((s, k) => ({
        id: s.id, species: s.species, poc: s.poc,
        volume: rows.reduce((t, r) => t + r.bySource[k], 0),
        window: s.window!, evidence: s.evidence,
      })),
      asOf: asOfs.length === 2 ? Math.min(...asOfs) : null,
      fidelity,
      evidence,
    },
  };
}

export default fuseProfiles;
