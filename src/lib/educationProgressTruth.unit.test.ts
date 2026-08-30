import { describe, expect, it } from "vitest";
import {
  ACADEMY_LESSON_CONTENT_STATUS,
  canRecordAcademyLessonCompletion,
} from "./educationProgressTruth";

describe("Academy lesson completion truth", () => {
  it("does not convert a passed knowledge check into completion while content is unpublished", () => {
    expect(ACADEMY_LESSON_CONTENT_STATUS).toBe("COMING_SOON");
    expect(canRecordAcademyLessonCompletion({
      quizPassed: true,
      contentStatus: ACADEMY_LESSON_CONTENT_STATUS,
    })).toBe(false);
  });

  it("requires both published content and a passed knowledge check", () => {
    expect(canRecordAcademyLessonCompletion({ quizPassed: false, contentStatus: "AVAILABLE" })).toBe(false);
    expect(canRecordAcademyLessonCompletion({ quizPassed: true, contentStatus: "AVAILABLE" })).toBe(true);
  });
});
