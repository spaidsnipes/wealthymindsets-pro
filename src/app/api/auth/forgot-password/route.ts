import { NextResponse } from "next/server";
import { useSupabase, supabaseResetPassword } from "@/lib/auth";

// Accept EITHER env var (they were historically inconsistent across routes),
// and prefer the actual request origin so the reset link always matches the
// deployment the user is on.
const CONFIGURED_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://wealthymindsets-pro.vercel.app";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({})) as Record<string, string>;
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const origin = req.headers.get("origin") || CONFIGURED_URL;

  if (useSupabase()) {
    try {
      await supabaseResetPassword(email, `${origin}/reset-password`);
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
