import { NextRequest, NextResponse } from "next/server";

import { brokerOwnerRefusal, tastytradeOwnerGate } from "@/lib/broker/brokerOwner";
import { readTastytradeOrder } from "@/lib/broker/tastytradeOrderState";
import { requireAuth } from "@/lib/requireAuth";
import { cancelTastytradeOrder, getTastytradeAccounts, getTastytradeLiveOrders, tastytradeConfigStatus } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Garden 18 §LXXV/§LXXVI — today's tastytrade orders per account,
 * in WM order states, from the broker (never browser memory). Orders placed in
 * tastytrade's own app reconcile here too.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const owner = tastytradeOwnerGate(auth.user.sub, process.env);
  if (!owner.allowed) return NextResponse.json(brokerOwnerRefusal(owner), { status: 403, headers: NO_STORE });
  if (!tastytradeConfigStatus().configured) return NextResponse.json({ state: "NOT_CONFIGURED", accounts: [] }, { headers: NO_STORE });
  try {
    const accounts = await getTastytradeAccounts();
    const out = [];
    for (const [index, a] of accounts.entries()) {
      try {
        out.push({ index, tail: a.accountNumber.slice(-4), state: "READ", orders: (await getTastytradeLiveOrders(a.accountNumber)).map(readTastytradeOrder).filter(Boolean) });
      } catch (e) {
        out.push({ index, tail: a.accountNumber.slice(-4), state: "UNREADABLE", reason: e instanceof Error ? e.message : "unknown", orders: [] });
      }
    }
    return NextResponse.json({ state: "OK", accounts: out, asOf: new Date().toISOString() }, { headers: NO_STORE });
  } catch (e) {
    return NextResponse.json({ state: "CONNECTION_FAILED", reason: e instanceof Error ? e.message : "unknown" }, { headers: NO_STORE });
  }
}

/** §LXXIX — exit easier than entry: cancel one working order (`?accountIndex=&id=`). Owner only. */
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const owner = tastytradeOwnerGate(auth.user.sub, process.env);
  if (!owner.allowed) return NextResponse.json(brokerOwnerRefusal(owner), { status: 403, headers: NO_STORE });
  if (!tastytradeConfigStatus().configured) return NextResponse.json({ state: "NOT_CONFIGURED" }, { headers: NO_STORE });
  const idx = Number(req.nextUrl.searchParams.get("accountIndex"));
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!Number.isInteger(idx) || !/^\d+$/.test(id)) return NextResponse.json({ state: "BAD_REQUEST", reason: "accountIndex and a numeric order id are required." }, { status: 400, headers: NO_STORE });
  try {
    const account = (await getTastytradeAccounts())[idx];
    if (!account) return NextResponse.json({ state: "NO_SUCH_ACCOUNT" }, { status: 422, headers: NO_STORE });
    const order = readTastytradeOrder(await cancelTastytradeOrder(account.accountNumber, id));
    return NextResponse.json({ state: order?.state ?? "UNKNOWN", order }, { headers: NO_STORE });
  } catch (e) {
    return NextResponse.json({ state: "CANCEL_FAILED", reason: e instanceof Error ? e.message : "unknown" }, { headers: NO_STORE });
  }
}
