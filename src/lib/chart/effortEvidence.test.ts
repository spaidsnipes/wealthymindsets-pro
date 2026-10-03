import { describe, expect, it } from "vitest";

import { cellFor, readResponseMatrix, readTemporalEvidenceDensity, type EvidenceBar } from "./effortEvidence";

const b = (range: number, volume: number): EvidenceBar => ({ high: 100 + range, low: 100, volume });

describe("Temporal Evidence Density", () => {
  it("needs real volume and a minimum sample", () => {
    expect(readTemporalEvidenceDensity(Array(50).fill(b(1, 0)))).toBeNull();
    expect(readTemporalEvidenceDensity(Array(10).fill(b(1, 5)))).toBeNull();
  });
  it("an even tape spreads evidence evenly; a lumpy one concentrates it", () => {
    const even = readTemporalEvidenceDensity(Array(50).fill(b(1, 10)))!;
    expect(even.topFifthShare).toBeCloseTo(0.2, 2);
    expect(even.thinBars).toBe(0);
    const lumpy = readTemporalEvidenceDensity([...Array(40).fill(b(1, 1)), ...Array(9).fill(b(1, 50)), b(1, 100)])!;
    expect(lumpy.topFifthShare).toBeGreaterThan(0.9);
    expect(lumpy.newestDensity).toBe(100);
  });
});

describe("Response Matrix", () => {
  it("sorts effort × response into the four cells", () => {
    expect(cellFor(2, 0.5)).toBe("ABSORBED");
    expect(cellFor(2, 2)).toBe("INITIATIVE");
    expect(cellFor(0.5, 2)).toBe("VACUUM");
    expect(cellFor(0.5, 0.5)).toBe("QUIET");
    expect(cellFor(1, 1)).toBe("ORDINARY");
  });
  it("counts the window and names the newest bar's cell", () => {
    const m = readResponseMatrix([...Array(40).fill(b(1, 10)), b(0.3, 30)])!;
    expect(m.sample).toBe(41);
    expect(m.counts.ORDINARY).toBe(40);
    expect(m.newest).toBe("ABSORBED");
    expect(m.newestEffort).toBe(3);
  });
});
