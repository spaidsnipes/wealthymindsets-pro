/**
 * selectAbsorption — "Is buyer effort being absorbed?", answered or refused.
 *
 * ── THE QUESTION ─────────────────────────────────────────────────────────────
 *
 * The Founder's Absorption vs Exhaustion anatomy puts two columns side by side
 * and asks the reader to compare them: EFFORT on the left, RESPONSE on the
 * right. The whole teaching is that effort alone means nothing. A market can
 * absorb enormous aggressive buying and not move — that is someone selling into
 * it — and a market can drift up on almost no aggression at all. Only the RATIO
 * of the two says anything, and only when both halves are real.
 *
 * So this module computes one ratio and then spends most of its length refusing
 * to report it.
 *
 * ── WHY MOST OF THIS FILE IS REFUSAL ────────────────────────────────────────
 *
 * 1. IT NEEDS AGGRESSOR SIDES IT DOES NOT OWN. "Buyer effort" is a claim about
 *    who initiated, and `selectAggressorFlow` documents that on live US equities
 *    the only provider serving trades infers the side with a TICK RULE at
 *    confidence 0.5. An absorption verdict built on a coin flip, rendered in the
 *    same chrome as one built on a venue-stamped aggressor, is the exact defect
 *    that selector was rewritten to kill. `provenance` therefore travels all the
 *    way out to the surface, and a surface that drops it is lying with this
 *    module's numbers.
 *
 * 2. "BARELY MOVED" IS MEANINGLESS WITHOUT A SCALE. Half a dollar is a shrug on
 *    one instrument and a stampede on another, and it is a different thing at
 *    9:30 than at 14:00 on the SAME instrument. The displacement is therefore
 *    measured in units of the window's own volume-weighted price spread, which
 *    `selectValueCandle` already owns — not in ticks, not in percent, and not
 *    against any constant chosen by whoever wrote this file.
 *
 * 3. A BALANCED TAPE HAS NO EFFORT TO ABSORB. If aggressive buying and selling
 *    are near parity, then nobody is pressing and "absorption" is not the right
 *    question — there is no effort on the table. That is reported as BALANCED,
 *    a real reading, rather than being forced into one of the two dramatic
 *    verdicts the mockup draws.
 *
 * The four verdicts are consequently NOT symmetric drama. Two of them
 * (UNMEASURED, BALANCED) are the module declining, and in ordinary conditions
 * they will be the common answers. A surface built on this must look correct
 * when it is saying nothing, because it will be saying nothing most of the day.
 *
 * ── WHAT IT DOES NOT CLAIM ──────────────────────────────────────────────────
 *
 * ABSORBED is not "reversal". It is a measurement of one window: one side
 * pressed and price did not go. Who was on the other side, whether they will
 * stay, and what happens next are all outside this file, and no field here
 * should ever be renamed to imply otherwise.
 *
 * PURE — composes two existing owners and stores nothing. No clock, no I/O.
 */

import { selectAggressorFlow, type AggressorTick, type AggressorProvenance } from "../selectAggressorFlow";
import { selectValueCandle } from "./selectValueCandle";
import { roundSig } from "./measuredNumber";

export const ABSORPTION_VERSION = "wm.absorption.v1" as const;

/**
 *   ABSORBED    one side pressed hard and price did not travel. Effort spent,
 *               displacement withheld — someone was on the other side.
 *   EFFICIENT   effort and displacement agree: the side pressing got paid in
 *               the direction it pressed.
 *   BALANCED    no side is pressing. There is no effort to absorb, so the
 *               question does not apply to this window.
 *   UNMEASURED  no aggressive volume was observed at all.
 */
export type AbsorptionVerdict = "ABSORBED" | "EFFICIENT" | "BALANCED" | "UNMEASURED";

export interface AbsorptionVM {
  readonly version: typeof ABSORPTION_VERSION;
  readonly verdict: AbsorptionVerdict;
  /** Which side was pressing, when one was. */
  readonly pressingSide: "BUYERS" | "SELLERS" | null;
  /** Aggressive volume on each side, straight from the flow owner. */
  readonly buyEffort: number;
  readonly sellEffort: number;
  /** Net aggressive volume (CVD) — the signed effort. */
  readonly netEffort: number;
  /**
   * |netEffort| as a share of total aggressive volume, 0..1. This is what
   * "pressing" means here: 0 is perfect parity, 1 is entirely one-sided.
   */
  readonly imbalance: number;
  /** Price travelled across the window, signed. Null when unmeasurable. */
  readonly displacement: number | null;
  /**
   * Displacement in units of the window's own volume-weighted price spread.
   * THE scale-free number — the only one that can be compared across
   * instruments and across hours of the same session.
   */
  readonly displacementInSpread: number | null;
  /**
   * Price travelled per unit of net aggressive volume. The mockup's Efficiency
   * Ratio. Instrument-specific by construction — read it against itself over
   * time, never against another symbol.
   */
  readonly efficiency: number | null;
  /** How the aggressor sides behind every number above were established. */
  readonly provenance: AggressorProvenance;
  /** True when `provenance` is anything a surface must disclose. */
  readonly requiresDisclosure: boolean;
  /** One honest line. Never empty, in any state. */
  readonly detail: string;
}

/**
 * How lopsided the aggressive tape must be before one side counts as PRESSING.
 * Below this the window is BALANCED and absorption is not the question.
 * 0.2 = the dominant side carried 60% of aggressive volume against 40%.
 */
export const PRESSING_IMBALANCE_THRESHOLD = 0.2;

