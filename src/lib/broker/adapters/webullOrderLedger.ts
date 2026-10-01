/**
 * THE DURABLE WEBULL ORDER LEDGER — the record `submitWebullOrderOnce` writes
 * BEFORE a place request leaves (GP12 §33).
 *
 * `inMemoryOrderLedger` is, in its own words, "never for production money": a
 * Worker isolate can be evicted between the SUBMITTING write and the answer,
 * and a ledger that dies with it turns an UNKNOWN order into a blank that
 * invites a second buy. This one lives in the same Cloudflare KV namespace as
 * the Webull session (`WEBULL_SESSION`), keyed by client order id.
 *
 * Returns null when the namespace is not bound: the submit route then REFUSES
 * live orders rather than falling back to memory. PURE apart from the KV calls.
 */

import type { LedgerRecord, WebullOrderLedger } from "@/lib/broker/adapters/webullOrders";
import type { WebullKvNamespace } from "@/lib/marketData/webullKvTokenStore";
import { WEBULL_SESSION_KV_BINDING } from "@/lib/marketData/webullSessionStore";

/** Ninety days: long past any DAY/GTC order's life, so reconciliation can always find it. */
const LEDGER_TTL_SEC = 90 * 86_400;

export const webullLedgerKey = (clientOrderId: string) => `webull:order:v1:${clientOrderId}`;

export function kvOrderLedger(kv: WebullKvNamespace): WebullOrderLedger {
  return {
    async get(clientOrderId) {
      const raw = await kv.get(webullLedgerKey(clientOrderId));
      if (!raw) return null;
      try { return JSON.parse(raw) as LedgerRecord; } catch { return null; }
    },
    async put(record) {
      await kv.put(webullLedgerKey(record.clientOrderId), JSON.stringify(record), { expirationTtl: LEDGER_TTL_SEC });
    },
  };
}

/** The durable ledger for this Worker, or null when no KV namespace is bound. */
export function durableWebullOrderLedger(env: unknown): WebullOrderLedger | null {
  if (!env || typeof env !== "object") return null;
  const candidate = (env as Record<string, unknown>)[WEBULL_SESSION_KV_BINDING] as Partial<WebullKvNamespace> | undefined;
  return candidate && typeof candidate.get === "function" && typeof candidate.put === "function"
    ? kvOrderLedger(candidate as WebullKvNamespace)
    : null;
}
