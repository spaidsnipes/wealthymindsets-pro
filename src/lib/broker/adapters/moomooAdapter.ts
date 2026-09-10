/**
 * moomooAdapter — BrokerAdapter for moomoo / Futu (OpenD gateway).
 *
 * Founder canon §Broker Golden Path W2: "New provider = new adapter, never a
 * new UI/domain path." moomoo is added here as a first-class adapter.
 *
 * TOPOLOGY (why this adapter calls a bridge, not moomoo directly)
 * ----------------------------------------------------------------
 * moomoo's API is a local socket protocol served by the OpenD gateway
 * (127.0.0.1:11111). OpenD holds the authenticated session and the trade-unlock
 * secret; it cannot run on Cloudflare Workers (no long-lived sockets, no login).
 * So this adapter speaks HTTPS to `services/moomoo-bridge`, a single long-running
 * process on a host that CAN run OpenD. The Worker never touches OpenD or any
 * moomoo credential.
 *
 *     this adapter ──HTTPS(Bearer)──▶ moomoo-bridge ──socket──▶ OpenD ──▶ moomoo
 *
 * ENV (all optional; absence is reported honestly, never faked)
 *   MOOMOO_BRIDGE_URL    e.g. https://bridge.example.ts.net   (no trailing slash)
 *   MOOMOO_BRIDGE_TOKEN  shared bearer secret for the bridge
 *
 * HONESTY RULES (same as webullAdapter)
 *   · health() never calls upstream and never returns secrets.
 *   · Order-lifecycle methods return truthful rejected/unknown — the v1 bridge is
 *     read-only by design (no order placement over HTTP), so we do NOT fabricate
 *     an ack. Wiring the trade path is a later atom.
 */

import type {
  BrokerAdapter,
  BrokerCapabilities,
  BrokerHealth,
  CanonicalAccount,
  CanonicalOrderAck,
  UniversalOrderIntent,
} from "../BrokerAdapter";

const BRIDGE_URL = (process.env.MOOMOO_BRIDGE_URL ?? "").replace(/\/+$/, "");
const BRIDGE_TOKEN = process.env.MOOMOO_BRIDGE_TOKEN ?? "";

class NotWiredError extends Error {
  constructor(op: string) {
    super(
      `moomoo order path is not wired — cannot ${op}. The v1 moomoo-bridge is ` +
      `read-only (quotes only) by design; order execution is a future atom.`,
    );
    this.name = "NotWiredError";
  }
}

export const moomooAdapter: BrokerAdapter = {
  id: "moomoo",

  health(): BrokerHealth {
    const envConfigured = BRIDGE_URL.length > 0 && BRIDGE_TOKEN.length > 0;
    return {
      implemented: true,
      envConfigured,
      // health() must not call upstream, so we cannot assert a live socket here.
      // "connected" stays false until an async probe (via /api/broker/moomoo/status)
      // confirms the bridge + OpenD are reachable. Never claim a connection we
      // have not observed this request.
      connected: false,
      note: envConfigured
        ? "moomoo adapter shipped; bridge env present. Live reachability is confirmed " +
          "asynchronously against the moomoo-bridge /health route (OpenD must be running + logged in)."
        : "moomoo adapter shipped, but MOOMOO_BRIDGE_URL / MOOMOO_BRIDGE_TOKEN are not set. " +
          "The read path is UNAVAILABLE until the bridge is deployed on a host running OpenD " +
          "(see services/moomoo-bridge/README.md). No fabricated quotes.",
    };
  },

  async capabilities(_accountId: string): Promise<BrokerCapabilities> {
    void _accountId;
    // Canon §W4 (ACCOUNT-AWARE CAPABILITY DISCOVERY) + the BrokerAdapter
    // docstring: "Must return account-aware results — never hard-code
    // assumptions the broker can answer."
    //
    // This previously returned moomoo's DOCUMENTED PRODUCT SURFACE — a populated
    // orderTypes array plus supportsLive/supportsShort true. That is marketing
    // truth, not account truth, and the two can disagree outright: a broker can
    // authorize a given API client as read-only/Non-Trading on every account it
    // owns, at which case "this account can place a stop order" is simply false.
    // `supportedPurposes()` in src/lib/orderPurpose.ts builds its entire order
    // menu by filtering on orderTypes, so a populated array here is the exact
    // input that would render an order primitive the account cannot execute.
    //
    // The v1 bridge is read-only and exposes no account route, so no
    // account-aware answer exists to give. Under-claim until it does. The
    // product surface stays in notes/, where it is documentation and cannot be
    // mistaken for a per-account grant.
    return {
      assetClasses: [],
      orderTypes: [],
      supportsPaper: false,
      supportsLive: false,
      supportsBracketOrders: false,
      supportsShort: false,
      notes: [
        "moomoo reaches the app through services/moomoo-bridge → OpenD (127.0.0.1:11111); OpenD cannot run on Cloudflare Workers.",
        "v1 bridge is read-only (quotes) and exposes no account route, so per-account capability discovery has never run. Empty = UNKNOWN, not 'moomoo supports nothing'.",
        "Documented product surface (NOT an account grant): US/HK/CN/JP equity, options, futures, FX; market/limit/stop/stop-limit; TrdEnv.SIMULATE paper and TrdEnv.REAL live. Do not hard-code from this line — the broker must answer per account.",
        "A broker can authorize an API client as Non-Trading on an account whose product tier supports orders. Only account-aware discovery can tell those apart.",
      ],
    };
  },

  async listAccounts(): Promise<readonly CanonicalAccount[]> {
    // Honest empty: the read-only v1 bridge exposes no account route yet.
    return [];
  },

  async getAccount(accountId: string): Promise<CanonicalAccount> {
    throw new NotWiredError(`fetch account ${accountId}`);
  },

  async submitOrder(intent: UniversalOrderIntent): Promise<CanonicalOrderAck> {
    return {
      clientOrderId: intent.clientOrderId,
      brokerOrderId: null,
      status: "rejected",
      reason: "moomoo order path is not wired — v1 bridge is read-only. Order not submitted.",
      acknowledgedAt: new Date().toISOString(),
    };
  },

  async cancelOrder(clientOrderId: string): Promise<CanonicalOrderAck> {
    return {
      clientOrderId,
      brokerOrderId: null,
      status: "unknown",
      reason: "moomoo order path is not wired — v1 bridge is read-only. Cancel not sent.",
      acknowledgedAt: new Date().toISOString(),
    };
  },
};

export default moomooAdapter;
