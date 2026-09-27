/**
 * A TRADE SAID OFF-MARKET IS NOT A TRADE ON THE LAST MARKET — Garden 16 §32,
 * verifier LOW round 4, 2026-09-27.
 *
 * THE DEFECT: open /charts TSLA (the room attaches TSLA), go to /journal (a room
 * with no market) and press MANAGE on the Workspace's global mode row. The bus
 * kept `stageSymbol: "TSLA"`, so back on /charts TSLA the deck read POSITION —
 * "In Trade" on a market the trader never said it on.
 *
 * THE RULE (decisionLifecycle.stageSymbolForWrite): a trade-bearing stage
 * written without a symbol is said on the market IN VIEW, or on none. A room's
 * attach returns its detach, so "in view" ends when the room unmounts.
 */
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DecisionContextBus } from "./decisionContextBus";
import {
  lifecyclePhaseFor,
  stageSymbolForWrite,
  TRADE_BEARING_STAGES,
  LIFECYCLE_STAGES,
  isTradeBearingStage,
} from "./decisionLifecycle";
import { useDecisionContext, type UseDecisionContext } from "./useDecisionContext";

/** What a room does: attach on mount/symbol change, run the returned detach on unmount. */
function hookFor(bus: DecisionContextBus): UseDecisionContext {
  let got: UseDecisionContext | null = null;
  function Probe(): React.ReactElement {
    got = useDecisionContext(bus);
    return <i />;
  }
  renderToStaticMarkup(<Probe />);
  return got!;
}

describe("stageSymbolForWrite — the one rule for a write that names no market", () => {
  it("a trade-bearing stage is said on the market in view, or on none — never on the last attached", () => {
    for (const stage of TRADE_BEARING_STAGES) {
      expect(stageSymbolForWrite(stage, null, "TSLA"), stage).toBeNull();
      expect(stageSymbolForWrite(stage, "ES1!", "TSLA"), stage).toBe("ES1!");
    }
  });
  it("any other stage (and LEARN's null) is said on the market in view, else stays where it was", () => {
    for (const stage of [...LIFECYCLE_STAGES.filter((s) => !isTradeBearingStage(s)), null]) {
      expect(stageSymbolForWrite(stage, null, "TSLA"), String(stage)).toBe("TSLA");
      expect(stageSymbolForWrite(stage, "ES1!", "TSLA"), String(stage)).toBe("ES1!");
    }
  });
});

describe("/charts TSLA → /journal → MANAGE on the mode row → /charts TSLA", () => {
  it("TSLA does NOT read POSITION: the trade was never declared on TSLA", () => {
    const bus = new DecisionContextBus();
    const { attachSymbol, setMode } = hookFor(bus);
    const detach = attachSymbol("TSLA"); // /charts TSLA mounts
    detach(); // /charts unmounts — the trader is on /journal now
    setMode("MANAGE"); // the global mode row, in a room with no market
    expect(bus.getContext()).toMatchObject({ mode: "MANAGE", stage: "MANAGE", stageSymbol: null });
    expect(lifecyclePhaseFor(bus.getContext(), "TSLA")).toBe("PREPARATION");
    // back to /charts TSLA: the owner agrees with render — the lifecycle start
    attachSymbol("TSLA");
    expect(bus.getContext()).toMatchObject({ stage: "OBSERVE", mode: "OBSERVE", stageSymbol: "TSLA" });
    expect(lifecyclePhaseFor(bus.getContext(), "TSLA")).toBe("PREPARATION");
  });

  it("every trade-bearing stage, by either write that names no symbol (mode row and bare setStage)", () => {
    for (const stage of TRADE_BEARING_STAGES) {
      const bus = new DecisionContextBus();
      bus.attachSymbol("TSLA");
      bus.detachSymbol("TSLA");
      bus.setStage(stage);
      expect(lifecyclePhaseFor(bus.getContext(), "TSLA"), stage).toBe("PREPARATION");
    }
    for (const mode of ["EXECUTE", "MANAGE"] as const) {
      const bus = new DecisionContextBus({ confirmationsRequired: 1 });
      bus.attachSymbol("TSLA");
      bus.detachSymbol("TSLA");
      bus.proposeMode(mode);
      expect(lifecyclePhaseFor(bus.getContext(), "TSLA"), `proposed ${mode}`).toBe("PREPARATION");
    }
  });

  it("…while pressed WITH TSLA in view, MANAGE on the mode row IS a trade on TSLA (the row still drives the deck)", () => {
    const bus = new DecisionContextBus();
    const { attachSymbol, setMode } = hookFor(bus);
    attachSymbol("TSLA");
    setMode("MANAGE");
    expect(bus.getContext()).toMatchObject({ stage: "MANAGE", stageSymbol: "TSLA" });
    expect(lifecyclePhaseFor(bus.getContext(), "TSLA")).toBe("POSITION");
  });

  it("a trade said ON TSLA stays TSLA's after the room leaves (detach resets nothing)", () => {
    const bus = new DecisionContextBus();
    const detach = hookFor(bus).attachSymbol("TSLA");
    bus.setStage("MANAGE", "TSLA");
    detach();
    expect(lifecyclePhaseFor(bus.getContext(), "TSLA")).toBe("POSITION");
    bus.attachSymbol("TSLA");
    expect(lifecyclePhaseFor(bus.getContext(), "TSLA")).toBe("POSITION");
  });

  it("a stale detach from the market the room left does not un-view the market it moved to", () => {
    const bus = new DecisionContextBus();
    bus.attachSymbol("TSLA");
    bus.attachSymbol("ES1!");
    bus.detachSymbol("TSLA"); // React may run the old effect's cleanup after the new attach
    bus.setMode("MANAGE");
    expect(bus.getContext()).toMatchObject({ stage: "MANAGE", stageSymbol: "ES1!" });
  });
});
