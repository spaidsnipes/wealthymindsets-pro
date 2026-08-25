/**
 * selectDecisionWhyNot — Founder canon P6 "WHY / WHY NOT" for the DECISION.
 *
 * The existing WhyInspector answers "why is this OBJECT what it is" (evidence
 * for a hero/story/dimension). This selector answers the complementary
 * question the trader asks at the trigger: "WHY is right-of-way not open?" —
 * it reverses the compiled RightOfWay verdict to its concrete causes.
 *
 * Canon: "WHY is an evidence elevator, not an essay button." So this never
 * generates prose opinion — it forwards, verbatim and ordered by severity, the
 * blockers the canonical engine already reported:
 *
 *   engaged HARD rules  → contradiction  → unpaid evidence debt →
 *   warned evidence     → engaged SOFT rules
 *
 * For an ACTION verdict there are no blockers; it states what cleared instead.
 * For UNKNOWN / null it says so honestly. PURE — no I/O, no clock, no
 * derivation of market facts of its own.
 */

import type { OneStoryVM } from "./selectOneStory";
import type { RightOfWay } from "./decisionPermissionCompiler";
import type { PermissionVM } from "@/lib/traderMemory/viewModels/selectPermission";

export const DECISION_WHY_VERSION = "wm.decision-why.v1" as const;

export type WhyBlockerKind =
  | "HARD_RULE"
  | "CONTRADICTION"
  | "EVIDENCE_DEBT"
  | "EVIDENCE_WARN"
  | "SOFT_RULE";

export interface WhyBlocker {
  readonly kind: WhyBlockerKind;
  /** Short label (rule label / evidence node / "Active contradiction"). */
  readonly label: string;
  /** The verbatim canonical reason this blocker is engaged. */
  readonly detail: string;
}

export interface DecisionWhyVM {
  readonly version: typeof DECISION_WHY_VERSION;
  /** The compiled RightOfWay verdict this explanation reverses. */
  readonly verdict: RightOfWay;
  /** True only when the verdict is ACTION (path clear). */
  readonly clear: boolean;
  /** One honest line describing the verdict. */
  readonly headline: string;
  /** Concrete causes the verdict is not ACTION, ordered by severity. */
  readonly blockers: readonly WhyBlocker[];
  /** What IS satisfied — the affirmative side of the ledger. */
  readonly clearances: readonly string[];
}

const HEADLINE: Record<RightOfWay, string> = {
  ACTION: "Right-of-way is granted — the path is clear.",
  WAIT: "Right-of-way is withheld — the market has not earned entry.",
  "NO TRADE": "Right-of-way is blocked.",
  CAUTION: "Right-of-way is cautioned — proceed only with reduced conviction.",
  UNKNOWN: "Right-of-way is unknown — evidence is insufficient.",
};

/** Severity order for stable blocker sorting (lower = shown first). */
const KIND_RANK: Record<WhyBlockerKind, number> = {
  HARD_RULE: 0,
  CONTRADICTION: 1,
  EVIDENCE_DEBT: 2,
  EVIDENCE_WARN: 3,
  SOFT_RULE: 4,
};

/**
 * Compile the WHY / WHY NOT explanation for the current decision.
 *
 * `oneStory` supplies the verdict, contradiction and evidence debt (all already
 * canonical). `permission` (optional) supplies engaged trader-rule blockers.
 * Null `oneStory` is the truthful "nothing compiled yet" case.
 */
export function selectDecisionWhyNot(
  oneStory: OneStoryVM | null,
  permission?: PermissionVM | null,
): DecisionWhyVM {
  if (!oneStory) {
    return {
      version: DECISION_WHY_VERSION,
      verdict: "UNKNOWN",
      clear: false,
      headline: "No decision compiled yet — the engine has not resolved right-of-way.",
      blockers: [],
      clearances: [],
    };
  }

  const verdict = oneStory.decision.value;
  const blockers: WhyBlocker[] = [];
  const clearances: string[] = [];

  // Engaged HARD trader rules — the hardest blockers.
  const engaged = permission?.engagedRules ?? [];
  for (const ev of engaged) {
    if (ev.rule.kind === "HARD") {
      blockers.push({ kind: "HARD_RULE", label: ev.rule.label, detail: ev.reason });
    }
  }

  // Active contradiction to the thesis.
  if (oneStory.contradiction) {
    blockers.push({
      kind: "CONTRADICTION",
      label: "Active contradiction",
      detail: oneStory.contradiction,
    });
  } else {
    clearances.push("No active contradiction to the thesis.");
  }

  // Unpaid / warned evidence debt.
  const debt = oneStory.debt;
  if (debt) {
    for (const label of debt.missingLabels) {
      blockers.push({ kind: "EVIDENCE_DEBT", label, detail: "Required evidence is unpaid." });
    }
    for (const label of debt.warnLabels) {
      blockers.push({ kind: "EVIDENCE_WARN", label, detail: "Evidence present but below confirmation." });
    }
    clearances.push(`${debt.resolved}/${debt.total} evidence nodes paid.`);
  } else if (oneStory.missing) {
    blockers.push({ kind: "EVIDENCE_DEBT", label: oneStory.missing, detail: "Required evidence is unpaid." });
  }

  // Engaged SOFT trader rules — advisory blockers.
  for (const ev of engaged) {
    if (ev.rule.kind === "SOFT") {
      blockers.push({ kind: "SOFT_RULE", label: ev.rule.label, detail: ev.reason });
    }
  }

  if (engaged.length === 0 && permission) {
    clearances.push("No trader rules engaged.");
  }

  blockers.sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind]);

  return {
    version: DECISION_WHY_VERSION,
    verdict,
    clear: verdict === "ACTION",
    headline: HEADLINE[verdict],
    blockers,
    clearances,
  };
}
