import { NextResponse } from "next/server";
import {
  hashPassword, signJWT, setAuthCookie, userStore, useSupabase, supabaseSignUp,
} from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";
import { CANONICAL_URL } from "@/lib/canonicalUrl";
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
      // Monday Test 2 truth: preserve the provider's actual error class instead of
      // collapsing to a generic "unreachable" (which historically masked a paused
      // Supabase project vs a bad key vs a real network failure).
      console.error("[signup] Supabase call threw — auth backend unreachable/misconfigured:", e);
      return NextResponse.json(
        {
          error: "Sign-up service is temporarily unavailable. If this persists, the Supabase project may be paused or an env var changed.",
          edge: "UPSTREAM UNREACHABLE",
        },
        { status: 503 },
      );
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
    // it. Presence-only inspection — no secret value read or leaked. The message
    // enumerates the WM auth contract (URL + one of the two accepted key names).
    const hasUrl   = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasAnon  = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const hasPub   = !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const missing: string[] = [];
    if (!hasUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!hasAnon && !hasPub) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)");
    return NextResponse.json(
      {
        error: `Sign-up is NOT CONFIGURED on this host runtime — missing required Supabase auth ${missing.length === 1 ? "variable" : "variables"}: ${missing.join(", ")}. Set them in the host runtime secrets (e.g. Cloudflare) and redeploy.`,
        edge: "NOT CONFIGURED",
        missing,
      },
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
