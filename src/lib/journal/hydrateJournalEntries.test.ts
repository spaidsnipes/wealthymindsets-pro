/**
 * THE TRADER'S OWN BOOK, READ RATHER THAN ASSERTED.
 *
 * /journal cast `read.records` to `JournalEntry[]` inside a `useState`
 * initializer and immediately built a template literal out of `e.id`. A single
 * `null` in that array threw during the initial state computation, which means
 * the page did not degrade — it never rendered. The trader's entire book, blank,
 * with no account of why.
 */

import { describe, expect, it } from "vitest";
import { hydrateJournalEntries, hydrateJournalEntry } from "./hydrateJournalEntries";

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
    tags: ["CLC"],
    notes: "clean",
    mood: "disciplined",
    result: "win",
    processQuality: "FOLLOWED_PLAN",
    processOutcome: "EARNED_WIN",
    starred: true,
    images: [],
    voiceSec: 0,
    setup: "CLC Long",
    mistakes: "",
    lessons: "",
    emojis: [],
    ...over,
  };
}

describe("THE MEASURED FAILURE — one null, no page", () => {
  it("a null in the saved array does not throw", () => {
    expect(() => hydrateJournalEntries([null])).not.toThrow();
    expect(hydrateJournalEntries([null]).entries).toEqual([]);
  });

  it("neither do arrays, strings, numbers, booleans or bare objects", () => {
    const h = hydrateJournalEntries([[], "a string", 7, true, {}, null, undefined]);
    expect(h.entries).toEqual([]);
    expect(h.coverage.skipped).toBe(7);
  });

  it("one bad record does not cost the trader the good ones", () => {
    // The crash was all-or-nothing. Reading is not.
    const h = hydrateJournalEntries([record({ id: "a" }), null, record({ id: "b" })]);
    expect(h.entries.map((e) => e.id)).toEqual(["a", "b"]);
    expect(h.coverage.skipped).toBe(1);
  });

  it("and the trader is TOLD, rather than the book quietly shrinking", () => {
    const h = hydrateJournalEntries([record(), null]);
    expect(h.coverage.note).not.toBeNull();
    expect(h.coverage.note).toContain("Nothing was deleted");
  });
});

describe("what makes a row a trade at all — refused, and disclosed", () => {
  for (const field of ["id", "date", "symbol"] as const) {
    it(`a record with no ${field} is not a trade WM can show`, () => {
      const { [field]: _dropped, ...without } = record();
      expect(hydrateJournalEntry(without)).toBeNull();
      expect(hydrateJournalEntry(record({ [field]: "   " }))).toBeNull();
      expect(hydrateJournalEntry(record({ [field]: 7 }))).toBeNull();
    });
  }

  it("a record with no side is refused rather than defaulted", () => {
    // The same defect the snapshot adapter carried: a ternary with no third
    // branch answers SHORT for every record that does not say.
    const { side: _dropped, ...without } = record();
    expect(hydrateJournalEntry(without)).toBeNull();
    expect(hydrateJournalEntry(record({ side: "LONG" }))).toBeNull();
  });

  for (const field of ["entry", "exit", "size", "pnl"] as const) {
    it(`a non-numeric ${field} is refused — the book is arithmetic on it`, () => {
      expect(hydrateJournalEntry(record({ [field]: "100" }))).toBeNull();
      expect(hydrateJournalEntry(record({ [field]: null }))).toBeNull();
      expect(hydrateJournalEntry(record({ [field]: Number.NaN }))).toBeNull();
      expect(hydrateJournalEntry(record({ [field]: Number.POSITIVE_INFINITY }))).toBeNull();
    });
  }

  it("but a ZERO in any of them is a real number, not an absence", () => {
    // An M0 no-trade day is entry 0, exit 0, size 0, pnl 0 and it is a REAL
    // record the trader made. Confusing zero with missing would delete his
    // discipline days.
    const e = hydrateJournalEntry(record({ entry: 0, exit: 0, size: 0, pnl: 0, dayModel: "M0" }))!;
    expect(e).not.toBeNull();
    expect(e.dayModel).toBe("M0");
  });
});

