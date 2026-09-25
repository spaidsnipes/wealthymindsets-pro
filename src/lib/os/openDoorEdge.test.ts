/**
 * The door-edge channel and the one pure rule every band applies to it.
 *
 * No jsdom here (see equipmentChannel.test.ts): `document` only needs to be an
 * event bus, and Node's EventTarget IS one — a real implementation of the one
 * capability the module uses, not a mock that agrees with it.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  announceOpenDoorEdge,
  doorInsetFor,
  openDoorEdge,
  subscribeOpenDoorEdge,
} from "./openDoorEdge";

const g = globalThis as unknown as { document?: unknown };
const originalDocument = g.document;

beforeEach(() => {
  g.document = new EventTarget();
  announceOpenDoorEdge(null);
});
afterEach(() => {
  announceOpenDoorEdge(null);
  g.document = originalDocument;
});

describe("doorInsetFor — how far a band steps to clear the open door", () => {
  it("no door open → no inset", () => {
    expect(doorInsetFor(null, 0, 1200)).toBe(0);
  });

  it("the measured case: a 264px door over a pane that starts at x=49 → 215px", () => {
    // The orchestrator's 1905px reading: the sheet covered the chart's left
    // ~215px. The headline must start past exactly that, not past 264.
    expect(doorInsetFor(264, 49, 1500)).toBe(215);
  });

  it("a pane the door does not reach is never pushed (split layout, right pane)", () => {
    expect(doorInsetFor(264, 960, 900)).toBe(0);
    expect(doorInsetFor(264, 264, 900)).toBe(0);
  });

  it("rounds the overlap UP so the first glyph never shares the door's border column", () => {
    expect(doorInsetFor(264.2, 49, 1500)).toBe(216);
  });

  it("a door covering the WHOLE pane gets no inset — there is nowhere visible to step to", () => {
    // Phone: the sheet is full-width. An inset wider than the host would give
    // the band a negative width.
    expect(doorInsetFor(390, 0, 390)).toBe(0);
    expect(doorInsetFor(500, 0, 390)).toBe(0);
  });

  it("garbage in → 0, never NaN into a style", () => {
    expect(doorInsetFor(Number.NaN, 0, 100)).toBe(0);
    expect(doorInsetFor(100, Number.NaN, 100)).toBe(0);
    expect(doorInsetFor(100, 0, 0)).toBe(0);
  });
});

describe("the channel — the frame announces, bands are told", () => {
  it("delivers the edge, keeps it for late mounters, and clears on null", () => {
    const seen: (number | null)[] = [];
    const off = subscribeOpenDoorEdge((x) => seen.push(x));
    announceOpenDoorEdge(264);
    expect(openDoorEdge()).toBe(264);
    announceOpenDoorEdge(null);
    expect(openDoorEdge()).toBeNull();
    off();
    announceOpenDoorEdge(300);
    expect(seen).toEqual([264, null]);
  });

  it("a non-positive or non-finite edge is 'no door', not a door at x=0", () => {
    announceOpenDoorEdge(0);
    expect(openDoorEdge()).toBeNull();
    announceOpenDoorEdge(Number.POSITIVE_INFINITY);
    expect(openDoorEdge()).toBeNull();
  });

  it("normalises at the door: a foreign dispatch with junk detail reads as null", () => {
    const seen: (number | null)[] = [];
    const off = subscribeOpenDoorEdge((x) => seen.push(x));
    (g.document as EventTarget).dispatchEvent(new CustomEvent("wm:open-door-edge", { detail: "264" }));
    off();
    expect(seen).toEqual([null]);
  });
});
