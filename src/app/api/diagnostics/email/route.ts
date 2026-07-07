import { NextResponse } from "next/server";
import { getAuthToken, verifyJWT } from "@/lib/auth";
import { emailConfigStatus } from "@/lib/email";

/**
 * Authenticated email-config health check. Returns booleans + the public sender
 * address only — never the API key. Lets the user confirm, after deploy, whether
 * RESEND_FROM_EMAIL is set and delivery is out of Resend test mode.
 *
 *   GET /api/diagnostics/email  → { hasApiKey, from, usingTestSender, appUrl, ok }
 */
export async function GET(req: Request) {
  const token = getAuthToken(req);
  if (!token || !verifyJWT(token)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const status = emailConfigStatus();
  return NextResponse.json({
    ...status,
    ok: status.hasApiKey && !status.usingTestSender,
    hint: status.usingTestSender
      ? "Set RESEND_FROM_EMAIL to a verified-domain address (e.g. 'WealthyMindsets Pro <no-reply@wealthymindsets.info>') in Vercel → Project → Settings → Environment Variables, then redeploy."
      : "Email sender is configured for production delivery.",
  });
}
