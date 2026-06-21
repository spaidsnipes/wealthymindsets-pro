import { NextResponse } from "next/server";
import {
  hashPassword, signJWT, setAuthCookie, userStore, useSupabase, supabaseSignUp,
} from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  const { email, password, firstName } = await req.json().catch(() => ({})) as Record<string, string>;
  if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  /* ── Supabase path ── */
  if (useSupabase()) {
    const data = await supabaseSignUp(email, password);
    if (data.error) return NextResponse.json({ error: data.error.message ?? "Signup failed" }, { status: 400 });
    const user = data.user;
    const jwt = signJWT({ sub: user.id, email: user.email, profileComplete: false });
    const res = NextResponse.json({ ok: true });
    setAuthCookie(res.cookies, jwt);
    // Fire-and-forget welcome email — don't block response on email delivery
    sendWelcomeEmail(email, firstName).catch(() => {});
    return res;
  }

  /* ── In-memory path (dev/demo) ── */
  const existing = [...userStore.values()].find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });

  const id = randomBytes(12).toString("hex");
  const passwordHash = hashPassword(password);
  userStore.set(id, { id, email: email.toLowerCase(), passwordHash, createdAt: Date.now() });

  const jwt = signJWT({ sub: id, email: email.toLowerCase(), profileComplete: false });
  const res = NextResponse.json({ ok: true });
  setAuthCookie(res.cookies, jwt);
  sendWelcomeEmail(email, firstName).catch(() => {});
  return res;
}
