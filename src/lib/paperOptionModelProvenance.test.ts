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

/**
 * Mark-to-bid Sentinel.
 *
 * The simulator charged the spread correctly at both ends — entry recorded
 * `entryPrem: ask`, close paid `bid` — but the OPEN position's unrealised P&L
 * used `g.price`, the mid. Every open long therefore displayed a number better
 * than closing it could produce, by the half-spread the trader had not yet
 * paid to get out. The "mark" column showed the mid for the same reason.
 */
describe("paper option mark-to-bid", () => {
  it("unrealised P&L no longer marks to the mid", () => {
    expect(page).not.toContain("const pnl = (g.price - op.entryPrem) * op.qty * OPT_MULTIPLIER;");
    expect(page).toContain("longOptionUnrealised(g.price, op.entryPrem, op.qty, OPT_MULTIPLIER)");
  });

  it("the mark column shows the sell-now bid, not the model mid", () => {
    expect(page).toContain("const markBid = modelBand(g.price)?.bid ?? null;");
    expect(page).toContain("Sell-now mark (modelled bid)");
  });

  it("the spread assumption is single-sourced, not re-inlined", () => {
    // It previously appeared as a magic number in four places and could drift.
    expect(page).not.toMatch(/Math\.max\(0\.02,\s*\w+(\.\w+)?\s*\*\s*0\.03\)/);
    expect(page).toContain('from "@/lib/optionModelBand"');
  });

  it("an unusable premium renders a dash rather than a fabricated P&L", () => {
    expect(page).toContain('{pnl == null ? "—"');
    expect(page).toContain('{markBid == null ? "—"');
  });

  it("the empty state no longer promises a bid/ask to click", () => {
    expect(page).not.toContain("Click any bid/ask to buy a contract.");
    expect(page).toContain("Click any modelled band to buy a contract.");
  });
});
