/**
 * tastytradeAdapter — canonical BrokerAdapter wrapper for tastytrade.
 *
 * Founder canon §Broker Golden Path W2. tastytrade has an existing
 * server-side helper at src/lib/tastytrade.ts + 3 API routes:
 *   /api/broker/tastytrade/status
 *   /api/broker/tastytrade/accounts
 *   /api/broker/tastytrade/market-metrics
 *
 * This shim adopts the BrokerAdapter contract so downstream
 * consumers can depend on the interface. Actual account/order
 * lifecycle continues to live in the routes above until a future
 * migration atom moves it under this adapter.
 *
 * Scope of THIS adapter (shift-F):
 *   · health() — reports based on env NAMES present (never values)
 *   · other methods return honest not-yet-wrapped / empty results
 *
 * NEVER returns tokens/secrets. envConfigured checks NAME presence.
 */

import type {
  BrokerAdapter,
  BrokerCapabilities,
  BrokerHealth,
  CanonicalAccount,
  CanonicalOrderAck,
  UniversalOrderIntent,
} from "../BrokerAdapter";

function hasNonEmptyEnv(name: string): boolean {
  const v = process.env[name];
  return typeof v === "string" && v.length > 0;
}

class NotYetWrappedError extends Error {
  constructor(op: string) {
    super(`Tastytrade adapter is not yet wrapped for ${op}. Existing routes at /api/broker/tastytrade/* remain the current owner; wrapping is a future atom.`);
    this.name = "NotYetWrappedError";
  }
}

export const tastytradeAdapter: BrokerAdapter = {
  id: "tastytrade",

  health(): BrokerHealth {
    const clientId     = hasNonEmptyEnv("TASTYTRADE_CLIENT_ID");
    const clientSecret = hasNonEmptyEnv("TASTYTRADE_CLIENT_SECRET");
    const refreshTok   = hasNonEmptyEnv("TASTYTRADE_REFRESH_TOKEN");
    const allPresent = clientId && clientSecret && refreshTok;
    return {
      implemented: true, // src/lib/tastytrade.ts + 3 API routes
      envConfigured: allPresent,
      connected: false, // handshake happens per-request via existing routes
      note: allPresent
        ? "Tastytrade adapter is wrapped for health only. All env credentials present. Full auth handshake via /api/broker/tastytrade/status."
        : "Tastytrade adapter is wrapped for health only. Env credentials missing (needs CLIENT_ID + CLIENT_SECRET + REFRESH_TOKEN).",
    };
  },

  async capabilities(_accountId: string): Promise<BrokerCapabilities> {
    void _accountId;
    // Honest under-claim until account-aware discovery is wrapped.
    // Canon §W4: never hard-code account capabilities.
    return {
      assetClasses: [],
      orderTypes: [],
      supportsPaper: false,
      supportsLive: hasNonEmptyEnv("TASTYTRADE_CLIENT_ID") && hasNonEmptyEnv("TASTYTRADE_CLIENT_SECRET") && hasNonEmptyEnv("TASTYTRADE_REFRESH_TOKEN"),
      supportsBracketOrders: false,
      supportsShort: false,
      notes: [
        "Tastytrade capabilities not yet wrapped behind BrokerAdapter.",
        "Account-aware discovery lives at /api/broker/tastytrade/accounts until migration.",
      ],
    };
  },

  async listAccounts(): Promise<readonly CanonicalAccount[]> {
    return [];
  },

  async getAccount(accountId: string): Promise<CanonicalAccount> {
    throw new NotYetWrappedError(`getAccount(${accountId})`);
  },

  async submitOrder(intent: UniversalOrderIntent): Promise<CanonicalOrderAck> {
    return {
      clientOrderId: intent.clientOrderId,
      brokerOrderId: null,
      status: "rejected",
      reason: "Tastytrade order lifecycle is not yet wrapped behind BrokerAdapter.",
      acknowledgedAt: new Date().toISOString(),
    };
  },

  async cancelOrder(clientOrderId: string): Promise<CanonicalOrderAck> {
    return {
      clientOrderId,
      brokerOrderId: null,
      status: "unknown",
      reason: "Tastytrade cancel lifecycle is not yet wrapped behind BrokerAdapter.",
      acknowledgedAt: new Date().toISOString(),
    };
  },
};

export default tastytradeAdapter;
