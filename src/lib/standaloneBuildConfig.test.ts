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
    expect(wrangler).toContain('"main": ".open-next/worker.js"');
  });

  it("binds the package script selector to Next standalone output", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
    const config = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
    expect(pkg.scripts["build:standalone"]).toContain("NEXT_OUTPUT=standalone");
    expect(config).toContain('process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined');
  });
});
