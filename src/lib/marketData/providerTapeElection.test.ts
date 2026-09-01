import { describe, expect, it } from "vitest";
import { electProviderTapeSource } from "./providerTapeElection";

describe("electProviderTapeSource", () => {
  it("elects Moomoo first and keeps it ahead of Webull", () => {
    expect(electProviderTapeSource(null, "moomoo")).toBe("moomoo");
    expect(electProviderTapeSource("moomoo", "webull", 99_000, 100_000)).toBe("moomoo");
  });

  it("uses Webull as fallback and permits a later Moomoo promotion", () => {
    expect(electProviderTapeSource(null, "webull")).toBe("webull");
    expect(electProviderTapeSource("webull", "moomoo")).toBe("moomoo");
  });

  it("releases a silent bounded provider so a fresh fallback can recover the tape", () => {
    expect(electProviderTapeSource("moomoo", "webull", 60_000, 90_001)).toBe("webull");
    expect(electProviderTapeSource("webull", "webull", 0, 90_001)).toBe("webull");
  });

  it.each(["polygon", "finnhub", "alpaca", "coinbase", "binance"] as const)(
    "never displaces an elected %s stream",
    (current) => {
      expect(electProviderTapeSource(current, "moomoo", 0, 90_001)).toBe(current);
      expect(electProviderTapeSource(current, "webull", 0, 90_001)).toBe(current);
    },
  );
});
