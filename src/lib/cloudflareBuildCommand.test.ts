import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const config = fs.readFileSync(
  path.join(process.cwd(), "open-next.config.ts"),
  "utf8",
);

describe("Cloudflare release build command", () => {
  it("uses the repo-verified webpack path instead of host-selected Turbopack", () => {
    expect(config).toContain(
      'cloudflareConfig.buildCommand = "npm run build -- --webpack"',
    );
  });

  it("keeps OpenNext as the deployment adapter", () => {
    expect(config).toContain('from "@opennextjs/cloudflare"');
    expect(config).toContain("defineCloudflareConfig");
    expect(config).toContain("export default cloudflareConfig");
  });
});