describe("refusing a FIELD is not deleting the TRADE", () => {
  it("an unreadable mood keeps the trade and reads neutral", () => {
    expect(hydrateJournalEntry(record({ mood: "elated" }))!.mood).toBe("neutral");
    expect(hydrateJournalEntry(record({ mood: 4 }))!.mood).toBe("neutral");
  });

  it("an unreadable processQuality is UNRESOLVED, never FOLLOWED_PLAN", () => {
    // The honest default is neither pride nor shame. Crediting discipline the
    // trader did not record is the one direction this may never fail in.
    expect(hydrateJournalEntry(record({ processQuality: "GREAT" }))!.processQuality)
      .toBe("UNRESOLVED");
    const { processQuality: _d, ...without } = record();
    expect(hydrateJournalEntry(without)!.processQuality).toBe("UNRESOLVED");
  });

  it("an unreadable processOutcome is UNRESOLVED and is NOT inferred from pnl", () => {
    const e = hydrateJournalEntry(record({ processOutcome: "GLORIOUS", pnl: 500 }))!;
    expect(e.processOutcome).toBe("UNRESOLVED");
  });

  it("tags, images and emojis survive a non-array as an empty list", () => {
    const e = hydrateJournalEntry(record({ tags: "CLC", images: null, emojis: 7 }))!;
    expect(e.tags).toEqual([]);
    expect(e.images).toEqual([]);
    expect(e.emojis).toEqual([]);
  });

  it("a list drops only the members that are not strings", () => {
    const e = hydrateJournalEntry(record({ tags: ["CLC", 7, null, "", "VWAP reclaim"] }))!;
    expect(e.tags).toEqual(["CLC", "VWAP reclaim"]);
  });

  it("starred is true only when the record says true", () => {
    expect(hydrateJournalEntry(record({ starred: "yes" }))!.starred).toBe(false);
    expect(hydrateJournalEntry(record({ starred: 1 }))!.starred).toBe(false);
    expect(hydrateJournalEntry(record({ starred: true }))!.starred).toBe(true);
  });

  it("an unreadable pct does not hide the trade — it is a derived display value", () => {
    expect(hydrateJournalEntry(record({ pct: "10%" }))!.pct).toBe(0);
  });
});

describe("the optional Proof Lane fields stay OPTIONAL — absent is not zero", () => {
  it("an absent dayModel is undefined, not M0", () => {
    expect(hydrateJournalEntry(record())!.dayModel).toBeUndefined();
    expect(hydrateJournalEntry(record({ dayModel: "M9" }))!.dayModel).toBeUndefined();
    expect(hydrateJournalEntry(record({ dayModel: "M2" }))!.dayModel).toBe("M2");
  });

  it("an absent plannedRDollars is undefined, not zero risk", () => {
    expect(hydrateJournalEntry(record())!.plannedRDollars).toBeUndefined();
    expect(hydrateJournalEntry(record({ plannedRDollars: "250" }))!.plannedRDollars)
      .toBeUndefined();
    expect(hydrateJournalEntry(record({ plannedRDollars: 250 }))!.plannedRDollars).toBe(250);
  });

  it("realizedR, mfeR and maeR are undefined unless stored as numbers", () => {
    const e = hydrateJournalEntry(record({ realizedR: "2", mfeR: null, maeR: 3 }))!;
    expect(e.realizedR).toBeUndefined();
    expect(e.mfeR).toBeUndefined();
    expect(e.maeR).toBe(3);
  });

  it("contractType is read, not defaulted to stock", () => {
    expect(hydrateJournalEntry(record())!.contractType).toBeUndefined();
    expect(hydrateJournalEntry(record({ contractType: "option" }))!.contractType).toBe("option");
    expect(hydrateJournalEntry(record({ contractType: "future" }))!.contractType).toBeUndefined();
  });
});

describe("result is READ, not derived from pnl", () => {
  it("a stored loss on a positive pnl stays a loss", () => {
    // H13: money and outcome are two separately recorded facts. Deriving one
    // from the other is exactly the drift the edge projection was fixed for.
    expect(hydrateJournalEntry(record({ result: "loss", pnl: 250 }))!.result).toBe("loss");
  });

  it("all three outcomes survive", () => {
    for (const r of ["win", "loss", "be"] as const) {
      expect(hydrateJournalEntry(record({ result: r }))!.result).toBe(r);
    }
  });
});

describe("coverage is honest arithmetic over the whole book", () => {
  it("a fully readable book says nothing at all", () => {
    const h = hydrateJournalEntries([record({ id: "a" }), record({ id: "b" })]);
    expect(h.coverage.readable).toBe(2);
    expect(h.coverage.skipped).toBe(0);
    expect(h.coverage.note).toBeNull();
  });

  it("an empty book is not a partial book", () => {
    const h = hydrateJournalEntries([]);
    expect(h.coverage.skipped).toBe(0);
    expect(h.coverage.note).toBeNull();
  });

  it("readable + skipped is always the whole book", () => {
    const book = [null, record(), { id: "x" }, 7, record({ id: "y", pnl: "5" })];
    const h = hydrateJournalEntries(book);
    expect(h.coverage.readable + h.coverage.skipped).toBe(book.length);
  });
});

describe("order is preserved — /journal renders and RE-SAVES in read order", () => {
  it("skips are removed in place", () => {
    const h = hydrateJournalEntries([
      record({ id: "c" }), null, record({ id: "b" }), { id: "nope" }, record({ id: "a" }),
    ]);
    expect(h.entries.map((e) => e.id)).toEqual(["c", "b", "a"]);
  });
});
