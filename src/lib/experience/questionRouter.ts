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
      return "Has the market earned my entry yet?";

    case "EXECUTE":
      if (s.decision === "NO TRADE") return "Right-of-way is blocked — should I stand down?";
      return "Is right-of-way still granted at this exact price?";

    case "MANAGE":
      if (s.hasContradiction) return "Is my open thesis starting to break down?";
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
