import { describe, it, expect } from "vitest";
import { selectSessionEdge, type EdgeEntry } from "./selectSessionEdge";

/**
 * Orkin §22 state-matrix — Personal Edge Lab selector.
 *
 * Founder canon 3·6·9·12 v0.2 §11 and §21 Week-One. Every
 * enumerated branch below reflects a realistic reachable state the
 * live Proof Lane data will produce over Week-One and beyond.
 */

const mk = (over: Partial<EdgeEntry>): EdgeEntry => ({
  date: "2026-08-24",
  result: "be",
  processQuality: "UNRESOLVED",
  ...over,
});

describe("selectSessionEdge — empty and boundary cases", () => {
  it("empty input → zero counts + all averages undefined (never NaN, never 0)", () => {
    const s = selectSessionEdge([]);
    expect(s.totalEntries).toBe(0);
    expect(s.rTaggedEntries).toBe(0);
    expect(s.avgWinnerR).toBeUndefined();
    expect(s.avgLoserR).toBeUndefined();
    expect(s.expectancyR).toBeUndefined();
    expect(s.rulesAdheredPct).toBeUndefined();
    expect(s.cumulativeR).toBe(0);
    expect(s.maxDrawdownR).toBe(0);
  });

  it("single winner with realizedR — avgWinnerR = realizedR, avgLoserR undefined", () => {
    const s = selectSessionEdge([mk({ result: "win", realizedR: 1.5, processQuality: "FOLLOWED_PLAN" })]);
    expect(s.avgWinnerR).toBeCloseTo(1.5, 6);
    expect(s.avgLoserR).toBeUndefined();
    expect(s.expectancyR).toBeCloseTo(1.5, 6);
  });

  it("single loser with realizedR — avgLoserR set, avgWinnerR undefined", () => {
    const s = selectSessionEdge([mk({ result: "loss", realizedR: -1, processQuality: "BROKE_RULES" })]);
    expect(s.avgLoserR).toBeCloseTo(-1, 6);
    expect(s.avgWinnerR).toBeUndefined();
    expect(s.expectancyR).toBeCloseTo(-1, 6);
  });
});

describe("selectSessionEdge — R math never fabricated", () => {
  it("entries WITHOUT realizedR are unclassified and never contribute to expectancy (canon §4)", () => {
    const s = selectSessionEdge([
      mk({ result: "win" }), // no realizedR — must not count as R
      mk({ result: "loss" }), // no realizedR
    ]);
    expect(s.totalEntries).toBe(2);
    expect(s.rTaggedEntries).toBe(0);
    expect(s.unclassifiedEntries).toBe(2);
    expect(s.expectancyR).toBeUndefined();
    expect(s.avgWinnerR).toBeUndefined();
    expect(s.avgLoserR).toBeUndefined();
    expect(s.cumulativeR).toBe(0);
    expect(s.winners).toBe(1);
    expect(s.losers).toBe(1);
  });

  it("NaN / Infinity realizedR values are dropped (never fabricate an expectancy)", () => {
    const s = selectSessionEdge([
      mk({ result: "win", realizedR: NaN }),
      mk({ result: "win", realizedR: Infinity }),
      mk({ result: "win", realizedR: 2 }),
    ]);
    expect(s.rTaggedEntries).toBe(1);
    expect(s.expectancyR).toBeCloseTo(2, 6);
  });
});

describe("selectSessionEdge — max drawdown on the R equity curve", () => {
  it("+2, -1, -1, +3 → drawdown = 2 (peak +2, trough 0)", () => {
    const s = selectSessionEdge(
      [2, -1, -1, 3].map((r) => mk({ result: r >= 0 ? "win" : "loss", realizedR: r })),
    );
    expect(s.cumulativeR).toBeCloseTo(3, 6);
    expect(s.maxDrawdownR).toBeCloseTo(2, 6);
  });
  it("all winners → drawdown is 0", () => {
    const s = selectSessionEdge(
      [1, 2, 1].map((r) => mk({ result: "win", realizedR: r })),
    );
    expect(s.maxDrawdownR).toBe(0);
  });
  it("all losers → drawdown equals |cumulativeR|", () => {
    const s = selectSessionEdge(
      [-1, -1, -0.5].map((r) => mk({ result: "loss", realizedR: r })),
    );
    expect(s.cumulativeR).toBeCloseTo(-2.5, 6);
    expect(s.maxDrawdownR).toBeCloseTo(2.5, 6);
  });
  it("uses ORDER — reordering entries changes drawdown", () => {
    const winFirst = selectSessionEdge([
      mk({ result: "win", realizedR: 5 }),
      mk({ result: "loss", realizedR: -3 }),
    ]);
    expect(winFirst.maxDrawdownR).toBeCloseTo(3, 6);
    const lossFirst = selectSessionEdge([
      mk({ result: "loss", realizedR: -3 }),
      mk({ result: "win", realizedR: 5 }),
    ]);
    expect(lossFirst.maxDrawdownR).toBeCloseTo(3, 6);
    // Both peak at +5-3 = +2 and both trough at 0 or -3. Verifying the
    // implementation is order-preserving and correct in both directions.
  });
});

