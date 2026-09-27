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
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { CanonicalMarketState, MarketStateDimension } from "@/lib/marketData/canonicalMarketState";
import { composeMarketCanvasVM } from "@/lib/marketData/viewModels/composeMarketCanvasVM";
import type { TradePhase } from "@/lib/marketData/viewModels/selectDecisionChain";
import { selectPerCapabilityFidelity } from "@/lib/marketData/selectPerCapabilityFidelity";
import { decisionContextBus, type ExperienceMode } from "@/lib/experience/decisionContextBus";
import { selectDeckEmphasis } from "@/lib/experience/selectDeckEmphasis";
import { DECK_PHASE_LABEL, DECK_PHASE_ORDER } from "@/lib/experience/decisionLifecycle";
import { DecisionSpineBand, type DecisionSpineBandProps } from "@/components/experience/DecisionSpineBand";
import {
  CommandDeckSurface,
  COMMAND_DECK_PHASES,
  LifecycleRail,
  commandDeckSectionOrder,
  leadLivesElsewhere,
  riskRow,
  BROKER_ROW,
  COMMAND_DECK_GLOW_BUDGET,
} from "./CommandDeckSurface";
import { useChartCommandDeck, type ChartCommandDeck } from "./useChartCommandDeck";
import { LIFECYCLE_RAIL, stageForPhase, type LifecycleStage } from "@/lib/experience/decisionLifecycle";
import type { RiskOnPriceVM } from "@/lib/marketData/viewModels/selectRiskOnPrice";

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

interface RoomOpts {
  phase: TradePhase;
  state: CanonicalMarketState | null;
  stage?: LifecycleStage | null;
  decisionId?: string | null;
  risk?: RiskOnPriceVM | null;
}

/** A harness shaped exactly like the room: one hook call, one surface. */
function Room({ phase, state, stage, decisionId = null, risk = null }: RoomOpts): React.ReactElement {
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
      stage={stage === undefined ? stageForPhase(phase) : stage}
      decisionId={decisionId}
      decisionIdAbsence="No decision born yet — permission has not crossed."
      risk={risk}
      symbol="TSLA"
      ownerId="fixture-owner"
      nowMs={NOW}
      dataQuality="PARTIAL"
      capabilityReport={REPORT}
      unabridged={false}
    />
  );
}

