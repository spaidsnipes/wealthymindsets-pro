/**
 * GP12 §27 — DISPLAY precision reads the instrument first (2026-09-26).
 *
 * MEASURED ON SERVING 2026-09-26 05:01 CDT, /charts?symbol=EURUSD&tf=15m: the
 * axis and legend read "1.139212". The wire carried float32 rates
 * (1.1393414735794067 — copied below from /api/yahoo?sym=EURUSD&type=candles
 * the same morning); seven significant figures leave six decimals and the grid
 * detector — correctly — found them exact. The market quotes five.
 */
import { describe, expect, it } from "vitest";
import { displayPrecisionFor, displayPrecisionReading, pricePrecisionFromBars } from "./pricePrecision";
import { CONTRACT_TICK_SIZES } from "@/lib/marketData/contractEconomics";

const bars = (prices: number[]) => prices.map(p => ({ open: p, high: p, low: p, close: p }));

/** The EURUSD 15m wire, as served: float32 FX rates with no venue grid. */
const EURUSD_WIRE = bars([1.1393414735794067, 1.1394712924957275, 1.1392117738723755, 1.1390820741653442, 1.139211773872375]);
/** USDJPY on the same kind of feed. */
const USDJPY_WIRE = bars([149.8350067138672, 149.8419952392578, 149.8280029296875, 149.8509979248047]);
/** Spot gold / silver as a computed float feed would carry them. */
const XAU_WIRE = bars([3745.123046875, 3745.6201171875, 3744.8798828125]);
const XAG_WIRE = bars([44.51234817504883, 44.5211181640625, 44.49871826171875]);

describe("displayPrecisionFor — the table", () => {
  it("EURUSD reads 5 from a noisy float feed (the grid detector alone says 6)", () => {
    expect(pricePrecisionFromBars(EURUSD_WIRE)).toBe(6); // the defect, proved on the same bars
    expect(displayPrecisionFor("EURUSD", EURUSD_WIRE)).toBe(5);
    expect(displayPrecisionReading("EURUSD", EURUSD_WIRE).basis).toBe("FX_PIPETTE");
    // Every notation of the pair lands on the same answer.
    for (const s of ["EUR/USD", "EURUSD=X", "eurusd", "GBPUSD", "AUDCAD", "USDMXN"]) expect(displayPrecisionFor(s, EURUSD_WIRE), s).toBe(5);
  });

  it("JPY-quoted pairs read 3", () => {
    expect(displayPrecisionFor("USDJPY", USDJPY_WIRE)).toBe(3);
    expect(displayPrecisionFor("GBP/JPY", USDJPY_WIRE)).toBe(3);
    expect(displayPrecisionReading("USDJPY", USDJPY_WIRE).basis).toBe("FX_JPY_PIPETTE");
  });

  it("spot metals quote their own convention: XAUUSD 2, XAGUSD 3", () => {
    expect(displayPrecisionFor("XAUUSD", XAU_WIRE)).toBe(2);
    expect(displayPrecisionFor("XAU/USD", XAU_WIRE)).toBe(2);
    expect(displayPrecisionFor("XAGUSD", XAG_WIRE)).toBe(3);
    expect(displayPrecisionReading("XAUUSD", XAU_WIRE).basis).toBe("SPOT_METAL");
  });

  it("the answer does not wait for bars when the class is known", () => {
    expect(displayPrecisionFor("EURUSD", [])).toBe(5);
    expect(displayPrecisionFor("USDJPY", [])).toBe(3);
    expect(displayPrecisionFor("CL1!", [])).toBe(2);
  });

  it("futures read the contract's tick: ES1! 2, CL1! 2, NQ=F 2, SI1! 3, 6E1! 5, GC1! 2", () => {
    // A float32 feed would put CL at 91.7300033569336 — the tick says 2 regardless.
    expect(displayPrecisionFor("ES1!", bars([6612.25, 6612.5, 6611.75]))).toBe(2);
    expect(displayPrecisionFor("CL1!", bars([91.7300033569336, 91.7699966430664]))).toBe(2);
    expect(displayPrecisionFor("NQ=F", bars([24610.25]))).toBe(2);
    expect(displayPrecisionFor("/ES", bars([6612.25]))).toBe(2);
    // GC's 0.1 tick is one decimal; the product's two-decimal floor holds.
    expect(displayPrecisionFor("GC1!", bars([3765.1]))).toBe(2);
    // A root with no published spec on file reads the bars' own grid.
    const si = bars([44.515, 44.52, 44.505]);
    expect(displayPrecisionFor("SI1!", si)).toBe(pricePrecisionFromBars(si));
    expect(displayPrecisionReading("SI1!", si).basis).toBe("BAR_GRID");
    expect(displayPrecisionReading("ES1!", []).basis).toBe("FUTURES_TICK");
  });

  it("ZN1!'s 1/64ths are not a decimal tick — the bar-grid detector answers", () => {
    const zn = bars([112.015625, 112.03125, 112.046875, 112.0625]);
    expect(CONTRACT_TICK_SIZES["ZN1!"]).toBeUndefined();
    expect(displayPrecisionFor("ZN1!", zn)).toBe(pricePrecisionFromBars(zn));
    expect(displayPrecisionReading("ZN1!", zn).basis).toBe("BAR_GRID");
  });

  it("equities at and above $1 read cents, midpoint prints or not", () => {
    const tsla = bars([373.805, 373.81, 373.8, 374.005]);
    expect(displayPrecisionFor("TSLA", tsla)).toBe(2);
    expect(displayPrecisionReading("TSLA", tsla).basis).toBe("EQUITY_CENTS");
    // A sub-dollar stock quotes sub-pennies: the grid answers.
    const penny = bars([0.4123, 0.4131, 0.4119]);
    expect(displayPrecisionFor("SNDL", penny)).toBe(pricePrecisionFromBars(penny));
  });

  it("crypto keeps the grid detector unchanged", () => {
    const btc = bars([101234.56, 101234.57, 101240.12]);
    expect(displayPrecisionFor("BTCUSD", btc)).toBe(pricePrecisionFromBars(btc));
    expect(displayPrecisionReading("BTC/USD", btc).basis).toBe("BAR_GRID");
    const shib = bars([0.00001234, 0.00001241, 0.00001229]);
    expect(displayPrecisionFor("SHIBUSD", shib)).toBe(8);
  });

  it("an unknown symbol keeps the grid detector unchanged", () => {
    const b = bars([12.3456, 12.3461]);
    expect(displayPrecisionFor("WEIRD.SYM-9", b)).toBe(pricePrecisionFromBars(b));
    expect(displayPrecisionReading("", b).basis).toBe("BAR_GRID");
    // An unlisted futures root has no tick row: grid.
    expect(displayPrecisionReading("KE1!", b).basis).toBe("BAR_GRID");
  });
});

describe("futures ticks come from the one tick owner", () => {
  it("every notation of a priced contract reads the same tick", () => {
    for (const n of ["ES1!", "ES=F", "/ES"]) expect(displayPrecisionReading(n, []).basis, n).toBe("FUTURES_TICK");
    expect(displayPrecisionReading("MES1!", [])).toEqual(displayPrecisionReading("MES1!", []));
  });
});
