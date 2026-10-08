import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PROFILE_FAMILY } from "@/lib/marketData/viewModels/selectProfileMenu";
import { FOOTPRINT_MODES } from "@/lib/workspace/footprintPrefs";
import { INVENTION_CENSUS } from "./inventionCensus";
import { CONCEPT_EDUCATION, INSTRUMENT_EDUCATION, educationFor } from "@/lib/chart/inventionEducation";
import { readFileSync } from "node:fs";

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

describe("Tools search reaches context-only inventions (§XXVI)", () => {
  it("'causal' finds F04A with how to reach it", async () => {
    const { searchCensusPlaces, censusPlaceWords } = await import("./inventionCensus");
    const hit = searchCensusPlaces("causal").find(e => e.id === "F04A");
    expect(hit).toBeDefined();
    expect(censusPlaceWords(hit!)).toMatch(/Big Trades/);
  });
  it("'lineage' finds H-301 and 'breathing' F15 on the WAIT rail; switches and unbuilt ideas are not listed here", async () => {
    const { searchCensusPlaces } = await import("./inventionCensus");
    expect(searchCensusPlaces("lineage").map(e => e.id)).toEqual(["H-301"]);
    expect(searchCensusPlaces("breathing").map(e => e.id)).toEqual(["F15.BREATHING"]);
    expect(searchCensusPlaces("response matrix").map(e => e.id)).toEqual(["AB.MATRIX"]);
    expect(searchCensusPlaces("process gravity")).toEqual([]);
    expect(searchCensusPlaces("memory ghost")).toEqual([]);
    expect(searchCensusPlaces("   ")).toEqual([]);
  });
});

import { searchCensusPlaces as findPlaces } from "./inventionCensus";

describe("Tools search finds SpaidBot by the words traders type (ATHOS order §8)", () => {
  it("SpaidBot, SpadeBot, AI, chat and assistant all find F22", () => {
    for (const q of ["SpaidBot", "spadebot", "AI", "chat", "assistant"]) {
      expect(findPlaces(q).map(e => e.id), q).toContain("F22");
    }
  });
});

describe("§34 audit (2026-10-08) — every Tool Finder instrument and taught concept has a census identity", () => {
  const claimed = new Set(INVENTION_CENSUS.flatMap(e => (e.surface.kind === "INSTRUMENT" ? [e.surface.id] : [])));
  it("every non-footprint INSTRUMENT_EDUCATION record is claimed by a census row", () => {
    const keys = Object.keys(INSTRUMENT_EDUCATION).filter(k => !k.startsWith("FP_"));
    expect(keys.length).toBeGreaterThan(5);
    for (const k of keys) expect(claimed.has(k), `instrument ${k} has no census row`).toBe(true);
  });
  it("every CONCEPT_EDUCATION record is claimed by a census row (as its instrument, or keyed by the census id)", () => {
    const ids = new Set(INVENTION_CENSUS.map(e => e.id));
    const keys = Object.keys(CONCEPT_EDUCATION);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) expect(claimed.has(k) || ids.has(k), `concept ${k} has no census row`).toBe(true);
  });
  it("§34 gap 7: the built CONTEXT-door field inventions have an ⓘ record keyed by their census id", () => {
    for (const id of ["F04A", "F11A", "F11B", "G19.CVD_REL", "G19.CROSS", "G19.VWAP", "F10.TED"]) {
      const r = educationFor(id);
      expect(r, id).not.toBeNull();
      for (const f of ["question", "evidence", "appears", "grammar", "full", "partial", "degraded", "firstTouch", "canon"] as const) {
        expect(r![f].trim().length, `${id}.${f}`).toBeGreaterThan(8);
      }
    }
    expect(educationFor("F10.TED")!.firstTouch).toMatch(/pending the Founder/);
  });
  it("every census INSTRUMENT surface has an ⓘ record and a Tool Finder row", () => {
    const src = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
    const start = src.indexOf("const toolFinderNode = (");
    const block = src.slice(start, src.indexOf("\n  );", start));
    const listed = new Set([...block.matchAll(/\bid: "([A-Z_]+)"/g)].map(m => m[1]));
    if (block.includes("id: FVG_INSTRUMENT_ID")) listed.add("FVG_IMBALANCE");
    for (const id of claimed) {
      expect(educationFor(id), `${id} ⓘ`).not.toBeNull();
      expect(listed.has(id), `${id} is not a Tool Finder instrument`).toBe(true);
    }
  });
  it("the formerly stale rows say what shipped", () => {
    const byId = new Map(INVENTION_CENSUS.map(e => [e.id, e]));
    expect(byId.get("AB.MATRIX")?.status).toBe("BUILT");
    expect(byId.get("G19.BAR_DELTA")?.status).toBe("BUILT");
    expect(byId.get("G19.RVOL")?.surface).toEqual({ kind: "INSTRUMENT", id: "RVOL_TONE" });
    expect(byId.get("G19.RVOL")?.gap).toMatch(/TICK ACTIVITY/);
  });
});

