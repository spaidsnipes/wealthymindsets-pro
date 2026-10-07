/**
 * FX lane (serving GBPUSD 1h / EURUSD 5m, 2026-10-06): "nothing for forex
 * works". Spot FX has no central traded volume, so every volume reader must
 * say NEEDS TRADED VOLUME — never NO CURRENT EVENT / WAITING / SCROLL BACK,
 * never a profile built from the live fold's placeholder 1, and never a count
 * in the Evidence Lineage.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { needsTradedVolumeSentence, needsTradedVolumeWords, volumeBearingBars } from "./volumeTruth";
import { senseEventStates, senseIsQuiet, senseNeedsTradedVolume, VOLUME_READING_SENSES } from "./senseEventStates";
import { selectProfileMenu } from "@/lib/marketData/viewModels/selectProfileMenu";
import { compileEvidenceLineage } from "./evidenceLineage";
import { compileVpRenderReceipt } from "@/lib/vpRenderReceipt";
import { selectVisibleRangeProfile } from "@/lib/marketData/viewModels/selectVisibleRangeProfile";
import { tastySymbolHits } from "@/lib/marketData/brokerInstrumentSearch";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");

describe("NEEDS TRADED VOLUME is a fact about the market", () => {
  it("names spot FX and spot metals, and nothing with central volume", () => {
    expect(needsTradedVolumeWords("EURUSD")).toBe("NEEDS TRADED VOLUME · SPOT FX HAS NONE");
    expect(needsTradedVolumeWords("GBP/USD")).toBe("NEEDS TRADED VOLUME · SPOT FX HAS NONE");
    expect(needsTradedVolumeWords("USDJPY")).toBe("NEEDS TRADED VOLUME · SPOT FX HAS NONE");
    expect(needsTradedVolumeWords("XAUUSD")).toBe("NEEDS TRADED VOLUME · SPOT METALS HAS NONE");
    expect(needsTradedVolumeSentence("EURUSD")).toBe("needs traded volume — spot FX has none");
    for (const s of ["6E1!", "6B1!", "NQ1!", "TSLA", "BTC-USD", "SPY"]) expect(needsTradedVolumeWords(s)).toBeNull();
  });
});

describe("sense states on spot FX", () => {
  const fxReceipts = {
    imbalanceStack: "UNMEASURED", deltaDivergence: "UNMEASURED", effortMark: "UNREAD",
    deltaLevels: "NO_MEASURED_GRID", liquidityLifecycle: "NO_VOLUME", absorptionBasis: "UNMEASURED",
    absorptionZones: "0", dualAnatomy: "MARKET|EVENTS:0|BODIES:0", clarityCandle: "DRAWN:152bars",
    derivativesPressure: "PRESSURE:SILENT:UNSUPPORTED", brickWalls: "ON:SILENT:NO_CHAIN",
  };
  it("every volume reader reads NEEDS TRADED VOLUME, quiet; price tools keep their word", () => {
    const s = senseEventStates(fxReceipts, { symbol: "EURUSD" });
    for (const id of ["DELTA_LEVELS", "IMBALANCE_STACK", "EFFORT_MARK", "LIQUIDITY_LIFECYCLE", "ABSORPTION", "ANATOMY_CARDS", "FIXED_RANGE", "LIVING_PROFILE"]) {
      expect(s[id]).toBe("NEEDS TRADED VOLUME · SPOT FX HAS NONE");
      expect(senseIsQuiet(s[id])).toBe(true);
      expect(senseNeedsTradedVolume(s[id])).toBe(true);
    }
    expect(s.CLARITY_CANDLE).toBe("ON CAMERA");
    expect(VOLUME_READING_SENSES.has("TPO_PROFILE")).toBe(false);
    expect(VOLUME_READING_SENSES.has("STRUCTURE_PROFILE")).toBe(false);
    expect(VOLUME_READING_SENSES.has("MARKET_STRUCTURE")).toBe(false);
  });
  it("a futures symbol keeps the ordinary NO CURRENT EVENT words", () => {
    const s = senseEventStates({ ...fxReceipts, effortMark: "UNREAD" }, { symbol: "6E1!" });
    expect(s.EFFORT_MARK).toBe("NO CURRENT EVENT");
  });
  it("options positioning with no chain is unavailable, not an observation", () => {
    const s = senseEventStates(fxReceipts, { symbol: "EURUSD" });
    expect(s.DERIVATIVES_PRESSURE).toBe("UNAVAILABLE ON THIS FEED");
    expect(s.BRICK_WALLS).toBe("UNAVAILABLE ON THIS FEED");
    expect(senseEventStates({ brickWalls: "ON:3" }).BRICK_WALLS).toBe("ON CAMERA");
    expect(senseEventStates({ brickWalls: "ON:NO_CURRENT_WALL_EVENT" }).BRICK_WALLS).toBe("NO CURRENT EVENT");
  });
  it("Evidence Lineage stops counting them (was 3 observations / 3 families on EURUSD)", () => {
    const s = senseEventStates(fxReceipts, { symbol: "EURUSD" });
    const tools = [
      { id: "CLARITY_CANDLE", label: "Clarity Candle" },
      { id: "DELTA_LEVELS", label: "Delta Levels" },
      { id: "LIQUIDITY_LIFECYCLE", label: "Liquidity Lifecycle" },
      { id: "BRICK_WALLS", label: "Brick Walls" },
    ].map(t => ({ ...t, quiet: senseIsQuiet(s[t.id]) }));
    const vm = compileEvidenceLineage({ indicators: [], tools })!;
    expect(vm.observations).toBe(1);
    expect(vm.waiting).toEqual(["Delta Levels", "Liquidity Lifecycle", "Brick Walls"]);
  });
});

describe("the Tools menu says it before the switch is pressed", () => {
  const base = { barsPresent: true, printsPresent: false, observedAggressorFlow: false, active: { FIXED_RANGE: true } };
  it("spot FX: volume readers are refused by the market, TPO stays available", () => {
    const vm = selectProfileMenu({ ...base, symbol: "EURUSD" });
    const by = (id: string) => vm.entries.find(e => e.id === id)!;
    expect(by("FIXED_RANGE").availability).toBe("REFUSED_BY_DATA");
    expect(by("FIXED_RANGE").stateWords).toBe("NEEDS TRADED VOLUME · SPOT FX HAS NONE");
    expect(by("FIXED_RANGE").availabilityNote).toMatch(/^Needs traded volume — spot FX trades over the counter/);
    expect(by("LIQUIDITY_LIFECYCLE").availability).toBe("REFUSED_BY_DATA");
    expect(by("DELTA_LEVELS").availability).toBe("NEEDS_SIDED_TAPE");
    expect(by("DELTA_LEVELS").stateWords).toBe("NEEDS TRADED VOLUME · SPOT FX HAS NONE");
    expect(by("TPO_PROFILE").availability).toBe("READY");
    expect(by("TPO_PROFILE").stateWords).toBeUndefined();
    expect(by("CLARITY_CANDLE").availability).toBe("READY");
  });
  it("a futures chart is untouched", () => {
    const vm = selectProfileMenu({ ...base, printsPresent: true, observedAggressorFlow: true, symbol: "6E1!" });
    expect(vm.entries.find(e => e.id === "FIXED_RANGE")!.availability).toBe("READY");
    expect(vm.entries.every(e => e.stateWords === undefined)).toBe(true);
  });
  it("one reason is said once for many readers", () => {
    const vm = selectProfileMenu({ ...base, symbol: "EURUSD", active: { FIXED_RANGE: true, SESSION: true, LIVING_PROFILE: true } });
    expect(vm.silentNote.match(/Needs traded volume/g)?.length).toBe(1);
  });
});

describe("VP receipt and Visible Range on spot FX", () => {
  it("the VP note names the market, not a gap in this feed", () => {
    const r = compileVpRenderReceipt([{ profile: "FIXED", declined: "NO_VOLUME", rows: 0 } as never], { noVolumeWords: needsTradedVolumeSentence("EURUSD") });
    expect(r.note).toBe("Fixed VP not drawn — needs traded volume — spot FX has none");
    expect(compileVpRenderReceipt([{ profile: "FIXED", declined: "NO_VOLUME", rows: 0 } as never]).note).toBe("Fixed VP not drawn — no volume at any level");
  });
  it("the live fold's placeholder 1 no longer builds a one-row VRP", () => {
    const bars = Array.from({ length: 30 }, (_, i) => ({ time: 1000 + i * 300, open: 1.125, high: 1.126 + i * 1e-5, low: 1.124, close: 1.1253, volume: i === 29 ? 1 : 0 }));
    expect(selectVisibleRangeProfile(bars as never, 1000, 1000 + 29 * 300).drawn).toBe(true); // the defect, raw
    expect(selectVisibleRangeProfile([...volumeBearingBars("EURUSD", bars)] as never, 1000, 1000 + 29 * 300).reason).toBe("NO_VOLUME");
    expect(MC).toContain("vrpVM = selectVisibleRangeProfile([...volumeBearingBars(symbol, bs)], from, to,");
    expect(MC).toContain("selectTimeRangeProfile([...volumeBearingBars(symbol, barsRef.current || [])], tLo, tHi)");
  });
});

describe("the glass words (MainChart)", () => {
  it("order flow, lifecycle, living, composite name NEEDS TRADED VOLUME on spot FX", () => {
    expect(MC).toContain("if (needsVolume.length && needsOF) parts.push(`${needsOF}: ${needsVolume.join(\", \")}`);");
    expect(MC).toContain("const quietL = needsLc ? quietL0.replace(/ · .*$/, ` · ${needsLc}`) : quietL0;");
    expect(MC).toContain('if (needsLc) ds.liquidityLifecycleSilence = needsLc.startsWith("NEEDS") ? "NEEDS_TRADED_VOLUME" : "NO_VOLUME";');
    expect("LIQUIDITY LIFECYCLE · ACTIVE · NO POOL IN VIEW — NO POOL MEASURED · SCROLL BACK OR ZOOM OUT".replace(/ · .*$/, " · NEEDS TRADED VOLUME · SPOT FX HAS NONE"))
      .toBe("LIQUIDITY LIFECYCLE · NEEDS TRADED VOLUME · SPOT FX HAS NONE");
    expect(MC).toContain("const quietL = rL === \"NO_PROFILE\" && needsL ? `LIVING PROFILE · ${needsL}`");
    expect(MC).toContain("const states = senseEventStates(ds, { symbol });");
  });
  it("the CME door is named as a related market's participation, never 'live volume'", () => {
    expect(MC).toContain("CME futures participation: {fxDoor.futures} →");
    expect(MC).not.toContain("live volume: {fxDoor.futures}");
  });
});

describe("the room hands the symbol to every Tools door", () => {
  const CD = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
  it("ProfilesMenu, the arrangement menu and the desk bar all know the market", () => {
    const menus = CD.split("<ProfilesMenu\n").length - 1;
    expect(menus).toBeGreaterThan(0);
    expect(CD.split("<ProfilesMenu\n").slice(1).every(chunk => /^\s+symbol=\{symbol\}/.test(chunk))).toBe(true);
    expect(CD).toContain("const arrangementMenu = selectProfileMenu({\n    symbol,");
    expect(CD).toContain("<ChartArrangementBar\n                symbol={symbol}");
  });
  it("the header's tape regime on spot FX says there is no tape, not UNRESOLVED", () => {
    expect(CD).toContain("`NONE · ${hasNoCentralVolume(symbol)} has no tape`");
  });
});

describe("symbol search: EUR/USD lands on the spot pair, not a tastytrade contract", () => {
  it("drops tastytrade's spot-FX rows", () => {
    expect(tastySymbolHits([{ symbol: "EUR/USD", description: "EUR 100,000 Contract", "instrument-type": "Cryptocurrency" }])).toEqual([]);
    expect(tastySymbolHits([{ symbol: "GBP/USD", description: "GBP 100,000 Contract" }])).toEqual([]);
    expect(tastySymbolHits([{ symbol: "AAPL", description: "Apple" }])[0]).toMatchObject({ sym: "AAPL" });
  });
});
