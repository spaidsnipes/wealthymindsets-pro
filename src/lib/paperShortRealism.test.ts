/**
 * Scope, stated honestly.
 *
 * This proves the COUNTS, the NOTIONAL and the SENTENCES — that nothing is
 * said until a short is actually open, that an unreadable mark counts the
 * short but values nothing, and that no short is refused.
 *
 * It does not prove that any particular name would have been hard to borrow,
 * or that any particular short would have been recalled. It cannot: that
 * depends on a securities-lending market this app has no feed for, and the
 * module deliberately refuses to estimate it. The strongest things asserted
 * below are statements about /paper's OWN control flow — `applyFill` writes a
 * negative quantity with no gate, and `selectOrderRejection` returns null for
 * every sell — plus a notional DERIVED from two fields the position already
 * carried.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  selectShortRealism,
  selectShortPositionNote,
  type ShortRealismInput,
} from "./paperShortRealism";

const short = (o: Partial<ShortRealismInput> = {}): ShortRealismInput => ({
  symbol: "TSLA", qty: -10, marketPx: 100, ...o,
});

describe("selectShortRealism", () => {
  it("says nothing on a long-only book — a banner nobody earned is wallpaper", () => {
    for (const positions of [[], null, undefined]) {
      const r = selectShortRealism(positions as ShortRealismInput[]);
      expect(r.shortCount).toBe(0);
      expect(r.heading).toBeNull();
      expect(r.sentences).toEqual([]);
    }
  });

  it("ignores long and flat positions", () => {
    const r = selectShortRealism([
      short({ qty: 10 }),
      short({ qty: 0 }),
    ]);
    expect(r.shortCount).toBe(0);
    expect(r.heading).toBeNull();
  });

  it("names all three things a real short requires and this one did not", () => {
    const r = selectShortRealism([short()]);
    expect(r.heading).toBe("1 short position was opened with no shares located");
    expect(r.sentences).toHaveLength(3);
    expect(r.sentences[0]).toMatch(/No locate was required/);
    expect(r.sentences[1]).toMatch(/No collateral was posted/);
    expect(r.sentences[2]).toMatch(/No buy-in is possible/);
  });

  it("measures the notional from qty and marketPx, which the position already had", () => {
    const r = selectShortRealism([
      short({ qty: -10, marketPx: 100 }),   // 1,000
      short({ qty: -5, marketPx: 200 }),    // 1,000
    ]);
    expect(r.shortCount).toBe(2);
    expect(r.valuedCount).toBe(2);
    expect(r.shortNotional).toBe(2000);
    expect(r.heading).toBe("2 short positions were opened with no shares located");
    expect(r.sentences[1]).toMatch(/short \$2,000/);
  });

  it("names the inversion: the sale CREDITED cash instead of consuming margin", () => {
    const r = selectShortRealism([short()]);
    expect(r.sentences[1]).toMatch(/CREDITED your cash/);
    expect(r.sentences[1]).toMatch(/consumes margin rather than creating buying power/);
    expect(r.sentences[1]).toMatch(/Regulation T/);
  });

  it("H1: an unreadable mark COUNTS the short but values nothing", () => {
    const r = selectShortRealism([
      short({ marketPx: undefined }),
      short({ marketPx: 0 }),
      short({ marketPx: NaN }),
    ]);
    expect(r.shortCount).toBe(3);
    expect(r.valuedCount).toBe(0);
    expect(r.shortNotional).toBeNull();
    // Still says all three things — none of them needs a price to be true.
    expect(r.sentences).toHaveLength(3);
    // But must never print a dollar figure it did not measure.
    expect(r.sentences[1]).not.toMatch(/\$/);
  });

  it("values only what it can, when a book mixes readable and unreadable marks", () => {
    const r = selectShortRealism([
      short({ qty: -10, marketPx: 100 }),
      short({ qty: -99, marketPx: undefined }),
    ]);
    expect(r.shortCount).toBe(2);
    expect(r.valuedCount).toBe(1);
    expect(r.shortNotional).toBe(1000);
  });

  it("survives a null row and an unreadable qty without throwing", () => {
    const r = selectShortRealism([
      null as unknown as ShortRealismInput,
      { qty: NaN } as ShortRealismInput,
      short(),
    ]);
    expect(r.shortCount).toBe(1);
  });

  it("is a LABEL: no borrow rate, no recall probability, no refusal", () => {
    const r = selectShortRealism([short()]);
    expect(Object.keys(r).sort()).toEqual(
      ["heading", "sentences", "shortCount", "shortNotional", "valuedCount"].sort(),
    );
    // Fabricated NUMBERS are what a label must never mint. The word "refused"
    // does appear — in the sentence describing what a REAL broker does to an
    // unborrowable name. That is the disclosure, not a policy this module
    // enforces; the refusal guard belongs on the SOURCE and lives below.
    expect(JSON.stringify(r)).not.toMatch(/probability|chance|odds|per annum|%\s*fee/i);
  });

  it("grades a book persisted before this existed — no new field is required", () => {
    const ancient = [{ symbol: "AAPL", qty: -3, avgPx: 50, marketPx: 40 }];
    expect(selectShortRealism(ancient).shortNotional).toBe(120);
  });
});

describe("selectShortPositionNote", () => {
  it("is null for anything that is not a short", () => {
    expect(selectShortPositionNote(null)).toBeNull();
    expect(selectShortPositionNote(undefined)).toBeNull();
    expect(selectShortPositionNote(short({ qty: 10 }))).toBeNull();
    expect(selectShortPositionNote(short({ qty: 0 }))).toBeNull();
    expect(selectShortPositionNote({ qty: NaN } as ShortRealismInput)).toBeNull();
  });

  it("quotes the value of this short and names all three missing requirements", () => {
    const s = selectShortPositionNote(short({ qty: -10, marketPx: 100 }));
    expect(s).toMatch(/SHORT worth \$1,000/);
    expect(s).toMatch(/located no shares to borrow/);
    expect(s).toMatch(/posted no collateral/);
    expect(s).toMatch(/recall them at any time/);
  });

  it("H1: with no readable mark it still speaks, but prints no figure", () => {
    const s = selectShortPositionNote(short({ marketPx: undefined }));
    expect(s).toMatch(/This is a SHORT\./);
    expect(s).not.toMatch(/\$/);
  });
});

describe("the owner refuses to model", () => {
  const OWNER = readFileSync(resolve(__dirname, "./paperShortRealism.ts"), "utf8");
  const code = OWNER.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("LABEL NOT MODEL: never writes a status, never reads a clock, never rolls a die", () => {
    expect(code).not.toMatch(/status\s*[:=]\s*["']/);
    expect(code).not.toMatch(/\bDate\.now\s*\(/);
    expect(code).not.toMatch(/Math\.random/);
  });

  it("REFUSES NOTHING: the module never returns a rejection or a verdict", () => {
    // Every `return` in the owner yields a ShortRealism, a string sentence or
    // null. A refusal would have to be written as one of these shapes.
    expect(code).not.toMatch(/\brejectReason\b/);
    expect(code).not.toMatch(/return\s+(true|false)\s*;/);
    expect(code).not.toMatch(/\bthrow\b/);
  });

  it("is pure: no imports, no storage, no side effects", () => {
    expect(code).not.toMatch(/^\s*import\s/m);
    expect(code).not.toMatch(/localStorage|sessionStorage/);
  });
});

describe("the DEFECT this disclosure describes is still real", () => {
  const TRADE = readFileSync(resolve(__dirname, "./paperTrade.ts"), "utf8");

  it("POSITIVE CONTROL: the guards below actually read paperTrade", () => {
    expect(TRADE.length).toBeGreaterThan(20_000);
  });

  /**
   * A claim and its justification must fail together. Two facts carry this
   * disclosure; if either stops being true it becomes a lie, and this is where
   * that gets caught.
   */
  it("THE DEFECT: a sell still opens a negative position with no gate", () => {
    expect(TRADE).toMatch(/const signedQty = ord\.side === "buy" \? ord\.qty : -ord\.qty/);
  });

  it("THE DEFECT: a sell is still never checked for funding", () => {
    expect(TRADE).toMatch(/if \(side !== "buy"\) return null;/);
  });
});

