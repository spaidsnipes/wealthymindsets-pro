/**
 * THE RISK RAIL STATES MONEY — Garden 16 §17, 2026-09-26.
 *
 * The STOP / INVALIDATION callout printed the stop distance in price points
 * only, so a 5-point stop read the same on TSLA ($5.00 a share), ES1!
 * ($250.00 a contract) and GC1! ($500.00 a contract). It now carries the
 * chain from the ONE contract-economics owner: ticks × tick value = $ per
 * 1 unit, or the named refusal for a contract with no published point value.
 *
 * This sentinel reads source (a breadcrumb, not a renderer). It pins:
 *   - the money comes from `selectRiskEconomics`, not arithmetic in the canvas;
 *   - it is keyed on the chart's `symbol` prop (not a ref that can lag a
 *     switch), and the draw effect re-runs on `symbol`;
 *   - the words ride the STOP callout;
 *   - the `riskEconomics` receipt is withdrawn every frame before the layer
 *     gate, so an off layer never keeps the last instrument's money.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SRC = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

function riskBlock(): string {
  const a = SRC.indexOf("H-1001 · RISK ON PRICE — hardware brackets on the price axis");
  const b = SRC.indexOf("THE RECEIPT — torn from the same DECISION_ID", a);
  expect(a).toBeGreaterThan(-1);
  expect(b).toBeGreaterThan(a);
  return SRC.slice(a, b);
}

describe("risk rail states money (Garden 16 §17)", () => {
  it("imports the one economics owner", () => {
    expect(SRC).toMatch(/import \{ selectRiskEconomics(?:, snapToTick)? \} from "@\/lib\/marketData\/contractEconomics";/);
  });

  it("prices the stop with the chart's own symbol and the plan's prices", () => {
    expect(riskBlock()).toMatch(
      /const econR = selectRiskEconomics\(symbol, \{ entry: rv\.entry, stop: rv\.stop, target: rv\.target \}\);/,
    );
  });

  it("the words ride the STOP / INVALIDATION callout", () => {
    expect(riskBlock()).toMatch(/callout\(\+yS, `STOP \/ INVALIDATION [^`]*`, RISK, true, econR\.words\);/);
  });

  it("the reward in money rides the TARGET callout", () => {
    expect(riskBlock()).toMatch(/callout\(\+yT, `TARGET [^`]*`, REWARD, true, econR\.rewardWords \?\? undefined\);/);
  });

  it("the receipt is published from the owner and withdrawn before the layer gate", () => {
    const block = riskBlock();
    expect(block).toMatch(/ds\.riskEconomics = econR\.receipt;/);
    const del = block.indexOf("delete ds.riskEconomics;");
    const gate = block.indexOf('layerOnRef.current.riskOnPrice === true');
    expect(del).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(del);
  });

  it("no multiplier arithmetic lives in the canvas", () => {
    expect(riskBlock()).not.toMatch(/contractMultiplier|CONTRACT_MULTIPLIERS|CONTRACT_TICK_SIZES/);
  });

  it("the draw effect re-runs on a symbol switch", () => {
    const deps = /\}, \[footprintType, footprintEnabled, bigTradesOverlay[^\]]*\]\);/.exec(SRC);
    expect(deps, "draw effect deps not found").not.toBeNull();
    expect(deps![0]).toMatch(/\bsymbol\b/);
  });
});
