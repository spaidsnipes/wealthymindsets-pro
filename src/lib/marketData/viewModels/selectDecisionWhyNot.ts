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
  /**
   * Concrete causes the verdict is not ACTION, ordered by severity.
   *
   * A **SAMPLE**, not a census. Evidence blockers are built one-per-label from
   * `debt.missingLabels` / `debt.warnLabels`, which `computeEvidenceDebt` caps
   * at EVIDENCE_LABEL_SAMPLE_LIMIT (3). NEVER use `.length` as the count of
   * blockers — use {@link blockerCount}.
   */
  readonly blockers: readonly WhyBlocker[];
  /**
   * The authoritative number of blockers. Never capped.
   *
   * ── The count that was a sample size (2026-09-16, found by USE) ───────────
   *
   * Measured live on the deck, both in the same column:
   *
   *     WHY · DECISION EVIDENCE       6 BLOCKERS
   *     03 EVIDENCE DEBT              0 of 9 paid
   *
   * Unlike the two-counts atoms before it, this is NOT two correct owners of
   * different sets. `blockers` was built by looping `missingLabels` and
   * `warnLabels` — both capped at 3 — so `blockers.length` maxes out at 6 plus
   * rules. The 6 was the CAP, wearing the clothes of a measurement. Nine unpaid
   * nodes and nine again would have read 6.
   *
   * The codebase already knew: `EvidenceDebt.missingLabels` is documented
   * "TRUNCATED — never use `.length` as a count of missing evidence", and
   * `hiddenRemainder()` exists because the identical defect was fixed in the
   * evidence strip on 2026-09-03. This is that defect's fourth head — the
   * arithmetic was restated by hand at a new site instead of derived once.
   *
   * So the count is derived from the authoritative totals (`debt.missing`,
   * `debt.warn`, engaged rule kinds, contradiction) and published as its own
   * field. Surfaces print THIS and disclose the remainder with
   * `hiddenRemainder()`; the list stays a sample, which is all a row of detail
   * ever needed to be.
   */
  readonly blockerCount: number;
  /** What IS satisfied — the affirmative side of the ledger. */
  readonly clearances: readonly string[];
  /**
   * canon §Phase 3 Market Canvas — WHAT WOULD INVALIDATE.
   *
   * For an ACTION verdict this lists the concrete observations that,
   * if they became true right now, would flip the verdict away from
   * ACTION. Ordered by which is fastest to detect (contradiction →
   * evidence debt → rule engagement).
   *
   * For non-ACTION verdicts this is empty — the blockers list is
   * itself the inverse ("to clear" answer), so publishing a separate
   * invalidators field would duplicate that signal.
   */
  readonly invalidators: readonly string[];
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
      blockerCount: 0,
      clearances: [],
      invalidators: [],
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
  } else if (oneStory.contradictionDetectability === "COMPARABLE") {
    // ONLY when a thesis actually exists. This used to be a bare `else` — a
    // DEFAULT BRANCH — which converted "no thesis was ever resolved" into an
    // affirmative clearance. `clearances` is documented as *the affirmative
    // side of the ledger*, so that sentence claimed WM had looked for an
    // objection and found none. It had not looked; there was nothing to look
    // at. Observed live on /command-deck rendering this sentence while the
    // same screen read "No chapter resolved … (0/8 dimensions resolved)".
    //
    // With NOTHING_TO_COMPARE we emit nothing: the surrounding panel already
    // discloses that no chapter resolved, so a second sentence would be noise,
    // not disclosure. Silence here is the honest output — the ledger simply
    // does not get to count a clearance it never earned.
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
    clearances.push(`${debt.resolved}/${debt.payable} evidence nodes paid.`);
  } else if (oneStory.missing) {
    blockers.push({ kind: "EVIDENCE_DEBT", label: oneStory.missing, detail: "Required evidence is unpaid." });
  }

  // Engaged SOFT trader rules — advisory blockers.
  for (const ev of engaged) {
    if (ev.rule.kind === "SOFT") {
      blockers.push({ kind: "SOFT_RULE", label: ev.rule.label, detail: ev.reason });
    }
  }

  // NOTHING ENGAGED is only a finding when something COULD have engaged.
  //
  // `permission.ruleCount` is the number of rules the trader has actually
  // configured (`selectPermission` returns 0 from its early return, with the
  // headline "No trading rules configured."). With zero rules the old
  // `engaged.length === 0 && permission` test was vacuously true and pushed an
  // affirmative clearance onto *the affirmative side of the ledger* — the same
  // H1 shape 1 as the thesis clearance above: the absence of a SUBJECT
  // reported as the absence of an OBJECTION.
  //
  // With rules configured the count is real, so it is printed WITH ITS
  // DENOMINATOR (`0/6 trader rules engaged.`), matching the house form used on
  // the Steward panel and by the evidence-debt clearance two branches up. A
  // count that states its denominator cannot overclaim.
  if (engaged.length === 0 && permission && permission.ruleCount > 0) {
    clearances.push(`0/${permission.ruleCount} trader rules engaged.`);
  }

  blockers.sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind]);

  // The authoritative count. Each term mirrors EXACTLY the branch above that
  // pushes its kind, except that the two evidence terms read the uncapped
  // totals instead of the capped label arrays. Derived here, once, so no
  // surface has to restate the arithmetic — that hand-restating is what let
  // this defect grow four heads. See `blockerCount` on DecisionWhyVM.
  const blockerCount =
    engaged.filter((ev) => ev.rule.kind === "HARD").length +
    (oneStory.contradiction ? 1 : 0) +
    (debt ? debt.missing + debt.warn : oneStory.missing ? 1 : 0) +
    engaged.filter((ev) => ev.rule.kind === "SOFT").length;

  // canon §Phase 3 Market Canvas — WHAT WOULD INVALIDATE.
  // Only meaningful for ACTION verdicts (the trader is about to place;
  // they need to know which observation would flip the verdict). For
  // non-ACTION verdicts the blockers list already answers "what would
  // clear it," so invalidators stays empty.
  const invalidators: string[] = [];
  if (verdict === "ACTION") {
    if (!oneStory.contradiction) {
      invalidators.push("A contradiction emerges against the thesis.");
    }
    if (oneStory.debt && oneStory.debt.payable > 0 && oneStory.debt.missingLabels.length === 0 && oneStory.debt.warnLabels.length === 0) {
      invalidators.push("A required evidence node degrades to unpaid or below-confirmation.");
    } else if (!oneStory.debt && !oneStory.missing) {
      // Debt not surfaced — invalidator is the same shape but generic.
      invalidators.push("A required evidence node degrades to unpaid.");
    }
    const hasEngagedHard = engaged.some((ev) => ev.rule.kind === "HARD");
    // Same gate. An invalidator is documented above as an observation that
    // "if it became true RIGHT NOW would flip the verdict". With no rules
    // configured, no HARD rule can engage right now — the sentence would name
    // a tripwire that does not exist. Silence is the honest output; the
    // Steward panel already discloses that no rules are configured.
    if (permission && permission.ruleCount > 0 && !hasEngagedHard) {
      invalidators.push("A HARD trader rule engages.");
    }
  }

  return {
    version: DECISION_WHY_VERSION,
    verdict,
    clear: verdict === "ACTION",
    headline: HEADLINE[verdict],
    blockers,
    blockerCount,
    clearances,
    invalidators,
  };
}
