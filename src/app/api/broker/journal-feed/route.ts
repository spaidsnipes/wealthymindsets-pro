import { NextRequest, NextResponse } from "next/server";

import { brokerOwnerRefusal, tastytradeOwnerGate } from "@/lib/broker/brokerOwner";
import { getOrderDecision, orderDecisionKv } from "@/lib/broker/orderDecisionLedger";
import { readTastytradeFills } from "@/lib/broker/tastytradeFills";
import { readTastytradeOrder } from "@/lib/broker/tastytradeOrderState";
import { webullWorkerEnv } from "@/lib/marketData/webullSessionStore";
import { requireAuth } from "@/lib/requireAuth";
import { webullOwnerGate } from "@/lib/broker/webullOwner";
import { webullBrokerConfigFromEnv } from "@/lib/broker/adapters/webullBrokerConnection";
import { listWebullAccounts, listWebullExecutions } from "@/lib/broker/adapters/webullOrders";
import { readWebullExecutions } from "@/lib/broker/webullFills";
import { resolveWebullSessionToken, webullSessionStore } from "@/lib/marketData/webullSessionStore";
import { getTastytradeAccounts, getTastytradeLiveOrders, getTastytradeTradeTransactions, tastytradeConfigStatus } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Garden 18 §XC/§XCI — THE JOURNAL'S MACHINE FACTS, FROM THE BROKER. READ ONLY.
 *
 * Today's tastytrade orders and fills per account, straight from tastytrade
 * (never browser memory), each order linked to the Decision_ID WM recorded
 * when it sent it (orderDecisionLedger). Fills are keyed by tastytrade's own
 * transaction id, so a reload or replay never tells the story twice. Orders
 * placed outside WM carry no decision and are reported as such.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const owner = tastytradeOwnerGate(auth.user.sub, process.env);
  const wbOwner = webullOwnerGate(auth.user.sub, process.env);
  if (!owner.allowed && !wbOwner.allowed) return NextResponse.json(brokerOwnerRefusal(owner), { status: 403, headers: NO_STORE });
  const ttOn = owner.allowed && tastytradeConfigStatus().configured;

  const startDate = req.nextUrl.searchParams.get("since") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return NextResponse.json({ state: "BAD_REQUEST", reason: "since must be YYYY-MM-DD." }, { status: 400, headers: NO_STORE });
  const kv = orderDecisionKv(await webullWorkerEnv());

  try {
    const out: unknown[] = [];
    // §XC: Webull's fills beside tastytrade's, grouped by the same Decision_ID ledger.
    if (wbOwner.allowed) out.push(...await webullJournalAccounts(startDate, kv));
    const accounts = ttOn ? await getTastytradeAccounts() : [];
    for (const a of accounts) {
      const tail = a.accountNumber.slice(-4);
      try {
        const [rawOrders, rawFills] = await Promise.all([
          getTastytradeLiveOrders(a.accountNumber),
          getTastytradeTradeTransactions(a.accountNumber, startDate),
        ]);
        const orders = [];
        for (const o of rawOrders.map(readTastytradeOrder)) {
          if (!o) continue;
          const link = kv && o.externalId ? await getOrderDecision(kv, "tastytrade", o.externalId).catch(() => null) : null;
          orders.push({ ...o, decisionId: link?.decisionId ?? null, sentFromWm: !!link });
        }
        out.push({ tail, broker: "tastytrade", state: "READ", orders, fills: readTastytradeFills(rawFills) });
      } catch (e) {
        out.push({ tail, broker: "tastytrade", state: "UNREADABLE", reason: e instanceof Error ? e.message : "unknown", orders: [], fills: [] });
      }
    }
    return NextResponse.json({ state: "OK", since: startDate, decisionLinks: kv ? "KV" : "UNAVAILABLE", accounts: out, asOf: new Date().toISOString() }, { headers: NO_STORE });
  } catch (e) {
    return NextResponse.json({ state: "CONNECTION_FAILED", reason: e instanceof Error ? e.message : "unknown" }, { headers: NO_STORE });
  }
}

/** Webull accounts' executions since `startDate`, each fill tagged with its decision when WM sent it. */
async function webullJournalAccounts(startDate: string, kv: ReturnType<typeof orderDecisionKv>) {
  const cfg = webullBrokerConfigFromEnv(process.env);
  if (!cfg.appKey || !cfg.appSecret) return [];
  try {
    const session = await resolveWebullSessionToken(fetch, { appKey: cfg.appKey, appSecret: cfg.appSecret, apiHost: cfg.apiHost }, webullSessionStore(await webullWorkerEnv()));
    if (session.awaiting2fa || (!session.accessToken && !session.tokenless)) {
      return [{ tail: "—", broker: "webull", state: "UNREADABLE", reason: session.note ?? "No Webull session.", orders: [], fills: [] }];
    }
    const c = { appKey: cfg.appKey, appSecret: cfg.appSecret, apiHost: cfg.apiHost, accessToken: session.accessToken };
    const accounts = await listWebullAccounts(fetch, c);
    if (accounts.state !== "OK") return [{ tail: "—", broker: "webull", state: "UNREADABLE", reason: accounts.reason, orders: [], fills: [] }];
    const out = [];
    for (const a of accounts.accounts) {
      const tail = a.accountId.slice(-4);
      const r = await listWebullExecutions(fetch, c, a.accountId, startDate);
      if (!r.ok) { out.push({ tail, broker: "webull", state: "UNREADABLE", reason: r.reason, orders: [], fills: [] }); continue; }
      const fills = [];
      for (const f of readWebullExecutions(r.payload)) {
        const link = kv && f.clientOrderId ? await getOrderDecision(kv, "webull", f.clientOrderId).catch(() => null) : null;
        fills.push({ ...f, decisionId: link?.decisionId ?? null, sentFromWm: !!link });
      }
      out.push({ tail, broker: "webull", state: "READ", orders: [], fills });
    }
    return out;
  } catch (e) {
    return [{ tail: "—", broker: "webull", state: "UNREADABLE", reason: e instanceof Error ? e.message : "unknown", orders: [], fills: [] }];
  }
}
