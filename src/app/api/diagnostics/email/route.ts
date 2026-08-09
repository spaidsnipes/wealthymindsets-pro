import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { emailConfigStatus } from "@/lib/email";

/**
 * Authenticated email-config health check. Returns booleans + the public sender
 * address only — never the API key. Lets the user confirm, after deploy, whether
 * RESEND_FROM_EMAIL is set and delivery is out of Resend test mode.
 *
 *   GET /api/diagnostics/email  → { hasApiKey, from, usingTestSender, appUrl, ok }
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const status = emailConfigStatus();
  return NextResponse.json({
    ...status,
    ok: status.hasApiKey && !status.usingTestSender,
    hint: status.usingTestSender
      ? "Set RESEND_FROM_EMAIL to a verified-domain address (e.g. 'WealthyMindsets Pro <no-reply@wealthymindsets.info>') in Vercel → Project → Settings → Environment Variables, then redeploy."
      : "Email sender is configured for production delivery.",
  });
}
