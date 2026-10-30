/**
 * ONE OWNER FOR THE REFERENCE CLOSE (2026-10-25) — the rules in dayReferenceClose.ts.
 * Measured case: BTC 5m, 2026-10-24, the change cell re-anchored 81079.63 →
 * 81176.61 between two polls (a rolling 24 h vendor basis re-seeded per poll).
 */
import { describe, expect, it } from "vitest";
import {
  adoptReferenceClose,
  changeFromReference,
  tapeOutranksQuote,
  TAPE_OUTRANKS_QUOTE_MS,
  VENDOR_REFERENCE_HOLD_MS,
  type HeldReference,
} from "./dayReferenceClose";

const T0 = 1_761_350_000_000;

describe("adoptReferenceClose", () => {
  it("the first real offer is held; non-finite or ≤ 0 is never a reference", () => {
    expect(adoptReferenceClose(null, { value: NaN, rank: "VENDOR", atMs: T0 })).toBeNull();
    expect(adoptReferenceClose(null, { value: 0, rank: "EXCHANGE", atMs: T0 })).toBeNull();
    expect(adoptReferenceClose(null, { value: 81079.63, rank: "VENDOR", atMs: T0 }))
      .toEqual({ value: 81079.63, rank: "VENDOR", adoptedAtMs: T0 });
  });

  it("a rolling vendor basis does not re-anchor on the next poll (the measured flicker)", () => {
    const held = adoptReferenceClose(null, { value: 81079.63, rank: "VENDOR", atMs: T0 });
    const next = adoptReferenceClose(held, { value: 81176.61, rank: "VENDOR", atMs: T0 + 2_000 });
    expect(next).toBe(held);
    const later = adoptReferenceClose(held, { value: 81176.61, rank: "VENDOR", atMs: T0 + VENDOR_REFERENCE_HOLD_MS });
    expect(later?.value).toBe(81176.61);
  });

  it("EXCHANGE outranks VENDOR and is never replaced by it; a newer EXCHANGE offer is a day roll", () => {
    const vendor = adoptReferenceClose(null, { value: 100, rank: "VENDOR", atMs: T0 });
    const exch = adoptReferenceClose(vendor, { value: 101, rank: "EXCHANGE", atMs: T0 + 1 }) as HeldReference;
    expect(exch).toEqual({ value: 101, rank: "EXCHANGE", adoptedAtMs: T0 + 1 });
    expect(adoptReferenceClose(exch, { value: 99, rank: "VENDOR", atMs: T0 + 10 * VENDOR_REFERENCE_HOLD_MS })).toBe(exch);
    expect(adoptReferenceClose(exch, { value: 101, rank: "EXCHANGE", atMs: T0 + 5 })).toBe(exch);
    expect(adoptReferenceClose(exch, { value: 102, rank: "EXCHANGE", atMs: T0 + 5 })?.value).toBe(102);
  });
});

describe("changeFromReference", () => {
  it("measures from the held reference, or says nothing", () => {
    expect(changeFromReference(80739.71, null)).toBeNull();
    expect(changeFromReference(NaN, { value: 81079.63, rank: "VENDOR", adoptedAtMs: T0 })).toBeNull();
    expect(changeFromReference(80739.71, { value: 81079.63, rank: "VENDOR", adoptedAtMs: T0 }))
      .toEqual({ change: -339.92, changePct: -0.42 });
  });
});

describe("tapeOutranksQuote", () => {
  it("only while a print is recent", () => {
    expect(tapeOutranksQuote(null, T0)).toBe(false);
    expect(tapeOutranksQuote(T0, T0 + 1_000)).toBe(true);
    expect(tapeOutranksQuote(T0, T0 + TAPE_OUTRANKS_QUOTE_MS)).toBe(false);
  });
});
