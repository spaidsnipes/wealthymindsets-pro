import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyPaperTradeOutcome,
  isClosingPaperTrade,
  selectPaperWinRate,
  describePaperWinRate,
} from "./paperTradeOutcome";
import { applyFill, type Order, type Position } from "./paperTrade";

const ord = (side: "buy" | "sell", qty: number): Order => ({
  id: "o1", ts: 0, symbol: "NQ1!", side, type: "market", qty, status: "filled",
} as Order);

describe("classifyPaperTradeOutcome", () => {
  it("THE FIX: a measured zero is a SCRATCH, not a missing number", () => {
    // The whole reason this module exists. A close at exactly the average price
    // realises exactly 0. That is an outcome, and it used to be erased.
    expect(classifyPaperTradeOutcome({ pnl: 0 })).toBe("scratch");
  });

  it("grades a realised gain and a realised loss", () => {
    expect(classifyPaperTradeOutcome({ pnl: 12.5 })).toBe("win");
    expect(classifyPaperTradeOutcome({ pnl: -0.25 })).toBe("loss");
  });

  it("an absent pnl is NOT a scratch — it closed nothing", () => {
    // Absence is not zero (H1). An opening fill realises nothing; calling that
    // a breakeven close would invent a completed trade that never happened.
    expect(classifyPaperTradeOutcome({})).toBe("not-a-close");
    expect(classifyPaperTradeOutcome({ pnl: undefined })).toBe("not-a-close");
  });

  it("refuses a non-finite pnl rather than grading it", () => {
    for (const pnl of [NaN, Infinity, -Infinity]) {
      expect(classifyPaperTradeOutcome({ pnl }), `pnl=${pnl}`).toBe("not-a-close");
    }
  });

  it("isClosingPaperTrade admits the scratch and excludes the opening", () => {
    expect(isClosingPaperTrade({ pnl: 0 })).toBe(true);
    expect(isClosingPaperTrade({})).toBe(false);
  });
});

describe("selectPaperWinRate — openings do not belong in the denominator", () => {
  it("THE DEFECT, MEASURED: buy one then sell one at a profit is 100%, not 50%", () => {
    // This is the exact sequence /paper rendered as 50%: two trades, one win.
    // The old expression divided by trades.length, which counted the opening.
    const trades = [{}, { pnl: 250 }];
    const rate = selectPaperWinRate(trades);
    expect(rate.closed, "only the CLOSE realised anything").toBe(1);
    expect(rate.wins).toBe(1);
    expect(rate.pct, "the trader won every position they closed").toBe(100);
  });

  it("the bias grew with scale-ins — three adds and one winning close", () => {
    // The old expression rendered 1/4 = 25% here. Every add pushed it down.
    const rate = selectPaperWinRate([{}, {}, {}, { pnl: 100 }]);
    expect(rate.pct).toBe(100);
    expect(rate.closed).toBe(1);
  });

  it("a scratch counts in the denominator and not the numerator", () => {
    const rate = selectPaperWinRate([{ pnl: 10 }, { pnl: 0 }]);
    expect(rate.closed).toBe(2);
    expect(rate.wins).toBe(1);
    expect(rate.scratches).toBe(1);
    expect(rate.pct).toBe(50);
  });

  it("counts wins, losses and scratches separately", () => {
    const rate = selectPaperWinRate([
      { pnl: 1 }, { pnl: 2 }, { pnl: -1 }, { pnl: 0 }, {},
    ]);
    expect(rate).toEqual({ closed: 4, wins: 2, losses: 1, scratches: 1, pct: 50 });
  });

  it("NULL, NOT ZERO, when nothing has closed", () => {
    // 0% asserts the trader lost every trade they took. They took none.
    expect(selectPaperWinRate([]).pct).toBeNull();
    expect(selectPaperWinRate([{}, {}]).pct, "two open positions, no result yet").toBeNull();
  });

  it("never divides by zero and never returns NaN", () => {
    for (const trades of [[], [{}], [{ pnl: NaN }]]) {
      const pct = selectPaperWinRate(trades).pct;
      expect(pct === null || Number.isFinite(pct), JSON.stringify(trades)).toBe(true);
    }
  });

  it("rounds, and 1 win of 3 closes is 33%", () => {
    expect(selectPaperWinRate([{ pnl: 1 }, { pnl: -1 }, { pnl: -1 }]).pct).toBe(33);
  });
});

