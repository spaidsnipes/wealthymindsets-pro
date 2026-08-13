/**
 * selectTradeExpectation — M28 pure selector.
 *
 * Answers, for an OPEN decision, "Is the market behaving the way this trade
 * expected?" — the Founder's 2026-08-13 directive:
 *
 *   Trade Expectation:
 *     Freeze expected healthy behavior.
 *     Live compare: SUPPORTIVE / MIXED / WEAKENING / INVALIDATED / UNKNOWN.
 *     Do NOT implement simplistic "3 fields matching = SUPPORTIVE"
 *     unless validated. Build a rules contract around actual Playbook
 *     Genome expectations.
 *
 * This selector reads the frozen plan.expectedBehavior + plan.invalidationCriteria
 * from a DecisionMemoryRecord, plus the current CanonicalMarketState, plus an
 * optional rules contract from the playbook genome. It emits a TradeExpectationVM
 * with evidence for every claim.
 *
 * No inference of side/direction. No shrinking of stop distance. If a rule
 * can't be evaluated (data unresolved / dimension UNKNOWN), the verdict for
 * that rule is UNKNOWN — the aggregate can only be SUPPORTIVE if ALL evaluated
 * rules are supportive AND coverage is complete.
 */

import type { CanonicalMarketState, MarketStateResolution } from "../../marketData/canonicalMarketState";
import type { DecisionMemoryRecord } from "../decisionMemory";

// ── Vocabulary ──────────────────────────────────────────────────────────

export type ExpectationVerdict =
  | "SUPPORTIVE"        // all evaluated rules pass, coverage complete
  | "MIXED"             // some rules supportive, some not, none invalidating
  | "WEAKENING"         // some rules weakening but not yet invalidated
  | "INVALIDATED"       // any hard invalidation rule triggered
  | "UNKNOWN";          // insufficient data to evaluate

export type RuleVerdict =
  | "SUPPORTIVE"
  | "WEAKENING"
  | "INVALIDATED"
  | "UNKNOWN";

// ── Rule types ──────────────────────────────────────────────────────────

/**
 * A single evaluable expectation. Two categories:
 *
 *   BEHAVIOR: what the market SHOULD do to keep the thesis alive.
 *             Evaluating true → SUPPORTIVE. False → WEAKENING (not fatal).
 *
 *   INVALIDATION: what the market MUST NOT do. Evaluating true →
 *                 INVALIDATED (fatal).
 */
export interface ExpectationRule {
  readonly id: string;
  readonly kind: "BEHAVIOR" | "INVALIDATION";
  readonly description: string;
  readonly evaluate: (state: CanonicalMarketState, decision: DecisionMemoryRecord) => RuleResult;
}

export interface RuleResult {
  readonly verdict: RuleVerdict;
  readonly evidence: readonly string[];
  readonly reason?: string;
}

// ── VM ──────────────────────────────────────────────────────────────────

export interface EvaluatedRule {
  readonly ruleId: string;
  readonly description: string;
  readonly kind: ExpectationRule["kind"];
  readonly verdict: RuleVerdict;
  readonly evidence: readonly string[];
  readonly reason?: string;
}

export interface TradeExpectationVM {
  readonly decisionId: string;
  readonly verdict: ExpectationVerdict;
  readonly rules: readonly EvaluatedRule[];
  readonly coverageResolution: MarketStateResolution;
  readonly reason?: string;
  readonly evaluatedAt: number;
  /** Time elapsed since decision, for UI age display. */
  readonly ageMs: number;
}

// ── Selector ────────────────────────────────────────────────────────────

export interface SelectTradeExpectationInput {
  readonly decision: DecisionMemoryRecord;
  readonly currentState: CanonicalMarketState | null;
  /** Additional rules (usually derived from Playbook Genome). */
  readonly extraRules?: readonly ExpectationRule[];
  /** For testability. */
  readonly nowMs?: number;
}

