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

  it.each(["acct-1", "acct-2", ""])("capabilities(%s) cannot certify execution from historical connector evidence", async (accountId) => {
    await expect(webullAdapter.capabilities(accountId)).rejects.toThrow(
      /verify account-specific execution capabilities/,
    );
  });

  it("listAccounts() reports unknown rather than a falsely verified empty account list", async () => {
    await expect(webullAdapter.listAccounts()).rejects.toThrow(
      /list canonical account snapshots/,
    );
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
