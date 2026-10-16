import { describe, expect, it } from "vitest";
import { spotLegsFor, spotRouteFor, spotRouteNotice } from "./spotFuturesRoute";

describe("L14 · spot forex and metals open their CME future", () => {
  it("routes pairs quoted the same way as their future", () => {
    expect(spotRouteFor("XAUUSD")?.future).toBe("GC1!");
    expect(spotRouteFor("eur/usd")?.future).toBe("6E1!");
    expect(spotRouteFor("XAGUSD")?.future).toBe("SI1!");
  });
  it("never routes an inverse pair or a cross (it would chart upside down / has no single future)", () => {
    expect(spotRouteFor("USDJPY")).toBeNull();
    expect(spotRouteFor("GBPJPY")).toBeNull();
    expect(spotRouteFor("NQ1!")).toBeNull();
    expect(spotRouteFor("TSLA")).toBeNull();
  });
  it("names the legs of an unrouted pair", () => {
    expect(spotLegsFor("GBPJPY")).toEqual(["6B1!", "6J1!"]);
    expect(spotLegsFor("USDJPY")).toEqual(["6J1!"]);
    expect(spotLegsFor("EURUSD")).toBeNull();
  });
  it("says what happened in one line", () => {
    expect(spotRouteNotice("XAUUSD", spotRouteFor("XAUUSD")!)).toBe("XAUUSD has no live spot source here — showing GC1!, the COMEX gold future (its own price and session).");
  });
});
