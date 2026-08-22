import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { realQuoteSourceAccepted } from "./realQuoteGate";

/**
 * SF-D01 recurrence lock. The chart's live-quote hook (useWebSocket) must apply
 * the SAME observed gate to Yahoo as every other quote consumer, so the chart
 * cannot surface a fake-fresh (previousClose-fallback) price that the gated
 * watchlist/ticker would reject for the same symbol on the same screen.
 */
describe("realQuoteSourceAccepted — Yahoo observed gate (SF-D01 nest)", () => {
  const resolved = { price: 100, observation: { resolution: "RESOLVED" } };
  const unknown = { price: 100, observation: { resolution: "UNKNOWN" } };

  it("rejects an UNKNOWN (fake-fresh) Yahoo quote", () => {
    expect(realQuoteSourceAccepted("yahoo", unknown)).toBe(false);
  });
  it("accepts a RESOLVED Yahoo quote", () => {
    expect(realQuoteSourceAccepted("yahoo", resolved)).toBe(true);
  });
  it("is permissive for legacy Yahoo payloads with no observation field", () => {
    expect(realQuoteSourceAccepted("yahoo", { price: 100 })).toBe(true);
  });
  it("does NOT gate non-Yahoo sources (they carry their own liveness)", () => {
    expect(realQuoteSourceAccepted("alpaca", unknown)).toBe(true);
    expect(realQuoteSourceAccepted("finnhub", unknown)).toBe(true);
    expect(realQuoteSourceAccepted("binance", {})).toBe(true);
  });
});

describe("source contract — the chart hook actually applies the gate", () => {
  const src = readFileSync(resolve(__dirname, "../../hooks/useWebSocket.ts"), "utf8");

  it("imports the shared gate", () => {
    expect(src).toContain('from "@/lib/marketData/realQuoteGate"');
  });
  it("guards every Yahoo acceptance with realQuoteSourceAccepted", () => {
    // Each `mk(j, "yahoo")` acceptance must be followed by the gate — no bare
    // `if (q) return q` for a Yahoo quote (that was the recurrence path).
    const yahooAccepts = src.match(/mk\(j, "yahoo"\); if \(q[^\n]*\)/g) ?? [];
    expect(yahooAccepts.length).toBeGreaterThanOrEqual(2);
    for (const line of yahooAccepts) {
      expect(line).toContain('realQuoteSourceAccepted("yahoo", j)');
    }
  });
});
