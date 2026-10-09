/**
 * THE PASSPORT BRIDGE BETWEEN WM PRO AND WOW WORLD OS — PURE PARTS.
 *
 * One identity (the shared Supabase project = WM World Passport), two
 * products. Signed in on one side means signed in on the other:
 *
 *   WM Pro → WOW   /api/passport/to-wow mints a one-time Supabase sign-in link
 *                  for the WM session's own user; Supabase lands the browser
 *                  on WOW's /passport/callback with the session in the URL
 *                  FRAGMENT (never sent to a server), which WOW already adopts.
 *   WOW → WM Pro   WOW form-POSTs its Supabase access token to
 *                  /api/passport/from-wow; WM Pro asks Supabase who the token
 *                  belongs to and issues its own session for that user. Only
 *                  a POST whose Origin is WOW is accepted.
 *
 * Neither side ever sees a password. No new secret is needed on WOW.
 */
import type { JWTPayload } from "@/lib/auth";

/** WOW's canonical address. Sessions WM sends to WOW land here. */
export const WOW_ORIGIN = "https://thewow.online";

/**
 * Every address WOW is served from. A Passport posted from any of them is
 * accepted: the canonical domain, its www form, and the original workers.dev
 * address (still live, so guests with an old tab or link are not stranded).
 */
export const WOW_ORIGINS: readonly string[] = [WOW_ORIGIN, "https://www.thewow.online", "https://wow-world-os.dhill5711.workers.dev"];

export function isWowOrigin(origin: string | null): boolean {
  return origin !== null && WOW_ORIGINS.includes(origin);
}

/** A same-site path to land on: relative, no scheme, no `//`, no backslash. */
export function safePath(raw: unknown, fallback: string): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s.startsWith("/") || s.startsWith("//") || /[\\\r\n]/.test(s) || s.length > 300) return fallback;
  return s;
}

/** WM Pro's session claims for a Supabase user (same mapping as the Dreamboard handoff). */
export function wmClaimsFor(user: Record<string, unknown> | null): Omit<JWTPayload, "iat" | "exp"> | null {
  const id = typeof user?.id === "string" ? user.id : "";
  const email = typeof user?.email === "string" ? user.email : "";
  if (!id || !email) return null;
  const m = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof m[k] === "string" ? (m[k] as string) : undefined);
  return {
    sub: id, email,
    displayName: str("displayName"), handle: str("handle"), avatar: str("avatar"), bio: str("bio"),
    botName: str("botName"), timezone: str("timezone"), bgColor: str("bgColor"),
    profileComplete: Boolean(m.profileComplete || m.displayName),
  };
}

/** The WOW landing that adopts a session from the fragment, carrying where to go next. */
export function wowCallbackUrl(next: string): string {
  const u = new URL("/passport/callback", WOW_ORIGIN);
  const to = safePath(next, "/");
  if (to !== "/") u.searchParams.set("to", to);
  return u.toString();
}
