/**
 * ONE OWNER FOR ONE FACT: what colour is a Market Canvas verdict?
 *
 * ── Why this module exists ──────────────────────────────────────────────────
 *
 * Three surfaces render the SAME verdict off the SAME `MarketCanvasVM`:
 *
 *   MarketCanvasPanel   the full instrument
 *   CanvasSummaryPill   the header chip ("one instrument at two sizes")
 *   CanvasBadgeMini     the 12-char chip for tight surfaces
 *
 * Until 2026-09-21 each one carried its OWN private `VERDICT_TONE` table. All
 * three happened to agree, byte for byte — which is the most dangerous shape a
 * duplicated fact can take, because agreement today reads as correctness and
 * nothing anywhere enforces it tomorrow. The next person to adjust ACTION's
 * gold on the panel has no reason to suspect two other tables exist, and the
 * result is a Founder looking at one board where the big instrument says ACTION
 * in one gold and the header chip says ACTION in another. Nobody would ever
 * decide that on purpose; it would simply happen, and be read as sloppiness in
 * the product rather than as the missing owner it actually is.
 *
 * AN OWNER BEATS A CONVENTION. The convention "keep the three tables in sync"
 * was never written down and could never be checked. This module is checkable.
 *
 * ── What was NOT changed ────────────────────────────────────────────────────
 *
 * Every shipped pixel is preserved exactly. This is a consolidation, not a
 * restyle: DESIGN FIDELITY LAW says an approved design is not re-interpreted on
 * the way past. Three of the five tones resolve to existing WM tokens, and the
 * two that do not are called out below rather than silently "corrected" to the
 * nearest token — snapping `NO TRADE` to `WM.state.warn` would change what the
 * Founder sees under the banner of a refactor, which is exactly the move that
 * makes refactors untrustworthy.
 */

import type { MarketCanvasVM } from "@/lib/marketData/viewModels/selectMarketCanvas";
import { WM, objectionTint } from "@/lib/design/wmTokens";

export type MarketCanvasVerdict = MarketCanvasVM["verdict"];

/**
 * The full tone for one verdict.
 *
 * `fg` is the only field the two text-only surfaces need. `border` and `bg`
 * exist because CanvasBadgeMini draws a filled chip, and they are derived from
 * the same hue as `fg` — keeping them here is what stops a future chip from
 * inventing a fourth opinion about what CAUTION looks like.
 */
export interface VerdictTone {
  readonly fg: string;
  readonly border: string;
  readonly bg: string;
}

/**
 * `NO TRADE` wears `WM.state.objection` — AND THAT TOKEN EXISTS BECAUSE OF THIS
 * MODULE. This block records how, because the route matters more than the fact.
 *
 * The first version of this module's Sentinel assumed the terracotta #e07b5c
 * was unique to the canvas verdict and scanned the repo for it as a
 * fingerprint. It failed immediately against ELEVEN other files. They were not
 * copies of the verdict table — they were `SceneAdmissionPanel`'s WARN,
 * `DecisionWhyPanel`'s HARD_RULE and CONTRADICTION, `FailureStateChip`'s
 * BLOCKED, `OneStoryStrip`'s OBJECTION and DEBT, `CommandContextRibbon`'s warn,
 * and more. So #e07b5c was a real, widely-rendered product colour that owned
 * fourteen literals and no token, while `WM.state.warn` (#c05a4a) named a
 * different red that the product also renders, widely, for a different thing.
 *
 * This was left open deliberately for one commit, then closed deliberately in
 * the next — and NOT the way it first looked. The tempting fix was to retarget
 * `WM.state.warn` to #e07b5c, and it was wrong: grep showed both colours live,
 * so retargeting would have repainted ~20 unrelated failure surfaces under
 * cover of a refactor. The real answer was a SECOND token naming a distinction
 * the product had been making all along without a word for it — `warn` means
 * the system FAILED, `objection` means the system REFUSED. A `NO TRADE` verdict
 * is the second: it is the board doing its job, and it must never be painted in
 * the failure red. `wmTokens.ts` carries the full argument.
 *
 * The moral, for whoever meets the next duplicated fact: a Sentinel keyed on an
 * incidental literal will find strangers, and the strangers are usually the
 * finding. This one was.
 */
const NO_TRADE_TERRACOTTA = WM.state.objection;

const TONE: Record<MarketCanvasVerdict, VerdictTone> = {
  // Primary gold — the board is offering something. WM.gold.hero.
  ACTION: {
    fg: WM.gold.hero,
    border: "rgba(212,175,55,0.55)",
    bg: "rgba(212,175,55,0.10)",
  },
  // Secondary gold — advisory, not a green light. WM.gold.mark.
  CAUTION: {
    fg: WM.gold.mark,
    border: "rgba(201,165,92,0.45)",
    bg: "rgba(201,165,92,0.08)",
  },
  // WAIT shares CAUTION's foreground deliberately: both mean "not yet", and the
  // distinction is carried by the WORD, never by colour alone. The chip's frame
  // is a shade quieter so WAIT recedes against CAUTION at badge scale.
  WAIT: {
    fg: WM.gold.mark,
    border: "rgba(201,165,92,0.40)",
    bg: "rgba(201,165,92,0.06)",
  },
  "NO TRADE": {
    fg: NO_TRADE_TERRACOTTA,
    border: objectionTint(0.45),
    bg: objectionTint(0.1),
  },
  // Not yet observed. WM.text.muted — the same grey every unobserved thing
  // wears, so "we don't know" looks identical everywhere it is admitted.
  UNKNOWN: {
    fg: WM.text.muted,
    border: "rgba(138,130,113,0.30)",
    bg: "rgba(138,130,113,0.04)",
  },
};

/** The full chip tone (foreground + frame) for a verdict. */
export function marketCanvasVerdictTone(verdict: MarketCanvasVerdict): VerdictTone {
  return TONE[verdict];
}

/** Just the text colour — for surfaces that render the verdict as a word. */
export function marketCanvasVerdictColor(verdict: MarketCanvasVerdict): string {
  return TONE[verdict].fg;
}
