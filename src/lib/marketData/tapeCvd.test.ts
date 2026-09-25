import { describe, expect, it } from "vitest";
import { barTapeDelta, selectTapeCvd, tapeCvdCaption } from "./tapeCvd";

const lv = (entries: Array<[number, number, number]>) =>
  new Map(entries.map(([price, bid, ask]) => [price, { bid, ask }]));
const bars = (...times: number[]) => times.map(time => ({ time }));
const hhmm = (sec: number) => `@${sec}`;

const base = {
  horizonBarSec: null,
  horizonStartedAtSec: null,
  aggressorMethod: "VENUE" as string | null,
  verifiedTape: true,
};

describe("tape CVD", () => {
  it("a bar's delta is Σ(ask − bid) over its levels", () => {
    expect(barTapeDelta(lv([[100, 3, 5], [101, 7, 1]]))).toBe(-4);
  });

  it("bars without accumulator entries emit no points", () => {
    const r = selectTapeCvd({
      ...base,
      bars: bars(60, 120, 180, 240),
      accumulator: new Map([[60, lv([[1, 0, 2]])], [180, lv([[1, 1, 0]])]]),
    });
    expect(r.points.map(p => p.time)).toEqual([60, 180]);
  });

  it("cumulative equals Σ(ask − bid) and each step starts at the prior cumulative", () => {
    const r = selectTapeCvd({
      ...base,
      bars: bars(60, 120, 180),
      accumulator: new Map([
        [60, lv([[1, 1, 4]])],     // +3
        [120, lv([[1, 6, 1]])],    // -5
        [180, lv([[1, 0, 2], [2, 1, 3]])], // +4
      ]),
    });
    expect(r.points.map(p => [p.from, p.to])).toEqual([[0, 3], [3, -2], [-2, 2]]);
    expect(r.points.map(p => p.delta)).toEqual([3, -5, 4]);
  });

  it("the series starts at the horizon bar, drawn partial, and says since the horizon", () => {
    const r = selectTapeCvd({
      ...base,
      bars: bars(60, 120, 180),
      horizonBarSec: 120,
      horizonStartedAtSec: 150,
      accumulator: new Map([[120, lv([[1, 0, 2]])], [180, lv([[1, 0, 1]])]]),
    });
    expect(r.points[0]).toMatchObject({ time: 120, from: 0, to: 2, partial: true });
    expect(r.points[1].partial).toBe(false);
    expect(r.startsAtHorizon).toBe(true);
    expect(r.sinceSec).toBe(150);
    expect(tapeCvdCaption(r, hhmm)).toBe("CVD · signed tape since @150");
  });

  it("bars before the horizon get no point even when the accumulator holds them", () => {
    const r = selectTapeCvd({
      ...base,
      bars: bars(60, 120),
      horizonBarSec: 120,
      horizonStartedAtSec: 125,
      accumulator: new Map([[60, lv([[1, 0, 9]])], [120, lv([[1, 0, 1]])]]),
    });
    expect(r.points.map(p => p.time)).toEqual([120]);
    expect(r.points[0].to).toBe(1);
  });

  it("evicted bars leave a gap and 'since' moves to the oldest retained bar", () => {
    // Horizon at 60, but bars 60 and 120 were evicted past the cap.
    const r = selectTapeCvd({
      ...base,
      bars: bars(60, 120, 180, 240),
      horizonBarSec: 60,
      horizonStartedAtSec: 70,
      accumulator: new Map([[180, lv([[1, 0, 2]])], [240, lv([[1, 1, 0]])]]),
    });
    expect(r.points.map(p => p.time)).toEqual([180, 240]);
    expect(r.points[0]).toMatchObject({ from: 0, to: 2, partial: true });
    expect(r.startsAtHorizon).toBe(false);
    expect(r.sinceSec).toBe(180);
  });

  it("an unheard bar inside the series is whitespace and the cumulative carries through it", () => {
    const r = selectTapeCvd({
      ...base,
      bars: bars(60, 120, 180),
      accumulator: new Map([[60, lv([[1, 0, 2]])], [180, lv([[1, 0, 1]])]]),
    });
    expect(r.points.map(p => [p.time, p.from, p.to])).toEqual([[60, 0, 2], [180, 2, 3]]);
  });

  it("tick-rule sides say SIDES INFERRED", () => {
    const r = selectTapeCvd({
      ...base,
      aggressorMethod: "TICK_RULE",
      bars: bars(60),
      accumulator: new Map([[60, lv([[1, 0, 1]])]]),
    });
    expect(r.sidesInferred).toBe(true);
    expect(tapeCvdCaption(r, hhmm)).toBe("CVD · signed tape since @60 · SIDES INFERRED");
  });

  it("no verified tape refuses, even with an accumulator", () => {
    const r = selectTapeCvd({
      ...base,
      verifiedTape: false,
      bars: bars(60),
      accumulator: new Map([[60, lv([[1, 0, 1]])]]),
    });
    expect(r.points).toEqual([]);
    expect(r.refused).toBe("NO_VERIFIED_TAPE");
    expect(tapeCvdCaption(r, hhmm)).toMatch(/^CVD · REFUSED/);
  });

  it("an empty accumulator, or one holding only off-chart bars, refuses instead of drawing zero", () => {
    expect(selectTapeCvd({ ...base, bars: bars(60), accumulator: new Map() }).refused).toBe("NO_TAPE_IN_VIEW");
    const offChart = selectTapeCvd({ ...base, bars: bars(60), accumulator: new Map([[999, lv([[1, 0, 1]])]]) });
    expect(offChart.points).toEqual([]);
    expect(offChart.refused).toBe("NO_TAPE_IN_VIEW");
  });

  it("never signs a bar by anything but its labelled sides", () => {
    // Executions with no labelled side land as bid 0 / ask 0 → contribute 0.
    const r = selectTapeCvd({
      ...base,
      bars: bars(60),
      accumulator: new Map([[60, lv([[1, 0, 0]])]]),
    });
    expect(r.points[0].to).toBe(0);
  });
});
