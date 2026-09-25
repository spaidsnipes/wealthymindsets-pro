import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { webullBrokerConfigFromEnv } from "@/lib/broker/adapters/webullBrokerConnection";
import {
  listWebullAccounts,
  mintClientOrderId,
  previewWebullOrder,
  type WebullOrderIntent,
} from "@/lib/broker/adapters/webullOrders";
import { webullOwnerGate, webullOwnerRefusal } from "@/lib/broker/webullOwner";
import {
  resolveWebullSessionToken,
  webullSessionStore,
  webullWorkerEnv,
} from "@/lib/marketData/webullSessionStore";

export const dynamic = "force-dynamic";

/**
 * POST /api/broker/webull/order-preview — GP12 §40, the non-money rung.
 *
 * Asks Webull to validate and price one US-equity order on the owner's
 * account WITHOUT placing it (`/trading/orders/preview`). Nothing here can
 * place, cancel or replace an order: the module's place path is not imported.
 *
 * Owner-only, STRICT (§15): with no WEBULL_OWNER_USER_ID configured nobody
 * may reach the accounts through this route.
 *
 * Account ids never leave the server. The caller picks an account by the
 * index this route returns, alongside Webull's own account-type word and the
 * last four characters of the id.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const owner = webullOwnerGate(auth.user.sub, process.env, "STRICT");
  if (!owner.allowed) return NextResponse.json(webullOwnerRefusal(owner), { status: 403 });

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const cfg = webullBrokerConfigFromEnv(process.env);
  if (!cfg.appKey || !cfg.appSecret) {
    return NextResponse.json({ state: "NOT_CONFIGURED", note: "Webull App Key and App Secret are not configured." }, { status: 200 });
  }
  const session = await resolveWebullSessionToken(
    fetch,
    { appKey: cfg.appKey, appSecret: cfg.appSecret, apiHost: cfg.apiHost },
    webullSessionStore(await webullWorkerEnv()),
  );
  if (session.awaiting2fa || !session.accessToken) {
    return NextResponse.json({ state: session.awaiting2fa ? "AWAITING_2FA" : "NO_SESSION", note: session.note }, { status: 200 });
  }
  const orderCfg = { appKey: cfg.appKey, appSecret: cfg.appSecret, apiHost: cfg.apiHost, accessToken: session.accessToken };

  const accounts = await listWebullAccounts(fetch, orderCfg);
  if (accounts.state !== "OK") {
    return NextResponse.json({ state: "ACCOUNTS_UNAVAILABLE", note: accounts.reason }, { status: 200 });
  }
  const choices = accounts.accounts.map((a, index) => ({
    index,
    accountType: a.accountType,
    tail: a.accountId.slice(-4),
  }));
  const index = Number.isInteger(input.accountIndex) ? (input.accountIndex as number) : 0;
  const account = accounts.accounts[index];
  if (!account) {
    return NextResponse.json({ state: "NO_SUCH_ACCOUNT", accounts: choices }, { status: 200 });
  }

  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const intent: WebullOrderIntent = {
    clientOrderId: mintClientOrderId(),
    decisionId: typeof input.decisionId === "string" ? input.decisionId : "",
    accountId: account.accountId,
    symbol: typeof input.symbol === "string" ? input.symbol : "",
    side: input.side === "sell" ? "sell" : "buy",
    type: (["market", "limit", "stop", "stop-limit"] as const).find((t) => t === input.type) ?? "limit",
    qty: num(input.qty) ?? 0,
    limitPx: num(input.limitPx),
    stopPx: num(input.stopPx),
    tif: (["day", "gtc", "ioc", "fok"] as const).find((t) => t === input.tif) ?? "day",
    assetClass: "equity",
  };

  const result = await previewWebullOrder(fetch, orderCfg, intent);
  return NextResponse.json(
    { ...result, accounts: choices, accountIndex: index, clientOrderId: intent.clientOrderId },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
