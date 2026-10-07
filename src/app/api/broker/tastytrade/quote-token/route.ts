import { NextRequest, NextResponse } from "next/server";

import { brokerOwnerRefusal } from "@/lib/broker/brokerOwner";
import { resolveTastyLane } from "@/lib/broker/tastyMemberLane";
import { checkRateLimit } from "@/lib/rateLimit";
import { TASTY_READ_LIMIT } from "@/lib/broker/brokerReadLimit";
import { requireAuth } from "@/lib/requireAuth";
import { getTastytradeQuoteToken, tastytradeConfigStatus } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

/**
 * Garden 18 §LI — the DXLink quote token, so ONE stream owner in the browser can
 * open tastytrade's market-data socket. Owner → the deployment's token
 * (tastytradeOwnerGate, unchanged). A member with their OWN connected
 * tastytrade → a token minted from THEIR grant, carrying THEIR entitlement
 * (MEMBER-BROKER-CONNECT.md). Anyone else → the owner refusal (403).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const who = await resolveTastyLane(auth.user.sub);
  if (who.kind === "REFUSED") return NextResponse.json(brokerOwnerRefusal(who.gate), { status: 403, headers: { "Cache-Control": "no-store" } });
  // P0.1: a runaway client loop must not hammer the owner's broker session.
  { const rl = checkRateLimit(`tasty-quote-token:${auth.user.sub}`, TASTY_READ_LIMIT); if (!rl.ok) return rl.response; }
  if (who.kind === "OWNER" && !tastytradeConfigStatus().configured) return NextResponse.json({ state: "NOT_CONFIGURED" }, { headers: { "Cache-Control": "no-store" } });
  try {
    const t = await getTastytradeQuoteToken(who.kind === "MEMBER" ? who.lane : undefined);
    return NextResponse.json({ state: "OK", ...t, lane: who.kind }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ state: "QUOTE_TOKEN_UNAVAILABLE", reason: e instanceof Error ? e.message : "unknown" }, { headers: { "Cache-Control": "no-store" } });
  }
}
