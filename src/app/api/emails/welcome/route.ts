import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";
import { requireAuth } from "@/lib/requireAuth";

export async function POST(req: Request) {
  // WM-SEC-P0-06: was unauthenticated. Email-spam vector via Resend.
  // Signup flow calls sendWelcomeEmail directly (function import), not
  // this HTTP endpoint — grep confirmed zero internal HTTP callers.
  // Rate-limit + origin check is filed separately as WM-SEC-P0-07.
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const { email, firstName } = await req.json().catch(() => ({})) as Record<string, string>;
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const result = await sendWelcomeEmail(email, firstName);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: String(result.error) }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (result as any).data?.id });
}
