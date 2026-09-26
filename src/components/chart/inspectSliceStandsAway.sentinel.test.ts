/**
 * INSPECT STANDS ON THE WALL AWAY FROM THE OBJECT — Garden 16 §40, 2026-09-26.
 * Found on the glass: the Living Profile slice ticket opened on the right wall,
 * over the profile body it described (the Living lane is anchored at the
 * price axis). A breadcrumb that reads source: the slice ticket stands on the
 * left wall, like the anatomy ticket's LEFT placement.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SRC = readFileSync(path.join(process.cwd(), "src/components/chart/ChartInspectTicket.tsx"), "utf8");

describe("the profile-slice ticket stands away from the Living lane", () => {
  it("opens on the left wall, never over the right-anchored lane", () => {
    const at = SRC.indexOf("if (selectedProfileSlice) {");
    const block = SRC.slice(at, SRC.indexOf("data-testid=\"chart-inspect-ticket\"", at));
    expect(at).toBeGreaterThan(-1);
    expect(block).toMatch(/<section className="absolute top-16 left-2 /); // below the header row: the symbol and last price stay readable
    expect(block).not.toMatch(/right-\[76px\]/);
  });

  it("the anatomy ticket's wall rule is the precedent it follows", () => {
    expect(SRC).toContain('const wallClass = sel.wall === "LEFT" ? "top-2 left-2" : "top-16 right-[76px]";');
  });
});
