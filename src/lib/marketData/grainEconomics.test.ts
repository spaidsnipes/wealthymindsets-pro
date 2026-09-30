import { describe, expect, it } from "vitest";
import { instrumentEconomics } from "./contractEconomics";

// CBOT grains, 2026-09-30: Webull US_FUTURES ZCZ6/ZSX6/ZWZ6 — size 5000,
// currency USX (cents), min_tick 0.25; Yahoo ZC=F/ZS=F/ZW=F quote USX.
describe("grain futures carry their CBOT money", () => {
  for (const sym of ["ZC1!", "ZS1!", "ZW1!"]) {
    it(`${sym}: $50 per 1¢ point, ¼¢ tick = $12.50`, () => {
      const e = instrumentEconomics(sym, 500);
      expect(e.status).toBe("PRICED");
      if (e.status !== "PRICED") return;
      expect(e.pointValue).toBe(50);
      expect(e.tickSize).toBe(0.25);
      expect(e.tickValue).toBe(12.5);
    });
  }
});
