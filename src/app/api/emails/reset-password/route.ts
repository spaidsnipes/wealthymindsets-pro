import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://wealthymindsets-pro.vercel.app";

export async function POST(req: Request) {
  const { email, resetUrl, token } = await req.json().catch(() => ({})) as Record<string, string>;
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const url = resetUrl
    ?? (token ? `${APP_URL}/reset-password?token=${token}` : `${APP_URL}/reset-password?email=${encodeURIComponent(email)}`);

  const result = await sendPasswordResetEmail(email, url);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: String(result.error) }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (result as any).data?.id });
}
