import { describe, it, expect } from "vitest";
import { webullAdapter } from "./webullAdapter";

/**
 * Contract-compliance tests for the Webull stub adapter.
 *
 * These tests are the CANON REJECTION #3 (overclaim) guarantee for
 * this adapter: every method must return an honest not-implemented
 * signal. If any test starts to fabricate a positive value, the
 * canon has been violated and the adapter must revert.
 */

describe("webullAdapter — canon §12 stub honesty", () => {
  it("health() reports implemented=false and connected=false", () => {
    const h = webullAdapter.health();
    expect(h.implemented).toBe(false);
    expect(h.envConfigured).toBe(false);
    expect(h.connected).toBe(false);
    expect(h.note.toLowerCase()).toContain("not implemented");
  });

  it("capabilities() returns EMPTY arrays and false booleans (no fabrication)", async () => {
    const c = await webullAdapter.capabilities("any-account");
    expect(c.assetClasses.length).toBe(0);
    expect(c.orderTypes.length).toBe(0);
    expect(c.supportsPaper).toBe(false);
    expect(c.supportsLive).toBe(false);
    expect(c.supportsBracketOrders).toBe(false);
    expect(c.supportsShort).toBe(false);
    expect(c.notes.length).toBeGreaterThan(0);
  });

  it("listAccounts() returns empty array (honest — no adapter, no accounts)", async () => {
    const a = await webullAdapter.listAccounts();
    expect(a.length).toBe(0);
  });

  it("getAccount() throws NotImplementedError — never fabricates an account", async () => {
    await expect(webullAdapter.getAccount("acct-1")).rejects.toThrow(/not implemented/i);
  });

  it("submitOrder() returns status='rejected' with truthful reason — never fake-accepts", async () => {
    const ack = await webullAdapter.submitOrder({
      clientOrderId: "wm-abc-123",
      accountId: "acct-1",
      symbol: "TSLA",
      side: "buy",
      type: "market",
      qty: 1,
    });
    expect(ack.status).toBe("rejected");
    expect(ack.brokerOrderId).toBeNull();
    expect(ack.clientOrderId).toBe("wm-abc-123");
    expect(ack.reason?.toLowerCase()).toContain("not implemented");
    // Timestamp must parse to itself round-trip.
    expect(new Date(ack.acknowledgedAt).toISOString()).toBe(ack.acknowledgedAt);
  });

  it("cancelOrder() echoes clientOrderId and reports status='unknown' truthfully", async () => {
    const ack = await webullAdapter.cancelOrder("wm-xyz-456");
    expect(ack.clientOrderId).toBe("wm-xyz-456");
    expect(ack.status).toBe("unknown");
    expect(ack.reason?.toLowerCase()).toContain("not implemented");
  });

  it("id is 'webull' (canonical BrokerId)", () => {
    expect(webullAdapter.id).toBe("webull");
  });
});
