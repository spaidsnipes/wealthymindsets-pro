import { describe, it, expect } from "vitest";
import {
  requiredCompoundRate,
  paceForHorizon,
  theoreticalBalanceAtSession,
  paceStatus,
  CANONICAL_HORIZONS,
  PACE_TRUTH_LABEL,
  WEEKS_PER_MONTH,
  SESSIONS_PER_MONTH,
  normalizeSessionIndex,
} from "./proofLanePace";

/**
 * Canon-compliance tests for proofLanePace.
 *
 * Every numeric expectation traces back to canon §9 or §24 of the
 * "3·6·9·12 Challenge Engine — Invention Canon v0.2".
 */

describe("proofLanePace — canon §9 required weekly rate", () => {
  const cases: Array<[2 | 3 | 4 | 6 | 9 | 12, number]> = [
    [2, 1.886],
    [3, 1.027],
    [4, 0.699],
    [6, 0.424],
    [9, 0.266],
    [12, 0.193],
  ];
  for (const [months, expectedWeeklyRate] of cases) {
    it(`${months}mo horizon requires ~${(expectedWeeklyRate * 100).toFixed(1)}% weekly compound`, () => {
      const row = paceForHorizon(months);
      expect(row.weeklyRate).toBeCloseTo(expectedWeeklyRate, 2);
    });
  }
});

describe("proofLanePace — canon §24 required session rate (21 sessions/mo)", () => {
  const cases: Array<[2 | 3 | 4 | 6 | 9 | 12, number]> = [
    [2, 0.245],
    [3, 0.157],
    [4, 0.116],
    [6, 0.076],
    [9, 0.050],
    [12, 0.037],
  ];
  for (const [months, expectedSessionRate] of cases) {
    it(`${months}mo horizon requires ~${(expectedSessionRate * 100).toFixed(1)}% per session`, () => {
      const row = paceForHorizon(months);
      expect(row.sessionRate).toBeCloseTo(expectedSessionRate, 2);
    });
  }
});

describe("proofLanePace — mathematical guarantees", () => {
  it("theoreticalBalance at session 0 equals start", () => {
    expect(theoreticalBalanceAtSession(6, 0)).toBeCloseTo(100, 6);
  });
  it("theoreticalBalance at final session equals target ($1M) within rounding", () => {
    for (const h of CANONICAL_HORIZONS) {
      const final = theoreticalBalanceAtSession(h, h * SESSIONS_PER_MONTH);
      expect(final).toBeCloseTo(1_000_000, 0);
    }
  });
  it("balances are monotonically increasing (compound growth, not additive)", () => {
    let prev = -Infinity;
    for (let s = 0; s <= 63; s++) {
      const bal = theoreticalBalanceAtSession(3, s);
      expect(bal).toBeGreaterThan(prev);
      prev = bal;
    }
  });
  it("requiredCompoundRate is inverse of geometric growth", () => {
    const r = requiredCompoundRate(100, 1_000_000, 63);
    expect(100 * Math.pow(1 + r, 63)).toBeCloseTo(1_000_000, 0);
  });
  it("guards against non-positive inputs", () => {
    expect(() => requiredCompoundRate(0, 1_000_000, 63)).toThrow();
    expect(() => requiredCompoundRate(100, 0, 63)).toThrow();
    expect(() => requiredCompoundRate(100, 1_000_000, 0)).toThrow();
    expect(() => theoreticalBalanceAtSession(3, -1)).toThrow();
  });
  it("caps past-horizon session at target", () => {
    expect(theoreticalBalanceAtSession(3, 999)).toBe(1_000_000);
  });
  it("rejects fractional and non-finite session chronology", () => {
    expect(() => theoreticalBalanceAtSession(3, 1.5)).toThrow(/whole session/);
    expect(() => theoreticalBalanceAtSession(3, Number.NaN)).toThrow(/whole session/);
  });
  it("normalizes UI chronology into the selected lane", () => {
    expect(normalizeSessionIndex(-1, 3)).toBe(0);
    expect(normalizeSessionIndex(1.9, 3)).toBe(1);
    expect(normalizeSessionIndex(999, 3)).toBe(63);
    expect(normalizeSessionIndex(Number.NaN, 3)).toBe(0);
  });
});

describe("proofLanePace — pace status Catch-Up Compass (canon §12)", () => {
  it("ON_PACE when actual matches theoretical within tolerance", () => {
    const r = paceStatus(6, 21, theoreticalBalanceAtSession(6, 21));
    expect(r.status).toBe("ON_PACE");
    expect(r.humanMessage).toContain("Setup standard unchanged");
  });
  it("AHEAD when actual materially exceeds theoretical", () => {
    const th = theoreticalBalanceAtSession(6, 21);
    const r = paceStatus(6, 21, th * 1.2);
    expect(r.status).toBe("AHEAD");
    expect(r.differenceRatio).toBeGreaterThan(0.15);
    expect(r.humanMessage).toContain("Setup standard unchanged");
  });
  it("BEHIND emits canon §12 required interface language — NEVER a 'risk more' suggestion", () => {
    const th = theoreticalBalanceAtSession(6, 21);
    const r = paceStatus(6, 21, th * 0.5);
    expect(r.status).toBe("BEHIND");
    expect(r.humanMessage).toContain("Behind theoretical lane");
    expect(r.humanMessage).toContain("Timeline recalculated");
    expect(r.humanMessage).toContain("Do not increase risk");
    // Rejection guarantee: no encouragement to force wins to catch up.
    expect(r.humanMessage.toLowerCase()).not.toContain("catch up");
    expect(r.humanMessage.toLowerCase()).not.toContain("more wins");
  });
});

describe("proofLanePace — canon §13 truth label", () => {
  it("emits THEORETICAL as the truth label constant", () => {
    expect(PACE_TRUTH_LABEL).toBe("THEORETICAL");
  });
  it("uses canon §9 constants: 4.345 weeks/month, canon §24 21 sessions/month", () => {
    expect(WEEKS_PER_MONTH).toBe(4.345);
    expect(SESSIONS_PER_MONTH).toBe(21);
  });
});
