/**
 * PROFILE MEMORY LEVELS ARE CANONICAL MARKET OBJECTS (while their layer is on).
 *
 * "MEMORY — tests / defenses / decay / rejection history should have
 * biography" + "use canonical MarketObjects and lawful attachments". The room
 * adds selectMemoryMarketObjects' LEVELs to the ONE object list only while the
 * Profile Memory layer is on, and names their owner in the Passport lineage.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const ROOM = strip(readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8"));

describe("Profile Memory levels are canonical market objects", () => {
  it("join the one object list only while the Memory layer is on", () => {
    expect(ROOM).toContain("...(profileMemoryOn ? selectMemoryMarketObjects({ memory: profileMemoryVM, identities: chartBarIdentities }) : []),");
    expect(ROOM).toMatch(/\], \[chartStructureVM, chartBars, chartBarIdentities, chartStructureZones, profileMemoryOn, profileMemoryVM\]\);/);
  });

  it("the memory owners are declared before the object list reads them (no TDZ)", () => {
    const vm = ROOM.indexOf("const profileMemoryVM = React.useMemo(");
    const list = ROOM.indexOf("const chartMarketObjects = React.useMemo(");
    expect(vm).toBeGreaterThan(-1);
    expect(list).toBeGreaterThan(vm);
  });

  it("the Passport's lineage names the memory owner for a memory level", () => {
    expect(ROOM).toContain("memoryLevelKindOf(selectedLevelObject.objectId)");
    expect(ROOM).toContain("selectProfileMemory (a prior session's final POC / VAH / VAL)");
  });
});
