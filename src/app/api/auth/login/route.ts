import { NextResponse } from "next/server";
import {
  verifyPassword, signJWT, setAuthCookie, verifyJWT, getAuthToken,
  userStore, useSupabase, supabaseSignIn,
} from "@/lib/auth";

const SB_URL  = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_SVC  = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
      profileComplete,
    });
    const res = NextResponse.json({ ok: true });
    setAuthCookie(res.cookies, jwt);
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
    profileComplete: prev?.profileComplete ?? false,
  });
  const res = NextResponse.json({ ok: true });
  setAuthCookie(res.cookies, jwt);
  return res;
}
