/**
 * selectOpeningBell — M31 pure selector.
 *
 * Answers: "AM I PREPARED?"
 *
 * Founder doctrine (2026-08-13):
 *   Support: routine, body/mind readiness, market preparation,
 *   top-down analysis, catalysts, risk plan, playbook, data health.
 *   Optional faith/reflection practices can be user-defined.
 *   Never universalize one spiritual practice across every user.
 *
 * Emits a readiness diagnostic with per-item evidence. Never blocks —
 * a trader may proceed while UNPREPARED; the selector only tells the
 * truth about what is and isn't done.
 */

import type { MarketQualityState } from "../../marketData/canonicalMarketState";

export type ReadinessVerdict = "READY" | "MOSTLY_READY" | "NOT_READY" | "UNKNOWN";
export type ItemVerdict = "DONE" | "PARTIAL" | "NOT_DONE" | "SKIPPED" | "UNKNOWN";

export type PreparationCategory =
  | "personal"        // user-defined: faith, reflection, body, mind — never imposed
  | "market"          // top-down analysis, catalysts, session plan
  | "risk"            // risk budget, trade-count plan, position sizing
  | "playbook"        // which setups are live today
  | "data";           // data-health check before trusting the screen

export interface PreparationItem {
  readonly id: string;
  readonly label: string;
  readonly category: PreparationCategory;
  /** User-defined items (personal category) are optional by default. */
  readonly required: boolean;
  readonly completed: boolean;
  readonly completedAt?: number;
  /** Free-text note captured during prep. */
  readonly note?: string;
  /** User explicitly chose to skip — distinct from "not done". */
  readonly skipped?: boolean;
}

export interface OpeningBellInput {
  readonly ownerId: string;
  readonly sessionIdentity: string;
  readonly items: readonly PreparationItem[];
  /** Minutes until the session the trader is preparing for opens. */
  readonly minutesUntilOpen: number | null;
  /** Current market data health — feeds the "data" category truthfully. */
  readonly dataQuality?: MarketQualityState;
  /** REQUIRED (per Founder Cycle 12 §G determinism doctrine):
   *  Evidence-producing selectors must not silently read the wall clock.
   *  Callers pass captured/canonical time so Replay reproduces the same
   *  readiness verdicts across sessions. */
  readonly nowMs: number;
}

export interface EvaluatedPreparationItem {
  readonly id: string;
  readonly label: string;
  readonly category: PreparationCategory;
  readonly required: boolean;
  readonly verdict: ItemVerdict;
  readonly evidence: readonly string[];
}

export interface OpeningBellVM {
  readonly ownerId: string;
  readonly verdict: ReadinessVerdict;
  readonly items: readonly EvaluatedPreparationItem[];
  readonly byCategory: Readonly<Record<PreparationCategory, { done: number; total: number; requiredOutstanding: number }>>;
  readonly requiredOutstanding: readonly string[];
  readonly minutesUntilOpen: number | null;
  readonly reason?: string;
  /** Advisory framing — never a gate. */
  readonly advisory?: string;
  readonly evaluatedAt: number;
}

const EMPTY_CATEGORY_TALLY = (): Record<PreparationCategory, { done: number; total: number; requiredOutstanding: number }> => ({
  personal: { done: 0, total: 0, requiredOutstanding: 0 },
  market:   { done: 0, total: 0, requiredOutstanding: 0 },
  risk:     { done: 0, total: 0, requiredOutstanding: 0 },
  playbook: { done: 0, total: 0, requiredOutstanding: 0 },
  data:     { done: 0, total: 0, requiredOutstanding: 0 },
});

