/**
 * selectMirror — M32 pure selector.
 *
 * Answers: "WHAT DOES MY BEHAVIOR TEACH ME?"
 *
 * Founder doctrine (2026-08-13):
 *   Separate: OBSERVED / USER-DECLARED / SYSTEM-DERIVED CANDIDATE / UNKNOWN.
 *   Patterns may include: rushing, external influence, FOMO, trade-count
 *   drift, premature entry, late exit, rule adherence, recovery.
 *   No psychiatric diagnosis.
 *
 * Every pattern this selector emits carries an explicit EvidenceClass so
 * the UI can never present a system guess as established fact.
 */

import type { DecisionMemorySnapshot } from "./selectProcessLandscape";

// ── Evidence classification — the heart of the no-diagnosis rule ────────

export type EvidenceClass =
  | "OBSERVED"          // directly recorded fact (trade count, timestamps)
  | "USER_DECLARED"     // the trader said so (self-report, flags)
  | "SYSTEM_CANDIDATE"  // pattern the system noticed — a HYPOTHESIS, not a fact
  | "UNKNOWN";          // insufficient data

export type PatternDirection = "STRENGTH" | "WATCH" | "NEUTRAL";

export interface MirrorPattern {
  readonly id: string;
  readonly label: string;
  readonly evidenceClass: EvidenceClass;
  readonly direction: PatternDirection;
  /** Human-readable statement — must be phrased as observation, never diagnosis. */
  readonly statement: string;
  readonly evidence: readonly string[];
  readonly sampleCount: number;
  /** Decisions this pattern derives from — enables Mirror → Memory drill. */
  readonly decisionIds: readonly string[];
  readonly confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
}

export interface MirrorVM {
  readonly ownerId: string;
  readonly patterns: readonly MirrorPattern[];
  readonly windowStartMs: number;
  readonly windowEndMs: number;
  readonly totalDecisions: number;
  readonly reason?: string;
  readonly evaluatedAt: number;
  /** Minimum sample count before a pattern is emitted at all. */
  readonly sampleThreshold: number;
}

export interface MirrorInput {
  readonly ownerId: string;
  readonly decisions: readonly DecisionMemorySnapshot[];
  readonly windowStartMs?: number;
  readonly windowEndMs?: number;
  readonly sampleThreshold?: number;
  /** REQUIRED (per Founder Cycle 12 §G determinism doctrine):
   *  Evidence-producing selectors must not silently read the wall clock.
   *  Callers pass captured/canonical time so Replay reproduces the same
   *  patterns across sessions. */
  readonly nowMs: number;
}

// ── Pattern detectors ───────────────────────────────────────────────────

type Detector = (
  decisions: readonly DecisionMemorySnapshot[],
  threshold: number,
) => MirrorPattern | null;

const confidenceFor = (n: number, threshold: number): MirrorPattern["confidence"] =>
  n >= threshold * 3 ? "HIGH" : n >= threshold ? "MEDIUM" : "LOW";

// ── Behavioral detectors added for Founder Aug-12 TSLA case ──────────
//   Post-Exit Integrity / Success-Rule-Bending / Missed-Profit-Revenge
// These are RETROSPECTIVE mirrors (post-session review) of the
// PROSPECTIVE ATHOS interventions (moment-time). Same evidence, different
// framing: ATHOS asks 'should we say something now?'; Mirror asks 'what
// pattern does the session reveal?'
// ─────────────────────────────────────────────────────────────────────

const POST_EXIT_QUICK_REENTRY_WINDOW_MS = 5 * 60_000;
const LARGE_WINNER_R = 1.5;

const detectPostExitOvertrading: Detector = (decisions, threshold) => {
  // Look for winner → quick re-entry pairs in the session
  const sorted = [...decisions]
    .filter((d) => d.outcome != null)
    .sort((a, b) => a.outcome!.closedAt - b.outcome!.closedAt);
  const pairs: DecisionMemorySnapshot[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const prev = sorted[i];
    const next = sorted[i + 1];
    if (prev.outcome!.realizedR > 0 && next.capturedAt - prev.outcome!.closedAt < POST_EXIT_QUICK_REENTRY_WINDOW_MS) {
      pairs.push(next);
    }
  }
  if (pairs.length < 1) return null;
  return {
    id: "post-exit-quick-reentry",
    label: "Post-exit quick re-entry",
    evidenceClass: "SYSTEM_CANDIDATE",
    direction: "WATCH",
    statement: `${pairs.length} re-entry decision(s) opened within ${POST_EXIT_QUICK_REENTRY_WINDOW_MS / 60_000}m of a prior winner this session.`,
    evidence: [
      "Quick re-entry after a winner correlates with missed-profit regret in the founder Aug-12 case",
      "This is a candidate pattern from decision timing — not a diagnosis",
    ],
    sampleCount: pairs.length,
    decisionIds: pairs.map((d) => d.decisionId),
    confidence: confidenceFor(pairs.length, threshold),
  };
};

