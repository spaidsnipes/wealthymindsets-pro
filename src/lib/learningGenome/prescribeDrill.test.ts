import { describe, it, expect } from "vitest";

import { prescribeDrill } from "./prescribeDrill";
import { selectLearningGenome } from "./selectLearningGenome";
import type { EdgeEntry } from "../proofLane/selectSessionEdge";
import type { LearningGenome } from "./selectLearningGenome";

function e(overrides: Partial<EdgeEntry>): EdgeEntry {
  return {
    date: "2026-08-25",
    result: "win",
    processQuality: "UNRESOLVED",
    ...overrides,
  };
}

describe("prescribeDrill — canon §9 Adaptive Academy bridge", () => {
  it("returns undefined when the Genome has no weakest dimension", () => {
    const emptyGenome = selectLearningGenome([]);
    expect(prescribeDrill(emptyGenome)).toBeUndefined();
  });

  it("returns undefined on a full tie (never invents a prescription)", () => {
    const tiedGenome = selectLearningGenome([
      e({ processQuality: "FOLLOWED_PLAN", realizedR: 1, mfeR: 1 }),
    ]);
    // perception=reasoning=process=transfer=1 → tied.
    expect(tiedGenome.weakest).toBeUndefined();
    expect(prescribeDrill(tiedGenome)).toBeUndefined();
  });

  it("prescribes the canon TRANSFER drill when TRANSFER is weakest", () => {
    const genome = selectLearningGenome([
      // Every entry: perception=1, reasoning=1, process=1, but transfer negative.
      e({ processQuality: "FOLLOWED_PLAN", realizedR: -2, mfeR: 1 }),
      e({ processQuality: "FOLLOWED_PLAN", realizedR: -1.5, mfeR: 1 }),
      e({ processQuality: "FOLLOWED_PLAN", realizedR: -1, mfeR: 1 }),
    ]);
    const drill = prescribeDrill(genome);
    expect(drill).toBeDefined();
    expect(drill!.dimension).toBe("TRANSFER");
    expect(drill!.stage).toBe("PROVE");
    expect(drill!.drill).toContain("1/3");
    expect(drill!.why).toContain("plan-followed");
  });

  it("prescribes SEE stage for PERCEPTION weakness (setup recognition)", () => {
    // Craft a synthetic genome where PERCEPTION is the weakest.
    const genome: LearningGenome = {
      perception: { score: 0.1, sample_size: 10, label: "Low resolve rate" },
      reasoning: { score: 0.9, sample_size: 5, label: "High plan follow" },
      process: { score: undefined, sample_size: 0, label: undefined },
      transfer: { score: undefined, sample_size: 0, label: undefined },
      strongest: "REASONING",
      weakest: "PERCEPTION",
      headlineWeakness: "…",
    };
    const drill = prescribeDrill(genome);
    expect(drill!.dimension).toBe("PERCEPTION");
    expect(drill!.stage).toBe("SEE");
    expect(drill!.drill).toContain("Replay");
  });

  it("prescribes LEARN stage for REASONING weakness (plan adherence)", () => {
    const genome: LearningGenome = {
      perception: { score: 0.9, sample_size: 10, label: "Strong" },
      reasoning: { score: 0.2, sample_size: 8, label: "Breaks rules often" },
      process: { score: undefined, sample_size: 0, label: undefined },
      transfer: { score: undefined, sample_size: 0, label: undefined },
      strongest: "PERCEPTION",
      weakest: "REASONING",
      headlineWeakness: "…",
    };
    const drill = prescribeDrill(genome);
    expect(drill!.stage).toBe("LEARN");
    expect(drill!.drill).toContain("BROKE_RULES");
  });

  it("prescribes REPLAY stage for PROCESS weakness (capture efficiency)", () => {
    const genome: LearningGenome = {
      perception: { score: 0.9, sample_size: 10, label: "Strong" },
      reasoning: { score: 0.9, sample_size: 5, label: "Strong" },
      process: { score: 0.2, sample_size: 6, label: "Low capture" },
      transfer: { score: undefined, sample_size: 0, label: undefined },
      strongest: "PERCEPTION",
      weakest: "PROCESS",
      headlineWeakness: "…",
    };
    const drill = prescribeDrill(genome);
    expect(drill!.stage).toBe("REPLAY");
    expect(drill!.drill).toContain("Replay");
  });

  it("uses the dimension's own label as `why` when available", () => {
    const genome: LearningGenome = {
      perception: { score: 0.9, sample_size: 10, label: "Strong" },
      reasoning: { score: 0.2, sample_size: 8, label: "Plan followed on 2/8 resolved trades" },
      process: { score: undefined, sample_size: 0, label: undefined },
      transfer: { score: undefined, sample_size: 0, label: undefined },
      strongest: "PERCEPTION",
      weakest: "REASONING",
      headlineWeakness: "…",
    };
    const drill = prescribeDrill(genome);
    expect(drill!.why).toBe("Plan followed on 2/8 resolved trades");
  });
});
