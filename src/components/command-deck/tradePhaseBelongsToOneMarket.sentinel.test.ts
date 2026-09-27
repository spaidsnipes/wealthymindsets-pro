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

const read = (rel: string) =>
  readFileSync(path.join(process.cwd(), rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const SRC = read("src/components/chart/ChartsDashboard.tsx");
const DECK_PAGE = read("src/app/command-deck/page.tsx");

/**
 * THE WHOLE ATTACH EFFECT, deps included (verifier MEDIUM, round 3): a
 * substring pin on `attachLifecycleSymbol(symbol);` survived dropping `symbol`
 * from the deps — the effect then attaches once and a market change never
 * reaches the owner, so the mode row keeps TSLA's "MANAGE" on ES1!. Round 4: the
 * arrow is expression-bodied so the effect RETURNS the detach (useDecisionContext)
 * — a block body `{ attachLifecycleSymbol(symbol); }` would drop it.
 */
const ATTACH_EFFECT =
  /React\.useEffect\(\(\) => attachLifecycleSymbol\(symbol\), \[attachLifecycleSymbol, symbol\]\);/;

describe("the room's trade phase is scoped to the symbol", () => {
  it("reads the phase FOR ITS SYMBOL before the one compile reads it, and attaches the symbol to the owner", () => {
    const read = SRC.indexOf("const tradePhase: TradePhase = lifecyclePhaseFor(lifecycleContext, symbol);");
    const attach = SRC.indexOf("attachLifecycleSymbol(symbol)");
    const compile = SRC.indexOf("const chartCanvasVM = useMarketCanvasVM({");
    expect(read, "the phase is no longer read for this room's symbol").toBeGreaterThan(-1);
    expect(attach, "the room no longer tells the lifecycle owner which market it shows").toBeGreaterThan(-1);
    expect(compile).toBeGreaterThan(read);
    expect(SRC, "a second, room-local phase store came back").not.toMatch(/useState<TradePhase>/);
    expect(SRC, "the attach effect no longer re-runs on a market change").toMatch(ATTACH_EFFECT);
  });

  it("/command-deck reads and writes the SAME owner, for its symbol — no room-local phase", () => {
    expect(DECK_PAGE).toContain("const phase: CommandPhase = lifecyclePhaseFor(experienceContext, symbol);");
    expect(DECK_PAGE).toContain("(p: CommandPhase) => setLifecycleStage(stageForPhase(p), symbol)");
    expect(DECK_PAGE, "the attach effect no longer re-runs on a market change").toMatch(ATTACH_EFFECT);
    expect(DECK_PAGE).toMatch(/label: DECK_PHASE_LABEL\[id\]/);
    expect(DECK_PAGE).not.toMatch(/useState<CommandPhase>|useState<TradePhase>/);
  });

  it("attach on every symbol change: a room walking TSLA → ES1! → TSLA ends at the start, not TSLA's old trade", () => {
    const bus = new DecisionContextBus();
    // What the room's effect does on each symbol it renders.
    bus.attachSymbol("TSLA");
    bus.setStage("MANAGE", "TSLA");
    bus.attachSymbol("ES1!");
    expect(bus.getContext()).toMatchObject({ stage: "OBSERVE", stageSymbol: "ES1!" });
    bus.attachSymbol("TSLA");
    expect(bus.getContext()).toMatchObject({ stage: "OBSERVE", mode: "OBSERVE", stageSymbol: "TSLA" });
    expect(lifecyclePhaseFor(bus.getContext(), "TSLA")).toBe("PREPARATION");
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
