import { NextResponse } from "next/server";
import { setAuthCookie, signJWT, supabaseGetUser, useSupabase } from "@/lib/auth";

export async function POST(request: Request) {
  if (!useSupabase()) return NextResponse.json({ error: "Account verification is not configured." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { accessToken?: string };
  const accessToken = body.accessToken?.trim();
  if (!accessToken) return NextResponse.json({ error: "Verification session was missing. Open the email link again." }, { status: 400 });
  const user = await supabaseGetUser(accessToken);
  if (!user?.id || typeof user.email !== "string") return NextResponse.json({ error: "Verification session could not be confirmed." }, { status: 401 });
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const response = NextResponse.json({ ok: true });
  response.headers.set("Cache-Control", "no-store");
  setAuthCookie(response.cookies, signJWT({ sub: user.id, email: user.email, displayName: typeof metadata.displayName === "string" ? metadata.displayName : undefined, handle: typeof metadata.handle === "string" ? metadata.handle : undefined, avatar: typeof metadata.avatar === "string" ? metadata.avatar : undefined, bio: typeof metadata.bio === "string" ? metadata.bio : undefined, botName: typeof metadata.botName === "string" ? metadata.botName : undefined, timezone: typeof metadata.timezone === "string" ? metadata.timezone : undefined, bgColor: typeof metadata.bgColor === "string" ? metadata.bgColor : undefined, profileComplete: Boolean(metadata.profileComplete || metadata.displayName) }));
  return response;
}
