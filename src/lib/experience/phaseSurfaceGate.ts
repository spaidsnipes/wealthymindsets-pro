import type { ExperienceMode } from "./decisionContextBus";
import type { TradePhase } from "@/lib/marketData/viewModels/selectDecisionChain";

/**
 * phaseSurfaceGate — reconciles the two independent workflow axes on the
 * Command Deck when they must agree about what the human is doing RIGHT NOW.
 *
 * The deck carries two axes, INDEPENDENT BY DESIGN:
 *   1. ExperienceMode (PREP/OBSERVE/WAIT/EXECUTE/MANAGE/REVIEW/LEARN) — the
 *      canonical "current job" driver of shell + deck EMPHASIS. Default OBSERVE.
 *   2. TradePhase (PREPARATION/APPROACH/DECISION/POSITION/POST_EXIT/REVIEW) —
 *      the older trade-lifecycle analytics axis that feeds selectDecisionChain
 *      and the ATHOS moment map. Default PREPARATION.
 *
 * Neither derives from the other (no mapping helper exists, and inventing one
 * would silently rewrite analytics inputs). But a large PREP-readiness surface
 * gated on `phase === "PREPARATION"` ALONE renders big at cold mount — because
 * BOTH axes default on their first value — even when the human's declared job
 * (ExperienceMode) is OBSERVE (watching, no position). That contradicts the
 * Founder doctrine: "THE SYSTEM REORGANIZES AROUND THE USER'S CURRENT JOB."
 *
 * These predicates are the single source of truth for whether a PREP-phase
 * surface should LEAD. They are presentation/gating only — they never mutate
 * phase, never fabricate readiness, and never touch the analytics chain.
 */

/**
 * Should the Opening Bell (preparation-readiness) panel LEAD the deck?
 *
 * True only when the trade lifecycle is in PREPARATION AND the human's declared
 * current job is PREP. OBSERVE + PREPARATION (the cold-mount default pair) is
 * intentionally FALSE: when merely watching, the deck must not shout "Not ready
 * — Preparation incomplete." Total over every ExperienceMode × TradePhase.
 */
export function shouldLeadOpeningBell(mode: ExperienceMode, phase: TradePhase): boolean {
  return mode === "PREP" && phase === "PREPARATION";
}
