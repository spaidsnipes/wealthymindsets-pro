import { publicProxyLimit } from "@/lib/publicProxyLimit";
import { NextResponse } from "next/server";
import { CBOE_OPTIONS_SOURCE, cboeSymbolFor, normalizeCboeOptions } from "@/lib/marketData/cboeDelayedOptions";
import { requireAuth } from "@/lib/requireAuth";

export const dynamic = "force-dynamic";

/*
  Read-only Cboe DELAYED option quotes for Derivatives Pressure (Founder
  decision 2026-09-27). Public delayed data: no credential, nothing stored,
  display only. The response carries its own clocks (chainAsOf, underlyingAsOf)
  and every row's open interest is the prior session's figure.
*/
const CBOE = "https://cdn-api.cboe.com/api/global/delayed_quotes/options/";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  // API audit P2-9 (2026-10-09): a per-member ceiling before the operator's provider key is spent.
  { const limited = await publicProxyLimit(request, "data"); if (limited) return limited; }
  const symbol = cboeSymbolFor(new URL(request.url).searchParams.get("symbol") ?? "");
  if (!symbol) {
    return NextResponse.json({ source: CBOE_OPTIONS_SOURCE, edge: "UNSUPPORTED", error: "No listed options for this symbol on Cboe" }, { status: 400 });
  }
  let res: Response;
  try {
    res = await fetch(`${CBOE}${encodeURIComponent(symbol)}.json`, {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (WM Pro)" },
    });
  } catch {
    return NextResponse.json({ source: CBOE_OPTIONS_SOURCE, edge: "TRANSPORT", error: "Cboe delayed options unreachable" }, { status: 504 });
  }
  if (res.status === 403 || res.status === 404) {
    return NextResponse.json({ source: CBOE_OPTIONS_SOURCE, edge: "UNSUPPORTED", error: `Cboe lists no options for ${symbol} (HTTP ${res.status})` }, { status: 404 });
  }
  if (!res.ok) {
    return NextResponse.json({ source: CBOE_OPTIONS_SOURCE, edge: "PROVIDER ERROR", error: `Cboe delayed options HTTP ${res.status}` }, { status: 502 });
  }
  let body: unknown;
  try { body = await res.json(); } catch {
    return NextResponse.json({ source: CBOE_OPTIONS_SOURCE, edge: "INVALID RESPONSE", error: "Cboe response did not decode" }, { status: 502 });
  }
  return NextResponse.json(normalizeCboeOptions(body, symbol.replace(/^_/, "")), { headers: { "Cache-Control": "no-store" } });
}
