import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getAuthToken, verifyJWT } from "@/lib/auth";

/**
 * Authenticated FINNHUB_KEY config health check. Sibling to /api/diagnostics/
 * auth-config. Reports booleans only — never the secret value. Lets us confirm
 * from a live prod session whether the server-side env var is set and whether
 * it still equals the committed literal that DEC-006 flagged and WM-SEC-P0-03
 * tracks.
 *
 * Discloses only an 8-hex-char SHA-256 prefix of the runtime key. The
 * committed literal is already in the repo, so the fallback prefix leaks
 * nothing new; a rotated key's prefix does not permit recovery of the value.
 *
 * NOTE — server env var is `FINNHUB_KEY`, but code has also historically read
 * `NEXT_PUBLIC_FINNHUB_KEY` (which leaks to the browser bundle). This endpoint
 * reports the SERVER value only; a separate NEXT_PUBLIC audit is a code-level
 * concern, not a runtime one.
 *
 *   GET /api/diagnostics/finnhub-key
 *     → { isSet, usingCommittedFallback, keyHashPrefix, nodeEnv, ok, hint }
 */

const COMMITTED_FALLBACK = "d8efu9hr01qth3ch5f20d8efu9hr01qth3ch5f2g";

export async function GET(req: Request) {
  const token = getAuthToken(req);
  if (!token || !verifyJWT(token)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const runtime = process.env.FINNHUB_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_KEY ?? "";
  const isSet   = runtime.length > 0;
  const usingCommittedFallback = !isSet || runtime === COMMITTED_FALLBACK;
  const keyHashPrefix = isSet
    ? createHash("sha256").update(runtime).digest("hex").slice(0, 8)
    : null;
  const nodeEnv = process.env.NODE_ENV ?? "unknown";
  const ok = isSet && !usingCommittedFallback;

  return NextResponse.json({
    isSet,
    usingCommittedFallback,
    keyHashPrefix,
    nodeEnv,
    ok,
    hint: ok
      ? "FINNHUB_KEY is set to a non-fallback value on the server. Safe to strip ?? fallbacks from server routes; client-side callers still need to be moved to the server proxy."
      : "Rotate the leaked key at finnhub.io, then set FINNHUB_KEY (not NEXT_PUBLIC_*) in Vercel prod, redeploy, re-check this endpoint before WM-SEC-P0-03 code strip.",
  });
}
