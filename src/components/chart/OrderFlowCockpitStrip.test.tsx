/**
 * OrderFlowCockpitStrip — behaviour + LIVING-PIXEL LAW compliance tests.
 *
 * Guards the Founder Visual Canon Asset 10 merge — no fake number
 * can slip through the empty-state branch, and real ticks must
 * surface honest aggregates from selectAggressorFlow.
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OrderFlowCockpitStrip } from "./OrderFlowCockpitStrip";
import type { AggressorTick } from "@/lib/marketData/selectAggressorFlow";

describe("OrderFlowCockpitStrip", () => {
  it("renders nothing when there are no ticks", () => {
    const html = renderToStaticMarkup(
      <OrderFlowCockpitStrip ticks={[]} livePrice={100} />,
    );
    expect(html).toBe("");
  });

  it("renders nothing when every tick is invalid (missing side)", () => {
    const ticks: AggressorTick[] = [
      { size: 100, price: 50 } as AggressorTick,
      { size: 200, price: 50 } as AggressorTick,
    ];
    const html = renderToStaticMarkup(
      <OrderFlowCockpitStrip ticks={ticks} livePrice={50} />,
    );
    expect(html).toBe("");
  });

  it("renders Aggressive Buy / Aggressive Sell / Net Flow when real ticks flow", () => {
    const ticks: AggressorTick[] = [
      { side: "buy", size: 1000, price: 100, trade: true },
      { side: "buy", size: 500, price: 101, trade: true },
      { side: "sell", size: 300, price: 100, trade: true },
    ];
    const html = renderToStaticMarkup(
      <OrderFlowCockpitStrip ticks={ticks} livePrice={100} />,
    );
    expect(html).toContain("Aggressive Buy");
    expect(html).toContain("Aggressive Sell");
    expect(html).toContain("Net Flow");
    // askVol = 1500, bidVol = 300, net = +1200
    expect(html).toContain("1.5K");
    expect(html).toContain("300");
    expect(html).toContain("+1.2K");
  });

  it("formats large volumes with K/M/B suffixes", () => {
    const ticks: AggressorTick[] = [
      { side: "buy", size: 2_840_000_000, price: 15842, trade: true },
    ];
    const html = renderToStaticMarkup(
      <OrderFlowCockpitStrip ticks={ticks} livePrice={15842} />,
    );
    expect(html).toContain("2.84B");
  });

  it("uses the custom label prefix when provided", () => {
    const ticks: AggressorTick[] = [
      { side: "buy", size: 1, price: 1, trade: true },
    ];
    const html = renderToStaticMarkup(
      <OrderFlowCockpitStrip ticks={ticks} livePrice={1} label="FLOW" />,
    );
    expect(html).toContain("FLOW");
  });

  it("renders imbalance ratio derived from real selector output", () => {
    const ticks: AggressorTick[] = [
      { side: "buy", size: 800, price: 100, trade: true },
      { side: "sell", size: 200, price: 100, trade: true },
    ];
    // askDom, imbRatio = 400 (800/200 * 100)
    const html = renderToStaticMarkup(
      <OrderFlowCockpitStrip ticks={ticks} livePrice={100} />,
    );
    expect(html).toContain("400:100");
  });

  it("preserves sub-1 crypto volumes instead of rounding to \"0\" (Founder BTC defect)", () => {
    // Real from-USE BTC prod defect: labels showed "AGGRESSIVE BUY 0 /
    // AGGRESSIVE SELL 0" while imbRatio was 27,261,700:100 because the
    // formatter used toFixed(0) and 0.011 BTC → "0". Now 0.011 → "0.0110".
    const ticks: AggressorTick[] = [
      { side: "buy", size: 0.011, price: 77000, trade: true },
      { side: "sell", size: 0.005, price: 77000, trade: true },
    ];
    const html = renderToStaticMarkup(
      <OrderFlowCockpitStrip ticks={ticks} livePrice={77000} />,
    );
    // Must show real fractional numbers, not "0"
    expect(html).toContain("0.0110");
    expect(html).toContain("0.0050");
    // Aggressor labels must NOT collapse to "0" for real sub-1 flow
    const buyCell = html.match(/Aggressive Buy[\s\S]{0,200}?<\/span><\/span>/)?.[0] ?? "";
    expect(buyCell).not.toMatch(/>0<\/span>/);
  });

  it("caps absurd imbalance ratios instead of showing millions:100", () => {
    // Real from-USE BTC prod: crypto's fractional volumes pushed the
    // imbalance ratio to 27,261,700:100 (a real math result, but reads
    // as garbage). Cap to "≥10k:1" so the trader isn't confused.
    const ticks: AggressorTick[] = [
      { side: "buy", size: 2726.17, price: 77000, trade: true },
      { side: "sell", size: 0.01, price: 77000, trade: true },
    ];
    const html = renderToStaticMarkup(
      <OrderFlowCockpitStrip ticks={ticks} livePrice={77000} />,
    );
    // Must NOT contain the millions-digit raw ratio; must show honest cap
    expect(html).not.toContain("27261700");
    expect(html).toMatch(/≥10k:1|≥1k:1/);
  });
});
