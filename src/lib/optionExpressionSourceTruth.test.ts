import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const expression = fs.readFileSync(path.join(process.cwd(), "src/components/chart/OptionExpressionIntent.tsx"), "utf8");
const dashboard = fs.readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");

describe("selected option source truth", () => {
  it("carries the exact Alpaca indicative receipt into display and shared intent", () => {
    expect(dashboard).toContain('receipt.source !== "alpaca"');
    expect(dashboard).toContain('receipt.fidelity !== "INDICATIVE"');
    expect(dashboard).toContain('|| !timing.reviewable');
    expect(dashboard).not.toContain('providerTimestamp: receipt.newestProviderTimestamp');
    expect(expression).toContain('quote timestamp ${contract.quoteTimestamp ?? "not observed"}');
    expect(expression).toContain('trade timestamp ${contract.tradeTimestamp ?? "not observed"}');
    expect(expression).toContain('quote {quoteTiming} · trade {tradeTiming}');
    expect(expression).toContain('quote timing ${observationTiming.quote.timing}');
    expect(expression).toContain('trade timing ${observationTiming.trade.timing}');
    expect(expression).toContain('!purpose.trim() || !canRecord');
    expect(expression).toContain('Reference timing is unverified for both the exact quote and trade.');
    expect(expression).toContain('{source === "alpaca" ? "Alpaca" : "Unknown source"} reference');
    expect(expression).toContain("Source OSI identity matches the selected underlying, side, expiry, and strike.");
    expect(expression).toContain("Executable broker instrument mapping and support remain unverified.");
    expect(expression).toContain("source OSI identity matches the selected underlying, side, expiry, and strike; executable quote and broker instrument mapping/support remain unverified. No order requested.");
    expect(expression).toContain("This review does not open a position.");
    expect(expression).not.toContain("Contract-to-underlying binding and broker support need verification.");
    expect(expression).not.toContain("executable quote and contract binding unverified");
    expect(expression).not.toContain("FMP reference");
    expect(expression).not.toContain("Reference source FMP");
  });
});
