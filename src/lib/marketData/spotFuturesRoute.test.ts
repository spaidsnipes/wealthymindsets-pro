import { describe, expect, it } from "vitest";
import { spotLegsFor, spotRouteFor, spotRouteNotice } from "./spotFuturesRoute";

describe("L14 · spot forex and metals open their CME future", () => {
  it("routes pairs quoted the same way as their future", () => {
    expect(spotRouteFor("XAUUSD")?.future).toBe("GC1!");
    expect(spotRouteFor("eur/usd")?.future).toBe("6E1!");
    expect(spotRouteFor("XAGUSD")?.future).toBe("SI1!");
  });
  // 2026-10-18 (Founder: every forex pair must be seeable): an inverse pair now routes to its CME future AND says it is
  // quoted the other way; a cross with no single CME future (GBPJPY) still never routes.
  it("routes an inverse pair with its inversion said, never a cross with no single future", () => {
    expect(spotRouteFor("USDJPY")).toEqual({ future: "6J1!", name: "CME Japanese yen future", inverse: true });
    expect(spotRouteNotice("USDJPY", spotRouteFor("USDJPY")!)).toContain("quoted the other way (USD per JPY): when 6J1! rises, USDJPY falls.");
    expect(spotRouteFor("EURGBP")?.future).toBe("RP1!"); // feed-only contract built directly (2026-10-18)
    expect(spotRouteFor("USDCAD")?.future).toBe("6C1!");
    expect(spotRouteFor("GBPJPY")).toBeNull();
    expect(spotRouteFor("NQ1!")).toBeNull();
    expect(spotRouteFor("TSLA")).toBeNull();
  });
  it("names the legs of an unrouted pair", () => {
    expect(spotLegsFor("GBPJPY")).toEqual(["6B1!", "6J1!"]);
    expect(spotLegsFor("USDJPY")).toBeNull(); // routed now
    expect(spotLegsFor("GBPCHF")).toEqual(["6B1!", "6S1!"]);
    expect(spotLegsFor("EURUSD")).toBeNull();
  });
  it("says what happened in one line", () => {
    expect(spotRouteNotice("XAUUSD", spotRouteFor("XAUUSD")!)).toBe("XAUUSD has no live spot source here — showing GC1!, the COMEX gold future (its own price and session).");
  });
});
