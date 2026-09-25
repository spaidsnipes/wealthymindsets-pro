/**
 * STACKED IMBALANCE + RESPONSE ENGINE — a claim about a level, and the test of it.
 *
 * A diagonal imbalance compares the buying that lifted one price against the
 * selling that hit the price below it. When several ADJACENT levels lean the
 * same way, that is a stack: a run of prices where one side kept paying up and
 * the other never showed. Every footprint tool in the world draws them.
 *
 * Almost none of them grade what happened NEXT, and that omission is the whole
 * product here. A stack is not a result. It is a CLAIM that a level matters,
 * and a claim is worth exactly what its test is worth. A stack price never came
 * back to, a stack price came back to and turned away from, and a stack price
 * tore straight through are three completely different pieces of information,
 * and a panel that paints them the same colour has told the reader nothing
 * while looking extremely informative.
 *
 * This module can be made to say almost anything if it is allowed to cheat, so
 * the routes are named:
 *
 *   · BY CHOOSING THE LEVEL SIZE. "The price below" is the entire reading, and
 *     it depends on what one level means. Coarse levels and every tape has
 *     stacks; fine levels and none do. So the tick is MEASURED off the tape's
 *     own price grid and reported, never assumed from the symbol. If the grid
 *     cannot be read, this module reports UNMEASURED rather than guessing.
 *
 *   · BY GRADING THE CLAIM WITH ITS OWN EVIDENCE. If the stack is built from
 *     the whole window and then "tested" against that same window, the prints
 *     that made the stack are also the prints that vindicate it. The window is
 *     therefore SPLIT — a formation part and a response part, disjoint, with
 *     the split stated on the panel rather than buried here.
 *
 *   · BY CALLING AN UNTESTED STACK A GOOD ONE. A stack that formed and was
 *     never revisited has proven nothing whatsoever. UNTESTED is a verdict in
 *     this module, not a blank.
 *
 *   · BY TREATING AN EMPTY LEVEL AS INFINITE CONVICTION. One lot against zero
 *     is not a 300:1 imbalance, it is a level nobody traded. A level must carry
 *     real weight relative to the rest of the ladder before it can join a
 *     stack.
 *
 * And the disclosure this module owes, which its neighbour does not: THIS ONE
 * READS `side`. A diagonal imbalance is a statement about who was the
 * aggressor, so on a tape where the aggressor is inferred by tick rule, every
 * level here is downstream of a guess. `requiresDisclosure` is therefore true
 * and is not negotiable by a caller.
 *
 * PURE — no React, no I/O, no clock.
 */

import {
  selectAggressorFlow,
  type AggressorTick,
  type AggressorProvenance,
} from "../selectAggressorFlow";
import { selectValueCandle } from "./selectValueCandle";

export const STACKED_IMBALANCE_VERSION = "wm.stacked-imbalance.v1" as const;

/**
 * UNMEASURED — the tape could not be read at all.
 * NO_STACK   — it was read, and there is no run of levels leaning one way.
 * UNTESTED   — a stack exists and price never came back to it.
 * DEFENDED   — price came back into the stack and did not get through it.
 * BROKEN     — price traded clean past the far edge of the stack.
 */
export type StackVerdict =
  | "UNMEASURED"
  | "NO_STACK"
  | "UNTESTED"
  | "DEFENDED"
  | "BROKEN";

export interface ImbalancedLevel {
  /** The price of this level, snapped to the observed grid. */
  readonly price: number;
  /** Volume on the side that dominated this level. */
  readonly dominantVolume: number;
  /** Volume on the diagonal opposing side — the price below, or above. */
  readonly opposingVolume: number;
  /**
   * dominant ÷ opposing × 100, in the same convention `selectAggressorFlow`
   * uses, so `formatImbalanceRatio` is the one owner of how it is spoken.
   */
  readonly ratio: number;
  /** True when `opposingVolume` is zero and `ratio` is the 300 sentinel. */
  readonly oneSided: boolean;
}

export interface StackedImbalanceVM {
  readonly version: typeof STACKED_IMBALANCE_VERSION;
  readonly verdict: StackVerdict;
  /** BUY = the stack is beneath price and acts as support. Null when none. */
  readonly direction: "BUY" | "SELL" | null;
  readonly levels: readonly ImbalancedLevel[];
  /** The stack's own price extent. Null when there is no stack. */
  readonly stackLow: number | null;
  readonly stackHigh: number | null;
  /** The price grid this reading was built on, MEASURED off the tape. */
  readonly tickSize: number | null;
  /** The declared split. These two sum to the prints this module accepted. */
  readonly formationPrints: number;
  readonly responsePrints: number;
  /** Furthest the response reached into or through the stack. Null if untested. */
  readonly retestedTo: number | null;
  /**
   * WHEN the stack formed: the first and last formation prints that traded at
   * the stacked levels (ms). Null when no stack, or the tape carried no times.
   * The glass anchors the stack to the bars that built it with these.
   */
  readonly formedFrom: number | null;
  readonly formedTo: number | null;
  /**
   * How far past the stack's far edge the response travelled, in units of the
   * window's own volume-weighted spread. Negative means it came into the stack
   * and stopped short of the far side. Null when the stack was never revisited.
   */
  readonly beyondInSpreads: number | null;
  /** The window's σ — the scale every distance above is quoted in. */
  readonly spread: number | null;
  readonly provenance: AggressorProvenance;
  /** Always true. This module reads `side`, so it owes the disclosure. */
  readonly requiresDisclosure: true;
  /** One honest line, never empty, in every state. */
  readonly detail: string;
}

