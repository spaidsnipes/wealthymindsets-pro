import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: Request) {
  const { email, firstName } = await req.json().catch(() => ({})) as Record<string, string>;
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const result = await sendWelcomeEmail(email, firstName);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: String(result.error) }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (result as any).data?.id });
}
