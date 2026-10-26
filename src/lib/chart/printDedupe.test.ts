import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { RECENT_TICK_RETENTION } from "@/hooks/useWebSocket";
import { printDedupeWindow, trimPrintDedupe } from "./printDedupe";

/**
 * P0 2026-10-25 — MainChart re-scans the whole retained tape on every flush and skips folded prints by
 * key. With an 8,000-print tape (6f77294c, 2026-10-23) and a 4,000-key window, every flush re-folded
 * thousands of old prints (duplicate volume in the footprint/bubbles; 12 fps, heap 720 MB at minute 2
 * of a 40 prints/s soak). This replays that exact loop.
 */
function replay(trim: (seen: Set<string>) => Set<string>, prints: number, perFlush: number, retention: number) {
  let seen = new Set<string>();
  const folds = new Map<number, number>();
  const tape: number[] = []; // newest LAST
  for (let id = 0; id < prints; ) {
    for (let k = 0; k < perFlush && id < prints; k++) tape.push(id++);
    if (tape.length > retention) tape.splice(0, tape.length - retention);
    for (let i = tape.length - 1; i >= 0; i--) { // the hook's tape is newest-first
      const key = `p${tape[i]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      seen = trim(seen);
      folds.set(tape[i], (folds.get(tape[i]) ?? 0) + 1);
    }
  }
  return { folds, maxFold: Math.max(...folds.values()), totalFolds: [...folds.values()].reduce((a, b) => a + b, 0) };
}

describe("the print dedupe window outlives the tape it guards", () => {
  it("the old 8,000/4,000 window re-folds prints once the tape passes 4,000 (the regression)", () => {
    const old = (s: Set<string>) => (s.size > 8000 ? new Set([...s].slice(-4000)) : s);
    const r = replay(old, 12_000, 40, RECENT_TICK_RETENTION);
    expect(r.maxFold).toBeGreaterThan(1);
    expect(r.totalFolds).toBeGreaterThan(12_000 * 2);
  });

  it("every print is folded exactly once with the window sized from the retention", () => {
    for (const [prints, perFlush] of [[30_000, 400], [12_000, 60]] as const) {
      const r = replay(s => trimPrintDedupe(s, RECENT_TICK_RETENTION), prints, perFlush, RECENT_TICK_RETENTION);
      expect(r.maxFold).toBe(1);
      expect(r.folds.size).toBe(prints);
    }
  });

  it("the window is at least twice the retention", () => {
    const w = printDedupeWindow(RECENT_TICK_RETENTION);
    expect(w.keep).toBeGreaterThanOrEqual(2 * RECENT_TICK_RETENTION);
    expect(w.max).toBeGreaterThan(w.keep);
  });

  it("MainChart's fold trims through the owner, never a hard-coded window", () => {
    const mc = readFileSync("src/components/chart/MainChart.tsx", "utf8");
    expect(mc).toContain("processedTicksRef.current = trimPrintDedupe(processedTicksRef.current, RECENT_TICK_RETENTION);");
    expect(mc).not.toMatch(/processedTicksRef\.current\]\.slice\(-\d+\)/);
  });
});
