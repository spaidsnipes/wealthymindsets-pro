import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { alpacaAdapter } from "./alpacaAdapter";

const ENV_NAMES = ["ALPACA_KEY", "ALPACA_SECRET", "ALPACA_PAPER_KEY", "ALPACA_PAPER_SECRET"];

describe("alpacaAdapter — canon §12 wrapper honesty", () => {
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

  it("id is 'alpaca'", () => {
    expect(alpacaAdapter.id).toBe("alpaca");
  });

  it("health() reports implemented=true regardless of env (routes exist in this build)", () => {
    const h = alpacaAdapter.health();
    expect(h.implemented).toBe(true);
    expect(h.connected).toBe(false);
  });

  it("health() envConfigured is false when NO alpaca env names present", () => {
    expect(alpacaAdapter.health().envConfigured).toBe(false);
  });

  it("health() envConfigured is true when paper-only env present", () => {
    process.env.ALPACA_PAPER_KEY = "x";
    process.env.ALPACA_PAPER_SECRET = "y";
    const h = alpacaAdapter.health();
    expect(h.envConfigured).toBe(true);
    expect(h.note).toContain("Paper");
  });

  it("health() envConfigured is true when live-only env present", () => {
    process.env.ALPACA_KEY = "x";
    process.env.ALPACA_SECRET = "y";
    const h = alpacaAdapter.health();
    expect(h.envConfigured).toBe(true);
    expect(h.note).toContain("Live");
  });

  it("capabilities() returns empty asset/order arrays (never fabricates account-aware caps)", async () => {
    process.env.ALPACA_PAPER_KEY = "x";
    process.env.ALPACA_PAPER_SECRET = "y";
    const c = await alpacaAdapter.capabilities("acct-1");
    expect(c.assetClasses.length).toBe(0);
    expect(c.orderTypes.length).toBe(0);
    expect(c.supportsPaper).toBe(true);
    expect(c.supportsLive).toBe(false);
    expect(c.notes.length).toBeGreaterThan(0);
  });

  it("listAccounts returns empty (adapter not yet wrapped)", async () => {
    const a = await alpacaAdapter.listAccounts();
    expect(a.length).toBe(0);
  });

  it("getAccount throws NotYetWrappedError", async () => {
    await expect(alpacaAdapter.getAccount("acct-1")).rejects.toThrow(/not yet wrapped/i);
  });

  it("submitOrder returns rejected + truthful reason — never fake-accepts", async () => {
    const ack = await alpacaAdapter.submitOrder({
      clientOrderId: "wm-alp-1",
      accountId: "acct-1",
      symbol: "TSLA",
      side: "buy",
      type: "market",
      qty: 1,
    });
    expect(ack.status).toBe("rejected");
    expect(ack.brokerOrderId).toBeNull();
    expect(ack.clientOrderId).toBe("wm-alp-1");
    expect(ack.reason?.toLowerCase()).toContain("not yet wrapped");
  });

  it("cancelOrder returns status='unknown' with truthful reason", async () => {
    const ack = await alpacaAdapter.cancelOrder("wm-alp-1");
    expect(ack.status).toBe("unknown");
    expect(ack.clientOrderId).toBe("wm-alp-1");
  });

  it("never leaks env values in health notes", () => {
    process.env.ALPACA_PAPER_KEY = "very-secret-key-abc";
    process.env.ALPACA_PAPER_SECRET = "very-secret-value-xyz";
    const h = alpacaAdapter.health();
    const s = JSON.stringify(h);
    expect(s).not.toContain("very-secret-key-abc");
    expect(s).not.toContain("very-secret-value-xyz");
  });
});
