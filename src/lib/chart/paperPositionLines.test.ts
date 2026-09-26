/**
 * paperPositionLines — the /charts paper line states PAPER money through the
 * one owner of each fact (Garden 16 §17, found in source 2026-09-26).
 *
 * Books are built as the RAW STRINGS localStorage would hold and read through
 * `parsePaperSnapshot` — the same parser /paper uses — so a book /paper would
 * put behind RECOVERY REQUIRED is exercised exactly as the chart meets it.
 */
import { describe, expect, it } from "vitest";
import { parsePaperSnapshot, type PaperSnapshot } from "@/lib/paperTrade";
import {
  PAPER_BOOK_RECOVERY_WORDS,
  paperPositionLineTitle,
  selectPaperPositionLines,
} from "./paperPositionLines";

const pos = (symbol: string, qty: number, avgPx: number) => ({ symbol, qty, avgPx, unrealPnl: 0, marketPx: avgPx });

function book(positions: unknown[], extra: Record<string, unknown> = {}): PaperSnapshot {
  const snap = parsePaperSnapshot(JSON.stringify({ revision: 3, cash: 100_000, positions, orders: [], trades: [], equity: [], ...extra }));
  if (!snap) throw new Error("test book did not parse");
  return snap;
}

describe("money carries the contract's point value", () => {
  it("THE FOUND DEFECT: one ES1! up 10 points is +$500.00, not +$10", () => {
    const plan = selectPaperPositionLines(book([pos("ES1!", 1, 5870)]), "ES1!");
    expect(plan.status).toBe("DRAWN");
    expect(plan.lines[0].pointValue).toBe(50);
    expect(paperPositionLineTitle(plan.lines[0], 5880).text).toBe("PAPER LONG 1 · +$500.00");
  });

  it("NQ, GC and CL at their CME point values", () => {
    const t = (sym: string, avg: number, last: number, qty = 1) =>
      paperPositionLineTitle(selectPaperPositionLines(book([pos(sym, qty, avg)]), sym).lines[0], last).text;
    expect(t("NQ1!", 21_750, 21_760)).toBe("PAPER LONG 1 · +$200.00");
    expect(t("GC1!", 2_640, 2_645)).toBe("PAPER LONG 1 · +$500.00");
    expect(t("CL1!", 78, 77, 2)).toBe("PAPER LONG 2 · -$2,000.00");
  });

  it("a short's P&L is signed and scaled", () => {
    const plan = selectPaperPositionLines(book([pos("ES1!", -2, 5870)]), "ES1!");
    const title = paperPositionLineTitle(plan.lines[0], 5860);
    expect(title).toEqual({ up: true, text: "PAPER SHORT 2 · +$1,000.00" });
    expect(paperPositionLineTitle(plan.lines[0], 5875)).toEqual({ up: false, text: "PAPER SHORT 2 · -$500.00" });
  });

  it("shares and coins stay 1:1", () => {
    const tsla = selectPaperPositionLines(book([pos("TSLA", 10, 400)]), "TSLA");
    expect(paperPositionLineTitle(tsla.lines[0], 404.5).text).toBe("PAPER LONG 10 · +$45.00");
    const btc = selectPaperPositionLines(book([pos("BTC", 0.5, 100_000)]), "BTC-USD");
    expect(paperPositionLineTitle(btc.lines[0], 101_000).text).toBe("PAPER LONG 0.5 · +$500.00");
  });

  it("no price is P&L UNKNOWN — never the whole entry value as a loss", () => {
    const plan = selectPaperPositionLines(book([pos("ES1!", 1, 5870)]), "ES1!");
    for (const lp of [0, Number.NaN, -1]) {
      expect(paperPositionLineTitle(plan.lines[0], lp)).toEqual({ up: null, text: "PAPER LONG 1 · P&L UNKNOWN (no price)" });
    }
  });

  it("every title begins with the word PAPER", () => {
    const plan = selectPaperPositionLines(book([pos("ES1!", 1, 5870), pos("ES1!", -1, 5900)]), "ES1!");
    for (const l of plan.lines) {
      for (const lp of [0, 5860, 5880]) expect(paperPositionLineTitle(l, lp).text.startsWith("PAPER ")).toBe(true);
    }
  });
});

