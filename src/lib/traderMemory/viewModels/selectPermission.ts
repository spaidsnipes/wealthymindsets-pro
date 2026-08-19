/**
 * selectPermission — VS-4 pure selector.
 *
 * Closes the Founder decision chain node "PERMISSION":
 *   Regime → Direction → Location → Auction → Aggression → CLC →
 *     Risk Geometry → PERMISSION → Management.
 *
 * Answers: "Do the trader's OWN RULES currently permit participation?"
 *
 * Founder doctrine (super-directive §16, §H2 & §14):
 *   - Rules are configurable (one-and-done is not universal).
 *   - Human sovereignty: Permission INFORMS, it does not gate.
 *   - Steward informs the trader; the trader retains agency.
 *   - Distinguish RULE / TEMPORARY PREFERENCE / EXPERIMENT / VIOLATION.
 *
 * Verdict scale:
 *   ALLOWED    — no configured rule is currently limiting participation.
 *   ADVISORY   — a soft rule (recommendation) is engaged; user notified.
 *   RESTRICTED — a hard rule is engaged (e.g. max losses reached);
 *                user retains override capacity + must acknowledge.
 *   UNKNOWN    — inputs insufficient to evaluate any rule.
 *
 * NEVER emits DENIED / BLOCKED as a boolean gate. The UI should render
 * this as "your rules say X" not "WM will not let you trade."
 */

import type { MarketQualityState, CanonicalMarketState } from "../../marketData/canonicalMarketState";
import type { DecisionMemorySnapshot } from "./selectProcessLandscape";
import type { CLCVM } from "../../marketData/viewModels/selectCLC";
import type { AvailableRVM } from "./selectAvailableR";

export type PermissionVerdict = "ALLOWED" | "ADVISORY" | "RESTRICTED" | "UNKNOWN";
export type RuleKind = "HARD" | "SOFT" | "EXPERIMENT";
export type RuleTrigger =
  | "MAX_TRADES_PER_SESSION"
  | "MAX_LOSSES_PER_SESSION"
  | "MAX_DAILY_DRAWDOWN"
  | "MIN_RR"
  | "REENTRY_COOLDOWN"
  | "COOLDOWN_AFTER_LOSS"
  | "DATA_QUALITY_FLOOR"
  | "CLC_MUST_BE_SATISFIED";

export interface RuleConfiguration {
  readonly id: string;
  readonly kind: RuleKind;
  readonly trigger: RuleTrigger;
  readonly label: string;
  /** Numeric threshold where applicable. */
  readonly threshold?: number;
  /** For time-based rules, ms. */
  readonly windowMs?: number;
}

export interface RuleEvaluation {
  readonly rule: RuleConfiguration;
  readonly engaged: boolean;
  readonly reason: string;
  readonly evidenceIds: readonly string[];
}

export interface PermissionInput {
  readonly ownerId: string;
  readonly sessionIdentity: string;
  readonly nowMs: number;
  readonly rules: readonly RuleConfiguration[];
  readonly sessionDecisions: readonly DecisionMemorySnapshot[];
  readonly marketState?: CanonicalMarketState | null;
  readonly clc?: CLCVM | null;
  readonly availableR?: AvailableRVM | null;
  /** Session-cumulative realized R. Negative = drawdown. */
  readonly cumulativeSessionR?: number;
}

export interface PermissionVM {
  readonly verdict: PermissionVerdict;
  readonly evaluations: readonly RuleEvaluation[];
  /** Only the rules whose `engaged` is true. */
  readonly engagedRules: readonly RuleEvaluation[];
  readonly headline: string;
  readonly reason: string;
  /** For consumers that want to show "of N rules, K engaged". */
  readonly ruleCount: number;
  readonly evaluatedAt: number;
}

// ── Rule evaluators — pure fns, produce RuleEvaluation ────────────────

type Evaluator = (rule: RuleConfiguration, input: PermissionInput) => RuleEvaluation;

const evaluateMaxTrades: Evaluator = (rule, input) => {
  const attempted = input.sessionDecisions.length;
  const threshold = rule.threshold ?? Number.POSITIVE_INFINITY;
  const engaged = attempted >= threshold;
  return {
    rule,
    engaged,
    reason: engaged
      ? `${attempted} trade(s) already this session — at or over your declared max of ${threshold}.`
      : `${attempted} of ${threshold} trade(s) used this session.`,
    evidenceIds: input.sessionDecisions.map((d) => d.decisionId),
  };
};

