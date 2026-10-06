import { NextRequest, NextResponse } from "next/server";

import { brokerOwnerRefusal, tastytradeOwnerGate } from "@/lib/broker/brokerOwner";
import { checkRateLimit } from "@/lib/rateLimit";
import { TASTY_READ_LIMIT } from "@/lib/broker/brokerReadLimit";
import { requireAuth } from "@/lib/requireAuth";
import { getTastytradeQuoteToken, tastytradeConfigStatus } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

/** Garden 18 §LI — the owner's DXLink quote token, so ONE stream owner in the browser can open tastytrade's market-data socket. */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const owner = tastytradeOwnerGate(auth.user.sub, process.env);
  if (!owner.allowed) return NextResponse.json(brokerOwnerRefusal(owner), { status: 403, headers: { "Cache-Control": "no-store" } });
  // P0.1: a runaway client loop must not hammer the owner's broker session.
  { const rl = checkRateLimit(`tasty-quote-token:${auth.user.sub}`, TASTY_READ_LIMIT); if (!rl.ok) return rl.response; }
  if (!tastytradeConfigStatus().configured) return NextResponse.json({ state: "NOT_CONFIGURED" }, { headers: { "Cache-Control": "no-store" } });
  try {
    const t = await getTastytradeQuoteToken();
    return NextResponse.json({ state: "OK", ...t }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ state: "QUOTE_TOKEN_UNAVAILABLE", reason: e instanceof Error ? e.message : "unknown" }, { headers: { "Cache-Control": "no-store" } });
  }
}
