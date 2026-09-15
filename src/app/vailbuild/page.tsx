import { redirect } from "next/navigation";

/**
 * A REDIRECT THAT LANDS ON A REDIRECT IS A DETOUR THE USER PAYS FOR.
 *
 * This route used to send the reader to `/veddbuild`, which is itself nothing
 * but a redirect to `/partnerships`. Two hops to reach one page.
 *
 * The first hop was also the expensive kind. It was a client component that
 * rendered `null` and moved the browser from inside `useEffect`, so the
 * sequence was: ship a JS bundle, hydrate it, paint an empty screen, THEN
 * navigate — and only then start hop two. A legacy alias is supposed to be
 * invisible. This one was a blank flash followed by another blank flash.
 *
 * Nothing in the app links here. The only reason to keep the path alive is the
 * saved link or printed URL that still points at it, and that reason is served
 * strictly better by one server-side redirect straight to the destination: no
 * bundle, no hydration, no paint, no chain.
 *
 * The alias is PRESERVED, not retired. Deleting it would 404 those old links,
 * which trades a slow promise for a broken one.
 *
 * Guarded by `× THE DETOUR` in ./redirectStubChain.test.ts, which fails if any
 * redirect stub in the app targets another redirect stub.
 */
export default function VailBuildPage() {
  redirect("/partnerships");
}
