import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  MA_INK_DEEP,
  MA_INK_NEAR,
  MA_PERIOD_DEEP,
  MA_PERIOD_NEAR,
  movingAverageInk,
  CANDLE_DOWN_DEFAULT,
  CANDLE_UP_DEFAULT,
  CHART_SETTINGS_SCHEMA_VERSION,
  CROSSHAIR_COLOR_DEFAULT,
  GRID_COLOR_DEFAULT,
  LEGACY_CANDLE_DOWN,
  LEGACY_CANDLE_UP,
  LEGACY_CROSSHAIR_COLOR,
  LEGACY_GRID_COLOR,
  LEGACY_MARKET_FIELD,
  MARKET_FIELD_DEFAULT,
  migrateMarketField,
  migrateVolumeProfilePalette,
  VP_DOWN_DEFAULT,
  VP_PALETTE_SCHEMA_VERSION,
  VP_PALETTE_VERSION_KEY,
  VP_POC_DEFAULT,
  VP_UP_DEFAULT,
  VP_VALUE_AREA_DEFAULT,
  LEGACY_VP_POC,
  LEGACY_VP_VAH,
  LEGACY_VP_VAL,
  type PaletteStore,
} from "./marketFieldMaterial";

describe("the market field's material", () => {
  it("is the room's own field colour, not a chart-package navy", () => {
    // The OS masthead, the equipment doors, the decision rail and the
    // provenance plate all stand on `FIELD` in WMOperatingSystem.tsx. If these
    // two ever drift, the canvas grows a seam across the widest surface in the
    // product — which is the exact defect this module was written to end.
    expect(MARKET_FIELD_DEFAULT).toBe("#07080a");
    expect(MARKET_FIELD_DEFAULT).not.toBe(LEGACY_MARKET_FIELD);
  });
});

describe("migrateMarketField", () => {
  it("frees an untouched legacy background so the current default can apply", () => {
    const out = migrateMarketField({ background: LEGACY_MARKET_FIELD, gridVisible: true });
    // Deleted, NOT rewritten — one owner of the default.
    expect("background" in out).toBe(false);
    expect(out.gridVisible).toBe(true);
    expect(out.wmSchemaVersion).toBe(CHART_SETTINGS_SCHEMA_VERSION);
  });

  it("NEVER touches a background the trader actually chose", () => {
    // THE WHOLE RISK OF THIS MIGRATION. A migration that rewrites what it
    // merely SUSPECTS is unchosen will eventually overwrite a real decision.
    // Only the one byte-identical legacy value is in scope.
    for (const chosen of ["#241014", "#000000", "#0b0e1a", "#0B0E1B", MARKET_FIELD_DEFAULT]) {
      const out = migrateMarketField({ background: chosen });
      expect(out.background, `${chosen} was rewritten`).toBe(chosen);
    }
  });

  it("is idempotent — a second pass cannot undo a later deliberate choice", () => {
    // The trader migrates, then deliberately picks the old navy back. A
    // migration without a version stamp would silently strip it again on the
    // next load and the trader could never keep the colour they asked for.
    const once = migrateMarketField({ background: LEGACY_MARKET_FIELD });
    const reChosen = { ...once, background: LEGACY_MARKET_FIELD };
    const twice = migrateMarketField(reChosen);
    expect(twice.background).toBe(LEGACY_MARKET_FIELD);
  });

  it("stamps unstamped storage so it runs exactly once", () => {
    const out = migrateMarketField({ gridVisible: false });
    expect(out.wmSchemaVersion).toBe(CHART_SETTINGS_SCHEMA_VERSION);
    expect(out.gridVisible).toBe(false);
  });

  it("does not mutate the caller's stored object", () => {
    const stored = { background: LEGACY_MARKET_FIELD };
    migrateMarketField(stored);
    expect(stored.background).toBe(LEGACY_MARKET_FIELD);
  });

  it("survives empty storage — a first-run trader has nothing to migrate", () => {
    const out = migrateMarketField({});
    expect("background" in out).toBe(false);
    expect(out.wmSchemaVersion).toBe(CHART_SETTINGS_SCHEMA_VERSION);
  });
});

