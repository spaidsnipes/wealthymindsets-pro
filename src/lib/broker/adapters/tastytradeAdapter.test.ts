import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tastytradeAdapter } from "./tastytradeAdapter";

const ENV_NAMES = ["TASTYTRADE_CLIENT_ID", "TASTYTRADE_CLIENT_SECRET", "TASTYTRADE_REFRESH_TOKEN"];

describe("tastytradeAdapter — canon §12 wrapper honesty", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of ENV_NAMES) saved[k] = process.env[k];
    for (const k of ENV_NAMES) delete process.env[k];
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("id is 'tastytrade'", () => {
    expect(tastytradeAdapter.id).toBe("tastytrade");
  });

  it("health() implemented=true (routes exist)", () => {
    expect(tastytradeAdapter.health().implemented).toBe(true);
  });

  it("health() envConfigured requires ALL 3 env names", () => {
    process.env.TASTYTRADE_CLIENT_ID = "x";
    process.env.TASTYTRADE_CLIENT_SECRET = "y";
    expect(tastytradeAdapter.health().envConfigured).toBe(false); // missing refresh
    process.env.TASTYTRADE_REFRESH_TOKEN = "z";
    expect(tastytradeAdapter.health().envConfigured).toBe(true);
  });

  it("capabilities() returns empty asset/order arrays + honest notes", async () => {
    process.env.TASTYTRADE_CLIENT_ID = "x";
    process.env.TASTYTRADE_CLIENT_SECRET = "y";
    process.env.TASTYTRADE_REFRESH_TOKEN = "z";
    const c = await tastytradeAdapter.capabilities("acct-1");
    expect(c.assetClasses.length).toBe(0);
    expect(c.orderTypes.length).toBe(0);
    expect(c.supportsLive).toBe(true);
    expect(c.notes.length).toBeGreaterThan(0);
  });

  it("listAccounts returns empty (not wrapped yet)", async () => {
    expect((await tastytradeAdapter.listAccounts()).length).toBe(0);
  });

  it("getAccount throws NotYetWrappedError", async () => {
    await expect(tastytradeAdapter.getAccount("acct-1")).rejects.toThrow(/not yet wrapped/i);
  });

  it("submitOrder returns rejected + truthful reason", async () => {
    const ack = await tastytradeAdapter.submitOrder({
      clientOrderId: "wm-tt-1",
      accountId: "acct-1",
      symbol: "AAPL",
      side: "buy",
      type: "market",
      qty: 1,
    });
    expect(ack.status).toBe("rejected");
    expect(ack.clientOrderId).toBe("wm-tt-1");
    expect(ack.brokerOrderId).toBeNull();
  });

  it("cancelOrder returns unknown + truthful reason", async () => {
    const ack = await tastytradeAdapter.cancelOrder("wm-tt-1");
    expect(ack.status).toBe("unknown");
    expect(ack.clientOrderId).toBe("wm-tt-1");
  });

  // A status line must describe what we MEASURED, not what we guessed. Naming
  // all three vars on every failure sends an operator who supplied two of them
  // back to re-check work he already did — the Webull three-month failure in
  // miniature (docs/operations/EVIDENCE_2026-09-20_WEBULL_ENTITLEMENT_ISOLATED.md).
  describe("health() note names only the vars actually absent", () => {
    it("names the single missing var and NOT the two that are present", () => {
      process.env.TASTYTRADE_CLIENT_ID = "x";
      process.env.TASTYTRADE_CLIENT_SECRET = "y";
      // refresh token deliberately absent — this is the real production state
      // measured on 2026-09-21.
      const note = tastytradeAdapter.health().note;
      expect(note).toContain("TASTYTRADE_REFRESH_TOKEN");
      expect(note).not.toContain("TASTYTRADE_CLIENT_ID");
      expect(note).not.toContain("TASTYTRADE_CLIENT_SECRET");
      expect(note).toContain("is absent");
    });

    it("names every missing var when more than one is absent", () => {
      process.env.TASTYTRADE_CLIENT_ID = "x";
      const note = tastytradeAdapter.health().note;
      expect(note).toContain("TASTYTRADE_CLIENT_SECRET");
      expect(note).toContain("TASTYTRADE_REFRESH_TOKEN");
      expect(note).not.toContain("TASTYTRADE_CLIENT_ID");
      expect(note).toContain("are absent");
    });

    it("names NO var when all are present", () => {
      // Guards the guard. A note that always listed every name would satisfy
      // the 'names every missing var' case above while being just as useless.
      process.env.TASTYTRADE_CLIENT_ID = "x";
      process.env.TASTYTRADE_CLIENT_SECRET = "y";
      process.env.TASTYTRADE_REFRESH_TOKEN = "z";
      const note = tastytradeAdapter.health().note;
      for (const name of ENV_NAMES) expect(note).not.toContain(name);
      expect(note).not.toContain("absent");
    });
  });

  it("never leaks env values in health notes", () => {
    process.env.TASTYTRADE_CLIENT_SECRET = "very-secret-value-abc";
    process.env.TASTYTRADE_REFRESH_TOKEN = "very-secret-refresh-xyz";
    const s = JSON.stringify(tastytradeAdapter.health());
    expect(s).not.toContain("very-secret-value-abc");
    expect(s).not.toContain("very-secret-refresh-xyz");
  });
});
