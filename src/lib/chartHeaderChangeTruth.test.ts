import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  CHANGE_UNAVAILABLE_GLYPH,
  CHANGE_UNAVAILABLE_TEXT,
  CHANGE_UNAVAILABLE_TITLE,
  PRICE_UNAVAILABLE_TITLE,
} from "@/lib/marketData/changeAbsence";
import { PRICE_ABSENCE_GLYPH, priceAbsenceReason } from "@/lib/marketData/priceAbsence";
// Imported so the empty-cell rule can be EXERCISED rather than grepped. A
// source scan for `text: ""` is a spelling; this file has been burned by
// spelling-pins twice already (see the FIFTH FINDING below).
import { chartHeaderChangeFact } from "@/lib/marketData/chartHeaderChangeFact";

/**
 * The tree-walk, at module scope. A Sentinel that NAMES its subjects is only
 * as complete as the grep that wrote it, and it passes forever while the
 * population grows behind it. Every population test in this file walks.
 */
const SRC_DIR = path.join(process.cwd(), "src");

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

const raw = fs.readFileSync(
  path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"),
  "utf8",
);
/**
 * WITH comments. A breadcrumb IS a comment — asserting one against the
 * stripped source can never pass, which is how this read came to exist.
 */
const mainChartRaw = fs.readFileSync(
  path.join(process.cwd(), "src/components/chart/MainChart.tsx"),
  "utf8",
);

