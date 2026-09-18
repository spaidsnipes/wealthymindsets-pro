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
import type { ContradictionDetectability } from "@/lib/marketData/canonicalMarketState";
import {
  computeEvidenceDebt,
  computeRightOfWay,
  sampledLabelPhrase,
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
   * WHY `contradiction` is null — because `null` alone is overloaded.
   *
   * It has meant two completely different things:
   *   - COMPARABLE          a thesis exists and nothing materially opposes it;
   *   - NOTHING_TO_COMPARE  no thesis was resolved at all, so nothing COULD
   *                         have opposed one.
   *
   * Consumers were reading the second as the first. `selectDecisionWhyNot`
   * pushed "No active contradiction to the thesis." into its CLEARANCES list —
   * documented as *the affirmative side of the ledger* — from a bare `else`.
   * Observed live on `/command-deck` rendering that sentence twice while the
   * same screen read *"No chapter resolved … (0/8 dimensions resolved)"*.
   *
   * A contradiction TO A THESIS requires a thesis. Without one the sentence is
   * vacuous, and printing it in the affirmative column is H1 shape 1 — the
   * absence of a SUBJECT reported as the absence of an OBJECTION.
   *
   * Vocabulary deliberately shared with
   * `canonicalMarketState.ContradictionDetectability` so WM has ONE word for
   * this idea rather than a synonym per surface.
   */
  readonly contradictionDetectability: ContradictionDetectability;
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

/**
 * The one sentence that has to reconcile with "N of M paid".
 *
 * ── The same pixel lie, twice, through two mechanisms (2026-09-16) ───────────
 *
 * `computeEvidenceDebt`'s own header records a from-USE defect observed two
 * lines apart inside ONE card on /command-deck:
 *
 *     EVIDENCE DEBT   0 of 9 paid
 *     8 evidence nodes unpaid: regime + direction +6
 *
 * That was diagnosed as a WATCH node padding the denominator, and fixed by
 * renaming `total` → `payable`. But on 2026-09-16 the identical two lines were
 * still on the live deck. The denominator is no longer padded; it is honest.
 * The SENTENCE is what is short.
 *
 *     payable = resolved + missing + warn   →   9 = 0 + 8 + 1
 *
 * Unpaid means `payable - resolved`, which is 9. This function counted only
 * `debt.missing`, so the one WARN node sat in the denominator and appeared in
 * no clause that explains it. The first fix cured the mechanism it found and
 * the lie came back through the neighbouring bucket — so the guard below is
 * written against the ARITHMETIC (lead count must equal payable - resolved),
 * not against the WATCH bucket or the WARN bucket by name.
 *
 * `warnLabels` was surfaced by the compiler for exactly this purpose: "so the
 * difference between `payable` and the chain's length always has a name a
 * surface can print". Nothing printed it until now.
 *
 * A WARN node is NOT folded into the missing list. An unknown and a contested
 * answer are different debts, and a trader who is told "9 unknown" when one of
 * them is a live warning has been handed a softer picture than the ledger
 * holds. They are counted together and named apart.
 */
function missingPhrase(debt: EvidenceDebt | null): string | null {
  // Warn-only ledgers used to return null here, which let `selectRealityCells`
  // caption a contested ledger "Ledger paid in full." beside "0 of 1 paid".
  if (!debt || (debt.missing === 0 && debt.warn === 0)) return null;

  const unpaid = debt.missing + debt.warn;
  const clauses: string[] = [];

  // Remainder derives from the AUTHORITATIVE count, never the capped array —
  // otherwise "9 evidence nodes unpaid: regime + direction +1" contradicts
  // itself in one sentence. `sampledLabelPhrase` owns that pairing.
  if (debt.missing > 0) {
    clauses.push(sampledLabelPhrase(debt.missingLabels, debt.missing, { lowercase: true }));
  }
  if (debt.warn > 0) {
    clauses.push(
      `${debt.warn} warned: ${sampledLabelPhrase(debt.warnLabels, debt.warn, { lowercase: true })}`,
    );
  }

  return `${unpaid} evidence node${unpaid === 1 ? "" : "s"} unpaid: ${clauses.join("; ")}`;
}

export function selectOneStory(input: OneStoryInput): OneStoryVM {
  const debt = computeEvidenceDebt(input.chainNodes);
  const decision = computeRightOfWay(input.permission, debt);
  // A contradiction TO A THESIS requires a thesis. `story.current` IS the
  // resolved thesis; without it there is no subject an objection could attach
  // to, so `contradiction: null` means NOTHING_TO_COMPARE rather than
  // "compared and found clean".
  const hasThesis = Boolean(input.story?.current);
  return {
    primary: primarySentence(input.story),
    contradiction: contradictionSentence(input.story),
    contradictionDetectability: hasThesis ? "COMPARABLE" : "NOTHING_TO_COMPARE",
    missing: missingPhrase(debt),
    decision,
    debt,
  };
}
