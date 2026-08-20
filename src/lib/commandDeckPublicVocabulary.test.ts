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
    expect(page.match(/Data Fidelity · Market Evidence/g)).toHaveLength(2);
    expect(page).not.toContain("Data Fidelity · Nectar Memory");
  });

  it("preserves the existing observation owner instead of creating a second store", () => {
    expect(ribbon).toContain("getKnownSessionSymbols");
    expect(ribbon).toContain("subscribeSessionSymbolStore");
    expect(ribbon).toContain('key: "nectar"');
  });
});
