/**
 * WM Pro — OpenNext Cloudflare configuration (Phase 5 K-Bkt 4).
 *
 * The default configuration is intentionally minimal. Per canon
 * §Portability §Cloudflare-specific law: keep Cloudflare-specific
 * bindings behind adapter boundaries. Anything that would couple
 * business logic to Cloudflare belongs in a runtime adapter file,
 * not here.
 *
 * If future needs require R2 for incremental cache, KV for tag cache,
 * Durable Objects for queues, or a workerd override, add them here
 * with a canon citation in the comment.
 */

import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/*
 * P0 2026-11-08 — PRERENDERED PAGES ARE SERVED, NOT RE-RENDERED.
 *
 * MEASURED 2026-11-08 01:10Z on wealthymindsetspro.com: /pricing, /login and
 * /welcome hung on ~40–100% of requests (no bytes, then cancelled at 42–80 s
 * wall with 2–4 ms CPU), while "/" (a redirect) stayed fast. Every hit said
 * `x-nextjs-cache: MISS` + `x-nextjs-prerender: 1`: with the old empty
 * config the incremental cache was "dummy", so every request re-rendered a
 * page that was already prerendered at build — 300–600 ms CPU each.
 *
 * From 2026-11-08 00:00Z the Worker began failing with exceededCpu at ~10 ms
 * (GraphQL workersInvocationsAdaptive: status=exceededResources,
 * cpuTimeP50=10000 µs). A render killed mid-flight leaves Next's response-cache
 * Batcher entry for that path pending forever in that isolate, so every later
 * request for the same path in that isolate awaits a promise nobody will
 * resolve — the 3 ms-CPU hang.
 *
 * All pages in this app are static (only /api routes are dynamic), so the
 * prerendered output is read straight from Workers static assets, and cache
 * interception answers it in the routing layer before NextServer (and its
 * Batcher) is ever entered. No revalidation exists to lose: no page exports
 * `revalidate`. Route handlers are unchanged.
 */
const cloudflareConfig = defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});

/*
 * The default OpenNext command is `npm run build`, which lets Next choose
 * Turbopack. On the managed production host Turbopack's CSS worker attempts to
 * bind an internal port and the OS rejects it with EPERM before OpenNext can
 * create an artifact. The repo's verified release gate already uses webpack;
 * make that same deterministic build path explicit for Cloudflare instead of
 * depending on the host's process/port policy.
 */
cloudflareConfig.buildCommand = "npm run build -- --webpack";

export default cloudflareConfig;
