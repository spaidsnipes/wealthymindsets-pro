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
  /**
   * How far the Living Profile's auction BODY wants to reach left of its lane
   * (canon P110 — "fused to price, not a side widget"). The plan owns the
   * room: species drawn left of Living move left by the body's extra reach,
   * so the body never sits over a neighbour lane.
   */
  readonly livingBodyTarget?: number;
}

export interface ProfileStackPlan {
  readonly lanes: Readonly<Partial<Record<StackSpecies, VpColumnLayout>>>;
  /** True when more than one lane is on the right edge. */
  readonly stacked: boolean;
  /** x of the leftmost lane's left edge — what overlays must stop before. */
  readonly stackLeft: number;
  /** The one column every stacked lane prints its labels into (right-aligned). */
  readonly labelRight: number;
  /** The Living body's reach from its lane's right edge, or null when Living is absent. */
  readonly livingBodyWidth: number | null;
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

  // THE LIVING BODY'S ROOM. Never narrower than its lane, never into the
  // left 140px; the species drawn LEFT of Living (after it in `order`) step
  // left by the body's extra reach, and give up their lane if that pushes
  // them off the glass.
  let livingBodyWidth: number | null = null;
  const lv = lanes.LIVING;
  if (lv?.fits) {
    const target = input.livingBodyTarget ?? lv.width;
    livingBodyWidth = Math.max(lv.width, Math.min(target, Math.max(0, lv.right - 140)));
    const extra = livingBodyWidth - lv.width;
    if (extra > 0) {
      for (const sp of order.slice(order.indexOf("LIVING") + 1)) {
        const l = lanes[sp];
        if (!l) continue;
        const right = l.right - extra;
        lanes[sp] = { ...l, right, fits: l.fits && right - l.width >= 60 };
      }
    }
  }

  let stackLeft = W - 76;
  for (const sp of order) {
    const l = lanes[sp];
    if (!l?.fits) continue;
    const reach = sp === "LIVING" && livingBodyWidth != null ? livingBodyWidth : l.width;
    stackLeft = Math.min(stackLeft, Math.round(l.right - reach));
  }
  return {
    lanes,
    stacked: total > 1,
    stackLeft,
    labelRight: stackLeft - 8,
    livingBodyWidth,
  };
}
