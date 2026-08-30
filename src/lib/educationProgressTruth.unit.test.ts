import { describe, expect, it } from "vitest";
import {
  ACADEMY_LESSON_CONTENT_STATUS,
  canRecordAcademyLessonCompletion,
  summarizeAcademyProgress,
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

  it("retains legacy browser marks without presenting unpublished lessons as completed", () => {
    expect(summarizeAcademyProgress({
      markedCompleted: 6,
      total: 39,
      contentStatus: "COMING_SOON",
    })).toEqual({
      verifiedCompleted: 0,
      priorPracticeMarks: 6,
      total: 39,
      verifiedPercent: 0,
    });
  });

  it("counts marked lessons only after the content owner makes them available", () => {
    expect(summarizeAcademyProgress({
      markedCompleted: 6,
      total: 39,
      contentStatus: "AVAILABLE",
    })).toEqual({
      verifiedCompleted: 6,
      priorPracticeMarks: 0,
      total: 39,
      verifiedPercent: 15,
    });
  });
});
