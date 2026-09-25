import { describe, expect, it } from "vitest";

import type { SelectedBigTrade } from "@/lib/bigTradeLevels";
import {
  CHART_SELECTION_AT_REST,
  releasesObject,
  selectChartSelection as reduce,
  selectedAnatomyOf,
  selectedObjectIdOf,
  selectedPrintOf,
  selectedSliceOf,
  type ChartSelectionAction,
  type ChartSelectionState,
  type SelectedAnatomy,
} from "./chartSelection";
import type { AnatomyInspectVM, AnatomyResolution } from "./anatomySelection";

const print = (over: Partial<SelectedBigTrade> = {}): SelectedBigTrade => ({
  priceLevel: 101.25, bid: 0, ask: 5000, total: 5000, printKey: "T-1",
  symbol: "AAPL", timeframe: "5m", barTime: 1_700_000_000, kind: "big-trade",
  ...over,
} as SelectedBigTrade);

const run = (...actions: ChartSelectionAction[]): ChartSelectionState =>
  actions.reduce(reduce, CHART_SELECTION_AT_REST);

const reconcile = (compiledObjectIds: string[], savedObjectId: string | null = null, symbol = "AAPL", timeframe = "5m"): ChartSelectionAction =>
  ({ type: "reconcile", symbol, timeframe, compiledObjectIds, savedObjectId });

describe("selectChartSelection — one selection at a time", () => {
  it("arrives with nothing selected and Inspect closed", () => {
    expect(CHART_SELECTION_AT_REST).toEqual({ selection: null, inspectOpen: false });
  });

  it("a PRINT after an OBJECT leaves no object selected", () => {
    const s = run(
      { type: "toggleObject", objectId: "ZONE-1" },
      { type: "select", selection: { kind: "PRINT", print: print() } },
    );
    expect(selectedObjectIdOf(s)).toBeNull();
    expect(selectedPrintOf(s)?.printKey).toBe("T-1");
    expect(s.inspectOpen).toBe(true);
  });

  it("a SLICE after an OBJECT leaves no object selected", () => {
    const s = run(
      { type: "select", selection: { kind: "OBJECT", objectId: "ZONE-1" } },
      { type: "select", selection: { kind: "SLICE", symbol: "AAPL", timeframe: "5m", price: 100.1 } },
    );
    expect(selectedObjectIdOf(s)).toBeNull();
    expect(selectedSliceOf(s)?.price).toBe(100.1);
  });

  it("an OBJECT (LEVEL) after a SLICE leaves no slice selected, and opens Inspect", () => {
    const s = run(
      { type: "select", selection: { kind: "SLICE", symbol: "AAPL", timeframe: "5m", price: 100.1 } },
      { type: "closeInspect" },
      { type: "select", selection: { kind: "SLICE", symbol: "AAPL", timeframe: "5m", price: 100.2 } },
      { type: "toggleObject", objectId: "LEVEL-7" },
    );
    expect(selectedSliceOf(s)).toBeNull();
    expect(selectedPrintOf(s)).toBeNull();
    expect(selectedObjectIdOf(s)).toBe("LEVEL-7");
    expect(s.inspectOpen).toBe(true);
  });

  it("closeInspect clears every kind", () => {
    for (const first of [
      { type: "toggleObject", objectId: "LEVEL-7" },
      { type: "select", selection: { kind: "OBJECT", objectId: "ZONE-1" } },
      { type: "select", selection: { kind: "PRINT", print: print() } },
      { type: "select", selection: { kind: "SLICE", symbol: "AAPL", timeframe: "5m", price: 1 } },
    ] as ChartSelectionAction[]) {
      expect(run(first, { type: "closeInspect" })).toEqual(CHART_SELECTION_AT_REST);
    }
  });

  it("the selected object clicked with Inspect closed opens it and stays selected; clicked open, it lets go", () => {
    // A restored selection: selected, Inspect closed.
    const restored = run(reconcile(["ZONE-1"], "ZONE-1"));
    expect(restored).toEqual({ selection: { kind: "OBJECT", objectId: "ZONE-1" }, inspectOpen: false });
    const read = reduce(restored, { type: "toggleObject", objectId: "ZONE-1" });
    expect(read).toEqual({ selection: { kind: "OBJECT", objectId: "ZONE-1" }, inspectOpen: true });
    expect(reduce(read, { type: "toggleObject", objectId: "ZONE-1" })).toEqual(CHART_SELECTION_AT_REST);
  });

  it("a different object replaces the selected one", () => {
    const s = run({ type: "toggleObject", objectId: "ZONE-1" }, { type: "toggleObject", objectId: "LEVEL-7" });
    expect(s).toEqual({ selection: { kind: "OBJECT", objectId: "LEVEL-7" }, inspectOpen: true });
  });

  it("openInspect keeps the selection; clear drops only the kinds named and leaves Inspect as it was", () => {
    const withPrint = run({ type: "select", selection: { kind: "PRINT", print: print() } });
    expect(reduce(withPrint, { type: "openInspect" })).toBe(withPrint);
    expect(reduce(withPrint, { type: "clear", kinds: ["SLICE"] })).toBe(withPrint);
    expect(reduce(withPrint, { type: "clear", kinds: ["PRINT", "SLICE"] })).toEqual({ selection: null, inspectOpen: true });
    expect(reduce(withPrint, { type: "clear" })).toEqual({ selection: null, inspectOpen: true });
  });
});

