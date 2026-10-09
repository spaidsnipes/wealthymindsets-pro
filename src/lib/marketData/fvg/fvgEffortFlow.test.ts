/**
 * Garden 19 §13 / §14 — effort→response and order flow as relationships ON the gap.
 * The readings come from the owners, as of each bar; silence is said, never guessed.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { readEffortResponseField } from "@/lib/chart/effortResponseField";
import { journalFixtureBars } from "@/lib/journal/journalProofFixture";
import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import type { DerivativesPressureVM } from "@/lib/marketData/viewModels/selectDerivativesPressure";

import { detectFvgs } from "./fvgEngine";
import { BARS_CARRY_NO_SIGNED_VOLUME, fvgBarContext, fvgBarOnlyRelationships } from "./fvgBarContext";
import { FVG_EFFORT_WINDOW, fvgEffortInput, fvgFlowInput, type SignedBarVolume } from "./fvgEffortFlow";
import { fvgVolatilityAtFormationByTime } from "./fvgFormationContext";
import { chartSignedAt, fvgInspectRelationships, tapeRegimeAtFormationLine, type TapeRegimePoint } from "./fvgInspectRelationships";
import { effortSource, flowSource, fvgRelationshipRows, fvgRelationshipsFor } from "./fvgRelationships";

const BARS = journalFixtureBars();
const SYM = BARS[0].symbolId;
const TF = BARS[0].timeframe;
const ledger = detectFvgs(BARS, { symbolId: SYM, timeframe: TF });
const idx = new Map(BARS.map((b, i) => [b.asOf, i] as const));
/** A gap formed late enough for ATR + the field's minimum, that was touched at least once. */
const obj = ledger.objects.find(o => (idx.get(o.bars.b2.asOf) ?? 0) > 60 && o.interactions.length >= 1)!;
const i2 = idx.get(obj.bars.b2.asOf)!;
const touchIndex = (k: number) => idx.get(obj.bars.b3.asOf)! + (obj.interactions[k].startBarIndex - obj.createdBarIndex);

