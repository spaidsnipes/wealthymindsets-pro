/**
 * THE TRADE PHASE BELONGS TO ONE MARKET — Garden 16 §11 verifier YELLOW,
 * 2026-09-26. "In Trade" pressed on TSLA kept the chain at "Managing — Trade
 * open" after a switch to ES1!, a market the trader never said they were in.
 *
 * RE-PINNED 2026-09-27 (Garden 16 §15/§32 — one lifecycle owner). The phase is
 * no longer room `useState`; it is a read of the ONE lifecycle stage on the
 * DecisionContextBus, attached to the symbol it was declared on. The law is
 * unchanged and now held in two places that must both stand:
 *   · IN RENDER — `lifecyclePhaseFor(ctx, symbol)` answers PREPARATION for a
 *     stage declared on another market, so no frame compiles the new market
 *     with the old phase (behaviour pinned in decisionLifecycle.test.ts);
 *   · IN THE OWNER — the room attaches its symbol, and the bus returns the ONE
 *     stage to the lifecycle start for a new market, so the mode row agrees.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DecisionContextBus } from "@/lib/experience/decisionContextBus";
import { lifecyclePhaseFor } from "@/lib/experience/decisionLifecycle";

const SRC = readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("the room's trade phase is scoped to the symbol", () => {
  it("reads the phase FOR ITS SYMBOL before the one compile reads it, and attaches the symbol to the owner", () => {
    const read = SRC.indexOf("const tradePhase: TradePhase = lifecyclePhaseFor(lifecycleContext, symbol);");
    const attach = SRC.indexOf("attachLifecycleSymbol(symbol);");
    const compile = SRC.indexOf("const chartCanvasVM = useMarketCanvasVM({");
    expect(read, "the phase is no longer read for this room's symbol").toBeGreaterThan(-1);
    expect(attach, "the room no longer tells the lifecycle owner which market it shows").toBeGreaterThan(-1);
    expect(compile).toBeGreaterThan(read);
    expect(SRC, "a second, room-local phase store came back").not.toMatch(/useState<TradePhase>/);
  });

  it("TSLA 'In Trade' → ES1! reads PREPARATION in the same render, and the owner resets on attach", () => {
    const bus = new DecisionContextBus();
    bus.setStage("MANAGE", "TSLA");
    expect(lifecyclePhaseFor(bus.getContext(), "TSLA")).toBe("POSITION");
    expect(lifecyclePhaseFor(bus.getContext(), "ES1!")).toBe("PREPARATION");
    bus.attachSymbol("ES1!");
    expect(lifecyclePhaseFor(bus.getContext(), "ES1!")).toBe("PREPARATION");
    expect(bus.getContext().mode).toBe("OBSERVE");
  });
});
