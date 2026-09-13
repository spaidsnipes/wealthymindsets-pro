import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import DeckMarketChart, { classifyFetch } from "./DeckMarketChart";

/**
 * The deck's MARKET section now renders a REAL chart. This suite fences three
 * things — because a scene-moving atom is exactly the shape that regresses
 * next month when someone "cleans up the imports":
 *
 *   1. the honest state machine — no ghost chart under a loading message
 *   2. the initial SSR paint (no window, no fetch) does not throw
 *   3. the deck actually mounts it (source-graph guard on the page)
 */

describe("classifyFetch — the state machine of the chart", () => {
  it("READY when candles come back", () => {
    const s = classifyFetch(true, 200, {
      candles: [{ time: 1, open: 1, high: 1, low: 1, close: 1 }],
    });
    expect(s.kind).toBe("READY");
    if (s.kind === "READY") expect(s.candles.length).toBe(1);
  });

  it("EMPTY when the shape is valid but the array is empty", () => {
    // Weekend / pre-open / unsubscribed symbol. Not the same failure as an
    // upstream outage — a trader may want to see "no candles yet for X TF"
    // without alarm.
    expect(classifyFetch(true, 200, { candles: [] }).kind).toBe("EMPTY");
  });

  it("UNAVAILABLE with an HTTP reason when the fetch failed", () => {
    const s = classifyFetch(false, 503, {});
    expect(s.kind).toBe("UNAVAILABLE");
    if (s.kind === "UNAVAILABLE") expect(s.reason).toContain("503");
  });

  it("UNAVAILABLE when the response is malformed rather than drawing garbage", () => {
    // Every one of these used to draw SOMETHING against a fabricated series
    // when the code trusted the shape. Now they land in UNAVAILABLE.
    for (const payload of [null, {}, { candles: null }, { candles: "nope" },
                           { candles: [{ time: "1", open: 1, high: 1, low: 1, close: 1 }] },
                           { candles: [{ time: 1, open: NaN, high: 1, low: 1, close: 1 }] },
                           { candles: [{ time: 1, open: 1, high: Infinity, low: 1, close: 1 }] }]) {
      const s = classifyFetch(true, 200, payload);
      expect(s.kind, `payload should have been UNAVAILABLE: ${JSON.stringify(payload)}`).toBe("UNAVAILABLE");
    }
  });
});

describe("DeckMarketChart SSR paint", () => {
  it("renders the shell with the symbol and timeframe (no throw)", () => {
    // No window at SSR — the effect that reaches /api/yahoo does not run.
    const html = renderToStaticMarkup(<DeckMarketChart symbol="TSLA" timeframe="15m" />);
    expect(html).toContain("TSLA");
    expect(html).toContain("15m");
    expect(html).toContain('data-testid="deck-market-chart"');
    // IDLE is the honest initial state — never a ghost chart shape.
    expect(html).toContain('data-testid="deck-market-chart-idle"');
  });

  it("does not print a second visible instrument identity above the candles", () => {
    // SCENE_FRAGMENTATION (Founder audit 2026-09-13). This spec previously
    // asserted the OPPOSITE — that a "Market · chart evidence" label and a
    // "TSLA · 15m" echo were present — on the reasoning that the skeleton
    // should be comprehensible before hydration. In the fused deck room that
    // reasoning inverted: HeroTruth renders the same symbol and timeframe at
    // 34px directly above this section, so the echo made ONE instrument read
    // as TWO owners, and the section label announced a card inside a room
    // whose only subject is the market.
    //
    // The identity is still fully available to assistive technology through
    // the section's aria-label. Retiring a visual duplicate is not allowed to
    // cost a screen-reader user the name of what they are on.
    const html = renderToStaticMarkup(<DeckMarketChart symbol="TSLA" timeframe="15m" />);
    expect(html).not.toContain("Market · chart evidence");
    expect(html).toContain('aria-label="TSLA 15m chart"');
    // The bar count must not render before candles exist — an evidence count
    // painted in IDLE would claim evidence the fetch never returned.
    expect(html).not.toContain("bars");
  });
});

describe("the deck actually mounts a real chart in its MARKET section", () => {
  it("command-deck imports DeckMarketChart and renders it in the STORY surface", () => {
    // Source-graph guard: if a future refactor drops the chart, MARKET
    // regresses to chip-lists-only and Ticket T loses "real chart evidence."
    const src = readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");
    expect(src).toContain('import DeckMarketChart from "@/components/experience/DeckMarketChart";');
    expect(src).toMatch(/<DeckMarketChart\s+symbol=\{symbol\}\s+timeframe=\{timeframe\}/);
  });

  it("the chart and contextual WHY stay inside one market room", () => {
    // MarketCanvasPanel carries the WHY-NOT / would-invalidate compilation,
    // but it is progressive disclosure in the same room rather than a second
    // permanent panel below MARKET.
    const src = readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");
    const roomIdx = src.indexOf('aria-label="One decision market room"');
    const chartIdx = src.indexOf("<DeckMarketChart", roomIdx);
    const whyIdx = src.indexOf('className="wm-cd-market-why"', chartIdx);
    const canvasIdx = src.indexOf("<MarketCanvasPanel", whyIdx);
    expect(roomIdx).toBeGreaterThan(0);
    expect(chartIdx).toBeGreaterThan(roomIdx);
    expect(whyIdx).toBeGreaterThan(chartIdx);
    expect(canvasIdx).toBeGreaterThan(whyIdx);
  });
});
