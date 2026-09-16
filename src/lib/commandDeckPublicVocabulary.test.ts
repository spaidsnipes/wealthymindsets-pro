import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(__dirname, path), "utf8");

describe("Command Deck public/private vocabulary", () => {
  const ribbon = source("../components/command/CommandContextRibbon.tsx");
  const page = source("../app/command-deck/page.tsx");

  it("presents observed market evidence without naming private collectors", () => {
    expect(ribbon).toContain('label: "OBSERVED"');
    expect(ribbon).not.toContain('label: "NECTAR"');
    // The heading used to be typed twice on the page — once in its banner and
    // once in the "Awaiting first observation" index. Both now read from
    // deckSectionIndex, which is the single owner of the section names, so the
    // vocabulary rule belongs there: counting literals on the page would only
    // re-assert that the duplication still exists.
    const index = source("./experience/deckSectionIndex.ts");
    expect(index).toContain("Data Fidelity · Market Evidence");
    expect(index).not.toContain("Nectar Memory");
    expect(page).not.toContain("Data Fidelity · Nectar Memory");
  });

  it("preserves the existing observation owner instead of creating a second store", () => {
    expect(ribbon).toContain("getKnownSessionSymbols");
    expect(ribbon).toContain("subscribeSessionSymbolStore");
    expect(ribbon).toContain('key: "nectar"');
  });
});
