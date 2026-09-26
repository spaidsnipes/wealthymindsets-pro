import { describe, it, expect } from "vitest";
import * as React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { JournalContractChip, LegacyFuturesMoneyNote } from "../JournalMoneyMarks";
import { compilePnlStats } from "@/lib/chart/pnlStatsFacts";

/**
 * THE WORDS ON THE GLASS, RENDERED (Garden 16 §17 review, 2026-09-26).
 *
 * computePnl.test.ts proves the owner can say the right thing. These render
 * the actual components /journal mounts and read the markup a trader gets, so
 * a chip that renders nothing, or a note that only lives in a tooltip, fails
 * here rather than on the glass.
 */

const ES = { symbol: "ES1!", entry: 5000, exit: 5010, size: 1, side: "long" as const };

describe("JournalContractChip — what a journal list row shows", () => {
  it("a priced futures row: 'FUT ES', blue, with its money in title and aria-label", () => {
    const html = renderToStaticMarkup(<JournalContractChip entry={{ ...ES, pnl: 500 }} testId="c" />);
    expect(html).toContain(">FUT ES</span>");
    expect(html).toContain('data-contract-basis="futures"');
    expect(html).toContain('title="FUTURES ES · $50.00 / pt"');
    expect(html).toContain('aria-label="FUTURES ES · $50.00 / pt"');
    expect(html).toContain("text-wm-blue");
  });

  it("a legacy 1x ES row says it on the chip, dim not red, both numbers on hover", () => {
    const html = renderToStaticMarkup(<JournalContractChip entry={{ ...ES, pnl: 10 }} />);
    expect(html).toContain(">FUT ES · SAVED AT 1x</span>");
    expect(html).toContain("$10.00");
    expect(html).toContain("$500.00");
    expect(html).toContain("text-wm-text-dim");
    expect(html).not.toMatch(/text-wm-red|text-wm-green/);
  });

  it("an ESZ6 row (the broker's contract code) is a futures row", () => {
    const html = renderToStaticMarkup(<JournalContractChip entry={{ ...ES, symbol: "ESZ6", pnl: 500 }} />);
    expect(html).toContain(">FUT ES</span>");
  });

  it("an option keeps its purple OPT chip; a share has no chip at all", () => {
    expect(renderToStaticMarkup(<JournalContractChip entry={{ ...ES, symbol: "TSLA", contractType: "option", pnl: 1000 }} />))
      .toContain(">OPT</span>");
    expect(renderToStaticMarkup(<JournalContractChip entry={{ ...ES, symbol: "TSLA", contractType: "option", pnl: 1000 }} />))
      .toContain("text-wm-purple");
    expect(renderToStaticMarkup(<JournalContractChip entry={{ ...ES, symbol: "TSLA", contractType: "stock", pnl: 10 }} />)).toBe("");
    expect(renderToStaticMarkup(<JournalContractChip entry={{ ...ES, symbol: "ES", pnl: 10 }} />)).toBe("");
  });
});

describe("LegacyFuturesMoneyNote — what the totals say", () => {
  it("renders the owner's sentence as readable text with role=note", () => {
    const html = renderToStaticMarkup(
      <LegacyFuturesMoneyNote records={[{ ...ES, pnl: 10 }, { ...ES, pnl: 500 }]} testId="n" />,
    );
    expect(html).toMatch(/^<p role="note" data-testid="n"/);
    expect(html).toContain(
      "1 futures entry was not priced at its point value when saved — before 2026-09-26 the journal priced futures at $1 per point. "
      + "It is counted here as recorded, so these dollars and R understate it. "
      + "Open it to see its futures money; re-pricing saved entries is not available yet.",
    );
  });

  it("renders nothing when every futures entry carries its futures money", () => {
    expect(renderToStaticMarkup(<LegacyFuturesMoneyNote records={[{ ...ES, pnl: 500 }]} />)).toBe("");
  });
});

describe("the chart's P&L strip counts the same rows", () => {
  it("compilePnlStats carries the owner's count and sentence, and still sums the row as recorded", () => {
    const raw = JSON.stringify([
      { id: "a", date: "2026-09-01", symbol: "ES1!", side: "long", entry: 5000, exit: 5010, size: 1, pnl: 10, result: "win" },
      { id: "b", date: "2026-09-02", symbol: "TSLA", side: "long", entry: 100, exit: 90, size: 1, pnl: -10, result: "loss" },
    ]);
    const report = compilePnlStats(raw);
    expect(report.legacyFutures.count).toBe(1);
    expect(report.legacyFutures.note).toMatch(/^1 futures entry was not priced at its point value/);
    // Nothing excluded, nothing rewritten: 10 + -10.
    expect(report.counted).toBe(2);
    expect(report.headline.text).toBe("+$0.00");
  });

  it("is silent for an unreadable journal and for a journal with no futures", () => {
    expect(compilePnlStats("{nope").legacyFutures).toEqual({ count: 0, note: null });
    expect(compilePnlStats(null).legacyFutures).toEqual({ count: 0, note: null });
  });
});

/** Blank out comments so prose about the defect cannot satisfy the check. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

describe("call sites — every total that sums journal money mounts the disclosure", () => {
  const src = (rel: string) => stripComments(readFileSync(resolve(__dirname, "..", "..", "..", rel), "utf8"));

  it("/journal: the header note reads the trade records, the coach reads its own entries", () => {
    const code = src("app/journal/page.tsx");
    expect(code).toMatch(/<LegacyFuturesMoneyNote\s+records=\{tradeRecords\}/);
    expect(code).toMatch(/<LegacyFuturesMoneyNote records=\{entries\}/);
  });

  it("/journal: the contract filter and the row chip read the journal money basis", () => {
    const code = src("app/journal/page.tsx");
    expect(code).toMatch(/journalContractBasis\(e\) === filterContract/);
    expect(code).not.toMatch(/\(e\.contractType \?\? "stock"\) === filterContract/);
    expect(code).toMatch(/\["all", "stock", "option", "futures"\] as const/);
    expect(code).toMatch(/<JournalContractChip entry=\{e\}/);
  });

  it("the P&L strip and /profile show the sentence in words", () => {
    expect(src("components/chart/PnLStatsPanel.tsx")).toMatch(/report\.legacyFutures\.note !== null/);
    const profile = src("app/profile/page.tsx");
    expect(profile).toMatch(/describeLegacyFuturesMoney\(hydrateJournalEntries\(journalEntries\)\.entries\)\.note/);
    expect(profile).toMatch(/\{legacyFuturesNote\}/);
  });
});
