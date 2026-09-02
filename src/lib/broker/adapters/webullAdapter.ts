/**
 * webullAdapter — reference adapter stub for Webull.
 *
 * Founder canon §Broker Wiring §12 tonight-lock target #1 Webull.
 * Discovery finding (2026-08-21 shift-F): the codebase has zero
 * server-side Webull implementation. This stub is the honest
 * scaffold every future real integration must extend — it
 * satisfies the BrokerAdapter contract with truthful UNAVAILABLE
 * / NOT IMPLEMENTED responses. No fabrication. No fake fills.
 *
 * A subsequent atom shipping a real adapter should replace the
 * body of each method — but should keep the BrokerAdapter contract
 * intact so downstream consumers don't need to change.
 */

import type {
  BrokerAdapter,
  BrokerCapabilities,
  BrokerHealth,
  CanonicalAccount,
  CanonicalOrderAck,
  UniversalOrderIntent,
} from "../BrokerAdapter";
import { webullBrokerConfigFromEnv } from "./webullBrokerConnection";

function configuredForSignedTrading(): boolean {
  const config = webullBrokerConfigFromEnv(process.env);
  return Boolean(config.appKey?.trim() && config.appSecret?.trim());
}

class NotImplementedError extends Error {
  constructor(op: string) {
    super(`Webull adapter is not implemented — cannot ${op}. See /api/broker/webull/status for the honest wiring report.`);
    this.name = "NotImplementedError";
  }
}

export const webullAdapter: BrokerAdapter = {
  id: "webull",

  health(): BrokerHealth {
    const envConfigured = configuredForSignedTrading();
    return {
      implemented: true,
      envConfigured,
      connected: false,
      note: envConfigured
        ? "Webull signed account probing is implemented and configured. Connection is proven per request at /api/broker/webull/status; order preview and execution are not yet enabled."
        : "Webull signed account probing is implemented, but the Trading API credential pair is not configured together. Order preview and execution are not enabled.",
    };
  },

  async capabilities(_accountId: string): Promise<BrokerCapabilities> {
    void _accountId;
    // Founder canon §Capability Honesty — OBSERVED tier. Values below
    // are the shape the Webull OpenAPI MCP surfaced live in-session on
    // 2026-08-21. This is what a real host-runtime adapter WILL
    // support once wired; asserting it here so downstream planning
    // consumers (order ticket, capability chip, asset-class filter)
    // can build against real Webull shape rather than an empty stub.
    //
    // Rubric §12 change-risk: this is an under-claim about the
    // account level (paper/live), NOT a promise the current build
    // can execute. Order-lifecycle methods still return honest
    // rejected/unknown until the real adapter lands.
    return {
      assetClasses: ["equity", "option", "future", "crypto"], // event contracts + funds not in universal enum yet
      orderTypes: ["market", "limit", "stop", "stop-limit"],
      supportsPaper: false,   // no separate paper account observed; live-only surface
      supportsLive: true,     // MARGIN + EVENTS_CASH accounts confirmed
      supportsBracketOrders: false, // not confirmed via read-only probes; leave false until observed
      supportsShort: true,    // margin account supports shorting per Webull product
      notes: [
        "Webull broker MCP verified in-session (US_STOCK/HK_STOCK/JP_STOCK/CN_STOCK; options/futures/crypto/funds/events).",
        "Server-side host-runtime integration (Cloudflare Workers) is a future atom — this stub still returns rejected/unknown on order-lifecycle methods.",
      ],
    };
  },

  async listAccounts(): Promise<readonly CanonicalAccount[]> {
    // Account-list proof is exposed through the authenticated status route
    // without returning identifiers. Canonical account balance wrapping is a
    // separate atom because this contract requires cash/equity/buying power.
    return [];
  },

  async getAccount(accountId: string): Promise<CanonicalAccount> {
    throw new NotImplementedError(`fetch account ${accountId}`);
  },

  async submitOrder(intent: UniversalOrderIntent): Promise<CanonicalOrderAck> {
    // Never fabricate an ack. Return status "rejected" with a truthful
    // reason so upstream idempotency/journal writers can record the
    // attempt without inventing a broker order id.
    return {
      clientOrderId: intent.clientOrderId,
      brokerOrderId: null,
      status: "rejected",
      reason: "Webull adapter is not implemented — order not submitted.",
      acknowledgedAt: new Date().toISOString(),
    };
  },

  async cancelOrder(clientOrderId: string): Promise<CanonicalOrderAck> {
    return {
      clientOrderId,
      brokerOrderId: null,
      status: "unknown",
      reason: "Webull adapter is not implemented — cancel not sent.",
      acknowledgedAt: new Date().toISOString(),
    };
  },
};

export default webullAdapter;
