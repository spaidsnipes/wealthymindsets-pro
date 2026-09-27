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

describe("JournalContractChip — Garden 16 §65: words and style agree", () => {
  it("an M0 day on an unpriced root is a quiet blue chip whose words do not say UNPRICED", () => {
    const html = renderToStaticMarkup(
      <JournalContractChip entry={{ ...ES, symbol: "YM1!", entry: 40000, exit: 40010, pnl: 0, dayModel: "M0" }} />,
    );
    expect(html).toContain(">FUT YM</span>");
    expect(html).toContain("text-wm-blue");
    expect(html).not.toContain("UNPRICED");
    expect(html).toContain('title="FUTURES YM · M0 no-trade day — no money recorded"');
  });

  it("an option on ES is a dim, flagged OPT chip that says why on hover", () => {
    const html = renderToStaticMarkup(
      <JournalContractChip entry={{ symbol: "ES1!", contractType: "option", entry: 10, exit: 12, size: 1, side: "long", pnl: 200 }} />,
    );
    expect(html).toContain(">OPT</span>");
    expect(html).toContain("text-wm-text-dim");
    expect(html).not.toContain("text-wm-purple");
    expect(html).toContain("OPTION ON ES · UNPRICED — an option on ES futures is not priced at the 100x equity-option standard");
  });
});

describe("LegacyFuturesMoneyNote — what the totals say", () => {
  it("a 100x option-on-ES row alone is never told it was saved at $1 per point", () => {
    const html = renderToStaticMarkup(
      <LegacyFuturesMoneyNote records={[{ symbol: "ES1!", contractType: "option", entry: 10, exit: 12, size: 1, side: "long", pnl: 200 }]} />,
    );
    expect(html).toContain("1 entry carries a recorded P&amp;L that is not its contract&#x27;s money");
    expect(html).not.toContain("$1 per point.");
    expect(html).not.toContain("understate");
  });

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
    expect(report.legacyFutures.chip).toBe("1 futures at $1/pt");
    // Nothing excluded, nothing rewritten: 10 + -10.
    expect(report.counted).toBe(2);
    expect(report.headline.text).toBe("+$0.00");
  });

  it("a YM1! row saved at $1/pt reaches the strip as UNKNOWN, never as '$1/pt' or 'understate' (§65 Y1 repair)", () => {
    const raw = JSON.stringify([
      { id: "y", date: "2026-09-03", symbol: "YM1!", side: "long", entry: 40000, exit: 40010, size: 1, pnl: 10, result: "win" },
    ]);
    const lf = compilePnlStats(raw).legacyFutures;
    expect(lf).toMatchObject({ count: 0, unknownCount: 1, unknownRoots: ["YM"], otherCount: 0 });
    expect(lf.chip).toBe("1 futures money UNKNOWN");
    expect(lf.note).toContain("WM has no point value for YM, so its true money is UNKNOWN");
    expect(lf.note).not.toMatch(/understate|\$1\/pt|see its futures money/);
  });

  it("is silent for an unreadable journal and for a journal with no futures", () => {
    const none = { count: 0, unknownCount: 0, unknownRoots: [], otherCount: 0, note: null, chip: null };
    expect(compilePnlStats("{nope").legacyFutures).toEqual(none);
    expect(compilePnlStats(null).legacyFutures).toEqual(none);
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

  it("/journal Y2: the gate wrapping the row chip and the Proof Lane gate are the owner's predicates", () => {
    const code = src("app/journal/page.tsx");
    const rowGate = code.indexOf("{journalRowShowsProofChips(e) && (");
    expect(rowGate, "list-row chip strip gated by journalRowShowsProofChips").toBeGreaterThan(-1);
    const chip = code.indexOf("<JournalContractChip entry={e}", rowGate);
    expect(chip - rowGate, "the contract chip sits inside that gate").toBeGreaterThan(0);
    expect(chip - rowGate).toBeLessThan(1500);
    const laneGate = code.indexOf("{journalShowsProofLane(selected) && (");
    expect(laneGate, "Proof Lane block gated by journalShowsProofLane").toBeGreaterThan(-1);
    const tile = code.indexOf(">Contract</div>", laneGate);
    expect(tile - laneGate).toBeGreaterThan(0);
    expect(tile - laneGate).toBeLessThan(4000);
    // The old hand-written gates, which a later edit could quietly narrow, are gone.
    expect(code).not.toMatch(/\{\(e\.dayModel \|\| typeof e\.realizedR === "number"/);
    expect(code).not.toMatch(/\{\(selected\.dayModel \|\| typeof selected\.plannedRDollars === "number"/);
  });

  it("the P&L strip and /profile show the sentence in words", () => {
    const panel = src("components/chart/PnLStatsPanel.tsx");
    expect(panel).toMatch(/report\.legacyFutures\.note !== null/);
    // Y1: the strip's short words come from the owner, never a local "$1/pt" count.
    expect(panel).toMatch(/\{report\.legacyFutures\.chip\}/);
    expect(panel).not.toMatch(/legacyFutures\.count\} futures at \$1\/pt/);
    const profile = src("app/profile/page.tsx");
    expect(profile).toMatch(/describeLegacyFuturesMoney\(hydrateJournalEntries\(journalEntries\)\.entries\)\.note/);
    expect(profile).toMatch(/\{legacyFuturesNote\}/);
  });
});