const detectSuccessRuleBending: Detector = (decisions, threshold) => {
  // Rule violations that occurred AFTER a winner in the same session
  const sorted = [...decisions].sort((a, b) => a.capturedAt - b.capturedAt);
  const violationsAfterWinner: DecisionMemorySnapshot[] = [];
  let hadWinner = false;
  for (const d of sorted) {
    if (d.outcome && d.outcome.realizedR >= LARGE_WINNER_R) {
      hadWinner = true;
      continue;
    }
    if (hadWinner && !d.ruleAdherenceAtDecision) {
      violationsAfterWinner.push(d);
    }
  }
  if (violationsAfterWinner.length < 1) return null;
  return {
    id: "success-triggered-rule-bending",
    label: "Success-triggered rule bending",
    evidenceClass: "SYSTEM_CANDIDATE",
    direction: "WATCH",
    statement: `${violationsAfterWinner.length} rule violation(s) recorded AFTER a ≥${LARGE_WINNER_R}R winner this session.`,
    evidence: [
      "Confidence elevation after a strong winner is when rule bending most often occurs (Founder Aug-12 §12)",
      "Detected via decision ordering + outcome — never emotional inference",
    ],
    sampleCount: violationsAfterWinner.length,
    decisionIds: violationsAfterWinner.map((d) => d.decisionId),
    confidence: confidenceFor(violationsAfterWinner.length, threshold),
  };
};

