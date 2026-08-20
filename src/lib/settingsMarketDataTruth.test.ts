import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const layout = fs.readFileSync(
  path.join(process.cwd(), "src/components/layout/MainLayout.tsx"),
  "utf8",
);

describe("Settings market-data truth", () => {
  it("directs people to contextual health instead of hardcoding a live claim", () => {
    expect(layout).toContain('label="Market Data"');
    expect(layout).toContain('sub="Status varies by source, symbol, and freshness"');
    expect(layout).toContain("See contextual data health");
    expect(layout).not.toContain("Live market data status");
    expect(layout).not.toContain("Real-time feeds active");
  });

  it("keeps the established Settings account surface and shared drawer owner", () => {
    expect(layout).toContain('tab === "account"');
    expect(layout).toContain("<ShellModalDrawer");
    expect(layout).toContain('title="Settings"');
  });
});
