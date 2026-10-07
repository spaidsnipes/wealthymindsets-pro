import { NextRequest, NextResponse } from "next/server";

import { brokerOwnerRefusal } from "@/lib/broker/brokerOwner";
import { resolveTastyLane } from "@/lib/broker/tastyMemberLane";
import { checkRateLimit } from "@/lib/rateLimit";
import { TASTY_READ_LIMIT } from "@/lib/broker/brokerReadLimit";
import { requireAuth } from "@/lib/requireAuth";
import { getTastytradeFutures, getTastytradeFuturesOptionChain, getTastytradeOptionChain, tastytradeConfigStatus } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

/**
 * Garden 18 §LXXVIII–§LXXXI — tastytrade chains for the owner (tastytradeOwnerGate,
 * via resolveTastyLane) or for a member through THEIR OWN connected grant:
 *   ?symbol=TSLA         equity option chain (nested)
 *   ?futures=MNQ         the product's specific futures contracts (never a continuous symbol)
 *   ?futuresOptions=MNQ  the futures-option chain (nested)
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const who = await resolveTastyLane(auth.user.sub);
  if (who.kind === "REFUSED") return NextResponse.json(brokerOwnerRefusal(who.gate), { status: 403, headers: { "Cache-Control": "no-store" } });
  const lane = who.kind === "MEMBER" ? who.lane : undefined;
  // P0.1: a runaway client loop must not hammer the owner's broker session.
  { const rl = checkRateLimit(`tasty-chain:${auth.user.sub}`, TASTY_READ_LIMIT); if (!rl.ok) return rl.response; }
  if (who.kind === "OWNER" && !tastytradeConfigStatus().configured) return NextResponse.json({ state: "NOT_CONFIGURED" }, { headers: { "Cache-Control": "no-store" } });
  const q = req.nextUrl.searchParams;
  const ok = (v: string | null) => (v && /^[A-Z0-9/.]{1,12}$/.test(v.toUpperCase()) ? v.toUpperCase() : null);
  try {
    const sym = ok(q.get("symbol")), fut = ok(q.get("futures")), fop = ok(q.get("futuresOptions"));
    if (sym) return NextResponse.json({ state: "OK", kind: "EQUITY_OPTIONS", symbol: sym, data: await getTastytradeOptionChain(sym, lane) }, { headers: { "Cache-Control": "no-store" } });
    if (fut) return NextResponse.json({ state: "OK", kind: "FUTURES", product: fut, data: await getTastytradeFutures(fut.replace(/^\//, ""), lane) }, { headers: { "Cache-Control": "no-store" } });
    if (fop) return NextResponse.json({ state: "OK", kind: "FUTURES_OPTIONS", product: fop, data: await getTastytradeFuturesOptionChain(fop.replace(/^\//, ""), lane) }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ state: "BAD_REQUEST", reason: "Pass ?symbol=, ?futures= or ?futuresOptions=." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ state: "PROVIDER_REFUSED", reason: e instanceof Error ? e.message : "unknown" }, { headers: { "Cache-Control": "no-store" } });
  }
}
