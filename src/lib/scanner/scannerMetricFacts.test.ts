/**
 * Sentinel — /scanner Volume, Vol Ratio, RSI.
 *
 * PINNED TO MEANING. Each assertion fails when WM either invents a figure it
 * does not hold, or discards a reason it does.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  abbreviateShares,
  volumeMetricFact,
  volRatioMetricFact,
  rsiMetricFact,
  changePctMetricFact,
  type ScannerMetricFact,
} from "./scannerMetricFacts";

describe("volumeMetricFact", () => {
  it("states an observed volume", () => {
    const f = volumeMetricFact(76_900_000, "NVDA");
    expect(f.state).toBe("MEASURED");
    expect(f.text).toBe("76.9M");
  });

  it("× THE DEFECT: an observed ZERO volume must not be erased", () => {
    const f = volumeMetricFact(0, "NVDA");
    expect(f.state).toBe("MEASURED");
    expect(f.text).toBe("0");
    expect(f.reason).toMatch(/zero/i);
  });

  it("an absent volume is NOT_OBSERVED and does not claim nothing traded", () => {
    const f = volumeMetricFact(null, "NVDA");
    expect(f.state).toBe("NOT_OBSERVED");
    expect(f.reason).toMatch(/not a claim that nothing traded/i);
  });

  it("rejects non-finite garbage rather than printing it", () => {
    for (const raw of [NaN, Infinity, -1]) {
      expect(volumeMetricFact(raw, "NVDA").state).toBe("NOT_OBSERVED");
    }
  });
});

describe("volRatioMetricFact", () => {
  it("states a real ratio and shows its working", () => {
    const f = volRatioMetricFact(70_000_000, 100_000_000, "NVDA");
    expect(f.state).toBe("MEASURED");
    expect(f.text).toBe("0.7×");
    expect(f.reason).toContain("70.0M");
    expect(f.reason).toContain("100.0M");
  });

  it("× THE DEFECT: three different absences must not be one null", () => {
    const noNumerator = volRatioMetricFact(null, 100, "NVDA");
    const noDenominator = volRatioMetricFact(100, null, "NVDA");
    const zeroDenominator = volRatioMetricFact(100, 0, "NVDA");

    expect(noNumerator.state).toBe("NOT_OBSERVED");
    expect(noDenominator.state).toBe("NOT_OBSERVED");
    expect(zeroDenominator.state).toBe("NOT_DERIVABLE");

    // Same state is not the same fact — the reasons must still differ.
    expect(noNumerator.reason).not.toBe(noDenominator.reason);
    expect(noNumerator.reason).toMatch(/numerator/i);
    expect(noDenominator.reason).toMatch(/denominator|did not carry one/i);
  });

  it("× THE INVENTED DENOMINATOR: it must refuse to mix two sessions", () => {
    expect(volRatioMetricFact(100, null, "NVDA").reason).toMatch(
      /two different sessions/i,
    );
  });

  it("a zero average is a property of the figures, not a fetch failure", () => {
    const f = volRatioMetricFact(100, 0, "NVDA");
    expect(f.reason).toMatch(/not a fetch that failed/i);
    // And it must not guess why the provider wrote a zero.
    expect(f.reason).not.toMatch(/\bthin\b|\billiquid\b|\blow volume\b/i);
  });

  it("never divides by zero into Infinity", () => {
    expect(volRatioMetricFact(100, 0, "NVDA").text).not.toMatch(/Infinity|NaN/);
  });
});

describe("rsiMetricFact", () => {
  it("states a computed RSI and says WM computed it", () => {
    const f = rsiMetricFact(49, null, "NVDA");
    expect(f.state).toBe("MEASURED");
    expect(f.text).toBe("49");
    expect(f.reason).toMatch(/WM calculation/i);
    // It must not be passed off as a provider figure — WM did this arithmetic.
    expect(f.reason).toMatch(/not a figure the provider published/i);
  });

  it("× THE DEFECT: a recorded failure must be SAID, not restated as a dash", () => {
    const f = rsiMetricFact(null, "Not enough daily bars for RSI 14.", "NVDA");
    expect(f.state).toBe("FAILED");
    expect(f.reason).toContain("Not enough daily bars for RSI 14.");
    // The phrase the old cells used, which only restated the glyph.
    expect(f.text).not.toBe("RSI unavailable");
  });

  it("× THE DEFECT: a recorded failure and an unsettled attempt are different", () => {
    const failed = rsiMetricFact(null, "Upstream refused the candles.", "NVDA");
    const pending = rsiMetricFact(null, null, "NVDA");
    expect(failed.state).toBe("FAILED");
    expect(pending.state).toBe("PENDING");
    expect(failed.text).not.toBe(pending.text);
    expect(failed.reason).not.toBe(pending.reason);
  });

  it("× THE FALSE PROMISE: only the unsettled one may imply a retry helps", () => {
    expect(rsiMetricFact(null, null, "NVDA").reason).toMatch(/may resolve/i);
    expect(rsiMetricFact(null, "x.", "NVDA").reason).toMatch(/bounded window/i);
  });

  it("RSI 0 is a real reading, not an absence", () => {
    expect(rsiMetricFact(0, null, "NVDA").state).toBe("MEASURED");
    expect(rsiMetricFact(0, null, "NVDA").text).toBe("0");
  });
});

describe("changePctMetricFact", () => {
  it("× THE FABRICATED FLAT: a measured 0% is a reading, not an absence", () => {
    const f = changePctMetricFact(0, null, "NVDA");
    expect(f.state).toBe("MEASURED");
    expect(f.text).toBe("+0.00%");
    expect(f.value).toBe(0);
    expect(f.reason).toMatch(/MEASUREMENT/);
  });

  it("states a real move with its sign", () => {
    expect(changePctMetricFact(-2.5, null, "NVDA").text).toBe("-2.50%");
    expect(changePctMetricFact(2.5, null, "NVDA").text).toBe("+2.50%");
  });

  it("× THE DEFECT: the owner's four refusals must stay four facts", () => {
    const seen = (
      [
        "PRICE_NOT_OBSERVED",
        "PROVIDER_DISOWNED_PREV_CLOSE",
        "PREV_CLOSE_EQUALS_PRICE_UNAFFIRMED",
        "NO_BASIS",
      ] as const
    ).map(a => changePctMetricFact(null, a, "NVDA").reason);
    expect(new Set(seen).size).toBe(4);
  });

  it("only the unaffirmed-equality case is a gap in what WM OBSERVED", () => {
    // The other three are properties of figures WM already holds. Calling them
    // NOT_OBSERVED would promise that another scan might help.
    expect(changePctMetricFact(null, "PREV_CLOSE_EQUALS_PRICE_UNAFFIRMED", "NVDA").state)
      .toBe("NOT_OBSERVED");
    expect(changePctMetricFact(null, "PROVIDER_DISOWNED_PREV_CLOSE", "NVDA").state)
      .toBe("NOT_DERIVABLE");
    expect(changePctMetricFact(null, "NO_BASIS", "NVDA").state).toBe("NOT_DERIVABLE");
    expect(changePctMetricFact(null, "PRICE_NOT_OBSERVED", "NVDA").state).toBe("NOT_DERIVABLE");
  });

  it("a null with NO recorded reason still says so, and does not claim flat", () => {
    const f = changePctMetricFact(null, null, "NVDA");
    expect(f.state).toBe("NOT_OBSERVED");
    expect(f.value).toBeNull();
    expect(f.reason).toMatch(/not claiming the symbol was flat/i);
  });
});

describe("no state renders a bare glyph", () => {
  const all: ScannerMetricFact[] = [
    volumeMetricFact(1e6, "NVDA"),
    volumeMetricFact(null, "NVDA"),
    volRatioMetricFact(1, 2, "NVDA"),
    volRatioMetricFact(null, 2, "NVDA"),
    volRatioMetricFact(1, null, "NVDA"),
    volRatioMetricFact(1, 0, "NVDA"),
    rsiMetricFact(50, null, "NVDA"),
    rsiMetricFact(null, "why.", "NVDA"),
    rsiMetricFact(null, null, "NVDA"),
    changePctMetricFact(1.2, null, "NVDA"),
    changePctMetricFact(null, "NO_BASIS", "NVDA"),
    changePctMetricFact(null, "PRICE_NOT_OBSERVED", "NVDA"),
    changePctMetricFact(null, "PROVIDER_DISOWNED_PREV_CLOSE", "NVDA"),
    changePctMetricFact(null, "PREV_CLOSE_EQUALS_PRICE_UNAFFIRMED", "NVDA"),
    changePctMetricFact(null, null, "NVDA"),
  ];

  it("every fact carries words and a reason", () => {
    for (const f of all) {
      expect(f.text.trim()).not.toBe("—");
      expect(f.text.trim()).not.toBe("-");
      expect(f.text.trim().length).toBeGreaterThan(0);
      expect(f.reason.length).toBeGreaterThan(40);
      expect(f.reason).toContain("NVDA");
    }
  });
});

describe("abbreviateShares", () => {
  it("does not lie about scale", () => {
    expect(abbreviateShares(0)).toBe("0");
    expect(abbreviateShares(999)).toBe("999");
    expect(abbreviateShares(12_000)).toBe("12K");
    expect(abbreviateShares(7_700_000)).toBe("7.7M");
    expect(abbreviateShares(2.5e9)).toBe("2.5B");
  });
});

describe("/scanner page", () => {
  const src = readFileSync(join(process.cwd(), "src/app/scanner/page.tsx"), "utf8");

  /**
   * The assertions below forbid a PHRASE. A file that explains why the phrase is
   * forbidden has to SAY the phrase, so a Sentinel reading raw bytes fires on its
   * own documentation — pinned to a spelling rather than to a meaning, the exact
   * failure mode this suite exists to prevent. Comments are prose ABOUT the code,
   * never rendered, so they are removed before the phrase checks.
   *
   * Block comments are stripped, and so are whole lines that are nothing but a
   * `//` comment. An inline trailing `//` is deliberately NOT stripped: doing so
   * would truncate any string containing `://`, and a stripper that silently
   * deletes real code is a Sentinel that stops looking.
   */
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter(line => !/^\s*\/\//.test(line))
    .join("\n");

  it("× THE DEFECT: the three cells must not be inline glyph ternaries", () => {
    expect(code).not.toMatch(/r\.volRatio\s*==\s*null\s*\?\s*"—"/);
    expect(code).not.toMatch(/r\.rsi\s*==\s*null\s*\?\s*"—"/);
    expect(code).not.toMatch(/selected\.volRatio\s*==\s*null\s*\?\s*"—"/);
    expect(code).not.toMatch(/selected\.rsi\s*==\s*null\s*\?\s*"—"/);
    expect(code).not.toMatch(/selected\.volume\s*==\s*null\s*\?\s*"—"/);
  });

  it("× THE RESTATED DASH: 'unavailable' must not stand in for a real reason", () => {
    expect(code).not.toContain('"RSI unavailable"');
    expect(code).not.toContain('"Volume ratio unavailable"');
    expect(code).not.toContain("Percent change unavailable");
  });

  it("× THE FOUR REASONS WEARING ONE DASH: Chg% must route through the owner", () => {
    // `selectQuoteChange` computes four distinct refusals. Both Chg% cells and
    // the meter beneath them printed one dash under one restated title.
    expect(code).not.toMatch(/r\.changePct\s*==\s*null\s*\?\s*"—"/);
    expect(code).not.toMatch(/selected\.changePct\s*==\s*null\s*\?\s*"—"/);
    expect(code).toContain("changePctMetricFact");
    // The absence NAME must survive the trip from the owner to the cell.
    expect(code).toMatch(/changePctMetricFact\([^)]*changeAbsence/);
    expect(code).toMatch(/changePctFact\.reason/);
  });

  it("× THE RESTATED DASH IN THE CACHE: the recorded reason must not be the dash", () => {
    // `recordFailure` populates the one structure whose entire job is to hold a
    // sentence. Its fallback used to be the phrase "RSI unavailable".
    expect(code).toMatch(/recordFailure\([\s\S]{0,400}?not retryable/);
  });

  it("the page routes all three through the owner", () => {
    expect(code).toContain("volumeMetricFact");
    expect(code).toContain("volRatioMetricFact");
    expect(code).toContain("rsiMetricFact");
  });

  it("× THE DISCARDED DIAGNOSIS: the recorded RSI failure must reach the cell", () => {
    // `fetchRSI` stores a real sentence via `recordFailure`. The cells printed
    // `—`. The row must carry the sentence to the owner.
    expect(code).toMatch(/rsiMetricFact\([^)]*rsiFailure/);
  });

  it("the ratio's inputs reach the owner, not the pre-collapsed quotient", () => {
    expect(code).not.toMatch(/avgVol\s*!=\s*null\s*&&\s*avgVol\s*>\s*0/);
    expect(code).toMatch(/volRatioMetricFact\(\s*volume\s*,\s*avgVol/);
  });

  it("× THE SECOND SOURCE OF TRUTH: the page must not re-derive the quotient", () => {
    // A `!`-asserted `volume! / avgVol!` beside the owner is a second place for
    // the two to disagree. The owner exposes the number on `.value`.
    expect(code).not.toMatch(/volume!\s*\/\s*avgVol!/);
    expect(code).toMatch(/volRatioFact\.value/);
  });
});
