import { describe, it, expect } from "vitest";
import { shufflePick } from "./shufflePick";

/**
 * Academy knowledge-check selection.
 *
 * The page promises "Different questions every retake". The old draw used
 * `sort(() => Math.random() - 0.5)`, whose comparator is inconsistent, so
 * elements stayed near their original positions and `slice(0, 10)` returned
 * the same early questions while the bank's tail was effectively unreachable.
 *
 * Measured over 20,000 trials (24-question bank, pick 10):
 *   comparator sort → first 2.39x expected, LAST 0.00x
 *   Fisher-Yates    → first 1.01x, last 1.02x
 */
describe("shufflePick", () => {
  const bank = Array.from({ length: 24 }, (_, i) => i);

  it("returns the requested count without duplicates", () => {
    const out = shufflePick(bank, 10);
    expect(out).toHaveLength(10);
    expect(new Set(out).size).toBe(10);
  });

  it("never invents an item outside the bank", () => {
    for (const v of shufflePick(bank, 10)) expect(bank).toContain(v);
  });

  it("clamps to the bank when asked for more than exists", () => {
    expect(shufflePick(bank, 999)).toHaveLength(bank.length);
    expect(shufflePick([], 5)).toEqual([]);
    expect(shufflePick(bank, 0)).toEqual([]);
    expect(shufflePick(bank, -3)).toEqual([]);
  });

  it("is deterministic under an injected rng", () => {
    const seq = [0.1, 0.9, 0.3, 0.7, 0.5, 0.2, 0.8, 0.4, 0.6, 0.05,
                 0.95, 0.15, 0.85, 0.25, 0.75, 0.35, 0.65, 0.45, 0.55, 0.5,
                 0.1, 0.2, 0.3];
    let i = 0;
    const rng = () => seq[i++ % seq.length]!;
    let j = 0;
    const rng2 = () => seq[j++ % seq.length]!;
    expect(shufflePick(bank, 10, rng)).toEqual(shufflePick(bank, 10, rng2));
  });

  /* The property the old implementation actually failed. */
  it("every question in the bank is reachable — no unreachable tail", () => {
    const seen = new Set<number>();
    for (let t = 0; t < 3000; t++) for (const v of shufflePick(bank, 10)) seen.add(v);
    // The comparator sort left the final entries at ~0x expected frequency.
    expect(seen.size).toBe(bank.length);
  });

  it("selects roughly uniformly across the bank", () => {
    const TRIALS = 6000, PICK = 10;
    const counts = new Array(bank.length).fill(0);
    for (let t = 0; t < TRIALS; t++) for (const v of shufflePick(bank, PICK)) counts[v]++;
    const expected = (TRIALS * PICK) / bank.length;
    // Generous bound: uniform sits at 1.0x; the old draw hit 2.39x and 0.00x.
    for (const c of counts) {
      expect(c / expected).toBeGreaterThan(0.75);
      expect(c / expected).toBeLessThan(1.25);
    }
  });

  it("does not mutate the caller's bank", () => {
    const original = [...bank];
    shufflePick(bank, 10);
    expect(bank).toEqual(original);
  });
});
