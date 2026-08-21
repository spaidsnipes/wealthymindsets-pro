import { describe, it, expect } from "vitest";
import {
  computeDeltaLevels,
  priceStepFor,
  quantizePrice,
  type DeltaTick,
} from "./deltaLevels";

function tick(price: number, size: number, side: "buy" | "sell"): DeltaTick {
  return { price, size, side, trade: true };
}

describe("priceStepFor / quantizePrice", () => {
  it("gives a stable magnitude-appropriate step", () => {
    expect(priceStepFor(64_000)).toBe(5);
    expect(priceStepFor(400)).toBe(0.1);
    expect(priceStepFor(42)).toBe(0.05);
    expect(priceStepFor(1.2)).toBe(0.005);
    expect(priceStepFor(0.08)).toBe(0.0005);
  });

  it("quantizes onto the grid with clean decimals", () => {
    expect(quantizePrice(402.37, 0.1)).toBe(402.4);
    expect(quantizePrice(64_003, 5)).toBe(64_005);
    expect(quantizePrice(1.2034, 0.005)).toBe(1.205);
  });
});

describe("computeDeltaLevels — STABLE LEVEL OWNERSHIP (canon §11)", () => {
  it("the SAME price maps to the SAME level regardless of the tick window", () => {
    // Window A: prices clustered 400.0..400.3
    const a = computeDeltaLevels([tick(400.02, 10, "buy"), tick(400.31, 5, "sell")], { referencePrice: 400 });
    // Window B: a much wider window that includes the same 400.0 price
    const b = computeDeltaLevels(
      [tick(400.02, 10, "buy"), tick(405.0, 5, "sell"), tick(395.0, 3, "buy")],
      { referencePrice: 400 },
    );
    const a400 = a.find((l) => l.price === 400.0);
    const b400 = b.find((l) => l.price === 400.0);
    expect(a400).toBeDefined();
    expect(b400).toBeDefined();
    // The 400.00 level owns the same price in BOTH windows — it did not shift
    // when the window widened (the old min/max bucketer would have moved it).
    expect(a400!.price).toBe(b400!.price);
  });

  it("accumulating more ticks at a level ADDS to it, never reshuffles boundaries", () => {
    const one = computeDeltaLevels([tick(400.04, 10, "buy")], { referencePrice: 400 });
    const two = computeDeltaLevels([tick(400.04, 10, "buy"), tick(400.03, 6, "buy")], { referencePrice: 400 });
    // Both 400.03 and 400.04 quantize to 400.0 (step 0.1) — same owning level,
    // volume accumulates, price unchanged.
    expect(one[0].price).toBe(400.0);
    expect(two[0].price).toBe(400.0);
    expect(two[0].vol).toBe(16);
  });

  it("nets delta per level (buy - sell)", () => {
    const levels = computeDeltaLevels(
      [tick(400.01, 30, "buy"), tick(400.02, 12, "sell")],
      { referencePrice: 400 },
    );
    const l = levels.find((x) => x.price === 400.0)!;
    expect(l.delta).toBe(18); // 30 - 12
    expect(l.vol).toBe(42);
  });

  it("honors the user cap — never more than `cap` levels (bounded count)", () => {
    const ticks: DeltaTick[] = [];
    for (let i = 0; i < 30; i++) ticks.push(tick(400 + i * 0.2, 5 + i, i % 2 ? "buy" : "sell"));
    expect(computeDeltaLevels(ticks, { referencePrice: 400, cap: 5 }).length).toBeLessThanOrEqual(5);
    expect(computeDeltaLevels(ticks, { referencePrice: 400, cap: 10 }).length).toBeLessThanOrEqual(10);
  });

  it("keeps the MOST-TRADED levels when capped (stable, meaningful selection)", () => {
    const levels = computeDeltaLevels(
      [
        tick(400.0, 100, "buy"), // heavy
        tick(401.0, 2, "sell"),  // light
        tick(402.0, 90, "buy"),  // heavy
        tick(403.0, 1, "buy"),   // light
      ],
      { referencePrice: 400, cap: 2 },
    );
    const prices = levels.map((l) => l.price).sort();
    expect(prices).toEqual([400.0, 402.0]); // the two heaviest, not the light ones
  });

  it("returns top-of-book first (price descending)", () => {
    const levels = computeDeltaLevels(
      [tick(400.0, 10, "buy"), tick(405.0, 10, "buy"), tick(402.0, 10, "buy")],
      { referencePrice: 400, cap: 10 },
    );
    expect(levels.map((l) => l.price)).toEqual([405.0, 402.0, 400.0]);
  });

  it("never invents a level — no trades → empty", () => {
    expect(computeDeltaLevels([], { referencePrice: 400 })).toEqual([]);
    expect(computeDeltaLevels([{ price: 400, size: 10, side: "buy" }], { referencePrice: 400 })).toEqual([]); // not trade:true
    expect(computeDeltaLevels([tick(400, 0, "buy"), tick(-1, 5, "sell")], { referencePrice: 400 })).toEqual([]);
  });

  it("is deterministic — identical ticks, identical output", () => {
    const ticks = [tick(400.02, 10, "buy"), tick(401.03, 5, "sell")];
    expect(computeDeltaLevels(ticks, { referencePrice: 400 })).toEqual(computeDeltaLevels(ticks, { referencePrice: 400 }));
  });
});
