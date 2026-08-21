import { describe, it, expect } from "vitest";
import type {
  BrokerAdapter,
  BrokerId,
  BrokerCapabilities,
  BrokerHealth,
  CanonicalAccount,
  CanonicalOrderAck,
  UniversalOrderIntent,
} from "./BrokerAdapter";

/**
 * These tests are TYPE-ONLY assertions — they compile a minimal
 * conforming adapter and prove the interface is stable + honest.
 * Runtime tests belong in each concrete adapter's own test file.
 *
 * If any of these tests fail to type-check, the contract has drifted
 * in a breaking way; downstream adapters must migrate.
 */

class NoopAdapter implements BrokerAdapter {
  readonly id: BrokerId = "webull";
  health(): BrokerHealth {
    return { implemented: false, envConfigured: false, connected: false, note: "test-only stub" };
  }
  async capabilities(_accountId: string): Promise<BrokerCapabilities> {
    void _accountId;
    return {
      assetClasses: ["equity"],
      orderTypes: ["market", "limit"],
      supportsPaper: true,
      supportsLive: false,
      supportsBracketOrders: false,
      supportsShort: false,
      notes: [],
    };
  }
  async listAccounts(): Promise<readonly CanonicalAccount[]> { return []; }
  async getAccount(_id: string): Promise<CanonicalAccount> {
    throw new Error("unknown account");
  }
  async submitOrder(intent: UniversalOrderIntent): Promise<CanonicalOrderAck> {
    return {
      clientOrderId: intent.clientOrderId,
      brokerOrderId: null,
      status: "pending",
      acknowledgedAt: new Date(0).toISOString(),
    };
  }
  async cancelOrder(clientOrderId: string): Promise<CanonicalOrderAck> {
    return {
      clientOrderId,
      brokerOrderId: null,
      status: "unknown",
      reason: "test-only stub",
      acknowledgedAt: new Date(0).toISOString(),
    };
  }
}

describe("BrokerAdapter contract — canon §Broker Golden Path", () => {
  const a: BrokerAdapter = new NoopAdapter();

  it("id is one of the canonical BrokerId union", () => {
    const valid: BrokerId[] = ["webull", "tastytrade", "alpaca", "oanda", "tradestation", "tradier", "ibkr"];
    expect(valid).toContain(a.id);
  });

  it("health() returns booleans + note without secret values", () => {
    const h = a.health();
    expect(typeof h.implemented).toBe("boolean");
    expect(typeof h.envConfigured).toBe("boolean");
    expect(typeof h.connected).toBe("boolean");
    expect(typeof h.note).toBe("string");
  });

  it("capabilities() surfaces asset/order-type/env booleans", async () => {
    const c = await a.capabilities("acct-1");
    expect(Array.isArray(c.assetClasses)).toBe(true);
    expect(Array.isArray(c.orderTypes)).toBe(true);
    expect(typeof c.supportsPaper).toBe("boolean");
    expect(typeof c.supportsLive).toBe("boolean");
  });

  it("submitOrder returns an ack echoing clientOrderId for idempotency", async () => {
    const intent: UniversalOrderIntent = {
      clientOrderId: "wm-test-12345",
      accountId: "acct-1",
      symbol: "TSLA",
      side: "buy",
      type: "market",
      qty: 1,
    };
    const ack = await a.submitOrder(intent);
    expect(ack.clientOrderId).toBe(intent.clientOrderId);
    expect(["pending", "accepted", "rejected", "unknown"]).toContain(ack.status);
    expect(new Date(ack.acknowledgedAt).toISOString()).toBe(ack.acknowledgedAt);
  });

  it("cancelOrder is addressable by clientOrderId (idempotency key)", async () => {
    const ack = await a.cancelOrder("wm-test-12345");
    expect(ack.clientOrderId).toBe("wm-test-12345");
  });

  it("listAccounts returns a readonly array (empty is not a failure)", async () => {
    const accts = await a.listAccounts();
    expect(Array.isArray(accts)).toBe(true);
  });
});
