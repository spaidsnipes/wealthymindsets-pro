import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Electron and Cloudflare packaging both require the traced standalone tree.
  // Keep the default dev/build output unchanged unless the existing
  // `build:standalone` script explicitly selects it.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // BUILD STAMP — see src/lib/buildIdentity.ts for what it is for.
  //
  // A shell variable set in front of the build command does NOT survive to the
  // deployed runtime. MEASURED 2026-09-12: `WM_BUILD_SHA=... opennextjs-cloudflare
  // build` produced a worker bundle containing the variable NAME and not its
  // value, because on Cloudflare `process.env` is populated from Worker bindings
  // at request time, not from the laptop shell that ran the build. The endpoint
  // would have answered UNSTAMPED forever — a receipt that always says "I do not
  // know" is worse than no receipt, because it looks like it is working.
  //
  // `env` is the documented mechanism that INLINES the value into the bundle at
  // build time (node_modules/next/dist/docs/01-app/03-api-reference/05-config/
  // 01-next-config-js/env.md). It is host-independent, so the same stamp reaches
  // Cloudflare, the standalone Electron tree and `next start` alike.
  //
  // Because this is a textual replacement, readers MUST write
  // `process.env.WM_BUILD_SHA` as a literal member expression. A dynamic lookup
  // (`someEnv[NAME]`) is not replaced and silently reads undefined — which is
  // the same invisible failure this whole atom exists to end.
  env: {
    WM_BUILD_SHA: process.env.WM_BUILD_SHA ?? "",
    WM_BUILD_TIME: process.env.WM_BUILD_TIME ?? "",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  turbopack: {},
  /**
   * NO `cloudflare:sockets` EXTERNAL HERE — deliberately, and this note exists
   * so nobody re-adds one.
   *
   * MEASURED 2026-09-21: an externals entry made `next build --webpack` pass,
   * and the build still died one stage later inside OpenNext's own esbuild pass
   * (`Could not resolve "cloudflare:sockets"`), which exposes no hook for user
   * externals. Marking it external here only moved the error. The specifier is
   * now named exactly once, in `cloudflare-worker-entry.js`, which wrangler
   * bundles and whose runtime owns the module; no file webpack reads mentions
   * it at all.
   *
   * The general lesson, worth more than the fix: a green `next build` is NOT
   * evidence that the deploy compiles. This repo runs four bundlers — Turbopack
   * in dev, webpack for the OpenNext build command, esbuild inside OpenNext,
   * and esbuild again inside wrangler — and they disagree. Verify on the path
   * that actually ships.
   */
};

export default nextConfig;
