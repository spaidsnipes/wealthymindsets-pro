import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { fetchWebullTickSnapshot, webullDataConfigFromEnv, type WebullSigningProfile } from "@/lib/marketData/adapters/webullMarketData";
import { classifyWebullTickSnapshot } from "@/lib/marketData/adapters/webullTicksWireStatus";

export const dynamic = "force-dynamic";

const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.-]{0,14}$/;

/**
 * Bounded authenticated read path for Webull stock prints.
 * This route cannot access accounts or submit, modify, or cancel orders.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  // NO DEFAULT — see the moomoo tick route for the measured substitution.
  const requested = request.nextUrl.searchParams.get("symbol");
  const symbol = (requested ?? "").trim().toUpperCase();
  const requestedProfile = request.nextUrl.searchParams.get("profile");
  if (!SYMBOL_PATTERN.test(symbol)) {
    return NextResponse.json(
      {
        source: "webull",
        state: "INVALID_SYMBOL",
        fidelity: "NONE",
        symbol,
        ticks: [],
        note: symbol === ""
          ? "No symbol was requested. This route reads prints for ONE named instrument and will not substitute a default — pass ?symbol=."
          : "Pass one US stock symbol.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (requestedProfile !== null && requestedProfile !== "legacy-sha1" && requestedProfile !== "sdk-sha256") {
    return NextResponse.json(
      { source: "webull", state: "INVALID_PROFILE", fidelity: "NONE", symbol, ticks: [], note: "Pass legacy-sha1 or sdk-sha256." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const signingProfile: WebullSigningProfile = requestedProfile ?? "legacy-sha1";

  const body = await fetchWebullTickSnapshot(fetch, {
    ...webullDataConfigFromEnv(process.env),
    canarySymbol: symbol,
    signingProfile,
  });
  // The classified receipt is ADDITIVE. `state`, `fidelity`, `ticks` and
  // `note` are unchanged, so the tape consumers (`selectFreshWebullObservedEvents`,
  // `selectFreshWebullTapeEvents`) read exactly what they read before. The new
  // `label`/`receiving`/`eventCount` fields exist so the Founder-visible
  // provider strip can prove this wire at the same depth it already proves
  // moomoo and longbridge — see webullTicksWireStatus for the asymmetry.
  return NextResponse.json({ ...body, ...classifyWebullTickSnapshot(body) }, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
