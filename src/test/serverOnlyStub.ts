/**
 * Test-environment stand-in for the `server-only` package.
 *
 * `server-only` is a build-time TRIPWIRE, not behaviour: its entire job is to
 * make a bundler fail loudly when server code is pulled into a client bundle.
 * It is supplied by the framework at build time and is not an installed
 * dependency here, so a Vitest run that VALUE-imports a server module (e.g.
 * `src/lib/tastytrade.ts`) cannot resolve it and the whole suite fails to load.
 *
 * WHY A STUB AND NOT AN INSTALL: installing the real package would make the
 * tripwire resolvable in the test environment too, where there is no client
 * bundle to protect — it would trade a loud missing-module error for a silent
 * no-op and add a dependency that ships nothing. This stub is the same no-op,
 * declared where a reader can see it is a test-only accommodation.
 *
 * It deliberately does NOT weaken the real guard: the alias lives in
 * `vitest.config.ts` only, so `next build` still resolves the genuine package
 * and still refuses a server module imported from a client component.
 */
export {};
