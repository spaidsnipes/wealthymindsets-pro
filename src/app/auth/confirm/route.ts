import { NextResponse } from "next/server";

import { FOUNDER_LANDING_ROUTE } from "@/lib/routing/founderLanding";
import { safeNextPath } from "@/lib/authRoutes";
import { edgeAllows, clientIp, AUTH_LOGIN_LIMITER_BINDING } from "@/lib/edgeRateLimit";
import {
  setAuthCookie,
  signJWT,
  supabaseGetUser,
  supabaseVerifyEmail,
  useSupabase,
  type EmailOtpType,
} from "@/lib/auth";

/**
 * A confirmation-link landing route for a custom Supabase email template
 * (`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…`).
 *
 * Sign-in lane 2026-10-06 — three defects closed:
 *
 *   1. It accepted only `type=email`. Supabase's templates send `signup`,
 *      `magiclink`, `invite` and `recovery` too, so every one of those links
 *      bounced to "That confirmation link is not valid" before Supabase was
 *      ever asked.
 *   2. It verified by fetching ITS OWN host (`/api/auth/confirm` on
 *      url.origin). A Worker calling its own public hostname is a subrequest
 *      loop that the platform may refuse, and the call also lost the visitor's
 *      IP for rate limiting. The verification now happens here, directly.
 *   3. Any failure — including "the account service did not answer" — was
 *      reported as an EXPIRED link, sending people to request fresh emails
 *      forever. A thrown request is now reported as unreachable.
 *
 * The browser never sees an application JWT: the session is an httpOnly
 * cookie set on the redirect. A recovery link is the one exception by
 * necessity — the new-password page needs the recovery token, so it travels
 * in the URL FRAGMENT (never sent to any server) and that page strips it.
 */
const LINK_TYPES: ReadonlySet<EmailOtpType> = new Set(["email", "signup", "magiclink", "invite", "recovery", "email_change"]);

type SupabaseUser = { id?: string; email?: string; user_metadata?: Record<string, unknown> };

function toLogin(origin: string, authError: string): NextResponse {
  return NextResponse.redirect(new URL(`/login?auth_error=${authError}`, origin), 303);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash")?.trim();
  const type = url.searchParams.get("type") as EmailOtpType | null;
  if (!tokenHash || !type || !LINK_TYPES.has(type)) return toLogin(url.origin, "invalid_confirmation");
  if (!useSupabase()) return toLogin(url.origin, "service_unavailable");
  if (!(await edgeAllows([`confirm:${clientIp(request)}`], AUTH_LOGIN_LIMITER_BINDING))) {
    return toLogin(url.origin, "rate_limited");
  }

  let verified: Awaited<ReturnType<typeof supabaseVerifyEmail>>;
  try {
    verified = await supabaseVerifyEmail({ tokenHash, type });
  } catch (e) {
    console.error("[auth/confirm] verification request threw — no verdict was read:", e);
    return toLogin(url.origin, "service_unavailable");
  }
  const session = (verified.data.session ?? verified.data) as { access_token?: string; user?: SupabaseUser };
  if (!verified.ok || !session.access_token) return toLogin(url.origin, "expired_confirmation");

  if (type === "recovery") {
    return NextResponse.redirect(
      new URL(`/reset-password#access_token=${encodeURIComponent(session.access_token)}&type=recovery`, url.origin),
      303,
    );
  }

  let user = session.user;
  if (!user?.id) {
    try { user = await supabaseGetUser(session.access_token) as SupabaseUser; } catch { user = undefined; }
  }
  if (!user?.id || typeof user.email !== "string") return toLogin(url.origin, "expired_confirmation");

  const metadata = user.user_metadata ?? {};
  const text = (v: unknown) => (typeof v === "string" ? v : undefined);
  // Third no-destination arrival: a human who clicked a link in their inbox.
  const destination = safeNextPath(url.searchParams.get("next")) ?? FOUNDER_LANDING_ROUTE;
  const response = NextResponse.redirect(new URL(destination, url.origin), 303);
  response.headers.set("Cache-Control", "no-store");
  setAuthCookie(response.cookies, signJWT({
    sub: user.id,
    email: user.email,
    displayName: text(metadata.displayName),
    handle: text(metadata.handle),
    avatar: text(metadata.avatar),
    bio: text(metadata.bio),
    botName: text(metadata.botName),
    timezone: text(metadata.timezone),
    bgColor: text(metadata.bgColor),
    profileComplete: Boolean(metadata.profileComplete || metadata.displayName),
  }));
  return response;
}
