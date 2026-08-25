/**
 * selectDecisionReceipt — Founder canon P8 "Decision Receipt".
 *
 * A sealed DecisionMemoryRecord is the immutable decision-time capsule. This
 * selector reverses that capsule into the trader-facing RECEIPT: the verbatim
 * commitment, the verifiable process facts, the append-only management trail,
 * the attached outcome, and the trader's OWN review split — each forwarded
 * exactly, never invented.
 *
 * Two doctrines constrain this compiler:
 *
 *  1. "WAIT / NO-TRADE can earn A+." A disciplined non-trade is a COMPLETE
 *     decision, not an incomplete one. This selector never treats a missing
 *     outcome on a WAIT / NO_TRADE as a debt — it states, honestly, that no
 *     position existed by design.
 *
 *  2. The "SCORE ADDICTION" weakness. This selector NEVER fabricates a
 *     composite letter grade or a computed quality score. The only quality
 *     numbers it surfaces are the trader's own Decision-Quality Split from an
 *     attached Review — forwarded verbatim, absent when unrecorded. Every
 *     other "fact" is a defensible field projection (present/absent, verbatim
 *     value, or an exit-reason classification), not an opinion.
 *
 * PURE — no I/O, no clock, no derivation of market facts of its own.
 */

import type {
  DecisionMemoryRecord,
  DecisionAction,
  OutcomeReason,
} from "../decisionMemory";

export const DECISION_RECEIPT_VERSION = "wm.decision-receipt.v1" as const;

/** Lifecycle stage a receipt has reached — derived only from what is attached. */
export type ReceiptStage = "SEALED" | "MANAGED" | "CLOSED" | "REVIEWED";

/** A single verifiable line on the receipt. `tone` colours the fact, never judges. */
export type ReceiptTone = "affirm" | "neutral" | "flag";

export interface ReceiptFact {
  readonly label: string;
  readonly value: string;
  readonly tone: ReceiptTone;
}

export interface ReceiptManagementEntry {
  readonly at: number;
  readonly type: string;
  readonly detail: string;
}

/** How the trade left the market — classified from the verbatim outcome reason. */
export type ExitDiscipline = "BY_RULE" | "DISCRETIONARY";

export interface ReceiptOutcome {
  readonly realizedR: number;
  readonly reason: OutcomeReason;
  /** BY_RULE for STOP/TARGET/INVALIDATION/TIME; DISCRETIONARY for MANUAL. */
  readonly exitDiscipline: ExitDiscipline;
}

/** The trader's own Decision-Quality Split — verbatim from Review, never invented. */
export interface ReceiptQualitySplit {
  readonly marketOpportunityQuality: number;
  readonly playbookMatch: number;
  readonly riskQuality: number;
  readonly executionQuality: number;
  readonly processAdherence: number;
}

export interface DecisionReceiptVM {
  readonly version: typeof DECISION_RECEIPT_VERSION;
  /** True only when there is no sealed record to receipt. */
  readonly empty: boolean;
  readonly decisionId: string | null;
  readonly stage: ReceiptStage;
  readonly action: DecisionAction | null;
  /** A disciplined WAIT / NO_TRADE — no position existed by design. */
  readonly isNonTrade: boolean;
  readonly headline: string;
  readonly thesis: string | null;
  /** Verbatim commitment made at decision time. */
  readonly commitment: readonly ReceiptFact[];
  /** Verifiable process facts — defensible field projections only. */
  readonly processFacts: readonly ReceiptFact[];
  /** Append-only management trail, oldest first. */
  readonly managementTrail: readonly ReceiptManagementEntry[];
  /** Present only once an outcome is attached; null while open or by design. */
  readonly outcome: ReceiptOutcome | null;
  /** Present only once a review is attached; the trader's own numbers. */
  readonly qualitySplit: ReceiptQualitySplit | null;
  /** Trader-declared lessons — verbatim, empty when none. */
  readonly lessons: readonly string[];
  /** Honest residue: what is not yet recorded (never counts a by-design gap). */
  readonly pending: readonly string[];
  /** How many corrections were appended (history preserved, never rewritten). */
  readonly amendmentCount: number;
}

