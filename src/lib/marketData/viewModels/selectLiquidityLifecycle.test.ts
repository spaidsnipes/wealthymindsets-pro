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
    const pool = v.pools[0];
    expect(pool.low).toBeGreaterThan(99.8);
    expect(pool.high).toBeLessThan(100.2);
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
});
