/**
 * Garden 18 §4 finding 1 (2026-10-06): the journal was empty, yet a helper
 * implied an EMPTY entry could count as a breakeven 0R. The page gate refused
 * it, but the two money helpers saveEntry calls answered WRITE pnl 0 /
 * realizedR 0 on their own — a second lock that was open.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { computeJournalRealizedR, selectJournalSaveMoney } from "./computePnl";
import { backtestRunLine } from "../backtest/engine";

describe("an empty / incomplete entry is never a breakeven trade", () => {
  const empties = [
    { entry: 0, exit: 0, size: 0 },
    { entry: NaN, exit: NaN, size: NaN },
    { entry: 100, exit: 0, size: 1 },
    { entry: 100, exit: 101, size: 0 },
    { entry: undefined as unknown as number, exit: 101, size: 1 },
  ];
  it.each(empties)("realized R is undefined, never 0R (%o)", (f) => {
    expect(computeJournalRealizedR({ ...f, side: "long", symbol: "TSLA", plannedRDollars: 50 })).toBeUndefined();
  });
  it.each(empties)("the save helper refuses it, never WRITE pnl 0 (%o)", (f) => {
    const r = selectJournalSaveMoney({ ...f, side: "long", symbol: "TSLA", plannedRDollars: 50 });
    expect(r.status).toBe("REFUSED");
  });
  it("an M0 no-trade day is still recorded (not a trade, R undefined)", () => {
    expect(selectJournalSaveMoney({ entry: 0, exit: 0, size: 0, side: "long", isNoTradeDay: true }))
      .toEqual({ status: "WRITE", pnl: 0, realizedR: undefined });
  });
  it("a complete trade closed exactly flat IS a measured breakeven", () => {
    expect(selectJournalSaveMoney({ entry: 100, exit: 100, size: 1, side: "long", symbol: "TSLA", plannedRDollars: 50 }))
      .toEqual({ status: "WRITE", pnl: 0, realizedR: 0 });
  });
});

describe("zero-trade metrics stay undefined", () => {
  it("the journal header never prints a win rate over zero trades", () => {
    const src = readFileSync(path.resolve(__dirname, "../../app/journal/page.tsx"), "utf8");
    // Stricter since the n ≥ 20 guard: a rate only at 20+; 1–19 say INSUFFICIENT EVIDENCE; 0 says UNKNOWN.
    expect(src).toContain("{isMeasured(tradeRecords.length) ? (");
    expect(src).toContain(") : tradeRecords.length > 0 ? (");
    expect(src).toContain("WR UNKNOWN · no journal entries");
  });
  it("a zero-trade backtest hands the journal no 0% win rate / 0.00 profit factor", () => {
    const line = backtestRunLine({ trades: [], winRate: 0, profitFactor: 0, totalPnl: 0 });
    expect(line).not.toMatch(/0%|0\.00/);
    expect(line).toMatch(/no win rate or profit factor/);
    const src = readFileSync(path.resolve(__dirname, "../../app/backtesting/page.tsx"), "utf8");
    expect(src).toContain("backtestRunLine(result)");
    expect(src).not.toMatch(/win rate \$\{result\.winRate\}%/);
  });
});

describe("Garden 18 §4 finding 2 — the empty journal never overwrites broker-ledger facts", () => {
  const src = readFileSync(path.resolve(__dirname, "../../app/journal/page.tsx"), "utf8");
  it("the journal's own totals step aside on the Broker Ledger tab", () => {
    expect(src).toContain(`style={mainTab === "ledger" ? { display: "none" } : undefined}`);
  });
  it("empty-journal chips are scoped to the JOURNAL, never stated as the trader's money", () => {
    expect(src).toContain("NO P&amp;L TO TOTAL · no journal entries");
    expect(src).not.toMatch(/NO P&amp;L TO TOTAL ·[^<]*no trades<\//);
  });
  it("broker truth reads the broker, not the journal list", () => {
    const btt = readFileSync(path.resolve(__dirname, "../../components/journal/BrokerTruthToday.tsx"), "utf8");
    expect(btt).toContain("/api/broker/journal-feed");
    expect(btt).not.toMatch(/\bentries\b\.length/);
  });
});