describe("selectChartSelection — reconcile against the compiled objects", () => {
  it("keeps a selected object that is still compiled, returning the same state", () => {
    const s = run({ type: "toggleObject", objectId: "ZONE-1" });
    expect(reduce(s, reconcile(["ZONE-1", "LEVEL-7"], "LEVEL-7"))).toBe(s);
  });

  it("drops an object that is no longer compiled and never guesses a replacement", () => {
    const s = run({ type: "toggleObject", objectId: "ZONE-1" });
    expect(reduce(s, reconcile(["LEVEL-7"]))).toEqual({ selection: null, inspectOpen: true });
  });

  it("restores the remembered object only when it is compiled, calm (Inspect stays closed)", () => {
    expect(run(reconcile([], "ZONE-1"))).toBe(CHART_SELECTION_AT_REST);
    expect(run(reconcile(["ZONE-1"], "ZONE-1"))).toEqual({ selection: { kind: "OBJECT", objectId: "ZONE-1" }, inspectOpen: false });
  });

  it("a print or slice on this chart outranks the remembered object", () => {
    const withPrint = run({ type: "select", selection: { kind: "PRINT", print: print() } });
    expect(reduce(withPrint, reconcile(["ZONE-1"], "ZONE-1"))).toBe(withPrint);
    const withSlice = run({ type: "select", selection: { kind: "SLICE", symbol: "AAPL", timeframe: "5m", price: 1 } });
    expect(reduce(withSlice, reconcile(["ZONE-1"], "ZONE-1"))).toBe(withSlice);
  });

  it("a print or slice made on another symbol or timeframe is dropped, and this chart's object may return", () => {
    const withPrint = run({ type: "select", selection: { kind: "PRINT", print: print() } });
    expect(reduce(withPrint, reconcile(["ZONE-9"], "ZONE-9", "MSFT", "5m")).selection)
      .toEqual({ kind: "OBJECT", objectId: "ZONE-9" });
    const withSlice = run({ type: "select", selection: { kind: "SLICE", symbol: "AAPL", timeframe: "5m", price: 1 } });
    expect(reduce(withSlice, reconcile([], null, "AAPL", "15m")).selection).toBeNull();
  });
});

describe("releasesObject — when the remembered object may be forgotten", () => {
  const withZone = run({ type: "toggleObject", objectId: "ZONE-1" });

  it("is true for every explicit let-go of the selected object", () => {
    expect(releasesObject(withZone, { type: "closeInspect" })).toBe(true);
    expect(releasesObject(withZone, { type: "toggleObject", objectId: "ZONE-1" })).toBe(true);
    expect(releasesObject(withZone, { type: "select", selection: { kind: "PRINT", print: print() } })).toBe(true);
    expect(releasesObject(withZone, { type: "toggleObject", objectId: "LEVEL-7" })).toBe(true);
  });

  it("is false when the object stays selected, when none was selected, and for a recompile", () => {
    expect(releasesObject(withZone, { type: "openInspect" })).toBe(false);
    expect(releasesObject(run({ type: "select", selection: { kind: "PRINT", print: print() } }), { type: "closeInspect" })).toBe(false);
    // An early compile that has not produced the object yet must not erase the memory.
    expect(releasesObject(withZone, reconcile([]))).toBe(false);
  });
});