const NON_TRADE_ACTIONS: ReadonlySet<DecisionAction> = new Set<DecisionAction>(["WAIT", "NO_TRADE"]);

const ACTION_LABEL: Record<DecisionAction, string> = {
  ENTER_LONG: "Enter long",
  ENTER_SHORT: "Enter short",
  WAIT: "Wait",
  NO_TRADE: "No trade",
  CLOSE_LONG: "Close long",
  CLOSE_SHORT: "Close short",
};

/** Exit reasons that reflect a pre-declared rule firing (vs. a discretionary exit). */
function classifyExit(reason: OutcomeReason): ExitDiscipline {
  return reason === "MANUAL" ? "DISCRETIONARY" : "BY_RULE";
}

/** Worst freshness across the frozen provenance envelopes (honest floor). */
const FRESHNESS_RANK: Record<string, number> = {
  LIVE: 4,
  DELAYED: 3,
  REPLAY: 2,
  STALE: 1,
  UNKNOWN: 0,
};

function worstFreshness(record: DecisionMemoryRecord): string {
  const providers = record.frozen.marketProvenance.providersUsed;
  if (providers.length === 0) return "UNKNOWN";
  let worst = "LIVE";
  for (const p of providers) {
    if ((FRESHNESS_RANK[p.freshness] ?? 0) < (FRESHNESS_RANK[worst] ?? 0)) {
      worst = p.freshness;
    }
  }
  return worst;
}

function emptyReceipt(): DecisionReceiptVM {
  return {
    version: DECISION_RECEIPT_VERSION,
    empty: true,
    decisionId: null,
    stage: "SEALED",
    action: null,
    isNonTrade: false,
    headline: "No decision sealed yet — nothing to receipt.",
    thesis: null,
    commitment: [],
    processFacts: [],
    managementTrail: [],
    outcome: null,
    qualitySplit: null,
    lessons: [],
    pending: [],
    amendmentCount: 0,
  };
}

/**
 * Compile the trader-facing receipt for a sealed decision.
 *
 * Null `record` is the honest "nothing sealed" case. Everything else is a
 * verbatim projection of what the immutable capsule already holds.
 */
