/**
 * LENS FIXTURE SCENE (coordinator order 2026-10-08): token-gated, signed-in
 * only, a SAMPLE tape / chain through the REAL owners, zero storage / network
 * writes, never mixed with the live tape or chain, a banner on screen.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseProofScene, proofFixtureScene, proofSceneValue } from "./proofScene";
import { derivativesPressureTint, weatherGrain } from "./stateTextureReceipts";
import {
  LENS_FIXTURE_BANNER,
  LENS_FIXTURE_CLIMATES,
  LENS_FIXTURE_STAGES,
  lensFixtureChain,
  lensFixturePressure,
  lensFixtureTape,
  lensFixtureWeather,
  parseLensFixture,
  LENS_FIXTURE_BARS,
} from "./lensFixture";
import { selectLiquidityWeatherGlass } from "@/lib/marketData/viewModels/selectLiquidityWeatherGlass";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");
const NOW = Date.parse("2026-10-08T12:00:00Z");
/** Centres across instruments: a stock, an ETF, an index future, spot FX. */
const CENTRES = [100, 774.69, 31258.5, 1.0845];

afterEach(() => vi.unstubAllGlobals());

describe("token-gated, inert without it", () => {
  it("parses only scene=lens-fixture with a known state and / or climate", () => {
    expect(parseLensFixture("")).toBeNull();
    expect(parseLensFixture("?scene=clean&state=HEAVY")).toBeNull();
    expect(parseLensFixture("?scene=lens-fixture")).toBeNull();
    expect(parseLensFixture("?scene=lens-fixture&state=SUNNY&climate=WINDY")).toBeNull();
    expect(parseLensFixture("?scene=lens-fixture&state=heavy")).toEqual({ stage: "HEAVY", climate: null });
    expect(parseLensFixture("?scene=lens-fixture&climate=AMPLIFYING")).toEqual({ stage: null, climate: "AMPLIFYING" });
    expect(parseLensFixture("?scene=lens-fixture&state=AIRLESS&climate=MIXED")).toEqual({ stage: "AIRLESS", climate: "MIXED" });
    expect(parseLensFixture("?scene=lens-fixture&climate=INSUFFICIENT_EVIDENCE")).toBeNull();
  });

  it("is a CLEAN chart proof scene (writes held) that switches on only the lens it fixes", () => {
    expect(proofFixtureScene("?scene=lens-fixture&state=HEAVY")).toBe("lens-fixture");
    const w = parseProofScene("?scene=lens-fixture&state=HEAVY");
    expect(w.active && w.clean).toBe(true);
    expect(proofSceneValue(w, "wm_ofLiquidityWeather")).toBe(true);
    expect(proofSceneValue(w, "wm_ofDerivativesPressure")).toBe(false);
    expect(proofSceneValue(w, "wm_fvg")).toBe(false);
    const c = parseProofScene("?scene=lens-fixture&climate=DAMPING");
    expect(proofSceneValue(c, "wm_ofDerivativesPressure")).toBe(true);
    expect(proofSceneValue(c, "wm_ofLiquidityWeather")).toBe(false);
    // Other fixture scenes and plain charts are unchanged.
    expect(parseProofScene("?scene=journal-fixture").active).toBe(false);
    expect(parseProofScene("").active).toBe(false);
  });
});

describe("every weather stage, through the real owner, at any price scale", () => {
  it.each(LENS_FIXTURE_STAGES.map(s => [s]))("%s", stage => {
    for (const c of CENTRES) {
      const vm = lensFixtureWeather(stage, c);
      expect(vm.stage, `${stage} @ ${c}`).toBe(stage);
      expect(weatherGrain(vm.stage).receipt).toMatch(new RegExp(`^${stage}:(GRAIN\\d+(:JITTER)?|NONE)$`));
    }
  });
  it("with a window every print is dated inside the chart's newest bars, the stage is unchanged, and the glass has a place for the lens", () => {
    const win = { endMs: Date.parse("2026-10-08T23:00:00Z"), barMs: 300_000 };
    for (const stage of LENS_FIXTURE_STAGES) {
      const tape = lensFixtureTape(stage, 31258.5, win);
      expect(tape.every(t => typeof t.time === "number" && t.time! > win.endMs - LENS_FIXTURE_BARS * win.barMs && t.time! <= win.endMs)).toBe(true);
      // The whole sample stays within ~1% of the last close (on camera).
      expect(tape.every(t => Math.abs(t.price! / 31258.5 - 1) < 0.01)).toBe(true);
      const vm = lensFixtureWeather(stage, 31258.5, win);
      expect(vm.stage).toBe(stage);
      const glass = selectLiquidityWeatherGlass(vm);
      if (stage === "UNMEASURED") expect(glass.window).toBeNull();
      else {
        expect(glass.window).not.toBeNull();
        expect(glass.window!.toTime).toBeLessThanOrEqual(win.endMs);
        expect(glass.window!.fromTime).toBeGreaterThan(win.endMs - LENS_FIXTURE_BARS * win.barMs);
      }
    }
    // Undated (no window): no place — the defect read on serving 48bdea6.
    expect(selectLiquidityWeatherGlass(lensFixtureWeather("HEAVY", 31258.5)).window).toBeNull();
  });
  it("the seven stages give seven different grain receipts", () => {
    expect(new Set(LENS_FIXTURE_STAGES.map(s => weatherGrain(lensFixtureWeather(s, 774.69).stage).receipt)).size).toBe(7);
  });
});

