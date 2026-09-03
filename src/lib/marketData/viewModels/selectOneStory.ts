/**
 * selectOneStory — Founder 2029 Integration Glue canon §7 ONE STORY
 * COMPILER (2026-08-20).
 *
 * Canon verbatim:
 *   "The default interface must compile thousands of measurements
 *    into at most four live outputs:
 *      PRIMARY STORY  — what the market is currently doing.
 *      CONTRADICTION  — the strongest material evidence against.
 *      MISSING        — the most important unpaid evidence debt.
 *      DECISION       — ACTION / WAIT / NO TRADE, plus management."
 *
 * This selector COMPOSES existing canonical view models (StoryVM,
 * DecisionChain, permission, right-of-way compiler) into that shape.
 * It never invents facts — every output traces back to a canonical
 * producer already tested. Renders elsewhere.
 *
 * Deterministic / pure — no I/O, no clock. Ready for the mobile
 * one-line surface, the Hero Truth compression, and any future
 * Semantic Zoom depth reveal.
 */

import type { StoryVM } from "./selectMarketStory";
import type { DecisionChainNode } from "./selectDecisionChain";
import type { PermissionVM } from "@/lib/traderMemory/viewModels/selectPermission";
import {
  computeEvidenceDebt,
  computeRightOfWay,
  hiddenRemainder,
  type EvidenceDebt,
  type RightOfWayReading,
} from "./decisionPermissionCompiler";

export interface OneStoryInput {
  readonly story: StoryVM | null;
  readonly chainNodes: readonly DecisionChainNode[] | undefined;
  readonly permission: PermissionVM | null;
}

export interface OneStoryVM {
  /** One short sentence describing the market's current story. */
  readonly primary: string;
  /** Strongest material evidence against that story, or null when none. */
  readonly contradiction: string | null;
  /**
   * Most important unpaid evidence debt as a compact human phrase, or
   * null when nothing missing. Independent from RightOfWay so the
   * surface can show missing evidence even if the decision layer is
   * quiet for other reasons.
   */
  readonly missing: string | null;
  /**
   * ACTION / WAIT / NO TRADE / CAUTION / UNKNOWN. Comes from the
   * Decision Permission Compiler — never contradicts `missing`.
   */
  readonly decision: RightOfWayReading;
  /** Attached raw debt so consumers can render a list if they choose. */
  readonly debt: EvidenceDebt | null;
}

const CHAPTER_SENTENCE: Record<string, string> = {
  OPENING_AUCTION:   "Opening auction is establishing the day's initial reference.",
  BALANCE:           "Market is in balance around a fair-value zone.",
  COMPRESSION:       "Range is compressing — participants are undecided.",
  LIQUIDITY_PROBE:   "Price is probing recent liquidity above / below the range.",
  SWEEP:             "A liquidity sweep just occurred — watch for follow-through or reclaim.",
  ABSORPTION:        "Aggression is meeting persistent absorption — displacement is weakening.",
  RECLAIM:           "Price is reclaiming a previously broken level.",
  BREAKOUT:          "A break of structure is in progress.",
  ACCEPTANCE:        "The new price area is being accepted.",
  TREND_EXPANSION:   "Trend is expanding with participation.",
  ROTATION:          "Value is rotating within an established range.",
  VALUE_MIGRATION:   "Value is migrating to a new zone.",
  EXHAUSTION:        "The current move is showing exhaustion characteristics.",
  CLOSING_AUCTION:   "Closing auction is resolving the day's positioning.",
};

function primarySentence(story: StoryVM | null): string {
  if (!story || !story.current) {
    if (story?.reason) return story.reason;
    return "Market state cannot be resolved yet.";
  }
  const ch = story.current.chapter;
  const preset = CHAPTER_SENTENCE[ch];
  if (preset) return preset;
  return `Current chapter: ${ch.replace(/_/g, " ").toLowerCase()}.`;
}

function contradictionSentence(story: StoryVM | null): string | null {
  if (!story?.current?.contradictions?.length) return null;
  const first = story.current.contradictions[0];
  return first ?? null;
}

function missingPhrase(debt: EvidenceDebt | null): string | null {
  if (!debt || debt.missing === 0) return null;
  const shown = debt.missingLabels.slice(0, 2);
  const desc = shown.map(l => l.toLowerCase()).join(" + ");
  // Remainder derives from the AUTHORITATIVE count, never the capped array —
  // otherwise "9 evidence nodes unpaid: regime + direction +1" contradicts
  // itself in one sentence.
  const rest = hiddenRemainder(debt.missing, shown.length);
  return `${debt.missing} evidence node${debt.missing === 1 ? "" : "s"} unpaid: ${desc}${rest}`;
}

export function selectOneStory(input: OneStoryInput): OneStoryVM {
  const debt = computeEvidenceDebt(input.chainNodes);
  const decision = computeRightOfWay(input.permission, debt);
  return {
    primary: primarySentence(input.story),
    contradiction: contradictionSentence(input.story),
    missing: missingPhrase(debt),
    decision,
    debt,
  };
}
