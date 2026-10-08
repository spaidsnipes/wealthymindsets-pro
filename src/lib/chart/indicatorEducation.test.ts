/**
 * INDICATORS-MENU ⓘ SENTINEL — Sheriff P1-C / P3-K (2026-10-08).
 *
 * Pins: every row of the Indicators catalogue opens the shared ⓘ preview from
 * a complete record; the row's subtitle is that record's own "what" (one
 * owner, no drift); price-only tools are not filed under Order Flow; and no
 * ⓘ copy anywhere in the registry gives advice or a prediction.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { INDICATOR_EDUCATION, indicatorEducationId } from "@/lib/chart/indicatorEducation";
import { CONCEPT_EDUCATION, INSTRUMENT_EDUCATION, INVENTION_EDUCATION, educationFor, educationTruthLines } from "@/lib/chart/inventionEducation";

const ROOT = resolve(__dirname, "..", "..", "..");
const TOOLBAR = readFileSync(resolve(ROOT, "src/components/chart/ChartToolbar.tsx"), "utf8");

/** The catalogue rows, read from the source (the component is not imported into a node test). */
const ROWS = [...TOOLBAR.matchAll(/\{ cat:"([^"]*)",\s*name:"([^"]*)",\s*desc:("(?:[^"\\]|\\.)*")\s*\}/g)]
  .map(m => ({ cat: m[1], name: m[2], desc: JSON.parse(m[3]) as string }));

const FIELDS = ["what", "question", "evidence", "appears", "grammar", "full", "partial", "degraded", "firstTouch"] as const;

/** Advice, prediction and boilerplate the Sheriff found in ⓘ copy (P1-C, P3-K, batch 3 #13). */
const BANNED = /support trade decisions|more reliable|actionable|institutional|buy (the )?dips|sell (the )?rallies|powerful|favou?rs (buyers|sellers)|magnet|early (reversal )?warning|\btends? to\b|\boften\b|\blikely\b|will (bounce|reverse|hold|continue|break)|high[- ]probability|wait or reduce|trust the|running out of fuel|draws price back|dealer hedging damp/i;

describe("Indicators menu ⓘ (P1-C)", () => {
  it("reads the whole catalogue", () => {
    expect(ROWS.length).toBe(142);
    expect(new Set(ROWS.map(r => r.name)).size).toBe(ROWS.length);
  });

  it("every catalogue row has a complete record, reachable through educationFor", () => {
    for (const r of ROWS) {
      const e = INDICATOR_EDUCATION[r.name];
      expect(e, r.name).toBeTruthy();
      for (const f of FIELDS) expect(String(e[f]).trim().length, `${r.name}.${f}`).toBeGreaterThan(8);
      expect(educationFor(indicatorEducationId(r.name)), r.name).toBe(e);
    }
    expect(Object.keys(INDICATOR_EDUCATION).sort()).toEqual(ROWS.map(r => r.name).sort());
  });

  it("the row subtitle IS the record's what (one owner)", () => {
    for (const r of ROWS) expect(r.desc, r.name).toBe(INDICATOR_EDUCATION[r.name].what);
  });

  it("Order Flow holds only tools that read the tape", () => {
    for (const r of ROWS.filter(x => x.cat === "Order Flow")) {
      expect(["SIDED_TAPE", "PRINTS"], r.name).toContain(INDICATOR_EDUCATION[r.name].needs);
    }
    expect(ROWS.find(r => r.name === "Supply/Demand Zones")?.cat).not.toBe("Order Flow");
    expect(ROWS.find(r => r.name === "Stop Run Alert")?.cat).not.toBe("Order Flow");
  });

  it("the toolbar opens the shared preview with an accessible ⓘ, not the old boilerplate panel", () => {
    expect(TOOLBAR).toMatch(/<InventionInfoButton scope="ind" id=\{indicatorEducationId\(ind\.name\)\}/);
    expect(TOOLBAR).toMatch(/<InventionPreview scope="ind"/);
    expect(TOOLBAR).not.toMatch(/getIndicatorInfo/);
    expect(TOOLBAR).not.toMatch(/title="Show description"/);
  });
});

describe("no advice or prediction in any ⓘ copy (P3-K)", () => {
  const all: [string, Record<string, unknown>][] = [
    ...Object.entries(INDICATOR_EDUCATION).map(([k, v]) => [`IND:${k}`, v as unknown as Record<string, unknown>] as [string, Record<string, unknown>]),
    ...Object.entries(INVENTION_EDUCATION).map(([k, v]) => [k, v as unknown as Record<string, unknown>] as [string, Record<string, unknown>]),
    ...Object.entries(INSTRUMENT_EDUCATION).map(([k, v]) => [k, v as unknown as Record<string, unknown>] as [string, Record<string, unknown>]),
    ...Object.entries(CONCEPT_EDUCATION).map(([k, v]) => [k, v as unknown as Record<string, unknown>] as [string, Record<string, unknown>]),
  ];
  it("every record's trader-facing strings pass the banned-phrase scan", () => {
    const hits: string[] = [];
    for (const [id, rec] of all) {
      for (const [f, v] of Object.entries(rec)) {
        if (f === "canon" || typeof v !== "string") continue;
        if (BANNED.test(v)) hits.push(`${id}.${f}: ${v.match(BANNED)?.[0]}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

describe("the ⓘ verdict follows the tool's real needs (P3-K)", () => {
  const ready = { availability: "READY" as const, availabilityNote: "ready to draw from the bars on screen", stateWords: "" };
  it("a price-only indicator can draw here; under a STALE feed it says so", () => {
    expect(educationTruthLines({ id: indicatorEducationId("RSI"), symbol: "NQ1!" }).verdict).toBe("CAN DRAW HERE");
    expect(educationTruthLines({ id: indicatorEducationId("RSI"), symbol: "NQ1!", feed: "STALE" }).verdict).toBe("DRAWS FROM STALE DATA");
  });
  it("a volume indicator on spot FX is unavailable", () => {
    expect(educationTruthLines({ id: indicatorEducationId("OBV"), symbol: "EURUSD" }).verdict).toBe("UNAVAILABLE HERE");
  });
  it("READY rows that need a chain, other layers or a drawn range name that dependency", () => {
    expect(educationTruthLines({ entry: { ...ready, id: "BRICK_WALLS" } }).verdict).toBe("NEEDS AN OPTIONS CHAIN");
    expect(educationTruthLines({ entry: { ...ready, id: "PROFILE_FUSION" } }).verdict).toBe("NEEDS OTHER LAYERS");
    expect(educationTruthLines({ entry: { ...ready, id: "DELTA_VP", gesture: "DRAW" } }).verdict).toBe("NEEDS YOUR INPUT");
    expect(educationTruthLines({ entry: { ...ready, id: "SESSION" } }).verdict).toBe("CAN DRAW HERE");
  });
});
