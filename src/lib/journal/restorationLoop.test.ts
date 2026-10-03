import { describe, expect, it } from "vitest";
import { dayEvidence, loopProgress, parseRestoration } from "./restorationLoop";
import type { BehaviourTag } from "./behaviorTags";

describe("ATH Restoration Loop — the trader's words, the day's facts", () => {
  it("progress counts steps with words; garbage is dropped", () => {
    const all = parseRestoration(JSON.stringify({ "2026-09-21": { notes: { notice: "12 trades, −$81.72", name: "kept going after −2R", pause: "  ", bogus: "x" }, updatedAt: 5 }, "nope": {} }));
    expect(Object.keys(all)).toEqual(["2026-09-21"]);
    expect(loopProgress(all["2026-09-21"])).toEqual({ done: 2, total: 8, complete: false });
    expect(loopProgress(undefined)).toEqual({ done: 0, total: 8, complete: false });
  });
  it("day evidence counts inferred tags, as facts", () => {
    const t = (id: BehaviourTag["id"]) => ({ id, label: "", evidence: "", truth: "INFERRED", rule: "" }) as BehaviourTag;
    expect(dayEvidence([[t("THIRD_PLUS_ATTEMPT"), t("NO_BRACKET_AT_ENTRY")], [t("THIRD_PLUS_ATTEMPT")]])).toEqual([
      { id: "THIRD_PLUS_ATTEMPT", label: "Trades beyond the second", count: 2 },
      { id: "NO_BRACKET_AT_ENTRY", label: "Entries without a bracket", count: 1 },
    ]);
  });
});
