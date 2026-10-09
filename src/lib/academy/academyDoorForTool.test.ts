import { describe, expect, it } from "vitest";
import { ACADEMY_DOOR_FOR_TOOL, academyDoorForTool } from "./academyDoorForTool";
import { FVG_LESSONS } from "./fvgCourse";
import { educationFor } from "@/lib/chart/inventionEducation";
import { academyLessonContentStatus } from "@/lib/educationProgressTruth";

const lessonText = (id: string) => { const l = FVG_LESSONS.find(x => x.id === id)!; return [l.title, l.lede, ...l.body, ...l.look, l.glass].join(" "); };

describe("Supermax §9 — an ⓘ reaches the lesson that teaches the tool, before it is switched on", () => {
  it("every door is a real, PUBLISHED lesson with its exact title and address", () => {
    for (const [tool, d] of Object.entries(ACADEMY_DOOR_FOR_TOOL)) {
      const l = FVG_LESSONS.find(x => x.id === d.lessonId);
      expect(l, tool).toBeTruthy();
      expect(d.title, tool).toBe(l!.title);
      expect(d.href, tool).toBe(`/education?lesson=${l!.id}`);
      expect(academyLessonContentStatus(d.lessonId), tool).toBe("AVAILABLE");
    }
  });

  it("the seven inventions the order names each have a door", () => {
    // FVG carries its own door on its record; the rest come from this table.
    expect((educationFor("FVG_IMBALANCE") as { academy?: { lessonId: string } }).academy?.lessonId).toBe("fvg-1");
    const expected: Record<string, string> = {
      LIVING_PROFILE: "fvg-12", BRICK_WALLS: "fvg-13", DERIVATIVES_PRESSURE: "fvg-13", ABSORPTION: "fvg-13",
      EFFORT_RESPONSE: "fvg-5", LIQUIDITY_WEATHER: "fvg-13", "FP_bid-ask": "fvg-13",
    };
    for (const [tool, lesson] of Object.entries(expected)) {
      expect(academyDoorForTool(tool)?.lessonId, tool).toBe(lesson);
      const rec = educationFor(tool) as { academy?: { lessonId: string; href: string } } | null;
      expect(rec, tool).toBeTruthy();
      expect(rec!.academy?.lessonId, tool).toBe(lesson);
    }
  });

  it("the lesson behind each door really teaches that tool — the door is not a label", () => {
    expect(lessonText("fvg-12")).toMatch(/profile/i);
    const evidence = lessonText("fvg-13");
    for (const word of [/order flow/i, /absorption/i, /options walls/i, /resting liquidity/i, /evidence class/i]) expect(evidence).toMatch(word);
    const displacement = lessonText("fvg-5");
    expect(displacement).toMatch(/effort/i);
    expect(displacement).toMatch(/response/i);
  });

  it("the ⓘ owner returns one stable record per tool, and leaves a tool with no lesson alone", () => {
    expect(educationFor("LIVING_PROFILE")).toBe(educationFor("LIVING_PROFILE"));
    expect(academyDoorForTool("REPLAY")).toBeNull();
    const replay = educationFor("REPLAY");
    expect(replay && "academy" in replay).toBe(false);
  });
});
