import { describe, expect, it } from "vitest";
import fuseProfiles from "./fuseProfiles";
import { fusionSourceFor, pickLawfulFusionPair, type FusionSourceInputs, type FusionStackSpecies } from "./profileFusionSources";

const rows = (base: number) => [{ price: base, volume: 100 }, { price: base + 0.5, volume: 300 }, { price: base + 1, volume: 100 }];

// Loaded bars 0..1000. Composite = completed sessions 0..600. Visible range = today 700..1000.
const inputs = (over: Partial<FusionSourceInputs> = {}): FusionSourceInputs => ({
  instrument: "TSLA",
  firstBarTime: 0,
  lastBarTime: 1000,
  living: { drawn: true, bars: rows(100), poc: 100.5, estimated: true },
  composite: { drawn: true, rows: rows(100), poc: 100.5, asOf: 600, sessionStarts: [0, 300] },
  visibleRange: { drawn: true, rows: rows(100.5), poc: 101, from: 700, to: 1000 },
  ...over,
});

describe("§23 · each stack species states its instrument, unit, evidence and window", () => {
  it("Living (candle path) covers every loaded bar in BAR_VOLUME; trade path is PRINT_SIZE with no guessed window", () => {
    const est = fusionSourceFor("LIVING", inputs())!;
    expect([est.volumeUnit, est.evidence, est.window]).toEqual(["BAR_VOLUME", "CANDLE_ESTIMATED", { from: 0, to: 1000 }]);
    const tape = fusionSourceFor("LIVING", inputs({ living: { drawn: true, bars: rows(100), poc: 100.5, estimated: false } }))!;
    expect([tape.volumeUnit, tape.evidence, tape.window]).toEqual(["PRINT_SIZE", "TRADE_BASED", null]);
  });

  it("Living with `estimated` undefined is the candle path: BAR_VOLUME / CANDLE_ESTIMATED over every loaded bar", () => {
    const u = fusionSourceFor("LIVING", inputs({ living: { drawn: true, bars: rows(100), poc: 100.5 } }))!;
    expect([u.volumeUnit, u.evidence, u.window]).toEqual(["BAR_VOLUME", "CANDLE_ESTIMATED", { from: 0, to: 1000 }]);
  });

  it("Composite covers its completed sessions; Visible Range covers the camera", () => {
    expect(fusionSourceFor("COMPOSITE", inputs())!.window).toEqual({ from: 0, to: 600 });
    expect(fusionSourceFor("VISIBLE_RANGE", inputs())!.window).toEqual({ from: 700, to: 1000 });
  });

  it("an undrawn species hands the fuser nothing", () => {
    expect(fusionSourceFor("COMPOSITE", inputs({ composite: { drawn: false, rows: [], poc: null, asOf: null, sessionStarts: [] } }))).toBeNull();
    expect(fusionSourceFor("TPO", inputs())).toBeNull();
  });

  it("the real pairs: Living(candle)+Composite double-counts → refused; Composite+today's range fuses", () => {
    const src = (sp: FusionStackSpecies) => fusionSourceFor(sp, inputs());
    expect(fuseProfiles(src("COMPOSITE"), src("LIVING"))).toEqual({ ok: false, reason: "TIME_OVERLAP" });
    expect(fuseProfiles(src("VISIBLE_RANGE"), src("LIVING"))).toEqual({ ok: false, reason: "TIME_OVERLAP" });
    expect(fuseProfiles(src("COMPOSITE"), src("VISIBLE_RANGE")).ok).toBe(true);
    // Panning the camera back into the composite's sessions makes them share bars.
    const back = inputs({ visibleRange: { drawn: true, rows: rows(100.5), poc: 101, from: 500, to: 1000 } });
    expect(fuseProfiles(fusionSourceFor("COMPOSITE", back), fusionSourceFor("VISIBLE_RANGE", back))).toEqual({ ok: false, reason: "TIME_OVERLAP" });
  });

  it("tape-built Living is never summed with bar volume", () => {
    const x = inputs({ living: { drawn: true, bars: rows(100), poc: 100.5, estimated: false } });
    expect(fuseProfiles(fusionSourceFor("COMPOSITE", x), fusionSourceFor("LIVING", x))).toEqual({ ok: false, reason: "UNIT_MISMATCH" });
  });
});

describe("§23 · the auto pair is the first LAWFUL pair, preference first", () => {
  const sourceOf = (x: FusionSourceInputs) => (sp: FusionStackSpecies) => fusionSourceFor(sp, x);

  it("with Living drawn beside Composite and Visible Range, the lawful Composite+Visible Range pair is chosen", () => {
    expect(pickLawfulFusionPair<FusionStackSpecies>(["COMPOSITE", "VISIBLE_RANGE", "LIVING"], sourceOf(inputs()))).toEqual(["COMPOSITE", "VISIBLE_RANGE"]);
  });

  it("when no pair is lawful, the preferred pair is returned so its refusal is named", () => {
    expect(pickLawfulFusionPair<FusionStackSpecies>(["COMPOSITE", "LIVING"], sourceOf(inputs()))).toEqual(["COMPOSITE", "LIVING"]);
  });

  it("a lawful preferred pair stays preferred; fewer than two species is no pair", () => {
    const x = inputs({ composite: { drawn: true, rows: rows(100), poc: 100.5, asOf: 600, sessionStarts: [0] }, firstBarTime: 700 });
    // Living now covers 700..1000 only — disjoint from Composite (0..600).
    expect(pickLawfulFusionPair<FusionStackSpecies>(["COMPOSITE", "VISIBLE_RANGE", "LIVING"], sourceOf(x))).toEqual(["COMPOSITE", "LIVING"]);
    expect(pickLawfulFusionPair<FusionStackSpecies>(["LIVING"], sourceOf(x))).toBeNull();
  });
});
