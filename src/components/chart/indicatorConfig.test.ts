/**
 * indicatorConfig — truth-lock for the chart indicator config + resolver.
 * Locks the timeframe-group mapping, param merging, and visibility gate
 * used by both MainChart rendering and IndicatorSettingsModal.
 */

import { describe, it, expect } from "vitest";
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
    expect(resolveParams("EMA 8")).toEqual({ length: 8, color: "#C084FC" });
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
