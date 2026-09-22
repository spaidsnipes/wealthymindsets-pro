import { describe, expect, it } from "vitest";

import {
  ALL_MARKET_FIDELITIES,
  MARKET_FIDELITIES,
  paintTreatment,
  readMarketFidelity,
  type MarketFidelity,
} from "@/lib/marketData/marketFidelityAlgebra";
import {
  INTEGRITY_WORD,
  selectFoldEscalation,
} from "@/lib/marketData/viewModels/selectFoldEscalation";

const AS_OF = 1_758_545_563_000; // 2026-09-22T12:52:43Z — the measured frame.

const reading = (fidelity: MarketFidelity) => {
  const r = readMarketFidelity(fidelity, AS_OF);
  if (!r) throw new Error("fixture refused — asOf must be finite");
  return r;
};

describe("selectFoldEscalation", () => {
  /* ── THE CALM CASE IS THE LOAD-BEARING ONE ──────────────────────────────── */

  it("stays CALM and produces NO word when the canvas paints FULL", () => {
    for (const fidelity of [MARKET_FIDELITIES.INDICATIVE, MARKET_FIDELITIES.EXECUTABLE]) {
      const out = selectFoldEscalation(reading(fidelity));
      expect(out.level, `${fidelity} escalated a healthy canvas`).toBe("CALM");
      expect(out.word, `${fidelity} minted a word with nothing to disclose`).toBeNull();
    }
  });

  it("never emits an INTACT badge — a calm state must not bid for the glance", () => {
    const out = selectFoldEscalation(reading(MARKET_FIDELITIES.EXECUTABLE));
    expect(out.word).toBeNull();
    expect(out.detail).not.toContain("INTACT");
  });

  /* ── THE MEASURED DEFECT ────────────────────────────────────────────────── */

  it("DISCLOSES WOUNDED — the exact prod state the handle was mute about", () => {
    // MEASURED prod /charts 2026-09-22: fidelity DEGRADED, chart integrity
    // WOUNDED, chart painting, handle reading only "Risk · Why · Detail".
    const out = selectFoldEscalation(reading(MARKET_FIDELITIES.DEGRADED));
    expect(out.level).toBe("DISCLOSED");
    expect(out.word).toBe("WOUNDED");
    expect(out.treatment).toBe("WOUNDED");
    expect(out.detail).toContain("Chart integrity WOUNDED");
  });

  it("DISCLOSES for PARTIAL, STALE and UNMEASURED too", () => {
    expect(selectFoldEscalation(reading(MARKET_FIDELITIES.PARTIAL)).word).toBe("WOUNDED");
    expect(selectFoldEscalation(reading(MARKET_FIDELITIES.STALE)).word).toBe("DIMMED");
    expect(selectFoldEscalation(null).word).toBe("NOT PAINTED");
  });

  /* ── undefined ≠ null, AND THAT IS THE WHOLE POINT ──────────────────────── */

  it("treats `undefined` (no plaque attached) as CALM, not as NOT PAINTED", () => {
    const noPlaque = selectFoldEscalation(undefined);
    expect(noPlaque.level).toBe("CALM");
    expect(noPlaque.word).toBeNull();
    expect(noPlaque.treatment).toBeNull();

    // ...while `null` — the house looked and established nothing — escalates.
    const unmeasured = selectFoldEscalation(null);
    expect(unmeasured.level).toBe("DISCLOSED");
    expect(unmeasured.word).toBe("NOT PAINTED");

    // paintTreatment flattens both to NONE, which is exactly why the selector
    // must settle `undefined` before consulting it. If this ever passes, the
    // early return was removed.
    expect(paintTreatment(undefined)).toBe(paintTreatment(null));
    expect(noPlaque.word).not.toBe(unmeasured.word);
  });

  it("says something different about UNMEASURED than about a wounded reading", () => {
    expect(selectFoldEscalation(null).detail).toContain(
      "No fidelity has been established",
    );
    expect(
      selectFoldEscalation(reading(MARKET_FIDELITIES.DEGRADED)).detail,
    ).not.toContain("No fidelity has been established");
  });

  /* ── TOTALITY: NO FIDELITY MAY FALL THROUGH ─────────────────────────────── */

  it("answers for every fidelity in the algebra, and agrees with paintTreatment", () => {
    expect(ALL_MARKET_FIDELITIES.length).toBe(5);
    for (const fidelity of ALL_MARKET_FIDELITIES) {
      const r = reading(fidelity);
      const out = selectFoldEscalation(r);
      const treatment = paintTreatment(r);

      expect(out.treatment, `${fidelity} disagreed with paintTreatment`).toBe(treatment);
      // The chip and the plaque behind it must never print two spellings.
      if (treatment === "FULL") {
        expect(out.word).toBeNull();
      } else {
        expect(out.word).toBe(INTEGRITY_WORD[treatment]);
      }
      expect(out.detail.length, `${fidelity} produced an empty detail`).toBeGreaterThan(20);
    }
  });

  it("never returns an empty-string word — CALM is null, not blank", () => {
    for (const input of [undefined, null, ...ALL_MARKET_FIDELITIES.map(reading)]) {
      const out = selectFoldEscalation(input);
      expect(out.word === null || out.word.length > 0).toBe(true);
    }
  });

  it("is pure — same input, same output, and the result is frozen", () => {
    const r = reading(MARKET_FIDELITIES.STALE);
    expect(selectFoldEscalation(r)).toEqual(selectFoldEscalation(r));
    expect(Object.isFrozen(selectFoldEscalation(r))).toBe(true);
  });
});

describe("INTEGRITY_WORD", () => {
  it("is the single spelling of all four treatments", () => {
    expect(INTEGRITY_WORD).toEqual({
      FULL: "INTACT",
      WOUNDED: "WOUNDED",
      DIM: "DIMMED",
      NONE: "NOT PAINTED",
    });
    expect(Object.isFrozen(INTEGRITY_WORD)).toBe(true);
  });

  /**
   * DRIFT GUARD. The plaque used to own a private copy of this map. If someone
   * re-introduces one, the rail's chip and the plaque one click below it can
   * print two different words for one reading.
   */
  it("is imported by MarketHonestyPlaque rather than copied into it", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const plaque = readFileSync(
      resolve(process.cwd(), "src/components/experience/MarketHonestyPlaque.tsx"),
      "utf8",
    );
    expect(plaque, "the plaque re-declared its own INTEGRITY_WORD").not.toMatch(
      /const\s+INTEGRITY_WORD/,
    );
    expect(plaque).toContain("selectFoldEscalation");
  });
});
