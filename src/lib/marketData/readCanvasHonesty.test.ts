import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { readCanvasHonesty } from "./readCanvasHonesty";
import { CANONICAL_FIDELITY_LABELS } from "./canonicalFidelityLabels";
import { MARKET_FIDELITIES } from "./marketFidelityAlgebra";

/*
  THE MEASURED CANVAS, WRITTEN DOWN.

  Every fixture below is the live /charts state observed on 2026-09-19 against
  serving worker version 72a69e89-ade5-4bd0-aa6b-c1db362de484: BTC 15m, bars
  verified, no live print, canonical capture stamp 22:32:10Z.
*/
const CAPTURED_AT = Date.UTC(2026, 8, 19, 22, 32, 10);

const BARS_VERIFIED = {
  label: CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED,
  availability: undefined,
} as const;

describe("readCanvasHonesty — the plaque names the moment the rail names", () => {
  it("THE FALSIFIER: a canvas with a capture stamp and no live print is NOT unmeasured", () => {
    // This is the exact live defect. Before the fix the only clock consulted
    // was the tick accept site, which is null on every bars-only canvas, so
    // the plaque printed "No fidelity has been established for this canvas"
    // beside a cell printing "asOf 22:32:10Z" about the same instrument.
    const reading = readCanvasHonesty({
      badge: BARS_VERIFIED,
      capturedAtMs: CAPTURED_AT,
      observedAtMs: null,
    });
    expect(reading, "UNMEASURED beside a rendered asOf is the composition lie").not.toBeNull();
    expect(reading!.asOf).toBe(CAPTURED_AT);
  });

  it("does not upgrade the WORD — bars verified with no quote is PARTIAL", () => {
    // A better clock must change WHEN the house claims to have looked, never
    // WHAT it claims to have seen. If this ever reads EXECUTABLE the fix has
    // turned into an overclaim.
    const reading = readCanvasHonesty({
      badge: BARS_VERIFIED,
      capturedAtMs: CAPTURED_AT,
      observedAtMs: null,
    });
    expect(reading!.fidelity).toBe(MARKET_FIDELITIES.PARTIAL);
  });

  it("prefers the canvas capture stamp over the tape stamp, so the rail speaks once", () => {
    const tape = CAPTURED_AT + 60_000;
    const reading = readCanvasHonesty({
      badge: BARS_VERIFIED,
      capturedAtMs: CAPTURED_AT,
      observedAtMs: tape,
    });
    // Deliberately the OLDER of the two: matching the neighbouring cell
    // outranks freshness, because two clocks on one rail is how two cells
    // come to disagree about one instrument at one instant.
    expect(reading!.asOf).toBe(CAPTURED_AT);
    expect(reading!.asOf).not.toBe(tape);
  });

  it("falls back to the tape stamp when the canvas has no capture stamp", () => {
    const reading = readCanvasHonesty({
      badge: { label: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE, availability: undefined },
      capturedAtMs: null,
      observedAtMs: CAPTURED_AT,
    });
    expect(reading!.asOf).toBe(CAPTURED_AT);
    expect(reading!.fidelity).toBe(MARKET_FIDELITIES.EXECUTABLE);
  });

  it("REFUSES when the house holds no accept-site stamp at all", () => {
    expect(
      readCanvasHonesty({ badge: BARS_VERIFIED, capturedAtMs: null, observedAtMs: null }),
    ).toBeNull();
    expect(
      readCanvasHonesty({ badge: BARS_VERIFIED, capturedAtMs: undefined, observedAtMs: undefined }),
    ).toBeNull();
  });

  it("REFUSES a present-but-unusable stamp instead of passing it onward", () => {
    // `??` would hand 0 and NaN through as if they were observations. They are
    // not moments; they are the absence of one wearing a number's clothes.
    for (const bad of [0, Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      expect(
        readCanvasHonesty({ badge: BARS_VERIFIED, capturedAtMs: bad, observedAtMs: null }),
        `asOf ${String(bad)} must not become a reading`,
      ).toBeNull();
    }
  });

  it("REFUSES an unfinished question even when a stamp is in hand", () => {
    // AWAITING means the house has not finished asking. A stamp does not
    // rescue a question nobody has answered, so the clocks are never reached.
    for (const availability of ["awaiting", "unavailable"] as const) {
      expect(
        readCanvasHonesty({
          badge: { label: CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED, availability },
          capturedAtMs: CAPTURED_AT,
          observedAtMs: CAPTURED_AT,
        }),
        `${availability} must not be folded into a fidelity word`,
      ).toBeNull();
    }
  });

  it("holds no clock of its own — Date.now() must never appear in the module", () => {
    // The refusal is only worth anything if there is no escape hatch. This is
    // the ff40d5f defect written as a scan: a 12h-old close stamped as now.
    const src = readFileSync(resolve(__dirname, "readCanvasHonesty.ts"), "utf8");
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//"))
      .join("\n");
    expect(code).not.toContain("Date.now");
    expect(code).not.toContain("new Date");
  });

  it("ChartsDashboard delegates to this function rather than keeping its own copy", () => {
    // Breadcrumb. tsc stays EXIT 0 through a surface quietly re-inlining the
    // memo, and a re-inlined memo is a second owner of the honesty reading.
    const dash = readFileSync(
      resolve(__dirname, "../../components/chart/ChartsDashboard.tsx"),
      "utf8",
    );
    expect(dash).toContain("readCanvasHonesty");
    // The wrong clock, alone, is the defect. If the dashboard ever passes only
    // the tape stamp again, the live canvas goes back to reading UNMEASURED.
    expect(dash).toContain("capturedAtMs:");
  });
});
