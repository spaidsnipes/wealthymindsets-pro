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
  LIFECYCLE_STAGES,
  LIFECYCLE_START,
  lifecyclePhaseFor,
  modeForStage,
  phaseForStage,
  routeForMode,
  stageForMode,
  stageForPhase,
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
    expect(lifecyclePhaseFor({ stage: null, stageSymbol: "GC1!" }, "GC1!")).toBe("PREPARATION");
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