const mainChart = mainChartRaw
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
      // RE-PINNED (2026-09-17), not deleted. This used to read
      //   expect(mainChart).toContain("const up        = change > 0;");
      // which pinned the rule to ONE SPELLING of ONE LOCAL. That local is gone
      // — direction is now decided once, in `chartHeaderChangeFact.dirOf`, and
      // consumed by both render sites. A Sentinel pinned to the old spelling
      // would have failed for the right reason and been fixed the wrong way
      // (by re-adding a dead local). So it is re-pinned to the MEANING, at the
      // owner AND at this site, with strictly more to say than it had:
      //
      //   1. the owner's three-state must keep zero out of "up"
      const fact = fs.readFileSync(
        path.join(process.cwd(), "src/lib/marketData/chartHeaderChangeFact.ts"), "utf8",
      );
      expect(fact).toContain("return n > 0 ? 1 : n < 0 ? -1 : 0;");
      expect(fact).not.toContain("return n >= 0 ?");
      //   2. and this site must colour from that three-state by STRICT equality
      //      with 1 — never by truthiness, never by `>= 0`, in EVERY arm.
      const tableStart = mainChart.indexOf("const MAIN_CHANGE_CLASS");
      expect(tableStart).toBeGreaterThan(-1);
      const table = mainChart.slice(tableStart, mainChart.indexOf("};", tableStart) + 2);
      const greenArms = table.match(/text-wm-green/g) ?? [];
      expect(greenArms.length).toBeGreaterThan(0);
      for (const line of table.split("\n").filter(l => l.includes("text-wm-green"))) {
        expect(line).toContain("d === 1 ?");
      }
      expect(table).not.toContain("d >= 0");
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
      // RE-PINNED (2026-09-17): the hop got one longer. MainChart no longer
      // imports the constants directly — it imports the COMPILER, whose NONE
      // arm renders the owner's sentence verbatim. Asserting the old import
      // here would force MainChart to keep a dead import alive, which the
      // dead-import Sentinel in this same file would then correctly fail on:
      // two Sentinels demanding opposite things. So this one follows the chain.
      expect(mainChart).toContain("chartHeaderChangeFact");
      expect(mainChart).toContain("headerChangeFact.text");
      const fact = fs.readFileSync(
        path.join(process.cwd(), "src/lib/marketData/chartHeaderChangeFact.ts"), "utf8",
      );
      expect(fact).toContain("./changeAbsence");
      expect(fact).toContain("text: CHANGE_UNAVAILABLE_TEXT,");
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
    /* SIXTH FINDING — THE FIFTH FINDING, AGAIN, IN THE CHANGE SLOT.
     *
     * This test used to end `expect(src).toContain("CHANGE_UNAVAILABLE_TEXT")`.
     * That is a SPELLING, and the FIFTH FINDING directly below records what
     * happens to spellings: the price slot moved to `chartHeaderPriceFact`, the
     * constant stopped being rendered, and a dead import kept the Sentinel
     * green.
     *
     * The change slot has now made exactly the same move, to
     * `chartHeaderChangeFact`, and for the same reason — a STRICTLY STRONGER
     * disclosure. Where the old code could only say "change unavailable", the
     * module can name a bar-over-bar move derived from the loaded candles, and
     * falls back to that identical sentence only when the bars cannot prove one
     * either. (Measured live 2026-09-17T02:53Z, TSLA 15m: the header printed
     * "358.13 LAST 15m BAR CLOSE — (change unavailable)", the absence sentence
     * three words from a number read off the very bars that could answer it.)
     *
     * So the constant left this file, and this Sentinel is re-pinned to the
     * MEANING rather than deleted: THE CHANGE SLOT MAY NOT RENDER AN
     * UNEXPLAINED GLYPH, AND MAY NOT SILENTLY OMIT ITSELF. */
    it("the chrome header no longer drops the element on absence", () => {
      // The `&&` form renders nothing when the guard is false. An explicit
      // ternary forces the author of any future edit to answer "and otherwise?"
      expect(src).not.toContain("{hasReal && <span");
      // The slot is OWNED — there is one expression that decides what goes in
      // it, in every state, rather than a conditional pair of renderings.
      expect(src).toContain("chartHeaderChangeFact");
      // …and the owner's reason reaches BOTH a sighted reader and a screen
      // reader. A tooltip alone is a disclosure only a mouse can find.
      expect(src).toMatch(/title=\{headerChangeFact\.reason\}/);
      expect(src).toMatch(/aria-label=\{`\$\{symbol\} change: \$\{headerChangeFact\.text\}\./);
      // Colour from declared provenance, never from "is a number present" —
      // this is what stops a bar-over-bar tick wearing session green.
      expect(src).toContain("HEADER_CHANGE_STYLE[headerChangeFact.kind]");
    });

    /* The new arm needs its own guard, because it is the one that can lie.
     * A bar-over-bar delta rendered without its scope IS a fabricated session
     * change, on the primary trading surface. */
    it("the bar-over-bar arm can never be rendered without its scope", () => {
      const factSrc = fs.readFileSync(
        path.join(process.cwd(), "src/lib/marketData/chartHeaderChangeFact.ts"),
        "utf8",
      );
      // The scope is concatenated into the same template literal as the
      // number, so no call site can receive one without the other.
      expect(factSrc).toMatch(/vs prior \$\{tf\} bar/);
      // And the surface renders that text verbatim rather than reformatting it.
      expect(src).toContain("headerChangeFact.text");
      // The header may not re-derive a change of its own alongside the module.
      expect(src).not.toMatch(/ticker\.changePct\.toFixed\(2\)\}%/);
    });

    /* FIFTH FINDING — THIS SENTINEL WAS PINNED TO A SPELLING, NOT A MEANING.
     *
     * It used to read `expect(src).toContain("PRICE_UNAVAILABLE_TITLE")`. When
     * the price slot was rewritten to consult `chartHeaderPriceFact` — a
     * STRICTLY STRONGER disclosure, which often names a verified bar close
     * instead of admitting an absence at all — the constant stopped being
     * rendered anywhere. The Sentinel went on passing, because the IMPORT LINE
     * still contained the word. A dead import satisfied a truth test.
     *
     * That is the fourth time this codebase has caught a Sentinel pinned to a
     * spelling. The rule it keeps proving: NEVER DELETE SUCH A SENTINEL —
     * RE-PIN IT TO THE MEANING, WITH STRONGER ASSERTIONS THAN IT HAD. The
     * meaning here was never "this identifier appears". It was: THE PRICE SLOT
     * MAY NOT RENDER AN UNEXPLAINED GLYPH. */
    it("the chrome header names the absence of the PRICE too", () => {
      // This was the literal glyph observed live with no attributes at all.
      expect(src).not.toContain('ticker.price.toFixed(2) : "—"');
      expect(src).not.toContain('aria-label={PRICE_UNAVAILABLE_TITLE}>—</span>');
      // The slot is owned, and the owner's reason reaches BOTH a sighted reader
      // and a screen reader. A tooltip alone is a disclosure only a mouse finds.
      expect(src).toContain("chartHeaderPriceFact");
      expect(src).toMatch(/title=\{headerPriceFact\.reason\}/);
      expect(src).toMatch(/aria-label=\{`\$\{symbol\} price: \$\{headerPriceFact\.text\}\./);
      // Colour must come from declared provenance, never from "is it present".
      expect(src).toContain("HEADER_PRICE_STYLE[headerPriceFact.kind]");
    });

    it("× THE DEAD-IMPORT PASS: no absence constant may be imported and never rendered", () => {
      // The mechanism that let the old spelling-pinned test pass vacuously.
      for (const name of ["PRICE_UNAVAILABLE_TITLE", "CHANGE_UNAVAILABLE_TEXT", "CHANGE_UNAVAILABLE_TITLE"]) {
        const total = src.split(name).length - 1;
        if (total === 0) continue; // not imported at all is fine
        expect(total, `${name} is imported into ChartsDashboard but never used`).toBeGreaterThan(1);
      }
    });

    /* Re-pinned with the SIXTH FINDING. The meaning was never "both files
     * contain this import path" — it was ONE OWNER OF THE SENTENCE. A direct
     * import is one way to satisfy that; reading it through a module that
     * itself imports from `changeAbsence` is another, and it is strictly
     * better, because that module can often say something truer than the
     * absence. What must never happen is a site that spells the sentence out
     * for itself — which is exactly the FOURTH FINDING's four-way drift.
     *
     * So the chain is followed rather than assumed, and the assertion is
     * stronger than before: every hop must terminate at `changeAbsence`, and
     * no hop may re-type the words. */
    it("both sites read the sentence from one owner, however many hops away", () => {
      const factSrc = fs.readFileSync(
        path.join(process.cwd(), "src/lib/marketData/chartHeaderChangeFact.ts"),
        "utf8",
      );
      // The delegate terminates at the single owner.
      expect(factSrc).toContain("./changeAbsence");
      expect(factSrc).toContain("CHANGE_UNAVAILABLE_TEXT");
      // Neither render site spells the sentence out for itself — the whole
      // point. A literal here is the drift the module exists to prevent.
      for (const file of [src, mainChart]) {
        expect(file).not.toContain('"Change unavailable — no verified');
        expect(file).not.toContain('"— (change unavailable)"');
        // …and each still reaches the owner, directly or through the delegate.
        const reachesOwner =
          file.includes("@/lib/marketData/changeAbsence") ||
          file.includes("@/lib/marketData/chartHeaderChangeFact");
        expect(reachesOwner).toBe(true);
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
    // SRC_DIR / walkSrc / codeOf were declared here when only this block
    // walked the tree. They are now at module scope: "walk, do not list" is
    // the whole file's law, not this describe's local habit.
    const OWNER = path.join("lib", "marketData", "changeAbsence.ts");

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
      //
      // RE-PINNED (2026-09-17). It used to assert the ELSE-BRANCH SPELLING:
      //   expect(mainChart).toContain(": CHANGE_UNAVAILABLE_TEXT}");
      // There is no ternary left to be the else-branch OF — the cell is now
      // compiled, and the compiler ALWAYS returns a `text`, on all three arms.
      // That is strictly stronger than what the old spelling bought: the old
      // shape could still have been gated from outside. So the re-pin asserts
      // the property the phone actually depends on — that the change span's
      // CHILD is an unconditional read of `headerChangeFact.text`, with no
      // `&&` and no `?` between the braces.
      const child = mainChart.match(/\{headerChangeFact\.text\}/g) ?? [];
      expect(child.length).toBeGreaterThan(0);
      expect(mainChart).not.toContain("&& headerChangeFact.text}");
      expect(mainChart).not.toMatch(/\?\s*headerChangeFact\.text\s*:/);
      // And the compiler must have no arm that can return an empty cell — an
      // absence rendered as nothing is the original defect by another route.
      //
      // RE-PINNED AGAIN (2026-09-17, second time today), STRONGER, AND THE
      // WEAKNESS OF THE OLD FORM IS THE POINT.
      //
      // The old pair was a SOURCE SCAN — `factSrc` must not contain `text: ""`.
      // That is a spelling, and this file has now been burned by spelling-pins
      // twice (see the FIFTH FINDING above, where a dead import satisfied a
      // truth test). It also states the rule too widely to be true: an empty
      // cell is the original defect ONLY when the room has something to say and
      // declines to say it. When the bars request has not come back, there is
      // nothing to decline. Measured live on wealthymindsetspro.com/charts,
      // NQ1!, 2026-09-17: the cold load printed "— (change unavailable)" — a
      // sentence that names a PROVIDER THAT ANSWERED — over an instrument whose
      // provider had not answered yet, seconds before 400 candles painted.
      //
      // So the rule is re-pinned to the meaning and made BEHAVIOURAL: exercise
      // the compiler and require a non-empty, disclosing cell for every input
      // EXCEPT the one that is explicitly told the question is still open. That
      // closes the hole the old scan left wide open — it would have happily
      // passed a compiler that returned `text: " "` or `text: EMPTY` — and it
      // makes AWAITING unusable as a hatch for hiding a real absence, because
      // only an explicit `false` can reach it.
      const factSrc = fs.readFileSync(
        path.join(process.cwd(), "src/lib/marketData/chartHeaderChangeFact.ts"), "utf8",
      );
      expect(factSrc).not.toMatch(/return null/);

      // Nobody-told-me may NEVER be rounded into silence.
      for (const settled of [undefined, true] as const) {
        const f = chartHeaderChangeFact(null, null, 2, settled);
        expect(f.text.trim(), `barsSettled=${String(settled)} rendered an empty cell`).not.toBe("");
        expect(f.text).toBe(CHANGE_UNAVAILABLE_TEXT);
        expect(f.kind).toBe("NONE");
        expect(f.reason.length).toBeGreaterThan(40);
      }
      // A real reading is never blank either, on either arm.
      expect(chartHeaderChangeFact({ chg: 1.5, pct: 0.4 }, null, 2).text.trim()).not.toBe("");
      expect(
        chartHeaderChangeFact(
          null,
          {
            chg: 1.5, pct: 0.4, close: 101.5, referenceClose: 100,
            referenceBarOpenedAtMs: 1, barOpenedAtMs: 2, timeframe: "15m",
          },
          2,
          false, // even explicitly-unsettled, EVIDENCE OUTRANKS THE FLAG
        ).text,
      ).toContain("vs prior 15m bar");

      // The ONLY blank arm, and it is reachable by exactly one input.
      const awaiting = chartHeaderChangeFact(null, null, 2, false);
      expect(awaiting.kind).toBe("AWAITING");
      expect(awaiting.text).toBe("");
      expect(awaiting.measured).toBe(false);
      expect(awaiting.direction).toBeNull();
      // Silence still owes an explanation to the code that reads it, even
      // though no element carries it — otherwise AWAITING becomes a shrug.
      expect(awaiting.reason).toMatch(/has not come back yet/);
      // It must NOT borrow the absence sentence. That sentence names a provider
      // that answered; attributing it here is the measured defect itself.
      expect(awaiting.reason).not.toContain(CHANGE_UNAVAILABLE_TEXT);

      // And both render sites must remove the ELEMENT for that arm, not merely
      // print its empty string — an empty bordered slot still carrying a
      // tooltip and an aria-label is the same interruption with no words in it.
      for (const [name, code] of [["MainChart", mainChart], ["ChartsDashboard", src]] as const) {
        expect(code, `${name} renders AWAITING as an element`).toContain(
          'headerChangeFact.kind === "AWAITING" ? null : (',
        );
      }
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

  describe("a reason carried only in `title` is not said on a phone", () => {
    // A phone has no hover. `title` is reachable by a mouse and by some screen
    // readers and by nothing else. So a glyph whose reason lives only in
    // `title` is, on the primary device, a BARE GLYPH — the exact defect this
    // whole chain started from, restored by omission rather than by edit.
    //
    // Three of the four sites the previous commits touched happened to carry
    // both attributes. The one that did not was MainChart — which the
    // globals.css hide-rule had made the ONLY site a phone can read.
    // That was luck, not a pattern, and nothing was watching it.

    /** Every `title={X}` in a file, paired with whether `aria-label={X}` also appears. */
    function titlesWithoutAria(code: string): string[] {
      const out: string[] = [];
      const re = /title=\{([^}]*)\}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(code)) !== null) {
        const expr = m[1];
        // Only absence disclosures are in scope. A `title` on a button or an
        // icon is a different thing and this test has no opinion about it.
        if (!/UNAVAILABLE_TITLE|priceAbsenceReason/.test(expr)) continue;
        if (!code.includes(`aria-label={${expr}}`)) out.push(expr);
      }
      return out;
    }

    it("no absence disclosure anywhere in src/ is hover-only", () => {
      const offenders: string[] = [];
      for (const f of walkSrc()) {
        if (f.endsWith(".test.ts") || f.endsWith(".test.tsx")) continue;
        for (const expr of titlesWithoutAria(codeOf(f))) {
          offenders.push(`${path.relative(SRC_DIR, f)}  title={${expr}}`);
        }
      }
      // Paths, not a count — a future failure must name the file.
      expect(offenders).toEqual([]);
    });

    it("the phone's load-bearing site announces, not merely hovers", () => {
      // Named explicitly on top of the population walk above, because THIS is
      // the site globals.css depends on. If the general rule is ever relaxed,
      // this one must still fail.
      //
      // RE-PINNED (2026-09-17), STRONGER. The old assertion was
      //   "aria-label={hasProviderChange ? undefined : CHANGE_UNAVAILABLE_TITLE}"
      // which announced the reason ONLY on absence. That was adequate while
      // the cell could only ever say a session change or nothing. It is not
      // adequate now: the cell can also say a BAR-OVER-BAR delta, whose entire
      // safety rests on the reader learning it is not the session change. A
      // phone reader hearing the number without the scope is the fabrication
      // this whole atom exists to prevent. So the announcement is now
      // UNCONDITIONAL, and this Sentinel requires it to be.
      expect(mainChart).toContain("aria-label={`${symbol} change: ${headerChangeFact.text}. ${headerChangeFact.reason}`}");
      expect(mainChart).not.toContain("aria-label={hasProviderChange ?");
      expect(mainChartRaw).toContain("absence-reason-must-be-announced-not-only-hovered");
    });
  });

  describe("the price refusal sentence has one owner and one parameter", () => {
    it("no file but the owner spells the refusal sentence", () => {
      const offenders = walkSrc()
        .filter((f) => !f.endsWith(path.join("lib", "marketData", "priceAbsence.ts")))
        .filter((f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"))
        .filter((f) => /No price to show\./.test(codeOf(f)));
      expect(offenders.map((f) => path.relative(SRC_DIR, f))).toEqual([]);
    });

    it("a refusal reads as judgement, not as breakage", () => {
      // "No data" reads to a trader as a product that is broken or asleep.
      // "WM looked and said no" reads as a product exercising judgement.
      // Those are opposite impressions of the same state; only one is true.
      const r = priceAbsenceReason({ quoteRefusal: "stale sequence", hasCandleSource: true });
      expect(r).toContain("stale sequence");
      expect(r).toContain("refusal, not a delay");
      expect(r).toContain("WM looked and said no");
    });

    it("a surface with no candles does not claim it checked them", () => {
      // The ONE legitimate difference between the two former copies. It is a
      // PARAMETER, not a second owner — deduplication that erases a real
      // difference would be a fabrication with better hygiene.
      const withCandles = priceAbsenceReason({ hasCandleSource: true });
      const without = priceAbsenceReason({ hasCandleSource: false });
      expect(withCandles).toContain("no candle has loaded");
      expect(without).not.toContain("candle");
      expect(withCandles).not.toEqual(without);
    });

    it("a refusal outranks a silence", () => {
      // If a provider actually answered and WM declined, saying "nothing has
      // been observed" would be false — something was observed and rejected.
      const both = priceAbsenceReason({ quoteRefusal: "crossed book", hasCandleSource: false });
      expect(both).not.toContain("has been observed for this symbol yet");
    });

    it("the glyph is never spelled at a call site", () => {
      // Same law as CHANGE_UNAVAILABLE_GLYPH: a named constant is what lets a
      // diff distinguish a considered rendering from someone typing a dash.
      expect(PRICE_ABSENCE_GLYPH).toBe("—");
      for (const f of ["components/chart/MainChart.tsx", "components/chart/StockInfoPanel.tsx"]) {
        expect(codeOf(path.join(SRC_DIR, f))).toContain("{PRICE_ABSENCE_GLYPH}");
      }
    });
  });
});