describe("the book is read through its own parser and barrier", () => {
  it("a book with a record /paper could not read draws NOTHING and says so", () => {
    // One good ES position beside one malformed record: /paper shows
    // RECOVERY REQUIRED for this book, so the chart may not draw the good one.
    const snap = book([pos("ES1!", 1, 5870), { symbol: null, qty: "abc" }]);
    expect(snap.integrity.rejected).toBe(1);
    const plan = selectPaperPositionLines(snap, "ES1!");
    expect(plan.status).toBe("RECOVERY_REQUIRED");
    expect(plan.lines).toEqual([]);
    expect(plan.receipt).toBe("RECOVERY_REQUIRED");
    expect(plan.status === "RECOVERY_REQUIRED" && plan.words).toBe(PAPER_BOOK_RECOVERY_WORDS);
    expect(PAPER_BOOK_RECOVERY_WORDS).toBe(
      "PAPER BOOK RECOVERY REQUIRED · paper positions are not drawn until the book is recovered on Paper",
    );
  });

  it("a corrupt cash value is also behind the barrier", () => {
    const plan = selectPaperPositionLines(book([pos("ES1!", 1, 5870)], { cash: "lots" }), "ES1!");
    expect(plan.status).toBe("RECOVERY_REQUIRED");
  });

  it("an unreadable book is behind the barrier", () => {
    const snap: PaperSnapshot = {
      state: book([pos("ES1!", 1, 5870)]).state,
      integrity: { positions: 0, orders: 0, trades: 0, equity: 0, optionPositions: 0, cash: 0, rejected: 0, unreadable: true },
    };
    expect(selectPaperPositionLines(snap, "ES1!").status).toBe("RECOVERY_REQUIRED");
  });

  it("a clean book with nothing on this symbol is NONE, and a flat position is not a line", () => {
    expect(selectPaperPositionLines(book([pos("NQ1!", 1, 21_750)]), "ES1!").receipt).toBe("NONE");
    expect(selectPaperPositionLines(book([pos("ES1!", 0, 5870)]), "ES1!").status).toBe("NONE");
  });

  it("the receipt names symbol, size, entry and point value", () => {
    expect(selectPaperPositionLines(book([pos("ES1!", 2, 5870.25)]), "ES=F").receipt).toBe("DRAWN:ES1!x2@5870.25:pv=50");
  });
});

describe("symbols match through the one notation owner", () => {
  it("every notation of ES finds the book's ES1! — and gets its $50", () => {
    for (const chart of ["ES1!", "ES=F", "/ES", "es1!"]) {
      const plan = selectPaperPositionLines(book([pos("ES1!", 1, 5870)]), chart);
      expect(plan.status, chart).toBe("DRAWN");
      expect(plan.lines[0].pointValue, chart).toBe(50);
    }
  });

  it("a micro is not its big brother", () => {
    expect(selectPaperPositionLines(book([pos("ES1!", 1, 5870)]), "MES1!").status).toBe("NONE");
  });

  it("the book's USD BTC draws on USD charts, never on a USDT market", () => {
    for (const chart of ["BTC", "BTCUSD", "BTC-USD", "BTC/USD"]) {
      expect(selectPaperPositionLines(book([pos("BTC", 1, 100_000)]), chart).status, chart).toBe("DRAWN");
    }
    // The old private rule stripped USDT and drew this — marked at the USDT
    // market's last price.
    expect(selectPaperPositionLines(book([pos("BTC", 1, 100_000)]), "BTCUSDT").status).toBe("NONE");
  });

  it("different instruments never match", () => {
    expect(selectPaperPositionLines(book([pos("TSLA", 1, 400)]), "TSL").status).toBe("NONE");
    expect(selectPaperPositionLines(book([pos("GC1!", 1, 2640)]), "XAUUSD").status).toBe("NONE");
    expect(selectPaperPositionLines(book([pos("ES1!", 1, 5870)]), "").status).toBe("NONE");
  });
});

describe("price-line words (placed on the WM glass, 2026-09-26)", () => {
  it("broker words: a stock names its cost; an option confesses its premium", async () => {
    const { brokerCostLineTitle } = await import("./paperPositionLines");
    expect(brokerCostLineTitle({ instrumentType: "STOCK", quantity: 3, costPrice: 366.5 })).toBe("WEBULL COST ×3");
    expect(brokerCostLineTitle({
      instrumentType: "OPTION", quantity: 2, costPrice: 4.1,
      option: { type: "CALL", strike: 400, expireDate: "2026-10-17" },
    })).toBe("WEBULL 400C 10-17 ×2 · prem 4.1");
    expect(brokerCostLineTitle({
      instrumentType: "OPTION", quantity: 1, costPrice: 2,
      option: { type: "PUT", strike: 350, expireDate: "2026-11-20" },
    })).toBe("WEBULL 350P 11-20 ×1 · prem 2");
  });

  it("the native title is empty — the words are the overlay's", async () => {
    const { PRICE_LINE_NATIVE_TITLE } = await import("./paperPositionLines");
    expect(PRICE_LINE_NATIVE_TITLE).toBe("");
  });

  it("the words' right end stands left of the profile family and the plot edge", async () => {
    const { priceLineWordsRightEdge } = await import("./paperPositionLines");
    // Measured on the glass: plot right 1268, stack left 1092, Living body left 892.
    expect(priceLineWordsRightEdge({ plotRight: 1268, profileStackLeft: 1092, livingBodyLeft: 892 })).toBe(884);
    expect(priceLineWordsRightEdge({ plotRight: 1268, profileStackLeft: 1092, livingBodyLeft: null })).toBe(1084);
    expect(priceLineWordsRightEdge({ plotRight: 1268 })).toBe(1260);
    expect(priceLineWordsRightEdge({ plotRight: 1268, profileStackLeft: Number.NaN })).toBe(1260);
    expect(priceLineWordsRightEdge({ plotRight: 1268, livingBodyLeft: 900, gap: 12 })).toBe(888);
  });

  it("receipt names each word and its placement, or NONE", async () => {
    const { priceLineWordsReceipt } = await import("./paperPositionLines");
    expect(priceLineWordsReceipt([])).toBe("NONE");
    expect(priceLineWordsReceipt([
      { kind: "PAPER", price: 370, mode: "CLEAR" },
      { kind: "BROKER", price: 366.5, mode: "WITHHELD" },
    ])).toBe("PAPER@370:CLEAR,BROKER@366.5:WITHHELD");
  });
});
