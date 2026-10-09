/**
 * PERSONAL EDGE × FVG — THE STUDY LIST, COMPLETE. Garden 19 §23. PURE.
 *
 * Every journal decision that references an FVG (its as-of-decision snapshot,
 * fvgDecisionReference) is counted in one group of EACH of three dimensions:
 *
 *   WHEN    anticipatory (before any touch) · first touch · later touch ·
 *           between touches
 *   DEPTH   untouched / touched · partial mitigation · deep or full mitigation
 *   AGE     fresh gap · old gap (gap age at decision > OLD_GAP_AGE_BARS bars
 *           of its own timeframe — "old-gap chasing")
 *
 * Every group is listed even when empty, so a missing context reads as n = 0
 * rather than disappearing. Each row carries two separate counts: plan
 * adherence (decided plan-vs-actual comparisons) and the trader's recorded R.
 * Either is MEASURED only at ≥ 20, else INSUFFICIENT EVIDENCE. Descriptive.
 */

import { confirmationFact, contextFor, type ConfirmationFact, type JournalFvgContext } from "./fvgDecisionContext";
import type { JournalFvgReference } from "./fvgDecisionReference";
import { PATTERN_SAMPLE_MIN } from "./founderAnalytics";
import { planAdherenceByGroup, type SetupAdherence } from "./planAdherence";
import type { PlanVsActualResult } from "./planVsActual";

/** A gap older than this many bars of its own timeframe at decision time is "old". */
export const OLD_GAP_AGE_BARS = 50;

export type FvgStudyDimension = "WHEN" | "DEPTH" | "AGE" | "WAITED";
export const FVG_STUDY_DIMENSIONS: readonly FvgStudyDimension[] = ["WHEN", "DEPTH", "AGE", "WAITED"];

export const FVG_STUDY_GROUPS: Readonly<Record<FvgStudyDimension, readonly string[]>> = {
  WHEN: ["Anticipatory (before any touch)", "First touch", "Later touch", "Between touches"],
  DEPTH: ["Untouched or touched", "Partial mitigation", "Deep or full mitigation"],
  AGE: ["Fresh gap", `Old gap (> ${OLD_GAP_AGE_BARS} bars)`],
  // §23 "confirmed entries" / §41 "did they wait?" — from the confirmation FACT (fvgDecisionContext.confirmationFact).
  WAITED: ["Waited for a confirming close", "Entered before a confirming close", "Entered before any touch", "Confirmation not recorded"],
};

/** The WAITED group of a decision, from the confirmation fact. */
export function waitedGroupOf(fact: ConfirmationFact): string {
  const g = FVG_STUDY_GROUPS.WAITED;
  return fact === "CONFIRMED_BEFORE" ? g[0] : fact === "NOT_YET_CONFIRMED" ? g[1] : fact === "NO_TOUCH_YET" ? g[2] : g[3];
}

export function fvgStudyGroupsOf(ref: JournalFvgReference): Readonly<Record<Exclude<FvgStudyDimension, "WAITED">, string>> {
  const s = ref.snapshot;
  const when = s.interaction === "BEFORE_ANY_TOUCH" ? 0 : s.interaction === "DURING_FIRST_INTERACTION" ? 1 : s.interaction === "DURING_LATER_INTERACTION" ? 2 : 3;
  const depth = s.mitigation === "PARTIAL" ? 1 : s.mitigation === "DEEP" || s.mitigation === "FULL" ? 2 : 0;
  return {
    WHEN: FVG_STUDY_GROUPS.WHEN[when],
    DEPTH: FVG_STUDY_GROUPS.DEPTH[depth],
    AGE: FVG_STUDY_GROUPS.AGE[s.ageBars > OLD_GAP_AGE_BARS ? 1 : 0],
  };
}

export interface FvgStudyRow {
  readonly dimension: FvgStudyDimension;
  readonly group: string;
  readonly trades: number;
  /** Plan adherence over decided comparisons (null when no trade here had a frozen plan). */
  readonly adherence: SetupAdherence | null;
  readonly withR: number;
  readonly meanR: number | null;
  readonly rState: "MEASURED" | "INSUFFICIENT EVIDENCE";
  readonly line: string;
}

export interface FvgStudyInput {
  readonly ref: JournalFvgReference;
  /** Plan-vs-actual for the entry's Decision_ID, when a plan was frozen. */
  readonly result: PlanVsActualResult | null;
  readonly realizedR: number | null;
  /** The §40 context stored with the entry (for the confirmation fact); absent → "Confirmation not recorded". */
  readonly context?: JournalFvgContext | null;
  /** The entry's own side; absent → "Confirmation not recorded" (never guessed from the gap's direction). */
  readonly side?: "LONG" | "SHORT" | null;
}

/**
 * The confirmation fact for a study row. The stored context's engine answer decides it; when no answer is
 * stored, the REFERENCE's own record "before any touch" still is a fact (nothing had been touched) —
 * everything else stays not recorded.
 */
export function waitedFactOf(r: FvgStudyInput): ConfirmationFact {
  const fact = confirmationFact(contextFor(r.ref, r.context), r.ref.snapshot.direction, r.side);
  return fact === "SILENT" && r.ref.snapshot.interaction === "BEFORE_ANY_TOUCH" ? "NO_TOUCH_YET" : fact;
}

export function fvgStudyList(rows: readonly FvgStudyInput[]): FvgStudyRow[] {
  const out: FvgStudyRow[] = [];
  for (const dim of FVG_STUDY_DIMENSIONS) {
    const tagged = rows.map(r => ({ ...r, group: dim === "WAITED" ? waitedGroupOf(waitedFactOf(r)) : fvgStudyGroupsOf(r.ref)[dim] }));
    const adherence = planAdherenceByGroup(tagged.filter(r => r.result).map(r => ({ group: r.group, result: r.result as PlanVsActualResult })));
    for (const group of FVG_STUDY_GROUPS[dim]) {
      const here = tagged.filter(r => r.group === group);
      const rs = here.map(r => r.realizedR).filter((x): x is number => typeof x === "number" && Number.isFinite(x));
      const meanR = rs.length ? Math.round((rs.reduce((s, x) => s + x, 0) / rs.length) * 100) / 100 : null;
      const rState = rs.length >= PATTERN_SAMPLE_MIN ? "MEASURED" as const : "INSUFFICIENT EVIDENCE" as const;
      const adh = adherence.find(a => a.setup === group) ?? null;
      out.push({
        dimension: dim, group, trades: here.length, adherence: adh, withR: rs.length, meanR, rState,
        line: `${here.length} decision${here.length === 1 ? "" : "s"}. Result: ${rState === "MEASURED" ? `mean ${meanR}R over ${rs.length}` : `INSUFFICIENT EVIDENCE — ${rs.length} of ${PATTERN_SAMPLE_MIN} with a recorded R`}. Plan: ${adh ? adh.line : "no frozen plan among them"}`,
      });
    }
  }
  return out;
}