/** Dominance needed on the diagonal before a level counts, ×100. 300 = 3:1. */
export const IMBALANCE_RATIO_PCT = 300;
/** How many adjacent levels must lean the same way before it is a stack. */
export const MIN_STACK_LEVELS = 3;
/** A level must carry this share of the ladder's median level volume to count. */
export const MIN_LEVEL_SHARE = 0.25;
/** Share of the window used to BUILD the stack. The rest tests it. */
export const FORMATION_SHARE = 0.6;
/** Below this many prints there is no ladder worth reading. */
export const STACK_MIN_PRINTS = 40;
/**
 * A single tick through the far edge is a touch, not a break. Price must clear
 * the edge by more than this before this module will say BROKEN — otherwise
 * every defended level gets called broken by its own wick.
 */
export const BREAK_TOLERANCE_TICKS = 1;

function unmeasured(detail: string, provenance: AggressorProvenance): StackedImbalanceVM {
  return {
    version: STACKED_IMBALANCE_VERSION,
    verdict: "UNMEASURED",
    direction: null,
    levels: [],
    stackLow: null,
    stackHigh: null,
    tickSize: null,
    formationPrints: 0,
    responsePrints: 0,
    retestedTo: null,
    formedFrom: null,
    formedTo: null,
    beyondInSpreads: null,
    spread: null,
    provenance,
    requiresDisclosure: true,
    detail,
  };
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Significant-figure rounding — safe at any instrument scale. */
function roundSig(v: number, digits = 4): number {
  if (!Number.isFinite(v) || v === 0) return v;
  return Number(v.toPrecision(digits));
}

/**
 * MEASURE the price grid rather than assuming it.
 *
 * The smallest gap between two distinct observed prices is usually the tick,
 * but a single bad print or a float artefact would set it far too fine and
 * shatter the ladder into levels nothing traded on. So the smallest gap that
 * happens MORE THAN ONCE wins: a real grid produces its tick over and over,
 * and an artefact does not. When nothing repeats — a very thin tape — the
 * smallest gap is used and the caller still gets the number to judge.
 */
export function observeTickSize(prices: readonly number[]): number | null {
  const distinct = [...new Set(prices.map((p) => roundSig(p, 10)))].sort((a, b) => a - b);
  if (distinct.length < 2) return null;
  const counts = new Map<number, number>();
  let smallest = Infinity;
  for (let i = 1; i < distinct.length; i++) {
    const gap = roundSig(distinct[i] - distinct[i - 1], 6);
    if (!(gap > 0)) continue;
    if (gap < smallest) smallest = gap;
    counts.set(gap, (counts.get(gap) ?? 0) + 1);
  }
  if (!Number.isFinite(smallest)) return null;
  const repeated = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([g]) => g)
    .sort((a, b) => a - b);
  return repeated.length > 0 ? repeated[0] : smallest;
}

interface Rung {
  readonly index: number;
  buy: number;
  sell: number;
}

interface Run {
  readonly direction: "BUY" | "SELL";
  readonly levels: ImbalancedLevel[];
  readonly weight: number;
}

function ratioOf(dominant: number, opposing: number): { ratio: number; oneSided: boolean } {
  // The 300 sentinel, and the reason for it, belong to `selectAggressorFlow`.
  // Inventing a second convention here is how two panels end up speaking the
  // same number two different ways.
  if (!(opposing > 0)) return { ratio: 300, oneSided: true };
  return { ratio: roundSig((dominant / opposing) * 100, 5), oneSided: false };
}

