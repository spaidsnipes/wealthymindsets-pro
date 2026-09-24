/**
 * THE SEMANTIC-ZOOM COMPILER'S LAWS.
 */

import { describe, expect, it } from "vitest";

import selectSemanticZoom, { NEAR_MAX, FAR_MIN } from "./selectSemanticZoom";

describe("H1 — never looked is not looked and found nothing", () => {
  it("null visibleBarCount is UNMEASURED, not NEAR", () => {
    // The forbidden failure: default a missing measurement to a resolution.
    // A tag on guessed data is a claim the caller never made.
    const v = selectSemanticZoom({ visibleBarCount: null });
    expect(v.state).toBe("UNMEASURED");
    expect(v.tag).toBeNull();
    expect(v.reason).toBe("NO_VISIBLE_RANGE");
  });

  it("undefined visibleBarCount is UNMEASURED", () => {
    const v = selectSemanticZoom({});
    expect(v.state).toBe("UNMEASURED");
    expect(v.reason).toBe("NO_VISIBLE_RANGE");
  });

  it("non-finite (Infinity, NaN) is UNMEASURED with a distinct reason", () => {
    expect(selectSemanticZoom({ visibleBarCount: Infinity }).reason)
      .toBe("VISIBLE_RANGE_NOT_FINITE");
    expect(selectSemanticZoom({ visibleBarCount: NaN }).reason)
      .toBe("VISIBLE_RANGE_NOT_FINITE");
  });

  it("zero bars in view is a real finding, not a resolution", () => {
    // Calling zero bars NEAR would say "you are reading candle anatomy" of
    // nothing. It is UNMEASURED with its own truthful reason.
    const v = selectSemanticZoom({ visibleBarCount: 0 });
    expect(v.state).toBe("UNMEASURED");
    expect(v.reason).toBe("NO_BARS_IN_VIEW");
    expect(v.visibleBarCount).toBe(0);
  });
});

describe("the three resolutions, named by count", () => {
  it("NEAR at and below the NEAR_MAX boundary", () => {
    expect(selectSemanticZoom({ visibleBarCount: 1 }).tag).toBe("NEAR");
    expect(selectSemanticZoom({ visibleBarCount: NEAR_MAX }).tag).toBe("NEAR");
  });

  it("MID between NEAR_MAX and FAR_MIN, both exclusive of the boundaries", () => {
    expect(selectSemanticZoom({ visibleBarCount: NEAR_MAX + 1 }).tag).toBe("MID");
    expect(selectSemanticZoom({ visibleBarCount: FAR_MIN - 1 }).tag).toBe("MID");
    expect(selectSemanticZoom({ visibleBarCount: 100 }).tag).toBe("MID");
  });

  it("FAR at and above the FAR_MIN boundary", () => {
    expect(selectSemanticZoom({ visibleBarCount: FAR_MIN }).tag).toBe("FAR");
    expect(selectSemanticZoom({ visibleBarCount: 5000 }).tag).toBe("FAR");
  });

  it("carries the note in the canon's own words for each tag", () => {
    expect(selectSemanticZoom({ visibleBarCount: 5 }).note)
      .toBe("tape / candle anatomy / micro response");
    expect(selectSemanticZoom({ visibleBarCount: 100 }).note)
      .toBe("zones / profiles / active objects");
    expect(selectSemanticZoom({ visibleBarCount: 500 }).note)
      .toBe("regime / envelope / major structure");
  });

  it("snaps fractional counts to the floor, so a fresh zoom does not flicker", () => {
    expect(selectSemanticZoom({ visibleBarCount: 30.9 }).tag).toBe("NEAR");
    expect(selectSemanticZoom({ visibleBarCount: 299.9 }).tag).toBe("MID");
  });
});

describe("the tag and the state agree in every case", () => {
  it("a non-null tag means state !== UNMEASURED, and vice versa", () => {
    for (const n of [null, 0, NaN, 5, 100, 500]) {
      const v = selectSemanticZoom({ visibleBarCount: n as number | null });
      if (v.state === "UNMEASURED") {
        expect(v.tag).toBeNull();
        expect(v.note).toBeNull();
        expect(v.reason).not.toBeNull();
      } else {
        expect(v.tag).not.toBeNull();
        expect(v.note).not.toBeNull();
        expect(v.reason).toBeNull();
      }
    }
  });

  it("publishes the count that decided it for an outside probe", () => {
    expect(selectSemanticZoom({ visibleBarCount: 42 }).visibleBarCount).toBe(42);
  });
});

describe("the module ships no permission and no source-resolution field", () => {
  it("exports nothing that reads as a data-resolution or route claim", async () => {
    const mod = await import("./selectSemanticZoom");
    for (const key of Object.keys(mod as Record<string, unknown>)) {
      expect(key, key).not.toMatch(/timeframe|route|href|canProceed|signal|entry/i);
    }
  });

  it("emits no timeframe, no href, no route", () => {
    const v = selectSemanticZoom({ visibleBarCount: 100 });
    const keys = Object.keys(v).sort();
    expect(keys).toEqual(["note", "reason", "state", "tag", "version", "visibleBarCount"]);
  });
});
