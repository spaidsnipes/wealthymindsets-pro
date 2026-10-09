/**
 * ⓘ FVG → THE RELEVANT ACADEMY LESSON (Garden 19 §35: "From live Market Home:
 * ⓘ FVG deep-links to the relevant Academy lesson").
 *
 * The chart's Inspect ticket for a gap linked to lesson 1 whatever the gap was
 * doing. The relevant lesson is the one about the state the trader is looking
 * at: a gap that was traded through opens "Failed FVG / trade-through", one
 * that aged into memory opens "Market memory", and so on.
 *
 * A small table on purpose — the chart must not import the whole course to
 * print one link. `fvgLessonForState.test.ts` pins every title and number to
 * the course (`FVG_LESSONS`), so the two cannot drift.
 */
import type { FvgState } from "@/lib/marketData/fvg/fvgDefinition";

export interface FvgStateLesson {
  readonly n: number;
  readonly lessonId: string;
  readonly href: string;
  readonly title: string;
}

const lesson = (n: number, title: string): FvgStateLesson => ({ n, lessonId: `fvg-${n}`, href: `/education?lesson=fvg-${n}`, title });

/** Lesson 1 — the fallback for a state the table does not know. */
export const FVG_FIRST_LESSON: FvgStateLesson = lesson(1, "What is an imbalance?");

export const FVG_LESSON_FOR_STATE: Readonly<Record<FvgState, FvgStateLesson>> = {
  BORN: lesson(2, "The three-candle model"),
  OPEN: FVG_FIRST_LESSON,
  APPROACHING: lesson(10, "Time-to-return"),
  TOUCHED: lesson(6, "Touch"),
  PARTIALLY_MITIGATED: lesson(7, "Partial mitigation"),
  DEEPLY_MITIGATED: lesson(7, "Partial mitigation"),
  FULLY_MITIGATED: lesson(8, "Full mitigation"),
  REJECTED: lesson(9, "Rejection vs acceptance"),
  ACCEPTED: lesson(9, "Rejection vs acceptance"),
  TRADED_THROUGH: lesson(14, "Failed FVG / trade-through"),
  MEMORY: lesson(15, "Market memory"),
};

export function fvgLessonForState(state: string): FvgStateLesson {
  return (FVG_LESSON_FOR_STATE as Readonly<Record<string, FvgStateLesson>>)[state] ?? FVG_FIRST_LESSON;
}
