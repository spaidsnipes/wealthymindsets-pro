import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRIMER_CANNOT_KNOW, PRIMER_SILENCE, TOOL_PRIMERS, TOOL_PRIMER_MODULE, TOOL_PRIMER_QUIZ_BANK, toolPrimerText } from "./toolPrimers";
import { FVG_ACADEMY_MODULE } from "./fvgCourse";
import { educationFor } from "@/lib/chart/inventionEducation";
import { academyLessonContentStatus } from "@/lib/educationProgressTruth";
import { offenders } from "@/lib/marketing/bannedClaims";

const page = readFileSync("src/app/education/page.tsx", "utf8");

describe("Supermax §9 — tool primers: one per tool, written from the tool's own ⓘ record", () => {
  it("six primers, in the existing Academy catalogue, each published", () => {
    expect(TOOL_PRIMERS.map(p => p.title)).toEqual([
      "Living Profile", "Brick Walls and Derivatives Pressure", "Absorption", "Liquidity Weather", "Effort → Response", "Footprint",
    ]);
    expect(TOOL_PRIMER_MODULE.id).not.toBe(FVG_ACADEMY_MODULE.id);
    expect(page.match(/TOOL_PRIMER_MODULE\.id/g)?.length).toBe(1);   // registered once, in the one catalogue
    for (const p of TOOL_PRIMERS) expect(academyLessonContentStatus(p.id), p.id).toBe("AVAILABLE");
  });

  it("ONE DEFINITION — every sentence about a tool is that tool's ⓘ record, verbatim", () => {
    for (const p of TOOL_PRIMERS) {
      expect(p.sections).toHaveLength(p.tools.length);
      p.tools.forEach((t, i) => {
        const r = educationFor(t.id)!;
        const s = p.sections[i];
        expect(s, t.id).toMatchObject({ question: r.question, appears: r.appears, grammar: r.grammar, evidence: r.evidence, full: r.full, partial: r.partial, degraded: r.degraded, silence: r.silence });
      });
    }
  });

  it("each primer says what it is on the glass, what it cannot know, and how to read the four grades", () => {
    const ui = readFileSync("src/components/education/ToolPrimerBody.tsx", "utf8");
    for (const word of ["On the chart:", "How to read it:", "What it needs:", "FULL:", "PARTIAL:", "DEGRADED:", "SILENCE:", "{PRIMER_SILENCE}", "{PRIMER_CANNOT_KNOW}"]) expect(ui).toContain(word);
    expect(PRIMER_SILENCE).toMatch(/^SILENCE: the tool draws nothing and says why\./);
    expect(PRIMER_CANNOT_KNOW).toMatch(/who traded, why they traded, or what price does next/);
  });

  it("no guarantee, no selling string, no fill claim — in the frame or the knowledge check", () => {
    const frame = [PRIMER_SILENCE, PRIMER_CANNOT_KNOW, ...TOOL_PRIMER_QUIZ_BANK.flatMap(q => [q.q, q.choices[q.correct], q.explain])];
    for (const s of frame) {
      expect(s, s).not.toMatch(/\b(must fill|will fill|guarantee[ds]?|always|high.probability|profit)\b/i);
      expect(offenders(s), s).toEqual([]);
    }
    for (const s of toolPrimerText()) expect(s, s).not.toMatch(/must fill|will fill/i);
  });

  it("the knowledge check has ten questions, each with one correct choice in range", () => {
    expect(TOOL_PRIMER_QUIZ_BANK).toHaveLength(10);
    for (const q of TOOL_PRIMER_QUIZ_BANK) { expect(q.choices).toHaveLength(4); expect(q.correct).toBeGreaterThanOrEqual(0); expect(q.correct).toBeLessThan(4); }
  });
});