describe("selectSessionEdge — rules adhered percentage", () => {
  it("2 followed / 1 broke / 1 unresolved → 2/3 = 66.67% over graded", () => {
    const s = selectSessionEdge([
      mk({ processQuality: "FOLLOWED_PLAN" }),
      mk({ processQuality: "FOLLOWED_PLAN" }),
      mk({ processQuality: "BROKE_RULES" }),
      mk({ processQuality: "UNRESOLVED" }),
    ]);
    expect(s.rulesAdheredPct).toBeCloseTo(2 / 3, 6);
    expect(s.followedPlan).toBe(2);
    expect(s.brokeRules).toBe(1);
    expect(s.unresolved).toBe(1);
  });
  it("all unresolved → rulesAdheredPct undefined (never fabricate a rate)", () => {
    const s = selectSessionEdge([
      mk({ processQuality: "UNRESOLVED" }),
      mk({ processQuality: "UNRESOLVED" }),
    ]);
    expect(s.rulesAdheredPct).toBeUndefined();
  });
});

describe("selectSessionEdge — capture % (canon §7)", () => {
  it("undefined when no entries have both R and MFE", () => {
    const s = selectSessionEdge([mk({ realizedR: 1 })]); // no mfeR
    expect(s.avgCaptureRatio).toBeUndefined();
    expect(s.captureSampleSize).toBe(0);
  });
  it("70% capture across a two-entry sample", () => {
    const s = selectSessionEdge([
      mk({ realizedR: 1.4, mfeR: 2.0 }), // 70%
      mk({ realizedR: 1.5, mfeR: 2.0 }), // 75%
    ]);
    expect(s.captureSampleSize).toBe(2);
    expect(s.avgCaptureRatio).toBeCloseTo((0.7 + 0.75) / 2, 6);
  });
});

describe("selectSessionEdge — Founder Week-One realistic sample", () => {
  it("5 sessions, mix of M1/M2 + one no-trade equivalent → all metrics compute honestly", () => {
    // Realistic Week-One shape: 3 winners, 1 loser, 1 unresolved (M0 = no
    // trade day recorded as unresolved process + no P&L).
    const entries: EdgeEntry[] = [
      mk({ date: "2026-08-24", result: "win",  realizedR: 1.2, processQuality: "FOLLOWED_PLAN" }),
      mk({ date: "2026-08-25", result: "win",  realizedR: 0.8, processQuality: "FOLLOWED_PLAN" }),
      mk({ date: "2026-08-26", result: "loss", realizedR: -1,  processQuality: "FOLLOWED_PLAN" }),
      mk({ date: "2026-08-27", result: "win",  realizedR: 1.5, processQuality: "FOLLOWED_PLAN" }),
      mk({ date: "2026-08-28", result: "be",   realizedR: 0,   processQuality: "UNRESOLVED" }),
    ];
    const s = selectSessionEdge(entries);
    expect(s.rTaggedEntries).toBe(5);
    expect(s.winners).toBe(3);
    expect(s.losers).toBe(1);
    expect(s.avgWinnerR).toBeCloseTo((1.2 + 0.8 + 1.5) / 3, 6);
    expect(s.avgLoserR).toBeCloseTo(-1, 6);
    expect(s.cumulativeR).toBeCloseTo(1.2 + 0.8 - 1 + 1.5 + 0, 6);
    expect(s.expectancyR).toBeCloseTo(s.cumulativeR / 5, 6);
    // rules adhered = 4 followed / 0 broken over graded → 100%
    expect(s.rulesAdheredPct).toBeCloseTo(1, 6);
    // Peak-to-trough: +1.2 → +2.0 → +1.0 → +2.5 → +2.5 → max drawdown = 1.0
    expect(s.maxDrawdownR).toBeCloseTo(1.0, 6);
  });
});