describe("every pressure climate, through the real owner, at any price scale", () => {
  it.each(LENS_FIXTURE_CLIMATES.map(c => [c]))("%s", climate => {
    for (const c of CENTRES) {
      const vm = lensFixturePressure(climate, c, NOW);
      expect(vm.drawn, `${climate} @ ${c}`).toBe(true);
      if (!vm.drawn) return;
      expect(vm.climate, `${climate} @ ${c}`).toBe(climate);
      const t = derivativesPressureTint(vm.geography);
      if (climate === "DAMPING") expect(t.negative).toBe(0);
      if (climate === "AMPLIFYING") expect(t.positive).toBe(0);
      if (climate === "MIXED") expect(t.positive > 0 && t.negative > 0).toBe(true);
      // The field sits on the chart's own price axis.
      expect(vm.spot).toBe(c);
    }
  });
  it("the sample chain is labelled SAMPLE, never a real underlying, and claims no wall test (no live bars)", () => {
    const ch = lensFixtureChain("DAMPING", 774.69, NOW);
    expect(ch.underlying).toBe("SAMPLE");
    expect(ch.rows.every(r => r.contract.startsWith("SAMPLE"))).toBe(true);
    const vm = lensFixturePressure("DAMPING", 774.69, NOW);
    if (vm.drawn) expect(vm.walls.every(w => w.tests === 0)).toBe(true);
  });
});

describe("zero storage writes, zero network calls", () => {
  it("building every sample reading touches neither storage nor the network", () => {
    const boom = vi.fn(() => { throw new Error("no IO in a fixture"); });
    vi.stubGlobal("fetch", boom);
    vi.stubGlobal("localStorage", { getItem: boom, setItem: boom, removeItem: boom, clear: boom, key: boom, length: 0 });
    vi.stubGlobal("sessionStorage", { getItem: boom, setItem: boom, removeItem: boom, clear: boom, key: boom, length: 0 });
    for (const s of LENS_FIXTURE_STAGES) lensFixtureWeather(s, 774.69);
    for (const c of LENS_FIXTURE_CLIMATES) lensFixturePressure(c, 774.69, NOW);
    expect(boom).not.toHaveBeenCalled();
    const src = read("src/lib/chart/lensFixture.ts");
    expect(src).not.toMatch(/\bfetch\(|localStorage|sessionStorage|indexedDB|document\.|window\./);
  });
});

describe("the room: signed-in only, never mixed with live, banner on screen", () => {
  const D = read("src/components/chart/ChartsDashboard.tsx");
  const M = read("src/components/chart/MainChart.tsx");
  it("signed-in only", () => {
    expect(D.length).toBeGreaterThan(100_000);
    expect(D).toContain('(lensFixtureUser ? parseLensFixture(`?${optionSearchParams?.toString() ?? ""}`) : null)');
  });
  it("the lens reads the sample, not the live tape; the aperture never re-samples live bars", () => {
    expect(D).toMatch(/const chartLiquidityWeather = React\.useMemo\(\(\) => \{\s*if \(lensFixtureWeatherVM\) return lensFixtureWeatherVM;/);
    expect(D).toContain("lensFixtureWeather={!!lensFixtureWeatherVM}");
    expect(M).toContain("if (aperture && layerOnRef.current.weather && !lensFixtureWeatherRef.current) {");
  });
  it("no live chain while a climate is fixed: the futures branch is off and the Cboe / Deribit effect returns before any fetch", () => {
    expect(D).toContain('const futuresPressureOn = pressureEvidenceOn && !lensFixture?.climate && classifySymbol(symbol) === "FUTURES";');
    const eff = D.indexOf("if (lensFixture?.climate) { setDerivativesReceipt(null); return; }");
    const fetchAt = D.indexOf("fetch(route, { cache: \"no-store\" })");
    const deribitAt = D.indexOf("const loadDeribitDirect = async");
    expect(eff).toBeGreaterThan(0);
    expect(eff).toBeLessThan(fetchAt);
    expect(eff).toBeLessThan(deribitAt);
    expect(D).toMatch(/if \(pressureEvidenceOn && lensFixture\?\.climate\) \{\s*return lensFixtureAnchor \? lensFixturePressure\(/);
  });
  it("the banner says it is a sample", () => {
    expect(LENS_FIXTURE_BANNER).toBe("PROOF SCENE — sample market state, not live");
    expect(D).toContain('data-testid="lens-fixture-banner" role="status"');
    expect(D).toContain("{LENS_FIXTURE_BANNER}");
  });
});

describe("attention fixture — the governor's quiet, readable on serving (2026-10-09)", () => {
  it("is inert without the scene token and the exact word; it never implies a weather or pressure fixture", async () => {
    const { parseAttentionFixture, ATTENTION_FIXTURE_QUIET } = await import("./lensFixture");
    expect(parseAttentionFixture("")).toBeNull();
    expect(parseAttentionFixture("?attention=question-quiet")).toBeNull();
    expect(parseAttentionFixture("?scene=clean&attention=question-quiet")).toBeNull();
    expect(parseAttentionFixture("?scene=lens-fixture&attention=loud")).toBeNull();
    expect(parseAttentionFixture("?scene=lens-fixture&attention=Question-Quiet")).toBe("QUESTION_QUIET");
    expect(parseLensFixture("?scene=lens-fixture&attention=question-quiet")).toBeNull();
    expect(ATTENTION_FIXTURE_QUIET).toBe(0.35);
  });
});
