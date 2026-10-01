import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PROFILE_FAMILY } from "@/lib/marketData/viewModels/selectProfileMenu";
import { FOOTPRINT_MODES } from "@/lib/workspace/footprintPrefs";
import { INVENTION_CENSUS } from "./inventionCensus";

const root = process.cwd();

describe("Garden 18 §CV — ZERO GHOSTS: every invention has an identity, an owner and a door", () => {
  it("ids are unique", () => {
    const ids = INVENTION_CENSUS.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every named owner file exists (an owner that disappears is a ghost)", () => {
    for (const e of INVENTION_CENSUS) if (e.owner) expect(existsSync(join(root, e.owner)), `${e.id} owner ${e.owner}`).toBe(true);
  });

  it("every BUILT or PARTIAL consumer invention has a surface a trader can reach", () => {
    for (const e of INVENTION_CENSUS) {
      if (e.status === "BUILT" || e.status === "PARTIAL") expect(e.surface.kind, `${e.id} has no door`).not.toBe("NONE");
    }
  });

  it("every Tools switch belongs to a census invention (no switch without an identity)", () => {
    const claimed = new Set(INVENTION_CENSUS.flatMap(e => (e.surface.kind === "SWITCH" ? [e.surface.id] : [])));
    for (const id of Object.keys(PROFILE_FAMILY)) expect(claimed.has(id as keyof typeof PROFILE_FAMILY), `switch ${id} is not in the census`).toBe(true);
  });

  it("every census switch is a real Tools switch", () => {
    for (const e of INVENTION_CENSUS) if (e.surface.kind === "SWITCH") expect(e.surface.id in PROFILE_FAMILY, e.id).toBe(true);
  });

  it("every footprint mode is claimed, and every claimed mode exists", () => {
    const claimed = INVENTION_CENSUS.flatMap(e => (e.surface.kind === "FOOTPRINT" ? [e.surface.mode] : []));
    for (const m of FOOTPRINT_MODES) expect(claimed, `footprint ${m}`).toContain(m);
    for (const m of claimed) expect(FOOTPRINT_MODES as readonly string[]).toContain(m);
  });

  it("every route surface is a real page", () => {
    for (const e of INVENTION_CENSUS) {
      if (e.surface.kind !== "ROUTE") continue;
      expect(existsSync(join(root, "src/app", e.surface.href, "page.tsx")), `${e.id} → ${e.surface.href}`).toBe(true);
    }
  });

  it("anything not built says what is missing — never silently omitted", () => {
    for (const e of INVENTION_CENSUS) if (e.status === "NOT_BUILT" || e.status === "PARTIAL") expect(e.gap, e.id).toBeTruthy();
  });
});
