import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { useSupabase, supabaseResetPassword } from "@/lib/auth";
import { CANONICAL_URL as CONFIGURED_URL } from "@/lib/canonicalUrl";
import { supabaseConfigStatus, notConfiguredBody } from "@/lib/supabaseConfigStatus";
import { classifyPasswordRecovery, type RecoveryObservation } from "@/lib/passwordRecoveryOutcome";

// A reset link must use the durable production address for the same reason as
// email confirmation: a session set on a temporary deployment cannot follow a
// visitor back to the stable WOW World app. See @/lib/canonicalUrl.

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({})) as Record<string, string>;
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  // Anyone can trigger these mails (guest audit 2026-10-04): per address and
  // per IP. In-memory per isolate — it blunts a loop, it is not a firewall.
  {
    const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const byIp = checkRateLimit(`auth-mail-ip:${ip}`, { max: 20, windowMs: 600_000 });
    if (!byIp.ok) return byIp.response;
    const who = String(email ?? "").trim().toLowerCase();
    if (who) { const byAddr = checkRateLimit(`auth-mail-addr:${who}`, { max: 5, windowMs: 600_000 }); if (!byAddr.ok) return byAddr.response; }
  }

  if (useSupabase()) {
    // Observe, then classify. This route decides nothing itself: the rule that
    // the answer must not vary with whether the address has an account lives in
    // classifyPasswordRecovery, where it is tested. What it must never do again
    // is what it used to — swallow the failure and answer {ok:true} regardless,
    // which sent a locked-out user to wait on an email that was never sent.
    let observed: RecoveryObservation;
    try {
      const status = await supabaseResetPassword(email, `${CONFIGURED_URL}/reset-password`);
      observed = { kind: "ANSWERED", status };
    } catch (error) {
      observed = { kind: "THREW", error };
    }

    // The operator gets the detail the caller deliberately does not.
    if (observed.kind === "THREW") console.error("[forgot-password] recovery request threw:", observed.error);
    else if (observed.status >= 300) console.error("[forgot-password] account service answered HTTP", observed.status);

    const outcome = classifyPasswordRecovery(observed);
    return NextResponse.json(outcome.body, { status: outcome.httpStatus });
  }

  // Monday Test 2 truth: name the exact missing Supabase config so an
  // operator can fix it (presence-only, no secret value read).
  return NextResponse.json(
    notConfiguredBody("Password recovery", supabaseConfigStatus()),
    { status: 503 },
  );
}
