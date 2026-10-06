/**
 * An emailed link that landed on the wrong page (sign-in lane 2026-10-06).
 *
 * Supabase sends a confirmation / recovery link to the redirect we ask for —
 * but when that redirect is not on the dashboard's allow-list it falls back to
 * the dashboard "Site URL", e.g. the bare domain. The bare domain redirects on,
 * and the client router drops the `#access_token` fragment, so the person who
 * clicked "confirm" lands on a sign-in form that knows nothing happened. Any
 * page that receives such a fragment hands it to the page that can use it.
 */
export function authLinkForwardTarget(pathname: string, hash: string): string | null {
  if (!hash || hash.length < 2) return null;
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  const hasToken = fragment.has("access_token");
  const hasError = fragment.has("error_description") || fragment.has("error_code");
  if (!hasToken && !hasError) return null;
  const target = fragment.get("type") === "recovery" ? "/reset-password" : "/login";
  // The two pages that read the fragment themselves are never redirected away.
  if (pathname === target || pathname === "/reset-password") return null;
  return `${target}${hash.startsWith("#") ? hash : `#${hash}`}`;
}
