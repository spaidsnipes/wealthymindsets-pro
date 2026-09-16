import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Every claim below is made by the SETTINGS PANEL, which used to be a
 * file-private function inside MainLayout. It now lives in `shellPanels` so
 * that both shells can mount the same one — a trader standing in an OS room
 * previously had no way to reach settings at all. This scan follows it there.
 * Left pointing at MainLayout it would match nothing and pass on every commit,
 * which is the quietest way for a Sentinel to stop working.
 */
const layout = fs.readFileSync(
  path.join(process.cwd(), "src/components/layout/shellPanels.tsx"),
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
