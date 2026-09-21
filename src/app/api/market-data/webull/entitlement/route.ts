import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { webullDataConfigFromEnv } from "@/lib/marketData/adapters/webullMarketData";
import { probeWebullEntitlement } from "@/lib/marketData/webullEntitlementProbe";
import { webullSessionStore } from "@/lib/marketData/webullSessionStore";

export const dynamic = "force-dynamic";

const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.-]{0,14}$/;

/**
 * Authenticated DIAGNOSTIC read. It submits nothing and can read no account
 * balance or order — the accounts rung is climbed only for its HTTP status,
 * and the body is reduced to a short provider code before it ever leaves this
 * process.
 *
 * It exists to answer one question mechanically instead of by hunch: when a
 * Webull market-data call is denied, is the gap the operator's data package or
 * our own request? Those two look identical from a single endpoint, and
 * guessing wrong has already cost this project months.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const requested = (request.nextUrl.searchParams.get("symbol") ?? "TSLA").trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(requested)) {
    return NextResponse.json(
      { provider: "webull", verdict: "INCONCLUSIVE", rungs: [], note: "Pass one US stock symbol." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const env = webullDataConfigFromEnv(process.env);
  const report = await probeWebullEntitlement(fetch, {
    appKey: env.appKey,
    appSecret: env.appSecret,
    accessToken: env.accessToken,
    apiHost: env.apiHost,
    symbol: requested,
    // Climb with a minted session. Without one, four 401s from an expired
    // token would be read back as a verdict about the Founder's entitlements
    // — which is exactly the misreading this probe was built to prevent.
    tokenStore: webullSessionStore(),
  });

  return NextResponse.json(report, { status: 200, headers: { "Cache-Control": "no-store" } });
}
