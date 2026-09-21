/**
 * THE WORKER'S REAL FRONT DOOR.
 *
 * Wrangler's `main` points here rather than at `.open-next/worker.js`, and this
 * file's only job is to hand the Workers runtime's raw-TCP `connect()` to code
 * that OpenNext has already bundled.
 *
 * WHY THIS EXISTS — MEASURED 2026-09-21, three failures deep:
 *
 *  1. `next build` (Turbopack) compiled `import("cloudflare:sockets")` fine.
 *  2. `next build --webpack`, which `opennextjs-cloudflare build` actually
 *     runs, failed with UnhandledSchemeError. Fixed in next.config.ts by
 *     marking the specifier external — webpack then emits it untouched.
 *  3. The emitted specifier reached OpenNext's OWN esbuild pass, which bundles
 *     the server functions into the worker, and esbuild said
 *     `Could not resolve "cloudflare:sockets"`. @opennextjs/cloudflare exposes
 *     no hook for user externals (see dist/api/config.d.ts — incrementalCache,
 *     tagCache, queue, cachePurge, and nothing else), so there is no
 *     configuration that makes that pass tolerate the import.
 *
 * Three bundlers in one build, each with its own idea of what a `cloudflare:`
 * scheme means. The one bundler that has never been confused is WRANGLER's,
 * because `cloudflare:sockets` is its own runtime's module. So the import is
 * hoisted to the only layer that natively understands it, and the value is
 * published on `globalThis` for the bundled route to pick up.
 *
 * `globalThis` is a deliberate choice and not laziness: it is the one namespace
 * that survives being bundled by a different tool than the one that consumed
 * it. The consumer (`src/lib/runtime/rawSockets.ts`) treats its absence as a
 * fact about the runtime and says so, which matters more than usual here —
 * this seam feeds the Webull real-time lane, where for three months a failure
 * on our side of the wire was reported to the Founder as a missing
 * subscription he had in fact already bought.
 *
 * MAINTENANCE: the re-exports below MIRROR the `export` lines that OpenNext
 * generates in `.open-next/worker.js`. If OpenNext adds a Durable Object class,
 * wrangler will fail loudly at deploy with an unresolved class binding rather
 * than shipping something broken — that is the intended failure mode, and the
 * fix is to add the name here.
 */
import { connect } from "cloudflare:sockets";

globalThis.__wmCloudflareConnect = connect;

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
export { default } from "./.open-next/worker.js";
