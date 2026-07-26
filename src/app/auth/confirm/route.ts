import { NextResponse } from "next/server";

/**
 * A confirmation-link landing route for a custom Supabase email template.
 * It deliberately accepts only the token hash and immediately hands it to the
 * same-origin confirmation API. The browser never sees an application JWT and
 * the final redirect is fixed to WM Pro's own workspace.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash")?.trim();
  const type = url.searchParams.get("type");
  if (!tokenHash || type !== "email") {
    return NextResponse.redirect(new URL("/login?auth_error=invalid_confirmation", url.origin), 303);
  }

  const verified = await fetch(new URL("/api/auth/confirm", url.origin), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenHash }),
    cache: "no-store",
  });
  if (!verified.ok) {
    return NextResponse.redirect(new URL("/login?auth_error=expired_confirmation", url.origin), 303);
  }
  const response = NextResponse.redirect(new URL("/charts", url.origin), 303);
  const cookie = verified.headers.get("set-cookie");
  if (cookie) response.headers.set("set-cookie", cookie);
  return response;
}
