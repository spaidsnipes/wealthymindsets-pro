import { describe, expect, it } from "vitest";
import { shouldShowMarketStateResolutionQualifier } from "./HeroTruth";

describe("HeroTruth market-state qualifier", () => {
  it("does not repeat UNKNOWN beside an UNKNOWN market state", () => {
    expect(shouldShowMarketStateResolutionQualifier("UNKNOWN", "UNKNOWN")).toBe(false);
  });

  it("keeps a distinct PARTIAL qualifier beside a named market state", () => {
    expect(shouldShowMarketStateResolutionQualifier("BALANCE", "PARTIAL")).toBe(true);
  });

  it("does not add a qualifier to resolved market state", () => {
    expect(shouldShowMarketStateResolutionQualifier("EXPANSION", "RESOLVED")).toBe(false);
  });
});
