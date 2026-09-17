/**
 * THE POINT OF THIS SUITE IS THAT `false` MUST BE A FINDING.
 *
 * The defect being repaired is a boolean that was structurally false because
 * its only source was an unwritable store. A suite that merely checked "the
 * function returns a boolean" would pass just as well after someone wired it
 * back to the same dead array. So the load-bearing tests are the ones that pin
 * WHICH journal facts move the signal and which deliberately do not.
 */
import { describe, expect, it } from "vitest";

import { hydrateJournalEntry, type JournalEntry } from "./hydrateJournalEntries";
import { selectUnreviewedCloses } from "./selectUnreviewedCloses";

const TODAY = "2026-09-16";
const YESTERDAY = "2026-09-15";

function entry(over: Partial<JournalEntry> = {}): JournalEntry {
  const hydrated = hydrateJournalEntry({
    id: "e1",
    date: TODAY,
    symbol: "TSLA",
    side: "long",
    entry: 100,
    exit: 105,
    size: 10,
    pnl: 50,
  });
  if (hydrated === null) throw new Error("fixture must hydrate");
  return { ...hydrated, ...over };
}

describe("selectUnreviewedCloses — the review question, asked of a book that can answer it", () => {
  it("an empty or missing book owes nothing", () => {
    for (const book of [null, undefined, []]) {
      const r = selectUnreviewedCloses(book, TODAY);
      expect(r.hasUnreviewedClose).toBe(false);
      expect(r.total).toBe(0);
      expect(r.reviewable).toBe(0);
    }
  });

  it("THE LOAD-BEARING ASSERTION — an unjudged close TODAY is work owed", () => {
    // This is the branch that was unreachable. If it ever stops firing, the
    // Exit Ramp goes back to telling a trader with homework that the job's
    // acceptance criteria are truthfully complete.
    const r = selectUnreviewedCloses([entry({ processQuality: "UNRESOLVED" })], TODAY);
    expect(r.hasUnreviewedClose).toBe(true);
    expect(r.today).toBe(1);
    expect(r.backlog).toBe(0);
  });

  it("a judged close owes nothing, whichever judgement it was", () => {
    for (const q of ["FOLLOWED_PLAN", "BROKE_RULES"] as const) {
      const r = selectUnreviewedCloses([entry({ processQuality: q })], TODAY);
      expect(r.hasUnreviewedClose).toBe(false);
      expect(r.total).toBe(0);
      expect(r.reviewable).toBe(1);
    }
  });

  it("MONEY IS NOT PROCESS — a winner and a loser are judged the same way", () => {
    // The temptation is to treat a profitable trade as self-evidently fine.
    // DANGEROUS_WIN exists in this codebase precisely because it is not.
    const win = selectUnreviewedCloses([entry({ pnl: 900, result: "win" })], TODAY);
    const loss = selectUnreviewedCloses([entry({ pnl: -900, result: "loss" })], TODAY);
    expect(win.hasUnreviewedClose).toBe(true);
    expect(loss.hasUnreviewedClose).toBe(true);
  });

  it("an M0 no-trade day is NOT homework", () => {
    // A deliberate decision not to trade has no close to review. Counting it
    // would hand a disciplined day back to the trader as an unfinished task.
    const r = selectUnreviewedCloses(
      [entry({ dayModel: "M0", processQuality: "UNRESOLVED" })],
      TODAY,
    );
    expect(r.hasUnreviewedClose).toBe(false);
    expect(r.reviewable).toBe(0);
    expect(r.total).toBe(0);
  });

  it("an ABSENT dayModel is not M0 — it is a trade the record did not label", () => {
    const r = selectUnreviewedCloses([entry({ dayModel: undefined })], TODAY);
    expect(r.hasUnreviewedClose).toBe(true);
    expect(r.reviewable).toBe(1);
  });

  it("M1 and M2 days are reviewable", () => {
    for (const m of ["M1", "M2"] as const) {
      expect(selectUnreviewedCloses([entry({ dayModel: m })], TODAY).hasUnreviewedClose).toBe(true);
    }
  });
});

describe("selectUnreviewedCloses — a backlog discloses, it does not hold the door shut", () => {
  it("THE OTHER LOAD-BEARING ASSERTION — an old unreviewed close does not block", () => {
    // A blocker that can never clear is indistinguishable from a broken gate,
    // and a trader learns to ignore it. March's homework must not pin the Exit
    // Ramp to ACTIVE for the rest of his life.
    const r = selectUnreviewedCloses([entry({ id: "old", date: YESTERDAY })], TODAY);
    expect(r.hasUnreviewedClose).toBe(false);
    expect(r.backlog).toBe(1);
    expect(r.today).toBe(0);
    expect(r.total).toBe(1);
  });

  it("today and the backlog are counted apart, and total is their sum", () => {
    const r = selectUnreviewedCloses(
      [
        entry({ id: "a", date: TODAY }),
        entry({ id: "b", date: TODAY }),
        entry({ id: "c", date: YESTERDAY }),
        entry({ id: "d", date: "2026-01-02" }),
        entry({ id: "e", date: TODAY, processQuality: "FOLLOWED_PLAN" }),
      ],
      TODAY,
    );
    expect(r.today).toBe(2);
    expect(r.backlog).toBe(2);
    expect(r.total).toBe(4);
    expect(r.reviewable).toBe(5);
    expect(r.hasUnreviewedClose).toBe(true);
  });

  it("an unparseable date falls to the backlog, never to today", () => {
    // Not knowing when a close happened is not evidence that it happened now.
    for (const date of ["", "not-a-date", "16/09/2026"]) {
      const r = selectUnreviewedCloses([entry({ date })], TODAY);
      expect(r.today).toBe(0);
      expect(r.backlog).toBe(1);
      expect(r.hasUnreviewedClose).toBe(false);
    }
  });

  it("reviewable counts judged and unjudged alike, so a ratio is possible", () => {
    const r = selectUnreviewedCloses(
      [
        entry({ id: "a", processQuality: "FOLLOWED_PLAN" }),
        entry({ id: "b", processQuality: "BROKE_RULES" }),
        entry({ id: "c", processQuality: "UNRESOLVED" }),
        entry({ id: "d", dayModel: "M0" }),
      ],
      TODAY,
    );
    expect(r.reviewable).toBe(3);
    expect(r.total).toBe(1);
  });

  it("does not mutate the book", () => {
    const book = [entry({ id: "a" }), entry({ id: "b", processQuality: "FOLLOWED_PLAN" })];
    const before = JSON.stringify(book);
    selectUnreviewedCloses(book, TODAY);
    expect(JSON.stringify(book)).toBe(before);
  });

  it("scales without quadratic behaviour", () => {
    const book = Array.from({ length: 5000 }, (_, i) =>
      entry({ id: `e${i}`, date: i % 2 === 0 ? TODAY : YESTERDAY }),
    );
    const r = selectUnreviewedCloses(book, TODAY);
    expect(r.today).toBe(2500);
    expect(r.backlog).toBe(2500);
  });
});
