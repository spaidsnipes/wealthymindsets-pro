import { describe, expect, it } from "vitest";
import { CVD_REL_WINDOW, cvdNotchProvenance, readCvdNotches, type CvdRelRow } from "./cvdRelationship";

const row = (i: number, open: number, close: number, buy: number, sell: number, basis: "TAPE" | "SIDES" = "TAPE"): CvdRelRow =>
  ({ time: i * 60, open, close, atr: 2, buy, sell, basis });

describe("C-06 CVD ⇄ price notch (G19.CVD_REL, proposed)", () => {
  it("agreement is silence", () => {
    const rows = [0, 1, 2, 3, 4].map(i => row(i, 100 + i, 101 + i, 70, 30));
    const r = readCvdNotches(rows);
    expect(r.notches).toEqual([]);
    expect(r.measured).toBe(1);
  });

  it("price up across the window while CVD falls → a notch on the HIGH side of the window's last bar", () => {
    const rows = [0, 1, 2, 3, 4].map(i => row(i, 100 + i, 101 + i, 30, 70));
    const r = readCvdNotches(rows);
    expect(r.notches).toHaveLength(1);
    expect(r.notches[0]).toMatchObject({ time: 240, fromTime: 0, dir: 1, cvd: -200, move: 5, inferred: false });
    expect(cvdNotchProvenance(r.notches[0])).toMatch(/^CVD ⇄ price · last 5 finished bars · CVD Δ -200 · price \+5 · 40% one-sided against the move · captured signed prints$/);
  });

  it("a window with an unsided bar makes no claim (never zero-filled)", () => {
    const rows = [0, 1, 2, 3, 4].map(i => row(i, 100 + i, 101 + i, i === 2 ? 0 : 30, i === 2 ? 0 : 70));
    const r = readCvdNotches(rows);
    expect(r.notches).toEqual([]);
    expect(r.unmeasured).toBe(1);
    expect(r.measured).toBe(0);
  });

  it("a provider-sides row marks the window INFERRED", () => {
    const rows = [0, 1, 2, 3, 4].map(i => row(i, 100 + i, 101 + i, 30, 70, i === 0 ? "SIDES" : "TAPE"));
    const r = readCvdNotches(rows);
    expect(r.notches[0].inferred).toBe(true);
    expect(r.sidesRows).toBe(1);
  });

  it("no move or balanced flow is no claim", () => {
    const flat = [0, 1, 2, 3, 4].map(i => row(i, 100, 100.05, 30, 70));
    expect(readCvdNotches(flat).notches).toEqual([]);
    const balanced = [0, 1, 2, 3, 4].map(i => row(i, 100 + i, 101 + i, 48, 52));
    expect(readCvdNotches(balanced).notches).toEqual([]);
  });

  it("needs a full window", () => {
    expect(readCvdNotches([0, 1, 2].map(i => row(i, 100 + i, 101 + i, 30, 70))).notches).toEqual([]);
    expect(CVD_REL_WINDOW).toBe(5);
  });
});
