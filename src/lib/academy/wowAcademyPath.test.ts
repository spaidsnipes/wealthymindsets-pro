import { describe, expect, it } from "vitest";
import { wowAcademyPath, lessonIdFromHref, WOW_ACADEMY_HOME } from "./wowAcademyPath";
import { TOOL_PRIMERS } from "./toolPrimers";
import { FVG_LESSONS } from "./fvgCourse";

describe("every WM Pro lesson lands on the WOW Academy page that teaches it", () => {
  it("each tool primer maps to its Reading-the-glass lesson", () => {
    for (const p of TOOL_PRIMERS) expect(wowAcademyPath(p.id)).toBe(`/academy/a-plus/glass/${p.id.replace(/^glass-/, "")}`);
  });
  it("each FVG lesson maps to the same lesson number", () => {
    for (const l of FVG_LESSONS) expect(wowAcademyPath(l.id)).toBe(`/academy/a-plus/fvg/${l.n}`);
  });
  it("old catalogue ids and unknowns land on a real WOW page, never on nothing", () => {
    expect(wowAcademyPath("sm-1")).toBe("/academy/a-plus/glass/absorption");
    expect(wowAcademyPath("fp-4")).toBe("/academy/a-plus/glass/session");
    expect(wowAcademyPath("wy-3")).toBe("/academy/a-plus/glass/regime-lighting");
    expect(wowAcademyPath("nonsense")).toBe(WOW_ACADEMY_HOME);
    expect(wowAcademyPath(null)).toBe(WOW_ACADEMY_HOME);
  });
  it("reads the lesson id from an old /education link", () => {
    expect(lessonIdFromHref("/education?lesson=glass-walls&from=%2Fcharts")).toBe("glass-walls");
    expect(lessonIdFromHref("/education")).toBeNull();
  });
});
