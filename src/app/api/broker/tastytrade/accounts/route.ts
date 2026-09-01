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
    // Monday Test 2 truth: name the exact missing var(s). Status stays 200 so
    // the calling UI still gets a safe empty accounts list; body enrichment
    // exposes the honest edge + missing NAMES to any inspector.
    const missing: string[] = [];
    if (!cfg.hasClientSecret) missing.push("TASTYTRADE_CLIENT_SECRET");
    if (!cfg.hasRefreshToken) missing.push("TASTYTRADE_REFRESH_TOKEN");
    return NextResponse.json(
      {
        error: `Tastytrade accounts is NOT CONFIGURED on this host runtime — missing required ${missing.length === 1 ? "variable" : "variables"}: ${missing.join(", ")}. Set them in the host runtime secrets (e.g. Cloudflare) and redeploy.`,
        edge: "NOT CONFIGURED",
        missing,
        accounts: [],
      },
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
