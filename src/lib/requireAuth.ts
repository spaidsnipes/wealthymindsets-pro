import { NextResponse } from "next/server";
import { getAuthToken, verifyJWT, type JWTPayload } from "@/lib/auth";

/**
 * Shared route guard — WM-SEC-P0-06. Every mutating / privileged /
 * broker-executing endpoint calls this at the top of its handler; any
 * request without a valid WM session cookie gets 401 before the route
 * does any work.
 *
 * Usage:
 *   const auth = requireAuth(req);
 *   if (!auth.ok) return auth.response;
 *   // ...auth.user.sub is the userId, auth.user.email the email
 */
export type RequireAuthResult =
  | { ok: true;  user: JWTPayload }
  | { ok: false; response: Response };

export function requireAuth(req: Request): RequireAuthResult {
  const token = getAuthToken(req);
  const user  = token ? verifyJWT(token) : null;
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }
  return { ok: true, user };
}
