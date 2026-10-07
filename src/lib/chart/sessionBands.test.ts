import { describe, expect, it } from "vitest";
import { logicalForTime, sessionBandsDefaultOn, sessionSpans, sessionsAt } from "./sessionBands";

const utc = (iso: string) => Date.parse(iso) / 1000;
const hhmm = (sec: number) => new Date(sec * 1000).toISOString().slice(5, 16);

describe("session bands are a clock fact in each centre's own zone", () => {
  it("Tue 2026-10-06: Tokyo 23:00–08:00Z, London (BST) 07–16Z, New York (EDT) 12–21Z, overlap 12–16Z", () => {
    const s = sessionSpans(utc("2026-10-06T00:00:00Z"), utc("2026-10-06T23:59:00Z"));
    const pick = (id: string) => s.filter(x => x.id === id).map(x => `${hhmm(x.start)}→${hhmm(x.end)}`);
    expect(pick("ASIA")).toEqual(["10-05T23:00→10-06T08:00", "10-06T23:00→10-07T08:00"]);
    expect(pick("LONDON")).toEqual(["10-06T07:00→10-06T16:00"]);
    expect(pick("NEW_YORK")).toEqual(["10-06T12:00→10-06T21:00"]);
    expect(pick("LDN_NY_OVERLAP")).toEqual(["10-06T12:00→10-06T16:00"]);
  });
  it("follows each zone's own daylight saving (London off BST before New York leaves EDT)", () => {
    const s = sessionSpans(utc("2026-10-28T00:00:00Z"), utc("2026-10-28T23:00:00Z"));
    expect(s.filter(x => x.id === "LONDON").map(x => hhmm(x.start))).toEqual(["10-28T08:00"]);
    expect(s.filter(x => x.id === "LDN_NY_OVERLAP").map(x => `${hhmm(x.start)}→${hhmm(x.end)}`)).toEqual(["10-28T12:00→10-28T17:00"]);
  });
  it("weekends have no session; Monday's Tokyo day opens Sunday evening UTC", () => {
    const sat = sessionSpans(utc("2026-10-10T00:00:00Z"), utc("2026-10-10T23:00:00Z"));
    expect(sat.filter(x => x.id !== "ASIA" || x.start >= utc("2026-10-10T00:00:00Z"))).toEqual([]);
    expect(sessionsAt(utc("2026-10-11T23:30:00Z"))).toEqual(["ASIA"]);
    expect(sessionsAt(utc("2026-10-06T13:00:00Z")).sort()).toEqual(["LONDON", "NEW_YORK"]);
  });
  it("refuses nonsense windows", () => {
    expect(sessionSpans(10, 5)).toEqual([]);
    expect(sessionSpans(0, 500 * 86400)).toEqual([]);
  });
});

describe("default on for spot FX only", () => {
  it.each([["EURUSD", true], ["GBP/USD", true], ["USDJPY", true], ["XAUUSD", true], ["6E1!", false], ["NQ1!", false], ["TSLA", false], ["BTC-USD", false]])("%s → %s", (s, on) => {
    expect(sessionBandsDefaultOn(s)).toBe(on);
  });
});

describe("time → logical index on the chart's own bars", () => {
  const times = [0, 300, 600, 900];
  it("interpolates inside a bar and clamps across a gap", () => {
    expect(logicalForTime(times, 450, 300)).toBe(1.5);
    expect(logicalForTime(times, -100, 300)).toBe(0);
    expect(logicalForTime(times, 1050, 300)).toBe(3.5);
    expect(logicalForTime(times, 99999, 300)).toBe(4);
    expect(logicalForTime([0, 300, 90000], 50000, 300)).toBe(2 - 1 + 1); // weekend gap → next bar
    expect(logicalForTime([], 5, 300)).toBeNull();
  });
});

import { readFileSync } from "node:fs";
import { parseProofScene, proofSceneValue } from "./proofScene";

describe("session bands on the glass (wiring)", () => {
  const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
  const CD = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
  it("a proof-scene token turns it on; a clean scene starts without it", () => {
    expect(proofSceneValue(parseProofScene("?scene=clean&on=sessionBands"), "wm_sessionBands")).toBe(true);
    expect(proofSceneValue(parseProofScene("?scene=clean"), "wm_sessionBands")).toBe(false);
  });
  it("the room defaults it from the market and the trader's press overrides", () => {
    expect(CD).toContain('lsGet<boolean | null>("wm_sessionBands", null)');
    expect(CD).toContain("sessionBandsOn={sessionBandsPref ?? sessionBandsDefaultOn(symbol)}");
    expect(CD).toContain('id: "SESSION_BANDS"');
  });
  it("paints with a receipt, a cost against its budget, and words off the newest candles", () => {
    expect(MC).toContain("canvas.dataset.sessionBands = `DRAWN:A${counts.ASIA}|L${counts.LONDON}|N${counts.NEW_YORK}|O${counts.LDN_NY_OVERLAP}|W${labels}`;");
    expect(MC).toContain('canvas.dataset.sessionBandsCost = `${ms.toFixed(2)}ms|${ms <= SESSION_BANDS_BUDGET_MS ? "MET" : "OVER"}`;');
    expect(MC).toContain("r.x + r.w > wordsStopX");
    expect(MC).toContain('layerFault("SESSION_BANDS", err)');
    // reads no volume
    const block = MC.slice(MC.indexOf("SESSION BANDS · ASIA / LONDON / NEW YORK"), MC.indexOf('layerFault("SESSION_BANDS"'));
    expect(block.length).toBeGreaterThan(1000);
    expect(block).not.toMatch(/\.volume\b/);
  });
});
