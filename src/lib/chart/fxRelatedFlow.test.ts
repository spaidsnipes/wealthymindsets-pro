import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pruneRelated, relatedFlowLine, relatedRoot, summarizeRelated, type RelatedPrint } from "./fxRelatedFlow";

const P = (atMs: number, size: number, side: RelatedPrint["side"]): RelatedPrint => ({ atMs, size, side });

describe("CME related-market flow for a spot pair", () => {
  it("names the catalogued futures root only", () => {
    expect(relatedRoot("EURUSD")).toBe("6E");
    expect(relatedRoot("GBPUSD")).toBe("6B");
    expect(relatedRoot("USDJPY")).toBe("6J");
    expect(relatedRoot("EURGBP")).toBeNull();
    expect(relatedRoot("6E1!")).toBeNull();
  });
  it("counts only exchange-signed prints and keeps unsided apart", () => {
    const s = summarizeRelated([P(1, 3, "BUY"), P(2, 2, "SELL"), P(3, 5, "UNKNOWN"), P(4, 4, "BUY")]);
    expect(s).toEqual({ buy: 7, sell: 2, delta: 5, prints: 4, unsided: 1 });
  });
  it("keeps a five-minute window", () => {
    const now = 1_000_000;
    expect(pruneRelated([P(now - 400_000, 1, "BUY"), P(now - 200_000, 2, "SELL")], now)).toEqual([P(now - 200_000, 2, "SELL")]);
  });
  it("always says related market, not spot — and the non-owner line is plain", () => {
    const live = relatedFlowLine("EURUSD", { kind: "LIVE", summary: { buy: 412, sell: 388, delta: 24, prints: 37, unsided: 0 } })!;
    expect(live).toBe("CME 6E futures · signed flow (related market, not spot) · last 5 min: buy 412 · sell 388 · Δ +24 contracts");
    expect(live).not.toMatch(/spot volume|global/i);
    expect(relatedFlowLine("GBPUSD", { kind: "UNSUPPORTED" })).toBe("CME 6B futures · signed flow (related market, not spot) · not available here — needs the owner's tastytrade connection");
    expect(relatedFlowLine("EURUSD", { kind: "LIVE", summary: { buy: 0, sell: 0, delta: 0, prints: 2, unsided: 2 } })).toContain("no signed prints (2 unsided)");
    expect(relatedFlowLine("TSLA", { kind: "NOT_SPOT_FX" })).toBeNull();
  });
  it("is words in the footer, never paint on the spot candles", () => {
    const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
    expect(MC).toContain("const fxRelated = useFxRelatedFlow(symbol);");
    expect(MC).toContain('data-testid="fx-related-flow-unsupported"');
    // §18 (2026-10-08): the chip leads with RELATED FUTURES EVIDENCE; "not spot"
    // is carried by the title and the aria-label (relatedFlowLine), never dropped.
    expect(MC).toContain("RELATED FUTURES EVIDENCE · CME {relatedRoot(symbol)} · 5m signed Δ");
    expect(MC).toContain("aria-label={relatedLine ?? `CME futures participation: ${fxDoor.futures}`}");
    expect(MC).toMatch(/title=\{`Spot FX has no central volume\.[^`]*never shown as spot volume\.\$\{relatedLine/);
    // the related prints never reach a canvas paint or the spot tape
    const hook = readFileSync("src/lib/broker/useFxRelatedFlow.ts", "utf8");
    expect(hook).not.toMatch(/processTick|ingest|volRef|candle/i);
    expect(hook).toContain("subscribeTastyEvents([contract.streamer]");
  });
});
