import { NextResponse } from "next/server";

import { authorizeExecution } from "@/lib/authority/executionAuthority";
import { webullBrokerConfigFromEnv } from "@/lib/broker/adapters/webullBrokerConnection";
import { durableWebullOrderLedger } from "@/lib/broker/adapters/webullOrderLedger";
import {
  listWebullAccounts,
  parseOsi,
  previewWebullOrder,
  submitWebullOrderOnce,
  type WebullOrderIntent,
} from "@/lib/broker/adapters/webullOrders";
import { webullOwnerGate, webullOwnerRefusal } from "@/lib/broker/webullOwner";
import { webullPreviewScope } from "@/lib/broker/webullPreviewScope";
import { requireAuth } from "@/lib/requireAuth";
import { resolveWebullSessionToken, webullSessionStore, webullWorkerEnv } from "@/lib/marketData/webullSessionStore";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const POSITION_INTENTS = ["BUY_TO_OPEN", "BUY_TO_CLOSE", "SELL_TO_OPEN", "SELL_TO_CLOSE"] as const;

/**
 * POST /api/broker/webull/order-submit — A LIVE WEBULL ORDER (Garden 18
 * §LXXIII–§LXXX), sent only when the human presses the armed button. Real money.
 *
 * The firewall, in order:
 *   1. owner gate (STRICT: no WEBULL_OWNER_USER_ID, nobody);
 *   2. class before contact: a US equity, or a single-leg option named by its
 *      OSI contract with an explicit open/close intent on an eligible underlying;
 *   3. executionAuthority: live = the human's approval in THIS request
 *      (`confirmLive: true`); an automated source cannot self-authorize;
 *   4. the account the trader NAMED (by index) — never defaulted for money;
 *   5. a DURABLE ledger (KV) — refused without one, never memory for money;
 *   6. Webull's own preview must accept the order immediately before placing;
 *   7. submitWebullOrderOnce: ledger-first, place once, reconcile an UNKNOWN
 *      by the client's own idempotency key before any resend.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const owner = webullOwnerGate(auth.user.sub, process.env);
  if (!owner.allowed) return NextResponse.json(webullOwnerRefusal(owner), { status: 403 });

  let input: Record<string, unknown>;
  try { input = (await request.json()) as Record<string, unknown>; } catch { return NextResponse.json({ state: "BAD_REQUEST", reason: "Body must be JSON." }, { status: 400 }); }

  const osiIn = typeof input.optionOsi === "string" ? input.optionOsi : null;
  const contract = osiIn ? parseOsi(osiIn) : null;
  const positionIntent = POSITION_INTENTS.find(p => p === input.positionIntent) ?? null;
  if (osiIn !== null && (!contract || !positionIntent)) {
    return NextResponse.json({ state: "REFUSED_LOCAL", reason: !contract ? `"${osiIn}" is not an OSI option contract.` : "An option order must say whether it opens or closes." }, { status: 422, headers: NO_STORE });
  }
  const symbolIn = contract ? contract.underlying : typeof input.symbol === "string" ? input.symbol : "";
  const scope = webullPreviewScope(symbolIn);
  if (!scope.eligible) return NextResponse.json({ state: "REFUSED_LOCAL", reason: scope.refusal }, { status: 422, headers: NO_STORE });
  if (!Number.isInteger(input.accountIndex)) return NextResponse.json({ state: "REFUSED_LOCAL", reason: "A live order names its account explicitly." }, { status: 422, headers: NO_STORE });

  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const qty = num(input.qty) ?? 0;
  const side = positionIntent ? (positionIntent.startsWith("BUY") ? "buy" : "sell") : input.side === "sell" ? "sell" : "buy";
  const authority = authorizeExecution({
    intent: { symbol: osiIn ?? symbolIn, side, qty },
    source: "human",
    env: "live",
    rightOfWay: "ACTION",
    humanApproval: input.confirmLive === true ? { approved: true, approvedBy: auth.user.sub } : null,
  });
  if (!authority.authorized) return NextResponse.json({ state: "NOT_AUTHORIZED", reason: authority.reason, code: authority.reasonCode }, { status: 403, headers: NO_STORE });

  const env = await webullWorkerEnv();
  const ledger = durableWebullOrderLedger(env);
  if (!ledger) return NextResponse.json({ state: "NO_DURABLE_LEDGER", reason: "Live Webull orders need the durable order ledger (KV binding WEBULL_SESSION); none is bound here, so nothing is sent." }, { headers: NO_STORE });

  const cfg = webullBrokerConfigFromEnv(process.env);
  if (!cfg.appKey || !cfg.appSecret) return NextResponse.json({ state: "NOT_CONFIGURED", reason: "Webull App Key and App Secret are not configured." }, { headers: NO_STORE });
  const session = await resolveWebullSessionToken(fetch, { appKey: cfg.appKey, appSecret: cfg.appSecret, apiHost: cfg.apiHost }, webullSessionStore(env));
  if (session.awaiting2fa || (!session.accessToken && !session.tokenless)) {
    return NextResponse.json({ state: session.awaiting2fa ? "AWAITING_2FA" : "NO_SESSION", reason: session.note }, { headers: NO_STORE });
  }
  const orderCfg = { appKey: cfg.appKey, appSecret: cfg.appSecret, apiHost: cfg.apiHost, accessToken: session.accessToken };

  const accounts = await listWebullAccounts(fetch, orderCfg);
  if (accounts.state !== "OK") return NextResponse.json({ state: "ACCOUNTS_UNAVAILABLE", reason: accounts.reason }, { headers: NO_STORE });
  const account = accounts.accounts[input.accountIndex as number];
  if (!account) return NextResponse.json({ state: "NO_SUCH_ACCOUNT" }, { status: 422, headers: NO_STORE });
  const tail = account.accountId.slice(-4);

  const intent: WebullOrderIntent = {
    clientOrderId: typeof input.clientOrderId === "string" ? input.clientOrderId : "",
    decisionId: typeof input.decisionId === "string" ? input.decisionId : "",
    accountId: account.accountId,
    symbol: symbolIn,
    side,
    type: input.type === "market" ? "market" : "limit",
    qty,
    limitPx: num(input.limitPx),
    tif: input.tif === "gtc" ? "gtc" : "day",
    assetClass: contract ? "option" : scope.orderAssetClass,
    ...(contract && positionIntent ? { option: { ...contract, positionIntent } } : {}),
  };

  // Webull's own validation, immediately before money: a refused preview places nothing.
  const preview = await previewWebullOrder(fetch, orderCfg, intent);
  if (preview.state !== "PREVIEWED") {
    return NextResponse.json({ state: "PREVIEW_FAILED", reason: preview.reason, account: tail }, { status: 422, headers: NO_STORE });
  }

  const result = await submitWebullOrderOnce(fetch, { ...orderCfg, liveOrdersEnabled: true }, ledger, intent);
  return NextResponse.json({ state: result.outcome, reason: result.note, clientOrderId: result.clientOrderId, brokerOrderId: result.brokerOrderId, sent: result.sent, account: tail }, { headers: NO_STORE });
}
