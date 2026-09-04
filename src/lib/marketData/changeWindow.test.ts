/**
 * changeWindow — Sentinel for the two-measures-one-slot defect.
 *
 * Live evidence this locks (probed 2026-09-04, same instant, same asset):
 *
 *     BTC  /api/exchange -2.40%   vs  /api/yahoo -2.2375%
 *     ETH  /api/exchange -2.56%   vs  /api/yahoo -2.1695%
 *
 * Both real. Different references. Rendered in the same visual slot as equity
 * day-changes, with no disclosure.
 */

import { describe, expect, it } from "vitest";
import {
  CHANGE_WINDOWS,
  changeWindowSuffix,
  coerceChangeWindow,
  describeChangeWindow,
  mixesChangeWindows,
  resolveRollingChange,
  type ChangeWindow,
} from "./changeWindow";

describe("changeWindow — measure disclosure", () => {
  // ── POSITIVE CONTROLS ──────────────────────────────────────────────────────
  // A module that labelled everything "" and reported every screen as unmixed
  // would satisfy the convention test below while disclosing nothing at all.
  it("POSITIVE CONTROL: the deviating windows actually produce a visible suffix", () => {
    expect(changeWindowSuffix("ROLLING_24H")).toBe("24h");
    expect(changeWindowSuffix("SESSION_OPEN")).toBe("from open");
  });

  it("POSITIVE CONTROL: a genuinely mixed screen is reported as mixed", () => {
    // The exact live row-set from /charts: equities on prior close, crypto on 24h.
    expect(mixesChangeWindows(["PRIOR_CLOSE", "PRIOR_CLOSE", "ROLLING_24H"])).toBe(true);
  });

  it("POSITIVE CONTROL: resolveRollingChange computes a real change", () => {
    const r = resolveRollingChange(79418.9, 81366.51);
    expect(r.changeWindow).toBe("ROLLING_24H");
    expect(r.referenceOpen).toBe(81366.51);
    expect(r.change).toBe(-1947.61);
    expect(r.changePct).toBe(-2.39);
  });

  // ── The convention ─────────────────────────────────────────────────────────
  it("renders NO suffix for the prior-close convention", () => {
    // Labelling every equity row "today" is noise, and noise trains people to
    // stop reading labels. We label the deviation, not the convention.
    expect(changeWindowSuffix("PRIOR_CLOSE")).toBe("");
  });

  it("renders NO suffix for UNKNOWN", () => {
    // A chip beside an unreferenced number would imply the number is real and
    // merely unlabelled. The withheld-signature guard owns this case.
    expect(changeWindowSuffix("UNKNOWN")).toBe("");
  });

  it("gives every window a distinct, non-empty description", () => {
    const seen = new Set<string>();
    for (const w of CHANGE_WINDOWS) {
      const d = describeChangeWindow(w);
      expect(d.length).toBeGreaterThan(20);
      expect(seen.has(d)).toBe(false);
      seen.add(d);
    }
    expect(seen.size).toBe(CHANGE_WINDOWS.length);
  });

  it("names the 24h measure explicitly, and says WHY crypto differs", () => {
    const d = describeChangeWindow("ROLLING_24H");
    expect(d).toContain("24 hours ago");
    expect(d).toContain("not against a daily close");
  });

  // ── Mixing detection ───────────────────────────────────────────────────────
  it("a single-measure screen is NOT mixed", () => {
    expect(mixesChangeWindows(["PRIOR_CLOSE", "PRIOR_CLOSE"])).toBe(false);
    expect(mixesChangeWindows(["ROLLING_24H", "ROLLING_24H"])).toBe(false);
    expect(mixesChangeWindows([])).toBe(false);
  });

  it("UNKNOWN rows cannot make a screen mixed — they carry no claim", () => {
    expect(mixesChangeWindows(["PRIOR_CLOSE", "UNKNOWN"])).toBe(false);
    expect(mixesChangeWindows(["UNKNOWN", "UNKNOWN"])).toBe(false);
  });

  it("two DIFFERENT real references are mixed even without PRIOR_CLOSE", () => {
    expect(mixesChangeWindows(["SESSION_OPEN", "ROLLING_24H"])).toBe(true);
  });

  // ── resolveRollingChange: the fabrication doors ────────────────────────────
  it("refuses an open that merely echoes price", () => {
    // This is the `|| price` fallback the exchange route applied when a venue
    // omitted its 24h stat. It manufactures change = 0 out of missing data.
    const r = resolveRollingChange(79418.9, 79418.9);
    expect(r.changeWindow).toBe("UNKNOWN");
    expect(r.change).toBeNull();
    expect(r.changePct).toBeNull();
  });

  it("returns NULL, not 0, when there is no reference", () => {
    // A zero is a claim — it asserts "flat". We have no evidence for it.
    for (const bad of [NaN, 0, -5, undefined, null, "81366.51"]) {
      const r = resolveRollingChange(79418.9, bad);
      expect(r.changePct, `open=${String(bad)} must not produce a number`).toBeNull();
      expect(r.changeWindow).toBe("UNKNOWN");
    }
  });

  it("NaN price does not slip through a truthiness check", () => {
    // parseFloat("nonsense") is NaN; NaN is FALSY. That is exactly how
    // /api/exchange published `price: null, changePct: 0` for an unknown coin.
    const r = resolveRollingChange(NaN, 81366.51);
    expect(r.changeWindow).toBe("UNKNOWN");
    expect(r.change).toBeNull();
    expect(r.changePct).toBeNull();
  });

  it("rejects a non-positive or non-finite price", () => {
    for (const bad of [0, -1, Infinity, undefined, null, "79418.9"]) {
      expect(resolveRollingChange(bad, 81366.51).changeWindow).toBe("UNKNOWN");
    }
  });

  it("carries the requested window through instead of hardcoding 24h", () => {
    const r = resolveRollingChange(105, 100, "SESSION_OPEN");
    expect(r.changeWindow).toBe("SESSION_OPEN");
    expect(r.changePct).toBe(5);
  });

  it("handles a positive change with the same precision", () => {
    const r = resolveRollingChange(110, 100);
    expect(r.change).toBe(10);
    expect(r.changePct).toBe(10);
  });

  // ── coerceChangeWindow: the wire boundary ──────────────────────────────────
  it("POSITIVE CONTROL: a real window survives coercion unchanged", () => {
    // A coercion that returned UNKNOWN for everything would pass every
    // rejection test below while silently deleting all disclosure.
    for (const w of CHANGE_WINDOWS) expect(coerceChangeWindow(w)).toBe(w);
  });

  it("floors an unrecognised wire value to UNKNOWN, not to a plausible guess", () => {
    // Guessing PRIOR_CLOSE here would invent the equities convention for a row
    // whose measure we do not actually know.
    for (const bad of ["rolling_24h", "24h", "", "PRIOR CLOSE", 0, 1, null, undefined, {}, ["ROLLING_24H"]]) {
      expect(coerceChangeWindow(bad), `${String(bad)} must not be trusted`).toBe("UNKNOWN");
    }
  });

  it("honours an explicit fallback, but only for unrecognised input", () => {
    expect(coerceChangeWindow(undefined, "ROLLING_24H")).toBe("ROLLING_24H");
    expect(coerceChangeWindow("PRIOR_CLOSE", "ROLLING_24H")).toBe("PRIOR_CLOSE");
  });

  it("a coerced value is always renderable — never prints raw wire text", () => {
    // The failure this forbids: a server emits `changeWindow: "<script>"` (or
    // just a typo) and the row renders it verbatim beside a price.
    expect(changeWindowSuffix(coerceChangeWindow("TOTALLY_MADE_UP"))).toBe("");
  });

  // ── Exhaustiveness ─────────────────────────────────────────────────────────
  it("every declared window is handled by both label functions", () => {
    // A new window added to the union without a case here would return
    // undefined and render "undefined" beside a price.
    for (const w of CHANGE_WINDOWS) {
      expect(typeof changeWindowSuffix(w as ChangeWindow)).toBe("string");
      expect(typeof describeChangeWindow(w as ChangeWindow)).toBe("string");
    }
  });
});