export function selectStackedImbalance(
  ticks: readonly AggressorTick[] | null | undefined,
): StackedImbalanceVM {
  const flow = selectAggressorFlow(ticks ?? []);
  const provenance = flow.provenance;

  if (!Array.isArray(ticks) || ticks.length === 0) {
    return unmeasured("no tape observed — no level can be claimed", provenance);
  }

  // A print needs a price, a real size, AND a side. Unlike liquidity weather,
  // a sideless print is useless here: the whole reading is about who paid.
  const prints = ticks.filter(
    (t): t is AggressorTick & { price: number; size: number; side: "buy" | "sell" } =>
      t.trade === true &&
      typeof t.price === "number" &&
      Number.isFinite(t.price) &&
      typeof t.size === "number" &&
      Number.isFinite(t.size) &&
      t.size > 0 &&
      (t.side === "buy" || t.side === "sell"),
  );

  if (prints.length < STACK_MIN_PRINTS) {
    return unmeasured(
      `${prints.length} sided prints observed — below the ${STACK_MIN_PRINTS} this ladder needs`,
      provenance,
    );
  }

  const tickSize = observeTickSize(prints.map((p) => p.price));
  if (tickSize == null) {
    return unmeasured(
      "every print in this window landed at one price — there is no ladder to read",
      provenance,
    );
  }

  // THE DECLARED SPLIT. Formation builds the claim; response tests it. They do
  // not overlap, and both counts ship in the VM so the reader can check.
  const cut = Math.max(1, Math.min(prints.length - 1, Math.round(prints.length * FORMATION_SHARE)));
  const formation = prints.slice(0, cut);
  const response = prints.slice(cut);

  const spread = selectValueCandle(prints).spread;

  const rungs = new Map<number, Rung>();
  for (const p of formation) {
    const idx = Math.round(p.price / tickSize);
    let r = rungs.get(idx);
    if (!r) {
      r = { index: idx, buy: 0, sell: 0 };
      rungs.set(idx, r);
    }
    if (p.side === "buy") r.buy += p.size;
    else r.sell += p.size;
  }

  const ladder = [...rungs.values()].sort((a, b) => a.index - b.index);
  const floorVolume =
    (median(ladder.map((r) => r.buy + r.sell)) ?? 0) * MIN_LEVEL_SHARE;

  const priceOf = (idx: number) => roundSig(idx * tickSize, 10);

  // A BUY level: the lifting at this price overwhelmed the hitting one tick
  // BELOW it. A SELL level is the mirror, against the price one tick ABOVE.
  // Both require the diagonal neighbour to EXIST in the ladder — a comparison
  // against a price that never traded is not a comparison.
  const buyFlag = new Map<number, ImbalancedLevel>();
  const sellFlag = new Map<number, ImbalancedLevel>();
  for (const r of ladder) {
    const below = rungs.get(r.index - 1);
    const above = rungs.get(r.index + 1);
    if (below && r.buy >= floorVolume) {
      const { ratio, oneSided } = ratioOf(r.buy, below.sell);
      if (ratio >= IMBALANCE_RATIO_PCT) {
        buyFlag.set(r.index, {
          price: priceOf(r.index),
          dominantVolume: r.buy,
          opposingVolume: below.sell,
          ratio,
          oneSided,
        });
      }
    }
    if (above && r.sell >= floorVolume) {
      const { ratio, oneSided } = ratioOf(r.sell, above.buy);
      if (ratio >= IMBALANCE_RATIO_PCT) {
        sellFlag.set(r.index, {
          price: priceOf(r.index),
          dominantVolume: r.sell,
          opposingVolume: above.buy,
          ratio,
          oneSided,
        });
      }
    }
  }

  const longestRun = (
    flags: Map<number, ImbalancedLevel>,
    direction: "BUY" | "SELL",
  ): Run | null => {
    const idxs = [...flags.keys()].sort((a, b) => a - b);
    let best: Run | null = null;
    let i = 0;
    while (i < idxs.length) {
      let j = i;
      while (j + 1 < idxs.length && idxs[j + 1] === idxs[j] + 1) j++;
      const levels = idxs.slice(i, j + 1).map((k) => flags.get(k)!);
      if (levels.length >= MIN_STACK_LEVELS) {
        const weight = levels.reduce((a, l) => a + l.dominantVolume, 0);
        // Ties on length break on WEIGHT, not on position. Preferring the
        // later run would quietly bias every reading toward the split.
        if (
          best == null ||
          levels.length > best.levels.length ||
          (levels.length === best.levels.length && weight > best.weight)
        ) {
          best = { direction, levels, weight };
        }
      }
      i = j + 1;
    }
    return best;
  };

  const buyRun = longestRun(buyFlag, "BUY");
  const sellRun = longestRun(sellFlag, "SELL");
  let run: Run | null = null;
  if (buyRun && sellRun) {
    run =
      sellRun.levels.length > buyRun.levels.length
        ? sellRun
        : buyRun.levels.length > sellRun.levels.length
          ? buyRun
          : sellRun.weight > buyRun.weight
            ? sellRun
            : buyRun;
  } else {
    run = buyRun ?? sellRun;
  }

  const base = {
    version: STACKED_IMBALANCE_VERSION,
    tickSize,
    formationPrints: formation.length,
    responsePrints: response.length,
    spread: spread == null ? null : roundSig(spread),
    provenance,
    requiresDisclosure: true,
  } as const;

  if (!run) {
    return {
      ...base,
      verdict: "NO_STACK",
      direction: null,
      levels: [],
      stackLow: null,
      stackHigh: null,
      retestedTo: null,
      formedFrom: null,
      formedTo: null,
      beyondInSpreads: null,
      detail:
        `${ladder.length} price levels traded in the formation window and no ${MIN_STACK_LEVELS} ` +
        `adjacent ones leaned the same way past ${IMBALANCE_RATIO_PCT / 100}:1. ` +
        `Nothing here is claiming a level.`,
    };
  }

  const stackLow = Math.min(...run.levels.map((l) => l.price));
  const stackHigh = Math.max(...run.levels.map((l) => l.price));
  const half = tickSize / 2;
  const builtTimes = formation
    .filter((p) => p.price >= stackLow - half && p.price <= stackHigh + half)
    .map((p) => (p as { time?: number | null }).time)
    .filter((t): t is number => typeof t === "number" && Number.isFinite(t));
  const formedAt = builtTimes.length
    ? { formedFrom: Math.min(...builtTimes), formedTo: Math.max(...builtTimes) }
    : { formedFrom: null, formedTo: null };
  const isBuy = run.direction === "BUY";
  // The FAR edge is the side price has to get through to disprove the stack.
  // For support that is the bottom; for resistance, the top.
  const farEdge = isBuy ? stackLow : stackHigh;

  const responsePrices = response.map((p) => p.price);
  const reached = responsePrices.length
    ? isBuy
      ? Math.min(...responsePrices)
      : Math.max(...responsePrices)
    : null;

  // "Tested" means the response actually came into the stack's band. Trading
  // past it without ever entering it is impossible; trading NEAR it is not a
  // test, and calling it one is how an untouched level earns a medal.
  const tested =
    reached != null && (isBuy ? reached <= stackHigh : reached >= stackLow);

  const detailPrice = (v: number) => v.toFixed(tickSize >= 1 ? 0 : tickSize >= 0.01 ? 2 : 4);
  const band = `${detailPrice(stackLow)}–${detailPrice(stackHigh)}`;
  const side = isBuy ? "buying" : "selling";
  const role = isBuy ? "support" : "resistance";
  const built =
    `${run.levels.length} adjacent levels of stacked ${side} at ${band}, ` +
    `built from the first ${formation.length} prints and tested against the next ${response.length}. `;

  if (!tested) {
    return {
      ...base,
      verdict: "UNTESTED",
      direction: run.direction,
      levels: run.levels,
      ...formedAt,
      stackLow,
      stackHigh,
      retestedTo: null,
      beyondInSpreads: null,
      detail:
        built +
        `Price never came back to it, so this level has proven nothing. ` +
        `It is a claim awaiting a test, not ${role} that held.`,
    };
  }

  const beyond = isBuy ? farEdge - reached! : reached! - farEdge;
  const beyondInSpreads =
    spread != null && spread > 0 ? roundSig(beyond / spread) : null;
  // MEASURE THE PENETRATION IN TICKS, because the ladder is a tick grid and
  // that is the unit the tolerance is written in. Comparing two prices
  // directly put a break at 0.010000000000012 against a tolerance of 0.01 and
  // called a level broken by a billionth of a cent. Float noise is not a
  // market event, and a verdict that flips on it is not a verdict.
  const beyondTicks = Number((beyond / tickSize).toPrecision(9));
  const broken = beyondTicks > BREAK_TOLERANCE_TICKS;

  if (broken) {
    return {
      ...base,
      verdict: "BROKEN",
      direction: run.direction,
      levels: run.levels,
      ...formedAt,
      stackLow,
      stackHigh,
      retestedTo: roundSig(reached!, 10),
      beyondInSpreads,
      detail:
        built +
        `Price came back and traded clean through to ${detailPrice(reached!)}, ` +
        `past the far edge by ${beyondInSpreads == null ? "an unmeasured distance" : `${Math.abs(beyondInSpreads).toFixed(2)}σ`}. ` +
        `The ${side} that stacked here did not hold, which is information about ` +
        `that ${side}, not only about the price.`,
    };
  }

  return {
    ...base,
    verdict: "DEFENDED",
    direction: run.direction,
    levels: run.levels,
      ...formedAt,
    stackLow,
    stackHigh,
    retestedTo: roundSig(reached!, 10),
    beyondInSpreads,
    detail:
      built +
      `Price came back into it as far as ${detailPrice(reached!)} and did not get ` +
      `through the far edge. So far this level has been ${role} that was tested and held.`,
  };
}

export default selectStackedImbalance;