/**
 * How far price must FAIL to travel, in units of the window's own spread,
 * before pressure counts as absorbed. Under half a spread is, by the value
 * candle's own standard, not a move at all.
 */
export const ABSORBED_DISPLACEMENT_SPREADS = 0.5;

function lineFor(verdict: AbsorptionVerdict, side: string, spreads: number | null): string {
  switch (verdict) {
    case "UNMEASURED":
      return "no aggressive volume observed — effort cannot be measured";
    case "BALANCED":
      return "neither side is pressing — no effort on the table to absorb";
    case "ABSORBED":
      return `${side} pressed and price held — effort spent, displacement withheld`;
    case "EFFICIENT":
      return `${side} pressed and price followed${
        spreads != null ? ` — ${Math.abs(spreads).toFixed(1)}× the window's own spread` : ""
      }`;
  }
}

const UNMEASURED: AbsorptionVM = {
  version: ABSORPTION_VERSION,
  verdict: "UNMEASURED",
  pressingSide: null,
  buyEffort: 0,
  sellEffort: 0,
  netEffort: 0,
  imbalance: 0,
  displacement: null,
  displacementInSpread: null,
  efficiency: null,
  provenance: "UNDISCLOSED",
  requiresDisclosure: true,
  detail: lineFor("UNMEASURED", "", null),
};

export function selectAbsorption(
  ticks: readonly AggressorTick[] | null | undefined,
): AbsorptionVM {
  const flow = selectAggressorFlow(ticks);
  if (!flow.hasFlow) return UNMEASURED;

  const buyEffort = flow.askVol;
  const sellEffort = flow.bidVol;
  const total = buyEffort + sellEffort;
  const netEffort = flow.cvd;
  const imbalance = total > 0 ? Math.abs(netEffort) / total : 0;

  // The value candle owns the price geometry — first and last print, and the
  // volume-weighted spread that gives "barely moved" a scale. Recomputing any
  // of it here would be a second owner of one fact.
  //
  // The prints are narrowed to `trade === true` FIRST, because that is the
  // filter the flow owner applies to the effort half. Measuring displacement
  // over a wider set than the effort was measured over would put the two
  // columns of the anatomy on different tapes, which is precisely the
  // comparison this module exists to make trustworthy.
  const prints = tradePrints(ticks);
  const value = selectValueCandle(prints);
  const first = prints.length > 0 ? prints[0].price : null;
  const displacement =
    value.measured && first != null && value.last != null ? round6(value.last - first) : null;
  const spread = value.spread;
  const displacementInSpread =
    displacement != null && spread != null && spread > 0
      ? round6(displacement / spread)
      : null;
  // NOT round6. Found by LOOKING at a rendered panel, where this printed
  // "0.00e+0" on a real-scale equity tape: a cent of travel over twenty
  // thousand shares is ~4e-7, which six decimals rounds to zero — and a zero
  // that is really 4e-7 has also thrown away the SIGN, so the panel said
  // nothing moved in either direction. The ratio's natural magnitude is
  // whatever the instrument's price-per-share happens to be, so it is rounded
  // to significant figures rather than to a fixed decimal place.
  const efficiency =
    displacement != null && Math.abs(netEffort) > 0
      ? roundSig(displacement / Math.abs(netEffort), 4)
      : null;

  const pressing = imbalance >= PRESSING_IMBALANCE_THRESHOLD;
  const pressingSide = pressing ? (netEffort > 0 ? "BUYERS" : "SELLERS") : null;

  let verdict: AbsorptionVerdict = "BALANCED";
  if (!pressing) {
    verdict = "BALANCED";
  } else if (displacementInSpread == null) {
    // One side pressed but the window has no spread to measure travel against
    // — every print at one price. That IS price failing to travel, and it is
    // the purest absorption a tape can show.
    verdict = "ABSORBED";
  } else {
    const travelled = Math.abs(displacementInSpread);
    const agreed = displacement != null && Math.sign(displacement) === Math.sign(netEffort);
    verdict = travelled < ABSORBED_DISPLACEMENT_SPREADS || !agreed ? "ABSORBED" : "EFFICIENT";
  }

  const sideLabel = pressingSide === "BUYERS" ? "Buyers" : "Sellers";

  return {
    version: ABSORPTION_VERSION,
    verdict,
    pressingSide,
    buyEffort,
    sellEffort,
    netEffort,
    imbalance: round6(imbalance),
    displacement,
    displacementInSpread,
    efficiency,
    provenance: flow.provenance,
    requiresDisclosure: flow.provenance !== "PROVIDER",
    detail: lineFor(verdict, sideLabel, displacementInSpread),
  };
}

function tradePrints(
  ticks: readonly AggressorTick[] | null | undefined,
): Array<{ price: number; size: number }> {
  if (!Array.isArray(ticks)) return [];
  const out: Array<{ price: number; size: number }> = [];
  for (const t of ticks) {
    if (!t || t.trade !== true) continue;
    const price = Number(t.price);
    const size = Number(t.size);
    if (!Number.isFinite(price) || price <= 0) continue;
    if (!Number.isFinite(size) || size <= 0) continue;
    out.push({ price, size });
  }
  return out;
}

function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/**
 * `roundSig` is IMPORTED, not defined here.
 *
 * It used to be defined here, byte-for-byte identically to a copy in
 * `selectLiquidityWeather.ts`, each sitting under its own comment explaining
 * the same reasoning to a reader who would never see the other one. Two
 * modules had independently worked out that a quantity whose magnitude is set
 * by the instrument cannot be rounded to a fixed number of decimals — and
 * having worked it out, each then shipped a panel that did exactly that
 * anyway. See `./measuredNumber` for what was measured on production.
 */
