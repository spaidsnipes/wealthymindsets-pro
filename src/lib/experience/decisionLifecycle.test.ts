/**
 * ONE DECISION-LIFECYCLE OWNER — Garden 16 §13/§15/§32/§33, 2026-09-27.
 *
 * The Workspace's Experience mode row and the Command Deck's phase control were
 * two owners of one fact, and on /charts the row had no consumer. These tests
 * pin the ONE mapping both now read: total in both directions, each control's
 * press round-trips on its own face, the only two grain collapses are the ones
 * §32 draws, LEARN is a door not a phase, and nothing here mints a Decision_ID.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  ACADEMY_HREF,
  DECK_PHASE_LABEL,
  LIFECYCLE_RAIL,
  LIFECYCLE_STAGES,
  STAGE_WORD,
  lifecycleStageFor,
  railStopForStage,
  railStopsForStage,
  DECK_PHASE_ORDER,
  LIFECYCLE_START,
  lifecyclePhaseFor,
  modeForStage,
  phaseForStage,
  routeForMode,
  stageForMode,
  stageAttachedTo,
  stageForPhase,
  isTradeBearingStage,
  TRADE_BEARING_STAGES,
  type LifecycleStage,
} from "./decisionLifecycle";
import { DecisionContextBus, EXPERIENCE_MODES, type ExperienceMode } from "./decisionContextBus";
import type { TradePhase } from "../marketData/viewModels/selectDecisionChain";

const PHASES: readonly TradePhase[] = ["PREPARATION", "APPROACH", "DECISION", "POSITION", "POST_EXIT", "REVIEW"];
const LIFECYCLE_MODES = EXPERIENCE_MODES.filter((m) => m !== "LEARN");

describe("the mapping is total in both directions", () => {
  it("every stage has a phase and a mode", () => {
    for (const s of LIFECYCLE_STAGES) {
      expect(PHASES).toContain(phaseForStage(s));
      expect(EXPERIENCE_MODES).toContain(modeForStage(s));
    }
  });
  it("every phase writes a stage, and every mode names a route", () => {
    for (const p of PHASES) expect(LIFECYCLE_STAGES).toContain(stageForPhase(p));
    for (const m of EXPERIENCE_MODES) expect(routeForMode(m)).toBeTruthy();
  });
  it("every phase and every lifecycle mode is REACHABLE from some stage (no orphan on either control)", () => {
    expect(new Set(LIFECYCLE_STAGES.map(phaseForStage))).toEqual(new Set(PHASES));
    expect(new Set(LIFECYCLE_STAGES.map(modeForStage))).toEqual(new Set(LIFECYCLE_MODES));
  });
});

describe("each control's press round-trips on its own face", () => {
  it("the deck's Prep writes the lifecycle START, OBSERVE — not PREP", () => {
    expect(stageForPhase("PREPARATION")).toBe("OBSERVE");
  });
  it("deck: phase → stage → phase is the identity", () => {
    for (const p of PHASES) expect(phaseForStage(stageForPhase(p)), p).toBe(p);
  });
  it("mode row: mode → stage → mode is the identity for the six lifecycle modes", () => {
    for (const m of LIFECYCLE_MODES) expect(modeForStage(stageForMode(m)!), m).toBe(m);
  });
  it("the ONLY grain collapses are the two §32 draws — pinned, not accidental", () => {
    const byPhase = new Map<TradePhase, LifecycleStage[]>();
    for (const s of LIFECYCLE_STAGES) byPhase.set(phaseForStage(s), [...(byPhase.get(phaseForStage(s)) ?? []), s]);
    expect([...byPhase.entries()].filter(([, v]) => v.length > 1)).toEqual([["PREPARATION", ["OBSERVE", "PREP"]]]);
    const byMode = new Map<ExperienceMode, LifecycleStage[]>();
    for (const s of LIFECYCLE_STAGES) byMode.set(modeForStage(s), [...(byMode.get(modeForStage(s)) ?? []), s]);
    expect([...byMode.entries()].filter(([, v]) => v.length > 1)).toEqual([["REVIEW", ["POST_EXIT", "REVIEW"]]]);
  });
  it("the start is the bus default and reads PREPARATION — neither resting face changed", () => {
    expect(LIFECYCLE_START).toBe("OBSERVE");
    expect(phaseForStage(LIFECYCLE_START)).toBe("PREPARATION");
    expect(new DecisionContextBus().getContext().stage).toBe(LIFECYCLE_START);
  });
});

describe("LEARN is a changed job, not a phase", () => {
  it("routes to the Academy and writes no stage", () => {
    const r = routeForMode("LEARN");
    expect(r.kind).toBe("ROOM");
    expect(r.kind === "ROOM" && r.href).toBe(ACADEMY_HREF);
    expect(ACADEMY_HREF).toBe("/education");
    expect(stageForMode("LEARN")).toBeNull();
  });
});

describe("the stage belongs to one market", () => {
  it("a stage said on TSLA reads the start phase on ES1!, and its own phase on TSLA", () => {
    const ctx = { stage: "MANAGE" as const, stageSymbol: "TSLA" };
    expect(lifecyclePhaseFor(ctx, "TSLA")).toBe("POSITION");
    expect(lifecyclePhaseFor(ctx, "ES1!")).toBe("PREPARATION");
  });
  it("an unattached stage belongs to whichever market reads it; a non-lifecycle job reads the start", () => {
    expect(lifecyclePhaseFor({ stage: "WAIT", stageSymbol: null }, "GC1!")).toBe("APPROACH");
    expect(lifecyclePhaseFor({ stage: "REVIEW", stageSymbol: null }, "GC1!")).toBe("REVIEW");
    expect(lifecyclePhaseFor({ stage: null, stageSymbol: "GC1!" }, "GC1!")).toBe("PREPARATION");
  });
});

describe("a trade said on NO market is not a trade on the first market opened (verifier MEDIUM, round 3)", () => {
  it("the trade-bearing stages are exactly EXECUTE, MANAGE, POST_EXIT", () => {
    expect(LIFECYCLE_STAGES.filter(isTradeBearingStage)).toEqual(["EXECUTE", "MANAGE", "POST_EXIT"]);
    expect(TRADE_BEARING_STAGES).toEqual(["EXECUTE", "MANAGE", "POST_EXIT"]);
    expect(isTradeBearingStage(null)).toBe(false);
  });
  it("in render: an unattached trade-bearing stage reads PREPARATION on any market", () => {
    for (const stage of TRADE_BEARING_STAGES) {
      expect(lifecyclePhaseFor({ stage, stageSymbol: null }, "ES1!"), stage).toBe("PREPARATION");
      expect(stageAttachedTo({ stage, stageSymbol: null }, "ES1!"), stage).toBe(LIFECYCLE_START);
      // Declared on THIS market, it is itself.
      expect(stageAttachedTo({ stage, stageSymbol: "ES1!" }, "ES1!"), stage).toBe(stage);
    }
  });
  it("in the owner: MANAGE pressed before /charts attaches → the first attach returns to the start", () => {
    for (const mode of ["EXECUTE", "MANAGE"] as const) {
      const bus = new DecisionContextBus();
      bus.setMode(mode); // pressed on a room that names no market
      expect(bus.getContext().stageSymbol).toBeNull();
      bus.attachSymbol("ES1!");
      expect(bus.getContext(), mode).toMatchObject({ stage: LIFECYCLE_START, mode: "OBSERVE", stageSymbol: "ES1!", source: "default" });
      expect(lifecyclePhaseFor(bus.getContext(), "ES1!"), mode).toBe("PREPARATION");
    }
    const exited = new DecisionContextBus();
    exited.setStage("POST_EXIT");
    exited.attachSymbol("GC1!");
    expect(exited.getContext()).toMatchObject({ stage: LIFECYCLE_START, stageSymbol: "GC1!" });
  });
  it("a trade declared on THIS market survives its own first attach, and non-trade stages are kept", () => {
    const bus = new DecisionContextBus();
    bus.setStage("MANAGE", "TSLA");
    bus.attachSymbol("TSLA");
    expect(bus.getContext()).toMatchObject({ stage: "MANAGE", mode: "MANAGE", stageSymbol: "TSLA" });
    for (const mode of ["PREP", "WAIT", "REVIEW"] as const) {
      const b = new DecisionContextBus();
      b.setMode(mode);
      b.attachSymbol("ES1!");
      expect(b.getContext(), mode).toMatchObject({ stage: mode, mode, stageSymbol: "ES1!" });
    }
  });
  it("LEARN set before any room attaches stays LEARN (a job, not a stage to reset)", () => {
    const bus = new DecisionContextBus();
    bus.setMode("LEARN");
    bus.attachSymbol("ES1!");
    expect(bus.getContext()).toMatchObject({ mode: "LEARN", stage: null, stageSymbol: "ES1!" });
  });
});

describe("ONE bus, both controls — a press on either moves the other", () => {
  it("the deck's press moves the mode row", () => {
    const bus = new DecisionContextBus();
    bus.setStage(stageForPhase("POSITION"), "TSLA");
    expect(bus.getContext().mode).toBe("MANAGE");
    bus.setStage(stageForPhase("POST_EXIT"), "TSLA");
    expect(bus.getContext().mode).toBe("REVIEW");
    expect(bus.getContext().stage).toBe("POST_EXIT");
  });
  it("the mode row's press moves the deck's phase", () => {
    const bus = new DecisionContextBus();
    bus.attachSymbol("TSLA");
    bus.setMode("WAIT");
    expect(lifecyclePhaseFor(bus.getContext(), "TSLA")).toBe("APPROACH");
    bus.setMode("EXECUTE");
    expect(lifecyclePhaseFor(bus.getContext(), "TSLA")).toBe("DECISION");
    expect(bus.getContext().stageSymbol).toBe("TSLA");
  });
  it("pressing REVIEW on the row from Post-Exit is a real move to Review", () => {
    const bus = new DecisionContextBus();
    bus.setStage("POST_EXIT", "TSLA");
    bus.setMode("REVIEW");
    expect(bus.getContext().stage).toBe("REVIEW");
  });
  it("a market proposal carries the stage with it — the invariant has no side door", () => {
    const bus = new DecisionContextBus({ confirmationsRequired: 1 });
    bus.proposeMode("MANAGE");
    expect(bus.getContext().stage).toBe("MANAGE");
  });
  it("first attach keeps what the trader said; a new market returns to the start", () => {
    const bus = new DecisionContextBus();
    bus.setMode("WAIT");
    bus.attachSymbol("TSLA");
    expect(bus.getContext().stage).toBe("WAIT");
    bus.setStage("MANAGE", "TSLA");
    bus.attachSymbol("ES1!");
    expect(bus.getContext()).toMatchObject({ stage: LIFECYCLE_START, mode: "OBSERVE", stageSymbol: "ES1!", source: "default" });
    const before = bus.getContext();
    bus.attachSymbol("ES1!");
    expect(bus.getContext()).toBe(before);
  });
});

describe("§33 — the lifecycle mints no Decision_ID", () => {
  it("neither the lifecycle owner nor the bus names, mints or resets a decision identity", () => {
    for (const rel of ["decisionLifecycle.ts", "decisionContextBus.ts"]) {
      const src = readFileSync(path.join(__dirname, rel), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect(src.length).toBeGreaterThan(1500);
      expect(src, rel).not.toMatch(/decisionId|Decision_ID|randomUUID|mintDecision|nanoid|uuid/i);
    }
  });
});

describe("§32's RAIL — five stops, one rail, recorded not rewritten (deck canon, 2026-09-27)", () => {
  it("the stops are the Founder's five, in the Founder's order", () => {
    expect(LIFECYCLE_RAIL.map((s) => s.label)).toEqual([
      "Observing",
      "Preparing",
      "In Trade",
      "Managing",
      "Post-Exit / Review",
    ]);
  });
  it("every stage lights one CONTIGUOUS span of stops, in lifecycle order", () => {
    for (const st of LIFECYCLE_STAGES) {
      const idx = railStopsForStage(st).map((s) => LIFECYCLE_RAIL.indexOf(s));
      expect(idx.length, st).toBeGreaterThanOrEqual(1);
      expect(idx, st).toEqual(idx.map((_, k) => idx[0] + k));
    }
    // Only MANAGE lights two — §32's two words for the chain's ONE POSITION phase.
    expect(LIFECYCLE_STAGES.filter((st) => railStopsForStage(st).length > 1)).toEqual(["MANAGE"]);
    const lit = LIFECYCLE_STAGES.map((st) => LIFECYCLE_RAIL.indexOf(railStopForStage(st)));
    expect([...lit].sort((a, b) => a - b)).toEqual(lit);
  });
  it("every chain phase is pressed exactly once, and each press lands INSIDE its own stop", () => {
    const presses = LIFECYCLE_RAIL.flatMap((s) => s.presses);
    expect([...presses].sort()).toEqual([...PHASES].sort());
    expect(presses).toEqual([...DECK_PHASE_ORDER]);
    for (const stop of LIFECYCLE_RAIL) {
      for (const p of stop.presses) expect(railStopForStage(stageForPhase(p)).id, p).toBe(stop.id);
    }
  });
  it("IN TRADE is the POSITION phase, never the DECISION — a stage still deciding claims no trade (verifier LOW, round 4)", () => {
    // Deciding is before the trade: EXECUTE (chain DECISION) sits in PREPARING.
    expect(railStopForStage("EXECUTE").id).toBe("PREPARING");
    expect(phaseForStage("EXECUTE")).toBe("DECISION");
    // IN TRADE and MANAGING are both the chain's POSITION phase ("in a trade, managing").
    expect(railStopsForStage("MANAGE").map((s) => s.id)).toEqual(["IN_TRADE", "MANAGING"]);
    expect(phaseForStage("MANAGE")).toBe("POSITION");
    expect(LIFECYCLE_RAIL.find((s) => s.id === "IN_TRADE")?.presses).toEqual(["POSITION"]);
    expect(LIFECYCLE_RAIL.find((s) => s.id === "MANAGING")?.presses).toEqual([]);
    expect(railStopForStage("PREP").id).toBe("PREPARING");
    expect(railStopForStage("WAIT").id).toBe("PREPARING");
    // ONE vocabulary: no stage but the POSITION stage is called "In Trade" —
    // the deck rail, the mode-row read-back and /command-deck all read STAGE_WORD.
    for (const st of LIFECYCLE_STAGES) {
      if (st !== "MANAGE") expect(STAGE_WORD[st], st).not.toMatch(/trade|manag/i);
    }
    expect(STAGE_WORD.MANAGE).toBe("In Trade");
    expect(DECK_PHASE_LABEL.DECISION).toBe("Decide");
    expect(DECK_PHASE_LABEL.POSITION).toBe("In Trade");
  });
  it("a press's word is the word of the stage it writes — one vocabulary, no second table", () => {
    for (const p of PHASES) expect(DECK_PHASE_LABEL[p], p).toBe(STAGE_WORD[stageForPhase(p)]);
    for (const stop of LIFECYCLE_RAIL) {
      if (stop.presses.length === 1) expect(DECK_PHASE_LABEL[stop.presses[0]]).toBe(stop.label);
    }
  });
  it("the rail's stage belongs to one market; LEARN lights no stop", () => {
    expect(lifecycleStageFor({ stage: "MANAGE", stageSymbol: "TSLA" }, "TSLA")).toBe("MANAGE");
    expect(lifecycleStageFor({ stage: "MANAGE", stageSymbol: "TSLA" }, "ES1!")).toBe(LIFECYCLE_START);
    expect(lifecycleStageFor({ stage: "PREP", stageSymbol: null }, "GC1!")).toBe("PREP");
    expect(lifecycleStageFor({ stage: null, stageSymbol: "GC1!" }, "GC1!")).toBeNull();
    // The render rule is the owner's: a trade said on NO market lights the start.
    for (const stage of TRADE_BEARING_STAGES) {
      expect(lifecycleStageFor({ stage, stageSymbol: null }, "GC1!"), stage).toBe(LIFECYCLE_START);
    }
  });
});
