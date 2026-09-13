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
    // The header still labels what the section is FOR so the deck skeleton
    // is comprehensible before hydration.
    const html = renderToStaticMarkup(<DeckMarketChart symbol="TSLA" timeframe="15m" />);
    expect(html).toContain("Market · chart evidence");
    expect(html).toContain("TSLA");
    expect(html).toContain("15m");
    expect(html).toContain('data-testid="deck-market-chart"');
    // IDLE is the honest initial state — never a ghost chart shape.
    expect(html).toContain('data-testid="deck-market-chart-idle"');
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

  it("the chart sits BESIDE the chip panel, not INSTEAD of it", () => {
    // MarketCanvasPanel carries the WHY-NOT / would-invalidate compilation.
    // Ticket T is chart AND evidence, not chart XOR evidence.
    const src = readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");
    expect(src).toMatch(/<DeckMarketChart[\s\S]{0,400}<MarketCanvasPanel/);
  });
});
