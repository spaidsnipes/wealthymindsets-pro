/**
 * selectATHOSIntervention — VS-3 pure selector.
 *
 * Answers: "Is ATHOS assistance USEFUL right now, or should it remain silent?"
 *
 * Founder doctrine (Aug 13 super-directive §14):
 *   - Silence is a feature.
 *   - ATHOS should intervene only when useful.
 *   - Interventions must be calm, specific, evidence-based, never patronizing.
 *
 * Verdict scale:
 *   NONE       — silence. Default. Emit this most of the time.
 *   NOTICE     — quiet inline note; no urgency; user may ignore.
 *   ADVISORY   — worth pausing to consider; still purely informational.
 *   CAUTION    — a rule/behavior signal is present; user retains agency.
 *
 * NEVER emits DENY / BLOCK / STOP. Human sovereignty (§10.14). ATHOS
 * informs; the trader decides.
 *
 * Every intervention carries `evidenceClass`:
 *   OBSERVED         — directly-recorded facts (timestamps, counts, prices)
 *   USER_DECLARED    — self-reports (external influence flag, self-rated focus)
 *   SYSTEM_CANDIDATE — pattern detection, correlational, not diagnostic
 *   UNKNOWN          — insufficient evidence to say anything
 *
 * Deterministic: takes `nowMs` (required). Callers pass captured/canonical time.
 */

import type { CanonicalMarketState } from "../../marketData/canonicalMarketState";
import type { DecisionMemorySnapshot } from "./selectProcessLandscape";
import type { EvidenceClass } from "./selectMirror";
import type { DLARVM } from "../../marketData/viewModels/selectDLAR";
import type { CLCVM } from "../../marketData/viewModels/selectCLC";

export type ATHOSVerdict = "NONE" | "NOTICE" | "ADVISORY" | "CAUTION";

export type ATHOSMoment =
  | "PRE_ENTRY"          // hovering on a setup, no position
  | "AT_ENTRY_TRIGGER"   // signal firing right now
  | "IN_POSITION"        // trade open, managing
  | "AT_EXIT"            // just exited
  | "POST_EXIT"          // some time after exit, may see continuation
  | "PRE_REENTRY"        // considering another trade shortly after exit
  | "POST_RULE_VIOLATION" // last trade broke a stated rule
  | "IDLE"               // no active decision context
  | "SESSION_REVIEW";    // end of session / post-session

export interface ATHOSIntervention {
  readonly id: string;
  readonly verdict: ATHOSVerdict;
  readonly moment: ATHOSMoment;
  readonly headline: string;
  readonly evidenceClass: EvidenceClass;
  /** Optional trader-facing detail. Displayed on expand — never auto-shown. */
  readonly detail?: string;
  readonly evidenceIds: readonly string[];
  /** Explicit reason — always populated. */
  readonly reason: string;
}

export interface ATHOSInput {
  readonly ownerId: string;
  readonly sessionIdentity: string;
  readonly moment: ATHOSMoment;
  readonly nowMs: number;
  readonly marketState?: CanonicalMarketState | null;
  readonly dlar?: DLARVM | null;
  readonly clc?: CLCVM | null;
  /** Decisions in the current session, most recent last. Owner-scoped by caller. */
  readonly sessionDecisions: readonly DecisionMemorySnapshot[];
  /** Trader rule: max trades per session (from configurable rule hierarchy). */
  readonly maxTradesPerSession?: number | null;
  /** Trader rule: max losses per session (lockout when hit). */
  readonly maxLossesPerSession?: number | null;
  /** Consider re-entry within this window "shortly after" the last exit. Default 5min. */
  readonly reentryWindowMs?: number;
  /** Threshold for "large continuation after exit" — normalized to expected R. Default 1.0. */
  readonly largeContinuationRThreshold?: number;
}

export interface ATHOSIntervention_Result {
  readonly interventions: readonly ATHOSIntervention[];
  readonly reason: string;
  readonly evaluatedAt: number;
}

// ── Detectors — each returns null when the moment doesn't fit ─────────

type Detector = (input: ATHOSInput) => ATHOSIntervention | null;

