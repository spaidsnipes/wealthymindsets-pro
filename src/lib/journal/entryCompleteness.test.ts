/** Megazord §5 step 5: each entry states what it still lacks for the learning reads. Synthetic entries only. */
import { describe, expect, it } from "vitest";

import { entryCompleteness } from "./entryCompleteness";

const full = { processQuality: "FOLLOWED_PLAN", realizedR: 1.5, mfeR: 2, setup: "Opening range retest", lessons: "Waited for the retest." } as const;

describe("entryCompleteness", () => {
  it("a complete entry says so and lists nothing", () => {
    const c = entryCompleteness(full);
    expect(c.complete).toBe(true);
    expect(c.gaps).toEqual([]);
    expect(c.line).toMatch(/^Complete/);
  });
  it("a rule break is a marked process, not a gap; a loss in R is still a recorded R", () => {
    expect(entryCompleteness({ ...full, processQuality: "BROKE_RULES", realizedR: -1 }).complete).toBe(true);
  });
  it("a bare self-reported trade names every gap, in form order, with the read that needs each", () => {
    const c = entryCompleteness({ processQuality: "UNRESOLVED", setup: "", lessons: "  " });
    expect(c.gaps.map(g => g.id)).toEqual(["PROCESS", "PLANNED_RISK", "MFE", "SETUP", "LESSON"]);
    expect(c.line).toBe("Not recorded yet: Process quality, Planned R (1R = $), MFE (R), Setup, Lessons Learned. Edit the entry to add them; nothing is guessed in the meantime.");
    expect(c.gaps.find(g => g.id === "PROCESS")!.neededFor).toMatch(/Learning Genome/);
  });
  it("one gap reads in the singular; a non-finite R is not a recorded R", () => {
    const c = entryCompleteness({ ...full, realizedR: Number.NaN });
    expect(c.gaps.map(g => g.id)).toEqual(["PLANNED_RISK"]);
    expect(c.line).toMatch(/add it;/);
  });
  it("never grades the trader", () => {
    const c = entryCompleteness({ processQuality: "UNRESOLVED", setup: "", lessons: "" });
    const words = [c.line, ...c.gaps.map(g => g.neededFor)].join(" ");
    expect(words).not.toMatch(/fail|bad|lazy|should have|poor|wrong/i);
  });
});
