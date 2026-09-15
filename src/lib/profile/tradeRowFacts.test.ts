/**
 * Sentinel — /profile Recent Trades row.
 *
 * PINNED TO MEANING. Each assertion fails when WM either invents a figure the
 * trader never recorded, or renders a corrupt one as though it were measured.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  riskMultipleFact,
  tradeDateFact,
  tradePriceFact,
  tradeSymbolFact,
  type TradeRowFact,
} from "./tradeRowFacts";

describe("tradeDateFact — the row's anchor in time", () => {
  it("× THE UTC MIDNIGHT SHIFT: a calendar date is never routed through an instant", () => {
    // `new Date("2026-03-03")` is UTC midnight; rendered in America/New_York
    // that is "Mar 2". MEASURED — this is the day BEFORE the trader logged.
    const f = tradeDateFact("2026-03-03", "OPENED", "NVDA");
    expect(f.state).toBe("MEASURED");
    expect(f.text).toBe("Mar 3 '26");
    expect(f.text).not.toContain("Mar 2");
    expect(f.reason).toMatch(/day BEFORE the logged day/i);
  });

  it("× THE DROPPED YEAR: a trade from a prior year is not a recent one", () => {
    expect(tradeDateFact("2024-12-31", "CLOSED", "TSLA").text).toBe("Dec 31 '24");
    expect(tradeDateFact("2024-12-31", "CLOSED", "TSLA").text).not.toBe("Dec 31");
  });

  it('× THE "Invalid Date": a truthy string is not a parsed date', () => {
    for (const v of ["last tuesday", "2026-13-45x", "{}", 0 / 0]) {
      const f = tradeDateFact(v, "OPENED", "TSLA");
      expect(f.state).toBe("NOT_NUMERIC");
      expect(f.text).toBe("Unreadable");
      expect(f.text).not.toMatch(/Invalid Date/);
      expect(f.reason).toMatch(/Invalid Date/);
    }
  });

  it("× THE BARE GLYPH: an absent date is named, never a dash, never today", () => {
    for (const v of [null, undefined, "", "   "]) {
      const f = tradeDateFact(v, "CLOSED", "TSLA");
      expect(f.state).toBe("NOT_RECORDED");
      expect(f.text).toBe("No date");
      expect(f.text).not.toBe("—");
      expect(f.reason).toMatch(/will not substitute today's date/i);
    }
  });

  it("× TWO POPULATIONS, ONE COLUMN: the basis travels with the date", () => {
    const opened = tradeDateFact("2026-03-03", "OPENED", "NVDA");
    const closed = tradeDateFact("2026-03-03", "CLOSED", "NVDA");
    expect(opened.text).toBe(closed.text);      // identical figure …
    expect(opened.basisLabel).toBe("opened");   // … distinguishable basis
    expect(closed.basisLabel).toBe("closed");
    expect(opened.reason).not.toBe(closed.reason);
  });

  it("a real timestamp IS an instant and is converted, without claiming more", () => {
    const f = tradeDateFact("2026-03-03T14:30:00.000Z", "CLOSED", "NVDA");
    expect(f.state).toBe("MEASURED");
    expect(f.reason).toMatch(/genuinely is an instant/i);
    expect(f.reason).toMatch(/does not claim the exchange agreed/i);
  });
});

describe("/profile Recent Trades date adoption", () => {
  const src = readFileSync(join(process.cwd(), "src/app/profile/page.tsx"), "utf8");

  it("× THE FIELD THAT WAS NEVER WRITTEN: the row reads the field /journal saves", () => {
    // /journal writes `date:`, never `createdAt`. Reading only `createdAt`
    // made the true arm of the old ternary UNREACHABLE on every journal row.
    const journal = readFileSync(join(process.cwd(), "src/app/journal/page.tsx"), "utf8");
    expect(journal).not.toContain("createdAt:");
    expect(src).toContain("t.createdAt ?? t.date");
  });

  it("× THE BARE GLYPH ON SCREEN: the date cell no longer ternaries into a dash", () => {
    expect(src).not.toMatch(/toLocaleDateString\("en-US", \{ month: "short", day: "numeric" \}\) : "—"/);
    expect(src).toContain("tradeDateFact");
    expect(src).toContain("t.date.basisLabel");
    expect(src).toContain("title={t.date.reason}");
  });
});

describe("riskMultipleFact", () => {
  it("states a recorded multiple and says WM did not derive it", () => {
    const f = riskMultipleFact(2.4, true, "NVDA");
    expect(f.state).toBe("MEASURED");
    expect(f.text).toBe("2.4R");
    expect(f.reason).toMatch(/not a figure WM derived on its own/i);
  });

  it("a negative multiple is a real reading — losses have an R too", () => {
    expect(riskMultipleFact(-1, true, "NVDA").state).toBe("MEASURED");
    expect(riskMultipleFact(-1, true, "NVDA").text).toBe("-1.0R");
  });

  it("a 0R scratch is MEASURED, not an absence", () => {
    expect(riskMultipleFact(0, true, "NVDA").state).toBe("MEASURED");
    expect(riskMultipleFact(0, true, "NVDA").text).toBe("0.0R");
  });

  it("× THE DEFECT: 'NaNR' must never reach the screen in measurement gold", () => {
    // `NaN != null` is TRUE, so the old guard let NaN through to toFixed.
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, "2.4", {}]) {
      const f = riskMultipleFact(bad, true, "NVDA");
      expect(f.state).toBe("NOT_NUMERIC");
      expect(f.text).not.toMatch(/NaN|Infinity/);
    }
  });

  it("× THE DEFECT: two different silences must not share one dash", () => {
    const unresolved = riskMultipleFact(2.4, false, "NVDA");
    const notRecorded = riskMultipleFact(null, true, "NVDA");
    expect(unresolved.state).toBe("OUTCOME_UNRESOLVED");
    expect(notRecorded.state).toBe("NOT_RECORDED");
    expect(unresolved.text).not.toBe(notRecorded.text);
    expect(unresolved.reason).not.toBe(notRecorded.reason);
  });

  it("× THE TWO VOCABULARIES: the unresolved cell must agree with the P&L beside it", () => {
    // The P&L span already said the word "Unresolved" while this one said "—".
    expect(riskMultipleFact(2.4, false, "NVDA").text).toBe("Unresolved");
  });

  it("× THE INVENTED DENOMINATOR: it must refuse to infer a stop", () => {
    const f = riskMultipleFact(null, true, "NVDA");
    expect(f.reason).toMatch(/assuming a stop|assumed denominator/i);
  });

  it("no state ASSERTS the trade was a win, a loss, or open", () => {
    /* This assertion caught its own fixture on the first run, which is worth
       recording: the OUTCOME_UNRESOLVED sentence ends "WM is not claiming the
       trade was a loss, a win, or still open" — a DISCLAIMER, the opposite of
       the defect — and a regex reading raw bytes fired on it. Pinned to a
       spelling it forbade the right sentence; pinned to a meaning it has to
       ignore anything WM explicitly refuses to say. So the refusal clause is
       removed before the claim check, and its presence is asserted separately
       so it cannot simply be deleted to make this pass. */
    const all = [
      riskMultipleFact(2.4, false, "NVDA"),
      riskMultipleFact(null, true, "NVDA"),
      riskMultipleFact(Number.NaN, true, "NVDA"),
    ];
    for (const f of all) {
      const asserted = f.reason.replace(/WM is not claiming[^.]*\./gi, "");
      expect(asserted).not.toMatch(/\bwas a win\b|\bwas a loss\b|\bstill open\b/i);
    }
    expect(riskMultipleFact(2.4, false, "NVDA").reason).toMatch(/is not claiming/i);
  });
});

