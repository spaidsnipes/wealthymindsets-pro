/**
 * THE COMMAND DECK DRAWER ON /charts — what it shows, fed only by the room.
 * 2026-09-26, Garden 16 §10 + §11.
 *
 * WHY STATIC MARKUP. This repo has no DOM test environment; the click, Escape,
 * focus and chart-identity half of the behaviour is proven in a real browser
 * (scripts/prove-command-deck.mjs). What static markup CAN prove completely is
 * everything the drawer RENDERS from a given room state — and it proves it
 * through the real hook (`useChartCommandDeck` runs under SSR: useState,
 * useMemo and useSyncExternalStore all answer there) over the real compiler.
 *
 * Every fixture below is compiled by the product's own compiler from one
 * canonical-state fixture. Nothing about the chain, the permission or the one
 * story is hand-written here — a hand-written chain could agree with a drawer
 * that disagreed with the room.
 */
import { afterEach, describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { CanonicalMarketState, MarketStateDimension } from "@/lib/marketData/canonicalMarketState";
import { composeMarketCanvasVM } from "@/lib/marketData/viewModels/composeMarketCanvasVM";
import type { TradePhase } from "@/lib/marketData/viewModels/selectDecisionChain";
import { selectPerCapabilityFidelity } from "@/lib/marketData/selectPerCapabilityFidelity";
import { decisionContextBus, type ExperienceMode } from "@/lib/experience/decisionContextBus";
import { selectDeckEmphasis } from "@/lib/experience/selectDeckEmphasis";
import { DecisionSpineBand, type DecisionSpineBandProps } from "@/components/experience/DecisionSpineBand";
import {
  CommandDeckSurface,
  COMMAND_DECK_PHASES,
  commandDeckSectionOrder,
  leadLivesElsewhere,
} from "./CommandDeckSurface";
import { useChartCommandDeck } from "./useChartCommandDeck";

const NOW = 1_760_000_000_000;

const unresolved = (): MarketStateDimension => ({
  resolution: "UNKNOWN", value: null, confidence: null,
  evidence: [], contradictions: [], unknowns: [],
});

function stateFixture(): CanonicalMarketState {
  return {
    schemaVersion: "wm.market-state.v1", sealed: true, snapshotId: "deck-fixture",
    capturedAt: NOW - 1_000, availableAt: NOW - 1_000, instrumentId: "TSLA", normalizedSymbol: "TSLA",
    executableIdentity: null, assetClass: "equity", exchange: null, session: "REGULAR",
    timeframeContext: [], qualityState: "PARTIAL",
    price: { last: 250, bid: null, ask: null, eventAt: NOW - 1_000, availableAt: NOW - 1_000 },
    coverage: [], direction: unresolved(), location: unresolved(), aggression: unresolved(),
    regime: unresolved(), structure: unresolved(), volatility: unresolved(), profile: unresolved(),
    orderFlow: unresolved(), contradictions: [], unknowns: [],
  };
}

/** The room's ONE compile, at a phase — exactly what ChartsDashboard hands down. */
function compileAt(phase: TradePhase, state: CanonicalMarketState | null = stateFixture()) {
  return composeMarketCanvasVM({
    state,
    history: [],
    sessionDecisions: [],
    ownerId: "fixture-owner",
    nowMs: NOW,
    phase,
  });
}

// The report a room with no provider compiles — the same call shape the room
// hoists into `chartCapabilityReport`.
const REPORT = selectPerCapabilityFidelity({
  source: "unavailable",
  connected: false,
  hasCandles: false,
  sessionOpen: null,
});

/** A harness shaped exactly like the room: one hook call, one surface. */
function Room({ phase, state }: { phase: TradePhase; state: CanonicalMarketState | null }): React.ReactElement {
  const vm = compileAt(phase, state);
  const deck = useChartCommandDeck({
    ownerId: "fixture-owner",
    nowMs: NOW,
    phase,
    state,
    history: [],
    chain: vm.chain,
    permission: vm.permission,
    oneStory: vm.oneStory,
    sessionDecisions: [],
    journalEntries: [],
    resolvedObjectCount: 0,
  });
  return (
    <CommandDeckSurface
      deck={deck}
      phase={phase}
      onPhase={() => {}}
      symbol="TSLA"
      ownerId="fixture-owner"
      nowMs={NOW}
      dataQuality="PARTIAL"
      capabilityReport={REPORT}
      unabridged={false}
    />
  );
}

function renderDeck(opts: { phase?: TradePhase; job?: ExperienceMode; state?: CanonicalMarketState | null } = {}): string {
  decisionContextBus.setMode(opts.job ?? "OBSERVE");
  return renderToStaticMarkup(
    <Room phase={opts.phase ?? "PREPARATION"} state={opts.state === undefined ? stateFixture() : opts.state} />,
  );
}

/** Visible text only — tags stripped, entities left as-is. */
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

afterEach(() => {
  decisionContextBus.setMode("OBSERVE");
});

describe("the drawer's sections — the plates' card set, ranked by the job", () => {
  it("PROCESS leads, PREP · LEARN and WIRE close, the middle three follow the job's emphasis", () => {
    expect(commandDeckSectionOrder(selectDeckEmphasis("OBSERVE"))).toEqual([
      "PROCESS", "STORY", "STEWARD", "RECEIPT", "PREP_LEARN", "WIRE",
    ]);
    // WAIT leads with WHY — the Steward's rules are that half in this drawer.
    expect(commandDeckSectionOrder(selectDeckEmphasis("WAIT"))).toEqual([
      "PROCESS", "STEWARD", "STORY", "RECEIPT", "PREP_LEARN", "WIRE",
    ]);
    // REVIEW leads with the sealed receipt.
    expect(commandDeckSectionOrder(selectDeckEmphasis("REVIEW"))).toEqual([
      "PROCESS", "RECEIPT", "STORY", "STEWARD", "PREP_LEARN", "WIRE",
    ]);
  });

  it("the rendered drawer is in that order, as real DOM order", () => {
    for (const job of ["OBSERVE", "WAIT", "REVIEW"] as const) {
      const html = renderDeck({ job });
      const rendered = [...html.matchAll(/data-section="([A-Z_]+)"/g)].map((m) => m[1]);
      expect(rendered, job).toEqual([...commandDeckSectionOrder(selectDeckEmphasis(job))]);
    }
  });

  it("a lead that lives elsewhere on /charts is named where it lives, not implied to be here", () => {
    expect(leadLivesElsewhere("PASSPORT")).toMatch(/Tools, Market object passport/);
    expect(leadLivesElsewhere("WHY")).toMatch(/decision rail/);
    expect(leadLivesElsewhere("STORY")).toBeNull();
    expect(leadLivesElsewhere("RECEIPT")).toBeNull();
    expect(text(renderDeck({ job: "OBSERVE" }))).toContain("Tools, Market object passport");
  });
});

describe("PROCESS — the phase control is wired to the room's one chain", () => {
  it("six phases, in the deck's own words, exactly the room's phase pressed", () => {
    const html = renderDeck({ phase: "POSITION" });
    const buttons = [...html.matchAll(/<button[^>]*data-phase="([A-Z_]+)"[^>]*aria-pressed="(true|false)"/g)];
    expect(buttons.map((b) => b[1])).toEqual(COMMAND_DECK_PHASES.map((p) => p.id));
    expect(buttons.filter((b) => b[2] === "true").map((b) => b[1])).toEqual(["POSITION"]);
    for (const p of COMMAND_DECK_PHASES) expect(text(html)).toContain(p.label);
  });

  it("the headline under the control is the chain compiled WITH that phase", () => {
    const prep = text(renderDeck({ phase: "PREPARATION" }));
    const inTrade = text(renderDeck({ phase: "POSITION" }));
    expect(prep).toContain(compileAt("PREPARATION").chain!.headline);
    expect(inTrade).toContain(compileAt("POSITION").chain!.headline);
    expect(prep).toMatch(/Preparing — /);
    expect(inTrade).toMatch(/Managing — /);
    expect(prep).toMatch(/Management · pending/);
    expect(inTrade).toMatch(/Management · active/);
  });

  it("the one-lifecycle line under the control: said for a lifecycle job, and LEARN is named as not a stage", () => {
    const owner = (html: string) =>
      html.match(/data-testid="command-deck-lifecycle-owner"[^>]*>([^<]*)</)?.[1] ?? null;
    for (const job of ["OBSERVE", "MANAGE", "REVIEW"] as const) {
      expect(owner(renderDeck({ job })), job).toBe("One lifecycle: the Workspace mode row and this phase move together.");
    }
    const learn = owner(renderDeck({ job: "LEARN" }));
    expect(learn).toBe("Your job is LEARN — not a trade-lifecycle stage. Pressing a phase re-enters the lifecycle.");
  });

  it("no chain compiled → it says so, and invents no headline", () => {
    const html = renderDeck({ state: null });
    expect(html).toContain('data-testid="command-deck-chain-unresolved"');
    expect(html).not.toContain('data-testid="command-deck-chain-headline"');
  });

  it("the job chip appears only when the inference diverges from the job — and names the job", () => {
    // OBSERVE with right-of-way withheld: the inference suggests WAIT.
    const diverged = renderDeck({ job: "OBSERVE" });
    expect(diverged).toContain('data-testid="command-deck-job-suggestion"');
    expect(text(diverged)).toMatch(/Suggested job WAIT|Possibly WAIT/);
    // Already in the suggested job: suggest, never nag.
    const agreed = renderDeck({ job: "WAIT" });
    expect(agreed).not.toContain('data-testid="command-deck-job-suggestion"');
  });
});

describe("STEWARD / PREP · LEARN — the gates the deck already had travel with the organs", () => {
  it("the engaged rules shown are the room's own permission's", () => {
    const vm = compileAt("PREPARATION");
    const t = text(renderDeck({ phase: "PREPARATION" }));
    expect(vm.permission.engagedRules.length).toBeGreaterThan(0);
    for (const r of vm.permission.engagedRules) expect(t).toContain(r.rule.label);
    expect(t).toContain(`${vm.permission.engagedRules.length} of ${vm.permission.ruleCount} steward rules engaged`);
  });

  it("the behaviour mirror opens only at Post-Exit and Review", () => {
    expect(text(renderDeck({ phase: "PREPARATION" }))).toContain("It opens at Post-Exit and Review");
    expect(text(renderDeck({ phase: "POSITION" }))).toContain("It opens at Post-Exit and Review");
    for (const phase of ["POST_EXIT", "REVIEW"] as const) {
      expect(text(renderDeck({ phase }))).not.toContain("It opens at Post-Exit and Review");
    }
  });

  it("practice honesty and the learning genome wait for a Review or Learn job", () => {
    const observing = text(renderDeck({ job: "OBSERVE" }));
    expect(observing).toContain("Held back until your job is Review or Learn");
    expect(observing).toContain("It opens when your job is Review or Learn");
    const reviewing = text(renderDeck({ job: "REVIEW" }));
    expect(reviewing).not.toContain("Held back until your job is Review or Learn");
    expect(reviewing).not.toContain("It opens when your job is Review or Learn");
  });
});

describe("what the drawer must never carry", () => {
  it("no navigation of any kind — no href, no anchor", () => {
    for (const job of ["OBSERVE", "REVIEW"] as const) {
      const html = renderDeck({ job });
      expect(html).not.toMatch(/href=/);
      expect(html).not.toMatch(/<a[\s>]/);
    }
  });

  it("no decorative scores or status words from the Aug-12 plates", () => {
    for (const phase of ["PREPARATION", "POSITION", "REVIEW"] as const) {
      for (const job of ["OBSERVE", "WAIT", "REVIEW"] as const) {
        const t = text(renderDeck({ phase, job }));
        expect(t).not.toMatch(/OPTIMAL|NOMINAL|SYSTEM STATUS|MARKET STATUS/i);
        expect(t).not.toMatch(/\bALIGNED\b/);
        expect(t, "a percentage score").not.toMatch(/\d+(\.\d+)?\s*%/);
        expect(t, "a health score").not.toMatch(/health\s*:?\s*\d/i);
      }
    }
  });

  it("no second price and no Available R — the chart and the rail own those", () => {
    const t = text(renderDeck({ phase: "PREPARATION" }));
    expect(t).not.toContain("250");
    expect(t).not.toMatch(/Available R/i);
  });
});

describe("THE RAIL READS THE SAME CHAIN — the drawer's phase reaches the right rail's words", () => {
  function railAt(phase: TradePhase): string {
    const vm = compileAt(phase);
    const props: DecisionSpineBandProps = {
      decisionId: null,
      decisionIdAbsence: "No decision born yet — permission has not crossed.",
      now: { token: "SESSION ?", detail: "not established", established: false },
      replayEngaged: false,
      market: { symbol: "TSLA", timeframe: "1D", quality: null, capturedAt: null, last: null },
      oneStory: vm.oneStory,
      availableR: vm.chain?.availableR ?? null,
      decisionWhy: vm.decisionWhy,
      expression: null,
    };
    return text(renderToStaticMarkup(<DecisionSpineBand {...props} presentation="rail" />));
  }

  it("pressing In Trade changes what the rail says, through the one story it already reads", () => {
    const prep = railAt("PREPARATION");
    const inTrade = railAt("POSITION");
    expect(prep).not.toEqual(inTrade);
    // The count the rail prints is the chain's own debt, one node lighter.
    const before = compileAt("PREPARATION").oneStory.debt!;
    const after = compileAt("POSITION").oneStory.debt!;
    expect(after.missing).toBe(before.missing - 1);
    expect(prep).toContain(`of ${before.missing} unpaid evidence nodes`);
    expect(inTrade).toContain(`of ${after.missing} unpaid evidence nodes`);
  });
});