describe("§13 effort→response on the gap's own bars", () => {
  it("FULL on traded volume: the displacement bar and each touch bar carry the Response Matrix owner's cell", () => {
    const e = fvgEffortInput(obj, BARS, SYM);
    expect(e.volumeReal).toBe(true);
    expect(e.windowBars).toBe(FVG_EFFORT_WINDOW);
    expect(e.readings[0]).toMatchObject({ anchor: "DISPLACEMENT", episode: null, price: BARS[i2].close });
    expect(e.readings.filter(r => r.anchor === "TOUCH").map(r => r.episode)).toEqual(obj.interactions.map(x => x.episode));
    // The cell IS the owner's: the same field read over the 100 closed bars ending at b2.
    const tuples = BARS.slice(0, i2 + 1).map(b => ({ time: b.asOf / 1000, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume }));
    const field = readEffortResponseField(tuples, Math.max(0, i2 - 99), i2, { volumeReal: true });
    if (field.state !== "DRAWN") throw new Error("fixture: field not drawn");
    expect(e.readings[0].state).toBe(field.bars[field.bars.length - 1].cell);
    expect(effortSource(e)).toMatchObject({ family: "EFFORT_RESPONSE", evidence: "FULL", provenance: "traded volume; each bar ranked over the 100 closed bars ending at that bar" });
    const r = fvgRelationshipsFor(obj, { effort: e });
    expect(r.relationships.map(x => `${x.family}:${x.kind}:${x.relation}`)).toEqual([
      "EFFORT_RESPONSE:DISPLACEMENT_EFFORT:AT_FORMATION",
      ...obj.interactions.map(() => "EFFORT_RESPONSE:TOUCH_EFFORT:AT_TOUCH"),
    ]);
    const rows = fvgRelationshipRows(r, p => p.toFixed(2)).rows;
    expect(rows[0]).toMatch(/^Effort→response displacement bar — at formation · owner says (ABSORBED|INITIATIVE|VACUUM|QUIET|ORDINARY) · .+ effort .+× median volume · response .+ ATR .+ · FULL \(traded volume; each bar ranked over the 100 closed bars ending at that bar\)$/);
    expect(rows[1]).toMatch(/^Effort→response touch bar — at touch 1 · owner says /);
  });

  it("SILENCE where the market reports no traded volume — spot FX, and a placeholder feed", () => {
    const fx = fvgEffortInput(obj, BARS, "EURUSD");
    expect(fx).toMatchObject({ volumeReal: false, readings: [] });
    // The one clause every room prints for a market with no central volume.
    expect(effortSource(fx)).toMatchObject({ evidence: "SILENCE", provenance: "needs traded volume — spot FX has none" });
    expect(fvgBarOnlyRelationships(fvgBarContext(BARS.map(b => ({ ...b, symbolId: "EURUSD" })), "EURUSD", TF), obj).sources.find(s => s.family === "EFFORT_RESPONSE"))
      .toMatchObject({ evidence: "SILENCE", provenance: "needs traded volume — spot FX has none" });
    const placeholder: CanonicalBar[] = BARS.map(b => ({ ...b, volume: 1 }));
    const ph = fvgEffortInput(obj, placeholder, SYM);
    expect(ph).toMatchObject({ volumeReal: false, readings: [] });
    expect(effortSource(ph)).toMatchObject({ evidence: "SILENCE", provenance: expect.stringMatching(/carries a volume of 0 or 1 — a placeholder, not a count/) });
    const r = fvgRelationshipsFor(obj, { effort: fx });
    expect(r.relationships.filter(x => x.family === "EFFORT_RESPONSE")).toEqual([]);
    expect(fvgRelationshipRows(r, p => p.toFixed(2)).silences.some(s => /^Effort→response: SILENCE — /.test(s))).toBe(true);
    // Not attached at all is still said.
    expect(effortSource(null)).toMatchObject({ evidence: "SILENCE", provenance: "no effort→response reading attached" });
  });

  it("AS OF: bars that arrive later never change a reading already made", () => {
    const full = fvgEffortInput(obj, BARS, SYM).readings;
    // Read again from only the bars up to the first touch bar: the displacement and first-touch readings are identical.
    const cut = touchIndex(0) + 1;
    const early = fvgEffortInput({ ...obj, interactions: obj.interactions.slice(0, 1) }, BARS.slice(0, cut), SYM).readings;
    expect(early).toEqual(full.slice(0, 2));
    // And a later bar rewritten to an absurd size changes nothing before it.
    const shocked = BARS.map((b, i) => (i > touchIndex(0) ? { ...b, volume: b.volume * 1000, high: b.high + 50 } : b));
    expect(fvgEffortInput({ ...obj, interactions: obj.interactions.slice(0, 1) }, shocked, SYM).readings).toEqual(full.slice(0, 2));
  });

  it("a bar the owner could not read gets NO reading — never a neighbour's", () => {
    const early = ledger.objects.find(o => (idx.get(o.bars.b2.asOf) ?? 99) < 12);
    if (early) expect(fvgEffortInput({ ...early, interactions: [] }, BARS, SYM).readings).toEqual([]);
    const noVol = BARS.map((b, i) => (i === i2 ? { ...b, volume: 0 } : b));
    expect(fvgEffortInput({ ...obj, interactions: [] }, noVol, SYM).readings).toEqual([]);
    expect(effortSource(fvgEffortInput({ ...obj, interactions: [] }, noVol, SYM)).evidence).toBe("SILENCE");
  });

  it("bar-only readers (Scanner, Backtest, Journal): effort from the bars, order flow SILENCE with the reason", () => {
    const r = fvgBarOnlyRelationships(fvgBarContext(BARS, SYM, TF), obj);
    expect(r.relationships.some(x => x.kind === "DISPLACEMENT_EFFORT")).toBe(true);
    expect(r.relationships.filter(x => x.family === "ORDER_FLOW")).toEqual([]);
    expect(r.sources.find(s => s.family === "ORDER_FLOW")).toMatchObject({ evidence: "SILENCE", provenance: BARS_CARRY_NO_SIGNED_VOLUME });
  });
});

