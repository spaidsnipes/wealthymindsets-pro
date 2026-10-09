import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { FVG_LESSONS, fvgLessonHref } from "@/lib/academy/fvgCourse";
import { FVG_FIRST_LESSON, FVG_LESSON_FOR_STATE, fvgLessonForState } from "@/lib/academy/fvgLessonForState";
import { FVG_STATES } from "@/lib/marketData/fvg/fvgDefinition";

describe("§35 — the ⓘ on a gap opens the lesson about what that gap is doing", () => {
  it("every lifecycle state has a lesson, and each one is a real lesson of the course (number, id, title, address)", () => {
    expect(Object.keys(FVG_LESSON_FOR_STATE).sort()).toEqual([...FVG_STATES].sort());
    for (const s of FVG_STATES) {
      const l = fvgLessonForState(s);
      const course = FVG_LESSONS[l.n - 1];
      expect(course, s).toBeTruthy();
      expect(l.lessonId, s).toBe(course.id);
      expect(l.title, s).toBe(course.title);
      expect(l.href, s).toBe(fvgLessonHref(l.n));
    }
  });
  it("the states that matter most open their own lesson", () => {
    expect(fvgLessonForState("TRADED_THROUGH").n).toBe(14);
    expect(fvgLessonForState("MEMORY").n).toBe(15);
    expect(fvgLessonForState("REJECTED").n).toBe(9);
    expect(fvgLessonForState("ACCEPTED").n).toBe(9);
    expect(fvgLessonForState("FULLY_MITIGATED").n).toBe(8);
    expect(fvgLessonForState("PARTIALLY_MITIGATED").n).toBe(7);
    expect(fvgLessonForState("TOUCHED").n).toBe(6);
  });
  it("an unknown state falls back to lesson 1, never a dead link", () => {
    expect(fvgLessonForState("SOMETHING_NEW")).toBe(FVG_FIRST_LESSON);
    expect(FVG_FIRST_LESSON.title).toBe(FVG_LESSONS[0].title);
  });
  it("the Inspect ticket links by the gap's own state", () => {
    const ticket = readFileSync("src/components/chart/FvgInspectTicket.tsx", "utf8");
    expect(ticket).toMatch(/const academy = fvgLessonForState\(o\.state\);/);
    expect(ticket).toContain("Academy · {academy.title} ›");
  });
});
