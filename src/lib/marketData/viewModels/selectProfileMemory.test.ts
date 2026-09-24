import { describe, expect, it } from "vitest";

import selectProfileMemory, { MAX_MEMORY_SESSIONS } from "./selectProfileMemory";
import selectValueMigration from "./selectValueMigration";

const bar = (time: number, low: number, high: number, volume = 100) => ({
  time, open: low, high, low, close: high, volume,
});

/** `days` sessions of 10 one-minute bars; session d balances at base + d*2. */
function days(n: number, baseFor = (d: number) => 100 + d * 2) {
  const out = [];
  for (let d = 0; d < n; d++) {
    const base = baseFor(d);
    for (let i = 0; i < 10; i++) out.push(bar(d * 100_000 + i * 60, base, base + 1));
  }
  return out;
}

const memory = (bars: ReturnType<typeof days>) => selectProfileMemory(selectValueMigration(bars), bars);

describe("refusals", () => {
  it("no migration and a single session are named", () => {
    expect(selectProfileMemory(null, []).reason).toBe("NO_MIGRATION");
    expect(memory(days(1)).reason).toBe("NO_PRIOR_SESSION");
  });
});

describe("what it remembers", () => {
  it("remembers each completed session's FINAL migration value — never the current one", () => {
    const bars = days(3);
    const mig = selectValueMigration(bars);
    const v = selectProfileMemory(mig, bars);
    expect(v.sessionsRemembered).toBe(2);
    const s1 = mig.points.filter(p => p.session === 1).at(-1)!;
    const poc1 = v.levels.find(l => l.kind === "POC" && l.sessionsAgo === 1)!;
    expect(poc1.price).toBe(s1.poc);
    expect(poc1.formedAt).toBe(s1.time);
    expect(v.levels.some(l => l.sessionsAgo === 0)).toBe(false);
  });

  it("a level the market never returned to is NAKED; one it traded through counts tests", () => {
    // Day 0 at 100–101, day 1 higher at 102–103 (never back), day 2 back at 100–101.
    const bars = days(3, d => (d === 1 ? 102 : 100));
    const v = memory(bars);
    const day1Poc = v.levels.find(l => l.kind === "POC" && l.sessionsAgo === 1)!;
    const day0Poc = v.levels.find(l => l.kind === "POC" && l.sessionsAgo === 2)!;
    expect(day1Poc.naked).toBe(true);
    expect(day1Poc.tests).toBe(0);
    expect(day0Poc.naked).toBe(false);
    expect(day0Poc.tests).toBeGreaterThan(0);
    expect(day0Poc.firstTestAt).toBe(2 * 100_000);
  });

  it("caps memory at MAX_MEMORY_SESSIONS, newest first", () => {
    const v = memory(days(MAX_MEMORY_SESSIONS + 3));
    expect(v.sessionsRemembered).toBe(MAX_MEMORY_SESSIONS);
    const ages = [...new Set(v.levels.map(l => l.sessionsAgo))];
    expect(ages).toEqual([1, 2, 3, 4, 5]);
  });

  it("tests are counted only AFTER the level formed", () => {
    const v = memory(days(2, () => 100));
    const poc = v.levels.find(l => l.kind === "POC")!;
    // Day 1 trades the same range, so every day-1 bar tests it — and no
    // day-0 bar may count as a test of its own session's value.
    expect(poc.tests).toBe(10);
  });
});
