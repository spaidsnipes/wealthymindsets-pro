import { describe, expect, it } from "vitest";
import { electProviderTapeSource } from "./providerTapeElection";

describe("electProviderTapeSource", () => {
  it("elects Moomoo first and keeps it ahead of Webull", () => {
    expect(electProviderTapeSource(null, "moomoo")).toBe("moomoo");
    expect(electProviderTapeSource("moomoo", "webull")).toBe("moomoo");
  });

  it("uses Webull as fallback and permits a later Moomoo promotion", () => {
    expect(electProviderTapeSource(null, "webull")).toBe("webull");
    expect(electProviderTapeSource("webull", "moomoo")).toBe("moomoo");
  });

  it.each(["polygon", "finnhub", "alpaca", "coinbase", "binance"] as const)(
    "never displaces an elected %s stream",
    (current) => {
      expect(electProviderTapeSource(current, "moomoo")).toBe(current);
      expect(electProviderTapeSource(current, "webull")).toBe(current);
    },
  );
});
