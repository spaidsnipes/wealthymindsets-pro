/**
 * The REAL Webull cost lines belong to the symbol they were read for (truth
 * lane, 2026-10-06): a plain useState painted the previous symbol's cost
 * lines on the new symbol's price until /api/broker/webull/positions answered.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { owned, ownedWrite, readOwned, UNOWNED } from "@/lib/marketData/symbolOwned";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");

describe("broker cost lines are symbol-owned", () => {
  it("MainChart holds them in useSymbolOwnedState keyed by the requested symbol, with one stable empty book", () => {
    expect(MC).toMatch(/const \[brokerCostPositions, setBrokerCostPositions\] = useSymbolOwnedState<[\s\S]*?>\(brokerCostKey, NO_BROKER_COST_POSITIONS\);/);
    expect(MC).toContain('const brokerCostKey = (symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");');
    expect(MC).not.toMatch(/useState<Array<\{\s*symbol: string;\s*instrumentType/);
  });
  it("the rule it applies: TSLA's lines are not read on NVDA, and a late TSLA answer is dropped", () => {
    const tsla = owned("TSLA", [{ paintLevel: 250 }]);
    expect(readOwned(tsla, "NVDA")).toBeNull();
    const late = ownedWrite(UNOWNED, "TSLA", "NVDA", [{ paintLevel: 250 }], [] as { paintLevel: number }[]);
    expect(readOwned(late, "NVDA")).toBeNull();
  });
});
