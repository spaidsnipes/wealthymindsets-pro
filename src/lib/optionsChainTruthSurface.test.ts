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
    expect(optionsChain).toContain('const hasAvailableData = !loading && dataSource === "fmp" && chain.length > 0');
    expect(optionsChain).toContain('loading\n    ? "CHECKING · FIDELITY UNKNOWN"');
    expect(optionsChain).toContain("{hasAvailableData && <>");
    expect(optionsChain).toContain("{hasAvailableData && atm && (");
    expect(optionsChain).toContain('loading\n            ? "Checking options availability · fidelity UNKNOWN"');
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
  });

  it("preserves the canonical fetch and fail-closed chain construction", () => {
    expect(optionsChain).toContain("/api/fmp?path=/v3/options/");
    expect(optionsChain).toContain('throw new Error("No options data")');
    expect(optionsChain).toContain('throw new Error("No contracts for the selected expiration")');
    expect(optionsChain).toContain("buildChain(allContracts, priceKey, isoDate)");
    expect(optionsChain).toContain("WealthyMindsets will not fabricate contracts");
  });
});
