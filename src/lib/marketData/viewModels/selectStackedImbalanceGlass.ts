/**
 * THE STACK, PUT BACK ON THE PRICE IT IS A CLAIM ABOUT.
 *
 * `selectStackedImbalance` has been a complete, careful, honest engine for some
 * time. It measures the tick grid off the tape rather than guessing it, splits
 * its window so a stack is never graded with the prints that built it, and
 * refuses to call an untested stack a good one. Every one of those decisions is
 * about not lying.
 *
 * And until this module existed, the whole reading arrived in the trader's eye
 * as SENTENCES IN A DRAWER. `StackedImbalancePanel` and `OrderFlowDepthPanel`
 * were its only consumers. The VM already carried `stackLow`, `stackHigh` and a
 * price for every level in the run — and not one of those numbers ever reached
 * the glass. A panel that says "3 levels stacked, DEFENDED" has told the reader
 * that something happened somewhere. The invention is that it happened HERE, at
 * THIS price, and that price is on the screen already with candles drawn
 * through it.
 *
 * Founder law, verbatim: imbalances belong "at their price levels". A card
 * naming a level is not the level.
 *
 * WHAT THIS MODULE IS FOR, AND WHAT IT REFUSES TO BE
 *
 * It is the COMPILER between the reading and the paint. MainChart's overlay is
 * a canvas loop with no tests around it and no way to assert on a pixel; every
 * decision that can be made before a coordinate is computed is made here, where
 * it can be named and pinned. The canvas is left with arithmetic.
 *
 * THE VERDICT IS CARRIED BY SHAPE, NOT BY HUE.
 *
 * §9 — no green shield, no green means safe. A defended level is not a
 * reassurance and a broken one is not a scolding; both are facts about an
 * auction, and the house has no standing to grade the trader for either. So all
 * three states are drawn in the same gold the rest of the evidence layer uses,
 * and they are told apart by EDGE:
 *
 *   · DEFENDED → SOLID.  Price came back and did not get through. The boundary
 *                        exists; draw it as a boundary.
 *   · BROKEN   → DASHED. Price traded clean past the far edge. What is drawn
 *                        is the memory of a wall, not a wall.
 *   · UNTESTED → DOTTED. A claim nobody has tested. The faintest edge there
 *                        is, because it has earned the least.
 *
 * A trader can read a line style at a glance without being told what colour
 * means what, and no one of the three reads as "safe".
 *
 * ABSENCE IS NOT A STATE TO DRAW.
 *
 * UNMEASURED and NO_STACK both return `drawn: false`, and they return DIFFERENT
 * reasons, because they are different facts: one says the tape could not be
 * read, the other says it was read and there is nothing there. A caller that
 * wants to say something about the first has the material to; nothing is drawn
 * on the price either way, since an empty band would read as "no pressure here"
 * and that is a claim.
 *
 * THE DISCLOSURE TRAVELS WITH THE DRAWING.
 *
 * `selectStackedImbalance` sets `requiresDisclosure: true` and calls it
 * non-negotiable, because a diagonal imbalance is a statement about who the
 * AGGRESSOR was, and on a tape where the side is reconstructed by tick rule
 * every level is downstream of a guess. In a panel that disclosure can sit in a
 * footnote. On the glass there is no footnote, so it is appended to the label
 * the trader actually reads. A stack drawn on inferred sides says so on the
 * chart or it is not honest on the chart.
 *
 * PURE — no React, no canvas, no clock.
 */

import formatImbalanceRatio from "../formatImbalanceRatio";
import type { StackedImbalanceVM } from "./selectStackedImbalance";

export const STACK_GLASS_VERSION = "wm.stacked-imbalance-glass.v1" as const;

/** How the band's edges are stroked. Carries the verdict; no hue does. */
export type StackEdgeStyle = "SOLID" | "DASHED" | "DOTTED";

/** Why nothing is on the glass. DRAWN is the only state that paints. */
export type StackGlassReason = "UNMEASURED" | "NO_STACK" | "DRAWN";

export interface StackGlassLevel {
  /** Price of this level. The whole point — this is where it goes. */
  readonly price: number;
  /** Spoken by `formatImbalanceRatio`, the one owner of that vocabulary. */
  readonly ratioLabel: string;
  /** True when the opposing side was empty and the ratio is the sentinel. */
  readonly oneSided: boolean;
  /** Dominance weight 0..1 for the cell's ink (one-sided = 1). Never a score on screen. */
  readonly weight: number;
}

