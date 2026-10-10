import { describe, expect, it } from "vitest";
import { INDICATOR_EDUCATION } from "./indicatorEducation";
import {
  BAR_SELECTION_EDUCATION, DRAWING_EDUCATION, LOADOUT_EDUCATION, REPLAY_EDUCATION, SMART_MONEY_CARD_EDUCATION, SMART_MONEY_EDUCATION, VIEW_EDUCATION,
} from "./surfaceEducation";

/*
  Supermax §5 (2026-10-10): the rest of the ⓘ catalogue states SILENCE too —
  283 records. SILENCE is each record's own DEGRADED sentence (no new claim),
  except a surface that has no silence case, which says why.
*/
const CATALOGUE = {
  ...INDICATOR_EDUCATION, ...SMART_MONEY_EDUCATION, ...SMART_MONEY_CARD_EDUCATION, ...DRAWING_EDUCATION, ...VIEW_EDUCATION, ...LOADOUT_EDUCATION,
  REPLAY: REPLAY_EDUCATION, BAR_SELECTION: BAR_SELECTION_EDUCATION,
} as Record<string, { full: string; partial: string; degraded: string; silence?: string }>;

describe("every catalogue ⓘ record states FULL, PARTIAL, DEGRADED and SILENCE", () => {
  it("each has all four", () => {
    expect(Object.keys(CATALOGUE).length).toBeGreaterThanOrEqual(280);
    for (const [id, r] of Object.entries(CATALOGUE)) {
      for (const k of ["full", "partial", "degraded", "silence"] as const) expect(r[k]?.trim().length ?? 0, `${id}.${k}`).toBeGreaterThan(3);
    }
  });
  it("SILENCE is the record's own sentence — except the one surface with no silence case", () => {
    for (const [id, r] of Object.entries(CATALOGUE)) {
      if (id === "WM Playbook") continue;
      expect(r.silence, id).toBe(r.degraded);
    }
    expect(CATALOGUE["WM Playbook"].silence).toMatch(/^No silence case — a fixed library of notes/);
  });
  it("the fundamentals views say what they show when the market is not an equity", () => {
    for (const v of ["ETFs", "Financials", "Valuation", "Corporate Actions", "Shareholders"]) {
      expect(VIEW_EDUCATION[v].degraded, v).toMatch(/^Not an equity — the view says .* apply to equities only and shows no (list|figure)/);
    }
    expect(VIEW_EDUCATION.Profile.degraded).toMatch(/the view says so and fills in nothing/);
  });
});
