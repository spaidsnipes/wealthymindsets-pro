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

export default defineCloudflareConfig({
  // Intentionally empty. Defaults route SSR/route-handler traffic
  // through the Workers runtime with in-memory cache. Suitable for
  // the initial Cloudflare cutover; upgrade to R2/KV incremental
  // cache when observability shows a need.
});
