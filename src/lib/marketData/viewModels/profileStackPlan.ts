/**
 * THE PROFILE STACK PLAN — one owner for every right-edge profile lane.
 *
 * Registry F "PROFILE STACK SYSTEM": multiple profiles are explicitly allowed,
 * with left/right/overlay placement and Auto Arrange. Before this, each lane
 * negotiated its own geometry with the others through special cases (Living
 * reserving room for a Composite that might follow, labels passed between
 * blocks through the DOM dataset). A fourth lane would have made that a web.
 *
 * Now the frame asks this plan ONCE: given the fixed lanes already on the
 * right (legacy Fixed/Session VP columns, the Value Candle) and the ordered
 * profile species that will draw, it returns each species' lane, the stack's
 * left edge, and the single label column every lane prints into.
 *
 * Alone, a species keeps its solo geometry. With company, every lane comes
 * from `vpColumnLayout` — the same function the VP columns already use — so
 * no two histograms can ever share a column.
 *
 * PURE. DETERMINISTIC. No canvas.
 */

import { vpColumnLayout, type VpColumnLayout } from "@/lib/vpDrawGeometry";

export type StackSpecies = "LIVING" | "COMPOSITE" | "VISIBLE_RANGE";

export interface ProfileStackInput {
  readonly canvasWidth: number;
  /** Price-scale width plus its margin, as the overlay measures it. */
  readonly axisWidth: number;
  /** Lanes already taken on the right by columns this plan does not own. */
  readonly fixedLanes: number;
  /** Species that WILL draw this frame, innermost (rightmost) first. */
  readonly order: readonly StackSpecies[];
}

export interface ProfileStackPlan {
  readonly lanes: Readonly<Partial<Record<StackSpecies, VpColumnLayout>>>;
  /** True when more than one lane is on the right edge. */
  readonly stacked: boolean;
  /** x of the leftmost lane's left edge — what overlays must stop before. */
  readonly stackLeft: number;
  /** The one column every stacked lane prints its labels into (right-aligned). */
  readonly labelRight: number;
}

/** Solo geometry: the lane a single profile gets when nothing shares the edge. */
export function soloLane(canvasWidth: number): VpColumnLayout {
  const width = Math.min(160, Math.round(canvasWidth * 0.16));
  return { right: canvasWidth - 76, width, fits: width > 0 };
}

export function planProfileStack(input: ProfileStackInput): ProfileStackPlan {
  const { canvasWidth: W, axisWidth, fixedLanes, order } = input;
  const total = fixedLanes + order.length;
  const lanes: Partial<Record<StackSpecies, VpColumnLayout>> = {};

  if (total === 1 && order.length === 1) {
    lanes[order[0]] = soloLane(W);
  } else {
    order.forEach((sp, i) => {
      lanes[sp] = vpColumnLayout(W, axisWidth, fixedLanes + i, total);
    });
  }

  let stackLeft = W - 76;
  for (const sp of order) {
    const l = lanes[sp];
    if (l?.fits) stackLeft = Math.min(stackLeft, Math.round(l.right - l.width));
  }
  return {
    lanes,
    stacked: total > 1,
    stackLeft,
    labelRight: stackLeft - 8,
  };
}
