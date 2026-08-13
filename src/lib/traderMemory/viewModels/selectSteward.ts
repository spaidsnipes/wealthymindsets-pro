/**
 * selectSteward — M30 pure selector.
 *
 * Answers the Founder's Steward question: "AM I OPERATING INSIDE MY PLAN?"
 *
 * Per 2026-08-13 directive:
 *   Steward:
 *     Use: risk budget, trade count, rule adherence, preparation,
 *     behavioral drift, management discipline.
 *
 *     Steward does NOT become 'WM grants permission to trade.'
 *     Human sovereignty remains.
 *
 * This selector emits a diagnostic — never a permission. The UI renders
 * evidence + verdict per rule; the trader decides.
 *
 * Companion to selectTradeExpectation (M28): TradeExpectation asks "is
 * the trade thesis still alive?", Steward asks "is the trader still
 * inside their plan?". They're orthogonal — a trade can be SUPPORTIVE
 * while the trader is out-of-plan (took 6 trades on a 3-trade day), and
 * a trade can be INVALIDATED while the trader is in-plan (thesis broke
 * but they're honoring the invalidation).
 */

import type { CanonicalMarketState } from "../../marketData/canonicalMarketState";
import type { DecisionMemoryRecord } from "../decisionMemory";

// ── Vocabulary ──────────────────────────────────────────────────────────

export type StewardVerdict =
  | "IN_PLAN"          // all evaluated dimensions supportive, coverage complete
  | "MINOR_DRIFT"      // one or two dimensions weakening; not breaching plan
  | "OUT_OF_PLAN"      // rule violation OR budget breach observed
  | "UNKNOWN";         // insufficient data to evaluate

export type StewardRuleVerdict =
  | "IN_PLAN"
  | "DRIFT"
  | "BREACHED"
  | "UNKNOWN";

// ── Trader plan snapshot the selector evaluates against ────────────────

export interface TraderDailyPlan {
  readonly ownerId: string;
  readonly sessionIdentity: string;
  readonly capturedAt: number;
  /** Max trades allowed today. Null = no limit (unwise, but honored). */
  readonly maxTradesToday: number | null;
  /** Max R exposure at any moment. Null = no limit. */
  readonly maxOpenR: number | null;
  /** Max R spent today (realized losses + open risk). Null = no limit. */
  readonly maxDailyR: number | null;
  /** Approved playbook ids for today. Empty = any playbook allowed. */
  readonly approvedPlaybooks: readonly string[];
  /** Required preparation checklist ids that must be completed today. */
  readonly requiredPreparation: readonly string[];
  /** Preparation items actually completed. */
  readonly completedPreparation: readonly string[];
  /** Was the trader flagged as rushing (self-declared or system-observed)? */
  readonly rushingFlagged: boolean;
}

export interface StewardSelectorInput {
  readonly plan: TraderDailyPlan;
  readonly decisionsToday: readonly DecisionMemoryRecord[];
  readonly openDecisions: readonly DecisionMemoryRecord[];
  readonly currentState?: CanonicalMarketState | null;
  readonly nowMs?: number;
}

export interface EvaluatedStewardRule {
  readonly id: string;
  readonly description: string;
  readonly verdict: StewardRuleVerdict;
  readonly evidence: readonly string[];
  readonly reason?: string;
}

export interface StewardVM {
  readonly ownerId: string;
  readonly verdict: StewardVerdict;
  readonly rules: readonly EvaluatedStewardRule[];
  readonly evaluatedAt: number;
  readonly reason?: string;
  /** Advisory only — never used as a gate. */
  readonly advisory?: string;
}

// ── Selector ────────────────────────────────────────────────────────────

