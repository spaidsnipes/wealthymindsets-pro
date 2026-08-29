/**
 * timeframeRoles — truth-lock for the M23 Timeframe Role Engine.
 * Locks the offset math + role assignment + reason messages so the
 * Founder top-down workflow (CONTEXT / DESTINATION / LOCATION /
 * RESPONSE) doesn't silently drift.
 */

import { describe, it, expect } from "vitest";
import {
  TIMEFRAME_LADDER,
  ROLE_PURPOSE,
  assignTimeframeRoles,
  roleForTimeframe,
} from "./timeframeRoles";

describe("TIMEFRAME_LADDER", () => {
  it("is strictly ascending by seconds", () => {
    for (let i = 1; i < TIMEFRAME_LADDER.length; i++) {
      expect(TIMEFRAME_LADDER[i].seconds).toBeGreaterThan(
        TIMEFRAME_LADDER[i - 1].seconds,
      );
    }
  });

  it("contains the canonical Founder workflow anchors", () => {
    const ids = TIMEFRAME_LADDER.map((t) => t.id);
    expect(ids).toContain("1m");
    expect(ids).toContain("15m");
    expect(ids).toContain("1h");
    expect(ids).toContain("4h");
    expect(ids).toContain("1D");
  });
});

describe("assignTimeframeRoles — anchor-relative role map", () => {
  it("returns a fallback + reason when anchor is not on the ladder", () => {
    const m = assignTimeframeRoles("bogus");
    expect(m.reason).toMatch(/not on the ladder/i);
    expect(m.assignments).toEqual([]);
    // byRole is fully null-mapped.
    expect(m.byRole.CONTEXT).toBeNull();
    expect(m.byRole.LOCATION).toBeNull();
  });

  it("assigns the canonical Founder mapping when anchor=15m (index 3)", () => {
    // Ladder: 1m,2m,5m,15m,30m,1h,4h,1D,1W,1M
    //         0  1  2  3   4   5  6  7  8  9
    const m = assignTimeframeRoles("15m");
    expect(m.anchor.id).toBe("15m");
    expect(m.byRole.LOCATION?.id).toBe("15m");   // anchor
    expect(m.byRole.DESTINATION?.id).toBe("30m"); // anchor + 1
    expect(m.byRole.CONTEXT?.id).toBe("4h");     // anchor + 3
    expect(m.byRole.RESPONSE?.id).toBe("2m");    // anchor - 2
  });

  it("clamps roles that would fall off the ladder + reports which are unavailable", () => {
    // 1m is at index 0 → RESPONSE would need -2 (unavailable).
    const m = assignTimeframeRoles("1m");
    expect(m.byRole.RESPONSE).toBeNull();
    expect(m.reason).toMatch(/RESPONSE/);

    // 1M is at the top → CONTEXT +3 would overshoot.
    const top = assignTimeframeRoles("1M");
    expect(top.byRole.CONTEXT).toBeNull();
    expect(top.reason).toMatch(/CONTEXT/);
  });

  it("assignments are sorted top-of-chart first (largest seconds first)", () => {
    const m = assignTimeframeRoles("15m");
    for (let i = 1; i < m.assignments.length; i++) {
      expect(m.assignments[i].timeframe.seconds).toBeLessThanOrEqual(
        m.assignments[i - 1].timeframe.seconds,
      );
    }
  });

  it("each assignment includes the role's canonical question + uses", () => {
    const m = assignTimeframeRoles("15m");
    for (const a of m.assignments) {
      expect(a.question).toBe(ROLE_PURPOSE[a.role].question);
      expect(a.uses).toBe(ROLE_PURPOSE[a.role].uses);
    }
  });
});

describe("roleForTimeframe — classify an arbitrary timeframe", () => {
  it("returns the exact role when the timeframe matches an assignment", () => {
    expect(roleForTimeframe("15m", "15m").role).toBe("LOCATION");
    expect(roleForTimeframe("30m", "15m").role).toBe("DESTINATION");
    expect(roleForTimeframe("4h", "15m").role).toBe("CONTEXT");
    expect(roleForTimeframe("2m", "15m").role).toBe("RESPONSE");
  });

  it("returns null with reason when timeframe or anchor is off-ladder", () => {
    expect(roleForTimeframe("bogus", "15m").role).toBeNull();
    expect(roleForTimeframe("15m", "bogus").role).toBeNull();
  });

  it("classifies far-above anchor as CONTEXT with a 'treated as' reason", () => {
    // Anchor 15m; asking about 1D (offset +4) → CONTEXT with note.
    const r = roleForTimeframe("1D", "15m");
    expect(r.role).toBe("CONTEXT");
    expect(r.reason).toMatch(/treated as context/i);
  });

  it("classifies 1 step above as DESTINATION with a 'treated as' reason", () => {
    // Anchor 5m; asking about 15m (offset +1) → DESTINATION.
    // Actually 5m + 1 = 15m which IS the exact DESTINATION assignment,
    // so returns exact match with no reason. Use +2 for the reason-branch.
    const r = roleForTimeframe("1h", "15m");
    // 15m→1h is offset +2 which is NOT an exact assignment (that's +1
    // to 30m or +3 to 4h). Falls into "DESTINATION with reason".
    expect(r.role).toBe("DESTINATION");
    expect(r.reason).toMatch(/treated as destination/i);
  });

  it("classifies far-below anchor as RESPONSE with a noise warning", () => {
    // Anchor 1h (index 5); asking about 1m (offset -4) → RESPONSE far
    // below the -2 band with noise warning.
    const r = roleForTimeframe("1m", "1h");
    expect(r.role).toBe("RESPONSE");
    expect(r.reason).toMatch(/far below|noise/i);
  });
});
