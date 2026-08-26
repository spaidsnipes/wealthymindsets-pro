import { describe, it, expect } from "vitest";

import { selectAnalysisMaturity } from "./selectAnalysisMaturity";

describe("selectAnalysisMaturity — canon §6 ANALYSIS MATURITY", () => {
  it("INSUFFICIENT_INPUT when no signals provided", () => {
    const r = selectAnalysisMaturity({});
    expect(r.verdict).toBe("INSUFFICIENT_INPUT");
    expect(r.threshold).toBe(2); // canon default
  });

  it("FULFILLED wins priority when destinationReached=true", () => {
    const r = selectAnalysisMaturity({
      destinationReached: true,
      structuralInvalidationHit: true, // both true — destination wins
      progressionEvidenceCount: 0,
    });
    expect(r.verdict).toBe("FULFILLED");
  });

  it("WRONG when structuralInvalidationHit=true + no destination", () => {
    const r = selectAnalysisMaturity({
      structuralInvalidationHit: true,
      destinationReached: false,
      progressionEvidenceCount: 5,
    });
    expect(r.verdict).toBe("WRONG");
  });

  it("ACTIVE when progression >= threshold (default 2) + no invalidation + no destination", () => {
    const r = selectAnalysisMaturity({
      progressionEvidenceCount: 2,
      destinationReached: false,
    });
    expect(r.verdict).toBe("ACTIVE");
  });

  it("EARLY when progression < threshold + no invalidation + no destination", () => {
    const r = selectAnalysisMaturity({
      progressionEvidenceCount: 1,
      destinationReached: false,
      structuralInvalidationHit: false,
    });
    expect(r.verdict).toBe("EARLY");
  });

  it("EARLY when only destinationReached=false is provided (evidence count treated as 0)", () => {
    const r = selectAnalysisMaturity({ destinationReached: false });
    expect(r.verdict).toBe("EARLY");
  });

  it("respects custom progressionEvidenceThreshold", () => {
    const r = selectAnalysisMaturity({
      progressionEvidenceCount: 3,
      progressionEvidenceThreshold: 5,
    });
    expect(r.verdict).toBe("EARLY");
    expect(r.threshold).toBe(5);
  });

  it("invalid custom threshold falls back to canon default 2", () => {
    for (const bad of [0, -1, Number.NaN, Infinity]) {
      const r = selectAnalysisMaturity({
        progressionEvidenceCount: 2,
        progressionEvidenceThreshold: bad,
      });
      expect(r.threshold).toBe(2);
      expect(r.verdict).toBe("ACTIVE");
    }
  });

  it("Non-finite progression count treated as 0", () => {
    const r = selectAnalysisMaturity({
      progressionEvidenceCount: Number.NaN,
      structuralInvalidationHit: false,
    });
    expect(r.verdict).toBe("EARLY");
    expect(r.progression_evidence_count).toBe(0);
  });

  it("Every verdict carries a canon anchor", () => {
    for (const input of [
      {},
      { destinationReached: true },
      { structuralInvalidationHit: true },
      { progressionEvidenceCount: 5 },
      { progressionEvidenceCount: 0, destinationReached: false },
    ]) {
      const r = selectAnalysisMaturity(input);
      expect(r.canon).toContain("§6");
    }
  });
});
