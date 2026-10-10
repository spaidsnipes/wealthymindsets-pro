import { describe, expect, it } from "vitest";
import { CONCEPT_EDUCATION, INSTRUMENT_EDUCATION, INVENTION_EDUCATION, type InventionEducation } from "./inventionEducation";

/*
  Supermax §5 (2026-10-09): every ⓘ record states FULL, PARTIAL, DEGRADED and
  SILENCE. SILENCE is the record's own no-evidence sentence written under its
  own name — no new claim — except a tool that has no silence case, which says why.
*/
const ALL: Record<string, InventionEducation> = { ...INVENTION_EDUCATION, ...INSTRUMENT_EDUCATION, ...(CONCEPT_EDUCATION as Record<string, InventionEducation>) };

describe("every ⓘ record states its four evidence conditions", () => {
  it("64 records (57 + the seven WALLS & GAMMA members), each with FULL, PARTIAL, DEGRADED and SILENCE", () => {
    expect(Object.keys(ALL)).toHaveLength(64);
    for (const [id, r] of Object.entries(ALL)) {
      for (const k of ["full", "partial", "degraded", "silence"] as const) expect(r[k]?.trim().length ?? 0, `${id}.${k}`).toBeGreaterThan(3);
    }
  });
  it("SILENCE adds no claim: it is the record's own no-evidence sentence", () => {
    for (const [id, r] of Object.entries(ALL)) {
      if (id === "SESSION_BANDS") continue;
      expect(r.silence, id).toBe(r.degraded);
    }
  });
  it("the one tool with no silence case says why", () => {
    expect(ALL.SESSION_BANDS.silence).toBe("No silence case — a clock fact: the session clock always has an answer.");
  });
});
