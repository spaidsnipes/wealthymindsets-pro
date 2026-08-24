import { describe, it, expect } from "vitest";
import {
  WM_BRAND,
  WM_SLOGAN,
  WM_MARKS,
  WM_MARK_HIERARCHY,
  WM_INTEGRATION_PHRASING,
  type WmMark,
} from "./brandCanon";

describe("brandCanon — the frozen brand identity (drift guard)", () => {
  it("master slogan is the founder-canonized string, VERBATIM", () => {
    // If someone changes the brand voice, that is a founder decision — this
    // test must be updated deliberately, never drifted by accident.
    expect(WM_SLOGAN.master).toBe("Stay Sharp. Stay a Student.");
  });

  it("Academy grade + creed are frozen verbatim", () => {
    expect(WM_SLOGAN.academyGrade).toBe("A+ Student of the Game");
    expect(WM_SLOGAN.academyCreed).toBe("Forever a Student of the Game.");
  });

  it("master + product names are canonical", () => {
    expect(WM_BRAND.master).toBe("WEALTHY MINDSETS");
    expect(WM_BRAND.product).toBe("WealthyMindsets Pro");
  });

  it("mark hierarchy has exactly the four frozen roles", () => {
    expect([...WM_MARKS]).toEqual(["master-crest", "compact-monogram", "micro-glyph", "editorial"]);
  });

  it("every mark role has a complete spec (title, description, usage, avoid)", () => {
    for (const mark of WM_MARKS) {
      const spec = WM_MARK_HIERARCHY[mark as WmMark];
      expect(spec.mark).toBe(mark);
      expect(spec.title.length).toBeGreaterThan(0);
      expect(spec.description.length).toBeGreaterThan(0);
      expect(spec.usage.length).toBeGreaterThan(0);
      expect(spec.avoid.length).toBeGreaterThan(0);
    }
  });

  it("micro-glyph owns the tiny surfaces; master-crest is kept off dense UI", () => {
    // Encodes the founder guardrail: don't plaster the crest everywhere.
    expect(WM_MARK_HIERARCHY["micro-glyph"].usage).toContain("favicon");
    expect(WM_MARK_HIERARCHY["master-crest"].avoid).toContain("favicon");
    expect(WM_MARK_HIERARCHY.editorial.avoid.join(" ")).toMatch(/professional and calm/i);
  });

  it("integration phrasing refuses the word 'connected' pre-certification", () => {
    expect(WM_INTEGRATION_PHRASING.architecture).toContain("integrated into the canonical architecture");
    expect(WM_INTEGRATION_PHRASING.architecture).not.toContain("connected");
  });
});
