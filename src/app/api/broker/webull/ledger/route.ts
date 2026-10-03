import { NextResponse } from "next/server";

import { webullBrokerConfigFromEnv } from "@/lib/broker/adapters/webullBrokerConnection";
import { listWebullAccounts, listWebullOrderHistoryPage } from "@/lib/broker/adapters/webullOrders";
import { walkWebullHistory } from "@/lib/broker/webullLedgerWalk";
import { readWebullHistory, type LedgerOrder } from "@/lib/broker/webullLedger";
import { webullOwnerGate, webullOwnerRefusal } from "@/lib/broker/webullOwner";
import { requireAuth } from "@/lib/requireAuth";
import { resolveWebullSessionToken, webullSessionStore, webullWorkerEnv } from "@/lib/marketData/webullSessionStore";
import { orderDecisionKv } from "@/lib/broker/orderDecisionLedger";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Garden 18 v2 §29/§30/§36 — THE WEBULL LIFETIME LEDGER. READ ONLY, OWNER ONLY.
 *
 * Webull's order history for the owner's accounts, served as RAW orders
 * (immutable provenance) one account-year per request; the Journal's ledger
 * steps back a year at a time and rebuilds episodes and outcome P&L from them
 * with the same pure owner (lib/broker/webullLedger). No order is placed,
 * changed or cancelled here.
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
  // The account list is asked once per 10 minutes (kept in KV): every step
  // re-listing it met Webull's rate limit (measured 429 here, 2026-10-02).
  const kvEnv = orderDecisionKv(await webullWorkerEnv());
  type Acct = { accountId: string; accountType: string | null };
  let list: Acct[] | null = null;
  try { const hit = kvEnv ? await kvEnv.get("wbledger:accounts") : null; if (hit) list = JSON.parse(hit) as Acct[]; } catch { list = null; }
  if (!list) {
    let accounts = await listWebullAccounts(fetch, c);
    for (const wait of [3_000, 6_000, 12_000]) {
      if (accounts.state !== "REJECTED" || accounts.status !== 429) break;
      await new Promise(r => setTimeout(r, wait));
      accounts = await listWebullAccounts(fetch, c);
    }
    if (accounts.state !== "OK") return NextResponse.json({ state: "ACCOUNTS_UNAVAILABLE", reason: accounts.reason }, { headers: NO_STORE });
    list = accounts.accounts.map(a => ({ accountId: a.accountId, accountType: a.accountType }));
    if (kvEnv) await kvEnv.put("wbledger:accounts", JSON.stringify(list), { expirationTtl: 600 }).catch(() => {});
  }
  const accounts = { accounts: list };

  const url = new URL(request.url);

  // TODAY (Garden 18 v2 §70): every account's orders for today's New York date
  // — a one-day window, which Webull answers whole — kept 60 s so the market
  // room's rule card never asks Webull more than once a minute.
  if (url.searchParams.get("today") === "1") {
    const ny = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const next = new Date(Date.parse(`${ny}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    const key = `wbledger:v2:today:${ny}`;
    try { const hit = kvEnv ? await kvEnv.get(key) : null; if (hit) return NextResponse.json({ state: "OK", day: ny, cached: true, orders: JSON.parse(hit) }, { headers: NO_STORE }); } catch { /* read live */ }
    const orders: LedgerOrder[] = [];
    for (const [i, a] of accounts.accounts.entries()) {
      if (i > 0) await new Promise(r => setTimeout(r, 1_100));
      let cursor: string | null = null;
      for (let pg = 0; pg < 5; pg++) {
        const r = await listWebullOrderHistoryPage(fetch, c, a.accountId, ny, next, cursor);
        if (!r.ok) return NextResponse.json({ state: "REFUSED", reason: r.reason ?? "Webull refused today's history." }, { headers: NO_STORE });
        const rows = Array.isArray(r.payload) ? r.payload : [];
        const got = readWebullHistory(r.payload, a.accountId.slice(-4));
        const before = orders.length;
        for (const o of got) if (!orders.some(x => x.orderId === o.orderId)) orders.push(o);
        const last = rows.length ? (rows[rows.length - 1] as Record<string, unknown>)?.client_order_id : null;
        if (orders.length === before || typeof last !== "string" || last === cursor) break;
        cursor = last;
        await new Promise(r2 => setTimeout(r2, 1_100));
      }
    }
    if (kvEnv) await kvEnv.put(key, JSON.stringify(orders), { expirationTtl: 60 }).catch(() => {});
    return NextResponse.json({ state: "OK", day: ny, cached: false, orders }, { headers: NO_STORE });
  }

  const idxRaw = url.searchParams.get("account");
  // Step 1 — no account named: the accounts, so the page can step through them.
  if (idxRaw == null) {
    return NextResponse.json({
      state: "OK",
      accounts: accounts.accounts.map((a, index) => ({ index, tail: a.accountId.slice(-4), accountType: a.accountType })),
    }, { headers: NO_STORE });
  }
  // Step 2 — one account, one year: bounded work per request (a whole-history
  // walk in one request ran past 3 minutes, 2026-10-02). The page steps back a
  // year at a time until two years in a row come back empty.
  const index = Number(idxRaw);
  const yearsBack = Number(url.searchParams.get("yearsBack") ?? "0");
  const a = accounts.accounts[index];
  if (!Number.isInteger(index) || !a || !Number.isInteger(yearsBack) || yearsBack < 0 || yearsBack > 15) {
    return NextResponse.json({ state: "BAD_REQUEST", reason: "account (index) and yearsBack (0–15) are required." }, { status: 400, headers: NO_STORE });
  }
  // One month per request (0 = newest month of that year), or ?probe=1 for "does this year have orders?".
  const monthRaw = url.searchParams.get("month");
  const monthIdx = monthRaw == null ? undefined : Number(monthRaw);
  if (monthIdx !== undefined && (!Number.isInteger(monthIdx) || monthIdx < 0 || monthIdx > 11)) {
    return NextResponse.json({ state: "BAD_REQUEST", reason: "month must be 0–11." }, { status: 400, headers: NO_STORE });
  }
  const fromRaw = url.searchParams.get("from");
  const fromIdx = fromRaw == null ? undefined : Number(fromRaw);
  if (fromIdx !== undefined && (!Number.isInteger(fromIdx) || fromIdx < 0 || fromIdx > 11)) {
    return NextResponse.json({ state: "BAD_REQUEST", reason: "from must be 0–11." }, { status: 400, headers: NO_STORE });
  }
  const today = new Date();
  // Finished months come from KV (Webull's raw rows, kept on first read); ?fresh=1 asks Webull for everything.
  const kv = url.searchParams.get("fresh") === "1" ? null : orderDecisionKv(await webullWorkerEnv());
  const cache = kv ? { get: (k: string) => kv.get(k), put: (k: string, v: string, ttl?: number) => kv.put(k, v, ttl ? { expirationTtl: Math.max(60, ttl) } : undefined) } : undefined;
  const w = await walkWebullHistory(a.accountId, (s, e, cursor) => listWebullOrderHistoryPage(fetch, c, a.accountId, s, e, cursor),
    { today, cache, startYearsBack: yearsBack, maxYears: 1, quietYears: 99, probeOnly: url.searchParams.get("probe") === "1", onlyMonth: monthIdx,
      // ?from=m: read on from month m for ~20 s (kept months are free), then say where to continue.
      fromMonth: fromIdx, deadlineAt: fromIdx != null ? Date.now() + 20_000 : undefined });
  const tail = a.accountId.slice(-4);
  return NextResponse.json({
    state: "OK",
    asOf: today.toISOString(),
    truth: "ACTUAL BROKER RESULT · Webull order history, raw orders",
    account: { index, tail, accountType: a.accountType },
    yearsBack,
    month: monthIdx ?? null,
    nextMonth: w.nextMonth ?? null,
    askedBackTo: w.askedBackTo,
    yearEmpty: w.lastYearEmpty,
    stoppedBecause: w.stoppedBecause,
    reason: w.reason,
    pages: w.pages,
    cachedMonths: w.cachedMonths,
    orders: w.orders.map(o => ({ ...o, accountId: tail })),
  }, { headers: NO_STORE });
}
