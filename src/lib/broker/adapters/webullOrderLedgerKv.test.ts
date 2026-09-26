/**
 * GP12 §32 "Persist it" — the place-once argument must outlive an isolate.
 */

import { describe, expect, it, vi } from "vitest";

import {
  WEBULL_ORDER_LEDGER_PREFIX,
  kvOrderLedger,
  parseLedgerRecord,
  type WebullKvListable,
} from "./webullOrderLedgerKv";
import { inMemoryOrderLedger, submitWebullOrderOnce, type LedgerRecord, type WebullOrderIntent } from "./webullOrders";
import { WEBULL_SDK_CONTRACT } from "@/lib/marketData/webullSdkContract";
import { runWebullSessionKeeper } from "@/lib/marketData/webullSessionKeeperJob";

function listableKv(initial: Record<string, string> = {}): WebullKvListable & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    async get(k) { return k in data ? data[k] : null; },
    async put(k, v) { data[k] = v; },
    async list({ prefix, limit }) {
      const keys = Object.keys(data).filter(k => k.startsWith(prefix)).slice(0, limit ?? 1000).map(name => ({ name }));
      return { keys, list_complete: true };
    },
  };
}

const row = (over: Partial<LedgerRecord> = {}): LedgerRecord => ({
  clientOrderId: "c1", decisionId: "D-1", accountId: "a-1", state: "SUBMITTING",
  brokerOrderId: null, brokerStatus: null, note: "", updatedAtMs: 1, ...over,
});

const intent: WebullOrderIntent = {
  clientOrderId: "a1b2c3d4e5f60718293a4b5c6d7e8f90", decisionId: "D-7", accountId: "a-1",
  symbol: "TSLA", side: "buy", type: "limit", qty: 1, limitPx: 250.5, tif: "day", assetClass: "equity",
};

describe("the durable ledger", () => {
  it("round-trips a row under its own prefix, and refuses a malformed one", async () => {
    const kv = listableKv();
    const ledger = kvOrderLedger(kv);
    await ledger.put(row());
    expect(Object.keys(kv.data)).toEqual([`${WEBULL_ORDER_LEDGER_PREFIX}c1`]);
    expect(await ledger.get("c1")).toEqual(row());
    expect(parseLedgerRecord(JSON.stringify({ ...row(), state: "FILLED_MAYBE" }))).toBeNull();
    expect(parseLedgerRecord("{")).toBeNull();
  });

  it("an unreadable ledger THROWS — null would read as 'never sent' and license a second place", async () => {
    const broken = { get: vi.fn(async () => { throw new Error("kv down"); }), put: vi.fn() };
    await expect(kvOrderLedger(broken).get("c1")).rejects.toThrow(/could not be read/);
  });

  it("a lost answer survives the isolate: a second press reconciles, it does not re-place", async () => {
    const kv = listableKv();
    const cfg = { appKey: "k", appSecret: "s", accessToken: "t", liveOrdersEnabled: true, now: () => new Date(0), nonce: () => "n" };
    // Isolate 1: the place request leaves and the answer is lost.
    const lost = vi.fn(async () => { throw new TypeError("network lost"); });
    const first = await submitWebullOrderOnce(lost as unknown as typeof fetch, cfg, kvOrderLedger(kv), intent);
    expect(first.outcome).toBe("SUBMISSION_UNKNOWN");
    // Isolate 2 (a fresh ledger object over the same KV): the exact lookup finds it.
    const calls: string[] = [];
    const found = vi.fn(async (url: RequestInfo | URL) => {
      calls.push(new URL(String(url)).pathname);
      return new Response(JSON.stringify({ client_order_id: intent.clientOrderId, order_id: "B-9", status: "SUBMITTED" }), { status: 200 });
    });
    const second = await submitWebullOrderOnce(found as unknown as typeof fetch, cfg, kvOrderLedger(kv), intent);
    expect(second.outcome).toBe("ALREADY_PLACED");
    expect(calls).not.toContain(WEBULL_SDK_CONTRACT.ORDER_PLACE.path);
    // The in-memory ledger could not have done this — it would have forgotten.
    const amnesiac = await submitWebullOrderOnce(found as unknown as typeof fetch, cfg, inMemoryOrderLedger(), intent);
    expect(amnesiac.sent).toBe(true);
  });

  it("all() enumerates the book for the reconciler, and says null when it cannot", async () => {
    const kv = listableKv();
    await kvOrderLedger(kv).put(row({ clientOrderId: "x" }));
    expect((await kvOrderLedger(kv).all())?.map(r => r.clientOrderId)).toEqual(["x"]);
    expect(await kvOrderLedger({ get: async () => null, put: async () => {} }).all()).toBeNull();
  });
});

describe("the keeper reconciles against the book", () => {
  it("known, external and an unresolved lost answer — counts only", async () => {
    const kv = listableKv({
      [`${WEBULL_ORDER_LEDGER_PREFIX}mine-open`]: JSON.stringify(row({ clientOrderId: "mine-open", state: "ACKNOWLEDGED" })),
      [`${WEBULL_ORDER_LEDGER_PREFIX}lost`]: JSON.stringify(row({ clientOrderId: "lost", state: "SUBMISSION_UNKNOWN" })),
    });
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    const routes: Record<string, () => Response> = {
      [WEBULL_SDK_CONTRACT.APP_CONFIG.path]: () => json({ token_check_enabled: false }),
      [WEBULL_SDK_CONTRACT.ACCOUNT_LIST.path]: () => json([{ account_id: "a-1" }]),
      [WEBULL_SDK_CONTRACT.ORDER_OPEN_LIST.path]: () => json({ data: [{ client_order_id: "mine-open" }, { client_order_id: "from-app" }] }),
    };
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const r = routes[new URL(String(url)).pathname];
      return r ? r() : json({ code: "UNROUTED" }, 404);
    });
    const result = await runWebullSessionKeeper(
      { WEBULL_API_KEY: "k", WEBULL_API_SECRET: "s", WEBULL_SESSION: kv },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result?.reconciliation).toMatchObject({ state: "OK", accounts: 1, openOrders: 2, external: 1, unresolved: 1, ledger: "KV" });
    expect(JSON.stringify(result?.reconciliation)).not.toMatch(/mine-open|from-app|lost/);
  });
});
