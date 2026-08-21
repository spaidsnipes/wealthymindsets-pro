import { describe, it, expect } from "vitest";
import { buildOverrideEntry, summarizeOverrides, type RuleOverrideEntry } from "./overrideLog";

const NOW = 1_755_400_000_000;

describe("buildOverrideEntry — validation", () => {
  it("builds a valid entry, uppercasing symbol + keeping note", () => {
    const e = buildOverrideEntry({ atMs: NOW, verdict: "ADVISORY", engagedRuleIds: ["reentry"], symbol: "tsla", note: " chased " });
    expect(e).toEqual({ atMs: NOW, verdict: "ADVISORY", engagedRuleIds: ["reentry"], symbol: "TSLA", note: "chased" });
  });

  it("drops an empty note", () => {
    const e = buildOverrideEntry({ atMs: NOW, verdict: "RESTRICTED", engagedRuleIds: [], symbol: "ES", note: "   " });
    expect(e).not.toBeNull();
    expect("note" in (e as object)).toBe(false);
  });

  it("rejects bad atMs / verdict / symbol", () => {
    expect(buildOverrideEntry({ atMs: 0, verdict: "ADVISORY", engagedRuleIds: [], symbol: "X" })).toBeNull();
    expect(buildOverrideEntry({ atMs: NOW, verdict: "ALLOWED" as unknown as "ADVISORY", engagedRuleIds: [], symbol: "X" })).toBeNull();
    expect(buildOverrideEntry({ atMs: NOW, verdict: "ADVISORY", engagedRuleIds: [], symbol: "  " })).toBeNull();
  });

  it("filters non-string rule ids", () => {
    const e = buildOverrideEntry({ atMs: NOW, verdict: "ADVISORY", engagedRuleIds: ["a", "", null as unknown as string], symbol: "X" });
    expect(e!.engagedRuleIds).toEqual(["a"]);
  });
});

describe("summarizeOverrides", () => {
  function entry(over: Partial<RuleOverrideEntry> = {}): RuleOverrideEntry {
    return { atMs: NOW, verdict: "ADVISORY", engagedRuleIds: ["reentry"], symbol: "TSLA", ...over };
  }

  it("counts total, last24h, per-rule, and restricted overrides", () => {
    const s = summarizeOverrides(
      [
        entry({ atMs: NOW - 1_000, engagedRuleIds: ["reentry"] }),
        entry({ atMs: NOW - 2 * 86_400_000, engagedRuleIds: ["reentry", "post-loss"] }), // older than 24h
        entry({ atMs: NOW - 1_000, verdict: "RESTRICTED", engagedRuleIds: ["max-losses"] }),
      ],
      NOW,
    );
    expect(s.total).toBe(3);
    expect(s.last24h).toBe(2);
    expect(s.restrictedOverrides).toBe(1);
    expect(s.byRule).toEqual({ reentry: 2, "post-loss": 1, "max-losses": 1 });
  });

  it("empty log → all zero", () => {
    expect(summarizeOverrides([], NOW)).toEqual({ total: 0, last24h: 0, byRule: {}, restrictedOverrides: 0 });
  });

  it("is pure", () => {
    const es = [entry()];
    expect(summarizeOverrides(es, NOW)).toEqual(summarizeOverrides(es, NOW));
  });
});
