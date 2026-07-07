import { NextResponse } from "next/server";
import { getAuthToken, verifyJWT, useSupabase, supabaseGetSessionEpoch } from "@/lib/auth";

export async function GET(req: Request) {
  const token = getAuthToken(req);
  if (!token) return NextResponse.json({ user: null }, { status: 401 });

  const payload = verifyJWT(token);
  if (!payload) return NextResponse.json({ user: null }, { status: 401 });

  // Enforce global session revocation ("log out all devices"). A user is only
  // affected once they've explicitly bumped their epoch, so this is a no-op for
  // everyone else. Fail-open on any Supabase error: a transient outage must
  // never mass-log-out live users.
  if (useSupabase()) {
    try {
      const epoch = await supabaseGetSessionEpoch(payload.sub);
      if (epoch && payload.iat < epoch) {
        return NextResponse.json({ user: null, revoked: true }, { status: 401 });
      }
    } catch { /* fail-open */ }
  }

  return NextResponse.json({
    user: {
      id:              payload.sub,
      email:           payload.email,
      displayName:     payload.displayName,
      handle:          payload.handle,
      avatar:          payload.avatar,
      bio:             payload.bio,
      botName:         payload.botName,
      timezone:        payload.timezone,
      bgColor:         payload.bgColor,
      profileComplete: payload.profileComplete,
    },
  });
}
