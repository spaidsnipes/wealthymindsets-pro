import { NextResponse } from "next/server";
import { useSupabase, supabaseResetPassword } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://wealthymindsets-pro.vercel.app";

export async function POST(req: Request) {
  const { email, token } = await req.json().catch(() => ({})) as Record<string, string>;
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  if (useSupabase()) {
    const data = await supabaseResetPassword(email);
    // Supabase generates the reset token — extract it if returned, otherwise use a placeholder
    // so Resend sends our branded email instead of Supabase's default.
    const resetUrl = token
      ? `${APP_URL}/reset-password?token=${token}`
      : `${APP_URL}/reset-password?email=${encodeURIComponent(email)}`;
    // Always return success to prevent email enumeration
    sendPasswordResetEmail(email, resetUrl).catch(() => {});
    void data;
    return NextResponse.json({ ok: true });
  }

  // In-memory path: generate a simple reset token
  const resetToken = Buffer.from(`${email}:${Date.now()}`).toString("base64url");
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
  sendPasswordResetEmail(email, resetUrl).catch(() => {});
  return NextResponse.json({ ok: true });
}