describe("selectChartSelection — an ANATOMY object (shelf or mark) is one more kind of the ONE selection", () => {
  const reading = (state: AnatomyResolution, id = "abs:120", to = 240): AnatomyInspectVM => ({
    version: 1, id, target: { reading: "ABSORPTION", startTime: 120, endTime: 180 }, state,
    currentId: state === "SAME" || state === "RESHAPED" ? id : null,
    window: { basis: "VOLUME", bars: 5, from: 0, to, capped: false },
    zone: null, bars: [], push: null, card: null, exhaustionVersion: 1, cardsVersion: 1,
  });
  const shelf = (r = reading("SAME"), over: Partial<SelectedAnatomy> = {}): ChartSelectionAction => ({
    type: "select",
    selection: { kind: "ANATOMY", symbol: "AAPL", timeframe: "5m", wall: "LEFT", reading: r, lastDrawn: null, ...over },
  });

  it("selecting a shelf replaces an OBJECT and opens Inspect; the drawn reading is its lastDrawn", () => {
    const s = run({ type: "toggleObject", objectId: "ZONE-1" }, shelf());
    expect(selectedObjectIdOf(s)).toBeNull();
    expect(selectedAnatomyOf(s)?.reading.id).toBe("abs:120");
    expect(selectedAnatomyOf(s)?.lastDrawn).toEqual(reading("SAME"));
    expect(s.inspectOpen).toBe(true);
    expect(releasesObject(run({ type: "toggleObject", objectId: "ZONE-1" }), shelf())).toBe(true);
  });

  it("a print after a shelf leaves no shelf selected", () => {
    const s = run(shelf(), { type: "select", selection: { kind: "PRINT", print: print() } });
    expect(selectedAnatomyOf(s)).toBeNull();
    expect(selectedPrintOf(s)?.printKey).toBe("T-1");
  });

  it("the glass's re-resolution updates the reading, keeps Inspect as it was, and keeps the last drawn reading", () => {
    const open = run(shelf());
    const moved = reduce(open, { type: "resolveAnatomy", reading: reading("NOT_GRADED_IN_WINDOW", "abs:120", 300) });
    expect(moved.inspectOpen).toBe(true);
    expect(selectedAnatomyOf(moved)?.reading.state).toBe("NOT_GRADED_IN_WINDOW");
    expect(selectedAnatomyOf(moved)?.lastDrawn).toEqual(reading("SAME"));
    const back = reduce(moved, { type: "resolveAnatomy", reading: reading("RESHAPED", "abs:120", 360) });
    expect(selectedAnatomyOf(back)?.lastDrawn?.window.to).toBe(360);
    // Closed Inspect stays closed: the camera moving is not the trader asking.
    const closedRestore = { ...open, inspectOpen: false };
    expect(reduce(closedRestore, { type: "resolveAnatomy", reading: reading("SAME", "abs:120", 300) }).inspectOpen).toBe(false);
  });

  it("a resolution for another object, or with no shelf selected, changes nothing", () => {
    const open = run(shelf());
    expect(reduce(open, { type: "resolveAnatomy", reading: reading("SAME", "abs:999") })).toBe(open);
    const withPrint = run({ type: "select", selection: { kind: "PRINT", print: print() } });
    expect(reduce(withPrint, { type: "resolveAnatomy", reading: reading("SAME") })).toBe(withPrint);
    expect(reduce(CHART_SELECTION_AT_REST, { type: "resolveAnatomy", reading: reading("SAME") })).toBe(CHART_SELECTION_AT_REST);
  });

  it("a selection made while it is not drawn has no last drawn reading", () => {
    expect(selectedAnatomyOf(run(shelf(reading("OUT_OF_VIEW"))))?.lastDrawn).toBeNull();
  });

  it("reconcile keeps it on its own chart and drops it on another; closing Inspect lets go; clear by kind", () => {
    const s = run(shelf());
    expect(reduce(s, reconcile(["ZONE-1"], "ZONE-1"))).toBe(s);
    expect(reduce(s, reconcile([], null, "AAPL", "15m")).selection).toBeNull();
    expect(reduce(s, { type: "closeInspect" })).toEqual(CHART_SELECTION_AT_REST);
    expect(reduce(s, { type: "clear", kinds: ["PRINT"] })).toBe(s);
    expect(reduce(s, { type: "clear", kinds: ["ANATOMY"] })).toEqual({ selection: null, inspectOpen: true });
  });
});
