import { NextResponse } from "next/server";
import { supabaseResendSignup, useSupabase } from "@/lib/auth";
import { CANONICAL_URL as CONFIGURED_URL } from "@/lib/canonicalUrl";
import { supabaseConfigStatus, notConfiguredBody } from "@/lib/supabaseConfigStatus";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({})) as Record<string, string>;
  const normalizedEmail = email?.trim().toLowerCase();
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
    // Keep the response generic. Supabase enforces its resend cooldown, while
    // this route avoids disclosing whether a particular account exists.
    await supabaseResendSignup(normalizedEmail, `${CONFIGURED_URL}/login?confirmed=1`);
  } catch {
    // A generic success response also prevents transport details or account
    // existence from leaking through this public recovery endpoint.
  }

  return NextResponse.json({ ok: true });
}
