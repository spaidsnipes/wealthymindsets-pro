import { describe, expect, it } from "vitest";
import type { CanonicalMarketEvent } from "@/lib/marketData/marketEvent";
import { inferEquityAggressor } from "./tastytradeEquityInference";
import { aggressorProvenanceOf } from "@/lib/marketData/selectAggressorFlow";

const p = (price: number, bid?: number, ask?: number, side: "BUY" | "SELL" | "UNKNOWN" = "UNKNOWN") =>
  ({ price, size: 100, bid, ask, aggressorSide: side, aggressorMethod: side === "UNKNOWN" ? "NONE" : "PROVIDER", assetClass: "futures" }) as unknown as CanonicalMarketEvent;

describe("Lee–Ready on the consolidated equity tape (2026-10-01)", () => {
  it("quote test first: at the ask is a buy, at the bid a sell", () => {
    expect(inferEquityAggressor(p(10.02, 10.0, 10.02), 10.05)).toMatchObject({ aggressorSide: "BUY", aggressorMethod: "QUOTE_TEST", assetClass: "equity" });
    expect(inferEquityAggressor(p(9.99, 10.0, 10.02), 9.9)).toMatchObject({ aggressorSide: "SELL", aggressorMethod: "QUOTE_TEST" });
  });
  it("midpoint inside the spread; tick rule at the midpoint; a zero tick keeps the prior side", () => {
    // Shape from the live NVDA premarket tape, 2026-10-02: 232.898 in 232.80 / 232.90.
    expect(inferEquityAggressor(p(232.898, 232.8, 232.9), null)).toMatchObject({ aggressorSide: "BUY", aggressorMethod: "QUOTE_TEST" });
    expect(inferEquityAggressor(p(232.81, 232.8, 232.9), null)).toMatchObject({ aggressorSide: "SELL", aggressorMethod: "QUOTE_TEST" });
    expect(inferEquityAggressor(p(10.01, 10.0, 10.02), 10.0)).toMatchObject({ aggressorSide: "BUY", aggressorMethod: "TICK_RULE" });
    expect(inferEquityAggressor(p(10.01, 10.0, 10.02), 10.015)).toMatchObject({ aggressorSide: "SELL", aggressorMethod: "TICK_RULE" });
    expect(inferEquityAggressor(p(10.01, 10.0, 10.02), 10.01, "SELL")).toMatchObject({ aggressorSide: "SELL", aggressorMethod: "TICK_RULE" });
    expect(inferEquityAggressor(p(10.01, 10.0, 10.02), 10.01)).toMatchObject({ aggressorSide: "UNKNOWN", aggressorMethod: "NONE" });
    expect(inferEquityAggressor(p(10.01), null)).toMatchObject({ aggressorSide: "UNKNOWN" });
  });
  it("never claims the exchange's word, and leaves a signed print alone", () => {
    const q = inferEquityAggressor(p(10.02, 10.0, 10.02), null);
    expect(aggressorProvenanceOf(q.aggressorMethod)).toBe("INFERRED");
    expect(q.aggressorConfidence).toBeLessThan(1);
    // A side the consolidated feed carries is re-derived and labelled inferred.
    const stated = inferEquityAggressor(p(10.0, 10.0, 10.02, "BUY"), 9);
    expect(stated).toMatchObject({ aggressorSide: "SELL", aggressorMethod: "QUOTE_TEST" });
    expect(aggressorProvenanceOf(stated.aggressorMethod)).toBe("INFERRED");
  });
});

import { readFileSync } from "node:fs";
import { getRuntimeTapeCapability, hasVerifiedAggressorTape } from "@/lib/marketData/capabilityRegistry";
import { dvpSideStyle } from "@/lib/deltaVPGeometry";
describe("the equity tape is reviewed as INFERRED", () => {
  it("registry: tastytrade-equity resolves, inferred, display-only rights", () => {
    const cap = getRuntimeTapeCapability("tastytrade-equity");
    expect(cap?.assetClass).toBe("equity");
    expect(cap?.aggressorMethod).toBe("QUOTE_TEST");
    expect(hasVerifiedAggressorTape("tastytrade-equity")).toBe(true);
    expect(dvpSideStyle(cap?.aggressorMethod)).toBe("OUTLINE_INFERRED");
    expect(cap?.rights.redistribute).toBe("UNKNOWN");
  });
  it("the live lane infers equity sides and keeps the price source tastytrade", () => {
    const src = readFileSync("src/hooks/useWebSocket.ts", "utf8");
    expect(src).toContain("const inferred = inferEquityAggressor(print, lastEquityPrice, lastEquitySide);");
    expect(src).toContain('tapeSourceRef.current = "tastytrade-equity";');
    expect(src).toContain('(tape === "tastytrade-equity" ? "tastytrade" : tape)');
  });
});
