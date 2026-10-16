/**
 * `next/navigation` for the geometry measurement bundle ONLY
 * (scripts/measure-experience-geometry.mjs). Since plate 34 (cb57e0a) the WAIT
 * card's stage ribbon asks who is signed in (useBrokerAudience → AuthContext),
 * and AuthContext imports Next's CommonJS router hooks, which cannot ride in a
 * node ESM bundle ("Dynamic require of react is not supported" — CI, red from
 * 2026-10-16 07:30Z). A static render has no router: these answer as an
 * un-navigated page, so the surface measures its signed-out geometry.
 * Never imported by app code.
 */
const noop = () => {};
export function useRouter() {
  return { push: noop, replace: noop, refresh: noop, back: noop, forward: noop, prefetch: noop };
}
export function usePathname(): string { return "/charts"; }
export function useSearchParams(): URLSearchParams { return new URLSearchParams(); }
export function useParams(): Record<string, string> { return {}; }
export function redirect(): never { throw new Error("redirect is not available in the geometry bundle"); }
export function notFound(): never { throw new Error("notFound is not available in the geometry bundle"); }
