import { NextResponse } from "next/server";

import { webullBrokerConfigFromEnv } from "@/lib/broker/adapters/webullBrokerConnection";
import { listWebullAccounts, listWebullOrderHistoryPage } from "@/lib/broker/adapters/webullOrders";
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
  // Every step re-lists the accounts, so this call meets Webull's rate limit too (measured 429 here, 2026-10-02).
  let accounts = await listWebullAccounts(fetch, c);
  for (const wait of [3_000, 6_000, 12_000]) {
    if (accounts.state !== "REJECTED" || accounts.status !== 429) break;
    await new Promise(r => setTimeout(r, wait));
    accounts = await listWebullAccounts(fetch, c);
  }
  if (accounts.state !== "OK") return NextResponse.json({ state: "ACCOUNTS_UNAVAILABLE", reason: accounts.reason }, { headers: NO_STORE });

  const url = new URL(request.url);
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
  const today = new Date();
  // Finished months come from KV (Webull's raw rows, kept on first read); ?fresh=1 asks Webull for everything.
  const kv = url.searchParams.get("fresh") === "1" ? null : orderDecisionKv(await webullWorkerEnv());
  const cache = kv ? { get: (k: string) => kv.get(k), put: (k: string, v: string) => kv.put(k, v) } : undefined;
  const w = await walkWebullHistory(a.accountId, (s, e, cursor) => listWebullOrderHistoryPage(fetch, c, a.accountId, s, e, cursor),
    { today, cache, startYearsBack: yearsBack, maxYears: 1, quietYears: 99, probeOnly: url.searchParams.get("probe") === "1", onlyMonth: monthIdx });
  const tail = a.accountId.slice(-4);
  return NextResponse.json({
    state: "OK",
    asOf: today.toISOString(),
    truth: "ACTUAL BROKER RESULT · Webull order history, raw orders",
    account: { index, tail, accountType: a.accountType },
    yearsBack,
    month: monthIdx ?? null,
    askedBackTo: w.askedBackTo,
    yearEmpty: w.lastYearEmpty,
    stoppedBecause: w.stoppedBecause,
    reason: w.reason,
    pages: w.pages,
    cachedMonths: w.cachedMonths,
    orders: w.orders.map(o => ({ ...o, accountId: tail })),
  }, { headers: NO_STORE });
}
