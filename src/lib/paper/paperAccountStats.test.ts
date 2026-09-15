import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  paperAccountStats,
  paperWinRateStat,
  type PaperBookFacts,
} from "./paperAccountStats";

const PAGE = fs.readFileSync(
  path.join(process.cwd(), "src/app/paper/page.tsx"),
  "utf8",
);
const PAGE_CODE = PAGE
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const base: PaperBookFacts = {
  bookRecoveryRequired: false,
  hasUnmarkedOptions: false,
  unmarkedOptionCount: 0,
  neverTraded: true,
  totalEquity: 100000,
  cash: 100000,
  dayPnl: 0,
  realizedPnl: 0,
  winRatePct: null,
  closedCount: 0,
};
const f = (o: Partial<PaperBookFacts> = {}): PaperBookFacts => ({ ...base, ...o });
const by = (facts: PaperBookFacts, label: string) =>
  paperAccountStats(facts).find((s) => s.label === label)!;

describe("removing a false tint must not also erase a true number", () => {
  it("THE OVER-CORRECTION: an untraded book still states its zero", () => {
    // WAS `bookNeverTraded ? "—" : …`. Day P&L is a SUM; the sum of no trades
    // is exactly $0.00 and that is a fact we hold. The dash said we did not.
    const d = by(f(), "Day P&L");
    expect(d.kind).toBe("MEASURED");
    expect(d.value).toBe("+$0.00");
    expect(d.value).not.toBe("—");
    expect(d.reason).toContain("sum over nothing is zero");
  });

  it("THE ORIGINAL DEFECT: that zero must NOT wear the win tint", () => {
    // `0 >= 0` is true, so the green was arithmetically earned and false.
    expect(by(f(), "Day P&L").tone).toBe("NEUTRAL");
    expect(by(f(), "Realized").tone).toBe("NEUTRAL");
  });

  it("A TRADED DAY THAT FINISHED FLAT IS A DIFFERENT FACT", () => {
    // Same figure, different meaning. The question was never "is it zero".
    const traded = f({ neverTraded: false, dayPnl: 0, realizedPnl: 0, winRatePct: 0, closedCount: 2 });
    const d = by(traded, "Day P&L");
    expect(d.value).toBe("+$0.00");
    expect(d.kind).toBe("MEASURED");
    expect(d.reason).not.toContain("No trades have been placed");
    // Flat is flat — still not a win.
    expect(d.tone).toBe("NEUTRAL");
  });

  it("a real result keeps its tint in both directions", () => {
    expect(by(f({ neverTraded: false, dayPnl: 250 }), "Day P&L").tone).toBe("WIN");
    expect(by(f({ neverTraded: false, dayPnl: -250 }), "Day P&L").tone).toBe("LOSS");
    expect(by(f({ neverTraded: false, dayPnl: -250 }), "Day P&L").value).toBe("-$250.00");
  });

  it("A SUM AND A RATIO DO NOT FAIL THE SAME WAY ON AN EMPTY BOOK", () => {
    // The two sat side by side under one glyph. Only one may refuse.
    const facts = f();
    expect(by(facts, "Day P&L").kind).toBe("MEASURED");
    const wr = paperWinRateStat(facts);
    expect(wr.kind).toBe("UNDEFINED");
    expect(wr.value).not.toBe("0%");
    expect(wr.value).not.toBe("—");
    expect(wr.reason).toContain("NOT zero percent");
  });

  it("EQUITY AND CASH WERE NEVER PART OF THE DEFECT", () => {
    // $100,000 of simulated cash really is held, before the first trade.
    expect(by(f(), "Equity").value).toBe("$100,000");
    expect(by(f(), "Equity").kind).toBe("MEASURED");
    expect(by(f(), "Cash").value).toBe("$100,000");
  });

  it("unreadable bytes are UNKNOWN, which is not absent and not zero", () => {
    const broken = f({ bookRecoveryRequired: true });
    for (const s of paperAccountStats(broken)) {
      expect(s.value).toBe("UNKNOWN");
      expect(s.kind).toBe("UNKNOWN");
      expect(s.tone).toBe("ALERT");
    }
    expect(paperWinRateStat(broken).kind).toBe("UNKNOWN");
  });

  it("unmarked options make EQUITY unknown but not the whole strip", () => {
    const partial = f({ hasUnmarkedOptions: true, unmarkedOptionCount: 2, neverTraded: false, dayPnl: 100 });
    expect(by(partial, "Equity").kind).toBe("UNKNOWN");
    expect(by(partial, "Cash").kind).toBe("MEASURED");
    // The P&L cell renames itself rather than pretending to be complete.
    expect(by(partial, "Known P&L").kind).toBe("MEASURED");
    expect(by(partial, "Known P&L").reason).toContain("EXCLUDING");
  });

  it("no tile renders a bare glyph and every tile carries a reason", () => {
    const cases = [
      f(),
      f({ bookRecoveryRequired: true }),
      f({ hasUnmarkedOptions: true, unmarkedOptionCount: 1 }),
      f({ neverTraded: false, dayPnl: -5, realizedPnl: -5, winRatePct: 33, closedCount: 3 }),
    ];
    for (const facts of cases) {
      for (const s of [...paperAccountStats(facts), paperWinRateStat(facts)]) {
        expect(s.value).not.toBe("—");
        expect(s.value.trim().length).toBeGreaterThan(0);
        expect(s.reason.length).toBeGreaterThan(20);
        expect(s.reason).not.toBe(s.label);
      }
    }
  });

  it("the page reads the strip from the owner and computes none of it", () => {
    expect(PAGE_CODE).toContain("paperAccountStats(");
    expect(PAGE_CODE).toContain("paperWinRateStat(");
    // THE OVER-CORRECTION, VERBATIM. Reintroducing the dash is how a true
    // zero gets erased again.
    expect(PAGE_CODE).not.toMatch(/bookNeverTraded\s*\?\s*"—"/);
    expect(PAGE_CODE).not.toMatch(/winRate\.pct\s*==\s*null\s*\?\s*"—"/);
  });

  it("the reason is announced on a phone, not only hovered", () => {
    expect(PAGE_CODE).toContain("title={s.reason}");
    expect(PAGE_CODE).toContain("aria-label={`${s.label}: ${s.value}. ${s.reason}`}");
  });
});
