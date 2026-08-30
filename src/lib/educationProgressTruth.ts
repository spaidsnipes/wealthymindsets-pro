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
