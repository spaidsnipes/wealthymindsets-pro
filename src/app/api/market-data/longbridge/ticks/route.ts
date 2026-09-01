import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { readLongbridgeTicks } from "@/lib/marketData/adapters/longbridgeTicks";

export const dynamic = "force-dynamic";
const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,14}$/;

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const symbol = (request.nextUrl.searchParams.get("symbol") || "TSLA").trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) return NextResponse.json({ source: "longbridge", label: "UNKNOWN", detail: "Pass one supported symbol.", eventCount: 0, events: [] }, { status: 400 });
  const providerCode = symbol.includes(".") ? symbol : `${symbol}.US`;
  const appSymbol = providerCode.replace(/\.[A-Z]{2,3}$/i, "");
  const { status, events } = await readLongbridgeTicks(fetch, {
    bridgeUrl: process.env.LONGBRIDGE_BRIDGE_URL,
    bridgeToken: process.env.LONGBRIDGE_BRIDGE_TOKEN,
  }, { providerCode, appSymbol });
  return NextResponse.json({ source: "longbridge", ...status, symbol: appSymbol, providerCode, events }, { headers: { "Cache-Control": "no-store" } });
}
