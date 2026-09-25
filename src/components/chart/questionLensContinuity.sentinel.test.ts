/**
 * THE QUESTION LENS AND A RESTORED SELECTION STAY USABLE — Garden Pass 12,
 * Defects 4, 6, 7 and the 390 law.
 *
 * Found reviewing the cloud team's lens / continuity commits (35d3fbf4,
 * d764d1fb, 29b0acc5) on 2026-09-25:
 * - the Ask row (the only way to change the question, and the only Show raw)
 *   sat at a fixed top:532 in an overflow-hidden pane and was hidden below
 *   640px, so short panes and phones lost both controls;
 * - a refused question drew a 420px strip on a 390px canvas;
 * - TPO stepped 314px into the candles whenever the lens layer was ON, even
 *   with no question painted;
 * - after a refresh restored a zone, the first click on it DESELECTED it and
 *   opened the bar ticket instead of its Passport.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const read = (rel: string) => strip(readFileSync(path.join(process.cwd(), rel), "utf8"));
const CHART = read("src/components/chart/MainChart.tsx");
const ROOM = read("src/components/chart/ChartsDashboard.tsx");

describe("question lens and restored selection", () => {
  it("the Ask row stays inside the pane at every height and renders on phones", () => {
    const at = ROOM.indexOf('data-testid="question-lens-chooser"');
    expect(at).toBeGreaterThan(-1);
    const row = ROOM.slice(at, at + 900);
    expect(row).toContain('top: "min(532px, calc(100% - 96px))"');
    expect(row).not.toMatch(/top: 532\b/);
    expect(row).not.toMatch(/\bhidden\b[^"]*sm:flex/);
  });

  it("a refused question fits narrow glass", () => {
    expect(CHART).toMatch(/const refuseW = W < 640 \? Math\.max\(120, W - 24\) : stripW;/);
    expect(CHART).toMatch(/ctx\.fillRect\(bx, by, refuseW, bh\)/);
  });

  it("TPO yields the left column only when the lens actually painted it this frame", () => {
    expect(CHART).toMatch(/const leftEdge = lensColumnActive \? QUESTION_LENS_COLUMN_RIGHT : 10;/);
    expect(CHART).toMatch(/lensColumnActive = !narrowLens;/);
    expect(CHART).toMatch(/if \(!lensFormPainted\) delete ds\.questionLensForm;/);
  });

  it("clicking a restored zone opens its Passport and keeps it selected", () => {
    expect(ROOM).toMatch(/const readRestoredZone = isZone && id === selectedMarketObjectId && !inspectOpen;/);
    expect(ROOM).toMatch(/if \(!readRestoredZone\) \{\s*setSelectedMarketObjectId\(/);
  });
});
