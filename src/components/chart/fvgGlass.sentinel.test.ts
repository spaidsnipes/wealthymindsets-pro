/**
 * SENTINEL — the FVG / Imbalance layer on /charts (Garden 19 FVG lane D,
 * Founder order 2026-10-07 §43–§51). Pins the glass block in MainChart
 * (between FVG-GLASS-BEGIN and FVG-GLASS-END):
 *
 *  1. ONE DETECTOR — the block reads the camera door (fvgSceneForCamera) and
 *     never runs a detector; indicators.ts carries no legacy `fairValueGaps`.
 *  2. AS-OF IN REPLAY — the camera is handed the replay cursor
 *     (`replayCursorTimeSec: cursorF`), and the cursor is the camera's newest
 *     bar only while replay drives it.
 *  3. NO NUMBERS / WORDS ON THE GLASS — no fillText / strokeText in the block
 *     (sizes, %, ages live in Inspect); no "MUST FILL", no score.
 *  4. CLEAR-ZONE KEEP-OUT — the paint is clipped left of the newest candle's
 *     slot (fvgClearZoneX), minus the last-price / position / order strips
 *     (fvgKeepOutStrips), and round the candles.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname);
const main = readFileSync(path.join(SRC, "MainChart.tsx"), "utf8");
const a = main.indexOf("FVG-GLASS-BEGIN");
const b = main.indexOf("FVG-GLASS-END");
const block = a >= 0 && b > a ? main.slice(a, b) : "";

describe("FVG glass sentinel", () => {
  it("the block exists once", () => {
    expect(block.length).toBeGreaterThan(1000);
    expect(main.indexOf("FVG-GLASS-BEGIN", a + 1)).toBe(-1);
  });

  it("1 · one detector: the camera door, never a scan of its own", () => {
    expect(block).toMatch(/fvgSceneForCamera\(/);
    expect(main).not.toMatch(/\b(detectFvgs|createFvgEngine|fvgStateAsOf)\s*\(/);
    expect(main).not.toMatch(/IND\.fairValueGaps|fairValueGaps\(/);
    const ind = readFileSync(path.join(SRC, "indicators.ts"), "utf8");
    expect(ind).not.toMatch(/export function fairValueGaps/);
  });

  it("2 · replay reads the ledger as of the cursor", () => {
    expect(block).toMatch(/replayCursorTimeSec: cursorF/);
    expect(block).toMatch(/const cursorF = replaying && camF\.length \? Number\(camF\[camF\.length - 1\]\.time\) : null;/);
    expect(block).toMatch(/LEAK:\$\{leaks\}/);
  });

  it("3 · no numbers or words on the glass, no fill promise, no score", () => {
    expect(block).not.toMatch(/\b(fillText|strokeText|measureText)\b/);
    expect(block).not.toMatch(/MUST FILL|STRENGTH|SCORE/i);
  });

  it("4 · clear-zone keep-out: left of the newest candle, off the price lines, round the candles", () => {
    expect(block).toMatch(/const xStop = fvgClearZoneX\(/);
    expect(block).toMatch(/fvgKeepOutStrips\(lineYs, 3\)/);
    expect(block).toMatch(/clipF\.rect\(0, ceilF, xStop, Math\.max\(0, floorF - ceilF\)\)/);
    expect(block).toMatch(/ctx\.clip\(frame\.pillCut, "evenodd"\)/);
    expect(block).toMatch(/ctx\.clip\(frame\.clipF, "evenodd"\)/);
    expect(block).toMatch(/candleCutOutRects\(camF/);
    expect(block).toMatch(/ctx\.clip\(frame\.cutF, "evenodd"\)/);
  });
});

describe("the scanner door turns the layer on after a CLIENT navigation (2026-10-07)", () => {
  it("ChartsDashboard re-reads on=fvg from the router's search params, not only at first render", () => {
    const dash = readFileSync(path.join(SRC, "ChartsDashboard.tsx"), "utf8");
    expect(dash).toMatch(/proofSceneValue\(parseProofScene\(`\?\$\{optionSearchParams\?\.toString\(\) \?\? ""\}`\), FVG_PREF_KEY\)/);
    expect(dash).toMatch(/\}, \[optionSearchParams\]\);/);
  });
});