function renderDeck(
  opts: {
    phase?: TradePhase;
    job?: ExperienceMode;
    state?: CanonicalMarketState | null;
    stage?: LifecycleStage | null;
    decisionId?: string | null;
    risk?: RiskOnPriceVM | null;
  } = {},
): string {
  decisionContextBus.setMode(opts.job ?? "OBSERVE");
  return renderToStaticMarkup(
    <Room
      phase={opts.phase ?? "PREPARATION"}
      state={opts.state === undefined ? stateFixture() : opts.state}
      stage={opts.stage}
      decisionId={opts.decisionId}
      risk={opts.risk}
    />,
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
  it("six presses, in the rail's words, exactly the room's phase pressed", () => {
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
      expect(owner(renderDeck({ job })), job).toBe("One lifecycle: the Workspace mode row and this rail move together.");
    }
    const learn = owner(renderDeck({ job: "LEARN" }));
    expect(learn).toBe("Your job is LEARN — not a trade-lifecycle stage. Pressing a stop re-enters the lifecycle.");
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

  it("the Steward's own verdict word is said at the TOP of STEWARD — the permission's, not the right of way", () => {
    const vm = compileAt("PREPARATION");
    const html = renderDeck({ phase: "PREPARATION" });
    const steward = html.slice(html.indexOf('data-testid="command-deck-section-steward"'));
    const verdictAt = steward.indexOf('data-testid="command-deck-steward-verdict"');
    expect(verdictAt).toBeGreaterThan(-1);
    expect(verdictAt).toBeLessThan(steward.indexOf('data-testid="command-deck-steward-rules"'));
    expect(steward).toContain(`data-verdict="${vm.permission.verdict}"`);
    expect(steward).toMatch(
      new RegExp(`data-testid="command-deck-steward-verdict"[^>]*>${vm.permission.verdict.replace(/_/g, " ")}<`),
    );
    expect(html.match(/data-testid="command-deck-steward-verdict"/g)?.length).toBe(1);
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

/**
 * DECK_PHASE_ORDER IS THE ORDER EVERY PHASE CONTROL RENDERS (verifier LOW,
 * round 4): the owner documented it and nothing pinned it. The drawer's
 * rendered buttons are read back in DOM order; /command-deck's control (a page
 * with no SSR harness) is pinned at its source — built from the owner's order
 * and rendered from that one list, with no second list beside it.
 */
describe("the deck's phase order is the owner's, as rendered", () => {
  it("§32's order is the owner's order", () => {
    expect([...DECK_PHASE_ORDER]).toEqual(["PREPARATION", "APPROACH", "DECISION", "POSITION", "POST_EXIT", "REVIEW"]);
  });

  it("the /charts drawer renders its buttons, ids and words, in DECK_PHASE_ORDER", () => {
    const html = renderDeck({ phase: "PREPARATION" });
    const group = html.slice(html.indexOf('data-testid="command-deck-phase"'));
    // The canon rail (2026-09-27) renders each press point as a button with a
    // node and a word; read EVERY press point in DOM order, not the first six.
    const presses = [...group.matchAll(/<button[^>]*data-phase="([A-Z_]+)"[^>]*aria-label="([^"]*)"/g)];
    expect(presses.map((b) => b[1])).toEqual([...DECK_PHASE_ORDER]);
    // Each press names the chain phase it writes, in the owner's words.
    presses.forEach((b) => expect(b[2]).toContain(`the chain reads ${b[1].replace("_", "-").toLowerCase()}`));
  });

  it("/command-deck builds its one phase list from DECK_PHASE_ORDER and renders that list", () => {
    const page = readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");
    expect(page).toMatch(/const PHASES: readonly \{ id: CommandPhase; label: string \}\[\] = DECK_PHASE_ORDER\.map\(\(id\) => \(\{\s*id,\s*label: DECK_PHASE_LABEL\[id\],?\s*\}\)\);/);
    const control = page.slice(page.indexOf('aria-label="Trade phase"'));
    expect(control, "the page's phase control no longer renders the owner-ordered list").toMatch(/^[^]*?\{PHASES\.map\(\(p\) =>/);
    expect(control).toMatch(/^[^]*?\{PHASES\.map\(\(p\) => \([^]*?\{p\.label\}/);
    expect(page.match(/\{PHASES\.map\(/g)?.length, "one phase control, one list").toBe(1);
  });
});

/* ── THE PLATE (deck canon, 2026-09-27) ─────────────────────────────────────
   Side by side with IMG_1554 (PROCESS INTEGRITY node rail), V01 (the right
   rail's WAIT · DECISION_ID · RISK grammar) and FL_03 (the drawer's gold
   hairline cards): the verdict is the largest type, the lifecycle is ONE rail
   with the current stop lit, the book states what the room can prove. */

/** The plate's regions in DOM order. */
const regionOrder = (html: string) =>
  [...html.matchAll(/data-testid="(command-deck-plate|command-deck-lifecycle|command-deck-book|command-deck-section-[a-z_]+)"/g)].map(
    (m) => m[1],
  );

describe("THE PLATE'S HIERARCHY — verdict, then the rail, then the book, then the organs", () => {
  it("renders in that order, every time", () => {
    for (const job of ["OBSERVE", "WAIT", "REVIEW"] as const) {
      const order = regionOrder(renderDeck({ job }));
      expect(order.slice(0, 4), job).toEqual([
        "command-deck-plate",
        "command-deck-lifecycle",
        "command-deck-book",
        "command-deck-section-process",
      ]);
    }
  });

  it("the headline is the room's one story's reason — the rail's own words — and the verdict rides as data only", () => {
    const vm = compileAt("PREPARATION");
    const html = renderDeck({ phase: "PREPARATION" });
    expect(html).toContain(`data-verdict="${vm.oneStory.decision.value}"`);
    expect(text(html)).toContain(vm.oneStory.decision.detail);
  });

  it("NO SECOND WAIT (SPEC §246/§342): the drawer never prints the verdict word the rail owns", () => {
    for (const phase of ["PREPARATION", "POSITION", "REVIEW"] as const) {
      const vm = compileAt(phase);
      const html = renderDeck({ phase });
      expect(html).not.toContain('data-testid="command-deck-verdict"');
      // The verdict word appears nowhere as a word in the drawer (the job chip
      // names a JOB and is exempt by its own testid).
      const words = text(html.replace(/<button[^>]*>(?:(?!<\/button>)[^])*?(?:Suggested job|Possibly)(?:(?!<\/button>)[^])*<\/button>/g, ""));
      expect(words.match(new RegExp(`\\b${vm.oneStory.decision.value}\\b`, "g")) ?? [], phase).toEqual([]);
      expect(text(html)).toContain("The verdict itself is the right rail");
    }
  });

  it("the reason is the largest type in the drawer", () => {
    const html = renderDeck({});
    const sizes = [...html.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
    const reason = Number(html.match(/data-testid="command-deck-wait-reason"[^>]*style="[^"]*font-size:(\d+)px/)?.[1]);
    expect(reason).toBeGreaterThan(0);
    expect(Math.max(...sizes)).toBe(reason);
  });

  it("DECISION_ID is the room's identity when there is one, and the room's absence sentence when not", () => {
    const born = renderDeck({ decisionId: "TSLA-20260927-093012" });
    expect(born).toContain('data-decision-id="TSLA-20260927-093012"');
    expect(born).not.toContain('data-testid="command-deck-decision-id-absent"');
    const unborn = renderDeck({ decisionId: null });
    expect(unborn).not.toContain('data-testid="command-deck-decision-id"');
    expect(text(unborn)).toContain("No decision born yet — permission has not crossed.");
  });
});

describe("THE LIFECYCLE RAIL — §32's five stops, ONE rail, the current stop lit", () => {
  const litStop = (html: string) => html.match(/data-lit-stop="([A-Z_ ]+)"/)?.[1];
  const stops = (html: string) => [...html.matchAll(/data-rail-stop="([A-Z_]+)" data-tense="([a-z]+)"/g)].map((m) => [m[1], m[2]]);
  const pressedPhases = (html: string) =>
    [...html.matchAll(/<button[^>]*data-phase="([A-Z_]+)"[^>]*aria-pressed="true"/g)].map((m) => m[1]);

  it("five stops in §32's order, inside one group", () => {
    const html = renderDeck({});
    expect(stops(html).map(([id]) => id)).toEqual(["OBSERVING", "PREPARING", "IN_TRADE", "MANAGING", "POST_EXIT_REVIEW"]);
    expect(html.match(/data-testid="command-deck-phase"/g)?.length).toBe(1);
    for (const label of ["Observing", "Approach", "Decide", "In Trade", "Managing", "Post-Exit", "Review"]) {
      expect(text(html)).toContain(label);
    }
  });

  it("each stage lights its stop (MANAGE: In Trade + Managing), stops before read past, after ahead", () => {
    const cases: readonly [LifecycleStage, readonly string[], readonly string[]][] = [
      ["OBSERVE", ["OBSERVING"], ["PREPARATION"]],
      ["PREP", ["PREPARING"], []],
      ["WAIT", ["PREPARING"], ["APPROACH"]],
      // Deciding is not a trade (verifier LOW, round 4): EXECUTE lights PREPARING.
      ["EXECUTE", ["PREPARING"], ["DECISION"]],
      ["MANAGE", ["IN_TRADE", "MANAGING"], ["POSITION"]],
      ["POST_EXIT", ["POST_EXIT_REVIEW"], ["POST_EXIT"]],
      ["REVIEW", ["POST_EXIT_REVIEW"], ["REVIEW"]],
    ];
    for (const [stage, lit, presses] of cases) {
      const html = renderDeck({ stage });
      expect(litStop(html), stage).toBe(lit.join(" "));
      expect(pressedPhases(html), stage).toEqual(presses);
      const tenses = stops(html);
      const first = tenses.findIndex(([id]) => id === lit[0]);
      tenses.forEach(([id, t], j) =>
        expect(t, `${stage} stop ${j}`).toBe(lit.includes(id) ? "lit" : j < first ? "past" : "ahead"),
      );
    }
  });

  it("a stage still deciding never says it is in a trade — the lit words for EXECUTE carry no trade word", () => {
    const html = renderDeck({ stage: "EXECUTE", phase: "DECISION" });
    expect(html.match(/data-testid="command-deck-stage-word"[^>]*>([^<]*)</)?.[1]).toBe("Decide");
    expect(html).toMatch(/data-rail-stop="IN_TRADE" data-tense="ahead"/);
    expect(html).toMatch(/data-rail-stop="MANAGING" data-tense="ahead"/);
    const managing = renderDeck({ stage: "MANAGE", phase: "POSITION" });
    expect(managing.match(/data-testid="command-deck-stage-word"[^>]*>([^<]*)</)?.[1]).toBe("In Trade");
    // MANAGING is a plaque lit with In Trade — not a second button for the same stage.
    expect(managing).toMatch(/data-rail-plaque="Managing"/);
    expect(managing).not.toMatch(/<button[^>]*aria-label="Managing/);
  });

  it("a LEARN job lights no stop and presses nothing — it is not a lifecycle stage", () => {
    const html = renderDeck({ stage: null, job: "LEARN" });
    expect(litStop(html)).toBe("NONE");
    expect(pressedPhases(html)).toEqual([]);
    expect(text(html)).toContain("Not in a lifecycle");
  });

  it("EVERY press calls onPhase with its own phase — the rail writes only through the room's setter", () => {
    // LifecycleRail holds no hooks, so it is called as a function and its
    // returned element tree is walked: the onClick on each button is the real
    // handler the browser would fire (no DOM environment in this repo).
    const calls: TradePhase[] = [];
    const fakeDeck = { job: "OBSERVE", chain: null } as unknown as ChartCommandDeck;
    const tree = LifecycleRail({ deck: fakeDeck, stage: "OBSERVE", onPhase: (p) => calls.push(p) });
    const buttons: React.ReactElement<{ onClick: () => void; "data-phase": TradePhase }>[] = [];
    const walk = (node: React.ReactNode): void => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!React.isValidElement(node)) return;
      const el = node as React.ReactElement<{ children?: React.ReactNode; "data-phase"?: TradePhase; onClick?: () => void }>;
      if (el.type === "button" && el.props["data-phase"]) buttons.push(el as never);
      walk(el.props.children);
    };
    walk(tree);
    expect(buttons.map((b) => b.props["data-phase"])).toEqual(LIFECYCLE_RAIL.flatMap((s) => s.presses));
    for (const b of buttons) b.props.onClick();
    expect(calls).toEqual(COMMAND_DECK_PHASES.map((p) => p.id));
  });
});

describe("THE BOOK — §32's attachments, in honest states (PAPER only)", () => {
  const row = (html: string, key: string) => html.match(new RegExp(`data-testid="command-deck-row-${key}" data-state="([^"]+)"`))?.[1];

  it("thesis, risk, broker, orders, position, management and receipt are all present", () => {
    const html = renderDeck({});
    for (const key of ["thesis", "risk", "broker", "orders", "position", "management", "receipt"]) {
      expect(row(html, key), key).toBeTruthy();
    }
  });

  it("what this room cannot read is said as NOT READ / unobserved — never flat, never a fake account", () => {
    const html = renderDeck({});
    // The drawer reads no broker connection (verifier HIGH, round 4): it says
    // so, and never claims "not connected" or "paper only" for the account.
    expect(row(html, "broker")).toBe("NOT READ");
    expect(BROKER_ROW.detail).toBe(
      "This drawer does not read the broker connection. The Connect brokers panel reads it when opened.",
    );
    expect(row(html, "orders")).toBe("UNOBSERVED");
    expect(row(html, "position")).toBe("UNOBSERVED");
    expect(row(html, "receipt")).toBe("NONE SEALED");
    expect(row(html, "risk")).toBe("UNKNOWN");
    const t = text(html);
    expect(t).toMatch(/\bPaper\b/i);
    expect(t).not.toMatch(/NOT CONNECTED|paper only|No account is connected/i);
    expect(t, "money").not.toMatch(/\$\s?\d/);
    expect(t).not.toMatch(/\bFLAT\b|LIVE ACCOUNT/);
  });

  it("orders and position scope their blindness to the drawer — /charts' Alpaca paper panel does read paper orders", () => {
    // The room mounts AlpacaTradingPanel (paper orders + positions), so "not
    // read in this room" was false. The rows speak for the drawer and name
    // the panel that does read them.
    const t = text(renderDeck({}));
    expect(t).not.toMatch(/read in this room/i);
    expect(t).toContain("This drawer reads no order book. The Alpaca paper account panel reads paper orders when opened.");
    expect(t).toContain("This drawer reads no position — flat is never assumed. The Alpaca paper account panel reads paper positions when opened.");
  });

  it("the thesis is the room's one story's sentence", () => {
    expect(text(renderDeck({}))).toContain(compileAt("PREPARATION").oneStory.primary);
  });

  it("risk reads the chart's plan: R:R and state, never a price", () => {
    const base: RiskOnPriceVM = {
      version: 1, drawn: true, reason: "BRACKETED", plans: 1, side: "LONG",
      entry: 250, stop: 245, target: 262.5, riskPerUnit: 5, riskPct: 2, rewardPerUnit: 12.5, rr: 2.5,
      live: null, entryAt: null, stopAt: null, targetAt: null, state: "WAITING_FOR_ENTRY", refusals: [],
    };
    const planned = riskRow(base);
    expect(planned.state).toBe("PLANNED");
    expect(planned.detail).toContain("2.50 R:R");
    expect(planned.detail).toContain("waiting for entry");
    expect(planned.detail).not.toMatch(/250|245|262/);
    // The row reads a DRAWING — no ledger, no broker — so it claims no
    // execution state at all (verifier HIGH, round 4).
    expect(planned.detail).toMatch(/A drawing on the chart — this row reads no orders or fills\./);
    expect(planned.detail).not.toMatch(/executed|filled\b|paper/i);
    expect(riskRow({ ...base, drawn: false, reason: "NO_POSITION_DRAWN" }).state).toBe("NO PLAN");
    expect(riskRow({ ...base, drawn: false, reason: "NO_STOP_ON_DRAWING" }).state).toBe("NO STOP");
    expect(riskRow({ ...base, drawn: false, reason: "STOP_ON_WRONG_SIDE" }).state).toBe("REFUSED");
    expect(riskRow(null).state).toBe("UNKNOWN");
    const html = renderDeck({ risk: base });
    expect(row(html, "risk")).toBe("PLANNED");
    expect(text(html)).not.toContain("250");
  });
});

describe("§42 RESTRAINED GLOW — every gold glow in the drawer is within the stated budget (verifier LOW, round 4)", () => {
  it("the budget is 12%, and no text-shadow / box-shadow gold alpha in the rendered drawer exceeds it", () => {
    expect(COMMAND_DECK_GLOW_BUDGET).toBe(0.12);
    for (const stage of ["OBSERVE", "EXECUTE", "MANAGE", "REVIEW"] as const) {
      const html = renderDeck({ stage });
      const shadows = [...html.matchAll(/(?:text-shadow|box-shadow):([^;"]+)/g)].map((m) => m[1]);
      expect(shadows.length, stage).toBeGreaterThan(3);
      for (const sh of shadows) {
        for (const a of sh.matchAll(/rgba\(196,\s*165,\s*116,\s*([\d.]+)\)/g)) {
          expect(Number(a[1]), `${stage}: ${sh}`).toBeLessThanOrEqual(COMMAND_DECK_GLOW_BUDGET);
        }
      }
    }
  });
});
