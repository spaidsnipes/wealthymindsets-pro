/**
 * PROFILE FUSION — the OBJECT (H-601 #3, finish-line hard-close test).
 *
 * "Multiple existing profile objects create an additional fused object."
 * Two live profile objects are fused into a NEW profile:
 *
 *   OVERLAP GATE   the two price ranges must share at least one row of the
 *                  common grid; otherwise the fusion is refused, named.
 *   SHARED GRID    rows are re-binned onto ONE grid whose step is the coarser
 *                  of the two sources (a finer grid would invent resolution
 *                  the coarser source never had).
 *   ROW SUM        source VOLUME is combined by row. Shares are never summed.
 *   RECOMPUTED     the fused POC is the heaviest fused row; the value area is
 *                  re-expanded from it to 70 % of fused volume. Source POCs
 *                  are NEVER averaged.
 *   PROVENANCE     sources[] (id, species, their own POC, volume), method,
 *                  version, asOf (the OLDER source — the fusion is only as
 *                  fresh as its stalest part) and fidelity (the WEAKER source).
 *
 * The sources are not consumed: they keep drawing and stay inspectable, and
 * unfusing is dropping this object — nothing about either source changes.
 * Composite is its own child; fusing it with another profile does not make
 * the Composite a fusion.
 *
 * PURE. DETERMINISTIC.
 */

export const FUSION_OBJECT_VERSION = 1;
export const FUSION_METHOD = "ROW_VOLUME_SUM_COARSER_GRID";
export const VALUE_AREA_SHARE = 0.7;

import { MARKET_FIDELITIES, type MarketFidelity } from "../marketFidelityAlgebra";

/** The one fidelity vocabulary; null = the source's bars carry none. */
export type Fidelity = MarketFidelity | null;
/** Strongest → weakest; "not carried" ranks weakest of all. */
const FIDELITY_ORDER: readonly Fidelity[] = [
  MARKET_FIDELITIES.EXECUTABLE, MARKET_FIDELITIES.INDICATIVE, MARKET_FIDELITIES.PARTIAL,
  MARKET_FIDELITIES.DEGRADED, MARKET_FIDELITIES.STALE, null,
];

export interface FusionSourceProfile {
  readonly id: string;
  readonly species: string;
  readonly rows: readonly { readonly price: number; readonly volume: number }[];
  readonly poc: number | null;
  readonly asOf: number | null;
  readonly fidelity: Fidelity;
}

export interface FusedProfileObject {
  readonly version: number;
  readonly id: string;
  readonly method: string;
  readonly step: number;
  readonly rows: readonly { readonly price: number; readonly volume: number; readonly bySource: readonly number[] }[];
  readonly poc: number;
  readonly vah: number;
  readonly val: number;
  readonly totalVolume: number;
  readonly sources: readonly { readonly id: string; readonly species: string; readonly poc: number | null; readonly volume: number }[];
  readonly asOf: number | null;
  readonly fidelity: Fidelity;
}

export type FusionResult =
  | { readonly ok: true; readonly fused: FusedProfileObject }
  | { readonly ok: false; readonly reason: "NEEDS_TWO_SOURCES" | "NO_VOLUME" | "NO_OVERLAP" };

/** Smallest positive gap between adjacent distinct row prices. */
function rowStep(rows: readonly { price: number }[]): number {
  const ps = [...new Set(rows.map(r => r.price))].sort((a, b) => a - b);
  let step = Infinity;
  for (let i = 1; i < ps.length; i++) step = Math.min(step, ps[i] - ps[i - 1]);
  return Number.isFinite(step) && step > 0 ? step : 0;
}

export function fuseProfiles(a: FusionSourceProfile | null, b: FusionSourceProfile | null): FusionResult {
  if (!a || !b || a.id === b.id) return { ok: false, reason: "NEEDS_TWO_SOURCES" };
  const srcs = [a, b].map(s => ({ ...s, rows: s.rows.filter(r => Number.isFinite(r.price) && r.volume > 0) }));
  if (srcs.some(s => s.rows.length === 0)) return { ok: false, reason: "NO_VOLUME" };
  const step = +(Math.max(...srcs.map(s => rowStep(s.rows))) || 0.01).toFixed(8);
  const snap = (p: number) => Math.round(Math.floor(p / step + 1e-9) * step * 1e8) / 1e8;

  const bins = new Map<number, number[]>();
  srcs.forEach((s, k) => {
    for (const r of s.rows) {
      const key = snap(r.price);
      const cell = bins.get(key) ?? [0, 0];
      cell[k] += r.volume;
      bins.set(key, cell);
    }
  });
  // Overlap gate on the shared grid: at least one row both sources traded in,
  // or both ranges intersect on the grid.
  const lo = (k: number) => Math.min(...srcs[k].rows.map(r => snap(r.price)));
  const hi = (k: number) => Math.max(...srcs[k].rows.map(r => snap(r.price)));
  if (Math.max(lo(0), lo(1)) > Math.min(hi(0), hi(1))) return { ok: false, reason: "NO_OVERLAP" };

  const rows = [...bins.entries()]
    .map(([price, bySource]) => ({ price, bySource, volume: bySource[0] + bySource[1] }))
    .sort((x, y) => x.price - y.price);
  const total = rows.reduce((s, r) => s + r.volume, 0);
  let pocIdx = 0;
  rows.forEach((r, i) => { if (r.volume > rows[pocIdx].volume) pocIdx = i; });

  // Value area: expand from the POC toward the heavier neighbour until 70 %.
  let loI = pocIdx, hiI = pocIdx, acc = rows[pocIdx].volume;
  while (acc < total * VALUE_AREA_SHARE && (loI > 0 || hiI < rows.length - 1)) {
    const down = loI > 0 ? rows[loI - 1].volume : -1;
    const up = hiI < rows.length - 1 ? rows[hiI + 1].volume : -1;
    if (up >= down) { hiI++; acc += rows[hiI].volume; } else { loI--; acc += rows[loI].volume; }
  }

  const asOfs = srcs.map(s => s.asOf).filter((t): t is number => t != null);
  const fidelity = srcs.map(s => s.fidelity).reduce((w, f) => (FIDELITY_ORDER.indexOf(f) > FIDELITY_ORDER.indexOf(w) ? f : w));
  return {
    ok: true,
    fused: {
      version: FUSION_OBJECT_VERSION,
      id: `fusion:${a.id}+${b.id}`,
      method: FUSION_METHOD,
      step,
      rows,
      poc: rows[pocIdx].price,
      vah: rows[hiI].price + step,
      val: rows[loI].price,
      totalVolume: total,
      sources: srcs.map((s, k) => ({ id: s.id, species: s.species, poc: s.poc, volume: rows.reduce((t, r) => t + r.bySource[k], 0) })),
      asOf: asOfs.length === 2 ? Math.min(...asOfs) : null,
      fidelity,
    },
  };
}

export default fuseProfiles;
