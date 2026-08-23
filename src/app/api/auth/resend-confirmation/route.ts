import { NextResponse } from "next/server";
import { supabaseResendSignup, useSupabase } from "@/lib/auth";

const CONFIGURED_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://wealthymindsets-pro.dhill5711.workers.dev";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({})) as Record<string, string>;
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  if (!useSupabase()) {
    return NextResponse.json(
      { error: "Email confirmation is unavailable because the account service is not configured." },
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
