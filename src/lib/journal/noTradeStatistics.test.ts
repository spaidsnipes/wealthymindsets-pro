import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * CALL-SITE SENTINEL — /journal must not score a day nobody traded.
 *
 * WHY THIS FILE EXISTS (§22 — a Sentinel that never fires is worthless):
 *
 * tradeRecords.test.ts proves `selectTradeRecords` CAN separate a trade from a
 * canon §3 M0 NO TRADE record. It cannot prove the page asks it. The defect was
 * never in a helper — it was four separate aggregations on /journal that each
 * used the raw record list as an OUTCOME denominator:
 *
 *     winRate  = wins / entries.length
 *     setupMap[e.setup].pnl += e.pnl
 *     hasJournalCoachEvidence(entries.length)
 *
 * so a trader who honoured five no-trade days watched their win rate fall for
 * having obeyed the rule, and enough no-trade days could buy the coach the
 * right to make win-rate claims about a strategy that was never executed.
 *
 * The law has two halves and BOTH must hold: outcome statistics count trades,
 * and record surfaces still count records. A fix that hid M0 rows from the
 * journal would have destroyed the thing canon §3 exists to build.
 */

const JOURNAL = resolve(__dirname, "..", "..", "app", "journal", "page.tsx");

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

describe("/journal — an M0 no-trade day is never scored as a trade", () => {
  const code = stripComments(readFileSync(JOURNAL, "utf8"));

  it("consults the canonical owner rather than testing dayModel inline", () => {
    expect(code).toMatch(
      /import \{[^}]*\bselectTradeRecords\b[^}]*\} from "@\/lib\/journal\/tradeRecords"/,
    );
    // §24 / H21 — one owner. A second hand-rolled record-level M0 filter is
    // exactly how the first one stops being true. `form.dayModel !== "M0"` is
    // allowed to stay: it answers a different question (should the entry/exit
    // /size FIELDS be shown while typing), not whether a saved record scores.
    expect(code).not.toMatch(/(?<!form\.)\be\.dayModel\s*!==\s*"M0"/);
    expect(code).not.toMatch(/filter\([^)]*dayModel\s*!==\s*"M0"/);
  });

  it("THE DEFECT: the win-rate denominator is trades taken, not records kept", () => {
    expect(code).toMatch(/const tradeRecords = selectTradeRecords\(entries\)/);
    expect(code).toMatch(/winRate\s*=\s*tradeRecords\.length \?/);
    expect(code).not.toMatch(/winRate\s*=\s*entries\.length \?/);
  });

  it("wins, losses and total P&L are drawn from the same trade set", () => {
    // A denominator fixed on its own, with wins still counted over records,
    // is a new wrong number rather than a repaired one.
    expect(code).toMatch(/const wins\s*=\s*tradeRecords\.filter/);
    expect(code).toMatch(/const losses\s*=\s*tradeRecords\.filter/);
    // The total is summed over the SAME trade set, and — since `e.pnl` reaches
    // this page through an unchecked cast — through the owner that refuses to
    // coerce a null, a missing field or a stored string into money.
    expect(code).toMatch(/const recordedTotal = selectRecordedTotal\(tradeRecords\)/);
    expect(code).not.toMatch(/reduce\(\(s, e\) => s \+ e\.pnl, 0\)/);
  });

  it("THE SHARPEST ONE: no-trade days cannot unlock the evidence gate", () => {
    // hasJournalCoachEvidence guards win-rate / R:R / profit-factor claims.
    // StrategyCoach must narrow its records to trades BEFORE the gate runs.
    const start = code.indexOf("function StrategyCoach");
    expect(start).toBeGreaterThan(-1);
    const head = code.slice(start, start + 700);
    expect(head).toMatch(/const entries = selectTradeRecords\(records\)/);
    expect(head.indexOf("selectTradeRecords")).toBeLessThan(
      head.indexOf("hasJournalCoachEvidence"),
    );
  });

  it("THE OTHER HALF: M0 records are still counted as RECORDS", () => {
    // The fix must not delete a no-trade day from the journal. Canon §3 asks
    // for exactly this record; a fix that hides it destroys what it protects.
    expect(code).toMatch(/\{entries\.length\} entries/);
    // The list, filters and export still operate on the full record set.
    expect(code).toMatch(/const filtered = linkedEntries\.filter/);
    expect(code).not.toMatch(/selectTradeRecords\(filtered\)/);
  });

  it("a shrinking denominator is announced, never silent", () => {
    // A trader who sees 12 entries and a win rate over 10 has no way to learn
    // why unless the page says so.
    expect(code).toMatch(/describeNoTradeExclusion/);
    expect(code).toMatch(/M0 NO TRADE not scored/);
  });

  it("H1: an all-no-trade journal reports UNKNOWN, not 0%", () => {
    // "0% WR" over zero trades reads as a column of losses to a trader who
    // correctly took none — absence is not zero.
    expect(code).toMatch(/tradeRecords\.length > 0 \?/);
    expect(code).toMatch(/WR UNKNOWN/);
  });

  it("the journal ROW asks the owner what the record says", () => {
    // Holding M0 out of the statistics stopped it being COUNTED as a
    // breakeven. It did not stop it being LABELLED one: the row still read
    // "$0.00" in the same muted grey as a trade scratched at its entry price.
    expect(code).toMatch(/const outcome = describeRecordOutcome\(e\)/);
    // "$0.00" is a price. It may only render when money actually moved.
    expect(code).toMatch(/outcome\.hasMoney \?/);
    const at = code.indexOf("const outcome = describeRecordOutcome(e)");
    const row = code.slice(at, at + 1600);
    expect(row).toMatch(/\{fmtPnl\(e\.pnl\)\}/);
    expect(row.indexOf("outcome.hasMoney")).toBeLessThan(row.indexOf("{fmtPnl(e.pnl)}"));
  });

  it("no total is rendered straight out of an unchecked cast", () => {
    // `entries` is `read.records as JournalEntry[]` — readJournalStorage
    // validates array-ness and nothing else. Both totals on this page must
    // route through the owner, not just the header one.
    expect(code).toMatch(
      /import \{ selectRecordedTotal \} from "@\/lib\/journal\/selectRecordedTotal"/,
    );
    expect(code).toMatch(/const coachTotal = selectRecordedTotal\(entries\)/);
    const sums = code.match(/\.reduce\(\(s, e\) => s \+ e\.pnl/g) ?? [];
    expect(sums).toHaveLength(0);
  });

  it("§9: a total WM could not compute is never painted as a loss", () => {
    // fmtPnl(NaN) rendered "-$NaN", and `totalPnl >= 0` is false for NaN, so
    // the chip took the red treatment reserved for money actually lost.
    expect(code).toMatch(/recordedTotal\.total === null \?/);
    expect(code).toMatch(/P&amp;L UNKNOWN/);
    const at = code.indexOf("P&amp;L UNKNOWN");
    const chip = code.slice(code.lastIndexOf("<span", at), code.indexOf("</span>", at));
    expect(chip).not.toMatch(/wm-red|#d4af37/);
  });

  it("a partial total says so as TEXT, not only in a tooltip", () => {
    // H18 on a third surface: a tooltip is not a label, and on the
    // founder-path phone it does not exist at all.
    expect(code).toMatch(/\{recordedTotal\.note\}/);
    expect(code).not.toMatch(/title=\{recordedTotal\.note\}/);
    const at = code.indexOf("{recordedTotal.note}");
    expect(code.slice(Math.max(0, at - 400), at)).toMatch(/role="note"/);
  });

  it("§8/§9: an unscored record is not an error and is not alarmed", () => {
    // Scoped to the UNKNOWN chip's own element — the neighbouring P&L chip
    // legitimately uses wm-red for a negative total, which IS money lost.
    const at = code.indexOf("WR UNKNOWN");
    expect(at).toBeGreaterThan(-1);
    const open = code.lastIndexOf("<span", at);
    const chip = code.slice(open, code.indexOf("</span>", at));
    expect(chip).not.toMatch(/\bERROR\b|\bINVALID\b|\bFAILED\b/);
    expect(chip).not.toMatch(/text-wm-red|#d4af37|text-wm-gold/);
    // §9: unknown is quiet — the neutral surface, not the identity metal.
    expect(chip).toMatch(/bg-wm-surface|text-wm-text-dim/);
  });
});
