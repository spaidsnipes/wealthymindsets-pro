import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { brokerOwnerRefusal, tastytradeOwnerGate } from "@/lib/broker/brokerOwner";
import { TT_ACTIONS, TT_INSTRUMENT_TYPES, osiToTastytrade, toTastytradeOrder } from "@/lib/broker/tastytradeOrder";
import { requireAuth } from "@/lib/requireAuth";
import { dryRunTastytradeOrder, getTastytradeAccounts, tastytradeConfigStatus } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

/**
 * Garden 18 §XCII–§XCV / §CXXIV — PREFLIGHT ON TASTYTRADE, PLACING NOTHING.
 * tastytrade's documented dry-run validates the order against the real
 * account (buying-power effect, fees, warnings, or a 422 reason). The WM
 * intent is mapped by toTastytradeOrder, so a continuous futures symbol, a
 * moved option row or a bare "BTC" is refused locally before any call.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const owner = tastytradeOwnerGate(auth.user.sub, process.env);
  if (!owner.allowed) return NextResponse.json(brokerOwnerRefusal(owner), { status: 403, headers: { "Cache-Control": "no-store" } });
  if (!tastytradeConfigStatus().configured) return NextResponse.json({ state: "NOT_CONFIGURED" }, { headers: { "Cache-Control": "no-store" } });
  let input: Record<string, unknown>;
  try { input = (await req.json()) as Record<string, unknown>; } catch { return NextResponse.json({ state: "BAD_REQUEST", reason: "Body must be JSON." }, { status: 400 }); }

  const instrumentType = TT_INSTRUMENT_TYPES.find(t => t === input.instrumentType);
  const action = TT_ACTIONS.find(a => a === input.action);
  const rawSymbol = typeof input.symbol === "string" ? input.symbol : "";
  const symbol = instrumentType === "Equity Option" && typeof input.optionOsi === "string" ? osiToTastytrade(input.optionOsi) ?? "" : rawSymbol;
  if (!instrumentType || !action) return NextResponse.json({ state: "REFUSED_LOCAL", reason: "instrumentType and action are required." }, { status: 422 });
  const mapped = toTastytradeOrder({
    instrumentType, action, symbol,
    qty: typeof input.qty === "number" ? input.qty : 0,
    type: input.type === "Market" ? "Market" : "Limit",
    limitPx: typeof input.limitPx === "number" ? input.limitPx : undefined,
    decisionId: typeof input.decisionId === "string" ? input.decisionId : "",
    clientOrderId: randomUUID().replace(/-/g, ""),
  });
  if (!mapped.ok) return NextResponse.json({ state: "REFUSED_LOCAL", reason: mapped.reason }, { status: 422, headers: { "Cache-Control": "no-store" } });

  try {
    const accounts = await getTastytradeAccounts();
    const index = Number.isInteger(input.accountIndex) ? (input.accountIndex as number) : 0;
    const choices = accounts.map((a, i) => ({ index: i, accountType: a.accountType ?? null, tail: a.accountNumber.slice(-4), futuresApproved: a.isFuturesApproved ?? null }));
    const account = accounts[index];
    if (!account) return NextResponse.json({ state: "NO_SUCH_ACCOUNT", accounts: choices }, { headers: { "Cache-Control": "no-store" } });
    const result = await dryRunTastytradeOrder(account.accountNumber, mapped.order);
    return NextResponse.json({ state: "DRY_RUN_OK", result, accounts: choices, accountIndex: index, order: mapped.order }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ state: "REJECTED", reason: e instanceof Error ? e.message : "unknown" }, { headers: { "Cache-Control": "no-store" } });
  }
}
