import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { edgeAllows, tooManyRequests } from "@/lib/edgeRateLimit";
import { supabaseResendSignup, useSupabase } from "@/lib/auth";
import { CANONICAL_URL as CONFIGURED_URL } from "@/lib/canonicalUrl";
import { supabaseConfigStatus, notConfiguredBody } from "@/lib/supabaseConfigStatus";
import { classifyAuthEmailRefusal } from "@/lib/auth/authEmailRefusal";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({})) as Record<string, string>;
  const normalizedEmail = email?.trim().toLowerCase();
  // Anyone can trigger these mails (guest audit 2026-10-04): per address and
  // per IP. In-memory per isolate — it blunts a loop, it is not a firewall.
  {
    const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const byIp = checkRateLimit(`auth-mail-ip:${ip}`, { max: 20, windowMs: 600_000 });
    if (!byIp.ok) return tooManyRequests();
    const who = String(normalizedEmail ?? "").trim().toLowerCase();
    if (who) { const byAddr = checkRateLimit(`auth-mail-addr:${who}`, { max: 5, windowMs: 600_000 }); if (!byAddr.ok) return tooManyRequests(); }
    // The ceiling that holds across isolates (Workers Rate Limiting binding).
    if (!(await edgeAllows(who ? [`ip:${ip}`, `addr:${who}`] : [`ip:${ip}`]))) return tooManyRequests();
  }
  if (!normalizedEmail) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  if (!useSupabase()) {
    // Monday Test 2 truth: name the exact missing Supabase config so an
    // operator can fix it (presence-only, no secret value read).
    return NextResponse.json(
      notConfiguredBody("Email confirmation", supabaseConfigStatus()),
      { status: 503 },
    );
  }

  try {
    // Keep the response generic about the PERSON: this route never discloses
    // whether a particular account exists. But the answer is no longer thrown
    // away (shift 1106 — friends' login): a refusal by the project's MAIL
    // SENDER (built-in SMTP limited to org members, or its hourly cap) is a
    // fact about the project, and saying "sent" over it left friends waiting
    // for a confirmation mail that never left.
    const answered = await supabaseResendSignup(normalizedEmail, `${CONFIGURED_URL}/login?confirmed=1`);
    const refusal = answered && !answered.ok ? classifyAuthEmailRefusal(answered.status ?? 0, answered.data) : null;
    if (refusal) {
      console.error(`[resend-confirmation] ${refusal.edge}`);
      return NextResponse.json({ error: refusal.message, edge: refusal.edge }, { status: refusal.httpStatus });
    }
  } catch {
    // A generic success response also prevents transport details or account
    // existence from leaking through this public recovery endpoint.
  }

  return NextResponse.json({ ok: true });
}
