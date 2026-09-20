import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routes = ["yahoo", "finnhub", "exchange", "alpaca"] as const;

describe("canonical bar identity survives every chart route", () => {
  it.each(routes)("%s publishes the admitted identity sidecar beside candles", route => {
    const source = readFileSync(resolve(process.cwd(), `src/app/api/${route}/route.ts`), "utf8");
    expect(source).toContain("ingress.bars.map(canonicalBarIdentity)");
    expect(source).toMatch(/candles,\s*barIdentities,/);
  });

  it("the chart aligns, retains, and hands the sidecar to the room", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    expect(source).toContain("alignCanonicalBarIdentities");
    expect(source).toContain("barIdentitiesRef.current = admittedBarIdentities");
    expect(source).toContain("onBarsReady?.(data, admittedBarIdentities)");
    expect(source).toContain("onBarsReady?.(barsRef.current, barIdentitiesRef.current)");
  });
});

