/**
 * alpacaAdapter — canonical BrokerAdapter wrapper for Alpaca.
 *
 * Founder canon §Broker Golden Path W2. Alpaca is the most-wired
 * broker in the codebase (5 API routes + AlpacaTradingPanel + heavy
 * cross-component use). This shim adopts the BrokerAdapter contract
 * so downstream consumers can depend on the interface rather than
 * on any specific Alpaca route shape.
 *
 * Scope of THIS adapter (shift-F):
 *   · health() — honest report based on env NAMES present (never
 *     reads values into the return; never contacts upstream).
 *   · listAccounts / getAccount / submitOrder / cancelOrder — throw
 *     or return honest UNKNOWN. The existing routes at
 *     /api/broker/alpaca and /api/alpaca-trading remain the real
 *     path today; a future atom will migrate the actual capability
 *     discovery + order lifecycle behind this adapter.
 *
 * NEVER returns tokens/secrets. envConfigured checks presence of
 * env NAMES only.
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
    super(`Alpaca adapter is not yet wrapped for ${op}. Existing route paths at /api/broker/alpaca + /api/alpaca-trading remain the current owner; wrapping is a future atom.`);
    this.name = "NotYetWrappedError";
  }
}

export const alpacaAdapter: BrokerAdapter = {
  id: "alpaca",

  health(): BrokerHealth {
    const paper = hasNonEmptyEnv("ALPACA_PAPER_KEY") && hasNonEmptyEnv("ALPACA_PAPER_SECRET");
    const live  = hasNonEmptyEnv("ALPACA_KEY") && hasNonEmptyEnv("ALPACA_SECRET");
    const anyEnv = paper || live;
    return {
      implemented: true, // 5 API routes + AlpacaTradingPanel + heavy chart wiring
      envConfigured: anyEnv,
      connected: false, // handshake happens per-request via existing routes
      note: paper && live
        ? "Alpaca adapter is wrapped for health only. Paper AND live env credentials present. Order lifecycle still lives at /api/broker/alpaca + /api/alpaca-trading."
        : paper
          ? "Alpaca adapter is wrapped for health only. Paper env credentials present. Live env credentials absent."
          : live
            ? "Alpaca adapter is wrapped for health only. Live env credentials present. Paper env credentials absent."
            : "Alpaca adapter is wrapped for health only. Env credentials missing.",
    };
  },

  async capabilities(_accountId: string): Promise<BrokerCapabilities> {
    void _accountId;
    // Honest under-claim until account-aware discovery is wrapped.
    // Downstream should NOT hard-code capabilities from this stub —
    // per canon §W4 (ACCOUNT-AWARE CAPABILITY DISCOVERY).
    return {
      assetClasses: [],
      orderTypes: [],
      supportsPaper: hasNonEmptyEnv("ALPACA_PAPER_KEY") && hasNonEmptyEnv("ALPACA_PAPER_SECRET"),
      supportsLive: hasNonEmptyEnv("ALPACA_KEY") && hasNonEmptyEnv("ALPACA_SECRET"),
      supportsBracketOrders: false,
      supportsShort: false,
      notes: [
        "Alpaca capabilities not yet wrapped behind BrokerAdapter.",
        "Real account-aware discovery is a future atom; do not hard-code from this stub.",
      ],
    };
  },

  async listAccounts(): Promise<readonly CanonicalAccount[]> {
    // Empty is honest — this adapter has not been wrapped yet.
    // Consumers wanting real account data must call the existing
    // /api/broker/alpaca route until the migration atom lands.
    return [];
  },

  async getAccount(accountId: string): Promise<CanonicalAccount> {
    throw new NotYetWrappedError(`getAccount(${accountId})`);
  },

  async submitOrder(intent: UniversalOrderIntent): Promise<CanonicalOrderAck> {
    // Never fabricate an ack. Reject with a truthful reason so the
    // Journal / Decision Receipt writer can record the attempt.
    return {
      clientOrderId: intent.clientOrderId,
      brokerOrderId: null,
      status: "rejected",
      reason: "Alpaca order lifecycle is not yet wrapped behind BrokerAdapter. Use /api/broker/alpaca or /api/alpaca-trading until the migration atom lands.",
      acknowledgedAt: new Date().toISOString(),
    };
  },

  async cancelOrder(clientOrderId: string): Promise<CanonicalOrderAck> {
    return {
      clientOrderId,
      brokerOrderId: null,
      status: "unknown",
      reason: "Alpaca cancel lifecycle is not yet wrapped behind BrokerAdapter.",
      acknowledgedAt: new Date().toISOString(),
    };
  },
};

export default alpacaAdapter;
