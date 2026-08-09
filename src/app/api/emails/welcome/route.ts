import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";
import { requireAuth } from "@/lib/requireAuth";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  // WM-SEC-P0-06: was unauthenticated. Email-spam vector via Resend.
  // Signup flow calls sendWelcomeEmail directly (function import), not
  // this HTTP endpoint — grep confirmed zero internal HTTP callers.
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  // WM-SEC-P0-07: tight cap on this endpoint — a signed-in user does not
  // legitimately send >5 welcome emails per minute. Prevents Resend quota
  // burn + email-spam abuse of our sender reputation.
  const rl = checkRateLimit(`emails-welcome:${auth.user.sub}`, { max: 5, windowMs: 60_000 });
  if (!rl.ok) return rl.response;
  const { email, firstName } = await req.json().catch(() => ({})) as Record<string, string>;
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const result = await sendWelcomeEmail(email, firstName);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: String(result.error) }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (result as any).data?.id });
}
