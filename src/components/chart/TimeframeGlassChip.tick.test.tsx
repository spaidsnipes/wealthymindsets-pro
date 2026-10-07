/**
 * TICK TIMEFRAMES ON THE CHIP (serving 2026-10-07): with the chart on 500T the
 * chip spoke its timeframe through timeframeSpokenName, which throws on an id
 * the clock registry does not hold, and the chart pane's boundary closed.
 * Every render path of the chip must survive every registry tick id.
 */
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TimeframeGlassChip, TimeframeLadder, TradeCountRow } from "./TimeframeGlassChip";
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
