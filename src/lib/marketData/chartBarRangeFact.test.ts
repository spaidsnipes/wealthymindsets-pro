import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chartBarRangeFact } from "./chartBarRangeFact";

function codeOf(rel: string): string {
  return readFileSync(join(process.cwd(), "src", rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** The exact bar read out of the live DOM on 2026-09-17, NQ1! 30m. */
const EMPTY = { open: 29693.25, high: 29693.25, low: 29693.25, close: 29693.25, volume: 0 };

describe("chartBarRangeFact — three cells may not assert a range the record denies", () => {
  it("× THE MEASUREMENT OVER AN EMPTY RECORD: no volume and no range draws no O/H/L", () => {
    const f = chartBarRangeFact(EMPTY, "30m");
    expect(f.kind).toBe("NO_RECORD");
    expect(f.measured).toBe(false);
    expect(f.text).toBe("NO RANGE RECORDED");
    expect(f.title).toContain("30m");
  });

  it("× THE OVERCLAIM IN THE OTHER COAT: it speaks about the RECORD, not the market", () => {
    // Some feeds never report volume. Claiming "no trades happened" would be
    // the same defect wearing the other coat.
    const f = chartBarRangeFact(EMPTY, "30m");
    expect(f.title).toMatch(/record/i);
    expect(f.title).toMatch(/not about\s+the market/i);
    expect(f.text).not.toMatch(/no trades/i);
  });

  it("× THE VOLUMELESS FEED PUNISHED: a bar that MOVED keeps its high and low", () => {
    // Zero volume + real range = a feed that does not report volume. Its
    // extremes are genuine measurements and must not be erased.
    const moved = { ...EMPTY, high: 29710, low: 29680, close: 29705 };
    expect(chartBarRangeFact(moved, "30m").kind).toBe("RANGE");
    expect(chartBarRangeFact(moved, "30m").measured).toBe(true);
  });

  it("a single traded contract is enough to make the extremes real", () => {
    expect(chartBarRangeFact({ ...EMPTY, volume: 1 }, "30m").kind).toBe("RANGE");
  });

  it("missing or non-finite numbers are NOT proof — the cells are left alone", () => {
    for (const bad of [
      null,
      undefined,
      {},
      { ...EMPTY, volume: undefined },
      { ...EMPTY, high: Number.NaN },
      { ...EMPTY, low: "29693.25" },
    ]) {
      expect(chartBarRangeFact(bad as never, "30m").kind).toBe("RANGE");
    }
  });

  it("a blank timeframe degrades the wording, never the verdict", () => {
    const f = chartBarRangeFact(EMPTY, "  ");
    expect(f.kind).toBe("NO_RECORD");
    expect(f.title).toContain("current bar");
  });
});

describe("chart OHLCV strip adoption", () => {
  const CODE = codeOf("components/chart/MainChart.tsx");

  it("× THE UNCONSULTED OWNER: the strip compiles through chartBarRangeFact", () => {
    expect(CODE).toContain("chartBarRangeFact(last, timeframe)");
  });

  it("the O/H/L cells are gated on the owner's verdict, not drawn unconditionally", () => {
    const at = CODE.indexOf("chartBarRangeFact(last, timeframe)");
    expect(at).toBeGreaterThan(-1);
    const strip = CODE.slice(at, CODE.indexOf("V <span", at));
    expect(strip, "the high/low cells draw whether or not the record supports them")
      .toContain("rangeFact.measured ?");
    expect(strip).toContain("rangeFact.text");
    expect(strip, "the replacement cell must declare which verdict produced it")
      .toContain("data-bar-range-kind={rangeFact.kind}");
  });

  it("the NOW/C value is never suppressed — an overclaim may not become a blindness", () => {
    const at = CODE.indexOf("chartBarRangeFact(last, timeframe)");
    const strip = CODE.slice(at, CODE.indexOf("V <span", at));
    /**
     * The graded word used to be read straight off `closeWord.label`. It now
     * arrives as `stripScope.close.label`, because the strip composes
     * `dataWindowBarScope` so that it and the Data Window are scoped by ONE
     * owner and cannot disagree about which bar they describe.
     *
     * That is a change of ROUTE, not of authority: `dataWindowBarScope.close`
     * is itself `selectChartCloseLabel`'s output, so C-vs-NOW still has
     * exactly one decider. This assertion accepts either spelling on purpose
     * — what §35 protects is that the WORD and the VALUE both still render,
     * not which variable carries them.
     */
    expect(strip, "the graded close word is no longer rendered at all")
      .toMatch(/(?:closeWord|stripScope\.close)\.label/);
    expect(strip).toContain("last.close.toFixed(dp)");
  });
});
