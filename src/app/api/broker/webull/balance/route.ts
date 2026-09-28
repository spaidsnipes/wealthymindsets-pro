import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { webullBrokerConfigFromEnv } from "@/lib/broker/adapters/webullBrokerConnection";
import { listWebullAccounts, readWebullBalance } from "@/lib/broker/adapters/webullOrders";
import { webullOwnerGate, webullOwnerRefusal } from "@/lib/broker/webullOwner";
import { resolveWebullSessionToken, webullSessionStore, webullWorkerEnv } from "@/lib/marketData/webullSessionStore";

export const dynamic = "force-dynamic";

/**
 * GET /api/broker/webull/balance — the Command Deck's ACCOUNT row (Garden 16:
 * "the Command Deck binds … account"). READ-ONLY: each account's balance as
 * Webull reports it, summed across the accounts that answered. Owner-gated;
 * account ids never leave this route (types only). Reads are paced — Webull
 * caps account-family reads per second (measured 429s back-to-back).
 */
const PACE_MS = 1_100;

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const owner = webullOwnerGate(auth.user.sub, process.env);
  if (!owner.allowed) return NextResponse.json(webullOwnerRefusal(owner), { status: 403 });
  const cfg = webullBrokerConfigFromEnv(process.env);
  const checkedAt = new Date().toISOString();
  if (!cfg.appKey || !cfg.appSecret) return NextResponse.json({ state: "NOT_CONFIGURED", checkedAt });
  const session = await resolveWebullSessionToken(fetch, { appKey: cfg.appKey, appSecret: cfg.appSecret, apiHost: cfg.apiHost }, webullSessionStore(await webullWorkerEnv()));
  if (session.awaiting2fa || (!session.accessToken && !session.tokenless)) {
    return NextResponse.json({ state: session.awaiting2fa ? "AWAITING_2FA" : "NO_SESSION", checkedAt });
  }
  const orderCfg = { appKey: cfg.appKey, appSecret: cfg.appSecret, apiHost: cfg.apiHost, accessToken: session.accessToken };
  const accounts = await listWebullAccounts(fetch, orderCfg);
  if (accounts.state !== "OK") return NextResponse.json({ state: accounts.state === "REJECTED" && accounts.status === 429 ? "RATE_LIMITED" : "ACCOUNTS_UNAVAILABLE", checkedAt });
  const answered: { type: string; netLiquidation: number | null; cash: number | null; dayBuyingPower: number | null; dayPnl: number | null }[] = [];
  const unread: string[] = [];
  for (const a of accounts.accounts) {
    // The account list was just read: pace every balance read after it.
    await new Promise<void>((r) => setTimeout(r, PACE_MS));
    const b = await readWebullBalance(fetch, orderCfg, a.accountId);
    if (b.state !== "OK") { unread.push(`${a.accountType ?? "UNTYPED"}:${b.state === "REJECTED" ? b.status : "NO_ANSWER"}`); continue; }
    answered.push({ type: a.accountType ?? "UNTYPED", netLiquidation: b.netLiquidation, cash: b.cash, dayBuyingPower: b.dayBuyingPower, dayPnl: b.dayPnl });
  }
  const sum = (k: "netLiquidation" | "cash" | "dayPnl") => answered.every((x) => x[k] != null) ? +answered.reduce((s, x) => s + (x[k] as number), 0).toFixed(2) : null;
  return NextResponse.json(
    {
      state: answered.length === 0 ? "UNREAD" : unread.length ? "PARTIAL" : "OBSERVED",
      accounts: accounts.accounts.length,
      answered: answered.length,
      unread,
      netLiquidation: sum("netLiquidation"),
      cash: sum("cash"),
      dayPnl: sum("dayPnl"),
      byType: answered.map((x) => ({ type: x.type, netLiquidation: x.netLiquidation, dayBuyingPower: x.dayBuyingPower })),
      checkedAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
