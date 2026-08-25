import { describe, it, expect } from "vitest";

import { selectRecoveryTradeDetector } from "./selectRecoveryTradeDetector";
import type { EdgeEntry } from "../proofLane/selectSessionEdge";

// Journal is stored newest-first — the detector reverses within a day
// for chronological detection. Tests express the entries in the same
// newest-first order that a real caller passes.

function e(date: string, processQuality: EdgeEntry["processQuality"], realizedR?: number): EdgeEntry {
  return { date, result: realizedR !== undefined && realizedR < 0 ? "loss" : "win", processQuality, realizedR };
}

describe("selectRecoveryTradeDetector — canon §Daily Risk revenge-trade signature", () => {
  it("empty → no candidates", () => {
    const r = selectRecoveryTradeDetector([]);
    expect(r.candidates.length).toBe(0);
    expect(r.days_scanned).toBe(0);
  });

  it("single trade → never a recovery candidate", () => {
    const r = selectRecoveryTradeDetector([e("2026-08-25", "BROKE_RULES", -1)]);
    expect(r.candidates.length).toBe(0);
  });

  it("loss then BROKE_RULES same day → flagged", () => {
    // Newest-first: BROKE_RULES is newest, loss is older.
    const r = selectRecoveryTradeDetector([
      e("2026-08-25", "BROKE_RULES", -0.5),
      e("2026-08-25", "FOLLOWED_PLAN", -1), // earlier loss
    ]);
    expect(r.candidates.length).toBe(1);
    expect(r.candidates[0]!.preceding_loss_r).toBe(-1);
  });

  it("FOLLOWED_PLAN after a loss is NOT flagged (canon: fresh setup is not revenge)", () => {
    const r = selectRecoveryTradeDetector([
      e("2026-08-25", "FOLLOWED_PLAN", 2),
      e("2026-08-25", "FOLLOWED_PLAN", -1),
    ]);
    expect(r.candidates.length).toBe(0);
  });

  it("BROKE_RULES after a WIN is NOT flagged (revenge requires a loss trigger)", () => {
    const r = selectRecoveryTradeDetector([
      e("2026-08-25", "BROKE_RULES", -0.5),
      e("2026-08-25", "FOLLOWED_PLAN", 3), // earlier win
    ]);
    expect(r.candidates.length).toBe(0);
  });

  it("cross-day: loss on prior day does not trigger next-day BROKE_RULES", () => {
    const r = selectRecoveryTradeDetector([
      e("2026-08-25", "BROKE_RULES", -0.5),
      e("2026-08-24", "FOLLOWED_PLAN", -1),
    ]);
    expect(r.candidates.length).toBe(0); // different days
  });

  it("multiple recovery candidates in one day are all captured", () => {
    const r = selectRecoveryTradeDetector([
      e("2026-08-25", "BROKE_RULES", -0.3), // recovery 2
      e("2026-08-25", "BROKE_RULES", -0.5), // recovery 1
      e("2026-08-25", "FOLLOWED_PLAN", -1),
    ]);
    expect(r.candidates.length).toBe(2);
  });

  it("entries without dates are skipped", () => {
    const r = selectRecoveryTradeDetector([
      e("", "BROKE_RULES", -1),
      e("2026-08-25", "FOLLOWED_PLAN", -1),
    ]);
    expect(r.candidates.length).toBe(0);
  });

  it("realizedR undefined does not trigger", () => {
    const r = selectRecoveryTradeDetector([
      e("2026-08-25", "BROKE_RULES", undefined),
      e("2026-08-25", "FOLLOWED_PLAN", -1),
    ]);
    // BROKE_RULES has no realizedR — but the check is about the PRECEDING
    // trade's R; here that's -1 (a loss), and this IS BROKE_RULES → flagged.
    expect(r.candidates.length).toBe(1);
  });
});
