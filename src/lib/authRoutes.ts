export const PUBLIC_AUTH_PATHS = ["/login", "/signup", "/reset-password"] as const;

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
  if (loading) return "CHECKING_SESSION";
  if (!user) return "SIGN_IN_REQUIRED";

  const profileComplete = user.profileComplete || !!user.displayName;
  if (!profileComplete && !pathname.startsWith("/profile")) {
    return "PROFILE_SETUP_REQUIRED";
  }

  return "READY";
}
