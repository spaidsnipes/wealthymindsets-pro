/**
 * PLAN ADHERENCE BY SETUP — Garden 19 §28/§29 in Personal Edge. PURE.
 *
 * For every trade whose Decision_ID has a frozen plan, the plan-vs-actual
 * result is grouped by the setup the trader named in the journal. A trade
 * counts toward a setup's sample only when the comparison could be DECIDED
 * (plan levels, fill times and the price path); the rest are listed apart as
 * insufficient evidence, never guessed. A rate is MEASURED only at
 * PATTERN_SAMPLE_MIN (20) decided trades — below that it says INSUFFICIENT
 * EVIDENCE with the count. Adherence is a fact about the plan, not a grade of
 * the trader; no emotion is inferred.
 */

import { PATTERN_SAMPLE_MIN } from "./founderAnalytics";
import { lessonForFinding, type LoopLink } from "./planLoop";
import { DEVIATION_LABEL, type DeviationId, type PlanVsActualResult } from "./planVsActual";

/** Findings that mean the trade departed from the plan as recorded. */
export const DEPARTURES: readonly DeviationId[] = [
  "EXITED_BEFORE_PLANNED_CONDITION", "EXITED_DURING_NORMAL_RETRACEMENT", "HELD_THROUGH_INVALIDATION",
  "MOVED_STOP_WITHOUT_PLAN_BASIS", "MOVED_TARGET", "ADDED_RISK_AFTER_THESIS_WEAKENED",
  "TOOK_PROFIT_BEFORE_PLANNED_CONDITION", "INTERFERED_REPEATEDLY",
];

export interface SetupAdherence {
  readonly setup: string;
  /** Decided trades: the sample. */
  readonly sample: number;
  readonly followed: number;
  readonly departed: number;
  /** Trades with a frozen plan that could not be decided. */
  readonly insufficient: number;
  readonly followedShare: number | null;
  readonly state: "MEASURED" | "INSUFFICIENT EVIDENCE";
  /** The most frequent departure among decided trades, with its count. */
  readonly commonDeparture: { readonly id: DeviationId; readonly count: number } | null;
  /** One plain sentence for the row. */
  readonly line: string;
}

export const UNNAMED_SETUP = "(no setup named)";

export function planAdherenceBySetup(rows: readonly { readonly setup?: string | null; readonly result: PlanVsActualResult }[]): SetupAdherence[] {
  return planAdherenceByGroup(rows.map(r => ({ group: r.setup && r.setup.trim() ? r.setup.trim() : UNNAMED_SETUP, result: r.result })));
}

/** The same counting for any grouping (setup, FVG context …). `setup` on each row names the group. */
export function planAdherenceByGroup(rows: readonly { readonly group: string; readonly result: PlanVsActualResult }[]): SetupAdherence[] {
  const groups = new Map<string, PlanVsActualResult[]>();
  for (const r of rows) {
    if (!r.result.decisionId) continue;
    (groups.get(r.group) ?? groups.set(r.group, []).get(r.group)!).push(r.result);
  }
  const out: SetupAdherence[] = [];
  for (const [setup, rs] of groups) {
    const decided = rs.filter(r => r.exitDecidable);
    const departs = (r: PlanVsActualResult) => r.findings.some(f => DEPARTURES.includes(f.id));
    const departed = decided.filter(departs).length;
    const followed = decided.length - departed;
    const counts = new Map<DeviationId, number>();
    for (const r of decided) for (const id of new Set(r.findings.map(f => f.id))) if (DEPARTURES.includes(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const state = decided.length >= PATTERN_SAMPLE_MIN ? "MEASURED" : "INSUFFICIENT EVIDENCE";
    const share = decided.length ? Math.round((followed / decided.length) * 1000) / 1000 : null;
    out.push({
      setup, sample: decided.length, followed, departed, insufficient: rs.length - decided.length,
      followedShare: share, state,
      commonDeparture: top ? { id: top[0], count: top[1] } : null,
      line: state === "MEASURED"
        ? `Plan followed on ${followed} of ${decided.length} decided trades (${Math.round((share as number) * 100)}%).`
        : `INSUFFICIENT EVIDENCE — ${decided.length} of ${PATTERN_SAMPLE_MIN} decided trades so far${rs.length - decided.length ? `; ${rs.length - decided.length} more could not be compared` : ""}.`,
    });
  }
  return out.sort((a, b) => b.sample - a.sample || a.setup.localeCompare(b.setup));
}

/**
 * DEPARTURES, EACH WITH ITS LESSON DOOR — for the profile's Personal Edge (design call 2026-10-09).
 *
 * One row per kind of departure among the trader's DECIDED trades. The door to the Academy lesson
 * ("Study: Lesson N · title →") comes from the SAME mapping the journal uses (planLoop.lessonForFinding —
 * the education lane owns the lesson ids; nothing is forked here), and it is offered only when the
 * sample is sufficient: ≥ 20 decided trades. Below that the row has NO door and says why — a lesson
 * suggested from three trades would be a diagnosis WM has no evidence for.
 */
export interface DepartureRow {
  readonly id: DeviationId;
  readonly label: string;
  /** Decided trades showing this departure. */
  readonly count: number;
  /** All decided trades — the sample. */
  readonly decided: number;
  readonly state: "MEASURED" | "INSUFFICIENT EVIDENCE";
  readonly line: string;
  /** The lesson door, only at a sufficient sample. */
  readonly door: LoopLink | null;
  /** Why there is no door (INSUFFICIENT EVIDENCE), else null. */
  readonly why: string | null;
}

export function departureRows(results: readonly PlanVsActualResult[]): DepartureRow[] {
  const decided = results.filter(r => r.decisionId && r.exitDecidable);
  const counts = new Map<DeviationId, number>();
  for (const r of decided) for (const id of new Set(r.findings.map(f => f.id))) if (DEPARTURES.includes(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
  const n = decided.length;
  const measured = n >= PATTERN_SAMPLE_MIN;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || DEPARTURES.indexOf(a[0]) - DEPARTURES.indexOf(b[0]))
    .map(([id, count]): DepartureRow => ({
      id, label: DEVIATION_LABEL[id], count, decided: n,
      state: measured ? "MEASURED" : "INSUFFICIENT EVIDENCE",
      line: measured
        ? `${DEVIATION_LABEL[id]} on ${count} of ${n} decided trades (${Math.round((count / n) * 100)}%).`
        : `${DEVIATION_LABEL[id]} on ${count} of ${n} decided trades.`,
      door: measured ? lessonForFinding(id) : null,
      why: measured ? null : `INSUFFICIENT EVIDENCE — ${n} of ${PATTERN_SAMPLE_MIN} decided trades so far, so no lesson is suggested from a sample this small.`,
    }));
}
