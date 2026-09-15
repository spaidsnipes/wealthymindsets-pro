import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  selectPositionMark,
  describePositionMark,
  summarisePositionMarks,
  describePositionMarkSummary,
  type PositionMark,
} from "./paperPositionMark";

const LONG_1 = { qty: 1, avgPx: 100 };
const fresh = (price: number, ageMs = 2_000) => ({ actionable: true, price, ageMs });
const stale = (price: number, ageMs = 900_000) => ({ actionable: false, price, ageMs });

describe("selectPositionMark — absence is not the entry price", () => {
  it("THE DEFECT: no quote does NOT mark at entry and does NOT render 0", () => {
    // `prices[sym] ?? pos.avgPx` made the subtraction yield exactly 0, and the
    // row's `up = unrealPnl >= 0` then painted a GREEN +0.00 on a position the
    // page knew nothing about.
    const mark = selectPositionMark(LONG_1, undefined);
    expect(mark.basis).toBe("unmarked");
    expect(mark.markPx, "the entry price is not a mark").toBeNull();
    expect(mark.unrealPnl, "0 asserts a measured breakeven that was never measured").toBeNull();
    expect(mark.pct).toBeNull();
  });

  it("a quote with no price is unmarked, however actionable it claims to be", () => {
    expect(selectPositionMark(LONG_1, { actionable: true, price: null, ageMs: 0 }).basis)
      .toBe("unmarked");
  });

  it("refuses a non-finite or non-positive price rather than marking on it", () => {
    for (const price of [NaN, Infinity, 0, -5]) {
      expect(selectPositionMark(LONG_1, { actionable: true, price, ageMs: 0 }).basis, `px=${price}`)
        .toBe("unmarked");
    }
  });

  it("a position with no usable entry price yields no P&L either", () => {
    expect(selectPositionMark({ qty: 1, avgPx: 0 }, fresh(110)).basis).toBe("unmarked");
    expect(selectPositionMark({ qty: NaN, avgPx: 100 }, fresh(110)).basis).toBe("unmarked");
  });
});

describe("selectPositionMark — a stale mark is marked, and says so", () => {
  it("THE SECOND DEFECT: a non-actionable quote is not silently an actionable one", () => {
    // `prices` keeps a last-known number across the STALE transition on purpose
    // so the tape can render. The money line consumed it without asking.
    const mark = selectPositionMark(LONG_1, stale(110));
    expect(mark.basis).toBe("stale");
    expect(mark.unrealPnl, "still marked — the trader is holding real risk").toBe(10);
    expect(mark.ageMs).toBe(900_000);
  });

  it("a fresh quote marks with no caveat", () => {
    const mark = selectPositionMark(LONG_1, fresh(110));
    expect(mark.basis).toBe("actionable");
    expect(mark.unrealPnl).toBe(10);
    expect(mark.pct).toBe(10);
  });

  it("the contract multiplier scales MONEY and never the price or the percent", () => {
    const mark = selectPositionMark(LONG_1, fresh(110), 20);
    expect(mark.unrealPnl, "20 points of NQ").toBe(200);
    expect(mark.markPx, "markPx stays a quoted price so the blotter matches the tape").toBe(110);
    expect(mark.pct, "a ratio is multiplier-free").toBe(10);
  });

  it("a SHORT profits when the price falls, and its percent flips sign with it", () => {
    const short = selectPositionMark({ qty: -2, avgPx: 100 }, fresh(90));
    expect(short.unrealPnl).toBe(20);
    expect(short.pct).toBe(10);
  });

  it("a losing mark is a real negative, not a refusal", () => {
    expect(selectPositionMark(LONG_1, fresh(90)).unrealPnl).toBe(-10);
  });

  it("a mark at exactly the entry price is a REAL zero, distinct from unmarked", () => {
    const flat = selectPositionMark(LONG_1, fresh(100));
    expect(flat.basis).toBe("actionable");
    expect(flat.unrealPnl, "measured zero — it has a basis behind it").toBe(0);
    expect(selectPositionMark(LONG_1, undefined).unrealPnl, "no basis at all").toBeNull();
  });

  it("an absent or nonsense age does not block the mark", () => {
    expect(selectPositionMark(LONG_1, { actionable: false, price: 110, ageMs: null }).ageMs)
      .toBeNull();
    expect(selectPositionMark(LONG_1, { actionable: false, price: 110, ageMs: -1 }).ageMs)
      .toBeNull();
  });
});

