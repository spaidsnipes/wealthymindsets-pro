import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const expression = fs.readFileSync(path.join(process.cwd(), "src/components/chart/OptionExpressionIntent.tsx"), "utf8");
const dashboard = fs.readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");

describe("selected option source truth", () => {
  it("carries the exact Alpaca indicative receipt into display and shared intent", () => {
    expect(dashboard).toContain('receipt.source !== "alpaca"');
    expect(dashboard).toContain('receipt.fidelity !== "INDICATIVE"');
    expect(dashboard).toContain('providerTimestamp={optionSelection.providerTimestamp}');
    expect(expression).toContain('Reference source ${source}; fidelity ${fidelity}; provider timestamp ${providerTimestamp}');
    expect(expression).toContain('{source === "alpaca" ? "Alpaca" : "Unknown source"} reference');
    expect(expression).not.toContain("FMP reference");
    expect(expression).not.toContain("Reference source FMP");
  });
});
