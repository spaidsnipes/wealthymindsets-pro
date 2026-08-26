import { describe, it, expect } from "vitest";

import { selectAvailabilityContract } from "./selectAvailabilityContract";

const HR = 60 * 60 * 1000;
const MARKET_OPEN = Date.UTC(2026, 7, 25, 14, 30); // 09:30 ET as UTC epoch approximation
const WINDOW_START = MARKET_OPEN;
const WINDOW_END = MARKET_OPEN + 2 * HR;

describe("selectAvailabilityContract — canon §AVAILABILITY CONTRACT (§2 2026-08-25)", () => {
  it("no windows + no trades → UNDECLARED", () => {
    const r = selectAvailabilityContract({ windows: [], trades: [] });
    expect(r.window_declared).toBe(false);
    expect(r.status).toBe("UNDECLARED");
    expect(r.adherence_rate).toBeUndefined();
  });

  it("no windows + trades → UNDECLARED with sample_size preserved", () => {
    const r = selectAvailabilityContract({
      windows: [],
      trades: [{ atMs: MARKET_OPEN }, { atMs: MARKET_OPEN + HR }],
    });
    expect(r.status).toBe("UNDECLARED");
    expect(r.sample_size).toBe(2);
    expect(r.adherence_rate).toBeUndefined();
  });

  it("declared window + no trades → ALL_INSIDE (canon: no violation)", () => {
    const r = selectAvailabilityContract({
      windows: [{ startMs: WINDOW_START, endMs: WINDOW_END }],
      trades: [],
    });
    expect(r.window_declared).toBe(true);
    expect(r.status).toBe("ALL_INSIDE");
    expect(r.adherence_rate).toBeUndefined();
  });

  it("all trades inside declared window → ALL_INSIDE + 100% adherence", () => {
    const r = selectAvailabilityContract({
      windows: [{ startMs: WINDOW_START, endMs: WINDOW_END }],
      trades: [
        { atMs: WINDOW_START },
        { atMs: WINDOW_START + HR },
        { atMs: WINDOW_END - 1 },
      ],
    });
    expect(r.inside_window).toBe(3);
    expect(r.outside_window).toBe(0);
    expect(r.adherence_rate).toBe(1);
    expect(r.status).toBe("ALL_INSIDE");
  });

  it("all trades outside declared window → ALL_OUTSIDE + 0% adherence", () => {
    const r = selectAvailabilityContract({
      windows: [{ startMs: WINDOW_START, endMs: WINDOW_END }],
      trades: [
        { atMs: WINDOW_START - HR },
        { atMs: WINDOW_END + HR },
      ],
    });
    expect(r.status).toBe("ALL_OUTSIDE");
    expect(r.adherence_rate).toBe(0);
  });

  it("mixed → PARTIAL_OUTSIDE + partial adherence", () => {
    const r = selectAvailabilityContract({
      windows: [{ startMs: WINDOW_START, endMs: WINDOW_END }],
      trades: [
        { atMs: WINDOW_START },       // inside
        { atMs: WINDOW_END + HR },    // outside
        { atMs: WINDOW_START + HR },  // inside
      ],
    });
    expect(r.status).toBe("PARTIAL_OUTSIDE");
    expect(r.adherence_rate).toBeCloseTo(2 / 3);
  });

  it("window is [start, end) — end is exclusive", () => {
    const r = selectAvailabilityContract({
      windows: [{ startMs: WINDOW_START, endMs: WINDOW_END }],
      trades: [{ atMs: WINDOW_END }],
    });
    expect(r.inside_window).toBe(0);
    expect(r.outside_window).toBe(1);
  });

  it("window is [start, end) — start is inclusive", () => {
    const r = selectAvailabilityContract({
      windows: [{ startMs: WINDOW_START, endMs: WINDOW_END }],
      trades: [{ atMs: WINDOW_START }],
    });
    expect(r.inside_window).toBe(1);
  });

  it("multiple windows: any window containing the trade counts as inside", () => {
    const morning = { startMs: WINDOW_START, endMs: WINDOW_START + HR };
    const afternoon = { startMs: WINDOW_START + 4 * HR, endMs: WINDOW_START + 5 * HR };
    const r = selectAvailabilityContract({
      windows: [morning, afternoon],
      trades: [
        { atMs: WINDOW_START + 30 * 60 * 1000 },       // morning window
        { atMs: WINDOW_START + 4.5 * HR },             // afternoon window
        { atMs: WINDOW_START + 2 * HR },               // between = outside
      ],
    });
    expect(r.inside_window).toBe(2);
    expect(r.outside_window).toBe(1);
  });

  it("overlapping windows do not double-count a trade", () => {
    const wA = { startMs: WINDOW_START, endMs: WINDOW_START + 2 * HR };
    const wB = { startMs: WINDOW_START + HR, endMs: WINDOW_START + 3 * HR };
    const r = selectAvailabilityContract({
      windows: [wA, wB],
      trades: [{ atMs: WINDOW_START + 1.5 * HR }], // in both
    });
    expect(r.inside_window).toBe(1);
    expect(r.outside_window).toBe(0);
  });
});
