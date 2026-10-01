import { beforeEach, describe, expect, it } from "vitest";

const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v); },
  removeItem: (k: string) => { mem.delete(k); },
  clear: () => mem.clear(),
};

import { HEAT_ARCHIVE_MAX, deleteHeatSnapshot, heatBreadth, heatLeaders, heatShifts, readHeatArchive, saveHeatSnapshot } from "./heatArchive";

const base = { observedAt: 1_700_000_000_000, period: "1D", universe: "S&P 500", quality: "HISTORICAL", note: "" };

describe("Research Heat Archive", () => {
  beforeEach(() => localStorage.clear());

  it("saves, lists newest first, and deletes", () => {
    const a = saveHeatSnapshot({ ...base, pcts: { AAPL: 1, MSFT: -2 } }, 1000)!;
    const b = saveHeatSnapshot({ ...base, pcts: { AAPL: 2 } }, 2000)!;
    expect(readHeatArchive().map(s => s.id)).toEqual([b.id, a.id]);
    deleteHeatSnapshot(a.id);
    expect(readHeatArchive().map(s => s.id)).toEqual([b.id]);
  });

  it("refuses an empty map and drops non-numbers", () => {
    expect(saveHeatSnapshot({ ...base, pcts: {} })).toBeNull();
    expect(saveHeatSnapshot({ ...base, pcts: { X: Number.NaN, Y: 1 } }, 5)!.pcts).toEqual({ Y: 1 });
  });

  it("caps the archive", () => {
    for (let i = 0; i < HEAT_ARCHIVE_MAX + 5; i++) saveHeatSnapshot({ ...base, pcts: { A: i } }, 10_000 + i);
    expect(readHeatArchive()).toHaveLength(HEAT_ARCHIVE_MAX);
  });

  it("breadth, leaders and the biggest shifts are plain arithmetic", () => {
    expect(heatBreadth({ A: 1, B: -1, C: 0, D: 2 })).toMatchObject({ up: 2, down: 1, flat: 1, total: 4, upShare: 0.5 });
    expect(heatLeaders({ A: 1, B: -3, C: 5 }, 1)).toEqual({ leaders: [["C", 5]], laggards: [["B", -3]] });
    expect(heatShifts({ A: 1, B: 0, C: 2 }, { A: -3, B: 0.5, D: 9 })).toEqual([
      { symbol: "A", then: 1, now: -3, delta: -4 },
      { symbol: "B", then: 0, now: 0.5, delta: 0.5 },
    ]);
  });

  it("a corrupt store reads as empty, never throws", () => {
    localStorage.setItem("wm_research_heat_archive_v1", "{nope");
    expect(readHeatArchive()).toEqual([]);
  });
});
