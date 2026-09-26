import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deepLinkSymbol } from "./SymbolContext";

describe("GP12 §70 — the deep link wins the first frame", () => {
  it("reads ?symbol= on the market surfaces only, validated", () => {
    expect(deepLinkSymbol("/charts", "?symbol=btcusd&tf=5m")).toBe("BTCUSD");
    expect(deepLinkSymbol("/command-deck", "?symbol=NQ1!")).toBe("NQ1!");
    expect(deepLinkSymbol("/journal", "?symbol=TSLA")).toBeNull();
    expect(deepLinkSymbol("/charts", "?symbol=TSLA%26x%3D1")).toBeNull();
    expect(deepLinkSymbol("/charts", "")).toBeNull();
  });

  it("the provider's first restore reads the link before the saved symbol", () => {
    const code = readFileSync(join(process.cwd(), "src/contexts/SymbolContext.tsx"), "utf8");
    const at = code.indexOf("function readPersistedSymbol");
    const body = code.slice(at, at + 700);
    expect(body.indexOf("deepLinkSymbol(")).toBeGreaterThan(0);
    expect(body.indexOf("deepLinkSymbol(")).toBeLessThan(body.indexOf("getItem(LAST_SYMBOL_KEY)"));
  });

  it("the chart's first timeframe reads the link when the prop has not arrived", () => {
    const code = readFileSync(join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");
    expect(code).toContain('normalizeMarketSurfaceTimeframe(new URLSearchParams(window.location.search).get("tf"))');
  });
});
