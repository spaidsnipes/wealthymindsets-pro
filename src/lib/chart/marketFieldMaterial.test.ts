import { describe, expect, it } from "vitest";

import {
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
