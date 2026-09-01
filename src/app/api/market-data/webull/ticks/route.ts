import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { fetchWebullTickSnapshot } from "@/lib/marketData/adapters/webullMarketData";

export const dynamic = "force-dynamic";

const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.-]{0,14}$/;

/**
 * Bounded authenticated read path for Webull stock prints.
 * This route cannot access accounts or submit, modify, or cancel orders.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const symbol = (request.nextUrl.searchParams.get("symbol") || "TSLA").trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) {
    return NextResponse.json(
      { source: "webull", state: "INVALID_SYMBOL", fidelity: "NONE", symbol, ticks: [], note: "Pass one US stock symbol." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = await fetchWebullTickSnapshot(fetch, {
    appKey: process.env.WEBULL_API_KEY || undefined,
    appSecret: process.env.WEBULL_API_SECRET || undefined,
    accessToken: process.env.WEBULL_ACCESS_TOKEN || undefined,
    apiHost: process.env.WEBULL_API_HOST || undefined,
    canarySymbol: symbol,
  });
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
