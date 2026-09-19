import { describe, expect, it } from "vitest";

import {
  CHART_SETTINGS_SCHEMA_VERSION,
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