export function selectSteward(input: StewardSelectorInput): StewardVM {
  const now = input.nowMs ?? Date.now();
  const { plan, decisionsToday, openDecisions } = input;

  const rules: EvaluatedStewardRule[] = [];

  // Trade-count rule
  if (plan.maxTradesToday != null) {
    const count = decisionsToday.length;
    const overBy = count - plan.maxTradesToday;
    if (overBy > 0) {
      rules.push({
        id: "trade-count-budget",
        description: `Max ${plan.maxTradesToday} trades today`,
        verdict: "BREACHED",
        evidence: [`${count} decisions today vs limit ${plan.maxTradesToday}`],
        reason: `Over by ${overBy}`,
      });
    } else if (count === plan.maxTradesToday) {
      rules.push({
        id: "trade-count-budget",
        description: `Max ${plan.maxTradesToday} trades today`,
        verdict: "DRIFT",
        evidence: [`${count} decisions today, at limit`],
        reason: "At trade-count limit — additional decisions would breach plan",
      });
    } else {
      rules.push({
        id: "trade-count-budget",
        description: `Max ${plan.maxTradesToday} trades today`,
        verdict: "IN_PLAN",
        evidence: [`${count}/${plan.maxTradesToday} today`],
      });
    }
  } else {
    rules.push({
      id: "trade-count-budget",
      description: "Trade-count budget",
      verdict: "UNKNOWN",
      evidence: [],
      reason: "No max-trades-today configured in daily plan",
    });
  }

  // Open R exposure
  if (plan.maxOpenR != null) {
    const openR = openDecisions.reduce((sum, d) => sum + Math.abs(d.plan.intendedSize * (d.plan.intendedStop === 0 ? 0 : 1)), 0);
    // NOTE: proper openR requires per-decision position size × distance-to-stop /
    // account-risk-per-R conversion — this is a first-cut placeholder that sums
    // intendedSize as a proxy for open risk. The store-layer wire-up should
    // provide a real openR computation. Selector stays UNKNOWN if the real
    // computation isn't supplied yet.
    if (openDecisions.length === 0) {
      rules.push({
        id: "open-r-exposure",
        description: `Max open R exposure ${plan.maxOpenR}`,
        verdict: "IN_PLAN",
        evidence: ["No open decisions"],
      });
    } else {
      rules.push({
        id: "open-r-exposure",
        description: `Max open R exposure ${plan.maxOpenR}`,
        verdict: "UNKNOWN",
        evidence: [`${openDecisions.length} open decisions`],
        reason: "Per-decision open-R computation not yet supplied — see selector NOTE",
      });
    }
  }

  // Daily R spent
  if (plan.maxDailyR != null) {
    const spent = decisionsToday.reduce((s, d) => s + (d.outcome?.realizedR ?? 0), 0);
    const spentAbs = Math.abs(Math.min(0, spent)); // only losses count against budget
    if (spentAbs > plan.maxDailyR) {
      rules.push({
        id: "daily-r-budget",
        description: `Max daily R loss ${plan.maxDailyR}`,
        verdict: "BREACHED",
        evidence: [`Spent ${spentAbs.toFixed(2)}R vs limit ${plan.maxDailyR}R`],
        reason: `Daily R budget breached by ${(spentAbs - plan.maxDailyR).toFixed(2)}R`,
      });
    } else if (spentAbs > plan.maxDailyR * 0.75) {
      rules.push({
        id: "daily-r-budget",
        description: `Max daily R loss ${plan.maxDailyR}`,
        verdict: "DRIFT",
        evidence: [`Spent ${spentAbs.toFixed(2)}R vs limit ${plan.maxDailyR}R`],
        reason: "Above 75% of daily budget — one more meaningful loss breaches plan",
      });
    } else {
      rules.push({
        id: "daily-r-budget",
        description: `Max daily R loss ${plan.maxDailyR}`,
        verdict: "IN_PLAN",
        evidence: [`Spent ${spentAbs.toFixed(2)}R / ${plan.maxDailyR}R`],
      });
    }
  }

  // Playbook whitelist
  if (plan.approvedPlaybooks.length > 0) {
    const offenders = decisionsToday
      .map((d) => d.frozen.playbook.playbookId)
      .filter((pb) => !plan.approvedPlaybooks.includes(pb));
    if (offenders.length > 0) {
      rules.push({
        id: "playbook-whitelist",
        description: `Approved playbooks: ${plan.approvedPlaybooks.join(", ")}`,
        verdict: "BREACHED",
        evidence: [`Off-plan playbooks used: ${Array.from(new Set(offenders)).join(", ")}`],
        reason: "Traded a playbook not on today's approved list",
      });
    } else {
      rules.push({
        id: "playbook-whitelist",
        description: `Approved playbooks: ${plan.approvedPlaybooks.join(", ")}`,
        verdict: "IN_PLAN",
        evidence: [`${decisionsToday.length} decision(s) all within approved list`],
      });
    }
  }

  // Preparation
  if (plan.requiredPreparation.length > 0) {
    const missing = plan.requiredPreparation.filter((r) => !plan.completedPreparation.includes(r));
    if (missing.length === 0) {
      rules.push({
        id: "preparation-checklist",
        description: `${plan.requiredPreparation.length} required prep items`,
        verdict: "IN_PLAN",
        evidence: ["All preparation completed"],
      });
    } else if (decisionsToday.length > 0) {
      // Trader entered without completing prep — breach
      rules.push({
        id: "preparation-checklist",
        description: `${plan.requiredPreparation.length} required prep items`,
        verdict: "BREACHED",
        evidence: [`Missing: ${missing.join(", ")}`, `${decisionsToday.length} decision(s) already taken`],
        reason: "Entered market with incomplete preparation",
      });
    } else {
      rules.push({
        id: "preparation-checklist",
        description: `${plan.requiredPreparation.length} required prep items`,
        verdict: "DRIFT",
        evidence: [`Missing: ${missing.join(", ")}`],
        reason: "Preparation incomplete — no decisions yet",
      });
    }
  }

  // Rushing behavior
  if (plan.rushingFlagged) {
    rules.push({
      id: "behavioral-rushing",
      description: "Rushing preparation / entries",
      verdict: "DRIFT",
      evidence: ["Rushing flagged (self-declared or system-observed)"],
      reason: "Rushing correlates with process failure — slow down",
    });
  }

  // Aggregate
  const anyBreached = rules.some((r) => r.verdict === "BREACHED");
  const anyDrift = rules.some((r) => r.verdict === "DRIFT");
  const allUnknown = rules.length > 0 && rules.every((r) => r.verdict === "UNKNOWN");
  const allInPlan = rules.length > 0 && rules.every((r) => r.verdict === "IN_PLAN");

  let verdict: StewardVerdict;
  let reason: string | undefined;
  let advisory: string | undefined;

  if (rules.length === 0 || allUnknown) {
    verdict = "UNKNOWN";
    reason = "No plan constraints to evaluate";
  } else if (anyBreached) {
    verdict = "OUT_OF_PLAN";
    reason = "One or more plan rules breached — see evidence per rule";
    advisory = "Steward observed a plan breach. The trader remains sovereign to decide next action.";
  } else if (anyDrift) {
    verdict = "MINOR_DRIFT";
    reason = "One or more rules drifting — consider re-anchoring";
    advisory = "Steward observed drift. Not a stop-sign — a check-in.";
  } else if (allInPlan) {
    verdict = "IN_PLAN";
  } else {
    verdict = "MINOR_DRIFT";
    reason = "Mixed rule states";
  }

  return {
    ownerId: plan.ownerId,
    verdict,
    rules,
    evaluatedAt: now,
    reason,
    advisory,
  };
}
