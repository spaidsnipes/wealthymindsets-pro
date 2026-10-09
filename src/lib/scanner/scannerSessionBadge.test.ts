import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { scannerLiveSessionWords, scannerSessionBadge } from "./scannerSessionBadge";
import { scannerLiveQuote } from "./scannerLiveQuote";

// 2026-10-09 (a Friday). 05:15Z = 00:15 CDT / 01:15 ET; 15:00Z = 11:00 ET.
const MIDNIGHT = Date.UTC(2026, 9, 9, 5, 15);
const MIDDAY = Date.UTC(2026, 9, 9, 15, 0);
const SATURDAY = Date.UTC(2026, 9, 10, 15, 0);

describe("a scanner LIVE badge carries its session (sheriff batch 5)", () => {
  it("a fresh overnight equity quote is LIVE · <session>, never bare LIVE", () => {
    const b = scannerSessionBadge("SPY", MIDNIGHT);
    expect(b.verdict).not.toBe("OPEN");
    expect(b.text).toMatch(/^LIVE · \S+/);
    expect(b.basis).toBeTruthy();
  });
  it("the regular session reads LIVE alone", () => {
    expect(scannerSessionBadge("SPY", MIDDAY)).toMatchObject({ text: "LIVE", verdict: "OPEN" });
  });
  it("a continuous market is LIVE at any hour", () => {
    expect(scannerSessionBadge("BTC-USD", SATURDAY).text).toBe("LIVE");
  });
  it("the footer names how many live quotes sit outside the regular session", () => {
    expect(scannerLiveSessionWords(["SPY", "QQQ"], MIDNIGHT)).toMatch(/^2 \S+$/);
    expect(scannerLiveSessionWords(["SPY"], MIDDAY)).toBe("");
  });
  it("the title names the kind of source, not the vendor; the page prints the session badge", () => {
    const read = scannerLiveQuote({ price: 100, changePct: 1 }, { price: 101, at: MIDDAY - 2000 }, MIDDAY, 15_000)!;
    expect(read.title).not.toMatch(/tastytrade/i);
    expect(read.title).toContain("broker feed");
    const page = readFileSync("src/app/scanner/page.tsx", "utf8");
    expect(page).toContain("{lv ? liveBadge.text : r.quoteQuality}");
  });
});
