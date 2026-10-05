export const PUBLIC_AUTH_PATHS = ["/login", "/signup", "/reset-password"] as const;

/**
 * Public INFORMATION pages (Garden 18 ATHOS order §9 / P0.4, 2026-10-05): the
 * prices and the risk / market-data disclosures a guest must be able to read
 * BEFORE signing up. Readable signed out AND signed in — unlike the auth doors,
 * a signed-in member is never bounced away from them.
 */
export const PUBLIC_INFO_PATHS = ["/pricing", "/legal"] as const;

export function isPublicInfoPath(pathname: string): boolean {
  return PUBLIC_INFO_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export type AuthenticatedRouteState =
  | "PUBLIC"
  | "CHECKING_SESSION"
  | "SIGN_IN_REQUIRED"
  | "PROFILE_SETUP_REQUIRED"
  | "READY";

interface AuthRouteUser {
  profileComplete: boolean;
  displayName?: string;
}

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * One fail-closed owner for protected-route render readiness.
 *
 * Route effects still own navigation. The application shell uses this same
 * decision to avoid mounting protected pages (and their data effects) during
 * session hydration or while a redirect is pending.
 */
export function selectAuthenticatedRouteState(
  pathname: string,
  user: AuthRouteUser | null,
  loading: boolean,
): AuthenticatedRouteState {
  if (isPublicAuthPath(pathname)) return "PUBLIC";
  if (isPublicInfoPath(pathname) && !user) return loading ? "CHECKING_SESSION" : "PUBLIC";
  if (isPublicInfoPath(pathname)) return "READY";
  if (loading) return "CHECKING_SESSION";
  if (!user) return "SIGN_IN_REQUIRED";

  const profileComplete = user.profileComplete || !!user.displayName;
  if (!profileComplete && !pathname.startsWith("/profile")) {
    return "PROFILE_SETUP_REQUIRED";
  }

  return "READY";
}

/**
 * Where a human was headed before the sign-in door, if it is safe to send
 * them back there.
 *
 * Reported 2026-10-02: normal users could not reach /lounge or /education.
 * The guard sent them to /login with no memory of the room, and after sign-in
 * every arrival landed on the founder landing route instead. A destination is
 * honoured only when it is a same-origin path (one leading slash, no scheme,
 * no protocol-relative or backslash tricks) and not itself an auth door.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  if (/[\u0000-\u001f]/.test(raw)) return null;
  const path = raw.split(/[?#]/)[0];
  if (path === "/" || isPublicAuthPath(path)) return null;
  return raw;
}

/** The sign-in door for a protected path, carrying the destination along. */
export function signInPathFor(pathname: string, search = ""): string {
  const next = safeNextPath(`${pathname}${search}`);
  return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
}