describe("/paper renders the short disclosure", () => {
  const PAPER_PAGE = readFileSync(resolve(__dirname, "../app/paper/page.tsx"), "utf8");
  const code = PAPER_PAGE
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("POSITIVE CONTROL: the guards below actually read /paper", () => {
    expect(PAPER_PAGE.length).toBeGreaterThan(50_000);
  });

  it("the page consults the short-realism owner rather than staying silent", () => {
    expect(code).toContain("selectShortRealism");
    expect(code).toContain("selectShortPositionNote");
  });

  /**
   * The lesson paid for four times on this page: consulting a selector is not
   * rendering its answer. The ELEMENT is what gets asserted.
   */
  it("the per-position note is actually RENDERED, not merely declared", () => {
    expect(code).toContain("<ShortPositionNote pos={pos} />");
  });

  it("the book-level note is actually RENDERED", () => {
    expect(code).toContain("<ShortRealismNote positions={updatedPositions} />");
  });

  it("both are rendered in the POSITIONS tab, beside the book they describe", () => {
    const tab = code.slice(code.indexOf('tab==="positions"'));
    expect(tab.indexOf("<ShortPositionNote")).toBeGreaterThan(-1);
    expect(tab.indexOf("<ShortRealismNote")).toBeGreaterThan(-1);
  });
});
