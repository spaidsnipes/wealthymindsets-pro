/**
 * FUTURES ECONOMICS ARE EXCHANGE-CORRECT — five-hour order (2026-09-27):
 * "whether futures economics are correct". Tick size and $/tick per the
 * exchange contract specifications. A contract with no row is REFUSED (never
 * silently 1×); every row on file must match its exchange spec exactly.
 */
import { describe, expect, it } from "vitest";
import { instrumentEconomics } from "./contractEconomics";

const SPEC: Record<string, [tick: number, tickValue: number]> = {
  "ES1!": [0.25, 12.5], "MES1!": [0.25, 1.25], "NQ1!": [0.25, 5], "MNQ1!": [0.25, 0.5],
  "YM1!": [1, 5], "MYM1!": [1, 0.5], "RTY1!": [0.1, 5], "M2K1!": [0.1, 0.5],
  "CL1!": [0.01, 10], "MCL1!": [0.01, 1], "GC1!": [0.1, 10], "MGC1!": [0.1, 1],
  "SI1!": [0.005, 25], "NG1!": [0.001, 10], "HG1!": [0.0005, 12.5],
  "ZB1!": [0.03125, 31.25], "ZN1!": [0.015625, 15.625], "6E1!": [0.00005, 6.25],
};

describe("futures economics", () => {
  for (const [sym, [tick, tv]] of Object.entries(SPEC)) {
    it(`${sym}: tick ${tick}, $${tv}/tick`, () => {
      const e = instrumentEconomics(sym, 100);
      expect(e.status).toBe("PRICED");
      if (e.status !== "PRICED") return;
      expect(e.tickSize).toBe(tick);
      expect(e.tickValue).toBeCloseTo(tv, 9);
    });
  }
});
