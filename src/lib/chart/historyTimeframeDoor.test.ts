import { describe, expect, it } from "vitest";
import { historyTimeframeDoor } from "./historyTimeframeDoor";

describe("historyTimeframeDoor — spot FX seconds charts point at 5m", () => {
  it("spot FX on a seconds timeframe gets the 1m door", () => {
    expect(historyTimeframeDoor("EURUSD", "5s")?.timeframe).toBe("5m");
    expect(historyTimeframeDoor("GBPUSD", "15s")?.timeframe).toBe("5m");
  });
  it("minute timeframes and other markets get none", () => {
    expect(historyTimeframeDoor("EURUSD", "1m")).toBeNull();
    expect(historyTimeframeDoor("BTC-USD", "5s")).toBeNull();
    expect(historyTimeframeDoor("ES1!", "5s")).toBeNull();
    expect(historyTimeframeDoor("NVDA", "5s")).toBeNull();
    expect(historyTimeframeDoor("EURUSD", null)).toBeNull();
  });
});
