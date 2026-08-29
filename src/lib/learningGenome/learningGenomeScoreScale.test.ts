import { describe, expect, it } from "vitest";

import { normalizeLearningDimensionScore } from "./learningGenomeScoreScale";

describe("normalizeLearningDimensionScore", () => {
  it("clamps ratio dimensions to the shared 0..1 comparison scale", () => {
    expect(normalizeLearningDimensionScore("PERCEPTION", -0.2)).toBe(0);
    expect(normalizeLearningDimensionScore("REASONING", 0.6)).toBe(0.6);
    expect(normalizeLearningDimensionScore("PROCESS", 1.4)).toBe(1);
  });

  it("maps TRANSFER from raw R using the canonical 0R..+2R scale", () => {
    expect(normalizeLearningDimensionScore("TRANSFER", -1)).toBe(0);
    expect(normalizeLearningDimensionScore("TRANSFER", 1)).toBe(0.5);
    expect(normalizeLearningDimensionScore("TRANSFER", 2)).toBe(1);
    expect(normalizeLearningDimensionScore("TRANSFER", 8)).toBe(1);
  });
});
