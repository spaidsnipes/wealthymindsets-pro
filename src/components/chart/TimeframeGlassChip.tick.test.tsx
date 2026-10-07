/**
 * TICK TIMEFRAMES ON THE CHIP (serving 2026-10-07): with the chart on 500T the
 * chip spoke its timeframe through timeframeSpokenName, which throws on an id
 * the clock registry does not hold, and the chart pane's boundary closed.
 * Every render path of the chip must survive every registry tick id.
 */
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TICK_FROM_PRINTS, TimeframeGlassChip, TimeframeLadder, TradeCountRow } from "./TimeframeGlassChip";
import { TICK_TF_IDS } from "@/lib/timeframes";

describe("the chip on a tick timeframe", () => {
  it.each(TICK_TF_IDS)("%s renders and is spoken as trades", (id) => {
    const html = renderToStaticMarkup(<TimeframeGlassChip timeframe={id} setTimeframe={() => {}} symbol="NQ1!" />);
    expect(html).toContain(`${id.slice(0, -1)} trades bars`);
    expect(() => renderToStaticMarkup(<TimeframeLadder timeframe={id} symbol="NQ1!" onChoose={() => {}} />)).not.toThrow();
    const row = renderToStaticMarkup(<TradeCountRow timeframe={id} onChoose={() => {}} />);
    expect(row).toContain('aria-current="true"');
  });
  it("an id outside both registries still renders (spoken as itself)", () => {
    expect(() => renderToStaticMarkup(<TimeframeGlassChip timeframe="777T" setTimeframe={() => {}} symbol="NQ1!" />)).not.toThrow();
  });
});

describe("TICK states the per-source truth (2026-10-07: tick bars shipped, 1a79d85)", () => {
  const strip = (h: string) => h.replace(/title="[^"]*"/g, "");
  it("a tape with signed prints: the rung reads TICK · 100T–2000T from signed prints, not 'no tape'", () => {
    const html = strip(renderToStaticMarkup(<TimeframeLadder timeframe="5m" symbol="NQ1!" onChoose={() => {}} tickRefusal={null} />));
    expect(TICK_FROM_PRINTS).toBe("TICK \u00B7 100T\u20132000T from signed prints");
    expect(html).toContain(TICK_FROM_PRINTS);
    expect(html).not.toContain("TICK \u00B7 1s");
    expect(html).toContain("1s \u00B7 10s</span>: Needs a certified trade tape");
    const row = renderToStaticMarkup(<TradeCountRow timeframe="5m" onChoose={() => {}} tickRefusal={null} />);
    expect(row.match(/<button/g)).toHaveLength(4);
  });
  it("no prints (spot FX / delayed): the canon sentence stands and the counts are refused in words", () => {
    const why = "No trades \u2014 tick bars need prints. Spot FX has quotes, not a tape.";
    const html = strip(renderToStaticMarkup(<TimeframeLadder timeframe="5m" symbol="EURUSD" onChoose={() => {}} tickRefusal={why} />));
    expect(html).not.toContain(TICK_FROM_PRINTS);
    expect(html).toContain("TICK \u00B7 1s \u00B7 10s</span>: Needs a certified trade tape");
    const row = renderToStaticMarkup(<TradeCountRow timeframe="5m" onChoose={() => {}} tickRefusal={why} />);
    expect(row).not.toContain("<button");
    expect(row).toContain("Spot FX has quotes, not a tape.");
  });
});
