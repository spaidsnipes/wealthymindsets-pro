import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const optionsChain = fs.readFileSync(
  path.join(process.cwd(), "src/components/chart/OptionsChain.tsx"),
  "utf8",
);

describe("Options Chain truth and responsive surface", () => {
  it("never promotes a successful provider response to live fidelity", () => {
    expect(optionsChain).toContain("DATA AVAILABLE · FIDELITY UNKNOWN");
    expect(optionsChain).toContain("delivery freshness and entitlement are not established");
    expect(optionsChain).toContain("Source response: Financial Modeling Prep · freshness UNKNOWN");
    expect(optionsChain).not.toContain("LIVE • FMP");
    expect(optionsChain).not.toContain("Real data: Financial Modeling Prep API");
    expect(optionsChain).not.toContain("bg-wm-green animate-pulse");
  });

  it("gives loading precedence and suppresses stale chain statistics", () => {
    expect(optionsChain).toContain('const hasAvailableData = !loading && receivedSymbol === symbol && dataSource === "fmp" && chain.length > 0');
    expect(optionsChain).toContain('loading\n    ? "CHECKING · FIDELITY UNKNOWN"');
    // Footer stats moved into an IIFE to derive an observed-only OI summary.
    // The gate itself is the invariant: statistics must not render without
    // available data. Assert the gate, and that the summary sits INSIDE it.
    const gate = optionsChain.indexOf("{hasAvailableData && (() => {");
    expect(gate).toBeGreaterThan(-1);
    expect(optionsChain.indexOf("summariseOpenInterest(chain)")).toBeGreaterThan(gate);
    expect(optionsChain).toContain("{hasAvailableData && atm && (");
    expect(optionsChain).toContain('loading\n            ? "Checking options availability · fidelity UNKNOWN"');
  });

  it("fences superseded contract reads and bounds stalled bodies", () => {
    expect(optionsChain).toContain('contractRead.current?.cancel();');
    expect(optionsChain).toContain('signal: controller.signal');
    expect(optionsChain).toMatch(/await res\.json\(\);\s*if \(!active\) return;/);
    expect(optionsChain).toContain('Options check timed out. Contract availability is unverified.');
    expect(optionsChain).toContain('}, 12_000);');
    expect(optionsChain).toContain('return () => contractRead.current?.cancel();');
    expect(optionsChain).toContain('setAllContracts([])');
    expect(optionsChain).toContain(') : !hasAvailableData ? (');
  });

  it("keeps the panel contained and its primary controls touch reachable", () => {
    expect(optionsChain).toContain("w-full max-w-[700px] min-w-0");
    expect(optionsChain).not.toContain('className="w-[700px]');
    expect(optionsChain).toContain('aria-label="Refresh options data"');
    expect(optionsChain).toContain('aria-label="Close options chain"');
    expect(optionsChain).toContain("aria-pressed={showGreeks}");
    expect(optionsChain).toContain("aria-pressed={expiry === e}");
    expect(optionsChain).toContain("aria-pressed={tab === t}");
    expect(optionsChain).toContain("min-h-11 min-w-11");
    expect(optionsChain).toContain("min-w-max");
    expect(optionsChain).toContain('className="min-w-0 break-words"');
  });

  it("does not present a missing underlying quote as a real zero-dollar spot", () => {
    expect(optionsChain).toContain("const hasObservedSpot = Number.isFinite(price) && price > 0");
    expect(optionsChain).toContain('hasObservedSpot ? price.toLocaleString("en-US",{minimumFractionDigits:2}) : "—"');
    expect(optionsChain).toContain("Underlying quote has not been observed");
    expect(optionsChain).toContain('const itm: OptionRow["itm"] = atm == null ? "unknown"');
    expect(optionsChain).not.toContain('Spot: <span className="text-wm-text font-bold">{price.toLocaleString');
  });

  it("preserves the canonical fetch and fail-closed chain construction", () => {
    expect(optionsChain).toContain("/api/fmp?path=/v3/options/");
    expect(optionsChain).toContain('throw new Error("No options data")');
    expect(optionsChain).toContain('throw new Error("No contracts for the selected expiration")');
    expect(optionsChain).toContain("buildChain(allContracts, priceKey, isoDate)");
    expect(optionsChain).toContain("WealthyMindsets will not fabricate contracts");
  });
});
