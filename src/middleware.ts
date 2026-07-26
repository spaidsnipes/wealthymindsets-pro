import { NextRequest, NextResponse } from "next/server";

const canonicalUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://wealthymindsets-pro.vercel.app";
const canonicalHost = new URL(canonicalUrl).host;

/**
 * Never let a customer start an authenticated production journey on a changing
 * Vercel deployment hostname. Cookies are deliberately host-scoped; without
 * this redirect, an email can confirm successfully yet return to a different
 * host that has no Passport cookie.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase();
  const isTemporaryVercelHost = host?.endsWith(".vercel.app") && host !== canonicalHost;

  // Do this for every ephemeral *.vercel.app hostname. Preview deployments are
  // intentionally not customer Passport environments either; they must not
  // create a separate identity cookie from the stable public application.
  if (isTemporaryVercelHost) {
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
