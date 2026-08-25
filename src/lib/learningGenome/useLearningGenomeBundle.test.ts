import { describe, it, expect } from "vitest";

import {
  normalizeJournalRecords,
  splitJournalByWeekWindow,
} from "./useLearningGenomeBundle";

/**
 * Unit tests for the two pure helpers behind useLearningGenomeBundle.
 * The hook itself is trivial state + effect plumbing over these
 * functions; if these are correct, the hook's math is correct.
 * (Ledger 2026-08-25-p9-learning-genome-full-slice.md flagged this
 * exact gap; closing it here.)
 */

const FIXED_NOW = Date.UTC(2026, 7, 25); // 2026-08-25T00:00:00Z

const DAY = 24 * 60 * 60 * 1000;

function isoDaysAgo(days: number): string {
  return new Date(FIXED_NOW - days * DAY).toISOString().slice(0, 10);
}

describe("normalizeJournalRecords — strict shape gate", () => {
  it("returns empty array for empty input", () => {
    expect(normalizeJournalRecords([])).toEqual([]);
  });

  it("drops non-objects", () => {
    expect(normalizeJournalRecords([null, undefined, 3, "str", []])).toEqual([]);
  });

  it("drops entries with no date", () => {
    expect(
      normalizeJournalRecords([{ result: "win", processQuality: "FOLLOWED_PLAN" }]),
    ).toEqual([]);
  });

  it("drops entries with invalid result", () => {
    expect(
      normalizeJournalRecords([{ date: "2026-08-25", result: "pending" }]),
    ).toEqual([]);
  });

  it("defaults invalid processQuality to UNRESOLVED", () => {
    const [entry] = normalizeJournalRecords([
      { date: "2026-08-25", result: "win", processQuality: "wat" },
    ]);
    expect(entry.processQuality).toBe("UNRESOLVED");
  });

  it("preserves realizedR / mfeR / maeR only when finite numbers", () => {
    const [entry] = normalizeJournalRecords([
      {
        date: "2026-08-25",
        result: "win",
        processQuality: "FOLLOWED_PLAN",
        realizedR: 1.5,
        mfeR: Number.NaN,
        maeR: Infinity,
      },
    ]);
    expect(entry.realizedR).toBe(1.5);
    expect(entry.mfeR).toBeUndefined();
    expect(entry.maeR).toBeUndefined();
  });

  it("preserves valid dayModel only", () => {
    const [a] = normalizeJournalRecords([
      { date: "d", result: "win", processQuality: "FOLLOWED_PLAN", dayModel: "M0" },
    ]);
    const [b] = normalizeJournalRecords([
      { date: "d", result: "win", processQuality: "FOLLOWED_PLAN", dayModel: "M3" },
    ]);
    expect(a.dayModel).toBe("M0");
    expect(b.dayModel).toBeUndefined();
  });
});

describe("splitJournalByWeekWindow — two-window canon", () => {
  it("returns empty windows for empty input", () => {
    expect(splitJournalByWeekWindow([], FIXED_NOW)).toEqual({ current: [], prior: [] });
  });

  it("puts entries from the last 7 days in current", () => {
    const { current, prior } = splitJournalByWeekWindow(
      [
        { date: isoDaysAgo(0), result: "win", processQuality: "FOLLOWED_PLAN" },
        { date: isoDaysAgo(3), result: "loss", processQuality: "BROKE_RULES" },
        { date: isoDaysAgo(6), result: "be", processQuality: "UNRESOLVED" },
      ],
      FIXED_NOW,
    );
    expect(current.length).toBe(3);
    expect(prior.length).toBe(0);
  });

  it("puts entries from days 7-14 in prior", () => {
    const { current, prior } = splitJournalByWeekWindow(
      [
        { date: isoDaysAgo(8), result: "win", processQuality: "FOLLOWED_PLAN" },
        { date: isoDaysAgo(13), result: "loss", processQuality: "BROKE_RULES" },
      ],
      FIXED_NOW,
    );
    expect(current.length).toBe(0);
    expect(prior.length).toBe(2);
  });

  it("drops entries older than 14 days (out of both windows)", () => {
    const { current, prior } = splitJournalByWeekWindow(
      [
        { date: isoDaysAgo(21), result: "win", processQuality: "FOLLOWED_PLAN" },
        { date: isoDaysAgo(60), result: "loss", processQuality: "BROKE_RULES" },
      ],
      FIXED_NOW,
    );
    expect(current.length).toBe(0);
    expect(prior.length).toBe(0);
  });

  it("drops entries with unparseable date", () => {
    const { current, prior } = splitJournalByWeekWindow(
      [{ date: "not-a-date", result: "win", processQuality: "FOLLOWED_PLAN" }],
      FIXED_NOW,
    );
    expect(current.length).toBe(0);
    expect(prior.length).toBe(0);
  });

  it("boundary: exactly 7 days ago goes to current (inclusive)", () => {
    // Entry at exactly the 7-day boundary is >= currentStart, so current.
    const { current, prior } = splitJournalByWeekWindow(
      [{ date: new Date(FIXED_NOW - 7 * DAY).toISOString().slice(0, 10), result: "win", processQuality: "FOLLOWED_PLAN" }],
      FIXED_NOW,
    );
    expect(current.length).toBe(1);
    expect(prior.length).toBe(0);
  });
});