const evaluateMaxLosses: Evaluator = (rule, input) => {
  const losses = input.sessionDecisions.filter((d) => d.outcome && d.outcome.realizedR < 0).length;
  const threshold = rule.threshold ?? Number.POSITIVE_INFINITY;
  const engaged = losses >= threshold;
  return {
    rule,
    engaged,
    reason: engaged
      ? `${losses} loss(es) this session — at or over your declared max of ${threshold}.`
      : `${losses} of ${threshold} loss(es) recorded.`,
    evidenceIds: input.sessionDecisions
      .filter((d) => d.outcome && d.outcome.realizedR < 0)
      .map((d) => d.decisionId),
  };
};

const evaluateMaxDailyDrawdown: Evaluator = (rule, input) => {
  const cum = input.cumulativeSessionR ?? 0;
  const threshold = rule.threshold ?? Number.NEGATIVE_INFINITY;
  // threshold is a NEGATIVE R value (e.g. -3). Rule engages when cum <= threshold.
  const engaged = cum <= threshold;
  return {
    rule,
    engaged,
    reason: engaged
      ? `Session R ${cum.toFixed(2)} at or below your declared max drawdown ${threshold}.`
      : `Session R ${cum.toFixed(2)} within your declared drawdown floor ${threshold}.`,
    evidenceIds: input.sessionDecisions
      .filter((d) => d.outcome)
      .map((d) => d.decisionId),
  };
};

const evaluateMinRR: Evaluator = (rule, input) => {
  const threshold = rule.threshold ?? 0;
  const availableR = input.availableR;
  if (!availableR || availableR.conservativeR === "UNKNOWN") {
    return {
      rule,
      engaged: false,
      reason: `Cannot evaluate — conservative R unresolved (${availableR?.resolution ?? "no evidence"}).`,
      evidenceIds: [],
    };
  }
  const engaged = availableR.conservativeR < threshold;
  return {
    rule,
    engaged,
    reason: engaged
      ? `Conservative R ${availableR.conservativeR.toFixed(2)} below your declared min ${threshold}.`
      : `Conservative R ${availableR.conservativeR.toFixed(2)} meets or exceeds your declared min ${threshold}.`,
    evidenceIds: [],
  };
};

const evaluateReentryCooldown: Evaluator = (rule, input) => {
  const windowMs = rule.windowMs ?? 5 * 60_000;
  const lastClose = input.sessionDecisions
    .filter((d) => d.outcome)
    .map((d) => d.outcome!.closedAt)
    .reduce((max, at) => (at > max ? at : max), 0);
  if (lastClose === 0) {
    return { rule, engaged: false, reason: "No prior decisions in session.", evidenceIds: [] };
  }
  const msSinceExit = input.nowMs - lastClose;
  const engaged = msSinceExit < windowMs;
  return {
    rule,
    engaged,
    reason: engaged
      ? `Last exit was ${Math.round(msSinceExit / 1000)}s ago — inside your ${Math.round(windowMs / 1000)}s cooldown.`
      : `Last exit was ${Math.round(msSinceExit / 1000)}s ago — past your ${Math.round(windowMs / 1000)}s cooldown.`,
    evidenceIds: [],
  };
};

const evaluateCooldownAfterLoss: Evaluator = (rule, input) => {
  const windowMs = rule.windowMs ?? 10 * 60_000;
  const lastLoss = input.sessionDecisions
    .filter((d) => d.outcome && d.outcome.realizedR < 0)
    .map((d) => d.outcome!.closedAt)
    .reduce((max, at) => (at > max ? at : max), 0);
  if (lastLoss === 0) {
    return { rule, engaged: false, reason: "No losses in session yet.", evidenceIds: [] };
  }
  const msSinceLoss = input.nowMs - lastLoss;
  const engaged = msSinceLoss < windowMs;
  return {
    rule,
    engaged,
    reason: engaged
      ? `Last loss ${Math.round(msSinceLoss / 60_000)}m ago — inside your ${Math.round(windowMs / 60_000)}m post-loss cooldown.`
      : `Last loss ${Math.round(msSinceLoss / 60_000)}m ago — past cooldown.`,
    evidenceIds: [],
  };
};

const evaluateDataQualityFloor: Evaluator = (rule, input) => {
  const quality: MarketQualityState = input.marketState?.qualityState ?? "UNAVAILABLE";
  // Rule engages when quality drops BELOW acceptable
  const disallow: MarketQualityState[] = ["STALE", "UNAVAILABLE"];
  const engaged = disallow.includes(quality);
  return {
    rule,
    engaged,
    reason: engaged
      ? `Market data quality is ${quality} — below your declared floor.`
      : `Market data quality is ${quality} — acceptable.`,
    evidenceIds: [],
  };
};