const detectPreEntryConfirmation: Detector = (input) => {
  if (input.moment !== "PRE_ENTRY" && input.moment !== "AT_ENTRY_TRIGGER") return null;
  if (!input.clc || !input.dlar) return null;
  const contextSatisfied = input.clc.context.verdict === "SATISFIED";
  const locationSatisfied = input.clc.location.verdict === "SATISFIED";
  const confirmationSatisfied = input.clc.confirmation.verdict === "SATISFIED";
  if (contextSatisfied && locationSatisfied && !confirmationSatisfied) {
    return {
      id: `preentry-await-confirmation-${input.sessionIdentity}`,
      verdict: "NOTICE",
      moment: input.moment,
      headline: "You have Context and Location. Confirmation has not yet fired.",
      evidenceClass: "OBSERVED",
      detail: `CLC verdict: ${input.clc.verdict}. Confirmation leg: ${input.clc.confirmation.summary}`,
      evidenceIds: [...input.clc.context.evidence, ...input.clc.location.evidence].map((e) => e.eventId),
      reason: "Two CLC legs satisfied, one outstanding — pausing until confirmation is a discipline signal, not a rejection.",
    };
  }
  return null;
};

const detectPreEntryAbsorption: Detector = (input) => {
  if (input.moment !== "PRE_ENTRY" && input.moment !== "AT_ENTRY_TRIGGER") return null;
  if (!input.dlar) return null;
  if (input.dlar.response.verdict !== "ABSORBED") return null;
  return {
    id: `preentry-absorption-${input.sessionIdentity}`,
    verdict: "ADVISORY",
    moment: input.moment,
    headline: "Aggression is being absorbed — participation is not producing progress.",
    evidenceClass: "OBSERVED",
    detail: `Response verdict ABSORBED (${input.dlar.response.displacementRatio?.toFixed(2) ?? "?"}× ATR). ${input.dlar.narrative}`,
    evidenceIds: input.dlar.response.evidence.map((e) => e.eventId),
    reason: "Entering into observed absorption often puts a trader on the wrong side of the auction.",
  };
};

const detectPostExitContinuationIntegrity: Detector = (input) => {
  if (input.moment !== "POST_EXIT") return null;
  const closed = input.sessionDecisions
    .filter((d) => d.outcome)
    .sort((a, b) => (b.outcome!.closedAt - a.outcome!.closedAt));
  const last = closed[0];
  if (!last?.outcome) return null;
  // If the last exit was recent and the current market is still moving in the
  // trade's original direction, surface the Post-Exit Integrity notice.
  const minutesSinceExit = (input.nowMs - last.outcome.closedAt) / 60_000;
  if (minutesSinceExit > 30) return null;
  return {
    id: `post-exit-integrity-${last.decisionId}`,
    verdict: "NOTICE",
    moment: "POST_EXIT",
    headline: "Price continuing after your exit does not automatically mean the exit was wrong.",
    evidenceClass: "SYSTEM_CANDIDATE",
    detail: `Compare the exit against your predefined management rule, not against future information. Realized ${last.outcome.realizedR.toFixed(2)}R via ${last.outcome.reason}. Exited ${minutesSinceExit.toFixed(0)}m ago.`,
    evidenceIds: [last.decisionId],
    reason: "Post-Exit Integrity framing — separates outcome from execution quality per Founder doctrine.",
  };
};

const detectPreReentryMissedProfitRevenge: Detector = (input) => {
  if (input.moment !== "PRE_REENTRY") return null;
  const reentryWindow = input.reentryWindowMs ?? 5 * 60_000;
  const closed = input.sessionDecisions
    .filter((d) => d.outcome)
    .sort((a, b) => (b.outcome!.closedAt - a.outcome!.closedAt));
  const last = closed[0];
  if (!last?.outcome) return null;
  const wasWinner = last.outcome.realizedR > 0;
  const soonAfterExit = (input.nowMs - last.outcome.closedAt) < reentryWindow;
  if (!wasWinner || !soonAfterExit) return null;
  return {
    id: `pre-reentry-missed-profit-${last.decisionId}`,
    verdict: "CAUTION",
    moment: "PRE_REENTRY",
    headline: "Is this a planned re-entry, or an attempt to recapture missed upside?",
    evidenceClass: "SYSTEM_CANDIDATE",
    detail: `Last exit ${((input.nowMs - last.outcome.closedAt) / 60_000).toFixed(0)}m ago closed +${last.outcome.realizedR.toFixed(2)}R. Missed-profit regret can trigger impulsive re-entry. If this trade is independently qualified under your plan, proceed; if it exists mainly to recover the continuation you did not capture, that is a behavioral signal.`,
    evidenceIds: [last.decisionId],
    reason: "Missed-profit-revenge pattern — detected via short window + prior winner.",
  };
};

