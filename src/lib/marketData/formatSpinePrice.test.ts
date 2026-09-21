/**
 * Truth-lock for the MARKET cell's price line.
 *
 * The defect this closes is a CONTRADICTION, not a crash: /charts rendered
 * PRICE UNKNOWN next to a chart header showing the last bar's close for the
 * same instrument at the same moment. So the assertions that matter most here
 * are the ones that keep the THREE states from collapsing back into two —
 * and the ones that stop a bar close from being sold as a trade print.
 */
import { describe, it, expect } from "vitest";
import { formatSpinePrice, qualifyMarketQuality } from "./formatSpinePrice";

describe("formatSpinePrice", () => {
  it("prefers a live print and labels it as nothing else", () => {
    // A print is the stronger claim and needs no qualifier.
    expect(formatSpinePrice(7622.25, 7600, "1h"))
      .toEqual({ text: "7622.25", provenance: "PRINT" });
  });

  it("falls back to the bar close INSTEAD of PRICE UNKNOWN", () => {
    // This is the whole defect. Silence about knowledge we hold is a truth
    // defect in the same family as overclaiming.
    const out = formatSpinePrice(null, 7622.25, "1h");
    expect(out.provenance).toBe("BAR_CLOSE");
    expect(out.text).toBe("7622.25 LAST 1h BAR CLOSE");
  });

  it("never presents a bar close as if it were a print", () => {
    // If this ever returns bare digits, the tile silently starts claiming a
    // trade printed at a price where none did.
    const out = formatSpinePrice(null, 7622.25, "1h");
    expect(out.text).toContain("BAR CLOSE");
    expect(out.provenance).not.toBe("PRINT");
  });

  it("omits the timeframe rather than inventing one", () => {
    expect(formatSpinePrice(null, 7622.25, null).text).toBe("7622.25 LAST BAR CLOSE");
    expect(formatSpinePrice(null, 7622.25, "   ").text).toBe("7622.25 LAST BAR CLOSE");
  });

  it("keeps PRICE UNKNOWN when there is genuinely no evidence", () => {
    expect(formatSpinePrice(null, null)).toEqual({
      text: "PRICE UNKNOWN",
      provenance: "NONE",
    });
  });

  it.each([
    ["zero", 0],
    ["negative", -1],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["undefined", undefined],
  ])("treats a %s print as no print at all", (_label, bad) => {
    // A zero price is the seed/cleared state in useWebSocket, not a quote.
    const out = formatSpinePrice(bad as number | null, 7622.25, "1h");
    expect(out.provenance).toBe("BAR_CLOSE");
  });

  it.each([
    ["zero", 0],
    ["negative", -1],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("treats a %s bar close as no close at all", (_label, bad) => {
    expect(formatSpinePrice(null, bad as number, "1h").provenance).toBe("NONE");
  });

  it("degrades to UNKNOWN when BOTH inputs are unusable", () => {
    expect(formatSpinePrice(Number.NaN, 0, "1h").text).toBe("PRICE UNKNOWN");
  });

  /**
   * THE FOURTH STATE — and the rule that keeps it from eating the other three.
   *
   * Measured live on wealthymindsetspro.com/charts through a cold mount at 25ms
   * resolution, 2026-09-17: this cell printed PRICE UNKNOWN at t=1111ms, and
   * `29563.25 LAST 15m BAR CLOSE` at t=2163ms, off one request. PRICE UNKNOWN
   * is a FINDING; the request had not come back.
   */
  describe("AWAITING — unasked is not unknown", () => {
    it("NOBODY-TOLD-ME may never be rounded into silence", () => {
      // The tri-state's whole point. `undefined` is what every pre-existing
      // caller passes, and it must keep printing the finding it always did.
      for (const settled of [undefined, true] as const) {
        const out = formatSpinePrice(null, null, "1h", settled);
        expect(out.text, `barsSettled=${String(settled)} fell silent`).toBe("PRICE UNKNOWN");
        expect(out.provenance).toBe("NONE");
      }
    });

    it("withholds the sentence only when explicitly told the request is in flight", () => {
      const out = formatSpinePrice(null, null, "1h", false);
      expect(out.provenance).toBe("AWAITING");
      expect(out.text).toBe("");
      expect(out.text).not.toContain("UNKNOWN");
    });

    it("EVIDENCE OUTRANKS THE FLAG — a reading is never withheld", () => {
      // The dangerous inversion: if the flag could veto a number, an unsettled
      // request would blank a price that is demonstrably on screen. Both arms.
      expect(formatSpinePrice(7622.25, null, "1h", false)).toEqual({
        text: "7622.25",
        provenance: "PRINT",
      });
      const close = formatSpinePrice(null, 7622.25, "1h", false);
      expect(close.provenance).toBe("BAR_CLOSE");
      expect(close.text).toBe("7622.25 LAST 1h BAR CLOSE");
    });

    it("AWAITING is reachable by exactly ONE input shape", () => {
      // If any other combination can produce it, the blank slot has become a
      // way to hide a real absence rather than a way to wait for an answer.
      const shapes: Array<[number | null, number | null, boolean | undefined]> = [
        [null, null, undefined],
        [null, null, true],
        [7622.25, null, false],
        [null, 7622.25, false],
        [7622.25, 7622.25, false],
      ];
      for (const [last, bar, settled] of shapes) {
        expect(
          formatSpinePrice(last, bar, "1h", settled).provenance,
          `[${String(last)}, ${String(bar)}, ${String(settled)}] produced AWAITING`,
        ).not.toBe("AWAITING");
      }
      expect(formatSpinePrice(null, null, "1h", false).provenance).toBe("AWAITING");
    });
  });
});

/**
 * THE THIRD CHANNEL.
 *
 * MEASURED on the serving Worker 2026-09-20, BTCUSDT · 5m, ONE viewport:
 * the chart header read `81738.08 +492.44 (+0.61%)` and the MARKET cell read
 * `BTCUSDT · 5m · PRICE UNKNOWN`. That chart had no bars at all, so the
 * BAR_CLOSE arm added for the previous instance of this defect could not
 * speak for it — a provider had answered and this module had no slot.
 */
describe("formatSpinePrice — the QUOTE channel", () => {
  const QUOTE = { last: 81738.08, source: "finnhub" };

  it("speaks when BOTH stronger channels are silent — the measured case", () => {
    const d = formatSpinePrice(null, null, "5m", true, QUOTE);
    expect(d.provenance).toBe("QUOTE");
    expect(d.text).toBe("81738.08 LAST QUOTE · finnhub");
    // The number alone would state a print. The provider is part of the fact.
    expect(d.text).not.toBe("81738.08");
  });

  it("is RANKED LAST — it may not displace a print or a bar close", () => {
    // If this ever inverts, every surface already rendering today silently
    // starts rendering something else, which is the one thing this arm
    // promised not to do.
    expect(formatSpinePrice(7622.25, null, "5m", true, QUOTE).provenance)
      .toBe("PRINT");
    expect(formatSpinePrice(null, 7622.25, "5m", true, QUOTE).provenance)
      .toBe("BAR_CLOSE");
  });

  it("changes NOTHING for a caller that passes no quote", () => {
    expect(formatSpinePrice(null, null, "5m", true)).toEqual(
      formatSpinePrice(null, null, "5m", true, undefined),
    );
    expect(formatSpinePrice(null, null, "5m", true).text).toBe("PRICE UNKNOWN");
  });

  it("NEVER renders an unattributable number anonymously", () => {
    // CORRECTED 2026-09-20, SAME DAY, and the correction is left visible on
    // purpose. This test originally asserted `NONE` / "PRICE UNKNOWN" and its
    // comment read: "Falling back to PRICE UNKNOWN is the honest outcome —
    // 'we hold a number we cannot source' is not a reading."
    //
    // That was WRONG, and the serving host proved it within the hour. The
    // chart header, fixed the same evening, printed "81226.01 SOURCE
    // UNCERTIFIED" while this cell printed PRICE UNKNOWN about the identical
    // figure in the identical viewport. PRICE UNKNOWN is a FINDING — it sends
    // a trader to diagnose a pipeline — and it was printed over a number WM
    // was rendering in 20px a thousand pixels away.
    //
    // "We hold a number we cannot source" IS a reading. It is simply a
    // different one than "we hold a number from finnhub", and the cure was
    // never to discard it — it was to give it its own provenance and let its
    // words travel beside it. What must never happen is the ANONYMOUS render,
    // and that is what this test now guards.
    for (const src of [null, undefined, "", "   "]) {
      const d = formatSpinePrice(null, null, "5m", true, { last: 81738.08, source: src });
      expect(d.provenance, `source ${JSON.stringify(src)}`).toBe("UNCERTIFIED_QUOTE");
      // Never bare — a bare figure in this cell states a print.
      expect(d.text).not.toBe("81738.08");
      // Never a manufactured citation out of an empty slot.
      expect(d.text).not.toMatch(/LAST QUOTE · \s*$/);
      expect(d.text).toBe("81738.08 LAST QUOTE · SOURCE UNCERTIFIED");
    }
  });

  it("refuses to cite an UNCERTIFIED-provenance sentinel as a vendor", () => {
    // MEASURED on the serving host 2026-09-20: this arm rendered
    // "81781.82 LAST QUOTE · unavailable". `unavailable` is useWebSocket's
    // sentinel for a quote whose source this product refused to certify —
    // printing it as a citation states the opposite of what WM knows.
    //
    // The number survives (see the test above); what the sentinel may never do
    // is appear where a checkable vendor name goes.
    for (const src of ["unavailable", "UNAVAILABLE", " unavailable ", "unknown", "none", "n/a", "-"]) {
      const d = formatSpinePrice(null, null, "5m", true, { last: 81781.82, source: src });
      expect(d.provenance, `source ${JSON.stringify(src)}`).toBe("UNCERTIFIED_QUOTE");
      expect(d.text, `source ${JSON.stringify(src)}`).not.toMatch(/unavailable|unknown|n\/a/i);
      expect(d.text).toBe("81781.82 LAST QUOTE · SOURCE UNCERTIFIED");
    }
    // A real vendor name is still a real citation, and still outranks it.
    expect(
      formatSpinePrice(null, null, "5m", true, { last: 81781.82, source: "finnhub" }).provenance,
    ).toBe("QUOTE");
  });

  it("does not fabricate a quote out of a missing or zero price", () => {
    for (const last of [null, undefined, 0, -1, Number.NaN]) {
      expect(
        formatSpinePrice(null, null, "5m", true, { last, source: "finnhub" }).provenance,
        `last ${String(last)}`,
      ).toBe("NONE");
    }
  });

  it("an unsettled bars request still outranks the quote's absence, not its presence", () => {
    // AWAITING means "nobody has answered yet". A provider HAS answered, so
    // printing a blank slot over its number would be the same understatement
    // in a new costume.
    expect(formatSpinePrice(null, null, "5m", false, QUOTE).provenance).toBe("QUOTE");
    expect(formatSpinePrice(null, null, "5m", false).provenance).toBe("AWAITING");
  });

  it("scopes UNAVAILABLE so it cannot read as erasing the line above", () => {
    // Identical reasoning to the BAR_CLOSE arm: the grade is of the PRINT
    // channel and the number came from another one.
    expect(qualifyMarketQuality("UNAVAILABLE", "QUOTE")).toBe("NO LIVE PRINT");
    // A grade describing a reading that exists passes through untouched.
    expect(qualifyMarketQuality("DELAYED", "QUOTE")).toBe("DELAYED");
    // And under NONE there is no number to be mistaken for, so it stands.
    expect(qualifyMarketQuality("UNAVAILABLE", "NONE")).toBe("UNAVAILABLE");
  });
});

describe("the QUOTE channel is actually reachable from the charts room", () => {
  it("is not structurally unreachable — ChartsDashboard hands the quote over", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "src/components/chart/ChartsDashboard.tsx"),
      "utf8",
    );
    // The MEASURED defect (2026-09-20): the chart header printed 81738.08 for
    // BTCUSDT while the right rail printed PRICE UNKNOWN in the SAME viewport,
    // because decisionSpineProps.market carried no slot for the live quote the
    // page already held. An arm nobody calls does not fix a contradiction.
    expect(src, "the spine is no longer handed the live quote price")
      .toMatch(/quoteLast:/);
    expect(src, "the quote is handed over without a nameable source")
      .toMatch(/quoteSource:/);
  });

  it("does not hand over a quote belonging to the previously viewed symbol", () => {
    // During a symbol switch the ticker still holds the OLD instrument's price
    // for a frame. Printing it under the NEW symbol's label is a mislabelled
    // reading, which is worse than PRICE UNKNOWN, not better.
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const { resolve } = require("node:path") as typeof import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "src/components/chart/ChartsDashboard.tsx"),
      "utf8",
    );
    const line = src.split("\n").find((l) => l.includes("quoteLast:")) ?? "";
    expect(line, "quoteLast is not guarded by the symbol-ownership check")
      .toMatch(/tickerOwner === symbol/);
  });
});

