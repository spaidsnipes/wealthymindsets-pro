import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  CHANGE_UNAVAILABLE_TEXT,
  CHANGE_UNAVAILABLE_TITLE,
  PRICE_UNAVAILABLE_TITLE,
} from "@/lib/marketData/changeAbsence";

const raw = fs.readFileSync(
  path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"),
  "utf8",
);
const mainChart = fs.readFileSync(
  path.join(process.cwd(), "src/components/chart/MainChart.tsx"),
  "utf8",
)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const src = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Chart-header day-change Sentinel — LIVING-PIXEL LAW + Weakness #1.
 *
 * useWebSocket.flush() only writes change/changePct once prevCloseRef holds a
 * REAL prior close; until then it leaves them at their initial 0 while still
 * updating price and volume — deliberately, so a seed-derived fake never
 * reaches the UI.
 *
 * The header's guard required change, changePct AND volume to all be zero
 * before suppressing. Volume accumulates from live ticks, so the zero-change
 * state sailed through: observed on prod as
 *   "BTC 77,556.11 ↑ +0.00 +0.00%"  (green, beside a LIVE badge)
 * while the TickerTape showed BTC +2.49% for the same asset on the same page.
 *
 * A zero change with no reference close is UNKNOWN, not flat — and an
 * exactly-zero change is never "up".
 */
function headerShowsChange(change: number, changePct: number, price: number): boolean {
  return price > 0 && Number.isFinite(change) && Number.isFinite(changePct)
    && !(change === 0 && changePct === 0);
}

describe("chart header day-change truth", () => {
  it("volume can no longer make an unreferenced zero change look real", () => {
    expect(src).not.toContain("ticker.volume === 0)");
    expect(src).toContain("!(ticker.change === 0 && ticker.changePct === 0)");
  });

  it("an exactly-zero change is not painted as up", () => {
    expect(src).toContain("ticker.changePct > 0");
    expect(src).not.toContain("hasReal && ticker.changePct >= 0");
  });

  it("suppresses the change while no reference close exists", () => {
    // The exact prod state: real price, live volume, but change/pct still 0.
    expect(headerShowsChange(0, 0, 77_556.11)).toBe(false);
  });

  it("still renders a genuine move in either direction", () => {
    expect(headerShowsChange(1906.48, 2.49, 78_470)).toBe(true);
    expect(headerShowsChange(-42.75, -0.22, 29_122)).toBe(true);
  });

  it("never renders a change for a missing price", () => {
    expect(headerShowsChange(5, 1, 0)).toBe(false);
  });

  it("never renders a non-finite change", () => {
    expect(headerShowsChange(Number.NaN, 1, 100)).toBe(false);
    expect(headerShowsChange(1, Number.POSITIVE_INFINITY, 100)).toBe(false);
  });

  /* SECOND SITE — found on prod after the ChartsDashboard fix shipped.
   * MainChart's own price row rendered "381.33 +0.00 (+0.00%)" in green beside
   * HISTORICAL BARS VERIFIED while the tape showed TSLA +24.04 (+6.73%).
   * Its guard checked only finiteness, and 0/0 are finite. */
  describe("MainChart price row (sibling site)", () => {
    it("finiteness alone no longer proves a provider reference", () => {
      expect(mainChart).toContain("!(ticker.change === 0 && ticker.changePct === 0)");
    });

    it("an exactly-zero change is not painted as up", () => {
      expect(mainChart).toContain("const up        = change > 0;");
      expect(mainChart).not.toContain("const up        = change >= 0;");
    });

    it("keeps the honest fallback branch it already had", () => {
      // These two assertions used to read the LITERALS out of MainChart:
      //   expect(mainChart).toContain("(change unavailable)");
      //   expect(mainChart).toContain("no verified reference close");
      // The sentence moved to `changeAbsence.ts` so the outer chrome header
      // could render the same words without becoming a third owner of them.
      // Asserting the literal here would now force the string to be spelled in
      // MainChart — i.e. the Sentinel would be REQUIRING the duplication it
      // exists to prevent. It asserts the wiring instead, and the sentence's
      // own content is asserted once, against the owner.
      expect(CHANGE_UNAVAILABLE_TEXT).toContain("(change unavailable)");
      expect(CHANGE_UNAVAILABLE_TITLE).toContain("no verified reference close");
      expect(mainChart).toContain("CHANGE_UNAVAILABLE_TEXT");
      expect(mainChart).toContain("changeAbsence");
    });

    it("both change-display sites share the same guard shape", () => {
      const guard = "!(ticker.change === 0 && ticker.changePct === 0)";
      expect(src).toContain(guard);
      expect(mainChart).toContain(guard);
    });
  });

  /* THIRD FINDING — the guard was shared, the DISCLOSURE was not.
   *
   * The test directly above locked both sites to one condition for WHEN to
   * suppress the change, and said nothing about what the suppression looks
   * like. MainChart always rendered a span reading "— (change unavailable)".
   * ChartsDashboard's chrome header rendered `{hasReal && <span …>}` — on
   * absence, no element at all.
   *
   * MEASURED LIVE on https://wealthymindsetspro.com/charts, TSLA, one DOM read
   * of div.wm-chart-market-summary:  "TSLA | — | HISTORICAL BARS VERIFIED",
   * with that "—" carrying no title and no aria-label.
   *
   * A silent omission is a worse absence than a wrong number: a fabricated
   * zero makes a claim the trader can catch, a missing element cannot be seen
   * at all. */
  describe("an absent change must be SAID, on every site that shows one", () => {
    it("the chrome header no longer drops the element on absence", () => {
      // The `&&` form renders nothing when the guard is false. An explicit
      // ternary forces the author of any future edit to answer "and otherwise?"
      expect(src).not.toContain("{hasReal && <span");
      expect(src).toContain("CHANGE_UNAVAILABLE_TEXT");
    });

    it("the chrome header names the absence of the PRICE too", () => {
      // This was the literal glyph observed live with no attributes at all.
      expect(src).not.toContain('ticker.price.toFixed(2) : "—"');
      expect(src).toContain("PRICE_UNAVAILABLE_TITLE");
    });

    it("both sites read the sentence from one owner", () => {
      for (const file of [src, mainChart]) {
        expect(file).toContain("@/lib/marketData/changeAbsence");
        expect(file).toContain("CHANGE_UNAVAILABLE_TITLE");
      }
    });

    it("the em-dash cannot be separated from its explanation", () => {
      // A call site that wrote `—` and appended the words itself could later
      // drop the words and keep compiling. The glyph lives inside the constant.
      expect(CHANGE_UNAVAILABLE_TEXT.startsWith("—")).toBe(true);
      expect(CHANGE_UNAVAILABLE_TEXT.length).toBeGreaterThan(2);
    });

    it("each absence sentence says WHICH thing is absent", () => {
      // "Unavailable" alone is an apology, not information. A trader needs to
      // know whether the price or the change is the thing that is missing.
      expect(CHANGE_UNAVAILABLE_TITLE).toContain("Change unavailable");
      expect(PRICE_UNAVAILABLE_TITLE).toContain("Price unavailable");
      expect(PRICE_UNAVAILABLE_TITLE).not.toBe(CHANGE_UNAVAILABLE_TITLE);
    });

    it("the price sentence does not overclaim what else is missing", () => {
      // The header having no live quote does NOT mean the chart has no
      // verified bar close — `deriveLastBarClose` often names one. Saying so
      // would be an absence overclaim, the mirror of a fabricated value.
      expect(PRICE_UNAVAILABLE_TITLE).toContain("bar close");
    });
  });
});
