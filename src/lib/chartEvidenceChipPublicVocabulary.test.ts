import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const chip = fs.readFileSync(
  path.join(process.cwd(), "src/components/chart/NectarVaultChip.tsx"),
  "utf8",
);

describe("chart Market Evidence chip", () => {
  it("uses outcome-facing public vocabulary", () => {
    expect(chip).toContain("Market Evidence.");
    expect(chip).toContain(">EVIDENCE</span>");
    expect(chip).toContain("BROWSER SUMMARY");
    expect(chip).toContain('aria-label="Open Market Evidence"');
    expect(chip).toContain("DETAILS →");
    expect(chip).not.toContain("WM Nectar Vault —");
    expect(chip).not.toContain(">VAULT</span>");
    expect(chip).not.toContain("provider rights UNKNOWN");
  });

  it("preserves the canonical observation owner and internal route", () => {
    expect(chip).toContain("getKnownSessionSymbols");
    expect(chip).toContain("subscribeSessionSymbolStore");
    expect(chip).toContain("setActiveSymbol(symbol)");
    expect(chip).toContain("symbols.slice(0, 6)");
    expect(chip).toContain('href="/nectar"');
  });

  it("keeps actions touch-safe inside a contained horizontal strip", () => {
    expect(chip.match(/minHeight: 44, minWidth: 44/g)?.length).toBeGreaterThanOrEqual(2);
    expect(chip).toContain('overflowX: "auto"');
    expect(chip).toContain('calc(100vw - 16px)');
    expect(chip).toContain('overscrollBehaviorX: "contain"');
    expect(chip).toContain("aria-pressed={isActive}");
  });
});
