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
import { formatSpinePrice } from "./formatSpinePrice";

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
});
