import { describe, expect, it } from "vitest";
import { profileEstWord, profileLevelTag } from "./profileEvidenceWord";
import { computeProfileFromBars } from "@/lib/vpEngine";
import { selectProfileMemory } from "./selectProfileMemory";
import type { ValueMigrationVM } from "./selectValueMigration";
import selectCompositeProfile from "./selectCompositeProfile";
import { selectVisibleRangeProfile } from "./selectVisibleRangeProfile";

const bar = (time: number, low: number, volume = 100) => ({ time, open: low, high: low + 1, low, close: low + 1, volume });

describe("G16 §20 · bar-built profiles wear CANDLE-EST", () => {
  it("only a trade-based profile goes unmarked; unknown is marked", () => {
    expect(profileEstWord("trade-based")).toBe("");
    expect(profileEstWord("candle-estimated")).toBe(" · CANDLE-EST");
    expect(profileEstWord(null)).toBe(" · CANDLE-EST");
  });

  it("Composite and Visible Range are built from bars, so their captions carry the word", () => {
    const bars = [0, 1, 2].flatMap(d => Array.from({ length: 10 }, (_, i) => bar(d * 100_000 + i * 60, 100 + d)));
    expect(profileEstWord(selectCompositeProfile(bars).quality)).toBe(" · CANDLE-EST");
    expect(profileEstWord(selectVisibleRangeProfile(bars, 0, 300_000).quality)).toBe(" · CANDLE-EST");
  });
});

describe("G16 §20 · bar-built level chips say EST (Session / Fixed WM VP, Profile Memory)", () => {
  it("the short level tag comes from the same predicate as the caption word", () => {
    expect(profileLevelTag("POC", "candle-estimated")).toBe("POC EST");
    expect(profileLevelTag("VAH", null)).toBe("VAH EST");
    expect(profileLevelTag("VAL", "trade-based")).toBe("VAL");
  });

  it("Session / Fixed WM VP columns are computeProfileFromBars — always estimated, so every level name says EST", () => {
    const bars = Array.from({ length: 20 }, (_, i) => bar(i * 60, 100 + (i % 4)));
    const snap = computeProfileFromBars(bars, { targetRows: 40, valueAreaPct: 0.7 });
    for (const t of ["POC", "VAH", "VAL"]) expect(profileLevelTag(t, snap.quality)).toBe(`${t} EST`);
  });

  it("Profile Memory carries the migration's candle-estimated quality, so each S-n chip says EST", () => {
    const migration = {
      drawn: true, quality: "candle-estimated",
      points: [
        { session: 1, time: 100, poc: 10, vah: 11, val: 9 },
        { session: 2, time: 200, poc: 12, vah: 13, val: 11 },
      ],
    } as unknown as ValueMigrationVM;
    const mem = selectProfileMemory(migration, []);
    expect(mem.quality).toBe("candle-estimated");
    expect(profileLevelTag(mem.levels[0].kind, mem.quality)).toBe("POC EST");
    expect(selectProfileMemory(null, []).quality).toBe("candle-estimated");
  });
});
