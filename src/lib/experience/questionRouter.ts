/**
 * questionRouter — the WM Question Router (canon P26 / P6): compile the ONE
 * dominant question the surface is currently answering.
 *
 * Founder canon: "The default interface answers one dominant question at a
 * time." The question is a function of (a) the human's current job — the
 * ExperienceMode — and (b) what the market engine has ACTUALLY resolved, taken
 * verbatim from the canonical One Story compiler (selectOneStory). The router
 * NEVER asserts a market fact of its own: it only reacts to whether the engine
 * reported a contradiction, an evidence debt, or a right-of-way verdict. When
 * the engine is silent/UNKNOWN, the question honestly reflects that.
 *
 * PURE — no React, no I/O, no market derivation. Deterministic.
 */

import type { ExperienceMode } from "./decisionContextBus";
import type { OneStoryVM } from "../marketData/viewModels/selectOneStory";

export const QUESTION_ROUTER_VERSION = "wm.question-router.v1" as const;

/** Convenience view of what the canonical compiler reported, for routing. */
interface StorySignals {
  readonly hasStory: boolean;
  readonly hasContradiction: boolean;
  readonly hasMissing: boolean;
  readonly decision: OneStoryVM["decision"]["value"] | null;
}

function signalsOf(oneStory: OneStoryVM | null): StorySignals {
  if (!oneStory) {
    return { hasStory: false, hasContradiction: false, hasMissing: false, decision: null };
  }
  return {
    hasStory: true,
    hasContradiction: !!oneStory.contradiction,
    hasMissing: !!oneStory.missing,
    decision: oneStory.decision.value,
  };
}

/**
 * Route the single dominant question for the current job + engine state.
 *
 * The mode selects the human's concern; the canonical signals refine the
 * phrasing so the question tracks reality (confirmation vs. decay, a live
 * contradiction, a blocked right-of-way) without ever inventing a market claim.
 */
export function routeQuestion(mode: ExperienceMode, oneStory: OneStoryVM | null): string {
  const s = signalsOf(oneStory);

  switch (mode) {
    case "PREP":
      return "What is my plan, and where is my invalidation line?";

    case "OBSERVE":
      return s.hasStory
        ? "What is the market actually doing right now?"
        : "What is the market doing? — evidence is still forming.";

    case "WAIT":
      if (s.hasContradiction) return "Is this contradiction fatal to the thesis, or noise?";
      if (s.hasMissing) return "Is my confirmation arriving, or is the thesis decaying?";
      if (s.decision === "ACTION") return "Right-of-way is open — is this my planned location?";
      // A compiled CAUTION verdict means the engine permits entry but the
      // conditions are DEGRADED (a soft rule engaged, or warn nodes unpaid) —
      // not a clean go and not a rejection. The earned-entry fallback would
      // imply permission is still pending; it is not. The honest waiting
      // question is whether a degraded, reduced-size entry is worth taking.
      if (s.decision === "CAUTION") return "Conditions are degraded — take a reduced entry, or wait for cleaner?";
      // A compiled NO TRADE verdict means the engine hard-rejected the setup —
      // asking "has the market earned my entry yet?" would imply entry is still
      // pending. It is not; the thesis was rejected. Ask the honest question.
      if (s.decision === "NO TRADE") return "The setup was rejected — is the thesis dead, or a cleaner level ahead?";
      return "Has the market earned my entry yet?";

    case "EXECUTE":
      if (s.decision === "NO TRADE") return "Right-of-way is blocked — should I stand down?";
      // CAUTION is a DEGRADED grant, not a clean one — the generic "is
      // right-of-way still granted" question (which ACTION gets) would present
      // a degraded verdict as a clean green. When executing under caution the
      // dominant cognitive question is whether size has been cut to match it.
      if (s.decision === "CAUTION") return "Right-of-way is degraded — is my size cut to match the caution?";
      return "Is right-of-way still granted at this exact price?";

    case "MANAGE":
      // Capital is LIVE here, so protecting it dominates — and the precedence is
      // deliberately different from WAIT (which risks no capital). A compiled
      // hard NO TRADE verdict means the engine has REJECTED the very thesis the
      // position rests on: that is an invalidation, and the calm fallback
      // ("still doing what I expected?") would dangerously understate it. It
      // even outranks a soft contradiction, because "starting to break down"
      // understates a thesis the engine has already thrown out.
      if (s.decision === "NO TRADE") return "The thesis is invalidated — do I protect or exit now?";
      if (s.hasContradiction) return "Is my open thesis starting to break down?";
      // A DEGRADED (CAUTION) verdict while holding is not a full invalidation,
      // but it is not the all-clear either — the honest management question is
      // whether to reduce size or tighten the stop to match the degradation.
      if (s.decision === "CAUTION") return "Conditions have degraded — do I reduce size or tighten my stop?";
      return "Is the position still doing what I expected?";

    case "REVIEW":
      return "What did I — and the market — actually do?";

    case "LEARN":
      if (s.hasMissing) return "What evidence did I miss, and how do I train seeing it?";
      return "What exact weakness do I train next?";

    default:
      return "What is materially happening right now?";
  }
}
