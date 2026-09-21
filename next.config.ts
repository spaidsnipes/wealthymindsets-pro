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
   * `cloudflare:sockets` is a RUNTIME-PROVIDED module, not a package.
   *
   * It is how a Worker opens raw TCP, and WM Pro needs it for exactly one
   * thing: `src/app/api/market-data/webull/streaming/route.ts` opens an MQTT
   * connection to `data-api.webull.com`, Webull's real-time host. Webull's
   * real-time product is not REST — it pushes quotes over MQTT — so there is
   * no fetch-shaped way to reach it.
   *
   * Webpack tries to READ the specifier and fails with UnhandledSchemeError,
   * because `cloudflare:` is not a scheme it knows. Marking it external tells
   * webpack to emit the import untouched and let the Workers runtime resolve
   * it, which is the only correct outcome: there is nothing on this laptop for
   * a bundler to inline.
   *
   * MEASURED 2026-09-21: `next build` (Turbopack, the default here) compiled
   * this file fine and `opennextjs-cloudflare build` — which runs `next build
   * --webpack` — did not. The two bundlers disagree, so a green local `next
   * build` is NOT evidence that the deploy will compile. Verify on the path
   * that actually ships.
   */
  webpack: (config) => {
    const externals = config.externals;
    config.externals = Array.isArray(externals)
      ? [...externals, "cloudflare:sockets"]
      : [externals, "cloudflare:sockets"].filter(Boolean);
    return config;
  },
};

export default nextConfig;
