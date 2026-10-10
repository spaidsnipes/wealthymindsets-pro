import { describe, expect, it } from "vitest";
import { ACADEMY_DOOR_FOR_TOOL, academyDoorForTool } from "./academyDoorForTool";
import { TOOL_PRIMERS } from "./toolPrimers";
import { educationFor } from "@/lib/chart/inventionEducation";
import { academyLessonContentStatus } from "@/lib/educationProgressTruth";

describe("Supermax §9 — an ⓘ reaches the lesson about THAT tool, before it is switched on", () => {
  it("every door is a real, PUBLISHED primer with its exact title and address", () => {
    for (const [tool, d] of Object.entries(ACADEMY_DOOR_FOR_TOOL)) {
      const l = TOOL_PRIMERS.find(x => x.id === d.lessonId);
      expect(l, tool).toBeTruthy();
      expect(d.title, tool).toBe(l!.title);
      expect(d.href, tool).toBe(`/education?lesson=${l!.id}`);
      expect(academyLessonContentStatus(d.lessonId), tool).toBe("AVAILABLE");
    }
  });

  it("the primer behind each door is about that tool — it is one of the primer's own tools", () => {
    for (const [tool, d] of Object.entries(ACADEMY_DOOR_FOR_TOOL)) {
      const l = TOOL_PRIMERS.find(x => x.id === d.lessonId)!;
      expect(l.tools.map(t => t.id), tool).toContain(tool);
    }
    // …and every tool a primer teaches has its door.
    for (const p of TOOL_PRIMERS) for (const t of p.tools) expect(academyDoorForTool(t.id)?.lessonId, t.id).toBe(p.id);
  });

  it("the seven inventions the order names each have a door on their ⓘ record", () => {
    expect((educationFor("FVG_IMBALANCE") as { academy?: { lessonId: string } }).academy?.lessonId).toBe("fvg-1");
    const expected: Record<string, string> = {
      LIVING_PROFILE: "glass-living-profile", BRICK_WALLS: "glass-walls", DERIVATIVES_PRESSURE: "glass-walls", ABSORPTION: "glass-absorption",
      EFFORT_RESPONSE: "glass-effort-response", LIQUIDITY_WEATHER: "glass-liquidity-weather", "FP_bid-ask": "glass-footprint",
    };
    for (const [tool, lesson] of Object.entries(expected)) {
      const rec = educationFor(tool) as { academy?: { lessonId: string } } | null;
      expect(rec?.academy?.lessonId, tool).toBe(lesson);
    }
  });

  it("the ⓘ owner returns one stable record per tool, and leaves a tool with no lesson alone", () => {
    expect(educationFor("LIVING_PROFILE")).toBe(educationFor("LIVING_PROFILE"));
    expect(academyDoorForTool("REPLAY")).toBeNull();
    const replay = educationFor("REPLAY");
    expect(replay && "academy" in replay).toBe(false);
  });
});
