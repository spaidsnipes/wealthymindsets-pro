import { NextResponse } from "next/server";

import { webullBrokerConfigFromEnv } from "@/lib/broker/adapters/webullBrokerConnection";
import { listWebullAccounts, listWebullOrderHistoryPage } from "@/lib/broker/adapters/webullOrders";
import { dedupeOrders, reconstructEpisodes, summarizeLedger } from "@/lib/broker/webullLedger";
import { walkWebullHistory } from "@/lib/broker/webullLedgerWalk";
import { webullOwnerGate, webullOwnerRefusal } from "@/lib/broker/webullOwner";
import { requireAuth } from "@/lib/requireAuth";
import { resolveWebullSessionToken, webullSessionStore, webullWorkerEnv } from "@/lib/marketData/webullSessionStore";
import { orderDecisionKv } from "@/lib/broker/orderDecisionLedger";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Garden 18 v2 §29/§30/§36 — THE WEBULL LIFETIME LEDGER. READ ONLY, OWNER ONLY.
 *
 * Every order Webull's order history returns for each of the owner's accounts,
 * walked year by year until the history goes quiet; filled orders rebuilt into
 * episodes (RECONSTRUCTED) and summed into outcome P&L with Webull's own fees.
 * No order is placed, changed or cancelled here. `?raw=1` adds the raw orders
 * (immutable provenance) to the answer.
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const owner = webullOwnerGate(auth.user.sub, process.env);
  if (!owner.allowed) return NextResponse.json(webullOwnerRefusal(owner), { status: 403 });

  const cfg = webullBrokerConfigFromEnv(process.env);
  if (!cfg.appKey || !cfg.appSecret) return NextResponse.json({ state: "NOT_CONFIGURED" }, { headers: NO_STORE });
  const session = await resolveWebullSessionToken(fetch, { appKey: cfg.appKey, appSecret: cfg.appSecret, apiHost: cfg.apiHost }, webullSessionStore(await webullWorkerEnv()));
  if (session.awaiting2fa || (!session.accessToken && !session.tokenless)) {
    return NextResponse.json({ state: session.awaiting2fa ? "AWAITING_2FA" : "NO_SESSION", reason: session.note }, { headers: NO_STORE });
  }
  const c = { appKey: cfg.appKey, appSecret: cfg.appSecret, apiHost: cfg.apiHost, accessToken: session.accessToken, timeoutMs: 20_000 };
  const accounts = await listWebullAccounts(fetch, c);
  if (accounts.state !== "OK") return NextResponse.json({ state: "ACCOUNTS_UNAVAILABLE", reason: accounts.reason }, { headers: NO_STORE });

  const today = new Date();
  // Finished months come from KV (Webull's raw rows, kept on first read); ?fresh=1 asks Webull for everything.
  const kv = new URL(request.url).searchParams.get("fresh") === "1" ? null : orderDecisionKv(await webullWorkerEnv());
  const cache = kv ? { get: (k: string) => kv.get(k), put: (k: string, v: string) => kv.put(k, v) } : undefined;
  const walks = [];
  for (const [i, a] of accounts.accounts.entries()) {
    // Webull answers HTTP 429 to back-to-back history reads; accounts are spaced like pages.
    if (i > 0) await new Promise(r => setTimeout(r, 1_100));
    const w = await walkWebullHistory(a.accountId, (s, e, cursor) => listWebullOrderHistoryPage(fetch, c, a.accountId, s, e, cursor), { today, cache });
    walks.push({ ...w, accountType: a.accountType });
  }
  const orders = dedupeOrders(walks.flatMap(w => w.orders));
  const episodes = reconstructEpisodes(orders, today.getTime());
  const summary = summarizeLedger(episodes);
  const raw = new URL(request.url).searchParams.get("raw") === "1";
  return NextResponse.json({
    state: "OK",
    asOf: today.toISOString(),
    truth: "ACTUAL BROKER RESULT · episodes RECONSTRUCTED from Webull order history",
    accounts: walks.map(w => ({
      tail: w.accountId.slice(-4), accountType: w.accountType, orders: w.orders.length,
      filled: w.orders.filter(o => o.status === "FILLED").length,
      windows: w.windows, pages: w.pages, cachedMonths: w.cachedMonths, askedBackTo: w.askedBackTo, stoppedBecause: w.stoppedBecause, reason: w.reason,
    })),
    orderCount: orders.length,
    summary,
    episodes: episodes.map(e => ({ ...e, accountId: e.accountId.slice(-4) })),
    ...(raw ? { orders: orders.map(o => ({ ...o, accountId: o.accountId.slice(-4) })) } : {}),
  }, { headers: NO_STORE });
}