describe("tradePriceFact", () => {
  it("states a recorded price", () => {
    expect(tradePriceFact(104.5, "exit", "NVDA")).toMatchObject({
      state: "MEASURED",
      text: "104.5",
    });
  });

  it("an absent price and an unreadable one are different facts", () => {
    expect(tradePriceFact(null, "exit", "NVDA").state).toBe("NOT_RECORDED");
    expect(tradePriceFact(Number.NaN, "exit", "NVDA").state).toBe("NOT_NUMERIC");
    expect(tradePriceFact(0, "entry", "NVDA").state).toBe("NOT_NUMERIC");
  });

  it("names which price it is talking about", () => {
    expect(tradePriceFact(null, "entry", "NVDA").reason).toContain("entry");
    expect(tradePriceFact(null, "exit", "NVDA").reason).toContain("exit");
  });
});

describe("tradeSymbolFact", () => {
  it("× THE DEFECT: a row's IDENTITY must not be a glyph", () => {
    const f = tradeSymbolFact(undefined);
    expect(f.text).not.toBe("—");
    expect(f.state).toBe("NOT_RECORDED");
    expect(f.reason).toMatch(/will not guess the ticker/i);
  });

  it("rejects an empty or whitespace symbol as unrecorded", () => {
    expect(tradeSymbolFact("").state).toBe("NOT_RECORDED");
    expect(tradeSymbolFact("   ").state).toBe("NOT_RECORDED");
    expect(tradeSymbolFact("NVDA").state).toBe("MEASURED");
  });
});

