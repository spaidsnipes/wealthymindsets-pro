import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { readCanvasHonesty } from "./readCanvasHonesty";
import { CANONICAL_FIDELITY_LABELS } from "./canonicalFidelityLabels";
import { FIDELITY_REASONS, MARKET_FIDELITIES } from "./marketFidelityAlgebra";
import { priceSourceBadge } from "../priceSource";

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

const LIVE_CERTIFIED = {
  label: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
  availability: undefined,
} as const;

/** What /charts truly knows (2026-09-26): no execution adapter owns the canvas. */
const NO_OWNER = { adapterOwnsCanvasPrice: false } as const;

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
      execution: NO_OWNER,
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
      execution: NO_OWNER,
    });
    expect(reading!.fidelity).toBe(MARKET_FIDELITIES.PARTIAL);
  });

  it("prefers the canvas capture stamp over the tape stamp, so the rail speaks once", () => {
    const tape = CAPTURED_AT + 60_000;
    const reading = readCanvasHonesty({
      badge: BARS_VERIFIED,
      capturedAtMs: CAPTURED_AT,
      observedAtMs: tape,
      execution: NO_OWNER,
    });
    // Deliberately the OLDER of the two: matching the neighbouring cell
    // outranks freshness, because two clocks on one rail is how two cells
    // come to disagree about one instrument at one instant.
    expect(reading!.asOf).toBe(CAPTURED_AT);
    expect(reading!.asOf).not.toBe(tape);
  });

  it("falls back to the tape stamp when the canvas has no capture stamp", () => {
    const reading = readCanvasHonesty({
      badge: LIVE_CERTIFIED,
      capturedAtMs: null,
      observedAtMs: CAPTURED_AT,
      execution: NO_OWNER,
    });
    expect(reading!.asOf).toBe(CAPTURED_AT);
    // REPLACED PIN, 2026-09-26. This asserted EXECUTABLE for a certified live
    // quote on a canvas whose caller holds NO execution adapter — the exact
    // "EXECUTABLE badge on a canvas the adapter does not own" the algebra
    // names as a lie. The clock assertion above is unchanged; the WORD is now
    // what the caller can prove, and the next test keeps the door's strength.
    expect(reading!.fidelity).toBe(MARKET_FIDELITIES.INDICATIVE);
  });

  it("CONNECTED ≠ EXECUTABLE — a fresh certified quote reads INDICATIVE unless the caller owns execution", () => {
    // The /charts plaque before 2026-09-26: BTC on a fresh continuous tape
    // printed EXECUTABLE while no execution adapter owned the canvas.
    for (const execution of [null, NO_OWNER]) {
      const reading = readCanvasHonesty({
        badge: LIVE_CERTIFIED, capturedAtMs: CAPTURED_AT, observedAtMs: CAPTURED_AT, execution,
      });
      expect(reading!.fidelity, JSON.stringify(execution)).toBe(MARKET_FIDELITIES.INDICATIVE);
      expect(reading!.fidelity).not.toBe(MARKET_FIDELITIES.EXECUTABLE);
    }
    // The ownership receipt is THREADED, not dropped: a caller that truly owns
    // execution still reaches the word, so the door is not merely welded shut.
    const owned = readCanvasHonesty({
      badge: LIVE_CERTIFIED, capturedAtMs: CAPTURED_AT, observedAtMs: CAPTURED_AT,
      execution: { adapterOwnsCanvasPrice: true },
    });
    expect(owned!.fidelity).toBe(MARKET_FIDELITIES.EXECUTABLE);
  });

  it("ChartsDashboard states what /charts knows about execution: nothing owns it", () => {
    // Source breadcrumb for the one caller. tsc forces the field to exist; this
    // pins its VALUE, because `adapterOwnsCanvasPrice: true` would type-check
    // and put EXECUTABLE straight back on the plaque.
    const dash = readFileSync(
      resolve(__dirname, "../../components/chart/ChartsDashboard.tsx"),
      "utf8",
    );
    expect(dash).toContain("execution: { adapterOwnsCanvasPrice: false },");
    expect(dash).not.toMatch(/adapterOwnsCanvasPrice:\s*true/);
  });

  it("REFUSES when the house holds no accept-site stamp at all", () => {
    expect(
      readCanvasHonesty({ badge: BARS_VERIFIED, capturedAtMs: null, observedAtMs: null, execution: NO_OWNER }),
    ).toBeNull();
    expect(
      readCanvasHonesty({ badge: BARS_VERIFIED, capturedAtMs: undefined, observedAtMs: undefined, execution: NO_OWNER }),
    ).toBeNull();
  });

  it("REFUSES a present-but-unusable stamp instead of passing it onward", () => {
    // `??` would hand 0 and NaN through as if they were observations. They are
    // not moments; they are the absence of one wearing a number's clothes.
    for (const bad of [0, Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      expect(
        readCanvasHonesty({ badge: BARS_VERIFIED, capturedAtMs: bad, observedAtMs: null, execution: NO_OWNER }),
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
          execution: NO_OWNER,
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

describe("readCanvasHonesty — the IEX relay's DEGRADED names its reason", () => {
  // Built by the REAL badge owner, so a change to the alpaca arm reaches here.
  const iex = priceSourceBadge("alpaca", true, true, { present: true, fresh: true });
  const yahoo = priceSourceBadge("yahoo", true, true, { present: true, fresh: true });

  it("alpaca (IEX only) → DEGRADED with PARTIAL_TAPE, never 'No reason recorded'", () => {
    expect(iex.label).toBe(CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED);
    const reading = readCanvasHonesty({ badge: iex, capturedAtMs: CAPTURED_AT, observedAtMs: null, execution: NO_OWNER });
    expect(reading?.fidelity).toBe(MARKET_FIDELITIES.DEGRADED);
    expect(reading?.reasons).toEqual([FIDELITY_REASONS.PARTIAL_TAPE]);
  });

  it("a delayed consolidated quote is ALSO ACTIVE DEGRADED and is NOT a partial tape", () => {
    expect(yahoo.label).toBe(CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED);
    const reading = readCanvasHonesty({ badge: yahoo, capturedAtMs: CAPTURED_AT, observedAtMs: null, execution: NO_OWNER });
    expect(reading?.reasons).not.toContain(FIDELITY_REASONS.PARTIAL_TAPE);
  });
});
