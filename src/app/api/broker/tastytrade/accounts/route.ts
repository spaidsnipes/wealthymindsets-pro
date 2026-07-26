import { NextRequest, NextResponse } from "next/server";
import { getTastytradeAccounts, tastytradeConfigStatus } from "@/lib/tastytrade";
import { getAuthToken, verifyJWT } from "@/lib/auth";

// Server-only. Returns the authenticated customer's tastytrade accounts
// (account numbers + metadata). No tokens/secrets. (Company Bible §30/§32.)
// GATED behind a valid WM session — account numbers must not be public.
export async function GET(req: NextRequest) {
  const token = getAuthToken(req);
  if (!token || !verifyJWT(token)) {
    return NextResponse.json({ error: "Unauthorized", accounts: [] }, { status: 401 });
  }
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
