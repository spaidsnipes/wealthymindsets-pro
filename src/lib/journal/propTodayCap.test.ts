import { describe, expect, it } from "vitest";
import { EMPTY_PROP_INPUTS } from "./propEvaluation";
import { readPropTodayCap } from "./propTodayCap";

const acct = (days: number[], target = 150_000) => ({
  ...EMPTY_PROP_INPUTS, profitTargetCents: target,
  days: days.map((netCents, i) => ({ date: `2026-11-0${i + 1}`, netCents })),
});

describe("readPropTodayCap", () => {
  it("TradeDay 30% on a $1,500 target: max day $450", () => {
    const r = readPropTodayCap(acct([28_000, 34_000]));
    expect(r.known && r.maxDayCents).toBe(45_000);
  });
  it("taking the whole remainder today fails when it would be over 30% of the net", () => {
    const r = readPropTodayCap(acct([28_000, 34_000]));
    if (!r.known) throw new Error("expected known");
    expect(r.remainingCents).toBe(88_000);
    expect(r.wholeTargetToday).toBe(false);
    expect(r.netNeededIfWhole).toBe(293_334);
    expect(r.words).toMatch(/^NO —/);
  });
  it("passes when the remainder is small enough", () => {
    const r = readPropTodayCap(acct([40_000, 40_000, 40_000]));
    if (!r.known) throw new Error("expected known");
    expect(r.remainingCents).toBe(30_000);
    expect(r.wholeTargetToday).toBe(true);
  });
  it("gives a reason instead of a number when nothing is entered", () => {
    expect(readPropTodayCap({ ...EMPTY_PROP_INPUTS }).known).toBe(false);
  });
});
