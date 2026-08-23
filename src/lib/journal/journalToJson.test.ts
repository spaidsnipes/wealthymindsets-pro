import { describe, it, expect } from "vitest";
import { journalToJson, JOURNAL_JSON_SCHEMA_VERSION, type JournalJsonExport } from "./journalToJson";
import type { JournalCsvEntry } from "./journalToCsv";

const mk = (over: Partial<JournalCsvEntry>): JournalCsvEntry => ({
  date: "2026-08-24", symbol: "TSLA", side: "long",
  entry: 100, exit: 120, size: 1, pnl: 20, pct: 20,
  result: "win", setup: "CLC Long", tags: [], notes: "",
  ...over,
});

describe("journalToJson — schema + normalization", () => {
  it("wraps entries in a versioned document", () => {
    const raw = journalToJson([], "2026-08-24T00:00:00Z");
    const parsed = JSON.parse(raw) as JournalJsonExport;
    expect(parsed.version).toBe(JOURNAL_JSON_SCHEMA_VERSION);
    expect(parsed.exportedAt).toBe("2026-08-24T00:00:00Z");
    expect(parsed.entryCount).toBe(0);
    expect(parsed.entries).toEqual([]);
  });

  it("preserves Proof Lane fields when present", () => {
    const raw = journalToJson([
      mk({
        contractType: "option",
        dayModel: "M1",
        plannedRDollars: 20,
        realizedR: 5,
        processQuality: "FOLLOWED_PLAN",
      }),
    ], "2026-08-24T00:00:00Z");
    const parsed = JSON.parse(raw) as JournalJsonExport;
    expect(parsed.entries[0].contractType).toBe("option");
    expect(parsed.entries[0].dayModel).toBe("M1");
    expect(parsed.entries[0].plannedRDollars).toBe(20);
    expect(parsed.entries[0].realizedR).toBe(5);
    expect(parsed.entries[0].processQuality).toBe("FOLLOWED_PLAN");
  });

  it("drops undefined-valued fields entirely (no dayModel:null noise on legacy entries)", () => {
    const raw = journalToJson([mk({})], "2026-08-24T00:00:00Z");
    // Legacy entry: dayModel / plannedRDollars / realizedR / contractType
    // / processQuality should NOT appear in the JSON output.
    expect(raw).not.toContain('"dayModel"');
    expect(raw).not.toContain('"plannedRDollars"');
    expect(raw).not.toContain('"realizedR"');
    expect(raw).not.toContain('"contractType"');
    expect(raw).not.toContain('"processQuality"');
    // But required fields must be present.
    expect(raw).toContain('"symbol"');
    expect(raw).toContain('"entry"');
  });

  it("preserves 0 / false / empty string (only undefined is dropped)", () => {
    const raw = journalToJson([mk({ pnl: 0, notes: "" })], "2026-08-24T00:00:00Z");
    const parsed = JSON.parse(raw) as JournalJsonExport;
    expect(parsed.entries[0].pnl).toBe(0);
    expect(parsed.entries[0].notes).toBe("");
  });

  it("output is human-readable (2-space indent)", () => {
    const raw = journalToJson([mk({})], "2026-08-24T00:00:00Z");
    expect(raw).toMatch(/^\{\n  "version"/);
  });
});
