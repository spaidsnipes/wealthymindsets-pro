export type AcademyLessonContentStatus = "COMING_SOON" | "AVAILABLE";

/** Current Academy lessons visibly carry the same coming-soon content state. */
export const ACADEMY_LESSON_CONTENT_STATUS: AcademyLessonContentStatus = "COMING_SOON";

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
