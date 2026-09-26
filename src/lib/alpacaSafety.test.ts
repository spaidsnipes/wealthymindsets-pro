import { describe, expect, it } from "vitest";
import {
  ALPACA_EXECUTION_MODE,
  ALPACA_PAPER_BASE,
  liveAlpacaDisabledResponse,
  isAlpacaOrderId,
  isAuthorizedAlpacaOwner,
  rejectsLiveAlpacaRequest,
} from "./alpacaSafety";

describe("Alpaca capital-safety boundary", () => {
  it("has no live endpoint or live execution mode", () => {
    expect(ALPACA_EXECUTION_MODE).toBe("PAPER_ONLY");
    expect(ALPACA_PAPER_BASE).toBe("https://paper-api.alpaca.markets");
  });

  it("rejects every caller-controlled live promotion", () => {
    expect(rejectsLiveAlpacaRequest({ paper: false })).toBe(true);
    expect(rejectsLiveAlpacaRequest({ confirm_live: true })).toBe(true);
    expect(rejectsLiveAlpacaRequest({ environment: "LIVE" })).toBe(true);
    expect(rejectsLiveAlpacaRequest({ paper: true })).toBe(false);
    expect(rejectsLiveAlpacaRequest({})).toBe(false);
  });

  it("returns an explicit fail-closed state", () => {
    expect(liveAlpacaDisabledResponse()).toMatchObject({
      code: "LIVE_EXECUTION_DISABLED",
      environment: "PAPER_ONLY",
    });
  });

  it("denies shared account access unless the authenticated owner is configured", () => {
    expect(isAuthorizedAlpacaOwner("user-a", undefined)).toBe(false);
    expect(isAuthorizedAlpacaOwner("user-a", "user-b")).toBe(false);
    expect(isAuthorizedAlpacaOwner("user-a", "user-a")).toBe(true);
  });

  it("an order id is a UUID and nothing else — no path can ride in on it (2026-09-26)", () => {
    expect(isAlpacaOrderId("61e69015-8549-4bfd-b9c3-01e75843f47d")).toBe(true);
    expect(isAlpacaOrderId("61E69015-8549-4BFD-B9C3-01E75843F47D")).toBe(true);
    for (const bad of [
      "", "../positions", "%2e%2e/positions", "..\\positions", "..%2Fpositions",
      "61e69015-8549-4bfd-b9c3-01e75843f47d/../../positions",
      "../61e69015-8549-4bfd-b9c3-01e75843f47d",
      "61e69015-8549-4bfd-b9c3-01e75843f47d?x=1",
      "61e69015-8549-4bfd-b9c3-01e75843f47d#",
      " 61e69015-8549-4bfd-b9c3-01e75843f47d",
      "61e69015-8549-4bfd-b9c3-01e75843f47d\n",
      "61e6901585494bfdb9c301e75843f47d",
      "61e69015-8549-4bfd-b9c3-01e75843f47g",
      "positions",
    ]) {
      expect(isAlpacaOrderId(bad), JSON.stringify(bad)).toBe(false);
    }
    expect(isAlpacaOrderId(undefined)).toBe(false);
    expect(isAlpacaOrderId(null)).toBe(false);
    expect(isAlpacaOrderId(42)).toBe(false);
  });
});
