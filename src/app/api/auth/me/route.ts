import { NextResponse } from "next/server";
import { getAuthToken, verifyJWT, signJWT, setAuthCookie, useSupabase, supabaseGetUserById } from "@/lib/auth";

/** An inline avatar larger than this is not shipped on every page load. */
const MAX_ME_AVATAR_CHARS = 200_000;

/**
 * A member who keeps using the app stays signed in (sign-in lane 2026-10-06).
 * The session cookie had a fixed 30-day life from the moment of sign-in, so a
 * daily phone user was signed out on day 31 mid-session. A session older than
 * this is re-issued — but only after the account read PROVED it is not revoked,
 * never on the fail-open path.
 */
const RENEW_AFTER_SECONDS = 7 * 24 * 60 * 60;

export async function GET(req: Request) {
  const token = getAuthToken(req);
  if (!token) return NextResponse.json({ user: null }, { status: 401 });

  const payload = verifyJWT(token);
  if (!payload) return NextResponse.json({ user: null }, { status: 401 });

  // Enforce global session revocation ("log out all devices"). A user is only
  // affected once they've explicitly bumped their epoch, so this is a no-op for
  // everyone else. Fail-open on any Supabase error: a transient outage must
  // never mass-log-out live users.
  //
  // The same account read supplies the avatar: the session cookie no longer
  // carries an inline (data:) avatar because it made the cookie too large for
  // the browser to keep (see signJWT in @/lib/auth).
  let accountAvatar: string | undefined;
  let revocationChecked = false;
  if (useSupabase()) {
    try {
      const account = await supabaseGetUserById(payload.sub);
      const meta = (account?.user_metadata ?? {}) as Record<string, unknown>;
      const epoch = account ? (typeof meta.sessionEpoch === "number" ? meta.sessionEpoch : 0) : null;
      if (epoch && payload.iat < epoch) {
        return NextResponse.json({ user: null, revoked: true }, { status: 401 });
      }
      revocationChecked = account !== null;
      if (typeof meta.avatar === "string" && meta.avatar.length <= MAX_ME_AVATAR_CHARS) accountAvatar = meta.avatar;
    } catch { /* fail-open */ }
  }

  const res = NextResponse.json({
    user: {
      id:              payload.sub,
      email:           payload.email,
      displayName:     payload.displayName,
      handle:          payload.handle,
      avatar:          payload.avatar ?? accountAvatar,
      bio:             payload.bio,
      botName:         payload.botName,
      timezone:        payload.timezone,
      bgColor:         payload.bgColor,
      profileComplete: payload.profileComplete,
    },
  });
  if (revocationChecked && Math.floor(Date.now() / 1000) - payload.iat > RENEW_AFTER_SECONDS) {
    const { iat: _iat, exp: _exp, ...rest } = payload;
    setAuthCookie(res.cookies, signJWT(rest));
  }
  res.headers.set("Cache-Control", "no-store");
  return res;
}
