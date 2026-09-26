/**
 * CERTIFICATE SYMBOL CONTAMINATION SMOKE — Garden 16 §20.
 *
 * Frozen certificate (2026-09-26): A TSLA · B ES1! · C GC1!.
 * Journey: TSLA → ES1! → GC1! → TSLA.
 *
 * What this proves, and what it does not: every OWNER the chart asks on a
 * symbol switch — asset class, futures root, session clock, contract
 * economics (tick, point value, $ risk), price precision, and the one chart
 * selection — answers each leg exactly as it answers that symbol cold, and
 * TSLA at the end is byte-identical to TSLA at the start. No owner remembers
 * the previous instrument. It is a pure-function smoke, not a browser proof:
 * the canvas side is pinned by riskRailStatesMoney.sentinel (the draw effect
 * re-runs on `symbol`; drawings reload per symbol).
 */
import { describe, expect, it } from "vitest";
import { classifySymbol, futuresRootOf } from "./symbolAssetClass";
import { sessionWindowFor } from "./sessionWindow";
import { instrumentEconomics, selectRiskEconomics } from "./contractEconomics";
import { pricePrecisionFromBars } from "@/lib/chart/pricePrecision";
import {
  CHART_SELECTION_AT_REST,
  selectChartSelection,
  type ChartSelectionState,
} from "./viewModels/chartSelection";

/** Each instrument's own quoting grid and a 5-point stop at a realistic price. */
const LEG = {
  TSLA: { entry: 380.12, step: 0.01 },
  "ES1!": { entry: 6512.25, step: 0.25 },
  "GC1!": { entry: 2650.3, step: 0.1 },
} as const;
type Sym = keyof typeof LEG;

function barsFor(sym: Sym) {
  const { entry, step } = LEG[sym];
  return Array.from({ length: 60 }, (_, i) => {
    const o = Number((entry + (i % 7) * step).toFixed(4));
    return { open: o, high: Number((o + 3 * step).toFixed(4)), low: Number((o - 2 * step).toFixed(4)), close: Number((o + step).toFixed(4)) };
  });
}

function fingerprint(sym: Sym) {
  const { entry } = LEG[sym];
  const plan = { entry, stop: Number((entry - 5).toFixed(4)), target: Number((entry + 12).toFixed(4)) };
  const session = sessionWindowFor(sym, "15m", false);
  return {
    assetClass: classifySymbol(sym),
    root: futuresRootOf(sym),
    sessionKind: session.kind,
    sessionLabel: session.label,
    economics: instrumentEconomics(sym, entry),
    risk: selectRiskEconomics(sym, plan),
    precision: pricePrecisionFromBars(barsFor(sym)),
  };
}

describe("certificate journey TSLA → ES1! → GC1! → TSLA", () => {
  const journey: Sym[] = ["TSLA", "ES1!", "GC1!", "TSLA"];

  it("every leg answers exactly as that symbol does cold", () => {
    const walked = journey.map(fingerprint);
    // COLD means no certificate instrument came before it: each reference is
    // taken right after an unrelated instrument, so a reference cannot share
    // the journey's carryover and agree with it by accident.
    const cold = (sym: Sym) => {
      instrumentEconomics("EURUSD", 1.14);
      sessionWindowFor("BTC-USD", "15m", false);
      return fingerprint(sym);
    };
    journey.forEach((sym, i) => expect(walked[i], `${sym} leg ${i}`).toEqual(cold(sym)));
  });

  it("TSLA at the end is TSLA at the start", () => {
    const walked = journey.map(fingerprint);
    expect(walked[3]).toEqual(walked[0]);
  });

  it("the three instruments do not share money, tick, unit or clock", () => {
    const [a, b, c] = (["TSLA", "ES1!", "GC1!"] as Sym[]).map(fingerprint);
    expect([a.assetClass, b.assetClass, c.assetClass]).toEqual(["EQUITY", "FUTURES", "FUTURES"]);
    expect([a.root, b.root, c.root]).toEqual([null, "ES", "GC"]);
    expect(a.sessionKind).toBe("US_EQUITY_RTH");
    expect([b.sessionKind, c.sessionKind]).toEqual(["GLOBEX_DAY", "GLOBEX_DAY"]);
    const priced = (f: ReturnType<typeof fingerprint>) => (f.economics.status === "PRICED" ? f.economics : null);
    expect([priced(a)?.unit, priced(b)?.unit, priced(c)?.unit]).toEqual(["share", "contract", "contract"]);
    expect([priced(a)?.pointValue, priced(b)?.pointValue, priced(c)?.pointValue]).toEqual([1, 50, 100]);
    expect([priced(a)?.tickSize, priced(b)?.tickSize, priced(c)?.tickSize]).toEqual([0.01, 0.25, 0.1]);
    // The same 5-point stop is three different amounts of money.
    expect([a.risk.receipt, b.risk.receipt, c.risk.receipt]).toEqual([
      "PRICED:TSLA:tick=0.01:pv=1:ticks=500:risk=5.00:reward=12.00:share",
      "PRICED:ES:tick=0.25:pv=50:ticks=20:risk=250.00:reward=600.00:contract",
      "PRICED:GC:tick=0.1:pv=100:ticks=50:risk=500.00:reward=1200.00:contract",
    ]);
  });

  it("a selection made on TSLA does not survive onto ES1!, GC1!, or a later TSLA timeframe", () => {
    let s: ChartSelectionState = selectChartSelection(CHART_SELECTION_AT_REST, {
      type: "select",
      selection: { kind: "SLICE", symbol: "TSLA", timeframe: "15m", price: 380.12 },
    });
    expect(s.selection?.kind).toBe("SLICE");
    s = selectChartSelection(s, { type: "reconcile", symbol: "ES1!", timeframe: "15m", compiledObjectIds: [], savedObjectId: null });
    expect(s.selection).toBeNull();
    s = selectChartSelection(s, { type: "reconcile", symbol: "GC1!", timeframe: "15m", compiledObjectIds: [], savedObjectId: null });
    expect(s.selection).toBeNull();
    s = selectChartSelection(s, { type: "reconcile", symbol: "TSLA", timeframe: "1h", compiledObjectIds: [], savedObjectId: null });
    expect(s.selection).toBeNull();
  });
});
