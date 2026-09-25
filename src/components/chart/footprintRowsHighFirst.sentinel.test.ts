/**
 * FOOTPRINT ROWS SIT AT THEIR OWN PRICES — H-701, Garden Pass 12.
 *
 *     FOOTPRINT must belong to price rows / bars. When NEAR, the trader
 *     should perceive where the interaction happened.
 *
 * getBarFootprint lists a bar's rows from its LOW upward (row 0 = the low;
 * its sub-profile indexes price from the low). Every footprint mode paints row
 * li at yH + li·rowH — counting DOWN from the bar's HIGH. Handed the rows
 * as-is, every footprint was upside down: the bid/ask traded at the low was
 * printed at the top of the candle, and the POC box sat at the mirror price.
 *
 * The two facts only agree when the draw takes the rows high-first, so this
 * sentinel pins both halves together.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

describe("footprint rows are drawn high-first", () => {
  it("the owner lists rows from the low upward", () => {
    expect(CHART).toMatch(/const priceLevel = \+\(bar\.low \+ i \* binW\)\.toFixed\(dp\);/);
    expect(CHART).toMatch(/const relPos\s+= i \/ Math\.max\(1, numLevels - 1\); \/\/ 0=low, 1=high/);
  });

  it("every footprint draw mode takes them high-first, and places row li down from the high", () => {
    // 2026-09-25 (footprint canon): three modes paint ROWS now — Bid × Ask
    // cells, the Volume Profile histogram and Imbalance tint. Delta Bubbles
    // and Agg/Passive are the Nectar trail (rings on price) and Big Trades are
    // F07A discs; none of those reads display rows.
    const calls = [...CHART.matchAll(/const levels = fpLevels\(c, (numLevels|numLev)\)(\.reverse\(\))?;/g)];
    expect(calls.length).toBeGreaterThanOrEqual(3);
    for (const c of calls) expect(c[2], c[0]).toBe(".reverse()");
    expect((CHART.match(/Math\.round\(yH \+ li \* rowH\)/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});
