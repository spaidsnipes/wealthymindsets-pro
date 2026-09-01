import { NextResponse } from "next/server";
import { useSupabase, supabaseResetPassword } from "@/lib/auth";
import { CANONICAL_URL as CONFIGURED_URL } from "@/lib/canonicalUrl";
import { supabaseConfigStatus, notConfiguredBody } from "@/lib/supabaseConfigStatus";

// A reset link must use the durable production address for the same reason as
// email confirmation: a session set on a temporary deployment cannot follow a
// visitor back to the stable WOW World app. See @/lib/canonicalUrl.

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({})) as Record<string, string>;
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  if (useSupabase()) {
    try {
      await supabaseResetPassword(email, `${CONFIGURED_URL}/reset-password`);
    } catch {
      // Keep the response generic to avoid exposing whether an account exists.
    }
    return NextResponse.json({ ok: true });
  }

  // Monday Test 2 truth: name the exact missing Supabase config so an
  // operator can fix it (presence-only, no secret value read).
  return NextResponse.json(
    notConfiguredBody("Password recovery", supabaseConfigStatus()),
    { status: 503 },
  );
}
