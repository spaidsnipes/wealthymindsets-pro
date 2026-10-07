import { NextRequest, NextResponse } from "next/server";

import { authorizeExecution } from "@/lib/authority/executionAuthority";
import { brokerOwnerRefusal, tastytradeOwnerGate } from "@/lib/broker/brokerOwner";
import { TT_ACTIONS, TT_INSTRUMENT_TYPES, osiToTastytrade, toTastytradeOrder } from "@/lib/broker/tastytradeOrder";
import { readTastytradeOrder } from "@/lib/broker/tastytradeOrderState";
import { orderDecisionKv, putOrderDecision } from "@/lib/broker/orderDecisionLedger";
import { preflightLiveOrder, type ServerOrderLimits } from "@/lib/execution/liveOrderPreflight";
import { loadServerOrderLimits } from "@/lib/execution/serverOrderLimitsStore";
import { requireAuth } from "@/lib/requireAuth";
import { webullWorkerEnv } from "@/lib/marketData/webullSessionStore";
import {
  dryRunTastytradeOrder,
  getTastytradeAccounts,
  getTastytradeLiveOrders,
  submitTastytradeOrder,
  tastytradeConfigStatus,
} from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Garden 18 §LXXIII–§LXXX — A LIVE TASTYTRADE ORDER, sent only when the human
 * presses the armed button. Real money.
 *
 * The execution firewall, in order, before anything reaches the broker:
 *   1. owner gate (one user's brokerage is never another's);
 *   2. the WM intent maps to tastytrade's documented order (specific contract,
 *      Decision_ID, idempotency key) or is refused locally;
 *   3. executionAuthority: a live order is HIGH_IMPACT and needs the human's
 *      explicit approval in THIS request (`confirmLive: true`);
 *   3b. Garden 19 §23 / P0.3: the SERVER-HELD limits (liveOrderPreflight):
 *      kill switch, server arm (default DISARMED), every applicable cap set
 *      and held (quantity, notional, loss at the protective stop), the
 *      environment the ticket showed equals the server's, a dated contract,
 *      a fresh quote for risk-increasing orders, verified protection for
 *      opening orders, unsupported products refused;
 *   4. the account is the one the trader named — never silently moved — and a
 *      futures order to a non-futures account is refused in words;
 *   5. duplicate protection: an order already at tastytrade with this
 *      external-identifier is returned, never sent twice;
 *   6. tastytrade's own dry run must pass immediately before submission.
 *
 * Only a failure DURING submission answers UNKNOWN (it may have been placed);
 * the client then reconciles by external-identifier before any resend.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const owner = tastytradeOwnerGate(auth.user.sub, process.env);
  if (!owner.allowed) return NextResponse.json(brokerOwnerRefusal(owner), { status: 403, headers: NO_STORE });
  if (!tastytradeConfigStatus().configured) return NextResponse.json({ state: "NOT_CONFIGURED" }, { headers: NO_STORE });
  let input: Record<string, unknown>;
  try { input = (await req.json()) as Record<string, unknown>; } catch { return NextResponse.json({ state: "BAD_REQUEST", reason: "Body must be JSON." }, { status: 400 }); }

  const instrumentType = TT_INSTRUMENT_TYPES.find(t => t === input.instrumentType);
  const action = TT_ACTIONS.find(a => a === input.action);
  const rawSymbol = typeof input.symbol === "string" ? input.symbol : "";
  const symbol = instrumentType === "Equity Option" && typeof input.optionOsi === "string" ? osiToTastytrade(input.optionOsi) ?? "" : rawSymbol;
  if (!instrumentType || !action) return NextResponse.json({ state: "REFUSED_LOCAL", reason: "instrumentType and action are required." }, { status: 422, headers: NO_STORE });
  if (!Number.isInteger(input.accountIndex)) return NextResponse.json({ state: "REFUSED_LOCAL", reason: "A live order names its account explicitly." }, { status: 422, headers: NO_STORE });
  const clientOrderId = typeof input.clientOrderId === "string" ? input.clientOrderId : "";
  const qty = typeof input.qty === "number" ? input.qty : 0;
  const mapped = toTastytradeOrder({
    instrumentType, action, symbol, qty,
    type: input.type === "Market" || input.type === "Stop" || input.type === "Stop Limit" ? input.type : "Limit",
    stopPx: typeof input.stopPx === "number" ? input.stopPx : undefined,
    tif: input.tif === "GTC" ? "GTC" : "Day",
    limitPx: typeof input.limitPx === "number" ? input.limitPx : undefined,
    decisionId: typeof input.decisionId === "string" ? input.decisionId : "",
    clientOrderId,
  });
  if (!mapped.ok) return NextResponse.json({ state: "REFUSED_LOCAL", reason: mapped.reason }, { status: 422, headers: NO_STORE });

  const authority = authorizeExecution({
    intent: { symbol, side: action.startsWith("Buy") ? "buy" : "sell", qty },
    source: "human",
    env: "live",
    rightOfWay: "ACTION",
    humanApproval: input.confirmLive === true ? { approved: true, approvedBy: auth.user.sub } : null,
  });
  if (!authority.authorized) return NextResponse.json({ state: "NOT_AUTHORIZED", reason: authority.reason, code: authority.reasonCode }, { status: 403, headers: NO_STORE });

  // Garden 19 §23 / P0.3 — the SERVER-HELD limits and kill switch, read on every
  // send. No store, nothing stored, or any refusal → nothing reaches tastytrade.
  let limits: ServerOrderLimits | null = null;
  try {
    limits = await loadServerOrderLimits(orderDecisionKv(await webullWorkerEnv()), auth.user.sub);
  } catch {
    limits = null;
  }
  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const q = (input.quote ?? null) as Record<string, unknown> | null;
  const preflight = preflightLiveOrder({
    instrumentType, symbol, action, qty, type: mapped.order["order-type"],
    limitPx: num(input.limitPx), stopPx: num(input.stopPx), protectiveStopPx: num(input.protectiveStopPx),
    environment: input.environment === "production" || input.environment === "cert" ? input.environment : null,
    accountIndex: input.accountIndex as number,
    quote: q && typeof q === "object" ? { bid: num(q.bid), ask: num(q.ask), atMs: num(q.atMs) } : null,
    multiplier: num(input.multiplier),
  }, { limits, serverEnvironment: tastytradeConfigStatus().env === "cert" ? "cert" : "production", nowMs: Date.now() });
  if (!preflight.ok) {
    const first = preflight.refusals[0]!;
    const state = first.code === "KILL_SWITCH" ? "KILL_SWITCH" : first.code === "LIMITS_UNSET" ? "LIMITS_UNSET" : "REFUSED_PREFLIGHT";
    return NextResponse.json({ state, reason: preflight.refusals.map(r => r.reason).join(" "), refusals: preflight.refusals }, { status: 422, headers: NO_STORE });
  }

  let accountNumber: string;
  let tail: string;
  try {
    const accounts = await getTastytradeAccounts();
    const account = accounts[input.accountIndex as number];
    if (!account) return NextResponse.json({ state: "NO_SUCH_ACCOUNT" }, { status: 422, headers: NO_STORE });
    accountNumber = account.accountNumber;
    tail = accountNumber.slice(-4);
    if ((instrumentType === "Future" || instrumentType === "Future Option") && account.isFuturesApproved !== true) {
      return NextResponse.json({ state: "REFUSED_LOCAL", reason: `Account …${tail} is not futures-enabled at tastytrade. Choose a futures-eligible account.` }, { status: 422, headers: NO_STORE });
    }
    const existing = (await getTastytradeLiveOrders(accountNumber)).map(readTastytradeOrder).find(o => o?.externalId === clientOrderId);
    if (existing) return NextResponse.json({ state: "ALREADY_SENT", order: existing, account: tail }, { headers: NO_STORE });
  } catch (e) {
    return NextResponse.json({ state: "NOT_SENT", reason: `Could not read the account before sending: ${e instanceof Error ? e.message : "unknown"}` }, { headers: NO_STORE });
  }

  // §XC: the order → Decision_ID link the Journal groups broker truth by.
  // Best effort — a journal link never blocks or alters the order itself.
  const recordDecision = async () => {
    try {
      const kv = orderDecisionKv(await webullWorkerEnv());
      if (!kv) return;
      await putOrderDecision(kv, {
        broker: "tastytrade", clientOrderId, decisionId: typeof input.decisionId === "string" ? input.decisionId : "",
        instrumentType, symbol, action, qty, limitPx: typeof input.limitPx === "number" ? input.limitPx : null,
        accountTail: tail, sentAtMs: Date.now(),
      });
    } catch { /* the journal link is not the order */ }
  };

  try {
    const dry = (await dryRunTastytradeOrder(accountNumber, mapped.order)) as { errors?: unknown[] } | null;
    if (Array.isArray(dry?.errors) && dry.errors.length) return NextResponse.json({ state: "DRY_RUN_FAILED", result: dry, account: tail }, { status: 422, headers: NO_STORE });
  } catch (e) {
    return NextResponse.json({ state: "DRY_RUN_FAILED", reason: e instanceof Error ? e.message : "unknown", account: tail }, { status: 422, headers: NO_STORE });
  }

  try {
    const placed = (await submitTastytradeOrder(accountNumber, mapped.order)) as { order?: unknown; warnings?: unknown[] } | null;
    const order = readTastytradeOrder(placed?.order);
    await recordDecision();
    return NextResponse.json({ state: order ? "ACKNOWLEDGED" : "UNKNOWN", order, warnings: placed?.warnings ?? [], account: tail, sent: mapped.order }, { headers: NO_STORE });
  } catch (e) {
    // A thrown submit is NOT proof nothing was placed: the client reconciles by
    // external-identifier through /orders before allowing another send. The
    // decision link is written anyway, so the journal can claim the order if
    // tastytrade did take it.
    await recordDecision();
    return NextResponse.json({ state: "UNKNOWN", reason: e instanceof Error ? e.message : "unknown", reconcileBy: clientOrderId, account: tail }, { headers: NO_STORE });
  }
}
