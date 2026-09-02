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
    expect(chip).toContain("Evidence saved");
    expect(chip).toContain('aria-label="Open Market Evidence"');
    expect(chip).toContain("View all →");
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

  it("keeps the chart clean until the trader deliberately opens retained evidence", () => {
    expect(chip).toContain("<details");
    expect(chip).toContain("<summary");
    expect(chip).toContain('title="Open retained browser summaries"');
    expect(chip).toContain('maxWidth: "calc(100vw - 24px)"');
    expect(chip).toContain("minHeight: 44, minWidth: 44");
    expect(chip).toContain("aria-pressed={isActive}");
    expect(chip).not.toContain('left: "50%"');
    expect(chip).not.toContain('transform: "translateX(-50%)"');
  });
});
