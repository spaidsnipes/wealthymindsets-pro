import { describe, expect, it } from "vitest";

import type { AggressorTick } from "./selectAggressorFlow";
import { compileOrderFlowReadings } from "./useOrderFlowReadings";

const prints = Array.from({ length: 120 }, (_, index): AggressorTick => ({
  price: 100 + index / 100,
  size: index < 60 ? 400 : 40,
  side: index % 2 === 0 ? "buy" : "sell",
  trade: true,
  marketEvent: { aggressorMethod: "NONE" },
}));

describe("compileOrderFlowReadings — raw prints are not erased with missing side", () => {
  it("measures Liquidity Weather while side-dependent readings remain gated", () => {
    const readings = compileOrderFlowReadings(prints, null);

    expect(readings.realTape).toBe(false);
    expect(readings.liquidityWeather.stage).not.toBe("UNMEASURED");
    expect(readings.valueCandle.measured).toBe(false);
    expect(readings.deltaDivergence.verdict).toBe("UNMEASURED");
    expect(readings.stackedImbalance.verdict).toBe("UNMEASURED");
  });

  it("still reports Liquidity Weather unmeasured when no prints exist", () => {
    expect(compileOrderFlowReadings([], null).liquidityWeather.stage).toBe("UNMEASURED");
  });
});