describe("§14 order flow on the gap's own bars — signed volume only", () => {
  const at = (m: Record<number, SignedBarVolume>) => (ms: number) => m[ms] ?? null;
  const b2 = BARS[i2];

  it("no signed input → SILENCE, no relationship; candles are never read", () => {
    const f = fvgFlowInput(obj, BARS, null);
    expect(f).toMatchObject({ basis: null, readings: [] });
    expect(flowSource(f)).toMatchObject({ family: "ORDER_FLOW", evidence: "SILENCE", provenance: expect.stringMatching(/candles are never read as order flow/) });
    const none = fvgFlowInput(obj, BARS, () => null);
    expect(none.readings).toEqual([]);
    expect(flowSource(none).evidence).toBe("SILENCE");
  });

  it("the provider's per-bar bid / ask volume is PARTIAL and is never called prints", () => {
    const f = fvgFlowInput(obj, BARS, at({ [b2.asOf]: { buy: 70, sell: 30, basis: "SIDES" } }));
    expect(f.basis).toBe("SIDES");
    expect(f.readings).toEqual([expect.objectContaining({ anchor: "DISPLACEMENT", state: "BUYERS", words: expect.stringMatching(/^buyers took 70% of the bar's signed volume/) })]);
    const src = flowSource(f);
    expect(src).toMatchObject({ evidence: "PARTIAL", provenance: "the provider's per-bar bid / ask volume — an aggregate for the bar, not prints" });
    const row = fvgRelationshipRows(fvgRelationshipsFor(obj, { flow: f }), p => p.toFixed(2)).rows[0];
    expect(row).toMatch(/^Order flow displacement bar — at formation · owner says BUYERS · buyers took 70% .* · PARTIAL \(the provider's per-bar bid \/ ask volume/);
  });

  it("captured tape: FULL when the bar is whole, PARTIAL when the tape cannot vouch for it; BALANCED is a reading", () => {
    expect(flowSource(fvgFlowInput(obj, BARS, at({ [b2.asOf]: { buy: 20, sell: 80, basis: "TAPE" } })))).toMatchObject({ evidence: "FULL" });
    expect(flowSource(fvgFlowInput(obj, BARS, at({ [b2.asOf]: { buy: 20, sell: 80, basis: "TAPE", partial: true } })))).toMatchObject({ evidence: "PARTIAL" });
    expect(fvgFlowInput(obj, BARS, at({ [b2.asOf]: { buy: 51, sell: 49, basis: "TAPE" } })).readings[0].state).toBe("BALANCED");
    // Mixed bases: the weaker word wins for the family.
    const t0 = BARS[touchIndex(0)];
    const mixed = fvgFlowInput(obj, BARS, at({ [b2.asOf]: { buy: 30, sell: 70, basis: "SIDES" }, [t0.asOf]: { buy: 80, sell: 20, basis: "TAPE" } }));
    expect(mixed.basis).toBe("SIDES");
    // …and says so: the family is PARTIAL and mixed, and each row names what ITS bar rests on.
    expect(flowSource(mixed)).toMatchObject({ evidence: "PARTIAL", provenance: expect.stringMatching(/^mixed — captured signed prints on some of these bars, the provider's per-bar bid \/ ask volume \(an aggregate, not prints\) on the others/) });
    expect(mixed.readings.map(r => [r.anchor, r.basis])).toEqual([["DISPLACEMENT", "SIDES"], ["TOUCH", "TAPE"]]);
    expect(mixed.readings[0].words).toMatch(/· from the provider's per-bar bid \/ ask volume$/);
    expect(mixed.readings[1].words).toMatch(/· from captured signed prints$/);
    expect(fvgFlowInput(obj, BARS, at({ [b2.asOf]: { buy: 20, sell: 80, basis: "TAPE", partial: true } })).readings[0].words).toMatch(/from captured signed prints \(the tape began inside this bar\)$/);
  });

  it("failure to displace is the keel owner's rule: strong signed share, the bar closed the other way", () => {
    const up = b2.close > b2.open;
    const f = fvgFlowInput(obj, BARS, at({ [b2.asOf]: up ? { buy: 10, sell: 90, basis: "TAPE" } : { buy: 90, sell: 10, basis: "TAPE" } }));
    expect(f.readings[0].words).toMatch(/failed to displace/);
    const withIt = fvgFlowInput(obj, BARS, at({ [b2.asOf]: up ? { buy: 90, sell: 10, basis: "TAPE" } : { buy: 10, sell: 90, basis: "TAPE" } }));
    if (Math.abs(b2.close - b2.open) > 0.3) expect(withIt.readings[0].words).not.toMatch(/failed to displace/);
  });

  it("chartSignedAt: tape row first (first heard bar partial), provider sides second, else null", () => {
    const bars = [{ time: 100 }, { time: 160 }, { time: 220 }, { time: 280 }];
    const tape = (t: number) => (t === 160 || t === 220 ? { buy: 3, sell: 1 } : null);
    const sides = (t: number) => (t === 280 || t === 160 ? { buy: 9, sell: 9 } : undefined);
    const s = chartSignedAt(bars, tape, sides);
    expect(s(160)).toEqual({ buy: 3, sell: 1, basis: "TAPE", partial: true });
    expect(s(220)).toEqual({ buy: 3, sell: 1, basis: "TAPE", partial: false });
    expect(s(280)).toEqual({ buy: 9, sell: 9, basis: "SIDES" });
    expect(s(100)).toBeNull();
    expect(chartSignedAt(bars, null, null)(160)).toBeNull();
  });

  it("Inspect: the chart's adapter places both families under the gap, bar readings after the spatial rows", () => {
    const chartBars = BARS.map(b => ({ time: b.asOf / 1000, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume }));
    const r = fvgInspectRelationships({
      o: obj, timeframe: TF, chartBars, fmt: p => p.toFixed(2),
      effort: { symbol: SYM, volumeReal: true },
      signedAt: t => (t === b2.asOf / 1000 ? { buy: 60, sell: 40, basis: "SIDES" } : null),
    });
    expect(r.rows.some(x => /^Effort→response displacement bar — at formation/.test(x))).toBe(true);
    expect(r.rows.some(x => /^Order flow displacement bar — at formation · owner says BUYERS/.test(x))).toBe(true);
    const silent = fvgInspectRelationships({ o: obj, timeframe: TF, chartBars, fmt: p => p.toFixed(2), effort: { symbol: "EURUSD", volumeReal: false, volumeSilenceWhy: "NEEDS TRADED VOLUME" } });
    expect(silent.silences).toContain("Effort→response: SILENCE — NEEDS TRADED VOLUME");
    expect(silent.silences.some(x => /^Order flow: SILENCE — /.test(x))).toBe(true);
  });
});

describe("§5 Inspect context — two named scopes, by reference", () => {
  const chartBars = BARS.map(b => ({ time: b.asOf / 1000, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume }));
  const b2Sec = obj.bars.b2.asOf / 1000;
  const base = { o: obj, timeframe: TF, chartBars, fmt: (p: number) => p.toFixed(2) };

  it("volatility at formation is the bars-scope owner's sentence, verbatim, from the bars up to b2", () => {
    const want = fvgVolatilityAtFormationByTime({ bars: chartBars, b2OpenMs: obj.bars.b2.asOf, timeOf: b => b.time * 1000 }).sentence;
    expect(want).toMatch(/^Volatility at formation: /);
    expect(fvgInspectRelationships(base).rows).toContain(want);
    // Bars after b2 cannot change it.
    const cut = chartBars.slice(0, chartBars.findIndex(b => b.time === b2Sec) + 4);
    expect(fvgInspectRelationships({ ...base, chartBars: cut }).rows).toContain(want);
  });

  const pt = (time: number, state: string, basis: "TAPE" | "NO_TAPE", why = "why"): TapeRegimePoint =>
    ({ time, state: state as TapeRegimePoint["state"], resolution: "UNKNOWN" as TapeRegimePoint["resolution"], basis, trades: basis === "TAPE" ? 400 : 0, why });
  const NO_REACH = "The held tape does not reach this bar — regime is read from per-trade prints, never from candles.";
  /** A 1m series: 6 bars before b2 without tape, b2 and 3 after it with tape. */
  const around = (unit: 1 | 1000, b2State = "TREND", b2Why = "why") => [
    ...[-6, -5, -4, -3, -2, -1].map(k => pt((b2Sec + k * 300) * unit, "UNKNOWN", "NO_TAPE", NO_REACH)),
    pt(b2Sec * unit, b2State, "TAPE", b2Why), pt((b2Sec + 300) * unit, "BALANCE", "TAPE"), pt((b2Sec + 600) * unit, "BALANCE", "TAPE"), pt((b2Sec + 900) * unit, "BALANCE", "TAPE"),
  ];

  it("outcome 1 — the tape reaches the bar and the owner names it: the owner's word (series in seconds OR in ms; b2 in either)", () => {
    for (const unit of [1, 1000] as const) for (const b2 of [b2Sec, b2Sec * 1000]) {
      expect(tapeRegimeAtFormationLine(around(unit), b2), `${unit}/${b2}`).toBe("Regime at formation (tape): TREND.");
    }
  });

  it("the bar is found by CONTAINMENT: b2's open inside a series bar (a differently aligned bucket) still reads that bar", () => {
    // Series buckets open 90 s before the gap's own bar clock.
    const shifted = around(1).map(p => ({ ...p, time: p.time - 90 }));
    expect(tapeRegimeAtFormationLine(shifted, b2Sec)).toBe("Regime at formation (tape): TREND.");
    expect(tapeRegimeAtFormationLine(shifted.map(p => ({ ...p, time: p.time * 1000 })), b2Sec * 1000)).toBe("Regime at formation (tape): TREND.");
    // One bar later is the next bucket — BALANCE, not TREND.
    expect(tapeRegimeAtFormationLine(shifted, b2Sec + 300)).toBe("Regime at formation (tape): BALANCE.");
  });

  it("outcome 2 — the tape reaches the bar but the owner gave no verdict: 'not classified' with the owner's reason, never 'does not reach'", () => {
    const line = tapeRegimeAtFormationLine(around(1, "UNKNOWN", "Too little history behind this bar to name a regime."), b2Sec);
    expect(line).toBe("Regime at formation (tape): not classified — Too little history behind this bar to name a regime.");
    expect(line).not.toMatch(/does not reach|kept for the last/);
  });

  it("outcome 3 — the tape does not reach the bar: 'not read', with how far the tape regime does reach", () => {
    const s = around(1);
    expect(tapeRegimeAtFormationLine(s, b2Sec - 600)).toBe("Regime at formation (tape): not read — the tape does not reach this bar. The tape regime is kept for the last 4 bars — as far back as the newest 2,000 prints reach.");
    // Before the series, after its newest bar, and an empty series: all 'not read' with the reach sentence.
    expect(tapeRegimeAtFormationLine(s, b2Sec - 86_400)).toMatch(/^Regime at formation \(tape\): not read — the tape does not reach this bar\. The tape regime is kept for the last 4 bars/);
    expect(tapeRegimeAtFormationLine(s, b2Sec + 86_400)).toMatch(/not read — the tape does not reach this bar\./);
    expect(tapeRegimeAtFormationLine([], b2Sec)).toBe("Regime at formation (tape): not read — the tape does not reach this bar. The tape regime is read from the newest 2,000 prints; none reach these bars.");
    // The reach sentence appears on this row ONLY.
    expect(tapeRegimeAtFormationLine(s, b2Sec)).not.toMatch(/kept for the last/);
  });

  it("no series at all (Regime Lighting off) is its own sentence; a reader with no chart prints no regime line; nothing is stored on the gap", () => {
    expect(tapeRegimeAtFormationLine(null, b2Sec)).toBe("Regime at formation (tape): not read — the chart keeps the tape regime per bar only while Regime Lighting is on.");
    expect(fvgInspectRelationships({ ...base, regimeSeries: around(1, "BALANCE") }).rows).toContain("Regime at formation (tape): BALANCE.");
    expect(fvgInspectRelationships({ ...base, regimeSeries: null }).rows.some(r => /^Regime at formation \(tape\): not read/.test(r))).toBe(true);
    expect(fvgInspectRelationships(base).rows.some(r => /^Regime at formation/.test(r))).toBe(false);
    expect(obj.regime).toBe("UNTAGGED");
  });
});

describe("options walls drawn but none near the gap is SAID (2026-10-09)", () => {
  const far = obj.top + obj.approachDistance * 40 + 5;
  const d = (walls: number[], zeroGamma: number | null = null) => ({
    drawn: true, version: 1, underlying: SYM, spot: obj.top, climate: "PINNED", climateRatio: 0, netAtSpot: 0, gross: 1, geography: [], zeroGamma,
    walls: walls.map(strike => ({ strike, exposure: 1, share: 0.4, callOi: 50, putOi: 10, side: "ABOVE", life: "BORN", tests: 0, closesBeyond: 0, firstTestTime: null, testTimes: [] })),
    testSpanSec: 0, pockets: [], envelope: null, contracts: 40, clocks: { chainAsOf: null, underlyingAsOf: null, oiAsOf: "PRIOR_SESSION", modelAsOf: 0 },
    source: "CBOE", fidelity: "DELAYED", epistemic: { exposure: "INFERRED", envelope: "DERIVED", tests: "OBSERVED" }, assumption: "", receipt: "",
  }) as unknown as DerivativesPressureVM;
  const chartBars = BARS.map(b => ({ time: b.asOf / 1000, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume }));

  it("walls drawn, none inside or near → one line naming the nearest and its distance", () => {
    const r = fvgRelationshipsFor(obj, { derivatives: d([far + 10, far]) });
    expect(r.relationships.filter(x => x.family === "WALL")).toEqual([]);
    expect(r.absences).toEqual([{ family: "WALL", label: "Options walls", nearest: far, distance: far - obj.top }]);
    const line = `Options walls: none near this gap — nearest ${far.toFixed(2)}, ${(far - obj.top).toFixed(2)} away`;
    expect(fvgRelationshipRows(r, p => p.toFixed(2)).absences).toEqual([line]);
    const ins = fvgInspectRelationships({ o: obj, timeframe: TF, chartBars, derivatives: d([far + 10, far]), fmt: p => p.toFixed(2) });
    expect(ins.rows).toContain(line);
    expect(ins.silences.some(s => /^Options walls: SILENCE/.test(s))).toBe(false);
  });

  it("the owner drew, with no wall and no flip at all → said, not blank", () => {
    const r = fvgRelationshipsFor(obj, { derivatives: d([]) });
    expect(r.absences).toEqual([{ family: "WALL", label: "Options walls", nearest: null, distance: null }]);
    expect(fvgRelationshipRows(r, p => p.toFixed(2)).absences).toEqual(["Options walls: none near this gap — the owner read the chain and published no wall or gamma flip"]);
  });

  it("a wall inside the gap → its row, and no absence line", () => {
    const r = fvgRelationshipsFor(obj, { derivatives: d([(obj.top + obj.bottom) / 2, far]) });
    expect(r.relationships.some(x => x.kind === "CALL_WALL" && x.relation === "INSIDE")).toBe(true);
    expect(r.absences).toBeUndefined();
  });

  it("no walls drawn → the existing silence stands, and no absence line", () => {
    const r = fvgRelationshipsFor(obj, { derivatives: { drawn: false, version: 1, underlying: SYM, reason: "NO_CHAIN", contracts: 0, receipt: "" } as DerivativesPressureVM });
    expect(r.absences).toBeUndefined();
    expect(fvgRelationshipRows(r, p => p.toFixed(2)).silences).toContain("Options walls: SILENCE — the owner drew nothing: NO_CHAIN");
    expect(fvgRelationshipsFor(obj, {}).absences).toBeUndefined();
  });
});

describe("ONE classifier (sentinel): cells and sides come from their owners", () => {
  const read = (p: string) => readFileSync(path.resolve(process.cwd(), p), "utf8");
  const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("fvgEffortFlow asks the owners and declares no threshold of its own", () => {
    const src = code("src/lib/marketData/fvg/fvgEffortFlow.ts");
    expect(src.length).toBeGreaterThan(1000); // proves the scan read real source
    expect(src).toMatch(/readEffortResponseField\(/);
    expect(src).toMatch(/readTapeSide\(/);
    expect(src).toMatch(/readKeels\(/);
    expect(src).toMatch(/volumeTruthFor\(/);
    expect(src).not.toMatch(/cellFor\s*=|function cellFor|>=\s*1\.5|<=\s*0\.67|0\.35|>=\s*55|TAPE_SIDE_SHARE_PCT\s*=/);
    expect(src).not.toMatch(/"ABSORBED"|"INITIATIVE"|"VACUUM"|"QUIET"/);
  });

  it("fvgRelationships places readings; it never reads bars for effort or flow itself", () => {
    const src = code("src/lib/marketData/fvg/fvgRelationships.ts");
    expect(src.length).toBeGreaterThan(2000); // proves the scan read real source
    expect(src).not.toMatch(/readEffortResponseField\(|readTapeSide\(|readKeels\(|cellFor\(|\.volume\b/);
  });

  it("no other FVG / journal module runs the effort field for a gap", () => {
    const dirs = ["src/lib/marketData/fvg", "src/lib/journal", "src/lib/scanner", "src/lib/backtest"];
    const callers: string[] = [];
    for (const d of dirs) for (const f of readdirSync(path.resolve(process.cwd(), d))) {
      if (!/\.tsx?$/.test(f) || /\.test\.tsx?$/.test(f)) continue;
      if (/readEffortResponseField\(/.test(code(`${d}/${f}`))) callers.push(`${d}/${f}`);
    }
    expect(callers).toEqual(["src/lib/marketData/fvg/fvgEffortFlow.ts"]);
  });
});
