import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("standalone build configuration", () => {
  it("rebuilds the OpenNext artifact used by the Cloudflare deploy command", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
    const wrangler = readFileSync(resolve(process.cwd(), "wrangler.jsonc"), "utf8");
    // These were exact-equality assertions until 2026-09-12. That over-specified
    // the intent: this Sentinel exists to prove the build scripts still invoke
    // the RIGHT BUILDERS and that wrangler still points at the OpenNext worker
    // — not to freeze the environment prefix. When the commit stamp was added
    // (WM_BUILD_SHA, so a deployed bundle can name itself) this failed on a
    // change it has no opinion about. The invocation is what it guards; it now
    // says so by anchoring to the END of the command.
    expect(pkg.scripts.build).toMatch(/(^|\s)next build$/);
    expect(pkg.scripts["build:cloudflare"]).toMatch(/(^|\s)opennextjs-cloudflare build$/);
    // Until 2026-09-21 this read `"main": ".open-next/worker.js"`. Wrangler now
    // enters through `cloudflare-worker-entry.js`, which imports
    // `cloudflare:sockets` — the Webull real-time lane needs raw TCP, and
    // wrangler's bundler is the ONLY one of this repo's four that resolves that
    // specifier. The guard's intent is unchanged: wrangler must still reach the
    // OpenNext worker. So both halves of the chain are asserted, because a main
    // that points at an entry which has stopped re-exporting OpenNext is a
    // deploy that boots and serves nothing.
    expect(wrangler).toContain('"main": "cloudflare-worker-entry.js"');
    const entry = readFileSync(resolve(process.cwd(), "cloudflare-worker-entry.js"), "utf8");
    expect(entry).toContain('from "./.open-next/worker.js"');
    expect(entry).toContain('import { connect } from "cloudflare:sockets"');
  });

  it("binds the package script selector to Next standalone output", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
    const config = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
    expect(pkg.scripts["build:standalone"]).toContain("NEXT_OUTPUT=standalone");
    expect(config).toContain('process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined');
  });
});
