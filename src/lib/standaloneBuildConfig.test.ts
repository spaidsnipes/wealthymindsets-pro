import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("standalone build configuration", () => {
  it("binds the package script selector to Next standalone output", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
    const config = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
    expect(pkg.scripts["build:standalone"]).toContain("NEXT_OUTPUT=standalone");
    expect(config).toContain('process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined');
  });
});
