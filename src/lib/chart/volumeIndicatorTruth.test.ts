import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VOLUME_INDICATORS, partitionVolumeIndicators, volumeIndicatorSilence } from "./volumeIndicatorTruth";
import { INDICATOR_EDUCATION } from "./indicatorEducation";

const realBars = Array.from({ length: 40 }, (_, i) => ({ volume: 1200 + i * 7 }));
const placeholderBars = Array.from({ length: 40 }, (_, i) => ({ volume: i % 2 }));
const ALL = [...VOLUME_INDICATORS, "RSI", "EMA 20"];
const N = VOLUME_INDICATORS.length;

describe("the volume indicators are silent, with a named reason, where there is no traded volume", () => {
  it("spot FX: every volume indicator is withheld and the owner's words are said", () => {
    const p = partitionVolumeIndicators(ALL, "EURUSD", realBars);
    expect(p.withheld).toEqual([...VOLUME_INDICATORS]);
    expect(p.silence).toEqual({ reason: "NO_CENTRAL_VOLUME", words: "NEEDS TRADED VOLUME · SPOT FX HAS NONE" });
    expect(p.receipt).toBe(`NO_CENTRAL_VOLUME:${N}|${VOLUME_INDICATORS.join(",")}`);
  });

  it("spot metals too — the same owner decides", () => {
    expect(volumeIndicatorSilence("XAUUSD", realBars)?.words).toBe("NEEDS TRADED VOLUME · SPOT METALS HAS NONE");
  });

  it("a feed that sends placeholder volume (every bar 0 or 1) is silent with the feed's own sentence", () => {
    const s = volumeIndicatorSilence("TSLA", placeholderBars);
    expect(s?.reason).toBe("PLACEHOLDER_VOLUME");
    expect(s?.words).toBe("NO VOLUME REPORTED · feed placeholder");
  });

  it("real traded volume: nothing is withheld", () => {
    for (const sym of ["TSLA", "NQ1!", "BTC-USD", "6E1!"]) {
      const p = partitionVolumeIndicators(ALL, sym, realBars);
      expect(p.withheld, sym).toEqual([]);
      expect(p.receipt, sym).toBeNull();
    }
  });

  it("indicators that do not read volume are never withheld by this rule", () => {
    const p = partitionVolumeIndicators(["RSI", "EMA 20"], "EURUSD", realBars);
    expect(p.withheld).toEqual([]);
    expect(p.receipt).toBeNull();
  });

  it("the list is the registry's own: every row whose ⓘ needs traded volume (21), plus the MFI alias", () => {
    expect(N).toBe(21);
    for (const n of ["VWAP", "VWAP Bands", "VWAP Deviation Bands", "Anchored VWAP", "Volume", "OBV", "Accumulation/Distribution",
      "Price Volume Trend", "Negative Volume Index", "Positive Volume Index", "VWMA", "Money Flow Index", "Volume Weighted RSI"]) {
      expect(VOLUME_INDICATORS, n).toContain(n);
    }
    for (const n of VOLUME_INDICATORS) expect(INDICATOR_EDUCATION[n].needs, n).toBe("VOLUME");
    expect(partitionVolumeIndicators(["MFI"], "EURUSD", realBars).withheld).toEqual(["MFI"]);
    expect(VOLUME_INDICATORS).not.toContain("RSI");
  });

  it("one owner decides — no second classifier of FX or metals in this file", () => {
    const src = readFileSync("src/lib/chart/volumeIndicatorTruth.ts", "utf8");
    expect(src.length).toBeGreaterThan(500);
    expect(src).toMatch(/volumeTruthFor/);
    expect(src).not.toMatch(/classifySymbol|forexPairCodes|EURUSD|XAU/);
  });
});
