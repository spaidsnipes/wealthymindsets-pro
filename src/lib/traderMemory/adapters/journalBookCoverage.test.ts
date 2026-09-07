/**
 * THE COUNT THE DECK IS ALLOWED TO SAY OUT LOUD.
 *
 * Atom 10 made the snapshot path stop CRASHING on a record it could not read.
 * It then dropped that record in silence, and said so in its own commit: the
 * disclosure was the next atom, not something to compute and throw away.
 *
 * The trap this file exists to hold shut is the obvious implementation of that
 * disclosure — `total - snapshots.length`. That number is wrong, and wrong in
 * the direction that hurts the trader most:
 *
 *   An M0 NO-TRADE day is entry 0, exit 0, size 0, pnl 0. It hydrates
 *   perfectly, because it is a real record he deliberately made. It then
 *   legitimately does not become a decision snapshot, because sitting on his
 *   hands is not a directional decision. `total - snapshots` would count it as
 *   unreadable, and a disciplined week would be reported back to him as a week
 *   WM COULD NOT READ — a lie in the opposite direction from the silence it
 *   replaced.
 *
 * So: `skipped` counts what HYDRATION refused, and nothing else.
 */

import { describe, expect, it } from "vitest";
import { readJournalBook, readJournalSnapshots } from "./useJournalSnapshots";

const OWNER = "owner-1";

function record(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "e1",
    date: "2026-09-01",
    symbol: "AAPL",
    side: "long",
    entry: 100,
    exit: 110,
    size: 2,
    pnl: 20,
    pct: 10,
    tags: [],
    setup: "Opening Range Break",
    ...over,
  };
}

function storageOf(records: unknown[]) {
  return {
    getItem: (key: string) =>
      key === "wm_journal_entries" ? JSON.stringify(records) : null,
  };
}

describe("the M0 day is READ — it is simply not a decision", () => {
  it("a no-trade day produces no snapshot and no skip", () => {
    const m0 = record({
      id: "m0",
      entry: 0,
      exit: 0,
      size: 0,
      pnl: 0,
      dayModel: "M0",
      side: "long",
    });
    const book = readJournalBook(storageOf([m0]), OWNER);

    // Not a decision — entry price 0 is not a trade the edge can speak about.
    expect(book.snapshots).toEqual([]);
    // But WM read the record completely. Nothing was refused.
    expect(book.coverage.skipped).toBe(0);
    expect(book.coverage.readable).toBe(1);
    expect(book.coverage.note).toBeNull();
  });

  it("a whole week of no-trade days is never reported as unreadable", () => {
    const week = ["mon", "tue", "wed", "thu", "fri"].map((id) =>
      record({ id, entry: 0, exit: 0, size: 0, pnl: 0, dayModel: "M0" }),
    );
    const book = readJournalBook(storageOf(week), OWNER);

    expect(book.snapshots).toEqual([]);
    expect(book.coverage.skipped).toBe(0);
    // The sentence that would have been shown by `total - snapshots`.
    expect(book.coverage.note).toBeNull();
  });
});

describe("what WM genuinely could not read IS counted, and said", () => {
  it("a null record is one skip with a note", () => {
    const book = readJournalBook(storageOf([null]), OWNER);
    expect(book.coverage.skipped).toBe(1);
    expect(book.coverage.readable).toBe(0);
    expect(book.coverage.note).toContain("could not make sense");
    expect(book.coverage.note).toContain("Nothing was deleted");
  });

  it("a record with no side is a skip — direction is not guessable", () => {
    const book = readJournalBook(storageOf([record({ side: undefined })]), OWNER);
    expect(book.coverage.skipped).toBe(1);
    expect(book.snapshots).toEqual([]);
  });

  it("one bad record does not cost the trader the good ones", () => {
    const book = readJournalBook(
      storageOf([record({ id: "good" }), null, record({ id: "m0", entry: 0, pnl: 0, size: 0 })]),
      OWNER,
    );
    expect(book.snapshots).toHaveLength(1);
    expect(book.snapshots[0]!.decisionId).toBe("good");
    // Three records: one decision, one unreadable, one read-but-not-a-decision.
    expect(book.coverage.readable).toBe(2);
    expect(book.coverage.skipped).toBe(1);
    expect(book.coverage.note).toContain("2 of 3");
  });

  it("singular and plural are both grammatical", () => {
    expect(readJournalBook(storageOf([record(), null]), OWNER).coverage.note)
      .toContain("left it out");
    expect(readJournalBook(storageOf([record(), null, null]), OWNER).coverage.note)
      .toContain("left them out");
  });
});

describe("states WM did not measure produce no count", () => {
  it("no owner is empty and silent — never a coverage claim", () => {
    const book = readJournalBook(storageOf([null, null]), null);
    expect(book.snapshots).toEqual([]);
    expect(book.coverage.note).toBeNull();
    expect(book.coverage.skipped).toBe(0);
  });

  it("absent storage is silent — there is no book to be missing rows from", () => {
    const book = readJournalBook({ getItem: () => null }, OWNER);
    expect(book.snapshots).toEqual([]);
    expect(book.coverage.note).toBeNull();
  });

  it("unparseable bytes are silent — 'N of your records' was never measured", () => {
    // The bytes never became an array, so there is no N. Claiming one would be
    // a count WM did not take. The storage-level state is the surfaces' own
    // to report, in their own words.
    const book = readJournalBook({ getItem: () => "{not json" }, OWNER);
    expect(book.snapshots).toEqual([]);
    expect(book.coverage.note).toBeNull();
    expect(book.coverage.readable).toBe(0);
  });
});

describe("the projection is unchanged by the split", () => {
  it("readJournalSnapshots returns exactly the book's snapshots", () => {
    const records = [record({ id: "a" }), null, record({ id: "b", date: "2026-08-01" })];
    expect(readJournalSnapshots(storageOf(records), OWNER)).toEqual(
      readJournalBook(storageOf(records), OWNER).snapshots,
    );
  });

  it("order is still oldest-first across a mixed book", () => {
    const book = readJournalBook(
      storageOf([record({ id: "late", date: "2026-09-05" }), null, record({ id: "early", date: "2026-08-02" })]),
      OWNER,
    );
    expect(book.snapshots.map((s) => s.decisionId)).toEqual(["early", "late"]);
  });
});