describe("no state renders a bare glyph", () => {
  const all: TradeRowFact[] = [
    riskMultipleFact(2.4, true, "NVDA"),
    riskMultipleFact(null, true, "NVDA"),
    riskMultipleFact(Number.NaN, true, "NVDA"),
    riskMultipleFact(2.4, false, "NVDA"),
    tradePriceFact(104.5, "exit", "NVDA"),
    tradePriceFact(null, "exit", "NVDA"),
    tradePriceFact(Number.NaN, "entry", "NVDA"),
    tradeSymbolFact("NVDA"),
    tradeSymbolFact(undefined),
  ];

  it("every fact carries words and a reason", () => {
    for (const f of all) {
      expect(f.text.trim()).not.toBe("—");
      expect(f.text.trim()).not.toBe("-");
      expect(f.text.trim().length).toBeGreaterThan(0);
      expect(f.reason.length).toBeGreaterThan(40);
    }
  });
});

describe("/profile page", () => {
  const src = readFileSync(join(process.cwd(), "src/app/profile/page.tsx"), "utf8");
  /* Comments are prose ABOUT the code and are never rendered, so they are
     stripped before the phrase checks — a Sentinel that fires on the file's own
     documentation of the defect is pinned to a spelling, not to a meaning.
     Inline trailing `//` is deliberately NOT stripped: that would truncate any
     string containing `://`. */
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter(line => !/^\s*\/\//.test(line))
    .join("\n");

  it("× THE DEFECT: the R:R cell must not be an inline glyph ternary", () => {
    expect(code).not.toMatch(/rr:\s*outcomeResolved\s*&&\s*t\.rr\s*!=\s*null/);
    expect(code).not.toMatch(/t\.rr\.toFixed/);
  });

  it("× THE DEFECT: the row's identity must not fall back to a glyph", () => {
    expect(code).not.toMatch(/t\.symbol\s*\?\?\s*"—"/);
  });

  it("the row routes these fields through the owner", () => {
    expect(code).toContain("riskMultipleFact");
    expect(code).toContain("tradePriceFact");
    expect(code).toContain("tradeSymbolFact");
  });

  it("× THE SILENT CELL: the R:R span must carry its reason", () => {
    // It had no title and no aria-label at all — the P&L span beside it did.
    expect(code).toMatch(/rr\.reason/);
  });
});
