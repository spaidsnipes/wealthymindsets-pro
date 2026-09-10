import { describe, expect, it } from "vitest";
import { identifiedOptionSpot } from "./optionsSpotIdentity";

describe("identifiedOptionSpot", () => {
  it("accepts a positive spot only for the current underlying", () => {
    expect(identifiedOptionSpot("tsla", "TSLA", 250)).toEqual({ symbol: "TSLA", price: 250 });
  });

  it.each([
    ["SPY", "TSLA", 250],
    ["SPY", "SPY", 0],
    ["SPY", "SPY", Number.NaN],
    ["", "", 500],
  ])("rejects an unbound or unavailable spot (%s / %s / %s)", (current, observed, price) => {
    expect(identifiedOptionSpot(current, observed, price)).toBeNull();
  });

  it("cannot reuse either symbol's old spot across a round trip", () => {
    expect(identifiedOptionSpot("SPY", "TSLA", 250)).toBeNull();
    expect(identifiedOptionSpot("TSLA", "SPY", 500)).toBeNull();
  });
});
