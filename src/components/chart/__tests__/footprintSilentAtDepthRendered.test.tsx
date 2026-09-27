import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FootprintControls } from "../FootprintControls";
import { orderFlowToolCapability } from "@/lib/marketData/orderFlowToolCapability";

/**
 * THE WORDS, RENDERED (Garden 16 §46, 2026-09-27). The sentinel pins the
 * source; this renders the actual door and reads the markup a trader gets.
 */
const SOURCES = ["coinbase", "binance", "polygon", "alpaca", "webull", "finnhub", "moomoo"];
const drawableSource = SOURCES.find(s => orderFlowToolCapability("big-trades", "Big Trades", { source: s, observedAggressorFlow: true }).drawable);

const render = (depth: "FAR" | "MID" | "NEAR" | null) =>
  renderToStaticMarkup(
    <FootprintControls active="big-trades" enabled onChange={() => {}} onDisable={() => {}} tapeSource={drawableSource ?? null} observedAggressorFlow semanticDepth={depth} wrapNote />,
  );

describe("FootprintControls — an armed tool silenced by depth", () => {
  it("has a sided source that can draw Big Trades (positive control)", () => {
    expect(drawableSource).toBeTruthy();
  });

  it("at FAR it says so in words on the door", () => {
    const html = render("FAR");
    expect(html).toContain('data-of-armed-state="SILENT_AT_DEPTH"');
    expect(html).toContain("Armed, silent at FAR — zoom in (fewer bars) and the prints speak");
  });

  it("at MID and NEAR the prints speak, so the door says nothing extra", () => {
    for (const d of ["MID", "NEAR", null] as const) expect(render(d)).not.toContain("SILENT_AT_DEPTH");
  });
});
