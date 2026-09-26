import { describe, expect, it } from "vitest";
import { profileEstWord } from "./profileEvidenceWord";
import selectCompositeProfile from "./selectCompositeProfile";
import { selectVisibleRangeProfile } from "./selectVisibleRangeProfile";

const bar = (time: number, low: number, volume = 100) => ({ time, open: low, high: low + 1, low, close: low + 1, volume });

describe("G16 §20 · bar-built profiles wear CANDLE-EST", () => {
  it("only a trade-based profile goes unmarked; unknown is marked", () => {
    expect(profileEstWord("trade-based")).toBe("");
    expect(profileEstWord("candle-estimated")).toBe(" · CANDLE-EST");
    expect(profileEstWord(null)).toBe(" · CANDLE-EST");
  });

  it("Composite and Visible Range are built from bars, so their captions carry the word", () => {
    const bars = [0, 1, 2].flatMap(d => Array.from({ length: 10 }, (_, i) => bar(d * 100_000 + i * 60, 100 + d)));
    expect(profileEstWord(selectCompositeProfile(bars).quality)).toBe(" · CANDLE-EST");
    expect(profileEstWord(selectVisibleRangeProfile(bars, 0, 300_000).quality)).toBe(" · CANDLE-EST");
  });
});
