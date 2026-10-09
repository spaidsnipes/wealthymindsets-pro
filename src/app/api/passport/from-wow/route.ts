import { NextResponse } from "next/server";
import { AUTH_LOGIN_LIMITER_BINDING, clientIp, edgeAllows, tooManyRequests } from "@/lib/edgeRateLimit";
import { checkRateLimit } from "@/lib/rateLimit";

import { setAuthCookie, signJWT, useSupabase } from "@/lib/auth";
import { isWowOrigin, safePath, wmClaimsFor } from "@/lib/passport/wowBridge";
import { FOUNDER_LANDING_ROUTE } from "@/lib/routing/founderLanding";

export const dynamic = "force-dynamic";

/**
 * WOW WORLD → WM PRO with the same Passport (see lib/passport/wowBridge).
 *
 * WOW form-POSTs `access_token` (its Supabase session) and `to`. Accepted only
 * when the browser says the form came from WOW (Origin header — a page on any
 * other site cannot claim it). WM asks Supabase who the token belongs to,
 * issues the WM session for that user, and lands on `to` (a WM path). Any
 * failure lands on /login with the destination kept — never a dead end.
 */
export async function POST(request: Request): Promise<Response> {
  // API audit P2-5 (2026-10-09): this door sets a WM session from a token WOW posts. It had no ceiling;
  // it now shares the sign-in limiter per address, as the hand-off door does.
  if (!checkRateLimit(`from-wow:${clientIp(request)}`, { max: 20, windowMs: 600_000 }).ok) return tooManyRequests();
  if (!(await edgeAllows([`from-wow:${clientIp(request)}`], AUTH_LOGIN_LIMITER_BINDING))) return tooManyRequests();
  const form = await request.formData().catch(() => null);
  const to = safePath(form?.get("to"), FOUNDER_LANDING_ROUTE);
  const toLogin = () => {
    const r = NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(to)}`, request.url), { status: 303 });
    r.headers.set("Cache-Control", "no-store");
    return r;
  };
  if (!isWowOrigin(request.headers.get("origin"))) return NextResponse.json({ error: "This door only opens from WOW World." }, { status: 403 });
  const token = typeof form?.get("access_token") === "string" ? String(form?.get("access_token")) : "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !useSupabase() || !url || !anon) return toLogin();

  const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => null);
  const user = res?.ok ? ((await res.json().catch(() => null)) as Record<string, unknown> | null) : null;
  const claims = wmClaimsFor(user);
  if (!claims) return toLogin();

  const out = NextResponse.redirect(new URL(to, request.url), { status: 303 });
  out.headers.set("Cache-Control", "no-store");
  out.headers.set("Referrer-Policy", "no-referrer");
  setAuthCookie(out.cookies, signJWT(claims));
  return out;
}
