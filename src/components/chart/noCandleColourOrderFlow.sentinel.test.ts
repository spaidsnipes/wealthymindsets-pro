/**
 * NO ORDER FLOW MINTED FROM CANDLE COLOUR — Garden Pass 12, Defect 3 (H-701).
 *
 *     NEVER DO THIS
 *     green candle = buyer aggression
 *     red candle = seller aggression
 *     OHLC estimate = true tape
 *     CLV approximation = Big Trade
 *
 * The legacy indicator engine carried a family that did exactly that under
 * order-flow names: a "CVD" that booked 65% of a green candle's volume to
 * buyers (switched on by the default "Order Flow Setup" strategy), "Delta
 * Bars", "Trade Flow", "Buy/Sell Volume Columns", tape-speed panes read off
 * candle bodies, a bar-volume "Large Trade Filter", and candle-based
 * "Absorption/Exhaustion Detector" panes that duplicated the canonical
 * readings. Signed flow on this chart comes from the tape (selectAggressorFlow
 * and the on-price order-flow readings), or it is withheld.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const CHART = strip(read("src/components/chart/MainChart.tsx"));
const INDICATORS = strip(read("src/components/chart/indicators.ts"));
const TOOLBAR = strip(read("src/components/chart/ChartToolbar.tsx"));
const ROOM = strip(read("src/components/chart/ChartsDashboard.tsx"));

const RETIRED = [
  "CVD",
  "CVD Oscillator",
  "Delta Bars",
  "Volume Delta",
  "Trade Flow",
  "Speed of Tape",
  "Tape Speed",
  "Buy/Sell Volume Columns",
  "Large Trade Filter",
  "Absorption Detector",
  "Exhaustion Detector",
];

describe("no order flow minted from candle colour", () => {
  it.each(RETIRED)("the indicator engine does not paint %s", name => {
    expect(CHART).not.toContain(`inds.has("${name}")`);
  });

  it("no picker offers the candle-based absorption or exhaustion duplicates", () => {
    expect(TOOLBAR).not.toContain('name:"Absorption Detector"');
    expect(TOOLBAR).not.toContain('name:"Exhaustion Detector"');
  });

  it("no default strategy switches on a candle-derived CVD", () => {
    const strategies = ROOM.slice(ROOM.indexOf("const DEFAULT_STRATEGIES"), ROOM.indexOf("export type CandleType"));
    expect(strategies).not.toMatch(/"CVD"/);
  });

  it("the indicator library exports no candle-ratio cumulative delta", () => {
    expect(INDICATORS).not.toMatch(/export function cvd\b/);
    expect(INDICATORS).not.toMatch(/export function cvdOscillator\b/);
  });

  it("no indicator books volume to a side by the candle's direction", () => {
    expect(CHART).not.toMatch(/close\s*>=?\s*b\.open\s*\?\s*b\.volume/);
    expect(CHART).not.toMatch(/const dir = b\.close >= b\.open \? 1 : -1;/);
  });
});
