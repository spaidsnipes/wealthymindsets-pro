/**
 * indicatorConfig — truth-lock for the chart indicator config + resolver.
 * Locks the timeframe-group mapping, param merging, and visibility gate
 * used by both MainChart rendering and IndicatorSettingsModal.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { movingAverageInk } from "@/lib/chart/marketFieldMaterial";
import {
  tfGroupOf,
  resolveParams,
  isConfigurable,
  visibleAtTf,
  INDICATOR_CONFIG,
  TF_GROUPS,
} from "./indicatorConfig";

describe("tfGroupOf — timeframe → group classification", () => {
  it("classifies seconds", () => {
    expect(tfGroupOf("10s")).toBe("Seconds");
    expect(tfGroupOf("30s")).toBe("Seconds");
  });

  it("classifies minutes (default fallback for anything ending in m without matching earlier)", () => {
    expect(tfGroupOf("1m")).toBe("Minutes");
    expect(tfGroupOf("5m")).toBe("Minutes");
    expect(tfGroupOf("15m")).toBe("Minutes");
    expect(tfGroupOf("60m")).toBe("Minutes");
  });

  it("classifies hours (case-insensitive)", () => {
    expect(tfGroupOf("1h")).toBe("Hours");
    expect(tfGroupOf("4H")).toBe("Hours");
  });

  it("classifies days", () => {
    expect(tfGroupOf("1D")).toBe("Days");
  });

  it("classifies weeks", () => {
    expect(tfGroupOf("1W")).toBe("Weeks");
  });

  it("classifies months + multi-month ranges", () => {
    expect(tfGroupOf("1M")).toBe("Months");
    expect(tfGroupOf("3M")).toBe("Months");
    expect(tfGroupOf("6M")).toBe("Months");
    expect(tfGroupOf("1Y")).toBe("Months");
    expect(tfGroupOf("5Y")).toBe("Months");
  });

  it("falls back to Minutes for empty input; bare terminal-suffix tokens match those groups (documented behavior)", () => {
    expect(tfGroupOf("")).toBe("Minutes");
    // "bogus" ends with 's' → hits /s$/i seconds regex. Documented so a
    // future tighter classifier is loud instead of silent.
    expect(tfGroupOf("bogus")).toBe("Seconds");
    // Strings without a suffix that matches Days/Weeks/Months/Hours/
    // Minutes/Seconds fall to Minutes.
    expect(tfGroupOf("xyz")).toBe("Minutes");
  });

  it("trims whitespace before classification", () => {
    expect(tfGroupOf("  1D  ")).toBe("Days");
    expect(tfGroupOf("  5m  ")).toBe("Minutes");
  });
});

describe("TF_GROUPS constant", () => {
  it("contains the 6 canonical groups in expected order", () => {
    expect(TF_GROUPS).toEqual(["Seconds", "Minutes", "Hours", "Days", "Weeks", "Months"]);
  });
});

describe("resolveParams — defaults × overrides", () => {
  it("returns defaults when no overrides supplied", () => {
    // Derived, not transcribed: this assertion used to hardcode `#C084FC`,
    // which is precisely the literal that kept the rainbow alive.
    expect(resolveParams("EMA 8")).toEqual({ length: 8, color: movingAverageInk(8) });
  });

  it("returns empty object for unknown indicator", () => {
    expect(resolveParams("Bogus")).toEqual({});
  });

  it("shallow-merges caller overrides over defaults", () => {
    const merged = resolveParams("EMA 8", { "EMA 8": { length: 21, color: "#000000" } });
    expect(merged).toEqual({ length: 21, color: "#000000" });
  });

  it("partial override keeps unchanged defaults", () => {
    const merged = resolveParams("Bollinger Bands", { "Bollinger Bands": { mult: 3 } });
    expect(merged.length).toBe(20); // default preserved
    expect(merged.mult).toBe(3);    // override applied
    expect(merged.color).toBe("#4FA3E0");
  });
});

describe("isConfigurable", () => {
  it("returns true for every indicator in the config", () => {
    for (const name of Object.keys(INDICATOR_CONFIG)) {
      expect(isConfigurable(name)).toBe(true);
    }
  });

  it("returns false for unknown indicator names", () => {
    expect(isConfigurable("Bogus")).toBe(false);
    expect(isConfigurable("")).toBe(false);
  });
});

describe("visibleAtTf — per-group visibility gate", () => {
  it("visible when no visibility map supplied", () => {
    expect(visibleAtTf(undefined, "1D")).toBe(true);
    expect(visibleAtTf({}, "1D")).toBe(true);
  });

  it("visible when group key is absent (only false hides)", () => {
    expect(visibleAtTf({ visibility: {} }, "1D")).toBe(true);
    expect(visibleAtTf({ visibility: { Minutes: true } }, "1D")).toBe(true);
  });

  it("hidden only when the specific group is explicitly false", () => {
    expect(visibleAtTf({ visibility: { Days: false } }, "1D")).toBe(false);
    expect(visibleAtTf({ visibility: { Days: false } }, "1h")).toBe(true);
  });
});

describe("INDICATOR_CONFIG — shape guarantees", () => {
  it("every entry has fields + defaults", () => {
    for (const [name, cfg] of Object.entries(INDICATOR_CONFIG)) {
      expect(Array.isArray(cfg.fields), `${name} fields`).toBe(true);
      expect(cfg.fields.length, `${name} fields count`).toBeGreaterThan(0);
      expect(cfg.defaults, `${name} defaults`).toBeDefined();
    }
  });

  it("moving-average family entries have length + color defaults", () => {
    const maNames = ["EMA 8", "EMA 200", "SMA 20", "SMA 200", "WMA", "HMA"];
    for (const name of maNames) {
      const cfg = INDICATOR_CONFIG[name];
      expect(cfg?.defaults.length).toBeGreaterThan(0);
      expect(cfg?.defaults.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

/**
 * THE SIXTH COPY OF THE RAINBOW.
 *
 * `MA_CFG` in MainChart was cleaned first, and the chart still painted the old
 * blue/violet/orange live. The reason is this file: `resolveParams` spreads
 * `INDICATOR_CONFIG[name].defaults` over the stored overrides, so `cp.color` is
 * already a concrete string by the time MainChart evaluates
 * `cp.color ?? movingAverageInk(len)`. The fallback could never fire. A hue
 * literal here outranks the product default permanently and invisibly.
 *
 * These guards fail if anyone re-mints one.
 */