export function selectOpeningBell(input: OpeningBellInput): OpeningBellVM {
  // Deterministic: callers must supply nowMs (see OpeningBellInput contract).
  const now = input.nowMs;

  if (input.items.length === 0) {
    return {
      ownerId: input.ownerId,
      verdict: "UNKNOWN",
      items: [],
      byCategory: EMPTY_CATEGORY_TALLY(),
      requiredOutstanding: [],
      minutesUntilOpen: input.minutesUntilOpen,
      reason: "No preparation checklist configured",
      evaluatedAt: now,
    };
  }

  const evaluated: EvaluatedPreparationItem[] = input.items.map((item) => {
    let verdict: ItemVerdict;
    const evidence: string[] = [];

    if (item.skipped) {
      verdict = "SKIPPED";
      evidence.push("Explicitly skipped by trader");
    } else if (item.completed) {
      verdict = "DONE";
      if (item.completedAt) evidence.push(`Completed ${new Date(item.completedAt).toISOString()}`);
      if (item.note) evidence.push(item.note);
    } else {
      verdict = "NOT_DONE";
    }

    // Data category verdict is derived from actual data health, not a checkbox
    if (item.category === "data" && input.dataQuality != null) {
      if (input.dataQuality === "LIVE") {
        verdict = "DONE";
        evidence.push("Market data quality: LIVE");
      } else if (input.dataQuality === "UNAVAILABLE") {
        verdict = "NOT_DONE";
        evidence.push("Market data UNAVAILABLE — screen cannot be trusted");
      } else {
        verdict = "PARTIAL";
        evidence.push(`Market data quality: ${input.dataQuality}`);
      }
    }

    return {
      id: item.id,
      label: item.label,
      category: item.category,
      required: item.required,
      verdict,
      evidence,
    };
  });

  // Tally
  const byCategory = EMPTY_CATEGORY_TALLY();
  const requiredOutstanding: string[] = [];
  for (const e of evaluated) {
    const tally = byCategory[e.category];
    tally.total += 1;
    if (e.verdict === "DONE") tally.done += 1;
    if (e.required && e.verdict !== "DONE" && e.verdict !== "SKIPPED") {
      tally.requiredOutstanding += 1;
      requiredOutstanding.push(e.label);
    }
  }

  // Aggregate
  const requiredItems = evaluated.filter((e) => e.required);
  const requiredDone = requiredItems.filter((e) => e.verdict === "DONE" || e.verdict === "SKIPPED").length;

  let verdict: ReadinessVerdict;
  let reason: string | undefined;
  let advisory: string | undefined;

  if (requiredItems.length === 0) {
    verdict = "UNKNOWN";
    reason = "No required preparation items — readiness cannot be assessed";
  } else if (requiredDone === requiredItems.length) {
    verdict = "READY";
    advisory = "Preparation complete. The decision to trade remains yours.";
  } else if (requiredDone >= requiredItems.length * 0.7) {
    verdict = "MOSTLY_READY";
    reason = `${requiredItems.length - requiredDone} required item(s) outstanding`;
    advisory = "Most preparation complete. Consider finishing the remaining items before the open.";
  } else {
    verdict = "NOT_READY";
    reason = `${requiredItems.length - requiredDone} of ${requiredItems.length} required item(s) outstanding`;
    advisory = "Preparation incomplete. Rushing preparation correlates with process failure.";
  }

  return {
    ownerId: input.ownerId,
    verdict,
    items: evaluated,
    byCategory,
    requiredOutstanding,
    minutesUntilOpen: input.minutesUntilOpen,
    reason,
    advisory,
    evaluatedAt: now,
  };
}

/**
 * Default checklist template. `personal` items are OPTIONAL and
 * user-editable — WM never imposes a spiritual or physical practice.
 * Callers may replace this entirely.
 */
export const DEFAULT_PREPARATION_TEMPLATE: readonly Omit<PreparationItem, "completed">[] = [
  { id: "personal-reflection", label: "Personal reflection / centering (user-defined)", category: "personal", required: false },
  { id: "body-ready",          label: "Body ready — rest, hydration, movement",         category: "personal", required: false },
  { id: "htf-context",         label: "Higher-timeframe context reviewed",              category: "market",   required: true  },
  { id: "destination",         label: "Destination regions identified",                 category: "market",   required: true  },
  { id: "catalysts",           label: "Scheduled catalysts checked",                    category: "market",   required: true  },
  { id: "risk-budget",         label: "Risk budget + trade-count plan set",             category: "risk",     required: true  },
  { id: "playbooks-live",      label: "Today's approved playbooks selected",            category: "playbook", required: true  },
  { id: "data-health",         label: "Market data health verified",                    category: "data",     required: true  },
];
