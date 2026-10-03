import { NextRequest, NextResponse } from "next/server";

import { brokerOwnerRefusal, tastytradeOwnerGate } from "@/lib/broker/brokerOwner";
import { readTastytradeFills } from "@/lib/broker/tastytradeFills";
import { buildTtRoundTrips, summarizeTtLedger } from "@/lib/broker/tastytradeLedger";
import { requireAuth } from "@/lib/requireAuth";
import { getTastytradeAccounts, getTastytradeTradeHistory, tastytradeConfigStatus } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/broker/tastytrade/ledger?since=YYYY-MM-DD — the tastytrade side of
 * the Lifetime Ledger (Garden 18 v2 §29/§36). READ ONLY, owner only. Round
 * trips are built from tastytrade's own trade transactions (its cash, its
 * fees); accounts are reported by their last four digits only.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const owner = tastytradeOwnerGate(auth.user.sub, process.env);
  if (!owner.allowed) return NextResponse.json(brokerOwnerRefusal(owner), { status: 403, headers: NO_STORE });
  if (!tastytradeConfigStatus().configured) return NextResponse.json({ state: "NOT_CONFIGURED" }, { headers: NO_STORE });
  const since = req.nextUrl.searchParams.get("since") ?? "2020-01-01";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) return NextResponse.json({ state: "BAD_REQUEST", reason: "since must be YYYY-MM-DD." }, { status: 400, headers: NO_STORE });
  try {
    const accounts = await getTastytradeAccounts();
    const out = [];
    for (const a of accounts) {
      const tail = a.accountNumber.slice(-4);
      try {
        const h = await getTastytradeTradeHistory(a.accountNumber, since);
        const fills = readTastytradeFills(h.items);
        const trips = buildTtRoundTrips(fills);
        out.push({ tail, state: "READ", fills: fills.length, pages: h.pages, truncated: h.truncated, trips, summary: summarizeTtLedger(trips) });
      } catch (e) {
        out.push({ tail, state: "UNREADABLE", reason: e instanceof Error ? e.message : "unknown" });
      }
    }
    return NextResponse.json({ state: "OK", since, accounts: out, asOf: new Date().toISOString() }, { headers: NO_STORE });
  } catch (e) {
    return NextResponse.json({ state: "CONNECTION_FAILED", reason: e instanceof Error ? e.message : "unknown" }, { headers: NO_STORE });
  }
}
