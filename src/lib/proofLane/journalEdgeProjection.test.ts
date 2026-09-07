/**
 * THE ONE PROJECTION — the drift that was measured, now pinned.
 *
 * Before this atom there were two maps from a stored journal record to a
 * session. `journalEdgeAdapter` read the stored `result`; the /morning-prep
 * adapter derived it from `pnl`. Every case in the first block below is a
 * record that got TWO DIFFERENT ANSWERS out of the same saved book.
 */

import { describe, expect, it } from "vitest";
import {
  journalRecordsToEdgeEntries,
  projectJournalRecordsToEdge,
} from "./journalEdgeAdapter";

describe("THE MEASURED DRIFT — one record, two answers", () => {
  it("a day with no result and no pnl is NOT a breakeven session", () => {
    // /morning-prep used `pnl ?? 0` and 0 is BREAKEVEN, so this record became
    // a session that extended the discipline streak on the continuity badge.
    // A day with no trade on it was earning the trader credit.
    const p = projectJournalRecordsToEdge([
      { date: "2026-09-01", processQuality: "FOLLOWED_PLAN" },
    ]);
    expect(p.entries).toEqual([]);
  });

  it("and the trader is TOLD it was skipped, rather than it vanishing", () => {
    const p = projectJournalRecordsToEdge([
      { date: "2026-09-01", processQuality: "FOLLOWED_PLAN" },
    ]);
    expect(p.coverage.skipped).toBe(1);
    expect(p.coverage.note).not.toBeNull();
    expect(p.coverage.note).toContain("Nothing was deleted");
  });

  it("the stored result wins over pnl when both are present", () => {
    // The straight contradiction: this record read `loss` on the Proof Lane
    // and `win` on the morning badge. `result` is what the journal WROTE at
    // save time; pnl is raw. One of them has to be the answer, and it is the
    // one the journal committed to.
    const p = projectJournalRecordsToEdge([
      { date: "2026-09-02", result: "loss", pnl: 250 },
    ]);
    expect(p.entries[0].result).toBe("loss");
  });
});

describe("the pnl fallback exists for legacy records — and refuses zero", () => {
  it("a record with no result but a real profit is a win", () => {
    const p = projectJournalRecordsToEdge([{ date: "2026-09-03", pnl: 420 }]);
    expect(p.entries[0].result).toBe("win");
  });

  it("a record with no result but a real loss is a loss", () => {
    const p = projectJournalRecordsToEdge([{ date: "2026-09-03", pnl: -80 }]);
    expect(p.entries[0].result).toBe("loss");
  });

  it("ZERO IS REFUSED — that is the value the unpriceable bug wrote", () => {
    // computeJournalPnl returns the NUMBER 0 for "nothing to price". A stored
    // 0 with no result is either a real breakeven or a trade WM could never
    // price, and the record does not say which. WM does not guess.
    const p = projectJournalRecordsToEdge([{ date: "2026-09-03", pnl: 0 }]);
    expect(p.entries).toEqual([]);
    expect(p.coverage.skipped).toBe(1);
  });

  it("a stored breakeven RESULT is still a session — the refusal is about pnl", () => {
    // The distinction that makes the rule above defensible: `result: "be"` is
    // the journal stating a breakeven. `pnl: 0` is arithmetic that may mean
    // nothing. Collapsing them would delete real breakevens.
    const p = projectJournalRecordsToEdge([{ date: "2026-09-03", result: "be", pnl: 0 }]);
    expect(p.entries[0].result).toBe("be");
    expect(p.coverage.skipped).toBe(0);
  });

  it("a numeric STRING pnl is not a pnl", () => {
    // readStoredNumber owns this; asserted here because the fallback is the
    // one place a string could sneak into an outcome. `"250.00" > 0` is true
    // in JavaScript, which is exactly how this would have passed.
    const p = projectJournalRecordsToEdge([{ date: "2026-09-03", pnl: "250.00" }]);
    expect(p.entries).toEqual([]);
  });

  it("NaN and Infinity are not outcomes", () => {
    const p = projectJournalRecordsToEdge([
      { date: "2026-09-03", pnl: Number.NaN },
      { date: "2026-09-04", pnl: Number.POSITIVE_INFINITY },
    ]);
    expect(p.entries).toEqual([]);
    expect(p.coverage.skipped).toBe(2);
  });
});

describe("coverage is honest arithmetic, not a mood", () => {
  it("a fully readable book says nothing at all", () => {
    const p = projectJournalRecordsToEdge([
      { date: "2026-09-01", result: "win" },
      { date: "2026-09-02", result: "loss" },
    ]);
    expect(p.coverage.readable).toBe(2);
    expect(p.coverage.skipped).toBe(0);
    expect(p.coverage.note).toBeNull();
  });

  it("an empty book is not a partial book", () => {
    const p = projectJournalRecordsToEdge([]);
    expect(p.coverage.skipped).toBe(0);
    expect(p.coverage.note).toBeNull();
  });

  it("counts every unreadable shape, not only the ones with dates", () => {
    const p = projectJournalRecordsToEdge([
      null, [], "a string", 7, {}, { date: "  " }, { date: "2026-09-01", result: "win" },
    ]);
    expect(p.entries).toHaveLength(1);
    expect(p.coverage.readable).toBe(1);
    expect(p.coverage.skipped).toBe(6);
  });

  it("readable + skipped is always the whole book", () => {
    const book = [null, { date: "2026-09-01", result: "win" }, { date: "x", pnl: 0 }, { pnl: 5 }];
    const p = projectJournalRecordsToEdge(book);
    expect(p.coverage.readable + p.coverage.skipped).toBe(book.length);
  });
});

describe("order is preserved — selectFocusStreak depends on it", () => {
  it("newest-first in, newest-first out, with skips removed in place", () => {
    const p = projectJournalRecordsToEdge([
      { date: "2026-09-03", result: "win" },
      { date: "2026-09-02", pnl: 0 },
      { date: "2026-09-01", result: "loss" },
    ]);
    expect(p.entries.map(e => e.date)).toEqual(["2026-09-03", "2026-09-01"]);
  });
});

describe("the entries-only helper is the same code path", () => {
  it("returns exactly the projection's entries", () => {
    const book = [{ date: "2026-09-01", result: "win" }, { date: "x", pnl: 0 }];
    expect(journalRecordsToEdgeEntries(book)).toEqual(projectJournalRecordsToEdge(book).entries);
  });
});

describe("H21 — the second projection is gone, not just unused", () => {
  it("journalEntryToEdgeEntry.ts no longer exists", async () => {
    // Leaving a dead duplicate in the tree is how it gets re-imported six
    // months from now by someone who finds it first.
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    expect(
      existsSync(join(__dirname, "..", "traderMemory", "adapters", "journalEntryToEdgeEntry.ts")),
    ).toBe(false);
  });
});
