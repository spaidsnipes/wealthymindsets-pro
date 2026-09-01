import { describe, expect, it } from "vitest";
import { hasAlpacaLiveCredentials, resolveAlpacaLiveCredentials } from "./alpacaCredentials";

describe("Alpaca live credential resolution", () => {
  it("prefers the canonical complete pair", () => {
    expect(resolveAlpacaLiveCredentials({
      ALPACA_KEY: " canonical-key ",
      ALPACA_SECRET: " canonical-secret ",
      ALPACA_BROKERAGE_KEY: "legacy-key",
      ALPACA_BROKERAGE_KEY_SECRET_: "legacy-secret",
    })).toEqual({ key: "canonical-key", secret: "canonical-secret", source: "canonical" });
  });

  it("accepts the complete legacy Cloudflare pair", () => {
    expect(resolveAlpacaLiveCredentials({
      ALPACA_BROKERAGE_KEY: "legacy-key",
      ALPACA_BROKERAGE_KEY_SECRET_: "legacy-secret",
    })).toEqual({ key: "legacy-key", secret: "legacy-secret", source: "legacy" });
  });

  it("fails closed instead of mixing incomplete pairs", () => {
    const env = { ALPACA_KEY: "canonical-key", ALPACA_BROKERAGE_KEY_SECRET_: "legacy-secret" };
    expect(resolveAlpacaLiveCredentials(env)).toEqual({ key: "", secret: "", source: "missing" });
    expect(hasAlpacaLiveCredentials(env)).toBe(false);
  });
});
