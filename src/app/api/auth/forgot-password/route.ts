import { NextResponse } from "next/server";
import { useSupabase, supabaseResetPassword } from "@/lib/auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://wealthymindsets-pro.vercel.app";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({})) as Record<string, string>;
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  if (useSupabase()) {
    try {
      await supabaseResetPassword(email, `${APP_URL}/reset-password`);
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