describe("describePaperWinRate", () => {
  it("renders W/L and returns null when nothing closed", () => {
    expect(describePaperWinRate(selectPaperWinRate([{ pnl: 1 }, { pnl: -1 }]))).toBe("50% (1W/1L)");
    expect(describePaperWinRate(selectPaperWinRate([{}]))).toBeNull();
  });

  it("names scratches ONLY when there are any", () => {
    expect(describePaperWinRate(selectPaperWinRate([{ pnl: 1 }, { pnl: 0 }]))).toBe("50% (1W/0L/1S)");
    expect(describePaperWinRate(selectPaperWinRate([{ pnl: 1 }])))
      .not.toMatch(/S\)/);
  });
});

describe("applyFill — the ledger can finally SAY zero", () => {
  it("THE FIX: a close at exactly the average price records pnl 0, not absence", () => {
    const open: Position[] = [{ symbol: "NQ1!", qty: 1, avgPx: 100, unrealPnl: 0, marketPx: 100 }];
    const { trade } = applyFill(open, ord("sell", 1), 100);
    expect(trade.pnl, "a scratch is a RESULT; the old code deleted this zero").toBe(0);
    expect(classifyPaperTradeOutcome(trade)).toBe("scratch");
  });

  it("an OPENING fill still has no pnl key at all — H1, absence is not zero", () => {
    const { trade } = applyFill([], ord("buy", 1), 100);
    expect("pnl" in trade, "an explicit 0 would assert a breakeven close that never happened")
      .toBe(false);
  });

  it("an ADD in the same direction closes nothing and records no pnl", () => {
    const open: Position[] = [{ symbol: "NQ1!", qty: 1, avgPx: 100, unrealPnl: 0, marketPx: 100 }];
    const { trade } = applyFill(open, ord("buy", 1), 110);
    expect("pnl" in trade).toBe(false);
  });

  it("a winning and a losing close still record their real numbers", () => {
    const open: Position[] = [{ symbol: "NQ1!", qty: 1, avgPx: 100, unrealPnl: 0, marketPx: 100 }];
    expect(applyFill(open, ord("sell", 1), 110).trade.pnl).toBe(10);
    expect(applyFill(open, ord("sell", 1), 90).trade.pnl).toBe(-10);
  });

  it("END TO END: open, add, scratch-close — the win rate is not 0%", () => {
    let pos: Position[] = [];
    const trades = [];
    for (const [side, qty, px] of [["buy", 1, 100], ["buy", 1, 102], ["sell", 2, 101]] as const) {
      const r = applyFill(pos, ord(side, qty), px);
      pos = r.positions;
      trades.push(r.trade);
    }
    const rate = selectPaperWinRate(trades);
    expect(rate.closed, "one of the three fills closed size").toBe(1);
    expect(rate.scratches, "avg 101, closed at 101 — a real scratch").toBe(1);
    expect(rate.pct).toBe(0);
    // And crucially it is DISTINGUISHABLE from having traded nothing:
    expect(selectPaperWinRate([]).pct).toBeNull();
  });
});

describe("/paper renders the win rate from the shared owner", () => {
  const PAPER_PAGE = readFileSync(resolve(__dirname, "../app/paper/page.tsx"), "utf8");
  // Comments stripped so a PROSE mention of the old expression is not a match.
  const code = PAPER_PAGE
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("POSITIVE CONTROL: the guards below actually read /paper", () => {
    expect(PAPER_PAGE.length).toBeGreaterThan(50_000);
    expect(code).toContain("selectPaperWinRate");
  });

  it("THE DEFECT: no render site divides by the whole trade ledger", () => {
    // Three sites re-typed this. One owner now, so they cannot drift apart.
    expect(
      code.replace(/\s+/g, ""),
      "openings realise nothing and can never be wins; they must not sit in the denominator",
    ).not.toContain(">0).length/trades.length");
  });

  it("the blotter line comes from describePaperWinRate", () => {
    expect(code).toContain("describePaperWinRate(winRate)");
  });
});
