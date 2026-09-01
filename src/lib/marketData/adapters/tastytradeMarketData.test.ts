import { describe, expect, it } from "vitest";
import { certifyTastytradeMarketData } from "./tastytradeMarketData";

describe("Tastytrade canonical market-data certification", () => {
  it.each([
    { configured: false, connected: false, quotes: false, realTime: null },
    { configured: true, connected: false, quotes: false, realTime: null },
    { configured: true, connected: true, quotes: false, realTime: null },
    { configured: true, connected: true, quotes: true, realTime: null },
  ])("never promotes config, auth, or quote-token presence into a market event", (observation) => {
    const cert = certifyTastytradeMarketData(observation);
    expect(cert.source).toBe("tastytrade");
    expect(cert.rows.every((row) => row.status === "NOT_IMPLEMENTED")).toBe(true);
    expect(cert.certifiedCount).toBe(0);
    expect(cert.cvd).toBe("UNAVAILABLE");
    expect(JSON.stringify(cert)).not.toMatch(/BLOCKED_ENTITLEMENT|DELAYED_BY_ENTITLEMENT/);
  });
});
