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

describe("webullAdapter — canon §12 staged implementation honesty", () => {
  it("health() reports the account probe implemented but never fabricates a connection", () => {
    const h = webullAdapter.health();
    expect(h.implemented).toBe(true);
    expect(h.connected).toBe(false);
    expect(h.note.toLowerCase()).toContain("order");
  });

  it("capabilities() reports the OBSERVED Webull asset/order shape (post 2026-08-21 MCP verification)", async () => {
    // Founder canon §Capability Honesty — OBSERVED tier. Every value
    // below was pulled live from the Webull OpenAPI MCP in a Claude
    // session on 2026-08-21 (see docs/operations/EVIDENCE_2026-08-21_
    // WEBULL_MCP_VERIFIED.md). Under-claims about paper/bracket where
    // read-only probes could not confirm.
    const c = await webullAdapter.capabilities("QMI6Q1D50CL66VD1S479DQOS5B");
    expect(c.assetClasses).toEqual(expect.arrayContaining(["equity", "option", "future", "crypto"]));
    expect(c.orderTypes).toEqual(expect.arrayContaining(["market", "limit", "stop", "stop-limit"]));
    expect(c.supportsPaper).toBe(false);   // no separate paper account observed
    expect(c.supportsLive).toBe(true);     // MARGIN + EVENTS_CASH confirmed
    expect(c.supportsBracketOrders).toBe(false); // under-claim until observed via write-path
    expect(c.supportsShort).toBe(true);    // margin account supports shorting
    expect(c.notes.length).toBeGreaterThan(0);
    expect(c.notes.some(n => n.toLowerCase().includes("mcp"))).toBe(true);
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
