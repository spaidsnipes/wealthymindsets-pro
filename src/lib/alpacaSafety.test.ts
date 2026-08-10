import { describe, expect, it } from "vitest";
import {
  ALPACA_EXECUTION_MODE,
  ALPACA_PAPER_BASE,
  liveAlpacaDisabledResponse,
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
});
