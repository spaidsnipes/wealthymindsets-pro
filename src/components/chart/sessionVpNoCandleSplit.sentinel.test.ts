/**
 * THE SESSION / CLASSIC VOLUME PROFILE MAKES NO BID/ASK CLAIM — H-601, H-701.
 *
 *     NEVER DO THIS: green candle = buyer aggression · fake bid/ask precision.
 *     BID/ASK SPLIT: only where lawful side-attribution exists.
 *
 * computeProfileFromBars splits each row by whether each CANDLE closed up or
 * down. drawWMVP painted that as green "up-vol" beside red "down-vol" — its
 * own comment called it "the lively bid/ask look" — and the VP gear labelled
 * the two inks "Up / Ask" and "Down / Bid". A bid/ask profile minted from
 * candle colour, on the default REGIME and REVIEW desks.
 *
 * Now one shelf ink per row, value area denser. The Bid/Ask split species
 * (P-110 #11) is the only place a side may appear, and only with a sided tape.
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

describe("session / classic VP makes no bid/ask claim", () => {
  const start = CHART.indexOf("function drawWMVP(");
  const end = CHART.indexOf("function runWMVP", start);
  const block = CHART.slice(start, end);

  it("paints one shelf ink per row, weighted by the value area", () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(block).toMatch(/const inValue = price >= valPrice && price <= vahPrice;/);
    expect(block).toMatch(/vpUpRgba\(\(\(inValue \? 0\.55 : 0\.30\) \* alphaScale\)/);
  });

  it("never splits a row by candle direction or paints a down/bid half", () => {
    expect(block).not.toMatch(/vpBarSplit\(/);
    expect(block).not.toMatch(/\bupRatio\b/);
    expect(block).not.toMatch(/vpDnRgba\(/);
  });

  it("the VP gear offers no Ask or Bid colour", () => {
    expect(ROOM).not.toMatch(/"Up \/ Ask"|"Down \/ Bid"/);
    expect(ROOM).toMatch(/field\("Shelf", vpUp,/);
  });
});
