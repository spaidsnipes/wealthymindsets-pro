import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fxFuturesDoor } from "./fxFuturesDoor";

describe("spot FX names its live CME future as a door, never a substitute", () => {
  it("maps the catalogued pairs", () => {
    expect(fxFuturesDoor("EURUSD")?.futures).toBe("6E1!");
    expect(fxFuturesDoor("eur/usd")?.futures).toBe("6E1!");
    expect(fxFuturesDoor("GBPUSD")?.futures).toBe("6B1!");
    expect(fxFuturesDoor("USDJPY")?.note).toMatch(/inverse/);
  });
  it("offers nothing it cannot open", () => {
    expect(fxFuturesDoor("EURGBP")).toBeNull();
    expect(fxFuturesDoor("TSLA")).toBeNull();
    expect(fxFuturesDoor("6E1!")).toBeNull();
  });
  it("the volume footer carries it as a working button", () => {
    const chart = readFileSync("src/components/chart/MainChart.tsx", "utf8");
    expect(chart).toContain('data-testid="fx-futures-door"');
    expect(chart).toContain("const fxDoor = fact.state !== \"OBSERVED\" ? fxFuturesDoor(symbol) : null;");
  });
});
