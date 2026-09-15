import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  CHANGE_UNAVAILABLE_GLYPH,
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
      expect(CHANGE_UNAVAILABLE_TEXT.startsWith(CHANGE_UNAVAILABLE_GLYPH)).toBe(true);
      expect(CHANGE_UNAVAILABLE_TEXT.length).toBeGreaterThan(2);
    });

    it("each absence sentence says WHICH thing is absent", () => {
      // "Unavailable" alone is an apology, not information. A trader needs to
      // know whether the price or the change is the thing that is missing.
      expect(CHANGE_UNAVAILABLE_TITLE).toContain("Change unavailable");
      expect(PRICE_UNAVAILABLE_TITLE).toContain("Price unavailable");
      expect(PRICE_UNAVAILABLE_TITLE).not.toBe(CHANGE_UNAVAILABLE_TITLE);
    });

    /* FOURTH FINDING — the Sentinel was as complete as the grep that wrote it.
     *
     * Every test above names its subjects: `src` and `mainChart`. That is two
     * files, chosen by a grep run at the time they were written. A grep for
     * the sentence run immediately AFTER the changeAbsence commit shipped
     * found FOUR sites rendering this absence:
     *
     *   MainChart.tsx        "— (change unavailable)"
     *   ChartsDashboard.tsx  (nothing at all — the measured defect)
     *   StockInfoPanel:224   "— change unavailable"      NO PARENTHESES
     *   SymbolInfoHeader:142 "—"                          glyph only
     *
     * The last two each spelled CHANGE_UNAVAILABLE_TITLE's exact wording as a
     * literal of their own. The VACUOUS AGREEMENT the module was written to
     * PREVENT had already happened before the module existed — and the drift
     * is visible in the punctuation. Nothing failed, because the Sentinel was
     * watching two files it had been told were the whole set.
     *
     * A named-subject Sentinel passes forever while the population grows
     * behind it. These tests take no file list. They walk src/ and count.
     */
    const SRC_DIR = path.join(process.cwd(), "src");
    const OWNER = path.join("lib", "marketData", "changeAbsence.ts");

    function walkSrc(): string[] {
      const out: string[] = [];
      const stack = [SRC_DIR];
      while (stack.length) {
        const dir = stack.pop()!;
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, e.name);
          if (e.isDirectory()) stack.push(p);
          else if (/\.(tsx|ts)$/.test(e.name)) out.push(p);
        }
      }
      return out;
    }

    /** Source with comments removed — a literal quoted in prose is not a render. */
    function codeOf(file: string): string {
      return fs.readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
    }

    it("no file but the owner spells the sentence", () => {
      const offenders = walkSrc()
        .filter((f) => !f.endsWith(OWNER) && !f.endsWith(".test.ts"))
        .filter((f) => codeOf(f).includes(CHANGE_UNAVAILABLE_TITLE));
      // Names the offenders rather than asserting a bare count, so the failure
      // message tells the next author WHICH file re-spelled it.
      expect(offenders.map((f) => path.relative(SRC_DIR, f))).toEqual([]);
    });

    it("no file but the owner spells the glyph-plus-parenthetical", () => {
      const offenders = walkSrc()
        .filter((f) => !f.endsWith(OWNER) && !f.endsWith(".test.ts"))
        .filter((f) => codeOf(f).includes(CHANGE_UNAVAILABLE_TEXT));
      expect(offenders.map((f) => path.relative(SRC_DIR, f))).toEqual([]);
    });

    it("the two drifted variants are gone from the tree", () => {
      // The exact punctuation StockInfoPanel had carried, and the un-parenthesised
      // form generally. If either returns, one absence is being said two ways.
      const drifted = walkSrc()
        .filter((f) => !f.endsWith(".test.ts"))
        .filter((f) => /["'>]—\s+change unavailable/.test(codeOf(f)));
      expect(drifted.map((f) => path.relative(SRC_DIR, f))).toEqual([]);
    });

    it("a bare glyph is only allowed where the reason is attached", () => {
      // SymbolInfoHeader legitimately renders just "—": an 11px percent cell
      // cannot hold the sentence. That is allowed ONLY because both `title`
      // and `aria-label` carry it — which is precisely the pair the chrome
      // header was missing when the bare dash was measured live.
      const sih = codeOf(path.join(SRC_DIR, "components/chart/SymbolInfoHeader.tsx"));
      expect(sih).toContain("CHANGE_UNAVAILABLE_GLYPH");
      expect(sih).toContain("title={CHANGE_UNAVAILABLE_TITLE}");
      expect(sih).toContain("aria-label={CHANGE_UNAVAILABLE_TITLE}");
    });

    /* FIFTH FINDING — CSS can silence a disclosure the markup renders, and
     * every test in this file reads .tsx only.
     *
     * The commit that shipped the chrome-header fix was verified live and the
     * element WAS there, with both attributes. The same DOM read also showed
     * it at computed display:none, from globals.css:
     *
     *   @media (max-width: 639px)
     *   .wm-chart-market-summary .wm-chart-header-change { display:none }
     *
     * That rule predates the change: it was written when the class only ever
     * carried a REAL day change, where hiding a number on a narrow rail is
     * ordinary semantic zoom. The changeAbsence work then routed the ABSENCE
     * DISCLOSURE through the same class — so a rule about a number silently
     * became a rule about a disclosure, on the PRIMARY device.
     *
     * I recorded it in that commit message as "a separate live defect and the
     * next atom". MEASURING IT FALSIFIED THAT CLAIM. In the <=639px branch,
     * MainChart's price row rendered the same sentence at display:block,
     * 87x32px, carrying the same title. The absence is DEDUPLICATED on a
     * phone, not silenced, and the CSS rule is correct.
     *
     * So the defect is not the rule. It is that the rule's correctness is a
     * DEPENDENCY ON ANOTHER FILE recorded only in an English comment. Make
     * MainChart's fallback conditional, or hide its row on phone too, and
     * this rule turns a disclosure into a silent omission with nothing
     * failing anywhere. These tests couple them.
     */
    it("the phone hide-rule still exists and is still explained", () => {
      const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
      expect(css).toContain(".wm-chart-market-summary .wm-chart-header-change");
      // The breadcrumb is what sends the next reader here. A rule that hides a
      // disclosure must point at the site that keeps hiding it honest.
      expect(css).toContain("chart-header-change-phone-hide-depends-on-mainchart");
    });

    it("the site the hide-rule depends on renders unconditionally", () => {
      // MainChart's fallback must be an ELSE branch of the provider check —
      // not itself gated on width, a flag, or a second condition. If this ever
      // becomes conditional, the phone has no one left to say the absence.
      expect(mainChart).toContain(": CHANGE_UNAVAILABLE_TEXT}");
      expect(mainChart).not.toContain("&& CHANGE_UNAVAILABLE_TEXT");
    });

    it("nothing hides the chart's own price row on a phone", () => {
      // The classes MainChart's disclosure actually carried when measured live.
      // A future `display:none` on either, inside the same narrow media query,
      // would remove the last visible statement of the absence.
      const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
      const narrow = css.slice(css.indexOf("@media (max-width: 639px)"));
      expect(narrow).not.toContain(".text-wm-textDim");
      expect(narrow).not.toContain(".wm-chart-price-row");
    });

    it("the price sentence does not overclaim what else is missing", () => {
      // The header having no live quote does NOT mean the chart has no
      // verified bar close — `deriveLastBarClose` often names one. Saying so
      // would be an absence overclaim, the mirror of a fabricated value.
      expect(PRICE_UNAVAILABLE_TITLE).toContain("bar close");
    });
  });
});
