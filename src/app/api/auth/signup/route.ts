import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { edgeAllows, tooManyRequests, clientIp } from "@/lib/edgeRateLimit";
import {
  hashPassword, signJWT, setAuthCookie, userStore, useSupabase, supabaseSignUp,
} from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";
import { CANONICAL_URL } from "@/lib/canonicalUrl";
import { supabaseConfigStatus, notConfiguredBody } from "@/lib/supabaseConfigStatus";
import { classifyAuthBackendFault } from "@/lib/authBackendFault";
import { interpretSignupResponse } from "@/lib/auth/signupResponse";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Record<string, string>;
  // A trailing space from a phone keyboard is not part of the address.
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const firstName = typeof body.firstName === "string" ? body.firstName : undefined;
  if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  // Signup sends a confirmation email to any address typed (2026-10-04).
  {
    const ip = clientIp(req);
    const byIp = checkRateLimit(`signup-ip:${ip}`, { max: 10, windowMs: 600_000 });
    if (!byIp.ok) return tooManyRequests();
    if (!(await edgeAllows([`signup-ip:${ip}`, `addr:${String(email).trim().toLowerCase()}`]))) return tooManyRequests();
  }

  /* ── Supabase path ── */
  if (useSupabase()) {
    // Authentication must always complete on one durable public host (see
    // @/lib/canonicalUrl). Using the request Origin here sends people who opened
    // a one-off deployment back to a subdomain where the httpOnly WOW World
    // session does not exist. Preview URLs are for testing, never for a Passport.
    const redirectTo = `${CANONICAL_URL}/login?confirmed=1`;
    let answered: Awaited<ReturnType<typeof supabaseSignUp>>;
    try {
      answered = await supabaseSignUp(email, password, redirectTo);
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
    const outcome = interpretSignupResponse(answered.status, answered.data);
    if (outcome.kind === "MALFORMED") return NextResponse.json({ error: "Signup service returned an invalid response" }, { status: 502 });
    if (outcome.kind === "REJECTED") return NextResponse.json({ error: outcome.message }, { status: outcome.httpStatus });
    if (outcome.kind === "ALREADY_REGISTERED") {
      return NextResponse.json({ error: "An account with that email already exists. Try signing in instead — or use \"Forgot password?\"." }, { status: 409 });
    }
    // Supabase may require email verification and omit a session. Do not create
    // an application session until the address has actually been verified.
    if (outcome.kind === "VERIFICATION_REQUIRED") {
      return NextResponse.json({ ok: true, verificationRequired: true });
    }
    const user = outcome.user;
    const jwt = signJWT({ sub: user.id, email: user.email ?? email, profileComplete: false });
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
