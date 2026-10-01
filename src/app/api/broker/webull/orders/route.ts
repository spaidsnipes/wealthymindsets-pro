import { NextResponse } from "next/server";

import { webullBrokerConfigFromEnv } from "@/lib/broker/adapters/webullBrokerConnection";
import { cancelWebullOrder, getWebullOrderByClientId, listWebullAccounts } from "@/lib/broker/adapters/webullOrders";
import { webullOwnerGate, webullOwnerRefusal } from "@/lib/broker/webullOwner";
import { requireAuth } from "@/lib/requireAuth";
import { resolveWebullSessionToken, webullSessionStore, webullWorkerEnv } from "@/lib/marketData/webullSessionStore";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const CLIENT_ID = /^[A-Za-z0-9_-]{8,40}$/;

/** Session → the account the caller names by index. Called only after the owner gate. */
async function resolveAccount(request: Request) {
  const url = new URL(request.url);
  const idx = Number(url.searchParams.get("accountIndex"));
  const clientOrderId = url.searchParams.get("clientOrderId") ?? "";
  if (!Number.isInteger(idx) || !CLIENT_ID.test(clientOrderId)) {
    return { response: NextResponse.json({ state: "BAD_REQUEST", reason: "accountIndex and a client order id are required." }, { status: 400, headers: NO_STORE }) } as const;
  }
  const cfg = webullBrokerConfigFromEnv(process.env);
  if (!cfg.appKey || !cfg.appSecret) return { response: NextResponse.json({ state: "NOT_CONFIGURED" }, { headers: NO_STORE }) } as const;
  const session = await resolveWebullSessionToken(fetch, { appKey: cfg.appKey, appSecret: cfg.appSecret, apiHost: cfg.apiHost }, webullSessionStore(await webullWorkerEnv()));
  if (session.awaiting2fa || (!session.accessToken && !session.tokenless)) {
    return { response: NextResponse.json({ state: session.awaiting2fa ? "AWAITING_2FA" : "NO_SESSION", reason: session.note }, { headers: NO_STORE }) } as const;
  }
  const orderCfg = { appKey: cfg.appKey, appSecret: cfg.appSecret, apiHost: cfg.apiHost, accessToken: session.accessToken };
  const accounts = await listWebullAccounts(fetch, orderCfg);
  if (accounts.state !== "OK") return { response: NextResponse.json({ state: "ACCOUNTS_UNAVAILABLE", reason: accounts.reason }, { headers: NO_STORE }) } as const;
  const account = accounts.accounts[idx];
  if (!account) return { response: NextResponse.json({ state: "NO_SUCH_ACCOUNT" }, { status: 422, headers: NO_STORE }) } as const;
  return { response: null, orderCfg, accountId: account.accountId, clientOrderId } as const;
}

/** Garden 18 §LXXV: one order's state, read from Webull's exact record by our client id. */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const owner = webullOwnerGate(auth.user.sub, process.env);
  if (!owner.allowed) return NextResponse.json(webullOwnerRefusal(owner), { status: 403 });
  const r = await resolveAccount(request);
  if (r.response) return r.response;
  const found = await getWebullOrderByClientId(fetch, r.orderCfg, r.accountId, r.clientOrderId);
  return NextResponse.json(found, { headers: NO_STORE });
}

/** §LXXIX — exit easier than entry: request cancellation of one order by its client id. */
export async function DELETE(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const owner = webullOwnerGate(auth.user.sub, process.env);
  if (!owner.allowed) return NextResponse.json(webullOwnerRefusal(owner), { status: 403 });
  const r = await resolveAccount(request);
  if (r.response) return r.response;
  const result = await cancelWebullOrder(fetch, r.orderCfg, r.accountId, r.clientOrderId);
  return NextResponse.json(result, { headers: NO_STORE });
}
