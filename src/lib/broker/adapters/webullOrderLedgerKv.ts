/**
 * THE WEBULL ORDER LEDGER, DURABLE — GP12 §32: "WM intentId → stable
 * clientOrderId → Webull broker orderId. Persist it."
 *
 * `submitWebullOrderOnce` writes SUBMITTING before a place request leaves and
 * reads it back before sending again; that is the whole exactly-once argument.
 * With the in-memory ledger the argument lasts one Worker isolate: a lost
 * answer followed by an eviction forgets the SUBMITTING row, and the next
 * press would send a SECOND place with no reconciliation in between — the
 * exact failure §33 forbids. This ledger lives in the same KV namespace as the
 * Webull session, under its own prefix, so every isolate and the scheduled
 * reconciler read one book.
 *
 * Records hold ids and states only — never a token, a price or a quantity.
 */

import type { LedgerRecord, LedgerState, WebullOrderLedger } from "./webullOrders";
import type { WebullKvNamespace } from "@/lib/marketData/webullKvTokenStore";

export const WEBULL_ORDER_LEDGER_PREFIX = "webull:order:v1:";
/** Long enough to reconcile any order a trader could still care about. */
export const ORDER_LEDGER_TTL_SECONDS = 90 * 24 * 3600;
/** The reconciler reads at most this many rows per run. */
export const ORDER_LEDGER_LIST_LIMIT = 200;

/** A KV namespace that can also enumerate keys (the Workers binding can). */
export interface WebullKvListable extends WebullKvNamespace {
  list(options: { prefix: string; limit?: number; cursor?: string }): Promise<{
    keys: readonly { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

export function kvCanList(kv: WebullKvNamespace): kv is WebullKvListable {
  return typeof (kv as Partial<WebullKvListable>).list === "function";
}

const STATES: readonly LedgerState[] = ["SUBMITTING", "ACKNOWLEDGED", "REJECTED", "SUBMISSION_UNKNOWN"];

/** A stored row, or null when any field is not what the ledger writes. */
export function parseLedgerRecord(raw: string | null): LedgerRecord | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Partial<LedgerRecord>;
    if (typeof r.clientOrderId !== "string" || !r.clientOrderId) return null;
    if (typeof r.decisionId !== "string" || typeof r.accountId !== "string") return null;
    if (!STATES.includes(r.state as LedgerState)) return null;
    if (typeof r.updatedAtMs !== "number" || !Number.isFinite(r.updatedAtMs)) return null;
    return {
      clientOrderId: r.clientOrderId,
      decisionId: r.decisionId,
      accountId: r.accountId,
      state: r.state as LedgerState,
      brokerOrderId: typeof r.brokerOrderId === "string" ? r.brokerOrderId : null,
      brokerStatus: (r.brokerStatus ?? null) as LedgerRecord["brokerStatus"],
      note: typeof r.note === "string" ? r.note : "",
      updatedAtMs: r.updatedAtMs,
    };
  } catch {
    return null;
  }
}

export interface DurableWebullOrderLedger extends WebullOrderLedger {
  /** Every row the reconciler can see, newest writes included. Null when the store cannot enumerate. */
  all(): Promise<LedgerRecord[] | null>;
}

export function kvOrderLedger(kv: WebullKvNamespace): DurableWebullOrderLedger {
  return {
    async get(clientOrderId) {
      try {
        return parseLedgerRecord(await kv.get(WEBULL_ORDER_LEDGER_PREFIX + clientOrderId));
      } catch {
        // An unreadable ledger must not read as "never sent": callers treat
        // null as NOT seen, so a read fault is thrown to them, not swallowed.
        throw new Error("Webull order ledger could not be read");
      }
    },
    async put(record) {
      // A write that fails must fail loudly: `submitWebullOrderOnce` writes
      // SUBMITTING before sending precisely so the send never outruns the trace.
      await kv.put(WEBULL_ORDER_LEDGER_PREFIX + record.clientOrderId, JSON.stringify(record), {
        expirationTtl: ORDER_LEDGER_TTL_SECONDS,
      });
    },
    async all() {
      if (!kvCanList(kv)) return null;
      try {
        const page = await kv.list({ prefix: WEBULL_ORDER_LEDGER_PREFIX, limit: ORDER_LEDGER_LIST_LIMIT });
        const rows: LedgerRecord[] = [];
        for (const k of page.keys) {
          const r = parseLedgerRecord(await kv.get(k.name));
          if (r) rows.push(r);
        }
        return rows;
      } catch {
        return null;
      }
    },
  };
}