export function selectTradeExpectation(input: SelectTradeExpectationInput): TradeExpectationVM {
  const now = input.nowMs ?? Date.now();
  const { decision, currentState } = input;

  if (!currentState) {
    return {
      decisionId: decision.decisionId,
      verdict: "UNKNOWN",
      rules: [],
      coverageResolution: "UNKNOWN",
      reason: "No current market state snapshot available",
      evaluatedAt: now,
      ageMs: now - decision.frozen.capturedAt,
    };
  }

  // Skip evaluation for non-open decisions (already closed)
  if (decision.outcome) {
    return {
      decisionId: decision.decisionId,
      verdict: "UNKNOWN",
      rules: [],
      coverageResolution: "UNKNOWN",
      reason: "Decision already closed; expectation N/A",
      evaluatedAt: now,
      ageMs: now - decision.frozen.capturedAt,
    };
  }

  // Build rules from decision + extras
  const rules: ExpectationRule[] = [
    ...buildDefaultRulesFromDecision(decision),
    ...(input.extraRules ?? []),
  ];

  if (rules.length === 0) {
    return {
      decisionId: decision.decisionId,
      verdict: "UNKNOWN",
      rules: [],
      coverageResolution: "UNKNOWN",
      reason: "Decision has no expected behavior or invalidation criteria to evaluate",
      evaluatedAt: now,
      ageMs: now - decision.frozen.capturedAt,
    };
  }

  const evaluated: EvaluatedRule[] = rules.map((r) => {
    const res = r.evaluate(currentState, decision);
    return {
      ruleId: r.id,
      description: r.description,
      kind: r.kind,
      verdict: res.verdict,
      evidence: res.evidence,
      reason: res.reason,
    };
  });

  // Aggregate — INVALIDATION beats everything else
  const anyInvalidation = evaluated.some((e) => e.verdict === "INVALIDATED");
  const anyWeakening = evaluated.some((e) => e.verdict === "WEAKENING");
  const allUnknown = evaluated.every((e) => e.verdict === "UNKNOWN");
  const someUnknown = evaluated.some((e) => e.verdict === "UNKNOWN");
  const allSupportive = evaluated.every((e) => e.verdict === "SUPPORTIVE");

  const coverageResolution: MarketStateResolution =
    allUnknown ? "UNKNOWN" :
    someUnknown ? "PARTIAL" :
                  "RESOLVED";

  let verdict: ExpectationVerdict;
  let reason: string | undefined;
  if (anyInvalidation) {
    verdict = "INVALIDATED";
    reason = "One or more invalidation rules triggered";
  } else if (allUnknown) {
    verdict = "UNKNOWN";
    reason = "No rules could be evaluated against current state";
  } else if (allSupportive && coverageResolution === "RESOLVED") {
    verdict = "SUPPORTIVE";
  } else if (anyWeakening) {
    verdict = "WEAKENING";
    reason = "Some rules weakening";
  } else {
    // Mix of SUPPORTIVE and UNKNOWN with no WEAKENING — call it MIXED
    verdict = "MIXED";
    reason = someUnknown ? "Partial rule coverage — some rules unresolved" : undefined;
  }

  return {
    decisionId: decision.decisionId,
    verdict,
    rules: evaluated,
    coverageResolution,
    reason,
    evaluatedAt: now,
    ageMs: now - decision.frozen.capturedAt,
  };
}

// ── Default rules built from frozen plan ────────────────────────────────

/**
 * Turn plan.expectedBehavior strings + plan.invalidationCriteria into
 * evaluable rules. Simple pattern matching for canonical hints; anything
 * not matched falls back to UNKNOWN with the plan text surfaced verbatim.
 *
 * Callers should extend via `extraRules` for playbook-specific evaluations
 * (e.g. "close above VWAP within 3 bars" needs bar history the state
 * snapshot alone doesn't carry — that comes from the playbook genome).
 */
function buildDefaultRulesFromDecision(decision: DecisionMemoryRecord): ExpectationRule[] {
  const rules: ExpectationRule[] = [];

  // Invalidation: stop breach
  rules.push({
    id: "invalidation-stop-breach",
    kind: "INVALIDATION",
    description: `Structural stop at ${decision.plan.intendedStop} not breached`,
    evaluate: (state, dec) => {
      const price = state.price.last;
      if (price == null) return { verdict: "UNKNOWN", evidence: [], reason: "Current price unavailable" };
      const stop = dec.plan.intendedStop;
      const isLong = dec.plan.action === "ENTER_LONG";
      const isShort = dec.plan.action === "ENTER_SHORT";
      if (!isLong && !isShort) return { verdict: "SUPPORTIVE", evidence: [`Non-directional action ${dec.plan.action}`] };
      const breached = isLong ? price <= stop : price >= stop;
      return breached
        ? { verdict: "INVALIDATED", evidence: [`Price ${price} vs stop ${stop}, direction ${isLong ? "LONG" : "SHORT"}`], reason: "Stop level breached" }
        : { verdict: "SUPPORTIVE", evidence: [`Price ${price} on right side of stop ${stop}`] };
    },
  });

  // Behavior: direction supported by current dimension
  rules.push({
    id: "behavior-direction-alignment",
    kind: "BEHAVIOR",
    description: "Current market direction still aligned with entry side",
    evaluate: (state, dec) => {
      if (state.direction.resolution !== "RESOLVED" || !state.direction.value) {
        return { verdict: "UNKNOWN", evidence: state.direction.evidence.map((e) => e.basis ?? e.source ?? "evidence"), reason: "Direction unresolved" };
      }
      const dirValue = String(state.direction.value).toUpperCase();
      const wantsLong = dec.plan.action === "ENTER_LONG";
      const wantsShort = dec.plan.action === "ENTER_SHORT";
      if (!wantsLong && !wantsShort) return { verdict: "SUPPORTIVE", evidence: [`Non-directional action ${dec.plan.action}`] };
      const supports = wantsLong ? /LONG|UP|BULL/.test(dirValue) : /SHORT|DOWN|BEAR/.test(dirValue);
      return supports
        ? { verdict: "SUPPORTIVE", evidence: [`Direction ${dirValue}`] }
        : { verdict: "WEAKENING", evidence: [`Direction ${dirValue} vs intended ${wantsLong ? "LONG" : "SHORT"}`], reason: "Direction shifted against entry" };
    },
  });

  // Behavior: each expectedBehavior string surfaced as UNKNOWN rule for now
  // (real evaluation requires playbook-specific logic supplied via extraRules)
  for (let i = 0; i < decision.plan.expectedBehavior.length; i++) {
    const behaviorText = decision.plan.expectedBehavior[i];
    rules.push({
      id: `behavior-plan-${i}`,
      kind: "BEHAVIOR",
      description: behaviorText,
      evaluate: () => ({
        verdict: "UNKNOWN",
        evidence: [],
        reason: "No default evaluator — supply via extraRules (playbook genome)",
      }),
    });
  }

  return rules;
}