describe("describePositionMark — a caveat only when there is one", () => {
  it("says nothing on a fresh mark, because a badge on every row is wallpaper", () => {
    expect(describePositionMark(selectPositionMark(LONG_1, fresh(110)))).toBeNull();
  });

  it("names the unmarked case without implying a value", () => {
    expect(describePositionMark(selectPositionMark(LONG_1, undefined)))
      .toBe("No quote — this position is unmarked.");
  });

  it("reports how old a stale mark is", () => {
    expect(describePositionMark(selectPositionMark(LONG_1, stale(110, 45_000))))
      .toBe("Marked on a quote 45s old.");
    expect(describePositionMark(selectPositionMark(LONG_1, stale(110, 600_000))))
      .toBe("Marked on a quote 10m old.");
    expect(describePositionMark(selectPositionMark(LONG_1, { actionable: false, price: 110, ageMs: null })))
      .toBe("Marked on a stale quote.");
  });
});

describe("summarisePositionMarks — a partial sum is not a whole-book number", () => {
  const marks = (...q: (Parameters<typeof selectPositionMark>[1])[]): PositionMark[] =>
    q.map(x => selectPositionMark(LONG_1, x));

  it("an empty book has no unrealized P&L — null, not 0", () => {
    const s = summarisePositionMarks([]);
    expect(s.unrealPnl).toBeNull();
    expect(s.complete, "vacuously complete would let an empty book claim freshness").toBe(false);
  });

  it("a fully unmarked book reports null, NOT zero", () => {
    const s = summarisePositionMarks(marks(undefined, undefined));
    expect(s.unmarked).toBe(2);
    expect(s.unrealPnl, "a book of unknown value is not a book worth nothing").toBeNull();
    expect(s.complete).toBe(false);
  });

  it("sums only what could be marked and flags the rest", () => {
    const s = summarisePositionMarks(marks(fresh(110), stale(120), undefined));
    expect(s).toEqual({
      total: 3, actionable: 1, stale: 1, unmarked: 1, unrealPnl: 30, complete: false,
    });
  });

  it("complete only when every position carried a mark", () => {
    expect(summarisePositionMarks(marks(fresh(110), stale(120))).complete).toBe(true);
    expect(summarisePositionMarks(marks(fresh(110), undefined)).complete).toBe(false);
  });
});

describe("describePositionMarkSummary", () => {
  const sum = (...q: (Parameters<typeof selectPositionMark>[1])[]) =>
    summarisePositionMarks(q.map(x => selectPositionMark(LONG_1, x)));

  it("says nothing when the whole book is freshly marked", () => {
    expect(describePositionMarkSummary(sum(fresh(110), fresh(120)))).toBeNull();
    expect(describePositionMarkSummary(sum())).toBeNull();
  });

  it("names the excluded positions, and singular/plural correctly", () => {
    expect(describePositionMarkSummary(sum(fresh(110), undefined)))
      .toBe("1 position has no quote and is excluded from this number.");
    expect(describePositionMarkSummary(sum(undefined, undefined)))
      .toBe("2 positions have no quote and are excluded from this number.");
  });

  it("reports both conditions in one sentence", () => {
    expect(describePositionMarkSummary(sum(undefined, stale(120))))
      .toBe("1 position has no quote and is excluded from this number; 1 is marked on a stale quote.");
  });
});

describe("/paper marks its book through the shared owner", () => {
  const PAPER_PAGE = readFileSync(resolve(__dirname, "../app/paper/page.tsx"), "utf8");
  // Comments stripped so a PROSE mention of the old expression is not a match.
  const code = PAPER_PAGE
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("POSITIVE CONTROL: the guards below actually read /paper", () => {
    expect(PAPER_PAGE.length).toBeGreaterThan(50_000);
    expect(code).toContain("selectPositionMark");
  });

  it("THE DEFECT: no mark falls back to the entry price", () => {
    expect(
      code.replace(/\s+/g, ""),
      "marking at entry renders a green +0.00 on a position the page has no price for",
    ).not.toContain("prices[pos.symbol]??pos.avgPx");
  });

  it("the position row renders the mark caveat", () => {
    expect(code).toContain("describePositionMark");
  });
});
