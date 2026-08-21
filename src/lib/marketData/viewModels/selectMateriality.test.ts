import { describe, it, expect } from "vitest";
import { selectMateriality } from "./selectMateriality";
import type { OneStoryVM } from "./selectOneStory";
import type { RightOfWay } from "./decisionPermissionCompiler";

const story = (
  overrides: Partial<OneStoryVM> & { decisionValue?: RightOfWay },
): OneStoryVM => ({
  primary: overrides.primary ?? "Market in balance.",
  contradiction: overrides.contradiction ?? null,
  missing: overrides.missing ?? null,
  decision: {
    value: overrides.decisionValue ?? "UNKNOWN",
    detail: "test",
    tone: "unknown",
  },
  debt: overrides.debt ?? null,
});

describe("selectMateriality — canon §4 gate for Auto-Quiet", () => {
  it("initial render (prev=null) is NOT material — it's the baseline", () => {
    const r = selectMateriality(null, story({}));
    expect(r.material).toBe(false);
    expect(r.reasons).toEqual([]);
    expect(r.summary).toBe("initial render");
  });

  it("identical snapshots → not material", () => {
    const a = story({ decisionValue: "WAIT" });
    const b = story({ decisionValue: "WAIT" });
    const r = selectMateriality(a, b);
    expect(r.material).toBe(false);
    expect(r.summary).toBe("no material change");
  });

  it("DECISION_CHANGED is a material change", () => {
    const prev = story({ decisionValue: "WAIT" });
    const next = story({ decisionValue: "ACTION" });
    const r = selectMateriality(prev, next);
    expect(r.material).toBe(true);
    expect(r.reasons).toContain("DECISION_CHANGED");
  });

  it("MISSING_APPEARED when debt.missing goes 0 → >0", () => {
    const prev = story({ debt: { total: 3, resolved: 3, missing: 0, warn: 0, missingLabels: [], warnLabels: [] } });
    const next = story({ debt: { total: 3, resolved: 2, missing: 1, warn: 0, missingLabels: ["Aggression"], warnLabels: [] } });
    const r = selectMateriality(prev, next);
    expect(r.reasons).toContain("MISSING_APPEARED");
    expect(r.material).toBe(true);
  });

  it("MISSING_RESOLVED when debt.missing goes >0 → 0", () => {
    const prev = story({ debt: { total: 3, resolved: 2, missing: 1, warn: 0, missingLabels: ["A"], warnLabels: [] } });
    const next = story({ debt: { total: 3, resolved: 3, missing: 0, warn: 0, missingLabels: [], warnLabels: [] } });
    const r = selectMateriality(prev, next);
    expect(r.reasons).toContain("MISSING_RESOLVED");
  });

  it("MISSING_INCREASED distinguishes from APPEARED", () => {
    const prev = story({ debt: { total: 5, resolved: 3, missing: 2, warn: 0, missingLabels: ["A", "B"], warnLabels: [] } });
    const next = story({ debt: { total: 5, resolved: 2, missing: 3, warn: 0, missingLabels: ["A", "B", "C"], warnLabels: [] } });
    const r = selectMateriality(prev, next);
    expect(r.reasons).toContain("MISSING_INCREASED");
    expect(r.reasons).not.toContain("MISSING_APPEARED");
  });

  it("MISSING_DECREASED distinguishes from RESOLVED", () => {
    const prev = story({ debt: { total: 5, resolved: 2, missing: 3, warn: 0, missingLabels: [], warnLabels: [] } });
    const next = story({ debt: { total: 5, resolved: 3, missing: 2, warn: 0, missingLabels: [], warnLabels: [] } });
    const r = selectMateriality(prev, next);
    expect(r.reasons).toContain("MISSING_DECREASED");
    expect(r.reasons).not.toContain("MISSING_RESOLVED");
  });

  it("CONTRADICTION_APPEARED / CLEARED / CHANGED", () => {
    const base = story({});
    const withCon = story({ contradiction: "Weak participation" });
    const withCon2 = story({ contradiction: "Different reason" });

    expect(selectMateriality(base, withCon).reasons).toContain("CONTRADICTION_APPEARED");
    expect(selectMateriality(withCon, base).reasons).toContain("CONTRADICTION_CLEARED");
    expect(selectMateriality(withCon, withCon2).reasons).toContain("CONTRADICTION_CHANGED");
  });

  it("PRIMARY_CHANGED when story sentence flips", () => {
    const prev = story({ primary: "Market in balance." });
    const next = story({ primary: "Trend expanding." });
    const r = selectMateriality(prev, next);
    expect(r.reasons).toContain("PRIMARY_CHANGED");
  });

  it("reasons ordered so DECISION_CHANGED comes first when applicable", () => {
    const prev = story({
      decisionValue: "WAIT",
      primary: "In balance.",
      debt: { total: 3, resolved: 3, missing: 0, warn: 0, missingLabels: [], warnLabels: [] },
    });
    const next = story({
      decisionValue: "ACTION",
      primary: "Trend expanding.",
      debt: { total: 3, resolved: 3, missing: 0, warn: 0, missingLabels: [], warnLabels: [] },
    });
    const r = selectMateriality(prev, next);
    expect(r.reasons[0]).toBe("DECISION_CHANGED");
  });

  it("summary joins first two reasons for compact display", () => {
    const prev = story({ decisionValue: "WAIT", contradiction: null });
    const next = story({ decisionValue: "ACTION", contradiction: "New signal" });
    const r = selectMateriality(prev, next);
    expect(r.summary).toContain("decision changed");
    expect(r.summary).toContain("contradiction");
  });
});
