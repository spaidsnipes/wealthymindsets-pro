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

  /**
   * THE VISIBLE COUNT CARRIES ITS OWN NOUN.
   *
   * /charts shows three evidence counts in one viewport — this chip's, the
   * DECISION rail's "0/8 dimensions resolved", and NEXT's "9 unpaid evidence
   * nodes". The chip's scope ("symbol summaries retained in this browser")
   * already exists, but only in `aria-label` and `title`. A bare integer beside
   * an 8 and a 9 is readable as a share of them.
   *
   * Pinned from BOTH sides so the repair cannot be undone by a tidy-up: the
   * noun must be present, and the bare-count render must be absent. The second
   * assertion is the one that matters — without it, deleting the noun and
   * leaving the aria-label alone would keep this green.
   */
  it("the visible evidence count says what it counts, not just how many", () => {
    expect(chip).toContain('symbols.length === 1 ? "symbol" : "symbols"');
    expect(chip).not.toMatch(/·\s*\{symbols\.length\}\s*<\/span>/);
    // The screen-reader sentence is the scope this visible label was derived
    // from. If it ever narrows, the visible noun is no longer backed by it.
    expect(chip).toContain("retained in this browser");
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
