import { NextResponse } from "next/server";
import {
  hashPassword, signJWT, setAuthCookie, userStore, useSupabase, supabaseSignUp,
} from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";
import { CANONICAL_URL } from "@/lib/canonicalUrl";
import { supabaseConfigStatus, notConfiguredBody } from "@/lib/supabaseConfigStatus";
import { classifyAuthBackendFault } from "@/lib/authBackendFault";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  const { email, password, firstName } = await req.json().catch(() => ({})) as Record<string, string>;
  if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  /* ── Supabase path ── */
  if (useSupabase()) {
    // Authentication must always complete on one durable public host (see
    // @/lib/canonicalUrl). Using the request Origin here sends people who opened
    // a one-off deployment back to a subdomain where the httpOnly WOW World
    // session does not exist. Preview URLs are for testing, never for a Passport.
    const redirectTo = `${CANONICAL_URL}/login?confirmed=1`;
    let data;
    try {
      data = await supabaseSignUp(email, password, redirectTo);
    } catch (e) {
      console.error("[signup] Supabase call threw — request never completed:", e);
      // The copy this replaces offered "the Supabase project may be paused" as
      // the likely cause. On 2026-09-05 the project was probed directly while
      // sign-up was down and found alive and answering JSON, so that sentence
      // was confidently wrong for every reader who saw it. Name the class that
      // was actually observed instead of the one that sounds plausible.
      const fault = classifyAuthBackendFault("Sign-up", e);
      return NextResponse.json(fault.body, { status: fault.httpStatus });
    }
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
    // Monday Test 2 truth: name the EXACT missing config so an operator can fix
    // it. Presence-only inspection via shared supabaseConfigStatus helper — no
    // secret value read or leaked.
    return NextResponse.json(
      notConfiguredBody("Sign-up", supabaseConfigStatus()),
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
