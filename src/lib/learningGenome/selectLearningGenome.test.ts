import { describe, it, expect } from "vitest";

import { selectLearningGenome } from "./selectLearningGenome";
import type { EdgeEntry } from "../proofLane/selectSessionEdge";

/**
 * Learning Genome — §9 diagnostic (Final Helicopter, 2026-08-24).
 *
 * These tests lock the two founding guarantees:
 *  1. Every dimension refuses to fabricate a score from missing data.
 *  2. The headlineWeakness is emitted only when the ranking is real —
 *     never on empty input, never on a tie, never from a single measured
 *     dimension.
 */

function e(overrides: Partial<EdgeEntry>): EdgeEntry {
  return {
    date: "2026-08-25",
    result: "win",
    processQuality: "UNRESOLVED",
    ...overrides,
  };
}

describe("selectLearningGenome — canon §9", () => {
  describe("empty / degenerate inputs", () => {
    it("returns all-undefined dimensions when entries is empty", () => {
      const g = selectLearningGenome([]);
      expect(g.perception.score).toBeUndefined();
      expect(g.reasoning.score).toBeUndefined();
      expect(g.process.score).toBeUndefined();
      expect(g.transfer.score).toBeUndefined();
      expect(g.strongest).toBeUndefined();
      expect(g.weakest).toBeUndefined();
      expect(g.headlineWeakness).toBeUndefined();
    });

    it("returns sample_size 0 on every empty dimension (never fakes a score)", () => {
      const g = selectLearningGenome([]);
      expect(g.perception.sample_size).toBe(0);
      expect(g.reasoning.sample_size).toBe(0);
      expect(g.process.sample_size).toBe(0);
      expect(g.transfer.sample_size).toBe(0);
    });
  });

  describe("PERCEPTION dimension", () => {
    it("scores by fraction of entries with resolved process", () => {
      const g = selectLearningGenome([
        e({ processQuality: "FOLLOWED_PLAN" }),
        e({ processQuality: "BROKE_RULES" }),
        e({ processQuality: "UNRESOLVED" }),
        e({ processQuality: "UNRESOLVED" }),
      ]);
      expect(g.perception.score).toBe(0.5);
      expect(g.perception.sample_size).toBe(4);
    });

    it("scores 1.0 when every entry has resolved process", () => {
      const g = selectLearningGenome([
        e({ processQuality: "FOLLOWED_PLAN" }),
        e({ processQuality: "BROKE_RULES" }),
      ]);
      expect(g.perception.score).toBe(1);
    });
  });

  describe("REASONING dimension", () => {
    it("is undefined when no entry has resolved process (nothing to reason over)", () => {
      const g = selectLearningGenome([
        e({ processQuality: "UNRESOLVED" }),
        e({ processQuality: "UNRESOLVED" }),
      ]);
      expect(g.reasoning.score).toBeUndefined();
      expect(g.reasoning.sample_size).toBe(0);
    });

    it("scores FOLLOWED_PLAN / (FOLLOWED_PLAN + BROKE_RULES), ignoring UNRESOLVED", () => {
      const g = selectLearningGenome([
        e({ processQuality: "FOLLOWED_PLAN" }),
        e({ processQuality: "FOLLOWED_PLAN" }),
        e({ processQuality: "FOLLOWED_PLAN" }),
        e({ processQuality: "BROKE_RULES" }),
        e({ processQuality: "UNRESOLVED" }),
      ]);
      // 3 of 4 resolved followed the plan; UNRESOLVED excluded.
      expect(g.reasoning.score).toBe(0.75);
      expect(g.reasoning.sample_size).toBe(4);
    });
  });

  describe("PROCESS dimension (capture efficiency)", () => {
    it("is undefined when no entry has both realizedR and mfeR", () => {
      const g = selectLearningGenome([
        e({ realizedR: 1.5, processQuality: "FOLLOWED_PLAN" }),
        e({ mfeR: 2, processQuality: "FOLLOWED_PLAN" }),
      ]);
      expect(g.process.score).toBeUndefined();
    });

    it("averages captureEfficiency across MFE-having entries", () => {
      const g = selectLearningGenome([
        // capture = 1.0 / 2.0 = 0.5
        e({ realizedR: 1.0, mfeR: 2.0, processQuality: "FOLLOWED_PLAN" }),
        // capture = 2.0 / 2.0 = 1.0
        e({ realizedR: 2.0, mfeR: 2.0, processQuality: "FOLLOWED_PLAN" }),
        // no MFE — excluded
        e({ realizedR: 3.0, processQuality: "FOLLOWED_PLAN" }),
      ]);
      expect(g.process.score).toBe(0.75);
      expect(g.process.sample_size).toBe(2);
    });
  });

  describe("TRANSFER dimension", () => {
    it("is undefined when no plan-followed trade has realizedR", () => {
      const g = selectLearningGenome([
        e({ processQuality: "FOLLOWED_PLAN" }), // no R
        e({ realizedR: 1.5, processQuality: "BROKE_RULES" }), // wrong process
      ]);
      expect(g.transfer.score).toBeUndefined();
    });

    it("averages realizedR only across plan-followed trades", () => {
      const g = selectLearningGenome([
        e({ realizedR: 2.0, processQuality: "FOLLOWED_PLAN" }),
        e({ realizedR: -1.0, processQuality: "FOLLOWED_PLAN" }),
        e({ realizedR: 5.0, processQuality: "BROKE_RULES" }), // excluded
      ]);
      expect(g.transfer.score).toBe(0.5);
      expect(g.transfer.sample_size).toBe(2);
    });

    it("allows negative mean R — canon expects honest reporting of losing edge", () => {
      const g = selectLearningGenome([
        e({ realizedR: -2, processQuality: "FOLLOWED_PLAN" }),
        e({ realizedR: -1, processQuality: "FOLLOWED_PLAN" }),
      ]);
      expect(g.transfer.score).toBe(-1.5);
    });
  });

  describe("headlineWeakness (Founder canon example)", () => {
    it("is undefined when only ONE dimension is measured", () => {
      const g = selectLearningGenome([
        e({ processQuality: "UNRESOLVED" }),
        e({ processQuality: "UNRESOLVED" }),
      ]);
      // PERCEPTION is measured (score 0). REASONING/PROCESS/TRANSFER are not.
      // Ranking with one dimension = no comparative claim.
      expect(g.headlineWeakness).toBeUndefined();
    });

    it("is undefined on a tie across every measured dimension", () => {
      const g = selectLearningGenome([
        // Every entry: resolved + followed plan + realizedR=0 + mfeR=0
        // Would give perception=1, reasoning=1, transfer=0 — that's not a tie.
        // For a real tie: two entries where every measured dimension = 1.
        e({ processQuality: "FOLLOWED_PLAN", realizedR: 1, mfeR: 1 }),
      ]);
      // perception=1, reasoning=1, process=1, transfer=1 — all tied.
      expect(g.strongest).toBeUndefined();
      expect(g.weakest).toBeUndefined();
      expect(g.headlineWeakness).toBeUndefined();
    });

    it("emits the canon-example headline when strongest and weakest differ", () => {
      // Setup: 5 entries, PERCEPTION very strong (all resolved),
      // TRANSFER very weak (mean R negative).
      const g = selectLearningGenome([
        e({ processQuality: "FOLLOWED_PLAN", realizedR: -2, mfeR: 1 }),
        e({ processQuality: "FOLLOWED_PLAN", realizedR: -1, mfeR: 1 }),
        e({ processQuality: "FOLLOWED_PLAN", realizedR: -1.5, mfeR: 1 }),
        e({ processQuality: "FOLLOWED_PLAN", realizedR: -1, mfeR: 1 }),
        e({ processQuality: "FOLLOWED_PLAN", realizedR: -2, mfeR: 1 }),
      ]);
      expect(g.strongest).toBeDefined();
      expect(g.weakest).toBe("TRANSFER");
      expect(g.headlineWeakness).toContain("is not the bottleneck");
      expect(g.headlineWeakness).toContain("Live R capture is the weakest link");
    });

    it("resolves ties deterministically by canonical dimension order", () => {
      // Two entries: perception=1, reasoning=1 → tie for top.
      // process/transfer defined but weaker.
      const g = selectLearningGenome([
        e({ processQuality: "FOLLOWED_PLAN", realizedR: 0.1, mfeR: 1 }),
        e({ processQuality: "FOLLOWED_PLAN", realizedR: 0.1, mfeR: 1 }),
      ]);
      // Top score is tied at 1 between PERCEPTION and REASONING; canonical
      // order puts PERCEPTION first. Weakest is the lowest score dimension.
      expect(g.strongest).toBe("PERCEPTION");
    });
  });

  describe("stewardship: no NaN, no Infinity, no fake precision", () => {
    it("never returns NaN or Infinity from any dimension", () => {
      const g = selectLearningGenome([
        e({ processQuality: "FOLLOWED_PLAN", realizedR: 1, mfeR: 0 }), // 0 mfe
        e({ processQuality: "BROKE_RULES", realizedR: 2, mfeR: -1 }), // negative mfe
      ]);
      for (const d of [g.perception, g.reasoning, g.process, g.transfer]) {
        if (typeof d.score === "number") {
          expect(Number.isFinite(d.score)).toBe(true);
        }
      }
    });
  });
});
