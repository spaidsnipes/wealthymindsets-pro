/**
 * RISK, DRAWN TO SCALE.
 *
 * The RISK cell printed "Available R 2.4 · risk/unit 1.83". Two numbers, no
 * proportion. R is a RATIO — the one quantity on the whole decision rail whose
 * meaning is entirely about relative size — and it was the cell least able to
 * show it. A trader had to do the comparison in their head every time, which is
 * exactly the work the canon says the room is supposed to have already done.
 *
 * This compiles ONE scale for the cell: risk is one unit wide by definition,
 * and every reward figure is drawn against that unit. Nothing is measured here.
 * `selectAvailableR` already produced conservativeR / optimisticR / costDragR;
 * this only decides how wide each one is on a common axis.
 *
 * ── UNKNOWN IS NOT ZERO, AND A BAR IS VERY GOOD AT SAYING ZERO ───────────────
 *
 * `AvailableRVM` publishes the literal string "UNKNOWN" for each number when
 * inputs are missing. A bar that coerced that to 0 would draw a confident,
 * legible, perfectly flat reward — a picture of a bad trade, where the truth is
 * "we cannot tell you". So the whole bar refuses to compile unless the
 * conservative figure is a real finite number. The cell's words stay either
 * way, including the missing-inputs reason.
 *
 * Pure / deterministic. Renders elsewhere.
 */

import type { AvailableRVM } from "./selectAvailableR";

export interface RiskReachBar {
  /** Width of the 1R risk unit, as a percentage of the whole axis. */
  readonly riskPct: number;
  /** Width of the conservative reward reach. Never negative. */
  readonly conservativePct: number;
  /**
   * Width of the optimistic reach, or null when it is UNKNOWN. Drawn as an
   * extension BEYOND the conservative reach, never as a second claim about the
   * same span.
   */
  readonly optimisticPct: number | null;
  /** Width of cost drag, bitten out of the reward end. Null when UNKNOWN. */
  readonly costDragPct: number | null;
  /**
   * True when the conservative figure is negative — the destination sits on the
   * wrong side of entry. The reach draws at zero width, and this flag is what
   * stops that from being read as "even money".
   */
  readonly adverse: boolean;
  readonly conservativeR: number;
}

const MIN_AXIS_REWARD = 1;

function asNumber(value: number | "UNKNOWN"): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function selectRiskReachBar(vm: AvailableRVM | null): RiskReachBar | null {
  if (!vm) return null;

  const conservativeR = asNumber(vm.conservativeR);
  if (conservativeR === null) return null;

  const optimisticR = asNumber(vm.optimisticR);
  const costDragR = asNumber(vm.costDragR);

  const adverse = conservativeR < 0;
  const reach = adverse ? 0 : conservativeR;
  const far = optimisticR !== null && optimisticR > reach ? optimisticR : reach;

  // The axis is one risk unit plus the furthest honest reward reach. A floor of
  // 1R of reward keeps a 0.2R setup from rendering the risk block at 83% of the
  // cell and drowning the comparison it exists to make.
  const axis = 1 + Math.max(far, MIN_AXIS_REWARD);
  const pct = (v: number) => (v / axis) * 100;

  return {
    riskPct: pct(1),
    conservativePct: pct(reach),
    optimisticPct: optimisticR !== null && optimisticR > reach ? pct(optimisticR - reach) : null,
    costDragPct: costDragR !== null && costDragR > 0 ? pct(Math.min(costDragR, reach)) : null,
    adverse,
    conservativeR,
  };
}

export default selectRiskReachBar;