const DETECTORS: readonly Detector[] = [
  detectPostExitOvertrading,
  detectSuccessRuleBending,
  // Rule adherence — OBSERVED (directly recorded per decision)
  (decisions, threshold) => {
    if (decisions.length < threshold) return null;
    const followed = decisions.filter((d) => d.ruleAdherenceAtDecision);
    const rate = followed.length / decisions.length;
    const violations = decisions.filter((d) => !d.ruleAdherenceAtDecision);
    return {
      id: "rule-adherence",
      label: "Rule adherence",
      evidenceClass: "OBSERVED",
      direction: rate >= 0.9 ? "STRENGTH" : rate >= 0.7 ? "NEUTRAL" : "WATCH",
      statement: `Rules were followed on ${followed.length} of ${decisions.length} decisions (${Math.round(rate * 100)}%).`,
      evidence: [`${violations.length} decision(s) recorded a rule violation`],
      sampleCount: decisions.length,
      decisionIds: violations.map((d) => d.decisionId),
      confidence: confidenceFor(decisions.length, threshold),
    };
  },

  // External influence — USER_DECLARED (only the trader can flag this)
  (decisions, threshold) => {
    const flagged = decisions.filter((d) => d.externalInfluenceFlagged);
    if (flagged.length === 0) return null;
    return {
      id: "external-influence",
      label: "External influence",
      evidenceClass: "USER_DECLARED",
      direction: "WATCH",
      statement: `You flagged external influence on ${flagged.length} of ${decisions.length} decisions.`,
      evidence: ["Flag is self-declared — the system does not infer social influence"],
      sampleCount: flagged.length,
      decisionIds: flagged.map((d) => d.decisionId),
      confidence: confidenceFor(flagged.length, threshold),
    };
  },

  // Trade-count drift — SYSTEM_CANDIDATE (correlation, not cause)
  (decisions, threshold) => {
    const late = decisions.filter((d) => d.tradeNumberInSession >= 4);
    const early = decisions.filter((d) => d.tradeNumberInSession <= 2);
    if (late.length < threshold || early.length < threshold) return null;
    const scoreOf = (arr: readonly DecisionMemorySnapshot[]) => {
      const reviewed = arr.filter((d) => d.review);
      if (reviewed.length === 0) return null;
      return reviewed.reduce((s, d) => s + d.review!.processAdherence, 0) / reviewed.length;
    };
    const lateScore = scoreOf(late);
    const earlyScore = scoreOf(early);
    if (lateScore == null || earlyScore == null) return null;
    const delta = earlyScore - lateScore;
    if (delta < 0.5) return null; // no meaningful drift
    return {
      id: "trade-count-drift",
      label: "Process quality by trade number",
      evidenceClass: "SYSTEM_CANDIDATE",
      direction: "WATCH",
      statement: `Process-adherence scores average ${earlyScore.toFixed(1)}/5 on trades 1–2 and ${lateScore.toFixed(1)}/5 on trade 4 onward. This is a correlation in your reviews, not a cause.`,
      evidence: [
        `${early.length} early-sequence decision(s), ${late.length} late-sequence decision(s)`,
        "Derived from your own review scores — not a system judgment of you",
      ],
      sampleCount: late.length + early.length,
      decisionIds: late.map((d) => d.decisionId),
      confidence: confidenceFor(Math.min(late.length, early.length), threshold),
    };
  },

  // Professional loss / dangerous win — OBSERVED (both fields recorded)
  (decisions, threshold) => {
    const closed = decisions.filter((d) => d.outcome && d.review);
    if (closed.length < threshold) return null;
    const professionalLoss = closed.filter((d) => d.outcome!.realizedR < 0 && d.review!.processAdherence >= 4);
    const dangerousWin = closed.filter((d) => d.outcome!.realizedR > 0 && d.review!.processAdherence <= 2);
    if (professionalLoss.length === 0 && dangerousWin.length === 0) return null;
    return {
      id: "process-outcome-split",
      label: "Process vs outcome",
      evidenceClass: "OBSERVED",
      direction: dangerousWin.length > professionalLoss.length ? "WATCH" : "STRENGTH",
      statement: `${professionalLoss.length} professional loss(es) — good process, bad outcome. ${dangerousWin.length} dangerous win(s) — poor process, good outcome.`,
      evidence: [
        "Professional losses are the cost of doing business correctly",
        "Dangerous wins reinforce behavior that will eventually cost more than it earned",
      ],
      sampleCount: closed.length,
      decisionIds: [...dangerousWin, ...professionalLoss].map((d) => d.decisionId),
      confidence: confidenceFor(closed.length, threshold),
    };
  },

  // Review completion — OBSERVED
  (decisions, threshold) => {
    const closed = decisions.filter((d) => d.outcome);
    if (closed.length < threshold) return null;
    const reviewed = closed.filter((d) => d.review);
    const rate = reviewed.length / closed.length;
    return {
      id: "review-completion",
      label: "Review discipline",
      evidenceClass: "OBSERVED",
      direction: rate >= 0.8 ? "STRENGTH" : rate >= 0.5 ? "NEUTRAL" : "WATCH",
      statement: `${reviewed.length} of ${closed.length} closed decisions have a completed review (${Math.round(rate * 100)}%).`,
      evidence: ["Unreviewed decisions cannot teach — the lesson stays locked in the trade"],
      sampleCount: closed.length,
      decisionIds: closed.filter((d) => !d.review).map((d) => d.decisionId),
      confidence: confidenceFor(closed.length, threshold),
    };
  },
];

// ── Selector ────────────────────────────────────────────────────────────

export function selectMirror(input: MirrorInput): MirrorVM {
  // Deterministic: callers must supply nowMs (see MirrorInput contract).
  const now = input.nowMs;
  const threshold = input.sampleThreshold ?? 3;
  const windowStart = input.windowStartMs ?? 0;
  const windowEnd = input.windowEndMs ?? Number.POSITIVE_INFINITY;

  const scoped = input.decisions.filter(
    (d) => d.ownerId === input.ownerId && d.capturedAt >= windowStart && d.capturedAt <= windowEnd,
  );

  if (scoped.length === 0) {
    return {
      ownerId: input.ownerId,
      patterns: [],
      windowStartMs: windowStart === 0 ? 0 : windowStart,
      windowEndMs: windowEnd === Number.POSITIVE_INFINITY ? 0 : windowEnd,
      totalDecisions: 0,
      reason: "No decisions in scope — Mirror has nothing to reflect yet",
      evaluatedAt: now,
      sampleThreshold: threshold,
    };
  }

  const patterns = DETECTORS
    .map((detect) => detect(scoped, threshold))
    .filter((p): p is MirrorPattern => p !== null);

  return {
    ownerId: input.ownerId,
    patterns,
    windowStartMs: windowStart === 0 ? Math.min(...scoped.map((d) => d.capturedAt)) : windowStart,
    windowEndMs: windowEnd === Number.POSITIVE_INFINITY ? Math.max(...scoped.map((d) => d.capturedAt)) : windowEnd,
    totalDecisions: scoped.length,
    reason: patterns.length === 0 ? `No pattern reached the ${threshold}-decision sample threshold` : undefined,
    evaluatedAt: now,
    sampleThreshold: threshold,
  };
}