export interface StackGlassVM {
  readonly version: typeof STACK_GLASS_VERSION;
  /** Paint only when true. */
  readonly drawn: boolean;
  readonly reason: StackGlassReason;
  /** Band extent in PRICE. Null whenever `drawn` is false. */
  readonly priceLow: number | null;
  readonly priceHigh: number | null;
  /** Every level in the run, at its own price. Empty when not drawn. */
  readonly levels: readonly StackGlassLevel[];
  readonly edgeStyle: StackEdgeStyle;
  /**
   * The chip. Always a sentence a human can read off the chart with no
   * legend — direction, verdict, level count, and the disclosure when the
   * sides were reconstructed rather than asserted.
   */
  readonly label: string;
  /**
   * Furthest price the response reached into the stack, when it was tested.
   * Drawn as a single mark so DEFENDED shows HOW CLOSE it came, which is the
   * difference between a level that held comfortably and one that nearly went.
   */
  readonly retestPrice: number | null;
  /** True when the sides feeding this reading were inferred, not asserted. */
  readonly inferredSides: boolean;
  /** When the stack formed (unix SECONDS), from the owner; null when unknown. */
  readonly formedFrom: number | null;
  readonly formedTo: number | null;
}

const EDGE_BY_VERDICT: Record<"UNTESTED" | "DEFENDED" | "BROKEN", StackEdgeStyle> = {
  DEFENDED: "SOLID",
  BROKEN: "DASHED",
  UNTESTED: "DOTTED",
};

function empty(reason: StackGlassReason): StackGlassVM {
  return {
    version: STACK_GLASS_VERSION,
    drawn: false,
    reason,
    priceLow: null,
    priceHigh: null,
    levels: [],
    edgeStyle: "DOTTED",
    label: "",
    retestPrice: null,
    inferredSides: false,
    formedFrom: null,
    formedTo: null,
  };
}

/**
 * Compile a stacked-imbalance reading into the few facts a canvas needs.
 *
 * Handed null — which is what a chart with no order-flow reading at all has —
 * this returns UNMEASURED rather than throwing, because "the room has not
 * computed one" and "the tape could not be read" are the same thing to the
 * glass: there is nothing to draw and no claim to make about why.
 */
export function selectStackedImbalanceGlass(
  vm: StackedImbalanceVM | null | undefined,
): StackGlassVM {
  if (!vm) return empty("UNMEASURED");
  if (vm.verdict === "UNMEASURED") return empty("UNMEASURED");
  if (vm.verdict === "NO_STACK") return empty("NO_STACK");

  const lo = vm.stackLow;
  const hi = vm.stackHigh;

  // A verdict of UNTESTED/DEFENDED/BROKEN with no extent or no levels is a
  // contradiction inside the upstream VM rather than a market state. The glass
  // does not paint a band it cannot place, and it does not guess an extent from
  // the levels either — a caller repairing this should repair the engine.
  if (
    typeof lo !== "number" || !Number.isFinite(lo) ||
    typeof hi !== "number" || !Number.isFinite(hi) ||
    vm.levels.length === 0
  ) {
    return empty("NO_STACK");
  }

  const levels: StackGlassLevel[] = vm.levels
    .filter((l) => Number.isFinite(l.price))
    .map((l) => ({
      price: l.price,
      ratioLabel: formatImbalanceRatio(l.ratio, l.oneSided),
      oneSided: l.oneSided,
      // 3:1 is the qualifying floor (weight ~0.3); 10:1 and one-sided read full.
      weight: l.oneSided ? 1 : Math.max(0.3, Math.min(1, l.ratio / 1000)), // ratio is ×100: 300 = 3:1 floor, 10:1 reads full
    }));

  if (levels.length === 0) return empty("NO_STACK");

  const inferredSides = vm.provenance === "INFERRED" || vm.provenance === "MIXED";

  // DIRECTION IS SPOKEN AS WHAT IT DOES, NOT AS ITS SIDE NAME. "BUY" on a chart
  // sits one glance away from being read as an instruction. The stack is a
  // place where one side kept paying up and the other never showed, so it is
  // named for the role that gives it: support beneath price, supply above it.
  const role =
    vm.direction === "BUY" ? "SUPPORT" : vm.direction === "SELL" ? "SUPPLY" : "STACK";

  const parts = [
    role,
    vm.verdict,
    `${levels.length} LVL`,
  ];
  if (inferredSides) parts.push("SIDES INFERRED");

  return {
    version: STACK_GLASS_VERSION,
    drawn: true,
    reason: "DRAWN",
    priceLow: Math.min(lo, hi),
    priceHigh: Math.max(lo, hi),
    levels,
    edgeStyle: EDGE_BY_VERDICT[vm.verdict],
    label: parts.join(" · "),
    retestPrice:
      typeof vm.retestedTo === "number" && Number.isFinite(vm.retestedTo)
        ? vm.retestedTo
        : null,
    inferredSides,
    formedFrom: vm.formedFrom == null ? null : Math.floor(vm.formedFrom / 1000),
    formedTo: vm.formedTo == null ? null : Math.floor(vm.formedTo / 1000),
  };
}

export default selectStackedImbalanceGlass;