/* ── THE CHART'S LANGUAGE (v3) ──────────────────────────────────────────────
 *
 * Same defect as the field's material, one layer in: the product default for
 * the candles moved from the TradingView casino pair to the room's brass, and
 * `ChartsDashboard` had already frozen the old pair into every existing
 * trader's `wm_chartSettings` as explicit values. A default change alone
 * reaches nobody who has ever opened Appearance.
 */
describe("migrateMarketField — the chart's language", () => {
  /** The eight keys the v3 rung is licensed to free, with their legacy value. */
  const LEGACY_LANGUAGE: ReadonlyArray<readonly [string, string]> = [
    ["candleUp", LEGACY_CANDLE_UP],
    ["candleDown", LEGACY_CANDLE_DOWN],
    ["wickUp", LEGACY_CANDLE_UP],
    ["wickDown", LEGACY_CANDLE_DOWN],
    ["borderUp", LEGACY_CANDLE_UP],
    ["borderDown", LEGACY_CANDLE_DOWN],
    ["gridColor", LEGACY_GRID_COLOR],
    ["crosshairColor", LEGACY_CROSSHAIR_COLOR],
  ];

  it("NOT A RAINBOW: up and down are one brass at two luminances", () => {
    // Governing visual: WM_NewMockup_136_Fidelity_Five_Not_A_Rainbow.jpg —
    // every bar brass, no green in frame, no red in frame. The distinction is
    // carried by VALUE, which also survives a red-green deficiency, greyscale
    // printing, and a screenshot pasted into the journal.
    expect(CANDLE_UP_DEFAULT).toBe("#c4a574"); // the room's GOLD token
    expect(CANDLE_DOWN_DEFAULT).not.toBe(CANDLE_UP_DEFAULT);
    for (const casino of [LEGACY_CANDLE_UP, LEGACY_CANDLE_DOWN]) {
      expect(CANDLE_UP_DEFAULT).not.toBe(casino);
      expect(CANDLE_DOWN_DEFAULT).not.toBe(casino);
    }
    // DOWN is the SAME HUE, recessed — not a second material. Compare hue by
    // channel ORDER rather than by an exact number: brass is r > g > b, and a
    // drift into any other family breaks that ordering.
    for (const brass of [CANDLE_UP_DEFAULT, CANDLE_DOWN_DEFAULT]) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(brass.slice(i, i + 2), 16));
      expect(r, `${brass} is not warm`).toBeGreaterThan(g);
      expect(g, `${brass} is not brass`).toBeGreaterThan(b);
    }
  });

  it("every default stays HEX — an `<input type=\"color\">` silently eats rgba()", () => {
    // ChartSettingsModal feeds each of these to a colour swatch, which rejects
    // any non-hex value and reports back an empty string. An `rgba()` grid
    // would look correct on the canvas and then blank the Appearance control.
    for (const value of [
      MARKET_FIELD_DEFAULT,
      CANDLE_UP_DEFAULT,
      CANDLE_DOWN_DEFAULT,
      GRID_COLOR_DEFAULT,
      CROSSHAIR_COLOR_DEFAULT,
    ]) {
      expect(value, `${value} is not a 6-digit hex`).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("frees each untouched legacy language value so the room's default applies", () => {
    const stored = Object.fromEntries(LEGACY_LANGUAGE) as Record<string, string>;
    const out = migrateMarketField({ ...stored });
    for (const [key] of LEGACY_LANGUAGE) {
      // Deleted, not rewritten — ONE owner of the default, in the modal.
      expect(key in out, `${key} was rewritten instead of freed`).toBe(false);
    }
    expect(out.wmSchemaVersion).toBe(CHART_SETTINGS_SCHEMA_VERSION);
  });

  it("NEVER touches a candle colour the trader actually chose", () => {
    // Same law as the background. A value that is anything other than the ONE
    // superseded default is evidence of a decision, and decisions are not ours.
    const chosen = {
      candleUp: "#00FF00",
      candleDown: "#FF0000",
      wickUp: LEGACY_CANDLE_DOWN, // legacy, but on the WRONG key — not licensed
      gridColor: "#1a2035", // case-shifted: not byte-identical
      crosshairColor: CROSSHAIR_COLOR_DEFAULT, // already the new default
    };
    const out = migrateMarketField({ ...chosen });
    for (const [key, value] of Object.entries(chosen)) {
      expect(out[key], `${key} was rewritten`).toBe(value);
    }
  });

  it("THE LADDER LAW: a v3 pass cannot re-run the v2 rung over a later choice", () => {
    // THE REGRESSION THE PER-RUNG GATE EXISTS TO PREVENT, and the reason
    // `from < 2` is not written as `from < CHART_SETTINGS_SCHEMA_VERSION`.
    //
    // This trader migrated to v2 (their untouched navy was freed), then went
    // into Appearance and DELIBERATELY picked the old navy back. Their storage
    // is stamped 2. When the version is bumped to 3 for an unrelated reason, a
    // single `from < CURRENT` gate would re-open rung 2 and silently strip the
    // colour they explicitly asked for. Each rung must stay stamped shut.
    const out = migrateMarketField({
      background: LEGACY_MARKET_FIELD, // re-chosen on purpose, after v2 ran
      candleUp: LEGACY_CANDLE_UP, // never touched — v3 is licensed to free this
      wmSchemaVersion: 2,
    });
    expect(out.background, "the v3 pass re-ran the v2 rung").toBe(LEGACY_MARKET_FIELD);
    expect("candleUp" in out, "the v3 rung did not run").toBe(false);
    expect(out.wmSchemaVersion).toBe(CHART_SETTINGS_SCHEMA_VERSION);
  });

  it("is idempotent — a re-chosen casino colour survives the next load", () => {
    const once = migrateMarketField({ candleUp: LEGACY_CANDLE_UP });
    const reChosen = { ...once, candleUp: LEGACY_CANDLE_UP };
    expect(migrateMarketField(reChosen).candleUp).toBe(LEGACY_CANDLE_UP);
  });

  it("does not mutate the caller's stored object", () => {
    const stored = { candleUp: LEGACY_CANDLE_UP };
    migrateMarketField(stored);
    expect(stored.candleUp).toBe(LEGACY_CANDLE_UP);
  });
});

describe("the Volume Profile palette", () => {
  /** A localStorage stand-in. No jsdom needed; the migration takes the store. */
  const store = (seed: Record<string, string> = {}): PaletteStore & { map: Map<string, string> } => {
    const map = new Map(Object.entries(seed));
    return {
      map,
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
    };
  };

  it("is the same material price is, in the same two states", () => {
    // NOT a sixth brass. A VP shelf makes the same claim a candle makes, so
    // it points AT the candle owner rather than restating its value — if these
    // ever diverge, one pane of the chart is speaking a different language
    // from the pane directly above it.
    expect(VP_UP_DEFAULT).toBe(CANDLE_UP_DEFAULT);
    expect(VP_DOWN_DEFAULT).toBe(CANDLE_DOWN_DEFAULT);
  });

  it("carries no green and no red — the filename is the law", () => {
    const palette = [VP_UP_DEFAULT, VP_DOWN_DEFAULT, VP_POC_DEFAULT, VP_VALUE_AREA_DEFAULT];
    for (const hex of palette) {
      expect(hex, `${hex} is not a hex the colour input can show`).toMatch(/^#[0-9a-f]{6}$/i);
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      // Warm: red is never the smallest channel, and blue is never the largest.
      // That is what separates the room's brass from both the casino green and
      // the casino red without pinning any individual value.
      expect(r, `${hex} is not warm — red is the weakest channel`).toBeGreaterThanOrEqual(g);
      expect(g, `${hex} is not warm — blue outranks green`).toBeGreaterThanOrEqual(b);
    }
    // And neither legacy value survives anywhere in the palette.
    expect(palette).not.toContain(LEGACY_CANDLE_UP);
    expect(palette).not.toContain(LEGACY_CANDLE_DOWN);
    expect(palette).not.toContain(LEGACY_VP_POC);
    expect(palette).not.toContain(LEGACY_VP_VAH);
    expect(palette).not.toContain(LEGACY_VP_VAL);
  });

  it("POC is louder than the value area it sits inside", () => {
    // POC names the single loudest price in the profile. If it ever reads
    // dimmer than the boundary lines, the chart is emphasising the edges of
    // the value area over its centre.
    const lum = (hex: string) =>
      parseInt(hex.slice(1, 3), 16) * 0.299 +
      parseInt(hex.slice(3, 5), 16) * 0.587 +
      parseInt(hex.slice(5, 7), 16) * 0.114;
    expect(lum(VP_POC_DEFAULT)).toBeGreaterThan(lum(VP_VALUE_AREA_DEFAULT));
  });

  it("frees a key still byte-identical to the pre-OS literal, and stamps", () => {
    const s = store({ wm_vp_up: LEGACY_CANDLE_UP, wm_vp_dn: LEGACY_CANDLE_DOWN });
    expect(migrateVolumeProfilePalette(s)).toBe(2);
    expect(s.map.has("wm_vp_up"), "the key was rewritten instead of freed").toBe(false);
    expect(s.map.has("wm_vp_dn")).toBe(false);
    expect(s.map.get(VP_PALETTE_VERSION_KEY)).toBe(String(VP_PALETTE_SCHEMA_VERSION));
  });

  it("frees all five, POC and both value-area boundaries included", () => {
    const s = store({
      wm_vp_up: LEGACY_CANDLE_UP,
      wm_vp_dn: LEGACY_CANDLE_DOWN,
      wm_vp_poc: LEGACY_VP_POC,
      wm_vp_vah: LEGACY_VP_VAH,
      wm_vp_val: LEGACY_VP_VAL,
    });
    expect(migrateVolumeProfilePalette(s)).toBe(5);
  });

  it("NEVER touches a colour the trader actually picked", () => {
    // The one licence is byte-identity to the superseded literal. Anything
    // else is evidence of a choice, and a choice outranks every default.
    const s = store({ wm_vp_up: "#123456", wm_vp_dn: LEGACY_CANDLE_DOWN });
    expect(migrateVolumeProfilePalette(s)).toBe(1);
    expect(s.map.get("wm_vp_up")).toBe("#123456");
  });

  it("leaves an absent key absent — it does not mint defaults into storage", () => {
    // The whole reason this migration exists is that storage held explicit
    // copies of a default. Writing fresh copies would recreate the trap.
    const s = store();
    expect(migrateVolumeProfilePalette(s)).toBe(0);
    expect([...s.map.keys()]).toEqual([VP_PALETTE_VERSION_KEY]);
  });

  it("runs exactly once — a re-chosen casino colour survives the next load", () => {
    const s = store({ wm_vp_dn: LEGACY_CANDLE_DOWN });
    migrateVolumeProfilePalette(s);
    // The trader goes back into the gear and deliberately re-picks the red.
    s.map.set("wm_vp_dn", LEGACY_CANDLE_DOWN);
    expect(migrateVolumeProfilePalette(s), "the stamp did not hold the rung shut").toBe(0);
    expect(s.map.get("wm_vp_dn")).toBe(LEGACY_CANDLE_DOWN);
  });

  it("survives a storage that throws instead of taking the chart down", () => {
    const hostile: PaletteStore = {
      getItem: () => { throw new Error("private mode"); },
      setItem: () => { throw new Error("quota"); },
      removeItem: () => { throw new Error("quota"); },
    };
    expect(() => migrateVolumeProfilePalette(hostile)).not.toThrow();
  });
});

/* ── THE MOVING AVERAGES — THE FIFTH COPY OF THE RAINBOW ────────────────────
 *
 * MEASURED LIVE 2026-09-19 on the serving build, AFTER candles + volume + VP
 * had all gone brass: the 1490x389 price pane still carried 79,163,224 (blue),
 * 100,70,131 (violet) and 255,165,0 (orange) from EMA 21 / EMA 8 / EMA 89.
 * `MA_CFG` held nineteen hand-picked hues; the ramp replaced all of them.
 *
 * These guards are written to fail if someone reintroduces a hue — either by
 * reverting the ramp to a table, or by pushing a ramp endpoint out of brass.
 */
describe("THE MOVING AVERAGES: one material, depth by luminance", () => {
  it("never returns a hue — every rung of the ramp is brass (r > g > b)", () => {
    // Every shipped period in MA_CFG, plus the fixed windows of the four
    // period-less averages (alma 9 / t3 5 / kama 10 / mcginley 14 / vwma 20,
    // each read from indicators.ts), plus both ends and far past both ends.
    const periods = [
      1, 2, 5, 8, 9, 10, 13, 14, 20, 21, 34, 50, 89, 100, 144, 200, 400, 5000,
    ];
    for (const p of periods) {
      const ink = movingAverageInk(p);
      expect(ink, `MA ${p} is not a 6-digit hex`).toMatch(/^#[0-9a-fA-F]{6}$/);
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(ink.slice(i, i + 2), 16));
      expect(r, `MA ${p} -> ${ink} is not warm`).toBeGreaterThan(g);
      expect(g, `MA ${p} -> ${ink} is not brass`).toBeGreaterThan(b);
    }
  });

  it("is monotonic — a slower average is never brighter than a faster one", () => {
    // This is the whole point of the ramp: depth is the thing being encoded.
    // A non-monotonic ramp would read as noise and be no better than hues.
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const periods = [8, 9, 13, 20, 21, 34, 50, 89, 100, 144, 200];
    for (let i = 1; i < periods.length; i++) {
      const prev = lum(movingAverageInk(periods[i - 1]));
      const here = lum(movingAverageInk(periods[i]));
      expect(
        here,
        `MA ${periods[i]} is brighter than MA ${periods[i - 1]}`,
      ).toBeLessThan(prev);
    }
  });

  it("pins both ends to room tokens and clamps beyond them", () => {
    expect(movingAverageInk(MA_PERIOD_NEAR)).toBe(MA_INK_NEAR);
    expect(movingAverageInk(MA_PERIOD_DEEP)).toBe(MA_INK_DEEP);
    // Clamped, not extrapolated — an override at 5000 must not run off the
    // end of the ramp into a colour nobody chose.
    expect(movingAverageInk(1)).toBe(MA_INK_NEAR);
    expect(movingAverageInk(100000)).toBe(MA_INK_DEEP);
    // The deep end IS the down candle, not a sixth brass minted here.
    expect(MA_INK_DEEP).toBe(CANDLE_DOWN_DEFAULT);
  });

  it("survives a nonsense period instead of painting NaN", () => {
    // `cp.length` comes from trader-editable storage and is not validated
    // upstream. `#NaNNaNNaN` is not a colour; the line would vanish.
    for (const bad of [0, -20, NaN, Infinity, -Infinity]) {
      expect(movingAverageInk(bad as number)).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("no MA in MainChart carries a hue literal any more", () => {
    // The revive-attempt this is built to catch: someone re-adds `c: "#4FA3E0"`
    // to MA_CFG, or hands one of the period-less averages a hue back.
    const src = readFileSync(
      resolve(__dirname, "../../components/chart/MainChart.tsx"),
      "utf8",
    );
    const block = src.slice(
      src.indexOf("const MA_CFG"),
      src.indexOf('if (inds.has("VWMA"))') + 200,
    );
    expect(block.length, "MA block not found — did the anchors move?")
      .toBeGreaterThan(500);
    const hues = block.match(/#[0-9a-fA-F]{6}/g) ?? [];
    expect(hues, `MA block regained hue literals: ${hues.join(", ")}`)
      .toEqual([]);
    // And it must still be asking the owner.
    expect(block).toContain("movingAverageInk");
  });
});
