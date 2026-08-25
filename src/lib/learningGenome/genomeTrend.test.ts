import { describe, it, expect } from "vitest";

import { genomeTrend, TREND_STABLE_THRESHOLD } from "./genomeTrend";
import type { LearningGenome, GenomeDimension } from "./selectLearningGenome";

function d(score: number | undefined, sample_size = 10): GenomeDimension {
  return {
    score,
    sample_size,
    label: score === undefined ? undefined : `score ${score}`,
  };
}

function g(overrides: Partial<{
  perception: GenomeDimension;
  reasoning: GenomeDimension;
  process: GenomeDimension;
  transfer: GenomeDimension;
}>): LearningGenome {
  return {
    perception: d(undefined, 0),
    reasoning: d(undefined, 0),
    process: d(undefined, 0),
    transfer: d(undefined, 0),
    strongest: undefined,
    weakest: undefined,
    headlineWeakness: undefined,
    ...overrides,
  };
}

describe("genomeTrend — canon §9 skill vs luck", () => {
  it("returns UNMEASURED for both undefined dimensions", () => {
    const t = genomeTrend(g({}), g({}));
    expect(t.perception.direction).toBe("UNMEASURED");
    expect(t.perception.delta).toBeUndefined();
    expect(t.most_improved).toBeUndefined();
    expect(t.most_degraded).toBeUndefined();
  });

  it("returns NEW when prior was undefined and current is measured", () => {
    const t = genomeTrend(g({ perception: d(0.8) }), g({}));
    expect(t.perception.direction).toBe("NEW");
    expect(t.perception.delta).toBeUndefined();
    expect(t.perception.current_score).toBe(0.8);
    expect(t.perception.prior_score).toBeUndefined();
  });

  it("returns LOST when current is undefined but prior was measured", () => {
    const t = genomeTrend(g({}), g({ perception: d(0.8) }));
    expect(t.perception.direction).toBe("LOST");
    expect(t.perception.prior_score).toBe(0.8);
    expect(t.perception.current_score).toBeUndefined();
  });

  it("returns STABLE when delta is within the noise threshold", () => {
    const t = genomeTrend(
      g({ perception: d(0.80) }),
      g({ perception: d(0.83) }),
    );
    // |0.80 - 0.83| = 0.03 < 0.05 threshold → STABLE
    expect(t.perception.direction).toBe("STABLE");
    expect(t.perception.delta).toBeCloseTo(-0.03);
  });

  it("returns IMPROVING when delta >= threshold in positive direction", () => {
    const t = genomeTrend(
      g({ reasoning: d(0.75) }),
      g({ reasoning: d(0.50) }),
    );
    expect(t.reasoning.direction).toBe("IMPROVING");
    expect(t.reasoning.delta).toBeCloseTo(0.25);
  });

  it("returns DEGRADING when delta >= threshold in negative direction", () => {
    const t = genomeTrend(
      g({ process: d(0.30) }),
      g({ process: d(0.70) }),
    );
    expect(t.process.direction).toBe("DEGRADING");
    expect(t.process.delta).toBeCloseTo(-0.40);
  });

  it("threshold boundary: exactly at threshold counts as movement (not STABLE)", () => {
    const t = genomeTrend(
      g({ perception: d(0.60 + TREND_STABLE_THRESHOLD) }),
      g({ perception: d(0.60) }),
    );
    // 0.05 delta is NOT < threshold → IMPROVING wins
    expect(t.perception.direction).toBe("IMPROVING");
  });

  it("most_improved picks the largest positive delta", () => {
    const t = genomeTrend(
      g({
        perception: d(0.90), // +0.10
        reasoning: d(0.80),  // +0.30 ← winner
        process: d(0.50),    // +0.15
        transfer: d(0.10),   // -0.20 DEGRADING
      }),
      g({
        perception: d(0.80),
        reasoning: d(0.50),
        process: d(0.35),
        transfer: d(0.30),
      }),
    );
    expect(t.most_improved).toBe("REASONING");
    expect(t.most_degraded).toBe("TRANSFER");
  });

  it("most_improved is undefined when nothing is IMPROVING", () => {
    const t = genomeTrend(
      g({ perception: d(0.40), reasoning: d(0.30) }),
      g({ perception: d(0.50), reasoning: d(0.60) }),
    );
    expect(t.most_improved).toBeUndefined();
    expect(t.most_degraded).toBe("REASONING"); // -0.30 vs -0.10
  });

  it("most_degraded is undefined when nothing is DEGRADING", () => {
    const t = genomeTrend(
      g({ perception: d(0.90), reasoning: d(0.80) }),
      g({ perception: d(0.40), reasoning: d(0.30) }),
    );
    expect(t.most_improved).toBe("PERCEPTION"); // both are +0.50, ties go to first
    expect(t.most_degraded).toBeUndefined();
  });

  it("STABLE dimensions never appear as most_improved or most_degraded", () => {
    const t = genomeTrend(
      g({ perception: d(0.52) }),
      g({ perception: d(0.50) }),
    );
    // delta 0.02 → STABLE
    expect(t.perception.direction).toBe("STABLE");
    expect(t.most_improved).toBeUndefined();
    expect(t.most_degraded).toBeUndefined();
  });

  it("mixed: NEW + STABLE + IMPROVING + DEGRADING in one call", () => {
    const t = genomeTrend(
      g({
        perception: d(0.90),        // NEW
        reasoning: d(0.51),         // STABLE (0.01 delta)
        process: d(0.70),           // IMPROVING (+0.30)
        transfer: d(-0.50),         // DEGRADING (-0.60)
      }),
      g({
        // no perception (undefined)
        reasoning: d(0.50),
        process: d(0.40),
        transfer: d(0.10),
      }),
    );
    expect(t.perception.direction).toBe("NEW");
    expect(t.reasoning.direction).toBe("STABLE");
    expect(t.process.direction).toBe("IMPROVING");
    expect(t.transfer.direction).toBe("DEGRADING");
    expect(t.most_improved).toBe("PROCESS");
    expect(t.most_degraded).toBe("TRANSFER");
  });
});
