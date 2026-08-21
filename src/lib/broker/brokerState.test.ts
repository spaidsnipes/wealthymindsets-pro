import { describe, it, expect } from "vitest";
import {
  composeBrokerState,
  buildBrokerEntry,
  type BrokerStateEntry,
} from "./brokerState";
import type { BrokerAdapter, CanonicalAccount } from "./BrokerAdapter";

const NOW = "2026-08-21T00:00:00.000Z";

function account(over: Partial<CanonicalAccount> = {}): CanonicalAccount {
  return {
    accountId: "A1",
    displayName: "Paper",
    currency: "USD",
    cash: 1000,
    equity: 2500,
    buyingPower: 5000,
    env: "paper",
    ...over,
  };
}

function entry(over: Partial<BrokerStateEntry> = {}): BrokerStateEntry {
  return { id: "alpaca", implemented: true, connected: false, accounts: [], note: "n", ...over };
}

describe("composeBrokerState — pure aggregate", () => {
  it("honest zero state when no accounts (never fabricates a portfolio)", () => {
    const s = composeBrokerState([entry(), entry({ id: "webull" })], NOW);
    expect(s.totalAccounts).toBe(0);
    expect(s.totalEquity).toBe(0);
    expect(s.connectedCount).toBe(0);
    expect(s.brokers).toHaveLength(2);
    expect(s.generatedAt).toBe(NOW);
  });

  it("sums accounts + equity and counts connected brokers", () => {
    const s = composeBrokerState(
      [
        entry({ id: "alpaca", connected: true, accounts: [account({ equity: 2500 }), account({ accountId: "A2", equity: 1500 })] }),
        entry({ id: "tastytrade", connected: true, accounts: [account({ accountId: "T1", equity: 4000 })] }),
        entry({ id: "webull", connected: false, accounts: [] }),
      ],
      NOW,
    );
    expect(s.totalAccounts).toBe(3);
    expect(s.totalEquity).toBe(8000);
    expect(s.connectedCount).toBe(2);
  });

  it("ignores non-finite equity without corrupting the total", () => {
    const s = composeBrokerState(
      [entry({ connected: true, accounts: [account({ equity: 1000 }), account({ accountId: "A2", equity: Number.NaN })] })],
      NOW,
    );
    expect(s.totalEquity).toBe(1000);
    expect(s.totalAccounts).toBe(2); // both accounts still counted
  });

  it("rounds total equity to 2 decimals", () => {
    const s = composeBrokerState(
      [entry({ connected: true, accounts: [account({ equity: 10.005 }), account({ accountId: "A2", equity: 20.001 })] })],
      NOW,
    );
    expect(s.totalEquity).toBe(30.01);
  });
});

describe("buildBrokerEntry — honest translation", () => {
  function adapter(over: Partial<BrokerAdapter> & Pick<BrokerAdapter, "id">): BrokerAdapter {
    const base: BrokerAdapter = {
      id: over.id,
      health: () => ({ implemented: true, envConfigured: true, connected: false, note: "ok" }),
      capabilities: async () => ({ assetClasses: [], orderTypes: [], supportsPaper: false, supportsLive: false, supportsBracketOrders: false, supportsShort: false, notes: [] }),
      listAccounts: async () => [],
      getAccount: async () => { throw new Error("nope"); },
      submitOrder: async (i) => ({ clientOrderId: i.clientOrderId, brokerOrderId: null, status: "rejected", acknowledgedAt: NOW }),
      cancelOrder: async (id) => ({ clientOrderId: id, brokerOrderId: null, status: "unknown", acknowledgedAt: NOW }),
    };
    return { ...base, ...over };
  }

  it("env not configured → not connected, empty accounts, no listAccounts call", async () => {
    let called = false;
    const a = adapter({
      id: "webull",
      health: () => ({ implemented: true, envConfigured: false, connected: false, note: "no env" }),
      listAccounts: async () => { called = true; return []; },
    });
    const e = await buildBrokerEntry(a);
    expect(e.connected).toBe(false);
    expect(e.accounts).toEqual([]);
    expect(called).toBe(false); // never queried upstream when env absent
  });

  it("configured + accounts returned → connected true", async () => {
    const a = adapter({ id: "alpaca", listAccounts: async () => [account()] });
    const e = await buildBrokerEntry(a);
    expect(e.connected).toBe(true);
    expect(e.accounts).toHaveLength(1);
  });

  it("configured + zero accounts → connected false + honest note", async () => {
    const a = adapter({ id: "alpaca" });
    const e = await buildBrokerEntry(a);
    expect(e.connected).toBe(false);
    expect(e.note).toMatch(/no accounts returned/i);
  });

  it("listAccounts throw → honest failure entry, never throws out", async () => {
    const a = adapter({ id: "tastytrade", listAccounts: async () => { throw new Error("401 auth"); } });
    const e = await buildBrokerEntry(a);
    expect(e.connected).toBe(false);
    expect(e.accounts).toEqual([]);
    expect(e.note).toMatch(/account read failed.*401 auth/i);
  });
});
