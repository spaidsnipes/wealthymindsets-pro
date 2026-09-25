import { describe, expect, it } from "vitest";

import type { SelectedBigTrade } from "@/lib/bigTradeLevels";
import {
  CHART_SELECTION_AT_REST,
  releasesObject,
  selectChartSelection as reduce,
  selectedObjectIdOf,
  selectedPrintOf,
  selectedSliceOf,
  type ChartSelectionAction,
  type ChartSelectionState,
} from "./chartSelection";

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
