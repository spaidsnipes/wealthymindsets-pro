import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("standalone build configuration", () => {
  it("rebuilds the OpenNext artifact used by the Cloudflare deploy command", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
    const wrangler = readFileSync(resolve(process.cwd(), "wrangler.jsonc"), "utf8");
    expect(pkg.scripts.build).toBe("next build");
    expect(pkg.scripts["build:cloudflare"]).toBe("opennextjs-cloudflare build");
    expect(wrangler).toContain('"main": ".open-next/worker.js"');
  });

  it("binds the package script selector to Next standalone output", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
    const config = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
    expect(pkg.scripts["build:standalone"]).toContain("NEXT_OUTPUT=standalone");
    expect(config).toContain('process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined');
  });
});