describe("THE MOVING AVERAGES: the config table mints no hue of its own", () => {
  /** Every name whose config is the shared `ma()` shape. */
  const MA_NAMES = [
    "EMA 8", "EMA 9", "EMA 13", "EMA 21", "EMA 34",
    "EMA 50", "EMA 89", "EMA 144", "EMA 200",
    "SMA 9", "SMA 20", "SMA 50", "SMA 100", "SMA 200",
    "WMA", "HMA", "DEMA", "TEMA", "ZLEMA",
  ];

  it("derives every MA default colour from its own period", () => {
    for (const name of MA_NAMES) {
      const cfg = INDICATOR_CONFIG[name];
      expect(cfg, `${name} missing from INDICATOR_CONFIG`).toBeDefined();
      const len = cfg!.defaults.length!;
      expect(cfg!.defaults.color, `${name} (period ${len}) is not its ramp ink`)
        .toBe(movingAverageInk(len));
    }
  });

  it("never lets an MA default carry a hue", () => {
    // The ramp runs PEARL → recessed brass, so red > green > blue always.
    for (const name of MA_NAMES) {
      const c = INDICATOR_CONFIG[name]!.defaults.color!;
      const r = parseInt(c.slice(1, 3), 16);
      const g = parseInt(c.slice(3, 5), 16);
      const b = parseInt(c.slice(5, 7), 16);
      expect(r > g && g > b, `${name} -> ${c} is a hue, not brass`).toBe(true);
    }
  });

  it("resolveParams still lets a trader override the ink", () => {
    // Deriving the default must not take the colour picker away.
    const p = resolveParams("EMA 21", { "EMA 21": { color: "#123456" } });
    expect(p.color).toBe("#123456");
    expect(p.length).toBe(21);
  });

  it("no ma() entry in the source carries a colour literal any more", () => {
    // Revive-attempt this catches: someone re-adds `ma(21, "#4FA3E0")`.
    const src = readFileSync(
      resolve(__dirname, "indicatorConfig.ts"), "utf8",
    );
    const start = src.indexOf("export const INDICATOR_CONFIG");
    const end = src.indexOf("// ── Bands / Channels ──");
    expect(start, "INDICATOR_CONFIG anchor moved").toBeGreaterThan(-1);
    expect(end, "Bands anchor moved").toBeGreaterThan(start);
    const block = src.slice(start, end);
    expect(block.length, "MA block suspiciously small").toBeGreaterThan(300);
    expect(block.match(/#[0-9a-fA-F]{6}/g) ?? [], "MA block regained hue literals").toEqual([]);
  });
});
