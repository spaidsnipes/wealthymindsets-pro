import { NextResponse } from "next/server";

import { useSupabase } from "@/lib/auth";
import { safePath, WOW_ORIGIN, wowCallbackUrl } from "@/lib/passport/wowBridge";
import { requireAuth } from "@/lib/requireAuth";
import { edgeAllows, COMMUNITY_WRITE_LIMITER_BINDING } from "@/lib/edgeRateLimit";
import { resolveSupabaseServiceKey } from "@/lib/supabaseConfigStatus";

export const dynamic = "force-dynamic";

/**
 * WM PRO → WOW WORLD with the same Passport (see lib/passport/wowBridge).
 *
 * For the signed-in WM user only: asks Supabase for a one-time sign-in token
 * for THAT user (admin generate_link — nothing is emailed) and sends the
 * browser to WOW's /passport/callback with the token hash in the fragment;
 * WOW redeems it with Supabase. Signed out, or with
 * the identity backend not configured, the door still opens — WOW asks for
 * the Passport itself.
 */
export async function GET(request: Request): Promise<Response> {
  const next = safePath(new URL(request.url).searchParams.get("to"), "/");
  const plain = NextResponse.redirect(new URL(next, WOW_ORIGIN), { status: 303 });
  plain.headers.set("Cache-Control", "no-store");

  const auth = await requireAuth(request);
  if (!auth.ok || !useSupabase()) return plain;
  // Each GET mints a magic link through the service-role admin API; bound it
  // per user (garden pass 2026-10-04). Over the limit, the plain door still works.
  if (!(await edgeAllows([`to-wow:${auth.user.sub}`], COMMUNITY_WRITE_LIMITER_BINDING))) return plain;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = resolveSupabaseServiceKey(process.env);
  if (!url || !service) return plain;

  try {
    const res = await fetch(`${url}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", email: auth.user.email, redirect_to: wowCallbackUrl(next) }),
      cache: "no-store",
      redirect: "manual",
    });
    const j = (await res.json().catch(() => null)) as { hashed_token?: string; properties?: { hashed_token?: string } } | null;
    const hash = j?.properties?.hashed_token ?? j?.hashed_token;
    if (!res.ok || !hash || !/^[A-Za-z0-9_-]{16,200}$/.test(hash)) return plain;
    // WOW redeems the one-time hash with the issuer itself (POST /auth/v1/verify)
    // — no dependence on the issuer's redirect allowlist (measured 2026-10-03:
    // the Site URL fallback is the retired Vercel host). The hash rides in the
    // FRAGMENT, which no server ever receives.
    const landing = new URL(wowCallbackUrl(next));
    landing.hash = new URLSearchParams({ token_hash: hash, type: "magiclink" }).toString();
    const out = NextResponse.redirect(landing.toString(), { status: 303 });
    out.headers.set("Cache-Control", "no-store");
    out.headers.set("Referrer-Policy", "no-referrer");
    return out;
  } catch {
    return plain;
  }
}
