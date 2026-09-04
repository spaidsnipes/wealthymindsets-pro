import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

// Execute the actual callback, not a second implementation. State setters are
// deliberately deferred to reproduce two calls before React commits/effects.
function harness(actionable = true) {
  const page = readFileSync(resolve(__dirname, "../app/paper/page.tsx"), "utf8");
  const start = page.indexOf("const closeOption = useCallback");
  const end = page.indexOf("const cancelOrder", start);
  if (start < 0 || end < start) throw new Error("close handler not found");
  const js = ts.transpileModule(page.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const original = { id: "option-1", underlying: "TSLA", strike: 350, type: "call", qty: 2, entryPrem: 1 };
  const ref = { current: [original] };
  const cash = vi.fn();
  const trades = vi.fn();
  const positions = vi.fn();
  const earn = vi.fn();
  const close = new Function("useCallback", "optionPositionsRef", "actionablePaperQuotePrice", "quoteReadiness", "modelBand", "OPT_MULTIPLIER", "setOptionPositions", "setCash", "setTrades", "earnWMS", "uid", `${js}; return closeOption;`)(
    (callback: unknown) => callback, ref, () => actionable ? 350 : null, {},
    (premium: number) => ({ bid: premium, ask: premium }), 100,
    positions, cash, trades, earn, () => "trade-1",
  ) as (id: string, premium: number) => void;
  return { close, ref, cash, trades, positions, earn, original };
}

describe("paper option close replay before state commit", () => {
  it("credits one close once when the same id is invoked twice", () => {
    const h = harness();
    h.close("option-1", 2);
    h.close("option-1", 2);
    expect(h.cash).toHaveBeenCalledTimes(1);
    expect(h.cash.mock.calls[0][0](1000)).toBe(1400);
    expect(h.trades).toHaveBeenCalledTimes(1);
    expect(h.earn).toHaveBeenCalledTimes(1);
    expect(h.positions).toHaveBeenCalledTimes(1);
  });

  it("does not consume the id when the quote is not actionable", () => {
    const h = harness(false);
    h.close("option-1", 2);
    expect(h.ref.current).toEqual([h.original]);
    expect(h.cash).not.toHaveBeenCalled();
  });

  it("does not consume the id on invalid premium", () => {
    const h = harness();
    h.close("option-1", NaN);
    expect(h.ref.current).toEqual([h.original]);
    expect(h.cash).not.toHaveBeenCalled();
  });
});
