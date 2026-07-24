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
    // Point the confirmation link at the real deployment the user is on
    // (request Origin), falling back to a configured site URL. Prevents
    // confirmation emails linking to localhost / a stale preview URL.
    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://wealthymindsets-pro.vercel.app";
    const redirectTo = `${origin}/login?confirmed=1`;
    const data = await supabaseSignUp(email, password, redirectTo);
    if (data.error) return NextResponse.json({ error: data.error.message ?? "Signup failed" }, { status: 400 });
    const user = data.user;
    if (!user?.id) return NextResponse.json({ error: "Signup service returned an invalid response" }, { status: 502 });
    // Supabase may require email verification and omit a session. Do not create
    // an application session until the address has actually been verified.
    if (!data.access_token && !data.session?.access_token) {
      return NextResponse.json({ ok: true, verificationRequired: true });
    }
    const jwt = signJWT({ sub: user.id, email: user.email, profileComplete: false });
    const res = NextResponse.json({ ok: true });
    setAuthCookie(res.cookies, jwt);
    // Fire-and-forget welcome email — don't block response on email delivery.
    // Log failures so delivery problems (e.g. Resend test-mode / missing domain) are diagnosable.
    sendWelcomeEmail(email, firstName).catch((e) => console.error("[signup] welcome email failed:", e));
    return res;
  }

  /* ── In-memory path (dev/demo) ── */
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Signup is unavailable because the account service is not configured." },
      { status: 503 },
    );
  }
  const existing = [...userStore.values()].find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });

  const id = randomBytes(12).toString("hex");
  const passwordHash = hashPassword(password);
  userStore.set(id, { id, email: email.toLowerCase(), passwordHash, createdAt: Date.now() });

  const jwt = signJWT({ sub: id, email: email.toLowerCase(), profileComplete: false });
  const res = NextResponse.json({ ok: true });
  setAuthCookie(res.cookies, jwt);
  sendWelcomeEmail(email, firstName).catch((e) => console.error("[signup] welcome email failed:", e));
  return res;
}