export function selectDecisionReceipt(record: DecisionMemoryRecord | null): DecisionReceiptVM {
  if (!record) return emptyReceipt();

  const action = record.plan.action;
  const isNonTrade = NON_TRADE_ACTIONS.has(action);

  const stage: ReceiptStage = record.review
    ? "REVIEWED"
    : record.outcome
      ? "CLOSED"
      : record.management.length > 0
        ? "MANAGED"
        : "SEALED";

  // ── Commitment (verbatim) ──────────────────────────────────────────────
  const commitment: ReceiptFact[] = [];
  commitment.push({ label: "Action", value: ACTION_LABEL[action], tone: "neutral" });
  commitment.push({
    label: "Available R",
    value: record.plan.availableRAtDecision === "UNKNOWN" ? "UNKNOWN" : `${record.plan.availableRAtDecision}R`,
    tone: record.plan.availableRAtDecision === "UNKNOWN" ? "flag" : "neutral",
  });
  if (!isNonTrade) {
    commitment.push({ label: "Expected R", value: `${record.plan.expectedR}R`, tone: "neutral" });
    commitment.push({ label: "Intended size", value: `${record.plan.intendedSize}`, tone: "neutral" });
    commitment.push({ label: "Intended stop", value: `${record.plan.intendedStop}`, tone: "neutral" });
    commitment.push({
      label: "Targets",
      value: record.plan.intendedTargets.length > 0 ? record.plan.intendedTargets.join(" · ") : "none",
      tone: record.plan.intendedTargets.length > 0 ? "neutral" : "flag",
    });
  }

  // ── Process facts (defensible projections only) ────────────────────────
  const t = record.frozen.traderState;
  const processFacts: ReceiptFact[] = [];

  const hasInvalidation = record.plan.invalidationCriteria.trim().length > 0;
  processFacts.push({
    label: "Invalidation",
    value: hasInvalidation ? "Declared" : "None declared",
    tone: hasInvalidation ? "affirm" : "flag",
  });
  processFacts.push({
    label: "Rule adherence",
    value: t.ruleAdherenceAtDecision ? "In adherence" : "Breached",
    tone: t.ruleAdherenceAtDecision ? "affirm" : "flag",
  });
  processFacts.push({
    label: "External influence",
    value: t.externalInfluenceFlagged ? "Flagged" : "None flagged",
    tone: t.externalInfluenceFlagged ? "flag" : "affirm",
  });
  processFacts.push({
    label: "Coaching shown",
    value: t.coachingShown ? "Yes" : "No",
    tone: "neutral",
  });
  const unresolved = record.frozen.marketStateSummary.unresolvedDimensionCount;
  processFacts.push({
    label: "Market state",
    value: unresolved === 0 ? "Fully resolved" : `${unresolved} dimension${unresolved === 1 ? "" : "s"} UNRESOLVED`,
    tone: unresolved === 0 ? "affirm" : "flag",
  });
  const freshness = worstFreshness(record);
  processFacts.push({
    label: "Data freshness",
    value: freshness,
    tone: freshness === "LIVE" ? "affirm" : freshness === "UNKNOWN" ? "flag" : "neutral",
  });

  // ── Management trail (append-only, oldest first) ───────────────────────
  const managementTrail: ReceiptManagementEntry[] = record.management.map((m) => ({
    at: m.at,
    type: m.type,
    detail: m.detail,
  }));

  // ── Outcome (attach-once) ──────────────────────────────────────────────
  const outcome: ReceiptOutcome | null = record.outcome
    ? {
        realizedR: record.outcome.realizedR,
        reason: record.outcome.reason,
        exitDiscipline: classifyExit(record.outcome.reason),
      }
    : null;

  // ── Review split (trader's own numbers, verbatim) ──────────────────────
  const qualitySplit: ReceiptQualitySplit | null = record.review
    ? {
        marketOpportunityQuality: record.review.marketOpportunityQuality,
        playbookMatch: record.review.playbookMatch,
        riskQuality: record.review.riskQuality,
        executionQuality: record.review.executionQuality,
        processAdherence: record.review.processAdherence,
      }
    : null;

  const lessons: readonly string[] = record.review ? record.review.lessons : [];

  // ── Honest residue (never counts a by-design gap as a debt) ────────────
  const pending: string[] = [];
  if (!record.outcome && !isNonTrade) {
    pending.push("Outcome not yet attached.");
  }
  if (record.outcome && !record.review) {
    pending.push("Review not yet attached.");
  }
  if (isNonTrade && !record.outcome) {
    // A disciplined non-trade is complete — state it, do not flag it as a debt.
    pending.push("No position by design — a disciplined non-trade.");
  }

  return {
    version: DECISION_RECEIPT_VERSION,
    empty: false,
    decisionId: record.decisionId,
    stage,
    action,
    isNonTrade,
    headline: headlineFor(stage, action, isNonTrade),
    thesis: record.plan.thesis,
    commitment,
    processFacts,
    managementTrail,
    outcome,
    qualitySplit,
    lessons,
    pending,
    amendmentCount: record.amendments.length,
  };
}

function headlineFor(stage: ReceiptStage, action: DecisionAction, isNonTrade: boolean): string {
  switch (stage) {
    case "REVIEWED":
      return "Decision reviewed — the receipt is complete.";
    case "CLOSED":
      return "Trade closed — awaiting the trader's review.";
    case "MANAGED":
      return "Position live — the management trail is recording.";
    case "SEALED":
    default:
      return isNonTrade
        ? `Decision sealed — a disciplined ${ACTION_LABEL[action].toLowerCase()}.`
        : "Decision sealed — awaiting management and outcome.";
  }
}

export default selectDecisionReceipt;
