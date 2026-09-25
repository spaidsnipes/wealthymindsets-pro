/**
 * IMBALANCE HAS ONE OWNER — H-701, Garden Pass 12.
 *
 * Stacked imbalance is compiled by selectStackedImbalance (diagonal ask(P) vs
 * bid(P−1), its own ratio and floor) and painted on the bars that built it;
 * per-row imbalance is the footprint's Imbalance mode. The indicator picker
 * carried two more owners under order-flow names:
 * - "Stacked Imbalances": same-row 2× over 12 equal bins of the candle range,
 *   drawn as lines from the bar to NOW;
 * - "Imbalance Tracker": same-row 2.5×, clustered with a tick INVENTED as
 *   close × 0.0005 and banded ±close × 0.0003, lines across the whole chart.
 * Two more definitions of one reading, one of them minting price bands no
 * evidence produced. Retired.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const read = (rel: string) => strip(readFileSync(path.join(process.cwd(), rel), "utf8"));

describe("imbalance has one owner", () => {
  const chart = read("src/components/chart/MainChart.tsx");
  const toolbar = read("src/components/chart/ChartToolbar.tsx");

  it("the indicator engine paints no second imbalance reading", () => {
    expect(chart).not.toContain('inds.has("Stacked Imbalances")');
    expect(chart).not.toContain('inds.has("Imbalance Tracker")');
    expect(chart).not.toMatch(/close \?\? 100\) \* 0\.000[35]/);
  });

  it("no picker offers them, and no order-flow row claims a side it does not read", () => {
    expect(toolbar).not.toContain('name:"Imbalance Tracker"');
    expect(toolbar).not.toContain('name:"Stacked Imbalances"');
    expect(toolbar).not.toContain("strong buying");
  });
});
