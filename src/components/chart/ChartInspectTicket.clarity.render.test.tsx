/**
 * F05 CLARITY on the bar ticket: the selected candle's anatomy printed from
 * the owner, in the plate's order, with no pressure split (H-701).
 */

import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ChartInspectTicket from "./ChartInspectTicket";
import { selectInspectTicket } from "@/lib/marketData/viewModels/selectInspectTicket";
import { selectClarityAnatomy, type ClarityBar } from "@/lib/marketData/viewModels/selectClarityAnatomy";

const bar = (open: number, high: number, low: number, close: number): ClarityBar => ({ open, high, low, close });
const prior = Array.from({ length: 12 }, () => bar(100, 100.5, 99.5, 100));

const render = (clarity: ReturnType<typeof selectClarityAnatomy> | null) =>
  renderToStaticMarkup(
    <ChartInspectTicket
      vm={selectInspectTicket({ barOpenMs: null, barSpanMs: null, price: null, barVolume: null, prints: [] })}
      followingLiveBar={false}
      open
      onOpenChange={() => {}}
      onOpenFootprint={() => {}}
      clarity={clarity}
    />,
  );

describe("the bar ticket carries the candle's Clarity anatomy", () => {
  it("prints every line from the owner, in the plate's order, with its receipts", () => {
    const vm = selectClarityAnatomy({ bar: bar(100.5, 103, 99.75, 101), priorBars: prior, dp: 2 });
    const html = render(vm);
    expect(html).toContain("CLARITY · CANDLE ANATOMY");
    expect(html).toContain('data-inspect-clarity="UPPER_REJECTION"');
    expect(html).toContain('data-inspect-clarity-gap="GAP_UP_FILLED"');
    expect(html).toContain('data-inspect-clarity-breath="EXPANDING"');
    const order = ["Range", "Body efficiency", "Wick intent", "Truth gap", "Close location", "Breath"].map(w => html.indexOf(w));
    expect(order.every(i => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    for (const l of vm.lines) expect(html).toContain(l.value);
  });

  it("says nothing about buyers, sellers or pressure", () => {
    const html = render(selectClarityAnatomy({ bar: bar(100, 110, 100, 109), priorBars: prior, dp: 2 }));
    const clarityBlock = html.slice(html.indexOf("CLARITY · CANDLE ANATOMY"));
    expect(clarityBlock.slice(0, 1200)).not.toMatch(/\b(buyers?|sellers?|bull|bear|pressure)\b/i);
  });

  it("no anatomy read, no section — never an empty frame", () => {
    expect(render(null)).not.toContain("CLARITY · CANDLE ANATOMY");
    expect(render(selectClarityAnatomy({ bar: null, priorBars: [], dp: 2 }))).not.toContain("CLARITY · CANDLE ANATOMY");
  });
});

describe("one owner: the room hands the ticket the owner's reading", () => {
  const room = readFileSync(join(__dirname, "ChartsDashboard.tsx"), "utf8");
  it("the dashboard computes Clarity from the SAME inspectBar the ticket reads, before it, at the market's decimals", () => {
    const at = room.indexOf("const clarityVM");
    expect(at).toBeGreaterThan(0);
    const block = room.slice(at, at + 900);
    expect(block).toContain("selectClarityAnatomy(");
    expect(block).toContain("inspectBar.o");
    expect(block).toContain("chartBars.slice(Math.max(0, end - BREATH_SAMPLE), end)");
    expect(block).toContain("pricePrecisionFromBars(chartBars)");
    expect(room).toContain("clarity={clarityVM}");
  });
});
