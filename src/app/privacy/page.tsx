import { redirect } from "next/navigation";

/**
 * /privacy IS AN ADDRESS, NOT A ROOM: the document lives at /legal/privacy. The edge
 * answers this path with a real 308 (`@/lib/legacyRouteAliases`, consumed by
 * `src/middleware.ts`); this stub is the fallback if the middleware matcher
 * is ever narrowed, so the address can never 404 (it did until 2026-10-25).
 */
export default function PrivacyAlias() {
  redirect("/legal/privacy");
}
