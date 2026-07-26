import { NextResponse } from "next/server";
import { useSupabase, supabaseResetPassword } from "@/lib/auth";

// A reset link must use the durable production address for the same reason as
// email confirmation: a session set on a temporary deployment cannot follow a
// visitor back to the stable WOW World app.
const CONFIGURED_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://wealthymindsets-pro.vercel.app";

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

  return NextResponse.json(
    { error: "Password recovery is unavailable because the account service is not configured." },
    { status: 503 },
  );
}
