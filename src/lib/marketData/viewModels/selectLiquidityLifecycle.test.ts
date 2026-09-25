import { describe, expect, it } from "vitest";
import selectLiquidityLifecycle, { PULLED_REFUSAL } from "./selectLiquidityLifecycle";

// A market that builds volume at 100, leaves up to ~103, comes back to 100
// (touch), trades there again (refill), then breaks down through it (consume).
function bars() {
  const out: { time: number; high: number; low: number; close: number; volume: number }[] = [];
  let t = 0;
  const push = (lo: number, hi: number, c: number, v: number) => out.push({ time: (t += 60), low: lo, high: hi, close: c, volume: v });
  for (let i = 0; i < 16; i++) push(99.9, 100.1, 100, 5000);        // build the pool
  for (let i = 0; i < 8; i++) push(101 + i * 0.2, 101.3 + i * 0.2, 101.2 + i * 0.2, 800); // leave up
  for (let i = 0; i < 6; i++) push(99.9, 100.1, 100, 6000);         // return: touch + refill
  for (let i = 0; i < 6; i++) push(97.8 - i * 0.2, 98.1 - i * 0.2, 97.9 - i * 0.2, 900); // break down, stay below
  return out;
}

describe("Liquidity lifecycle — measured stages, PULLED refused", () => {
  it("walks a pool through appeared → persisted → touched → refilled → consumed", () => {
    const v = selectLiquidityLifecycle(bars());
    expect(v.drawn).toBe(true);
    // Found by its price, not its rank: live pools now rank first, and the
    // one this walk follows ends CONSUMED.
    const pool = v.pools.find(p => p.low > 99.8 && p.high < 100.2)!;
    expect(pool).toBeDefined();
    const stages = pool.events.map(e => e.stage);
    expect(stages[0]).toBe("APPEARED");
    expect(stages).toContain("PERSISTED");
    expect(stages).toContain("TOUCHED");
    expect(stages).toContain("REFILLED");
    expect(pool.stage).toBe("CONSUMED");
  });
  it("never calls a pool PULLED and says why; basis is candle-estimated", () => {
    const v = selectLiquidityLifecycle(bars());
    expect(JSON.stringify(v.pools)).not.toContain("PULLED");
    expect(v.pulledRefusal).toBe(PULLED_REFUSAL);
    expect(v.basis).toBe("CANDLE_ESTIMATED");
  });
  it("refuses on too few bars or no volume", () => {
    expect(selectLiquidityLifecycle(bars().slice(0, 5)).reason).toBe("TOO_FEW_BARS");
    expect(selectLiquidityLifecycle(bars().map(b => ({ ...b, volume: 0 }))).reason).toBe("NO_VOLUME");
  });

  it("a pool still standing outranks heavier consumed ones (the glass shows live liquidity)", () => {
    // Six heavy pools built and consumed early, then one light pool that is
    // still standing at the end. Ranked by volume alone the live one was cut.
    const out: { time: number; high: number; low: number; close: number; volume: number }[] = [];
    let t = 0;
    const push = (lo: number, hi: number, c: number, v: number) => out.push({ time: (t += 60), low: lo, high: hi, close: c, volume: v });
    for (let k = 0; k < 7; k++) {
      const base = 100 + k * 10;
      for (let i = 0; i < 16; i++) push(base - 0.1, base + 0.1, base, 9000 - k * 100); // build
      for (let i = 0; i < 6; i++) push(base + 1, base + 1.3, base + 1.2, 500);       // leave up
      for (let i = 0; i < 6; i++) push(base - 0.1, base + 0.1, base, 9000);          // touch
      for (let i = 0; i < 6; i++) push(base - 2.1, base - 1.8, base - 2, 300);       // break below
    }
    const live = 300;
    for (let i = 0; i < 24; i++) push(live - 0.1, live + 0.1, live, 5000);          // lighter than every consumed pool, still standing
    const v = selectLiquidityLifecycle(out);
    expect(v.drawn).toBe(true);
    const standing = v.pools.filter(p => p.stage !== "CONSUMED");
    expect(standing.length).toBeGreaterThan(0);
    expect(v.pools[0].stage).not.toBe("CONSUMED");
    expect(v.pools.some(p => Math.abs(p.price - live) < 1)).toBe(true);
  });
});
