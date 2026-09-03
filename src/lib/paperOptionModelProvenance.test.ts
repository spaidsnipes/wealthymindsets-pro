import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const page = fs.readFileSync(
  path.join(process.cwd(), "src/app/paper/page.tsx"),
  "utf8",
);

/**
 * /paper option chain provenance Sentinel — LIVING-PIXEL LAW.
 *
 * The paper options chain presented three layers of modelling in market
 * vocabulary:
 *
 *   const iv = underlyingIV(sym);                  // hardcoded 0.22–0.65
 *   const c  = blackScholes(spot, k, tYears, iv);  // model premium
 *   const spread = mid => Math.max(0.02, mid*0.03) // INVENTED band
 *
 * ...and labelled the result "CALL bid/ask". No option quote is received
 * anywhere in this path. In options the bid/ask spread IS the cost of the
 * trade, so a fabricated flat 3% band tells the trader they know their
 * execution cost when they do not — and real spreads on illiquid contracts
 * are far wider.
 *
 * The numbers are legitimate for a paper simulator. Presenting them as quotes
 * was not.
 */
describe("paper option model provenance", () => {
  it("no column claims a bid or ask that is never received", () => {
    expect(page).not.toContain("CALL bid/ask · δ");
    expect(page).not.toContain("δ · PUT bid/ask");
  });

  it("columns name the numbers as model output", () => {
    expect(page).toContain("CALL model band · δ");
    expect(page).toContain("δ · PUT model band");
    expect(page).toContain("Call model");
    expect(page).toContain("Put model");
  });

  it("the assumed volatility is disclosed, not hidden in a lookup table", () => {
    expect(page).toContain("Black-Scholes premiums at an assumed {(iv * 100).toFixed(0)}% IV");
  });

  it("the fabricated spread is named as an assumption", () => {
    expect(page).toContain("The ± band is a fixed");
    expect(page).toContain("not a quoted spread");
  });

  it("each tradeable cell repeats the provenance on hover", () => {
    expect(page).toContain("not a quoted bid or ask.");
  });

  it("the disclosure sits with the actionable table, not only the empty state", () => {
    // It previously appeared ONLY in the "no quote" message, which the trader
    // sees precisely when there is no chain to misread.
    const disclosure = page.indexOf("Black-Scholes premiums at an assumed");
    const table = page.indexOf("{/* Chain table */}");
    expect(disclosure).toBeGreaterThan(-1);
    expect(table).toBeGreaterThan(disclosure);
  });
});
