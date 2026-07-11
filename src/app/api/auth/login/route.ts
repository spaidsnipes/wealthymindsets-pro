import { NextResponse } from "next/server";
import {
  verifyPassword, signJWT, setAuthCookie, verifyJWT, getAuthToken,
  userStore, useSupabase, supabaseSignIn,
} from "@/lib/auth";
import { sendLoginAlertEmail, loginAlertDetailsFromRequest } from "@/lib/email";

const SB_URL  = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_SVC  = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

// Confirm a user's email via admin API so they can immediately sign in.
// Called when Supabase returns "Email not confirmed" for an existing account.
async function adminConfirmEmail(email: string): Promise<boolean> {
  const serviceKey = SB_SVC();
  if (!serviceKey) return false;
  try {
    // Search for user by email
    const listRes = await fetch(`${SB_URL()}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    const listData = await listRes.json();
    const user = listData?.users?.[0];
    if (!user?.id) return false;

    // Confirm their email
    const updateRes = await fetch(`${SB_URL()}/auth/v1/admin/users/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ email_confirm: true }),
    });
    return updateRes.ok;
  } catch { return false; }
}

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({})) as Record<string, string>;
  if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });

  /* ── Supabase path ── */
  if (useSupabase()) {
    let data = await supabaseSignIn(email, password);

    // Auto-confirm unconfirmed users (accounts created before this fix) then retry
    if (data.error?.message?.toLowerCase().includes("email not confirmed")) {
      const confirmed = await adminConfirmEmail(email);
      if (confirmed) {
        data = await supabaseSignIn(email, password);
      }
    }

    if (data.error) return NextResponse.json({ error: data.error.message ?? "Invalid credentials" }, { status: 401 });

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
