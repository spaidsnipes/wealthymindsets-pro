import { FVG_LESSONS } from "@/lib/academy/fvgCourse";
import { TOOL_PRIMERS } from "@/lib/academy/toolPrimers";

export type AcademyLessonContentStatus = "COMING_SOON" | "AVAILABLE";

/** Current Academy lessons visibly carry the same coming-soon content state. */
export const ACADEMY_LESSON_CONTENT_STATUS: AcademyLessonContentStatus = "COMING_SOON";

/**
 * Lessons whose content IS published: the FVG / Imbalance & Patience course
 * (Garden 19 §33) ships as written lessons with a knowledge check on its own
 * definition, so passing that check records completion. Every other lesson
 * keeps the catalogue-wide status above.
 */
// …and the tool primers ("Reading the glass", Supermax §9): written from each tool's own ⓘ record,
// with a knowledge check on the evidence grades.
const PUBLISHED_LESSON_IDS: ReadonlySet<string> = new Set([...FVG_LESSONS.map(l => l.id), ...TOOL_PRIMERS.map(l => l.id)]);

export function academyLessonContentStatus(lessonId: string): AcademyLessonContentStatus {
  return PUBLISHED_LESSON_IDS.has(lessonId) ? "AVAILABLE" : ACADEMY_LESSON_CONTENT_STATUS;
}

/**
 * A knowledge check cannot manufacture completion for unpublished content.
 * When real content ships, its canonical owner may supply AVAILABLE.
 */
export function canRecordAcademyLessonCompletion(input: {
  quizPassed: boolean;
  contentStatus: AcademyLessonContentStatus;
}): boolean {
  return input.quizPassed && input.contentStatus === "AVAILABLE";
}

export type AcademyProgressSummary = {
  verifiedCompleted: number;
  priorPracticeMarks: number;
  total: number;
  verifiedPercent: number;
};

/**
 * Legacy browser marks are preserved, but unpublished lessons cannot be
 * represented as verified completion. This keeps user history without turning
 * an older local flag into evidence that unavailable content was completed.
 */
export function summarizeAcademyProgress(input: {
  markedCompleted: number;
  total: number;
  contentStatus: AcademyLessonContentStatus;
}): AcademyProgressSummary {
  const total = Math.max(0, input.total);
  const markedCompleted = Math.min(Math.max(0, input.markedCompleted), total);
  const verifiedCompleted = input.contentStatus === "AVAILABLE" ? markedCompleted : 0;

  return {
    verifiedCompleted,
    priorPracticeMarks: markedCompleted - verifiedCompleted,
    total,
    verifiedPercent: total === 0 ? 0 : Math.round((verifiedCompleted / total) * 100),
  };
}

/** Progress over lessons that may carry different content states (per-lesson owner above). */
export function summarizeAcademyLessons(lessons: readonly { readonly id: string; readonly completed: boolean }[]): AcademyProgressSummary {
  const total = lessons.length;
  let verifiedCompleted = 0, priorPracticeMarks = 0;
  for (const l of lessons) {
    if (!l.completed) continue;
    if (academyLessonContentStatus(l.id) === "AVAILABLE") verifiedCompleted++;
    else priorPracticeMarks++;
  }
  return {
    verifiedCompleted,
    priorPracticeMarks,
    total,
    verifiedPercent: total === 0 ? 0 : Math.round((verifiedCompleted / total) * 100),
  };
}
