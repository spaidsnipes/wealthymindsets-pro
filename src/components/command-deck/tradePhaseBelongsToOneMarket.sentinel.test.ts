/**
 * THE TRADE PHASE BELONGS TO ONE MARKET — Garden 16 §11 verifier YELLOW,
 * 2026-09-26. "In Trade" pressed on TSLA kept the chain at "Managing — Trade
 * open" after a switch to ES1!, a market the trader never said they were in.
 * The room's phase now returns to PREPARATION on a symbol change, in render
 * (React's "adjust state when a prop changes" form — no effect lag, so no
 * frame compiles the new market with the old phase). Source read.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SRC = readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");

describe("the room's trade phase is scoped to the symbol", () => {
  it("resets to PREPARATION when the symbol changes, before the one compile reads it", () => {
    const state = SRC.indexOf('const [tradePhase, setTradePhase] = React.useState<TradePhase>("PREPARATION");');
    const reset = SRC.indexOf("if (tradePhaseSymbol !== symbol) {\n    setTradePhaseSymbol(symbol);\n    setTradePhase(\"PREPARATION\");\n  }");
    const compile = SRC.indexOf("const chartCanvasVM = useMarketCanvasVM({");
    expect(state).toBeGreaterThan(-1);
    expect(reset, "the phase no longer resets on a symbol change").toBeGreaterThan(state);
    expect(compile).toBeGreaterThan(reset);
    expect(SRC).toContain("const [tradePhaseSymbol, setTradePhaseSymbol] = React.useState(symbol);");
  });
});
