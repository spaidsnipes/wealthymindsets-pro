import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../tastytrade", () => ({
  getTastytradeCapabilities: vi.fn(async () => ({ configured: true, connected: true, env: "production", accounts: 2 })),
  getTastytradeQuoteToken: vi.fn(async () => ({ token: "t", dxlinkUrl: "wss://x", level: "api" })),
  ttGet: vi.fn(async () => ({ data: { items: [{ symbol: "SPY" }] } })),
  getTastytradeAccounts: vi.fn(async () => [{ accountNumber: "A1" }, { accountNumber: "A2" }]),
  getTastytradePositions: vi.fn(async () => []),
}));

import { observedCertification } from "./observedCertification";

describe("tastytrade observed certification — the owner's truth only", () => {
  const prev = process.env.TASTYTRADE_OWNER_USER_ID;
  beforeEach(() => { process.env.TASTYTRADE_OWNER_USER_ID = "owner-1"; });
  afterEach(() => { process.env.TASTYTRADE_OWNER_USER_ID = prev; });

  it("reports the observed session to the owner", async () => {
    const o = await observedCertification("tastytrade", Date.parse("2026-10-03T20:30:00Z"), { userId: "owner-1" });
    expect(o?.connected).toBe(true);
    expect(o?.reports.map(r => `${r.stage}:${r.status}`)).toEqual([
      "auth:PASS", "account_discovery:PASS", "capabilities:PASS", "read_market_data:PASS", "read_account_state:PASS",
    ]);
  });

  it("observes nothing for anyone else (health() answer stands)", async () => {
    expect(await observedCertification("tastytrade", Date.now(), { userId: "someone-else" })).toBeNull();
    expect(await observedCertification("tastytrade", Date.now())).toBeNull();
  });
});