const evaluateCLCMustBeSatisfied: Evaluator = (rule, input) => {
  if (!input.clc) {
    return { rule, engaged: false, reason: "No CLC evaluation available.", evidenceIds: [] };
  }
  const engaged = input.clc.verdict !== "CLC_LONG" && input.clc.verdict !== "CLC_SHORT";
  return {
    rule,
    engaged,
    reason: engaged
      ? `CLC verdict is ${input.clc.verdict} — not a satisfied LONG/SHORT setup.`
      : `CLC verdict is ${input.clc.verdict}.`,
    evidenceIds: [],
  };
};

const EVALUATORS: Record<RuleTrigger, Evaluator> = {
  MAX_TRADES_PER_SESSION: evaluateMaxTrades,
  MAX_LOSSES_PER_SESSION: evaluateMaxLosses,
  MAX_DAILY_DRAWDOWN: evaluateMaxDailyDrawdown,
  MIN_RR: evaluateMinRR,
  REENTRY_COOLDOWN: evaluateReentryCooldown,
  COOLDOWN_AFTER_LOSS: evaluateCooldownAfterLoss,
  DATA_QUALITY_FLOOR: evaluateDataQualityFloor,
  CLC_MUST_BE_SATISFIED: evaluateCLCMustBeSatisfied,
};

// ── Main selector ──────────────────────────────────────────────────────

export function selectPermission(input: PermissionInput): PermissionVM {
  if (input.rules.length === 0) {
    return {
      verdict: "UNKNOWN",
      evaluations: [],
      engagedRules: [],
      headline: "No trading rules configured.",
      reason: "Configure at least one rule in your Steward settings for Permission to be evaluated.",
      ruleCount: 0,
      evaluatedAt: input.nowMs,
    };
  }

  const evaluations: RuleEvaluation[] = input.rules.map((rule) => {
    const evaluator = EVALUATORS[rule.trigger];
    return evaluator(rule, input);
  });
  const engagedRules = evaluations.filter((e) => e.engaged);
  const hardEngaged = engagedRules.filter((e) => e.rule.kind === "HARD");
  const softEngaged = engagedRules.filter((e) => e.rule.kind === "SOFT");

  let verdict: PermissionVerdict;
  let headline: string;
  let reason: string;

  if (hardEngaged.length > 0) {
    verdict = "RESTRICTED";
    headline = `Your ${hardEngaged.length === 1 ? "rule says" : "rules say"} ${hardEngaged.map((e) => e.rule.label).join(", ")}.`;
    reason = "Hard rule(s) engaged. You retain override capacity — WM does not gate the action. Consider acknowledging the override intentionally.";
  } else if (softEngaged.length > 0) {
    verdict = "ADVISORY";
    headline = `Advisory: ${softEngaged.map((e) => e.rule.label).join(", ")}.`;
    reason = "Soft rule(s) engaged. Informational — proceed if the market and thesis independently justify it.";
  } else {
    verdict = "ALLOWED";
    headline = `${input.rules.length} rule${input.rules.length === 1 ? "" : "s"} evaluated — all clear.`;
    reason = "No configured rule is currently limiting participation.";
  }

  return {
    verdict,
    evaluations,
    engagedRules,
    headline,
    reason,
    ruleCount: input.rules.length,
    evaluatedAt: input.nowMs,
  };
}

/** Convenience constructor for the common founder rule set. */
export function defaultFounderRules(): readonly RuleConfiguration[] {
  return [
    { id: "max-trades", kind: "HARD", trigger: "MAX_TRADES_PER_SESSION", label: "Trade count limit", threshold: 3 },
    { id: "max-losses", kind: "HARD", trigger: "MAX_LOSSES_PER_SESSION", label: "Loss count limit", threshold: 2 },
    { id: "max-drawdown", kind: "HARD", trigger: "MAX_DAILY_DRAWDOWN", label: "Daily drawdown floor", threshold: -3 },
    { id: "min-rr", kind: "SOFT", trigger: "MIN_RR", label: "Minimum reward:risk", threshold: 1.5 },
    { id: "reentry", kind: "SOFT", trigger: "REENTRY_COOLDOWN", label: "Re-entry cooldown", windowMs: 5 * 60_000 },
    { id: "post-loss", kind: "SOFT", trigger: "COOLDOWN_AFTER_LOSS", label: "Post-loss cooldown", windowMs: 10 * 60_000 },
    { id: "data-quality", kind: "HARD", trigger: "DATA_QUALITY_FLOOR", label: "Trustworthy market data required" },
    { id: "clc-satisfied", kind: "SOFT", trigger: "CLC_MUST_BE_SATISFIED", label: "CLC setup evidence required" },
  ];
}
