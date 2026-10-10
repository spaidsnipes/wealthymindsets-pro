/**
 * Journal Day Ledger — live trades only, M0 held out, unreadable P&L counted
 * and never summed as zero, empty days absent; curve and drawdown from the same
 * daily nets; the component speaks through the house plaque when empty.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { monthWeeks, selectJournalCurve, selectJournalDayLedger } from "./journalDayLedger";
import { JournalDayLedger } from "@/components/journal/JournalDayLedger";
import { DAY_LEDGER_SAMPLE_BOOK } from "@/components/journal/JournalProofScene";

const PAPER = { environment: { value: "PAPER" } };

describe("selectJournalDayLedger", () => {
  it("counts live trades only, holds M0 out, and never sums an unreadable P&L as zero", () => {
    const l = selectJournalDayLedger([
      { date: "2026-10-01", pnl: 100 },
      { date: "2026-10-01", pnl: -40 },
      { date: "2026-10-02", pnl: null },
      { date: "2026-10-03", pnl: 500, capture: PAPER },
      { date: "2026-10-04", pnl: 0, dayModel: "M0" },
      { date: "not a day", pnl: 10 },
    ]);
    expect(l.paperLeftOut).toBe(1);
    expect(l.undated).toBe(1);
    expect(l.days).toEqual([
      { day: "2026-10-02", trades: 1, net: null, unreadable: 1 },
      { day: "2026-10-01", trades: 2, net: 60, unreadable: 0 },
    ]);
  });

  it("an empty book has no days (not a zero day)", () => {
    expect(selectJournalDayLedger([]).days).toEqual([]);
  });
});

describe("selectJournalCurve", () => {
  it("runs the readable daily nets oldest-first and reports drawdown from the running high", () => {
    const c = selectJournalCurve([
      { day: "2026-10-03", trades: 1, net: 50, unreadable: 0 },
      { day: "2026-10-02", trades: 1, net: -150, unreadable: 0 },
      { day: "2026-10-01", trades: 1, net: 100, unreadable: 0 },
      { day: "2026-10-04", trades: 1, net: null, unreadable: 1 },
    ]);
    expect(c.points.map(p => p.equity)).toEqual([100, -50, 0]);
    expect(c.points.map(p => p.drawdown)).toEqual([0, -150, -100]);
    expect(c.maxDrawdown).toBe(-150);
  });
});

describe("monthWeeks", () => {
  it("draws all seven days, Monday first, padded to whole weeks", () => {
    const w = monthWeeks("2026-10"); // Oct 1 2026 is a Thursday
    expect(w[0]).toEqual([null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(w.flat().filter(Boolean)).toHaveLength(31);
  });
});

describe("JournalDayLedger", () => {
  it("empty book → the house plaque, with the paper count said", () => {
    const html = renderToStaticMarkup(<JournalDayLedger entries={[{ date: "2026-10-01", pnl: 5, capture: PAPER }]} />);
    expect(html).toContain('data-testid="journal-day-ledger-empty"');
    expect(html).toContain("NOTHING HERE YET");
    expect(html).toContain("1 paper record is left out");
  });

  it("the sample book renders the month, the running net and a separate drawdown chart, all tabular", () => {
    const html = renderToStaticMarkup(<JournalDayLedger entries={DAY_LEDGER_SAMPLE_BOOK} />);
    expect(html.length).toBeGreaterThan(2000);
    expect(html).toContain('data-testid="journal-day-ledger"');
    expect(html).toContain("October 2026");
    expect(html).toContain("1 paper record is left out");
    expect(html).toContain("without a readable P&amp;L, not summed");
    expect(html).toContain('data-testid="journal-day-ledger-equity"');
    expect(html).toContain('data-testid="journal-day-ledger-max-drawdown"');
    expect((html.match(/<svg/g) ?? []).length).toBe(2); // equity and drawdown: two charts, one axis each
    expect(html).toContain("tabular-nums");
  });
});
