import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { operatorOnly } from "@/lib/operatorOnly";
import { readLongbridgeTicks } from "@/lib/marketData/adapters/longbridgeTicks";

export const dynamic = "force-dynamic";
const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,14}$/;

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  // The operator's own bridge / credentials, like Webull's lane (guest audit 2026-10-04).
  { const refusal = operatorOnly(auth.user.sub); if (refusal) return refusal; }
  // NO DEFAULT — see the moomoo tick route for the measured substitution.
  const requested = request.nextUrl.searchParams.get("symbol");
  const symbol = (requested ?? "").trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) {
    return NextResponse.json({
      source: "longbridge",
      label: "UNKNOWN",
      detail: symbol === ""
        ? "No symbol was requested. This route reads prints for ONE named instrument and will not substitute a default — pass ?symbol=."
        : "Pass one supported symbol.",
      eventCount: 0,
      events: [],
    }, { status: 400 });
  }
  const providerCode = symbol.includes(".") ? symbol : `${symbol}.US`;
  const appSymbol = providerCode.replace(/\.[A-Z]{2,3}$/i, "");
  const { status, events } = await readLongbridgeTicks(fetch, {
    bridgeUrl: process.env.LONGBRIDGE_BRIDGE_URL,
    bridgeToken: process.env.LONGBRIDGE_BRIDGE_TOKEN,
  }, { providerCode, appSymbol });
  return NextResponse.json({ source: "longbridge", ...status, symbol: appSymbol, providerCode, events }, { headers: { "Cache-Control": "no-store" } });
}
