import { describe, expect, it } from "vitest";
import { selectFightModel } from "./fightModel";

const base = { min: 100, max: 200, first: 110, last: 190 };

describe("selectFightModel", () => {
  it("trend tape at its leading edge is a KNOCKOUT", () => {
    expect(selectFightModel({ ...base, verdict: "TREND", price: 195 }).model).toBe("KNOCKOUT");
    expect(selectFightModel({ ...base, first: 190, last: 105, verdict: "TREND", price: 105 }).model).toBe("KNOCKOUT");
  });
  it("trend tape away from its leading edge waits", () => {
    expect(selectFightModel({ ...base, verdict: "TREND", price: 150 }).model).toBe("WAIT");
    expect(selectFightModel({ ...base, verdict: "TREND", price: 105 }).model).toBe("WAIT");
  });
  it("balance tape in an outer quarter is BODY SHOTS aimed at the middle", () => {
    const r = selectFightModel({ ...base, verdict: "BALANCE", price: 120 });
    expect(r.model).toBe("BODY_SHOTS");
    expect(r.middle).toBe(150);
  });
  it("balance tape near the middle waits", () => {
    expect(selectFightModel({ ...base, verdict: "BALANCE", price: 155 }).model).toBe("WAIT");
  });
  it("a thin tape or an empty range never names a model", () => {
    expect(selectFightModel({ ...base, verdict: "THIN", price: 199 }).model).toBe("WAIT");
    expect(selectFightModel({ min: 5, max: 5, first: 5, last: 5, verdict: "TREND" }).position).toBeNull();
  });
  it("uses the last print when no live price is given", () => {
    expect(selectFightModel({ ...base, verdict: "TREND" }).model).toBe("KNOCKOUT");
  });
});
