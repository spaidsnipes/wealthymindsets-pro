import { NextResponse } from "next/server";

import { useSupabase } from "@/lib/auth";
import { safePath, WOW_ORIGIN, wowCallbackUrl } from "@/lib/passport/wowBridge";
import { requireAuth } from "@/lib/requireAuth";
import { resolveSupabaseServiceKey } from "@/lib/supabaseConfigStatus";

export const dynamic = "force-dynamic";

/**
 * WM PRO → WOW WORLD with the same Passport (see lib/passport/wowBridge).
 *
 * For the signed-in WM user only: asks Supabase for a one-time sign-in link
 * for THAT user (admin generate_link — nothing is emailed) whose landing is
 * WOW's /passport/callback, and sends the browser there. Signed out, or with
 * the identity backend not configured, the door still opens — WOW asks for
 * the Passport itself.
 */
export async function GET(request: Request): Promise<Response> {
  const next = safePath(new URL(request.url).searchParams.get("to"), "/");
  const plain = NextResponse.redirect(new URL(next, WOW_ORIGIN), { status: 303 });
  plain.headers.set("Cache-Control", "no-store");

  const auth = await requireAuth(request);
  if (!auth.ok || !useSupabase()) return plain;
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
    const j = (await res.json().catch(() => null)) as { action_link?: string; properties?: { action_link?: string } } | null;
    const link = j?.properties?.action_link ?? j?.action_link;
    // Only ever forward to the project's own verify endpoint.
    if (!res.ok || !link || !link.startsWith(`${url}/auth/v1/verify`)) return plain;
    const out = NextResponse.redirect(link, { status: 303 });
    out.headers.set("Cache-Control", "no-store");
    out.headers.set("Referrer-Policy", "no-referrer");
    return out;
  } catch {
    return plain;
  }
}
