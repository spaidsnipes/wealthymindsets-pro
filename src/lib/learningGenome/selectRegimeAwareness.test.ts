import { describe, it, expect } from "vitest";

import { selectRegimeAwareness } from "./selectRegimeAwareness";

describe("selectRegimeAwareness — canon §Regime step 1", () => {
  it("empty → all zeros / undefined rate", () => {
    const r = selectRegimeAwareness([]);
    expect(r.sample_size).toBe(0);
    expect(r.tagged_count).toBe(0);
    expect(r.regime_tag_rate).toBeUndefined();
    expect(r.consistent_days).toBe(0);
    expect(r.mixed_regime_days).toBe(0);
  });

  it("all untagged → tag_rate 0, no day-level signal", () => {
    const r = selectRegimeAwareness([
      { date: "2026-08-25" },
      { date: "2026-08-25", regime: "" },
      { date: "2026-08-25", regime: "   " },
    ]);
    expect(r.tagged_count).toBe(0);
    expect(r.regime_tag_rate).toBe(0);
    expect(r.days_measured).toBe(0);
  });

  it("all tagged same regime same day → 1 consistent day", () => {
    const r = selectRegimeAwareness([
      { date: "2026-08-25", regime: "BULL" },
      { date: "2026-08-25", regime: "BULL" },
      { date: "2026-08-25", regime: "BULL" },
    ]);
    expect(r.regime_tag_rate).toBe(1);
    expect(r.consistent_days).toBe(1);
    expect(r.mixed_regime_days).toBe(0);
  });

  it("mixed regime tags same day → 1 mixed day (canon violation)", () => {
    const r = selectRegimeAwareness([
      { date: "2026-08-25", regime: "BULL" },
      { date: "2026-08-25", regime: "BEAR" },
    ]);
    expect(r.consistent_days).toBe(0);
    expect(r.mixed_regime_days).toBe(1);
  });

  it("case-insensitive comparison (BULL == bull)", () => {
    const r = selectRegimeAwareness([
      { date: "2026-08-25", regime: "BULL" },
      { date: "2026-08-25", regime: "bull" },
      { date: "2026-08-25", regime: "Bull" },
    ]);
    expect(r.mixed_regime_days).toBe(0);
    expect(r.consistent_days).toBe(1);
  });

  it("multiple days with different regimes each consistent", () => {
    const r = selectRegimeAwareness([
      { date: "2026-08-25", regime: "BULL" },
      { date: "2026-08-24", regime: "BEAR" },
      { date: "2026-08-23", regime: "SIDE" },
    ]);
    expect(r.consistent_days).toBe(3);
    expect(r.mixed_regime_days).toBe(0);
    expect(r.days_measured).toBe(3);
  });

  it("partial tagging affects rate but not day consistency count", () => {
    const r = selectRegimeAwareness([
      { date: "2026-08-25", regime: "BULL" },
      { date: "2026-08-25" }, // untagged
      { date: "2026-08-24", regime: "BEAR" },
    ]);
    expect(r.regime_tag_rate).toBeCloseTo(2 / 3);
    expect(r.consistent_days).toBe(2);
    expect(r.mixed_regime_days).toBe(0);
  });

  it("empty date is skipped even if regime tagged", () => {
    const r = selectRegimeAwareness([
      { date: "", regime: "BULL" },
      { date: "2026-08-25", regime: "BULL" },
    ]);
    // Both count as tagged (regime present), but empty-date entry can't be grouped.
    expect(r.tagged_count).toBe(2);
    expect(r.days_measured).toBe(1);
  });
});
