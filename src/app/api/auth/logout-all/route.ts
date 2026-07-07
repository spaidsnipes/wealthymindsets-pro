import { NextResponse } from "next/server";
import {
  getAuthToken, verifyJWT, clearAuthCookie,
  useSupabase, supabaseBumpSessionEpoch,
} from "@/lib/auth";

/**
 * Revoke every session for the current user across all devices.
 *
 * Bumps the server-side session epoch (user_metadata.sessionEpoch) so every
 * previously-issued JWT — on any device, anywhere — becomes invalid at its
 * next /api/auth/me check. Also clears this device's cookie immediately.
 *
 * Without Supabase (in-memory dev) there is no cross-device store, so we can
 * only clear the local cookie; `revoked:false` tells the caller so honestly.
 */
export async function POST(req: Request) {
  const token = getAuthToken(req);
  const payload = token ? verifyJWT(token) : null;
  if (!payload) {
    const res = NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    clearAuthCookie(res.cookies);
    return res;
  }

  let revoked = false;
  if (useSupabase()) {
    revoked = await supabaseBumpSessionEpoch(payload.sub);
  }

  const res = NextResponse.json({ ok: true, revoked });
  clearAuthCookie(res.cookies);
  return res;
}
