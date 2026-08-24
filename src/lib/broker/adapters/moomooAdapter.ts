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
    // OBSERVED tier — moomoo's documented product surface (US/HK/CN/JP equity,
    // options, futures, FX) and OpenD's TrdEnv.SIMULATE paper environment. This is
    // what a fully-wired adapter WILL support; order-lifecycle methods still return
    // honest rejected/unknown until the trade path lands.
    return {
      assetClasses: ["equity", "option", "future", "fx"],
      orderTypes: ["market", "limit", "stop", "stop-limit"],
      supportsPaper: true, // OpenD TrdEnv.SIMULATE
      supportsLive: true,  // TrdEnv.REAL (requires trade-unlock in OpenD)
      supportsBracketOrders: false, // not confirmed via read-only path; leave false until observed
      supportsShort: true, // margin accounts support shorting per moomoo product
      notes: [
        "moomoo reaches the app through services/moomoo-bridge → OpenD (127.0.0.1:11111); OpenD cannot run on Cloudflare Workers.",
        "v1 bridge is read-only (quotes). Order execution is a future atom — submitOrder/cancelOrder return honest rejected/unknown until then.",
        "Live real-time US quotes may require a moomoo market-data subscription; paper (SIMULATE) works without one.",
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
