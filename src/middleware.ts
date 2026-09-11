import { NextRequest, NextResponse } from "next/server";
import { CANONICAL_HOST as canonicalHost, isNonCanonicalPlatformHost } from "@/lib/canonicalUrl";

/**
 * Never let a customer start an authenticated journey on a hosting-platform
 * address instead of the company's own domain.
 *
 * Cookies are deliberately host-scoped. Without this redirect a customer can
 * confirm an email successfully and land back on a host that holds no Passport
 * cookie — the app looks signed-out even though the account is fine, and a
 * second sign-in mints a second, isolated session.
 *
 * 2026-09-11 REPAIR. This guard used to test `.vercel.app` inline. After the
 * Cloudflare cutover that suffix matched nothing — and, critically, the guard
 * did not begin covering the platform hostname that replaced it.
 * `https://wealthymindsets-pro.dhill5711.workers.dev/login` was observed
 * serving a full login surface with NO redirect (HTTP 200), while the Vercel
 * host it did guard returned 402 and could never reach this Worker at all.
 * Nothing threw, `tsc --noEmit` stayed at exit 0, and the host-neutrality locks
 * were green the whole time: a dead string is type-correct.
 *
 * The membership test now lives beside the canonical host in
 * `@/lib/canonicalUrl`, so the next migration edits one list instead of
 * rediscovering this invariant from a support ticket.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host");

  if (isNonCanonicalPlatformHost(host, canonicalHost)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = canonicalHost;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
