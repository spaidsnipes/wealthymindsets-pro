export const PUBLIC_AUTH_PATHS = ["/login", "/signup", "/reset-password"] as const;

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
