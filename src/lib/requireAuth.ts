import { NextResponse } from "next/server";
import {
  clearAuthCookie,
  getAuthToken,
  supabaseGetSessionEpoch,
  useSupabase,
  verifyJWT,
  type JWTPayload,
} from "@/lib/auth";

/**
 * Shared route guard — WM-SEC-P0-06. Every mutating / privileged /
 * broker-executing endpoint calls this at the top of its handler; any
 * request without a valid WM session cookie gets 401 before the route
 * does any work.
 *
 * Usage:
 *   const auth = await requireAuth(req);
 *   if (!auth.ok) return auth.response;
 *   // ...auth.user.sub is the userId, auth.user.email the email
 */
export type RequireAuthResult =
  | { ok: true;  user: JWTPayload }
  | { ok: false; response: Response };

export async function requireAuth(req: Request): Promise<RequireAuthResult> {
  const token = getAuthToken(req);
  const user  = token ? verifyJWT(token) : null;
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  if (useSupabase()) {
    const epoch = await supabaseGetSessionEpoch(user.sub);
    if (epoch === null) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Session verification is temporarily unavailable" },
          { status: 503 },
        ),
      };
    }
    if (epoch > 0 && user.iat < epoch) {
      const response = NextResponse.json({ error: "Session revoked" }, { status: 401 });
      clearAuthCookie(response.cookies);
      return { ok: false, response };
    }
  }

  return { ok: true, user };
}
