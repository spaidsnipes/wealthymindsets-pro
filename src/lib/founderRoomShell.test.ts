import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (): string =>
  readFileSync(resolve(__dirname, "../components/layout/MainLayout.tsx"), "utf8");

describe("Founder operating-room shell", () => {
  it("removes the legacy multi-symbol tape only from /command-deck", () => {
    const layout = source();
    expect(layout).toContain('const isFounderOperatingRoom = pathname === "/command-deck";');
    expect(layout).toContain("{isFounderOperatingRoom ? (");
    expect(layout).toContain('data-testid="founder-room-header-space"');
    expect(layout).toContain("<TickerTape />");
  });

  it("keeps the suppression presentational and does not invent replacement market truth", () => {
    const layout = source();
    const start = layout.indexOf("{isFounderOperatingRoom ? (");
    const end = layout.indexOf(")}", start);
    const founderBranch = layout.slice(start, end);
    expect(founderBranch).toContain('aria-hidden="true"');
    expect(founderBranch).not.toMatch(/LIVE|DELAYED|price|source|provider/i);
  });
});
