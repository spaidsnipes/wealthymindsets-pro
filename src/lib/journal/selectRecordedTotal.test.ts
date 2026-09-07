import { describe, it, expect } from "vitest";
import { selectRecordedTotal } from "./selectRecordedTotal";

describe("selectRecordedTotal — one unreadable record cannot condemn the book", () => {
  // The old call site was `records.reduce((s, e) => s + e.pnl, 0)` over a
  // list produced by an UNCHECKED cast. These three tests pin what JavaScript
  // actually did with it — each was run, not assumed — and then assert the
  // owner's answer. Deleting the owner makes all three fail loudly.
  const naive = (rows: { pnl?: unknown }[]) =>
    rows.reduce((s, e) => (s as number) + (e.pnl as number), 0 as unknown);

  it("THE QUIET ONE: a null pnl was silently counted as a breakeven", () => {
    // JSON.stringify(NaN) writes null, so any entry that ever held a
    // non-finite P&L comes back as pnl: null on the next load. `100 + null`
    // is 100 — so the record was folded in as $0.00 with nothing said.
    expect(naive([{ pnl: 100 }, { pnl: null }, { pnl: 50 }])).toBe(150);

    const t = selectRecordedTotal([{ pnl: 100 }, { pnl: null }, { pnl: 50 }]);
    expect(t.total).toBe(150);
    expect(t.status).toBe("PARTIAL"); // same number — but now it SAYS so
    expect(t.unreadable).toBe(1);
  });

  it("THE LOUD ONE: a missing pnl turned the whole book into -$NaN", () => {
    // And `totalPnl >= 0` is false for NaN, so canon §9's red — reserved for
    // money actually lost — repainted the trader's entire journal.
    expect(Number.isNaN(naive([{ pnl: 100 }, {}, { pnl: 50 }]) as number)).toBe(true);

    const t = selectRecordedTotal([{ pnl: 100 }, {}, { pnl: 50 }]);
    expect(t.total).toBe(150);
    expect(t.status).toBe("PARTIAL");
  });

  it("THE WORST ONE: a stored string concatenated into a fabricated total", () => {
    // A $100 trade and a $250 trade totalled $100,250.00 — off by three orders
    // of magnitude, rendered with total confidence in the styling WM uses for
    // facts. This is the one that must never be survivable.
    expect(naive([{ pnl: 100 }, { pnl: "250.00" }])).toBe("100250.00");

    const t = selectRecordedTotal([{ pnl: 100 }, { pnl: "250.00" }]);
    expect(t.total).toBe(100);
    expect(t.status).toBe("PARTIAL");
  });

  it("says how much of the book the number covers", () => {
    const t = selectRecordedTotal([{ pnl: 100 }, { pnl: null }, { pnl: 50 }]);
    expect(t.counted).toBe(2);
    expect(t.unreadable).toBe(1);
    expect(t.note).toContain("covers 2 of 3 records");
  });

  it("a fully readable book is COMPLETE and silent", () => {
    const t = selectRecordedTotal([{ pnl: 100 }, { pnl: -40 }, { pnl: 0 }]);
    expect(t.status).toBe("COMPLETE");
    expect(t.total).toBe(60);
    expect(t.unreadable).toBe(0);
    expect(t.note).toBeNull();
  });

  it("a genuine 0 is READ, not skipped — a scratch trade is real money data", () => {
    const t = selectRecordedTotal([{ pnl: 0 }]);
    expect(t.status).toBe("COMPLETE");
    expect(t.counted).toBe(1);
    expect(t.total).toBe(0);
  });

  it("an EMPTY journal totals a genuine $0.00", () => {
    // There is nothing unread about having recorded nothing.
    const t = selectRecordedTotal([]);
    expect(t.status).toBe("COMPLETE");
    expect(t.total).toBe(0);
    expect(t.note).toBeNull();
  });

  it("a wholly unreadable journal is UNKNOWN with a NULL total, never 0", () => {
    // 0 is a claim about money. WM has no basis for it here.
    const t = selectRecordedTotal([{ pnl: null }, { pnl: undefined }]);
    expect(t.status).toBe("UNKNOWN");
    expect(t.total).toBeNull();
    expect(t.counted).toBe(0);
  });

  it("every shape an unchecked cast lets through is refused", () => {
    // `read.records as JournalEntry[]` validates nothing but array-ness.
    const t = selectRecordedTotal([
      { pnl: null },
      { pnl: undefined },
      {},
      { pnl: "250.00" },
      { pnl: Number.NaN },
      { pnl: Number.POSITIVE_INFINITY },
      { pnl: { amount: 5 } },
      { pnl: true },
    ]);
    expect(t.status).toBe("UNKNOWN");
    expect(t.unreadable).toBe(8);
  });

  it("a string that looks like money is not coerced into the total", () => {
    // "250.00" + 0 would silently produce a string; parsing it would be WM
    // guessing at a value it was never given.
    const t = selectRecordedTotal([{ pnl: 10 }, { pnl: "250.00" }]);
    expect(t.total).toBe(10);
    expect(t.unreadable).toBe(1);
  });

  it("negatives are real money and are counted", () => {
    const t = selectRecordedTotal([{ pnl: -500 }, { pnl: 200 }]);
    expect(t.status).toBe("COMPLETE");
    expect(t.total).toBe(-300);
  });

  it("the note reads correctly for a single unreadable record", () => {
    const t = selectRecordedTotal([{ pnl: 1 }, { pnl: null }]);
    expect(t.note).toContain("the other 1");
    expect(t.note).toContain("it is");
    expect(t.note).not.toContain("they are");
  });

  it("§8: nothing is broken, so nothing is phrased as broken", () => {
    const partial = selectRecordedTotal([{ pnl: 1 }, { pnl: null }])!.note ?? "";
    const unknown = selectRecordedTotal([{ pnl: null }])!.note ?? "";
    for (const note of [partial, unknown]) {
      expect(note).not.toMatch(/\bERROR\b|\bCORRUPT\b|\bINVALID\b|\bFAILED\b/i);
      // And it must tell the trader their records survived — the fear this
      // note has to answer is "have I lost my journal?".
      expect(note).toMatch(/Nothing was lost|records are unchanged/);
    }
  });

  it("names a legal next move rather than only refusing", () => {
    // A refusal with no legal move is a brick with a safety label on it.
    const note = selectRecordedTotal([{ pnl: null }])!.note ?? "";
    expect(note).toContain("open one to add its entry, exit and size");
  });
});
