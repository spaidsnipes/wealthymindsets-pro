import { NextRequest, NextResponse } from "next/server";
import { getTastytradeAccounts, tastytradeConfigStatus } from "@/lib/tastytrade";
import { requireAuth } from "@/lib/requireAuth";

// Server-only. Returns the authenticated customer's tastytrade accounts
// (account numbers + metadata). No tokens/secrets. (Company Bible §30/§32.)
// GATED behind a valid WM session — account numbers must not be public.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const cfg = tastytradeConfigStatus();
  if (!cfg.configured) {
    return NextResponse.json(
      { error: "tastytrade not configured", accounts: [] },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const accounts = await getTastytradeAccounts();
    return NextResponse.json({ accounts }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load tastytrade accounts", accounts: [] },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
