/**
 * selectAbsorptionQuestion — the ONE question the Absorption view is answering.
 *
 * ASSET 04, "Question-Driven Absorption Canvas", from the Founder's Visual
 * Implementation Contract & Asset Ledger. Asset 06 (the anatomy view) shipped
 * as a PANEL GRID: a header, a reason line, an effort field, a checklist, a
 * conviction gauge. Every one of those cells is true. None of them says what
 * the trader came to the surface to find out.
 *
 * Asset 04 is not new evidence. It is the SAME compiler's output re-composed
 * around the question, so the first thing the eye lands on is the thing the
 * screen exists to answer. The canon's own worked example is this surface:
 *
 *     ACTIVE QUESTION   "Is seller effort being absorbed into this level?"
 *     QUESTION FOCUS    Absorption of Seller Effort
 *
 * ── WHY THE QUESTION VARIES AND IS NOT A CONSTANT STRING ─────────────────
 *
 * A fixed banner reading "Is effort being absorbed?" would be decoration: it
 * would render identically over a measured zone, over a window that found no
 * zone, and over a window that CANNOT ANSWER — three completely different
 * epistemic states, which `selectAbsorptionAnatomyView` has already gone to
 * real trouble to distinguish. The banner must inherit that distinction or it
 * is lying by omission at the largest type size on the page.
 *
 * ── WHY "SELLER" IS NOT ALWAYS SAID ──────────────────────────────────────
 *
 * The canon example names the seller because its mockup was drawn on signed
 * tape. `aggression.buyShare` / `sellShare` are non-null ONLY when every bar
 * in the window carried a side — the rail is deliberately null on a partially
 * signed window, for exactly the reason that a partial sum printed under a
 * window-wide label answers a narrower question than the one asked.
 *
 * So the side is named only when the tape is signed and one side actually
 * dominates. Otherwise the question says "effort", which is what the effort
 * field genuinely measures. Naming an aggressor the feed never stated would
 * put a fabricated actor in the largest sentence on the canvas.
 *
 * PURE / DETERMINISTIC — no React, no I/O, no clock. Asserts no market fact
 * that `selectAbsorptionAnatomyView` has not already compiled.
 */

import type { AbsorptionAnatomyViewVM } from "../marketData/viewModels/selectAbsorptionAnatomyView";
import type { QuestionFocusVM } from "./selectQuestionFocus";

export const ABSORPTION_QUESTION_VERSION = "wm.absorption-question.v1" as const;

export interface AbsorptionQuestionVM {
  /** The dominant question, ready to render at banner size. */
  readonly question: string;
  /** Its subject, in the shape `ActiveQuestionBar` already consumes. */
  readonly focus: QuestionFocusVM;
}

/**
 * A side is named only when the window was FULLY signed and one side holds
 * more than this share. At 50/50 there is no aggressor to name, and rounding
 * a coin-flip into "seller effort" would invent the actor the whole docblock
 * above exists to refuse.
 */
const SIDE_DOMINANCE = 0.55;

function dominantSide(vm: AbsorptionAnatomyViewVM): "buyer" | "seller" | null {
  const { buyShare, sellShare } = vm.aggression;
  if (buyShare == null || sellShare == null) return null;
  if (sellShare >= SIDE_DOMINANCE) return "seller";
  if (buyShare >= SIDE_DOMINANCE) return "buyer";
  return null;
}

export function selectAbsorptionQuestion(
  vm: AbsorptionAnatomyViewVM | null | undefined,
): AbsorptionQuestionVM {
  if (!vm || !vm.measured) {
    return {
      question: "Is effort being absorbed at this level?",
      focus: {
        focus: "Absorption of effort — no bar window in hand",
        basis: "ABSORPTION_UNMEASURED",
        unresolved: true,
      },
    };
  }

  const side = dominantSide(vm);
  const effort = side ? `${side} effort` : "effort";

  if (vm.focusZone) {
    const { priceLo, priceHi } = vm.focusZone;
    return {
      // The counter-clause matters as much as the clause. "Is it absorbed?"
      // invites a yes; "or is price about to follow it?" is the position the
      // trader is actually exposed to, and it keeps the banner from reading
      // as an endorsement of the zone it just found.
      question: `Is ${effort} being absorbed between ${priceLo} and ${priceHi}, or is price about to follow it?`,
      focus: {
        focus: `Absorption of ${effort} at ${priceLo}–${priceHi}`,
        basis: "ABSORPTION_ZONE",
        unresolved: false,
      },
    };
  }

  // ── THE FOCUS IS A SUBJECT, NEVER THE ANSWER ────────────────────────────
  //
  // `QuestionFocusVM.focus` is contractually "a short noun phrase naming the
  // subject of the question. Never a claim." The first draft of both branches
  // below returned the FINDING — "No absorption zone in the last 30 bars" —
  // which is not only a claim but the SAME claim `vm.reason` already renders
  // eight lines down the same surface. That is the two-owners-of-one-fact
  // defect `ActiveQuestionBar`'s own docblock refuses by name, and it would
  // have arrived inside the component that refuses it.
  //
  // So the focus names the subject and the reason line keeps the finding. The
  // banner asks; the surface answers.

  if (vm.zoneQualificationPossible) {
    // Measured, capable, and no zone found. `unresolved` stays FALSE: the
    // window ran and answered. Rendering this in the italic UNRESOLVED look
    // would tell the trader the screen failed when in fact the screen worked.
    return {
      question: `Is any level absorbing ${effort} right now?`,
      focus: {
        focus: `Absorption of ${effort} across the last ${vm.windowBars} bars`,
        basis: "ABSORPTION_ABSENT",
        unresolved: false,
      },
    };
  }

  // The window could not have produced a zone even if one existed — one print
  // held nearly all the effort, so every other bar's norm collapsed toward
  // zero. This is the case a naive surface reports as "no absorption", turning
  // arithmetic into an observation about the market. `vm.reason` carries the
  // specific note; the banner only has to stop looking confident.
  return {
    question: `Is any level absorbing ${effort} right now?`,
    focus: {
      focus: `Absorption of ${effort} — this window cannot answer`,
      basis: "ABSORPTION_UNANSWERABLE",
      unresolved: true,
    },
  };
}

export default selectAbsorptionQuestion;
