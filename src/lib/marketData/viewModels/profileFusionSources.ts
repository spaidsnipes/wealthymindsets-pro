/**
 * PROFILE FUSION · WHAT EACH STACK SPECIES HANDS THE FUSER (Garden 16 §23).
 *
 * `fuseProfiles` refuses a pair it cannot prove lawful — different
 * instrument, different volume unit, unknown or shared time window. It can
 * only do that if every parent states those facts truthfully. This module is
 * the ONE place a stack species' view model is turned into a
 * `FusionSourceProfile`, so the glass cannot hand the fuser a parent that
 * forgot where its volume came from.
 *
 *   LIVING        candle-estimated → vendor BAR_VOLUME over every loaded bar
 *                 (window = first..last loaded bar). Trade-based → PRINT_SIZE
 *                 from the live tape; its time window is not carried on the
 *                 glass VM, so it is null (never guessed).
 *   COMPOSITE     BAR_VOLUME over its completed sessions (first session start
 *                 .. its asOf, the last bar it took).
 *   VISIBLE_RANGE BAR_VOLUME over the camera's bars (from..to).
 *
 * And the AUTO PAIR: with Profile Fusion on and no pair picked by the trader,
 * the family fuses the first LAWFUL pair on the stack — the familiar
 * preference first (Living with its neighbour, else the first two) — and when
 * no pair is lawful it reports the preferred pair, so its refusal is named.
 *
 * PURE. DETERMINISTIC.
 */

import fuseProfiles, { type FusionResult, type FusionSourceProfile } from "./fuseProfiles";

export type FusionStackSpecies = "LIVING" | "COMPOSITE" | "VISIBLE_RANGE";

type Row = { readonly price: number; readonly volume: number };

export interface FusionSourceInputs {
  readonly instrument: string;
  /** Loaded bar times, first and last — the Living candle path's window. */
  readonly firstBarTime: number | null;
  readonly lastBarTime: number | null;
  readonly living: { readonly drawn: boolean; readonly bars?: readonly Row[]; readonly poc?: number | null; readonly estimated?: boolean } | null;
  readonly composite: { readonly drawn: boolean; readonly rows: readonly Row[]; readonly poc: number | null; readonly asOf: number | null; readonly sessionStarts: readonly number[] } | null;
  readonly visibleRange: { readonly drawn: boolean; readonly rows: readonly Row[]; readonly poc: number | null; readonly from: number | null; readonly to: number | null } | null;
}

const win = (from: number | null | undefined, to: number | null | undefined) =>
  from != null && to != null && Number.isFinite(from) && Number.isFinite(to) && from <= to ? { from, to } : null;

export function fusionSourceFor(sp: string, x: FusionSourceInputs): FusionSourceProfile | null {
  if (sp === "LIVING") {
    const lp = x.living;
    if (!lp?.drawn || !lp.bars) return null;
    const estimated = lp.estimated !== false;
    return {
      id: "living", species: "LIVING", rows: lp.bars, poc: lp.poc ?? null, asOf: x.lastBarTime, fidelity: null,
      instrument: x.instrument,
      volumeUnit: estimated ? "BAR_VOLUME" : "PRINT_SIZE",
      evidence: estimated ? "CANDLE_ESTIMATED" : "TRADE_BASED",
      window: estimated ? win(x.firstBarTime, x.lastBarTime) : null,
    };
  }
  if (sp === "COMPOSITE") {
    const cp = x.composite;
    if (!cp?.drawn) return null;
    return {
      id: "composite", species: "COMPOSITE", rows: cp.rows, poc: cp.poc, asOf: cp.asOf, fidelity: null,
      instrument: x.instrument, volumeUnit: "BAR_VOLUME", evidence: "CANDLE_ESTIMATED",
      window: win(cp.sessionStarts[0], cp.asOf),
    };
  }
  if (sp === "VISIBLE_RANGE") {
    const vr = x.visibleRange;
    if (!vr?.drawn) return null;
    return {
      id: "visible-range", species: "VISIBLE_RANGE", rows: vr.rows, poc: vr.poc, asOf: x.lastBarTime, fidelity: null,
      instrument: x.instrument, volumeUnit: "BAR_VOLUME", evidence: "CANDLE_ESTIMATED",
      window: win(vr.from, vr.to),
    };
  }
  return null;
}

/**
 * The auto pair. `order` is the stack as it will paint. Returns null with
 * fewer than two species. Otherwise the first pair `fuseProfiles` accepts, in
 * preference order; when none is lawful, the preferred pair (whose refusal the
 * glass then names).
 */
export function pickLawfulFusionPair<S extends string>(
  order: readonly S[],
  sourceOf: (sp: S) => FusionSourceProfile | null,
): S[] | null {
  if (order.length < 2) return null;
  const preferred: S[] = order.includes("LIVING" as S)
    ? [order.find(s => s !== ("LIVING" as S))!, "LIVING" as S]
    : [order[0], order[1]];
  const candidates: S[][] = [preferred];
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      const p = [order[i], order[j]];
      if (!candidates.some(c => c.includes(p[0]) && c.includes(p[1]))) candidates.push(p);
    }
  }
  for (const c of candidates) {
    const r: FusionResult = fuseProfiles(sourceOf(c[0]), sourceOf(c[1]));
    if (r.ok) return c;
  }
  return preferred;
}
