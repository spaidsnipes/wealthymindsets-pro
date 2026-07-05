import { NextResponse } from "next/server";
import { getAuthToken, verifyJWT, signJWT, setAuthCookie, useSupabase, supabaseUpdateUserMetadata } from "@/lib/auth";

export async function POST(req: Request) {
  const token = getAuthToken(req);
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const payload = verifyJWT(token);
  if (!payload) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const updates = await req.json().catch(() => ({})) as Record<string, string | boolean>;

  // Merge updates into existing payload
  const newPayload = {
    sub:             payload.sub,
    email:           payload.email,
    displayName:     (updates.displayName as string) ?? payload.displayName,
    handle:          (updates.handle as string) ?? payload.handle,
    avatar:          (updates.avatar as string) ?? payload.avatar,
    bio:             (updates.bio as string) ?? payload.bio,
    profileComplete: (updates.profileComplete as boolean) ?? payload.profileComplete,
  };

  // ── PERSIST TO SUPABASE (the actual fix for "profile resets every login") ──
  // The JWT cookie alone is not durable: the login route rebuilds the JWT from
  // Supabase user_metadata, so the profile MUST live there to survive a fresh
  // sign-in on any device. Write the same fields into user_metadata via the
  // admin API. (avatar can be a large data URL; Supabase metadata handles it,
  // but we still keep the JWT copy for fast reads.)
  if (useSupabase()) {
    await supabaseUpdateUserMetadata(newPayload.sub, {
      displayName:     newPayload.displayName,
      handle:          newPayload.handle,
      avatar:          newPayload.avatar,
      bio:             newPayload.bio,
      profileComplete: newPayload.profileComplete,
    });
  }

  const newJWT = signJWT(newPayload);
  const res = NextResponse.json({ ok: true, user: newPayload });
  setAuthCookie(res.cookies, newJWT);
  return res;
}
