import { describe, it, expect } from "vitest";
import {
  selectMemoryFreshness,
  MEMORY_ACTIVE_MAX_MS,
  MEMORY_AGING_MAX_MS,
  type DecisionTimeLike,
} from "./selectMemoryFreshness";

const NOW = 1_755_400_000_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

function d(capturedAt: number, extra: Partial<DecisionTimeLike> = {}): DecisionTimeLike {
  return { capturedAt, ...extra };
}

describe("selectMemoryFreshness", () => {
  it("EMPTY when there are no decisions (never fabricates activity)", () => {
    const f = selectMemoryFreshness([], NOW);
    expect(f.state).toBe("EMPTY");
    expect(f.count).toBe(0);
    expect(f.lastActivityAtMs).toBeNull();
    expect(f.ageMs).toBeNull();
  });

  it("ACTIVE when last activity is under a day", () => {
    const f = selectMemoryFreshness([d(NOW - 3 * HOUR)], NOW);
    expect(f.state).toBe("ACTIVE");
    expect(f.ageMs).toBe(3 * HOUR);
    expect(f.count).toBe(1);
    expect(f.openCount).toBe(1);      // no outcome
    expect(f.reviewedCount).toBe(0);
  });

  it("AGING between 1 and 7 days", () => {
    expect(selectMemoryFreshness([d(NOW - 3 * DAY)], NOW).state).toBe("AGING");
  });

  it("DORMANT at/after 7 days", () => {
    expect(selectMemoryFreshness([d(NOW - 8 * DAY)], NOW).state).toBe("DORMANT");
  });

  it("uses the MOST RECENT of captured/closed/reviewed as last activity", () => {
    // captured old, but reviewed recently → ACTIVE from the review time.
    const f = selectMemoryFreshness(
      [d(NOW - 10 * DAY, { outcome: { closedAt: NOW - 9 * DAY }, review: { reviewedAt: NOW - 2 * HOUR } })],
      NOW,
    );
    expect(f.lastActivityAtMs).toBe(NOW - 2 * HOUR);
    expect(f.state).toBe("ACTIVE");
    expect(f.reviewedCount).toBe(1);
    expect(f.openCount).toBe(0); // has outcome
  });

  it("counts reviewed vs open across a mixed set", () => {
    const f = selectMemoryFreshness(
      [
        d(NOW - HOUR, { outcome: { closedAt: NOW - 30 * 60_000 }, review: { reviewedAt: NOW - 10 * 60_000 } }),
        d(NOW - 2 * HOUR, { outcome: { closedAt: NOW - HOUR } }), // closed, unreviewed
        d(NOW - 3 * HOUR), // open
      ],
      NOW,
    );
    expect(f.count).toBe(3);
    expect(f.reviewedCount).toBe(1);
    expect(f.openCount).toBe(1); // only the one with no outcome
  });

  it("clamps age to 0 under clock skew (future timestamp)", () => {
    const f = selectMemoryFreshness([d(NOW + 5 * HOUR)], NOW);
    expect(f.ageMs).toBe(0);
    expect(f.state).toBe("ACTIVE");
  });

  it("decisions with no valid timestamp are DORMANT, never ACTIVE", () => {
    const f = selectMemoryFreshness([d(0), d(-1)], NOW);
    expect(f.lastActivityAtMs).toBeNull();
    expect(f.state).toBe("DORMANT");
    expect(f.count).toBe(2);
  });

  it("threshold boundaries are exact", () => {
    expect(selectMemoryFreshness([d(NOW - (MEMORY_ACTIVE_MAX_MS - 1))], NOW).state).toBe("ACTIVE");
    expect(selectMemoryFreshness([d(NOW - MEMORY_ACTIVE_MAX_MS)], NOW).state).toBe("AGING");
    expect(selectMemoryFreshness([d(NOW - (MEMORY_AGING_MAX_MS - 1))], NOW).state).toBe("AGING");
    expect(selectMemoryFreshness([d(NOW - MEMORY_AGING_MAX_MS)], NOW).state).toBe("DORMANT");
  });

  it("is pure — identical input, identical output", () => {
    const input = [d(NOW - HOUR, { review: { reviewedAt: NOW - 30 * 60_000 } })];
    expect(selectMemoryFreshness(input, NOW)).toEqual(selectMemoryFreshness(input, NOW));
  });
});