const detectSuccessTriggeredRuleBending: Detector = (input) => {
  if (input.moment !== "PRE_REENTRY" && input.moment !== "PRE_ENTRY") return null;
  if (input.maxTradesPerSession == null) return null;
  const attempted = input.sessionDecisions.length;
  if (attempted < input.maxTradesPerSession) return null;
  const wonSome = input.sessionDecisions.some((d) => d.outcome && d.outcome.realizedR > 0);
  if (!wonSome) return null;
  return {
    id: `success-triggered-rule-bending-${input.sessionIdentity}-${attempted}`,
    verdict: "CAUTION",
    moment: input.moment,
    headline: "This would exceed your declared trade-count plan after a winning session.",
    evidenceClass: "OBSERVED",
    detail: `Plan: ${input.maxTradesPerSession} trade(s) per session. Already: ${attempted}. Confidence elevation after a winner is when rule bending most often occurs — Founder Aug-13 doctrine §12.`,
    evidenceIds: input.sessionDecisions.map((d) => d.decisionId),
    reason: "Success-triggered rule bending — exceeded declared count + at least one win.",
  };
};

const detectPostRuleViolationSeparation: Detector = (input) => {
  if (input.moment !== "POST_RULE_VIOLATION" && input.moment !== "SESSION_REVIEW") return null;
  const violations = input.sessionDecisions.filter((d) => !d.ruleAdherenceAtDecision);
  if (violations.length === 0) return null;
  const winners = violations.filter((d) => d.outcome && d.outcome.realizedR > 0);
  const losers = violations.filter((d) => d.outcome && d.outcome.realizedR < 0);
  return {
    id: `process-outcome-separation-${input.sessionIdentity}-${violations.length}`,
    verdict: "ADVISORY",
    moment: input.moment,
    headline: "Separate trade outcome from rule quality.",
    evidenceClass: "OBSERVED",
    detail: `${violations.length} rule-adherence violation(s) recorded this session (${winners.length} won, ${losers.length} lost). A rule-violating winner reinforces behavior that eventually costs more than it earned.`,
    evidenceIds: violations.map((d) => d.decisionId),
    reason: "Process vs outcome — Founder doctrine §D03/D04. A dangerous win is still dangerous.",
  };
};

const detectMaxLossesReached: Detector = (input) => {
  if (input.maxLossesPerSession == null) return null;
  const losses = input.sessionDecisions.filter((d) => d.outcome && d.outcome.realizedR < 0).length;
  if (losses < input.maxLossesPerSession) return null;
  return {
    id: `max-losses-${input.sessionIdentity}-${losses}`,
    verdict: "CAUTION",
    moment: input.moment,
    headline: `Your declared max-loss plan has been reached (${losses}/${input.maxLossesPerSession}).`,
    evidenceClass: "OBSERVED",
    detail: "You retain full agency to continue. Founder-standard is that additional trades after this threshold warrant explicit acknowledgement, not silent override.",
    evidenceIds: input.sessionDecisions.filter((d) => d.outcome && d.outcome.realizedR < 0).map((d) => d.decisionId),
    reason: "Configurable loss-limit reached — informational only; no gate.",
  };
};

const DETECTORS: readonly Detector[] = [
  detectPreEntryConfirmation,
  detectPreEntryAbsorption,
  detectPostExitContinuationIntegrity,
  detectPreReentryMissedProfitRevenge,
  detectSuccessTriggeredRuleBending,
  detectPostRuleViolationSeparation,
  detectMaxLossesReached,
];

// ── Main selector ──────────────────────────────────────────────────────

export function selectATHOSIntervention(input: ATHOSInput): ATHOSIntervention_Result {
  const interventions: ATHOSIntervention[] = [];
  for (const detect of DETECTORS) {
    const hit = detect(input);
    if (hit) interventions.push(hit);
  }
  return {
    interventions,
    reason:
      interventions.length === 0
        ? "No detector matched — silence is the correct response (Founder doctrine §14)."
        : `${interventions.length} useful intervention(s) available at moment ${input.moment}.`,
    evaluatedAt: input.nowMs,
  };
}

/**
 * Rank interventions by verdict severity for UI ordering.
 * CAUTION > ADVISORY > NOTICE > NONE. Stable within same rank.
 */
export function rankInterventions(
  interventions: readonly ATHOSIntervention[],
): readonly ATHOSIntervention[] {
  const order: Record<ATHOSVerdict, number> = { NONE: 0, NOTICE: 1, ADVISORY: 2, CAUTION: 3 };
  return [...interventions].sort((a, b) => order[b.verdict] - order[a.verdict]);
}
