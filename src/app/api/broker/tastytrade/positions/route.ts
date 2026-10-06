import { NextRequest, NextResponse } from "next/server";

import { brokerOwnerRefusal, tastytradeOwnerGate } from "@/lib/broker/brokerOwner";
import { checkRateLimit } from "@/lib/rateLimit";
import { TASTY_READ_LIMIT } from "@/lib/broker/brokerReadLimit";
import { requireAuth } from "@/lib/requireAuth";
import { getTastytradeAccounts, getTastytradePositions, tastytradeConfigStatus } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

/** Garden 18 §XCVI/§XCVIII — the owner's tastytrade positions, per account, from tastytrade (never browser memory). */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const owner = tastytradeOwnerGate(auth.user.sub, process.env);
  if (!owner.allowed) return NextResponse.json(brokerOwnerRefusal(owner), { status: 403, headers: { "Cache-Control": "no-store" } });
  // P0.1: a runaway client loop must not hammer the owner's broker session.
  { const rl = checkRateLimit(`tasty-positions:${auth.user.sub}`, TASTY_READ_LIMIT); if (!rl.ok) return rl.response; }
  if (!tastytradeConfigStatus().configured) return NextResponse.json({ state: "NOT_CONFIGURED", accounts: [] }, { headers: { "Cache-Control": "no-store" } });
  try {
    const accounts = await getTastytradeAccounts();
    const out = [];
    for (const a of accounts) {
      try {
        out.push({ tail: a.accountNumber.slice(-4), accountType: a.accountType ?? null, state: "READ", positions: await getTastytradePositions(a.accountNumber) });
      } catch (e) {
        out.push({ tail: a.accountNumber.slice(-4), accountType: a.accountType ?? null, state: "UNREADABLE", reason: e instanceof Error ? e.message : "unknown" });
      }
    }
    return NextResponse.json({ state: "OK", accounts: out, asOf: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ state: "CONNECTION_FAILED", reason: e instanceof Error ? e.message : "unknown" }, { headers: { "Cache-Control": "no-store" } });
  }
}