describe("× THE FINDING PRINTED OVER A NUMBER: an unattributed quote", () => {
  // MEASURED on the serving Worker 2026-09-20, BTCUSDT · 5m, ONE viewport,
  // screenshot-proved:
  //     chart header    81226.01 SOURCE UNCERTIFIED  ↑ +136.90 (+0.17%)
  //     MARKET cell     BTCUSDT · 5m · PRICE UNKNOWN
  // Canon Weakness #1, reintroduced by this module's own previous commit.
  const SENTINELS = ["unavailable", "UNAVAILABLE", " unavailable ", "unknown", "none", "n/a", "-", "", null];

  it("prints the number with its doubt instead of a PRICE UNKNOWN finding", () => {
    for (const source of SENTINELS) {
      const d = formatSpinePrice(null, null, "5m", true, { last: 81226.01, source });
      expect(d.provenance, `source ${JSON.stringify(source)}`).toBe("UNCERTIFIED_QUOTE");
      expect(d.text).toBe("81226.01 LAST QUOTE · SOURCE UNCERTIFIED");
      // PRICE UNKNOWN is a FINDING. It may not sit on a number WM is holding.
      expect(d.text).not.toBe("PRICE UNKNOWN");
      // And the figure is never bare — a bare figure in this cell states a print.
      expect(d.text).not.toBe("81226.01");
    }
  });

  it("ranks BELOW a quote WM can attribute — naming a provider still wins", () => {
    const named = formatSpinePrice(null, null, "5m", true, { last: 81226.01, source: "finnhub" });
    expect(named.provenance).toBe("QUOTE");
    expect(named.text).toBe("81226.01 LAST QUOTE · finnhub");
  });

  it("ranks BELOW both evidence channels — a print and a close still win", () => {
    const q = { last: 81226.01, source: "unavailable" };
    expect(formatSpinePrice(357.87, null, "5m", true, q).provenance).toBe("PRINT");
    expect(formatSpinePrice(null, 357.47, "15m", true, q).provenance).toBe("BAR_CLOSE");
  });

  it("STRICTLY ADDITIVE: it only ever speaks where PRICE UNKNOWN spoke before", () => {
    // No quote at all — every pre-existing absence is untouched.
    expect(formatSpinePrice(null, null, "5m", true).text).toBe("PRICE UNKNOWN");
    expect(formatSpinePrice(null, null, "5m", true, {}).text).toBe("PRICE UNKNOWN");
    expect(formatSpinePrice(null, null, "5m", true, { last: 0, source: "x" }).text).toBe("PRICE UNKNOWN");
    // And an unsettled request still says nothing rather than a finding.
    expect(formatSpinePrice(null, null, "5m", false).provenance).toBe("AWAITING");
  });

  it("× THE STACKED ERASURE: UNAVAILABLE beneath it is scoped to the print channel", () => {
    // Its qualifier already admits WM cannot name a provider. A bare
    // UNAVAILABLE underneath would read as a larger claim that the number is
    // not there at all — two distinct doubts collapsing into one erasure.
    expect(qualifyMarketQuality("UNAVAILABLE", "UNCERTIFIED_QUOTE")).toBe("NO LIVE PRINT");
    // Grades that describe a reading that exists still pass through untouched.
    expect(qualifyMarketQuality("DELAYED", "UNCERTIFIED_QUOTE")).toBe("DELAYED");
    expect(qualifyMarketQuality("STALE", "UNCERTIFIED_QUOTE")).toBe("STALE");
    // Under NONE there is no number above the word, so UNAVAILABLE is exact.
    expect(qualifyMarketQuality("UNAVAILABLE", "NONE")).toBe("UNAVAILABLE");
  });

  it("the header and the spine now agree in one viewport", () => {
    // The two owners of the same fact, asked the same question at the same
    // moment. They need not use the same WORDS — they render different slots —
    // but neither may deny what the other is showing.
    const spine = formatSpinePrice(null, null, "5m", true, { last: 81226.01, source: "unavailable" });
    expect(spine.text).toContain("81226.01");
    expect(spine.text).toContain("UNCERTIFIED");
  });
});
