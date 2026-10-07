/**
 * THE LEARNING LOOP'S HAND-OFFS — Garden 19 §56. PURE.
 *
 *   LEARN (Academy) → PREPARE (Morning Prep: today's management rules)
 *   → CHART → TICKET (the plan card freezes the plan on the Decision_ID)
 *   → JOURNAL → REVIEW (market / planned / actual, deviations, your why)
 *   → PERSONAL EDGE (plan adherence by setup / FVG context)
 *   → ACADEMY (the lesson nearest the finding) → LEARN YOURSELF (back to
 *   Morning Prep with what your own record shows).
 *
 * Every link below names a door that exists. Lessons are looked up in the
 * Academy's own catalogue (FVG_LESSONS) — a lesson id that is not there is
 * never printed.
 */

import { FVG_LESSONS, fvgLessonHref } from "@/lib/academy/fvgCourse";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import type { DeviationId } from "./planVsActual";

export interface LoopLink { readonly href: string; readonly label: string }

export const LOOP_DOORS = {
  ACADEMY: "/education",
  MORNING_PREP: "/morning-prep",
  CHART: INSTRUMENT_VIEW_ROUTE,
  JOURNAL: "/journal",
} as const;

const lesson = (id: string): LoopLink | null => {
  const l = FVG_LESSONS.find(x => x.id === id);
  return l ? { href: fvgLessonHref(l.n), label: `Lesson ${l.n} · ${l.title}` } : null;
};

/** The Academy lesson nearest a plan-vs-actual finding (management, patience, risk), or null. */
export function lessonForFinding(id: DeviationId, onFvg = false): LoopLink | null {
  switch (id) {
    case "EXITED_BEFORE_PLANNED_CONDITION":
    case "EXITED_DURING_NORMAL_RETRACEMENT":
      return lesson("fvg-18"); // Patience — waiting for the conditions your plan names
    case "HELD_THROUGH_INVALIDATION":
      return lesson(onFvg ? "fvg-14" : "fvg-19"); // trade-through / Management
    case "MOVED_STOP_WITHOUT_PLAN_BASIS":
    case "MOVED_TARGET":
    case "PLAN_CHANGED_WITH_DOCUMENTED_NEW_EVIDENCE":
      return lesson("fvg-19"); // Management — by the plan
    case "ADDED_RISK_AFTER_THESIS_WEAKENED":
      return lesson("fvg-17"); // Risk: context, not permission
    case "EXITED_AFTER_THESIS_INVALIDATION":
    case "PLAN_FOLLOWED":
      return lesson("fvg-21"); // Your personal edge
    case "INSUFFICIENT_EVIDENCE":
      return lesson("fvg-16"); // descriptive vs predictive
  }
}

/** "Learn yourself": from the Academy's patience / management / edge lessons back into your own record. */
export function learnYourselfLinks(lessonId: string): readonly LoopLink[] {
  if (!["fvg-17", "fvg-18", "fvg-19", "fvg-21"].includes(lessonId)) return [];
  return [
    { href: LOOP_DOORS.MORNING_PREP, label: "Write today's management rules (Morning Prep)" },
    { href: LOOP_DOORS.JOURNAL, label: "See your own plan adherence (Journal · Personal Edge)" },
  ];
}