describe("§34 audit gap 2 — every built candle-field invention carries manifestation, ink and narrow behaviour", () => {
  it("every BUILT / PARTIAL row on a Tools switch, footprint mode or Tool Finder instrument has all three (or a stated reason it is not field paint)", async () => {
    const { NOT_FIELD_REASON } = await import("./inventionCensus");
    for (const e of INVENTION_CENSUS) {
      if (e.status !== "BUILT" && e.status !== "PARTIAL") continue;
      const k = e.surface.kind;
      if (k !== "SWITCH" && k !== "FOOTPRINT" && k !== "INSTRUMENT") continue;
      if (NOT_FIELD_REASON[e.id]) continue;
      expect(e.manifestation, `${e.id} manifestation`).toBeDefined();
      expect(e.ink?.length, `${e.id} ink`).toBeGreaterThan(0);
      expect(e.narrow?.why.length, `${e.id} narrow`).toBeGreaterThan(10);
    }
  });

  it("each field fact is real: its permission layer exists, its ink tokens name an owner, its narrow rule follows the table", async () => {
    const { FIELD_FACT_IDS, INK_SOURCE, narrowBehaviourFor } = await import("./inventionCensus");
    const { SEMANTIC_PERMISSION, NARROW_GLASS_KEEPS_WORDS } = await import("@/lib/marketData/viewModels/selectSemanticPermission");
    const byId = new Map(INVENTION_CENSUS.map(e => [e.id, e]));
    expect(FIELD_FACT_IDS.length).toBeGreaterThan(40);
    for (const id of FIELD_FACT_IDS) {
      const e = byId.get(id);
      expect(e, `${id} is not a census row`).toBeDefined();
      expect(e!.status === "BUILT" || e!.status === "PARTIAL", `${id} has facts but is ${e!.status}`).toBe(true);
      for (const t of e!.ink ?? []) expect(INK_SOURCE[t], `${id} ink ${t}`).toBeTruthy();
      if (e!.layer != null) {
        expect(e!.layer in SEMANTIC_PERMISSION, `${id} layer ${e!.layer}`).toBe(true);
        if (NARROW_GLASS_KEEPS_WORDS.has(e!.layer)) expect(e!.narrow?.rule).toBe("KEEP");
      }
      expect(e!.narrow).toEqual(narrowBehaviourFor(e!.layer ?? null, id));
    }
    expect(byId.get("P110.1")?.narrow?.rule).toBe("KEEP");      // Living profile keeps its level names
    expect(byId.get("F08B")?.narrow?.rule).toBe("WITHHOLD");    // the loupe yields on a small pane
    expect(byId.get("H-701.ABS")?.narrow?.rule).toBe("SIMPLIFY");
  });

  it("the not-field reasons only name real rows", async () => {
    const { NOT_FIELD_REASON } = await import("./inventionCensus");
    const ids = new Set(INVENTION_CENSUS.map(e => e.id));
    for (const id of Object.keys(NOT_FIELD_REASON)) expect(ids.has(id), id).toBe(true);
  });
});
