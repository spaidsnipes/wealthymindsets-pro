import { NextResponse } from "next/server";
import { edgeAllows, tooManyRequests, clientIp, AUTH_LOGIN_LIMITER_BINDING } from "@/lib/edgeRateLimit";
import { resolveSupabaseServiceKey } from "@/lib/supabaseConfigStatus";

/**
 * Set a new password with a recovery token — server-side.
 *
 * Measured 2026-10-03: /reset-password read the Supabase URL and public key
 * in the BROWSER, and production's bundle carries neither, so every recovery
 * link ended in "Password recovery is not configured." — a locked-out trader
 * could not get back in. The page now hands the recovery token and the new
 * password to this route, which asks the account service with the host's own
 * settings. The token identifies the account (Bearer); nothing here can
 * change any other account. The password is never logged or echoed.
 */
export async function POST(req: Request) {
  // Garden-house pass 2026-10-04: every sibling auth door is rate-limited;
  // this one was not (guessable codes / tokens tried without bound).
  if (!(await edgeAllows([`reset:${clientIp(req)}`], AUTH_LOGIN_LIMITER_BINDING))) return tooManyRequests();
  const body = (await req.json().catch(() => null)) as { accessToken?: unknown; password?: unknown } | null;
  const accessToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!accessToken || accessToken.length > 4096) return NextResponse.json({ error: "This recovery link is missing or expired. Request a new one." }, { status: 400 });
  if (password.length < 8 || password.length > 128) return NextResponse.json({ error: "Password must be 8–128 characters." }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || resolveSupabaseServiceKey(process.env);
  if (!url || !apikey) return NextResponse.json({ error: "Password recovery is not configured on this host." }, { status: 503 });

  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", apikey, Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ password }),
      cache: "no-store",
      redirect: "manual",
    });
    if (res.ok) return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    const j = (await res.json().catch(() => ({}))) as { msg?: string; message?: string; error_description?: string };
    const said = String(j.msg ?? j.message ?? j.error_description ?? "");
    // The account service's own words for a dead link or a weak password are
    // safe to pass on; anything else stays generic.
    const safe = res.status === 401 || res.status === 403 ? "This recovery link is missing or expired. Request a new one."
      : res.status === 422 && said && said.length < 200 ? said
      : "Unable to update password.";
    return NextResponse.json({ error: safe }, { status: res.status === 422 ? 422 : res.status === 401 || res.status === 403 ? 401 : 502 });
  } catch {
    return NextResponse.json({ error: "The account service did not answer. Try again." }, { status: 502 });
  }
}
