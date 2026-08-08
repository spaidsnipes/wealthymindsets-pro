import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getAuthToken, verifyJWT } from "@/lib/auth";

/**
 * Authenticated JWT_SECRET config health check. Returns booleans only — never
 * the secret value. Lets us confirm from a live prod session whether the env
 * var is set and, critically, whether it still equals the committed dev
 * fallback (`wm-dev-secret-CHANGE-IN-PROD-4f8a2b1c`) — which is the state
 * that makes session-signing exploitable by anyone with repo read access.
 *
 * Discloses only an 8-hex-char SHA-256 prefix of the runtime secret. The
 * fallback string is already in the repo, so the fallback prefix leaks nothing
 * new; a custom secret's prefix does not permit recovery of the value.
 *
 *   GET /api/diagnostics/auth-config
 *     → { isSet, usingCommittedFallback, secretHashPrefix, nodeEnv, ok, hint }
 *
 * Gates the WM-SEC-P0-01 fail-fast hardening push: we push the throw only
 * once this endpoint returns `usingCommittedFallback: false` in prod.
 */

const DEV_JWT_SECRET = "wm-dev-secret-CHANGE-IN-PROD-4f8a2b1c";

export async function GET(req: Request) {
  const token = getAuthToken(req);
  if (!token || !verifyJWT(token)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const runtime = process.env.JWT_SECRET ?? "";
  const isSet   = runtime.length > 0;
  const usingCommittedFallback = !isSet || runtime === DEV_JWT_SECRET;
  const secretHashPrefix = isSet
    ? createHash("sha256").update(runtime).digest("hex").slice(0, 8)
    : null;
  const nodeEnv = process.env.NODE_ENV ?? "unknown";
  const ok = isSet && !usingCommittedFallback;

  return NextResponse.json({
    isSet,
    usingCommittedFallback,
    secretHashPrefix,
    nodeEnv,
    ok,
    hint: ok
      ? "JWT_SECRET is set to a non-fallback value. Safe to deploy the WM-SEC-P0-01 fail-fast hardening."
      : "Set JWT_SECRET in Vercel → Project → Settings → Environment Variables to a fresh 32-byte random value (e.g. `openssl rand -base64 32`), redeploy, re-check this endpoint, then deploy the hardening.",
  });
}
