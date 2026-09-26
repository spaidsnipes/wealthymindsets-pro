import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { fetchWebullTickSnapshot, webullDataConfigFromEnv, type WebullSigningProfile } from "@/lib/marketData/adapters/webullMarketData";
import { classifyWebullTickSnapshot } from "@/lib/marketData/adapters/webullTicksWireStatus";
import { resolveWebullSessionToken, webullSessionStore, webullWorkerEnv } from "@/lib/marketData/webullSessionStore";
import { settleWebullRefusal, webullSessionConfirmer } from "@/lib/marketData/webullSessionRejection";

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

  /**
   * MINT the session — do not read WEBULL_ACCESS_TOKEN and sign with it.
   *
   * That variable holds a SESSION with an expiry, not a permanent secret, and
   * this route used to pass it straight through. The failure mode is worse
   * than an outage: a stale session 401s, a 401 on a market-data route reads
   * to every human as "market data is not subscribed", and this project has
   * already spent three months chasing that misreading to the Founder's wallet
   * instead of to its own request. The entitlement probe mints; so must this.
   */
  const env = webullDataConfigFromEnv(process.env);
  const store = webullSessionStore(await webullWorkerEnv());
  const session = await resolveWebullSessionToken(
    fetch,
    { appKey: env.appKey, appSecret: env.appSecret, apiHost: env.apiHost },
    store,
  );

  // Not an error — a named state with exactly one human step. Reporting it as
  // a generic auth failure is how a one-tap fix becomes another week of
  // guessing, so it is surfaced as itself.
  if (session.awaiting2fa) {
    /**
     * CLASSIFIED LIKE EVERY OTHER ANSWER THIS ROUTE GIVES.
     *
     * This arm used to hand-build its body and return it without the receipt
     * fields, so `ProviderWireStrip` — which keys on `label` — fell through to
     * its "no classified receipt" default. MEASURED on /command-deck
     * 2026-09-21, with this exact arm answering: the chip read
     * "webull: Unknown. The Webull tick route returned no classified receipt."
     *
     * The route held the most actionable fact the wire can produce (a prompt
     * is waiting in the Webull app) and published it as UNKNOWN. That is the
     * absent-looks-undecided defect `webullTicksWireStatus` exists to prevent,
     * reintroduced by the one arm that skipped the classifier.
     */
    const blocked = {
      source: "webull" as const,
      state: "BLOCKED_AUTH" as const,
      fidelity: "NONE" as const,
      symbol,
      requestedAt: new Date().toISOString(),
      signingProfile,
      ticks: [],
      awaiting2fa: true,
      note: session.note,
    };
    return NextResponse.json(
      { ...blocked, ...classifyWebullTickSnapshot(blocked) },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = await fetchWebullTickSnapshot(fetch, {
    ...env,
    // The minted session REPLACES the environment value. Falling back to the
    // pasted one would quietly restore the defect this block exists to remove.
    accessToken: session.accessToken,
    canarySymbol: symbol,
    signingProfile,
  });
  /**
   * A REFUSED SESSION IS RETIRED, NOT RE-SENT.
   *
   * Without this, a session Webull retired early stays NORMAL-and-unexpired
   * in the store, and every poll re-sends it into the same 401 until its
   * stored expiry passes. Only an answer that names the session
   * (INVALID_TOKEN) retires it — see webullSessionRejection.ts for what is
   * refused and why. Additive: `session` is present only on a refusal.
   */
  const sessionVerdict = body.state === "BLOCKED_AUTH" && typeof body.httpStatus === "number"
    ? await settleWebullRefusal(store, {
        httpStatus: body.httpStatus,
        providerCode: body.providerCode,
        sessionToken: session.accessToken,
        nowMs: Date.now(),
        confirm: webullSessionConfirmer(fetch, env),
      })
    : null;
  const sessionReceipt = sessionVerdict && sessionVerdict.kind !== "NOT_SESSION"
    ? { session: { verdict: sessionVerdict.kind, note: sessionVerdict.note } }
    : {};

  // The classified receipt is ADDITIVE. `state`, `fidelity`, `ticks` and
  // `note` are unchanged, so the tape consumers (`selectFreshWebullObservedEvents`,
  // `selectFreshWebullTapeEvents`) read exactly what they read before. The new
  // `label`/`receiving`/`eventCount` fields exist so the Founder-visible
  // provider strip can prove this wire at the same depth it already proves
  // moomoo and longbridge — see webullTicksWireStatus for the asymmetry.
  return NextResponse.json({ ...body, ...classifyWebullTickSnapshot(body), ...sessionReceipt }, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
