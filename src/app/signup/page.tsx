import { redirect } from "next/navigation";

/**
 * /signup IS AN ADDRESS, NOT A ROOM: sign-up lives on the front door's second
 * tab. The edge answers this path with a real 308 (`@/lib/legacyRouteAliases`,
 * consumed by `src/middleware.ts`); this stub is the fallback if the
 * middleware matcher is ever narrowed — a server redirect like its five
 * siblings, not the client-side bounce it was (garden pass 2026-10-04: an
 * empty page that waited for JavaScript before going anywhere).
 */
export default function SignupAlias() {
  redirect("/login?mode=signup");
}
