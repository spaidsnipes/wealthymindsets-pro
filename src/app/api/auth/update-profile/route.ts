import { NextResponse } from "next/server";
import { getAuthToken, verifyJWT, signJWT, setAuthCookie } from "@/lib/auth";

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

  const newJWT = signJWT(newPayload);
  const res = NextResponse.json({ ok: true, user: newPayload });
  setAuthCookie(res.cookies, newJWT);
  return res;
}
