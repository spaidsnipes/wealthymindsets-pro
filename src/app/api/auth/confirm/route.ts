import { NextResponse } from "next/server";
import { setAuthCookie, signJWT, supabaseGetUser, supabaseVerifyEmail, useSupabase } from "@/lib/auth";
import { supabaseConfigStatus, notConfiguredBody } from "@/lib/supabaseConfigStatus";

type SupabaseUser = {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

function issueSession(user: SupabaseUser) {
  if (!user.id || typeof user.email !== "string") return null;
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const response = NextResponse.json({ ok: true });
  response.headers.set("Cache-Control", "no-store");
  setAuthCookie(response.cookies, signJWT({
    sub: user.id,
    email: user.email,
    displayName: typeof metadata.displayName === "string" ? metadata.displayName : undefined,
    handle: typeof metadata.handle === "string" ? metadata.handle : undefined,
    avatar: typeof metadata.avatar === "string" ? metadata.avatar : undefined,
    bio: typeof metadata.bio === "string" ? metadata.bio : undefined,
    botName: typeof metadata.botName === "string" ? metadata.botName : undefined,
    timezone: typeof metadata.timezone === "string" ? metadata.timezone : undefined,
    bgColor: typeof metadata.bgColor === "string" ? metadata.bgColor : undefined,
    profileComplete: Boolean(metadata.profileComplete || metadata.displayName),
  }));
  return response;
}

export async function POST(request: Request) {
  if (!useSupabase()) {
    // Monday Test 2 truth: name the exact missing Supabase config so an
    // operator can fix it (presence-only, no secret value read).
    return NextResponse.json(
      notConfiguredBody("Account verification", supabaseConfigStatus()),
      { status: 503 },
    );
  }
  const body = await request.json().catch(() => ({})) as { accessToken?: string; email?: string; token?: string; tokenHash?: string };
  const accessToken = body.accessToken?.trim();
  if (accessToken) {
    const user = await supabaseGetUser(accessToken) as SupabaseUser;
    return issueSession(user) ?? NextResponse.json({ error: "Verification session could not be confirmed." }, { status: 401 });
  }

  const token = body.token?.trim();
  const email = body.email?.trim().toLowerCase();
  const tokenHash = body.tokenHash?.trim();
  if ((!email || !token) && !tokenHash) {
    return NextResponse.json({ error: "Enter the code from your email or open a fresh confirmation link." }, { status: 400 });
  }
  const verified = await supabaseVerifyEmail({ email, token, tokenHash });
  const session = (verified.data.session ?? verified.data) as { access_token?: string; user?: SupabaseUser };
  if (!verified.ok || !session.access_token) {
    const error = verified.data.error as { message?: string } | string | undefined;
    const message = typeof error === "string" ? error : error?.message;
    return NextResponse.json({ error: message || "That email code has expired or is not valid. Request a fresh one and try again." }, { status: 401 });
  }
  const user = session.user ?? await supabaseGetUser(session.access_token) as SupabaseUser;
  return issueSession(user) ?? NextResponse.json({ error: "Verification session could not be confirmed." }, { status: 401 });
}
