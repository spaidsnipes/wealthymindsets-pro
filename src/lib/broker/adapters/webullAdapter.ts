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

class NotImplementedError extends Error {
  constructor(op: string) {
    super(`Webull adapter is not implemented — cannot ${op}. See /api/broker/webull/status for the honest wiring report.`);
    this.name = "NotImplementedError";
  }
}

export const webullAdapter: BrokerAdapter = {
  id: "webull",

  health(): BrokerHealth {
    return {
      implemented: false,
      envConfigured: false, // no code reads WEBULL_* env names
      connected: false,
      note: "Webull adapter is not implemented — scaffold stub only. Real integration is a future atom.",
    };
  },

  async capabilities(_accountId: string): Promise<BrokerCapabilities> {
    void _accountId;
    // Never claim capabilities we cannot support. Empty asset classes +
    // empty order types tell the caller honestly.
    return {
      assetClasses: [],
      orderTypes: [],
      supportsPaper: false,
      supportsLive: false,
      supportsBracketOrders: false,
      supportsShort: false,
      notes: ["Webull adapter is not implemented in this build."],
    };
  },

  async listAccounts(): Promise<readonly CanonicalAccount[]> {
    // Empty array is honest — no accounts because no adapter.
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
