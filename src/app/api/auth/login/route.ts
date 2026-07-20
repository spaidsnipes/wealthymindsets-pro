import { NextResponse } from "next/server";
import {
  verifyPassword, signJWT, setAuthCookie, verifyJWT, getAuthToken,
  userStore, useSupabase, supabaseSignIn,
} from "@/lib/auth";
import { sendLoginAlertEmail, loginAlertDetailsFromRequest } from "@/lib/email";

// Long-lived, httpOnly marker cookie that identifies a browser we've already
// seen sign in. Absent = a genuinely new device → send the sign-in alert email.
// Present = returning device → stay quiet so users aren't spammed every login.
const DEVICE_COOKIE = "wm_device";
const DEVICE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years

/**
 * On sign-in, decide whether this is a new device and, if so, fire the
 * (fire-and-forget) security alert email and stamp the device cookie on `res`.
 * Never throws and never blocks the login response.
 */
function alertIfNewDevice(req: Request, res: NextResponse, email?: string) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const known = new RegExp(`(?:^|;\\s*)${DEVICE_COOKIE}=`).test(cookieHeader);
    if (known) return; // returning device — no alert

    // Stamp this browser so subsequent logins from it stay quiet.
    res.cookies.set(DEVICE_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   DEVICE_MAX_AGE,
      path:     "/",
    });

    if (!email) return;
    const details = loginAlertDetailsFromRequest(req);
    sendLoginAlertEmail(email, details).catch((e) =>
      console.error("[login] new-device alert email failed:", e),
    );
  } catch (e) {
    console.error("[login] alertIfNewDevice error:", e);
  }
}

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({})) as Record<string, string>;
  if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });

  /* ── Supabase path ── */
  if (useSupabase()) {
    // Harden: a Supabase outage / paused project / malformed URL used to THROW here
    // and return a bare 500, which the client showed as "stuck loading — can't sign
    // in." Wrap it so any transport/config failure returns a clean 503 the login form
    // can display, instead of hanging the whole app.
    let data: any;
    try {
      data = await supabaseSignIn(email, password);
    } catch (e) {
      console.error("[login] Supabase sign-in threw — auth backend unreachable/misconfigured:", e);
      return NextResponse.json(
        { error: "Sign-in service is temporarily unavailable. If this persists, the Supabase project may be paused or an env var changed." },
        { status: 503 },
      );
    }

    // Supabase / GoTrue returns auth errors in DIFFERENT shapes across versions:
    //   {error:{message}} · {error:"invalid_grant",error_description} ·
    //   {error_code,msg,code} · {message:"Invalid API key"}
    // The old code only checked data.error.message, so a modern error response fell
    // through to a generic "unexpected response" (503) and masked the real cause.
    // Recognize them all + surface the actual message so a bad API KEY is obvious.
    if (!data?.user) {
      const sbErr = data?.error?.message
        || data?.error_description
        || (typeof data?.error === "string" ? data.error : null)
        || data?.msg
        || data?.message
        || "Invalid credentials";
      const low = String(sbErr).toLowerCase();
      const isKeyIssue = low.includes("api key") || low.includes("apikey") || low.includes("jwt") || low.includes("no api key");
      return NextResponse.json(
        isKeyIssue
          ? { error: `Supabase rejected the API key: "${sbErr}". Check NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel.` }
          : { error: sbErr },
        { status: isKeyIssue ? 503 : 401 },
      );
    }

    // Restore profile from Supabase user_metadata (durable across devices), then
    // fall back to the previous session cookie for anything not yet persisted.
    const meta = data.user.user_metadata ?? {};
    const prevToken = getAuthToken(req);
    const prevPayload = prevToken ? verifyJWT(prevToken) : null;
    const prev = prevPayload?.sub === data.user.id ? prevPayload : null;

    const displayName = meta.displayName ?? prev?.displayName;
    const handle      = meta.handle      ?? prev?.handle;
    const avatar      = meta.avatar      ?? prev?.avatar;
    const bio         = meta.bio         ?? prev?.bio;
    const botName     = meta.botName     ?? prev?.botName;
    const timezone    = meta.timezone    ?? prev?.timezone;
    const bgColor     = meta.bgColor     ?? prev?.bgColor;
    // Complete if EITHER source says so, or a display name already exists —
    // this stops the "forced back into setup on every login" behaviour.
    const profileComplete = !!(meta.profileComplete ?? prev?.profileComplete ?? displayName);

    const jwt = signJWT({
      sub:  data.user.id,
      email: data.user.email,
      displayName,
      handle,
      avatar,
      bio,
      botName,
      timezone,
      bgColor,
      profileComplete,
    });
    const res = NextResponse.json({ ok: true });
    setAuthCookie(res.cookies, jwt);
    alertIfNewDevice(req, res, data.user.email);
    return res;
  }

  /* ── In-memory path ── */
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Sign-in is unavailable because the account service is not configured." },
      { status: 503 },
    );
  }
  const user = [...userStore.values()].find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Restore profile data from existing cookie if same user
  const prevToken = getAuthToken(req);
  const prevPayload = prevToken ? verifyJWT(prevToken) : null;
  const prev = prevPayload?.sub === user.id ? prevPayload : null;

  const jwt = signJWT({
    sub:   user.id,
    email: user.email,
    displayName:     prev?.displayName,
    handle:          prev?.handle,
    avatar:          prev?.avatar,
    bio:             prev?.bio,
    botName:         prev?.botName,
    timezone:        prev?.timezone,
    bgColor:         prev?.bgColor,
    profileComplete: prev?.profileComplete ?? false,
  });
  const res = NextResponse.json({ ok: true });
  setAuthCookie(res.cookies, jwt);
  alertIfNewDevice(req, res, user.email);
  return res;
}
