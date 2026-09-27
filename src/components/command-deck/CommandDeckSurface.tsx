"use client";

/**
 * CommandDeckSurface — the Command Deck, as a drawer over the live chart on
 * /charts. 2026-09-26, Garden 16 §10 + §11.
 *
 * THE CONTRACT, IN THE FOUNDER'S WORDS (§11): "Its opening state must belong
 * to the same organism. Its controls must be wired. Its state must be real.
 * Its return path must preserve context. COMMAND DECK IS A REAL CONTROL
 * SURFACE, NOT A DECORATIVE BUTTON."
 *
 * THE PLATES IT IS BUILT FROM, AND WHAT WAS LEFT ON THEM
 * -----------------------------------------------------
 * IMG_1554 / IMG_1556 (2026-08-12) draw a gold-glass TRADING COMMAND DECK with
 * four cards: PROCESS INTEGRITY, STORY RIBBON, AVAILABLE R, STEWARD STATE.
 * FL_03 draws the drawer grammar this sits in: a gold caps header with a close,
 * hairline section cards, the live chart still beside it. What is carried:
 *
 *   PROCESS  ← PROCESS INTEGRITY. The trade-phase control is REAL: it writes
 *              the room's `tradePhase`, which the room's ONE
 *              `useMarketCanvasVM` call compiles the chain with — so the chain
 *              headline printed under the control, the decision-chain
 *              equipment and the right rail's evidence debt all move together.
 *   STORY    ← STORY RIBBON, from the room's one `useMarketStory` call. The
 *              Aug-12 smart-money vocabulary (inducement, order block) is
 *              superseded and is not drawn.
 *   STEWARD  ← STEWARD STATE with the scores dropped: the rules the Steward
 *              actually evaluated, the behaviour mirror, what WM is watching
 *              (with a dismiss that holds), practice honesty.
 *   RECEIPT, PREP · LEARN, WIRE — the deck's other legitimate organs (D-701
 *              SALVAGE: "MIGRATE LEGITIMATE ORGANS INTO WORKSPACE/TOOLS
 *              DRAWERS").
 *
 * THE PLATE (deck canon, 2026-09-27 — §32 finish the cockpit, §9 side by side,
 * §42 atmosphere). Above the organs, three brass plates in the plate's own
 * hierarchy: the HEADLINE (right-of-way word — the largest type in the drawer —
 * its reason, and DECISION_ID; V01's right-rail grammar), the LIFECYCLE RAIL
 * (§32's five stops OBSERVING → PREPARING → IN TRADE → MANAGING → POST-EXIT /
 * REVIEW as ONE rail with the current stop lit; IMG_1554's node rail), and the
 * BOOK (thesis, risk, broker, orders, position, management, receipt — each in
 * the state this room can prove, and NOT READ where it reads nothing). The
 * rail reads the one lifecycle owner's stage and writes only through
 * `onPhase`.
 *
 * ONE VERDICT WORD (verifier MEDIUM, round 4): the headline plate is the
 * deck's one statement of the right of way. The drawer header carries no
 * verdict word (the room hands `verdict: null`) — SPEC "No second … WAIT
 * verdict" — and the right rail's WAIT plaque is the rail's, outside the
 * drawer. The Steward's own permission verdict is a DIFFERENT fact (the
 * trader's rules, not the market's right of way) and is said once, at the top
 * of STEWARD.
 *
 * GLOW BUDGET (§42 restrained): every glow in this file is ≤ 12% gold alpha —
 * the plate edge 5%, the verdict's halo 12%, the pressed node 12% (ring 10%).
 * `COMMAND_DECK_GLOW_BUDGET` is the number the tests hold the file to.
 *
 * WHAT IS DELIBERATELY NOT HERE — each for a stated reason
 * --------------------------------------------------------
 *   · "SYSTEM STATUS · OPTIMAL", "ALL SYSTEMS NOMINAL", "82% ALIGNED",
 *     "HEALTH 92%": decorative scores. Garden 15: "uncertainty without fake
 *     scores". A Sentinel reads this surface's rendered text for them.
 *   · AVAILABLE R: the right rail owns it (AvailableRChip). Two owners of the
 *     trader's risk budget one glance apart is the second-price defect.
 *   · The deck's private chart (DeckMarketChart) and HeroTruth: a second chart
 *     and a second price. The market camera is the one behind this drawer.
 *   · Volume profile / POC: chart paint (F09), already on the chart.
 *   · DecisionWhyPanel, the chain + lens, the passport, order flow: already
 *     owned on /charts (right rail and Tools equipment).
 *   · GateRailColumn (V06 wiring), SemanticZoom (chart-native), RealmGateway
 *     and every Link: navigation or superseded chrome. This drawer holds no
 *     href.
 *   · SceneAdmissionPanel, SignalProvenanceStrip, CapitalPostureLine,
 *     OneStoryStrip's scene gate: each needs a compiled SCENE, and /charts
 *     compiles none. Compiling one here to feed a drawer would be the second
 *     scene verdict the chain equipment's own note refuses.
 *   · ProviderWireStrip: it fetches its own readiness (a second request from
 *     inside a drawer), and /charts already hands it over in the broker panel.
 *   · DeckExpressionShortlist, PassportStamp: they belong to the decision
 *     rail's NEXT slot and the passport equipment. Separate migrations.
 *
 * ONE COMPILATION, READ
 * ---------------------
 * Everything market-derived arrives in `deck` (useChartCommandDeck, called
 * once by the room) or as a room prop. The only subscriptions made in this
 * file are the trader's own book — morning prep and the learning genome — in
 * slots that mount only while their section is on screen.
 */

import * as React from "react";
import { brokerRowFromRead, positionRowFromRead, ORDERS_ROW_WEBULL } from "./brokerBookRows";
import { useWebullBook } from "./useWebullBook";

import StoryRibbon from "@/components/chart/StoryRibbon";
import MirrorPanel from "@/components/mirror/MirrorPanel";
import ATHOSInterventionPanel from "@/components/athos/ATHOSInterventionPanel";
import PracticeHonestyLayer from "@/components/experience/PracticeHonestyLayer";
import DecisionReceiptPanel from "@/components/experience/DecisionReceiptPanel";
import ExitRampCard from "@/components/experience/ExitRampCard";
import { PrepChecklistBand } from "@/components/experience/PrepChecklistBand";
import OpeningBellEvidence from "@/components/opening-bell/OpeningBellEvidence";
import { LearningGenomeInspector } from "@/components/learningGenome/LearningGenomeInspector";
import { PerCapabilityFidelityGrid } from "@/components/marketData/PerCapabilityFidelityGrid";
import type { TradePhase } from "@/lib/marketData/viewModels/selectDecisionChain";
import type { MarketQualityState } from "@/lib/marketData/canonicalMarketState";
import type { PerCapabilityFidelityReport } from "@/lib/marketData/perCapabilityFidelity";
import type { DeckEmphasis, DeckSurface } from "@/lib/experience/selectDeckEmphasis";
import type { ExperienceMode } from "@/lib/experience/decisionContextBus";
import { selectPrepEvidence } from "@/lib/experience/openingBellPrep";
import {
  DECK_PHASE_LABEL,
  DECK_PHASE_ORDER,
  LIFECYCLE_RAIL,
  STAGE_WORD,
  railStopsForStage,
  stageForPhase,
  type LifecycleRailStop,
  type LifecycleStage,
} from "@/lib/experience/decisionLifecycle";
import type { RiskOnPriceVM } from "@/lib/marketData/viewModels/selectRiskOnPrice";
import { selectPrepChecklistBand } from "@/lib/experience/selectPrepChecklistBand";
import { useTodayPrep } from "@/lib/traderMemory/adapters/useTodayPrep";
import { useLearningGenomeBundle } from "@/lib/learningGenome/useLearningGenomeBundle";
import { WM } from "@/lib/design/wmTokens";
import type { ChartCommandDeck } from "./useChartCommandDeck";

// The frame's tokens, by value — WMOperatingSystem declares the same five.
const GOLD = "#c4a574";
const PEARL = "#ede6d3";
const RULE = "rgba(196,165,116,0.20)";
const MUTED = "#8a8271";
const HINT_INK = "#6f6857";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";
const FIELD = "#07080a";
/** Brass edge — the masthead plates' resting border, by value. */
const BRASS_EDGE = "rgba(196,165,116,0.42)";
/**
 * THE PLATE MATERIAL (§42: near-black depth, brass/gold hardware, restrained
 * glow). A near-black slab with a brass wash at its top edge, a pearl bevel,
 * a black inner keyline and a glow held under 6% — the IMG_1554 glass panel's
 * edge light, without its sunbeams.
 */
const PLATE: React.CSSProperties = {
  position: "relative",
  border: `1px solid ${BRASS_EDGE}`,
  borderRadius: 4,
  background:
    "linear-gradient(180deg, rgba(196,165,116,0.085) 0%, rgba(196,165,116,0.02) 34%, rgba(7,8,10,0) 100%), #0b0c0e",
  boxShadow:
    "inset 0 1px 0 rgba(237,230,211,0.07), inset 0 0 0 1px rgba(0,0,0,0.55), 0 0 22px rgba(196,165,116,0.05)",
};
/** Engraved lettering: a dark cut below, a faint pearl lip above. */
const ENGRAVED: React.CSSProperties = {
  textShadow: "0 1px 0 rgba(0,0,0,0.85), 0 -1px 0 rgba(237,230,211,0.07)",
};

/** §42 restrained glow: no gold glow in this drawer exceeds this alpha. */
export const COMMAND_DECK_GLOW_BUDGET = 0.12;

const EYEBROW: React.CSSProperties = {
  fontFamily: SERIF,
  fontSize: 10,
  letterSpacing: 1.6,
  textTransform: "uppercase",
  color: GOLD,
};

/**
 * The six presses, in the rail's order (LIFECYCLE_RAIL's presses, flattened).
 * The WORDS come from the one lifecycle owner (decisionLifecycle) so the
 * Workspace mode row's read-back and this rail can never name a stage two ways.
 */
export const COMMAND_DECK_PHASES: readonly { readonly id: TradePhase; readonly label: string }[] = DECK_PHASE_ORDER.map(
  (id) => ({ id, label: DECK_PHASE_LABEL[id] }),
);

export type CommandDeckSection = "PROCESS" | "STORY" | "STEWARD" | "RECEIPT" | "PREP_LEARN" | "WIRE";

/**
 * Which drawer section answers each of the deck emphasis selector's surfaces.
 * `WHY` is the permission's why-not; in this drawer the Steward's evaluated
 * rules are that half (the WHY panel itself is the right rail's). `PASSPORT`
 * has no section here — it is its own equipment — so it ranks nothing.
 */
const SURFACE_SECTION: Readonly<Partial<Record<DeckSurface, CommandDeckSection>>> = {
  STORY: "STORY",
  WHY: "STEWARD",
  RECEIPT: "RECEIPT",
};

/**
 * The drawer's physical order for the trader's current job.
 *
 * PROCESS is always first: it holds the controls, and a control that moves
 * about with the job is a control a trader has to hunt for. STORY / STEWARD /
 * RECEIPT follow in the order `selectDeckEmphasis` ranks their surfaces for the
 * job — the SAME ranking the deck page used, re-read, not re-decided. PREP ·
 * LEARN and WIRE close the drawer; the emphasis selector does not rank them,
 * and inventing a rank for them here would be a second emphasis owner.
 *
 * Real DOM order, not CSS `order`: a screen reader walks the DOM, and a
 * drawer whose reading order disagrees with its visual order is two drawers.
 */
export function commandDeckSectionOrder(emphasis: DeckEmphasis): readonly CommandDeckSection[] {
  const ranked: CommandDeckSection[] = [];
  for (const surface of emphasis.order) {
    const section = SURFACE_SECTION[surface];
    if (section && !ranked.includes(section)) ranked.push(section);
  }
  for (const section of ["STORY", "STEWARD", "RECEIPT"] as const) {
    if (!ranked.includes(section)) ranked.push(section);
  }
  return ["PROCESS", ...ranked, "PREP_LEARN", "WIRE"];
}

/**
 * Where the job's LEAD surface actually lives on /charts, when it is not a
 * section of this drawer. The rationale sentence is the deck page's, carried
 * verbatim; this is the half-sentence that keeps it true in a room where the
 * lead is somewhere else. `null` when the lead IS a drawer section.
 */
export function leadLivesElsewhere(lead: DeckSurface): string | null {
  switch (lead) {
    case "PASSPORT":
      return "The market object passport is its own equipment on this chart: Tools, Market object passport.";
    case "WHY":
      return "WHY / WHY NOT is on the decision rail beside the chart; the Steward below carries the rules behind it.";
    default:
      return null;
  }
}

/** Retrospective surfaces open in these jobs only — §9 INTERRUPTION LAW. */
function retrospectiveJob(job: ExperienceMode): boolean {
  return job === "REVIEW" || job === "LEARN";
}

export interface CommandDeckSurfaceProps {
  /** The room's one deck compilation (`useChartCommandDeck`). */
  readonly deck: ChartCommandDeck;
  /** ROOM state — read here, written only through `onPhase`. */
  readonly phase: TradePhase;
  readonly onPhase: (phase: TradePhase) => void;
  /**
   * The ONE lifecycle owner's stage for this market (`lifecycleStageFor`), which
   * lights the rail. `null` = a non-lifecycle job (LEARN): no stop is lit.
   */
  readonly stage: LifecycleStage | null;
  /** The room's current decision identity — read, never minted here (§33). */
  readonly decisionId: string | null;
  /** The room's own sentence for why there is no Decision_ID yet. */
  readonly decisionIdAbsence: string;
  /** Risk on Price — the plan the chart holds; `null` = not reported yet. */
  readonly risk: RiskOnPriceVM | null;
  /** The room's symbol — the fidelity grid names it; never resolved here. */
  readonly symbol: string;
  readonly ownerId: string | null;
  /** The room's cadence clock, for the morning-prep read. */
  readonly nowMs: number;
  /** The room's own canonical quality word, for the opening-bell line. */
  readonly dataQuality?: MarketQualityState;
  /** The room's ONE per-capability report — the fidelity chip reads it too. */
  readonly capabilityReport: PerCapabilityFidelityReport;
  /** The layer's stage signal, forwarded to every organ that caps a list. */
  readonly unabridged: boolean;
}

function Section({
  section,
  title,
  subtitle,
  children,
}: {
  section: CommandDeckSection;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}): React.ReactElement {
  const headingId = `command-deck-${section.toLowerCase()}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      data-testid={`command-deck-section-${section.toLowerCase()}`}
      data-section={section}
      style={{
        ...PLATE,
        borderColor: RULE,
        padding: "10px 12px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 0,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
          paddingBottom: 6,
          borderBottom: `1px solid ${RULE}`,
        }}
      >
        <h3 id={headingId} style={{ ...EYEBROW, ...ENGRAVED, margin: 0, fontWeight: 400 }}>
          {title}
        </h3>
        <span style={{ fontSize: 9.5, letterSpacing: 0.4, color: HINT_INK, textAlign: "right" }}>{subtitle}</span>
      </header>
      {children}
    </section>
  );
}

function Quiet({ children, testId }: { children: React.ReactNode; testId?: string }): React.ReactElement {
  return (
    <p data-testid={testId} style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: MUTED }}>
      {children}
    </p>
  );
}

/** Four brass rivets — the plate is hardware, bolted to the room. */
function Rivets(): React.ReactElement {
  const at: readonly React.CSSProperties[] = [
    { top: 5, left: 5 },
    { top: 5, right: 5 },
    { bottom: 5, left: 5 },
    { bottom: 5, right: 5 },
  ];
  return (
    <>
      {at.map((pos, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            position: "absolute",
            ...pos,
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #f0dcaa 0, #c4a574 45%, #5e4c30 100%)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.6)",
          }}
        />
      ))}
    </>
  );
}

/** A hallmark stamped on the plate's edge — PAPER, never a live account. */
function Hallmark({ children, testId }: { children: React.ReactNode; testId?: string }): React.ReactElement {
  return (
    <span
      data-testid={testId}
      style={{
        ...ENGRAVED,
        fontFamily: SERIF,
        fontSize: 9,
        letterSpacing: 1.6,
        textTransform: "uppercase",
        color: GOLD,
        border: `1px solid ${BRASS_EDGE}`,
        borderRadius: 2,
        padding: "1px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/**
 * THE HEADLINE PLATE — V01's right rail read top-down (WAIT · DECISION_ID),
 * cast as the deck's first plate. The verdict word is the LARGEST type in the
 * drawer; it and its reason are the room's one story (`deck.oneStory`), the
 * object the right rail prints — read, never recompiled. The Decision_ID is
 * the room's identity, or the room's own sentence for its absence.
 */
function HeadlinePlate({
  deck,
  decisionId,
  decisionIdAbsence,
}: {
  deck: ChartCommandDeck;
  decisionId: string | null;
  decisionIdAbsence: string;
}): React.ReactElement {
  const decision = deck.oneStory.decision;
  return (
    <div data-testid="command-deck-plate" style={{ ...PLATE, padding: "12px 14px 12px" }}>
      <Rivets />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ ...EYEBROW, ...ENGRAVED, fontSize: 9 }}>Right of way</span>
        <Hallmark testId="command-deck-paper">Paper</Hallmark>
      </div>
      {/*
        NO SECOND WAIT (SPEC §246/§342, Garden 11): "the right rail already
        owns WAIT … No second … WAIT verdict." Found on the glass 2026-09-27:
        this plate printed WAIT at 30px beside the rail's own WAIT plaque. The
        plate now leads with WHAT the rail's verdict is waiting on — the
        room's one decision detail — and names where the verdict lives. The
        verdict stays on the plate as data (data-verdict), never as a word.
      */}
      <p
        data-testid="command-deck-wait-reason"
        data-verdict={decision.value}
        style={{
          fontFamily: SERIF,
          fontSize: 17,
          lineHeight: 1.3,
          color: decision.tone === "warn" ? WM.state.objection : GOLD,
          textShadow: "0 1px 0 rgba(0,0,0,0.9)",
          margin: "8px 0 4px",
        }}
      >
        {decision.detail}
      </p>
      <p data-testid="command-deck-verdict-home" style={{ margin: 0, fontSize: 11, lineHeight: 1.45, color: MUTED }}>
        The verdict itself is the right rail's — one word, one place.
      </p>
      <div
        style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: `1px solid ${RULE}`,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <span style={{ ...EYEBROW, ...ENGRAVED, fontSize: 9, textTransform: "none", letterSpacing: 1.4 }}>
          DECISION_ID
        </span>
        {decisionId ? (
          <span
            data-testid="command-deck-decision-id"
            data-decision-id={decisionId}
            style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 0.3, color: PEARL, overflowWrap: "anywhere" }}
          >
            {decisionId}
          </span>
        ) : (
          <span data-testid="command-deck-decision-id-absent" style={{ fontSize: 11, lineHeight: 1.45, color: MUTED }}>
            {decisionIdAbsence}
          </span>
        )}
      </div>
    </div>
  );
}

type StopTense = "past" | "lit" | "ahead";

/**
 * The rail's columns, sized to the stops' words at the 1440 drawer (≈271px
 * rail): the two split stops (PREPARING, POST-EXIT / REVIEW) get the width
 * for two presses each. Measured on glass, not guessed — see the glass script.
 */
const RAIL_COLUMNS =
  "minmax(0, 1fr) minmax(0, 1.9fr) minmax(0, 0.9fr) minmax(0, 1fr) minmax(0, 1.8fr)";

function nodeStyle(on: boolean, lit: boolean, tense: StopTense): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    borderRadius: "50%",
    boxSizing: "border-box",
    border: `1px solid ${on || lit ? GOLD : tense === "past" ? BRASS_EDGE : RULE}`,
    background: on
      ? "radial-gradient(circle at 40% 38%, #f5e3b5 0, #c4a574 46%, #6d5836 100%)"
      : lit
        ? "radial-gradient(circle, rgba(196,165,116,0.35) 0, rgba(196,165,116,0.08) 70%)"
        : tense === "past"
          ? "rgba(196,165,116,0.16)"
          : FIELD,
    boxShadow: on
      ? "0 0 0 3px rgba(196,165,116,0.10), 0 0 10px rgba(196,165,116,0.12)"
      : "inset 0 1px 0 rgba(237,230,211,0.06)",
  };
}

const RAIL_LABEL: React.CSSProperties = {
  fontSize: 9,
  lineHeight: 1.15,
  letterSpacing: 0,
  textAlign: "center",
  whiteSpace: "nowrap",
};

/**
 * A stop with no press of its own (MANAGING — lit WITH In Trade, because both
 * are the chain's one POSITION phase). A plaque, not a button: a second button
 * writing the same stage would be two controls for one fact.
 */
function RailPlaque({ label, lit, tense }: { label: string; lit: boolean; tense: StopTense }): React.ReactElement {
  return (
    <span
      data-rail-plaque={label}
      style={{ flex: "1 1 0", minWidth: 0, minHeight: 48, padding: "0 1px 2px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, fontFamily: SERIF }}
    >
      <span aria-hidden="true" data-node={tense} style={nodeStyle(false, lit, tense)} />
      <span style={{ ...RAIL_LABEL, color: lit ? GOLD : tense === "past" ? "#a8997a" : MUTED }}>{label}</span>
    </span>
  );
}

/**
 * THE LIFECYCLE RAIL — §32's five stops as ONE rail, the current stop lit
 * (IMG_1554's PROCESS INTEGRITY node rail, in the Founder's current words).
 * It READS the one lifecycle owner's stage and WRITES only through `onPhase`
 * (the room's setter into that owner). Six presses on five stops:
 * PREPARING holds Approach + Decision (deciding is not yet a trade), IN TRADE
 * holds the POSITION press, MANAGING is lit WITH it (§32's second word for
 * the chain's one POSITION phase — no second button writing the same stage),
 * and POST-EXIT / REVIEW holds two.
 */
export function LifecycleRail({
  deck,
  stage,
  onPhase,
}: {
  deck: ChartCommandDeck;
  stage: LifecycleStage | null;
  onPhase: (phase: TradePhase) => void;
}): React.ReactElement {
  const litStops = stage === null ? [] : railStopsForStage(stage);
  const firstLit = litStops.length > 0 ? LIFECYCLE_RAIL.indexOf(litStops[0]) : -1;
  const management = deck.chain?.nodes.find((n) => n.key === "management") ?? null;
  const tenseOf = (i: number): StopTense =>
    firstLit < 0 ? "ahead" : litStops.includes(LIFECYCLE_RAIL[i]) ? "lit" : i < firstLit ? "past" : "ahead";
  const pressed = (stop: LifecycleRailStop, press: TradePhase): boolean =>
    stage !== null &&
    stop.stages.includes(stage) &&
    (stop.presses.length === 1 || stageForPhase(press) === stage);

  return (
    <div
      data-testid="command-deck-lifecycle"
      data-stage={stage ?? "NONE"}
      data-lit-stop={litStops.length > 0 ? litStops.map((s) => s.id).join(" ") : "NONE"}
      style={{ ...PLATE, padding: "10px 10px 10px" }}
    >
      <Rivets />
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "0 4px" }}>
        <span style={{ ...EYEBROW, ...ENGRAVED, fontSize: 9 }}>Decision lifecycle</span>
        <span data-testid="command-deck-stage-word" style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: 0.6, color: PEARL }}>
          {stage === null ? "Not in a lifecycle" : STAGE_WORD[stage]}
        </span>
      </div>

      <div style={{ position: "relative", marginTop: 8 }}>
        {/* The rail itself: one gold hairline through every node centre. */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 11,
            left: "8%",
            right: "8%",
            height: 1,
            background: "linear-gradient(90deg, rgba(196,165,116,0.15), rgba(196,165,116,0.55), rgba(196,165,116,0.15))",
          }}
        />
        <div
          role="group"
          aria-label="Trade phase"
          data-testid="command-deck-phase"
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: RAIL_COLUMNS,
            columnGap: 2,
          }}
        >
          {LIFECYCLE_RAIL.map((stop, i) => {
            const tense = tenseOf(i);
            return (
              <div
                key={stop.id}
                data-rail-stop={stop.id}
                data-tense={tense}
                style={{ display: "flex", justifyContent: "center", gap: 2, minWidth: 0 }}
              >
                {stop.presses.length === 0 ? (
                  <RailPlaque label={stop.label} lit={tense === "lit"} tense={tense} />
                ) : null}
                {stop.presses.map((press) => {
                  const on = pressed(stop, press);
                  const lit = tense === "lit";
                  const label = stop.presses.length === 1 ? stop.label : DECK_PHASE_LABEL[press];
                  return (
                    <button
                      key={press}
                      type="button"
                      data-phase={press}
                      aria-pressed={on}
                      aria-label={`${label}${stop.presses.length > 1 ? ` (${stop.label})` : ""} — the chain reads ${press.replace("_", "-").toLowerCase()}`}
                      onClick={() => onPhase(press)}
                      style={{
                        flex: "1 1 0",
                        minWidth: 0,
                        minHeight: 48,
                        padding: "0 1px 2px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 5,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontFamily: SERIF,
                      }}
                    >
                      <span aria-hidden="true" data-node={on ? "lit" : tense} style={nodeStyle(on, lit, tense)} />
                      <span
                        style={{ ...RAIL_LABEL, color: on ? PEARL : lit ? GOLD : tense === "past" ? "#a8997a" : MUTED }}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        {/* The split stops' brackets: PREPARING and "POST-EXIT / REVIEW" are
            each ONE stop (§32) holding two presses. */}
        <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: RAIL_COLUMNS, columnGap: 2 }}>
          <span style={{ gridColumn: 2, margin: "0 8px", borderTop: `1px solid ${RULE}`, height: 3 }} />
          <span style={{ gridColumn: 5, margin: "0 8px", borderTop: `1px solid ${RULE}`, height: 3 }} />
        </div>
      </div>

      {/* ONE LIFECYCLE (Garden 16 §15/§32): this rail and the Workspace's
          Experience mode row write the SAME stage. Said once. */}
      <span
        data-testid="command-deck-lifecycle-owner"
        style={{ display: "block", marginTop: 6, padding: "0 4px", fontSize: 10, lineHeight: 1.4, color: HINT_INK }}
      >
        {deck.job === "LEARN"
          ? "Your job is LEARN — not a trade-lifecycle stage. Pressing a stop re-enters the lifecycle."
          : "One lifecycle: the Workspace mode row and this rail move together."}
      </span>

      {/* THE CHAIN, READING THE STAGE — the room's own chain headline,
          compiled with the phase just pressed. */}
      <div
        data-testid="command-deck-chain-reading"
        style={{
          marginTop: 8,
          padding: "8px 4px 0",
          borderTop: `1px solid ${RULE}`,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <span style={{ fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: HINT_INK }}>
          The decision chain reads this stage
        </span>
        {deck.chain ? (
          <>
            <span data-testid="command-deck-chain-headline" style={{ fontSize: 12, lineHeight: 1.45, color: PEARL }}>
              {deck.chain.headline}
            </span>
            {management ? (
              <span data-testid="command-deck-management" style={{ fontSize: 11, color: MUTED }}>
                Management · {management.verdict.toLowerCase()} — {management.narrative}
              </span>
            ) : null}
          </>
        ) : (
          <Quiet testId="command-deck-chain-unresolved">
            The chain has not compiled for this market yet. The stage is held, and the chain will read it
            the moment it compiles.
          </Quiet>
        )}
      </div>
    </div>
  );
}

interface BookRow {
  readonly key: string;
  readonly label: string;
  /** The state word, in caps — the only thing a glance needs. */
  readonly state: string;
  readonly detail: string;
  readonly tone: "set" | "quiet" | "refused";
}

/**
 * The risk row, from the plan the chart holds. R:R and the plan's state only —
 * never a price (the chart draws the brackets; a second price is the defect).
 */
export function riskRow(risk: RiskOnPriceVM | null): BookRow {
  if (!risk) {
    return { key: "risk", label: "Risk", state: "UNKNOWN", detail: "Risk on Price has not reported to this room.", tone: "quiet" };
  }
  if (!risk.drawn) {
    switch (risk.reason) {
      case "NO_STOP_ON_DRAWING":
        return { key: "risk", label: "Risk", state: "NO STOP", detail: "The drawn position carries no stop — risk is undefined.", tone: "refused" };
      case "STOP_ON_WRONG_SIDE":
        return { key: "risk", label: "Risk", state: "REFUSED", detail: "The stop sits on the wrong side of entry.", tone: "refused" };
      default:
        return { key: "risk", label: "Risk", state: "NO PLAN", detail: "No position is drawn on this chart.", tone: "quiet" };
    }
  }
  const rr = risk.rr !== null && Number.isFinite(risk.rr) ? `${risk.rr.toFixed(2)} R:R` : "R:R unknown";
  const where = risk.state ? risk.state.replace(/_/g, " ").toLowerCase() : "state unread";
  return {
    key: "risk",
    label: "Risk",
    state: "PLANNED",
    // No execution claim (verifier HIGH, round 4): this row reads the plan the
    // chart DRAWS, not the paper ledger or a broker — it cannot know whether
    // anything was filled, so it says only what the drawing is.
    detail: `${risk.side ?? "Side unknown"} plan on price · ${rr} · ${where}. A drawing on the chart — this row reads no orders or fills.`,
    tone: "set",
  };
}

/**
 * THE BOOK — §32's attachments that are not the market: thesis, risk, broker,
 * orders, position, management, receipt. V01's rail grammar (engraved label,
 * state word) in rows. Every state is what this room can PROVE: it reads no
 * broker connection, no broker book and no order book, so those say NOT READ
 * / UNOBSERVED in words — flat, "no orders" and "not connected" are findings,
 * never defaults (§14.1, §36 AUTH ≠ ENTITLEMENT, MOCK ≠ REAL ACCOUNT).
 *
 * THE BROKER ROW (verifier HIGH, round 4): it printed "NOT CONNECTED — the
 * deck is paper only" while nothing in this room reads the connection. The
 * only broker-status read on /charts is BrokerConnectPanel's own
 * `/api/broker/status` fetch, which runs only while that panel is open, and
 * the drawer makes no fetch (SPEC "No … fetch"). So the row says NOT READ.
 */
export const BROKER_ROW: BookRow = {
  key: "broker",
  label: "Broker",
  state: "NOT READ",
  detail: "This drawer does not read the broker connection. The Connect brokers panel reads it when opened.",
  tone: "quiet",
};

function BookPlate({ deck, risk, symbol }: { deck: ChartCommandDeck; risk: RiskOnPriceVM | null; symbol: string }): React.ReactElement {
  const management = deck.chain?.nodes.find((n) => n.key === "management") ?? null;
  const book = useWebullBook();
  const brokerRow = brokerRowFromRead(book.status) ?? BROKER_ROW;
  const positionRow = positionRowFromRead(book.positions, symbol);
  const rows: readonly BookRow[] = [
    {
      key: "thesis",
      label: "Thesis",
      state: deck.oneStory.contradiction ? "CONTESTED" : "READ",
      detail: deck.oneStory.primary,
      tone: "set",
    },
    riskRow(risk),
    brokerRow,
    book.status ? ORDERS_ROW_WEBULL : {
      key: "orders",
      label: "Orders",
      state: "UNOBSERVED",
      detail: "This drawer reads no order book. The Alpaca paper account panel reads paper orders when opened.",
      tone: "quiet",
    },
    positionRow ?? {
      key: "position",
      label: "Position",
      state: "UNOBSERVED",
      detail: "This drawer reads no position — flat is never assumed. The Alpaca paper account panel reads paper positions when opened.",
      tone: "quiet",
    },
    {
      key: "management",
      label: "Management",
      state: management ? management.verdict.replace(/_/g, " ") : "UNRESOLVED",
      detail: management ? management.narrative : "The chain has not compiled for this market yet.",
      tone: management ? "set" : "quiet",
    },
    {
      key: "receipt",
      label: "Receipt",
      state: deck.receipt.empty ? "NONE SEALED" : "SEALED",
      detail: deck.receipt.empty ? "No decision has been sealed to a receipt." : deck.receipt.headline,
      tone: deck.receipt.empty ? "quiet" : "set",
    },
  ];
  return (
    <div data-testid="command-deck-book" style={{ ...PLATE, padding: "10px 12px 8px" }}>
      <Rivets />
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
        <span style={{ ...EYEBROW, ...ENGRAVED, fontSize: 9 }}>The book</span>
        <Hallmark testId="command-deck-book-hallmark">Read only</Hallmark>
      </div>
      <dl style={{ margin: 0, display: "flex", flexDirection: "column" }}>
        {rows.map((row) => (
          <div
            key={row.key}
            data-testid={`command-deck-row-${row.key}`}
            data-state={row.state}
            style={{ padding: "6px 0", borderTop: `1px solid ${RULE}`, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <dt style={{ ...EYEBROW, ...ENGRAVED, fontSize: 9, letterSpacing: 1.4 }}>{row.label}</dt>
              <dd
                style={{
                  margin: 0,
                  fontFamily: SERIF,
                  fontSize: 10.5,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: row.tone === "refused" ? WM.state.objection : row.tone === "set" ? PEARL : MUTED,
                  textAlign: "right",
                }}
              >
                {row.state}
              </dd>
            </div>
            <dd style={{ margin: 0, fontSize: 10.5, lineHeight: 1.4, color: MUTED }}>{row.detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * PROCESS — the job half of the control surface. The lifecycle rail above is
 * the stage; this is the job the trader is in, the suggestion (suggest, never
 * gate), and the rationale the drawer is ordered by.
 */
function ProcessSection({ deck }: { deck: ChartCommandDeck }): React.ReactElement {
  const suggestion = deck.jobSuggestion.strength !== "NONE" ? deck.jobSuggestion.inference : null;
  const hint = deck.jobSuggestion.strength === "HINT";
  const elsewhere = leadLivesElsewhere(deck.emphasis.lead);
  return (
    <Section section="PROCESS" title="Process" subtitle="job · why this order">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 10px" }}>
        <span style={{ fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: HINT_INK }}>Job</span>
        <span data-testid="command-deck-job" style={{ fontFamily: SERIF, fontSize: 12, letterSpacing: 1, color: PEARL }}>
          {deck.job}
        </span>
        {/* SUGGEST, NEVER GATE. The chip writes the one job bus only when
            pressed; WM never switches the trader's job for them. */}
        {suggestion ? (
          <button
            type="button"
            data-testid="command-deck-job-suggestion"
            data-strength={deck.jobSuggestion.strength}
            onClick={() => deck.acceptJob(suggestion.suggested)}
            title={suggestion.reason}
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: 6,
              minHeight: 28,
              padding: "3px 9px",
              borderRadius: 3,
              border: hint ? `1px dashed ${RULE}` : `1px solid ${BRASS_EDGE}`,
              background: "transparent",
              color: GOLD,
              fontSize: 10,
              letterSpacing: 0.4,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{ color: MUTED }}>{hint ? "Possibly" : "Suggested job"}</span>
            <span style={{ fontWeight: 600 }}>{suggestion.suggested}</span>
          </button>
        ) : null}
      </div>
      {suggestion ? <Quiet>{suggestion.reason}</Quiet> : null}

      <div data-testid="command-deck-rationale" style={{ fontSize: 11, lineHeight: 1.5, color: MUTED }}>
        {deck.emphasis.rationale}
        {deck.emphasis.refinementNote ? ` Here, ${deck.emphasis.refinementNote}.` : null}
        {elsewhere ? <span style={{ display: "block", marginTop: 3, color: HINT_INK }}>{elsewhere}</span> : null}
      </div>

      <div
        data-testid="command-deck-reads"
        style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", fontSize: 10, color: HINT_INK, letterSpacing: 0.3 }}
      >
        <span>
          {deck.unreviewedCloses.total} unreviewed close{deck.unreviewedCloses.total === 1 ? "" : "s"}
        </span>
        <span>
          {deck.permission.engagedRules.length} of {deck.permission.ruleCount} steward rules engaged
        </span>
      </div>
    </Section>
  );
}

function StorySection({ deck }: { deck: ChartCommandDeck }): React.ReactElement {
  return (
    <Section section="STORY" title="Story" subtitle="the market's chapters, with continuity">
      <StoryRibbon state={deck.state} history={deck.history} story={deck.story} />
    </Section>
  );
}

function StewardSection({
  deck,
  phase,
  unabridged,
}: {
  deck: ChartCommandDeck;
  phase: TradePhase;
  unabridged: boolean;
}): React.ReactElement {
  const { permission } = deck;
  return (
    <Section section="STEWARD" title="Steward" subtitle="rules · mirror · watch · honesty">
      {/* THE STEWARD'S VERDICT — the trader's own rules' word (PermissionVM),
          said HERE and only here: the drawer header carries no verdict and the
          headline plate is the market's right of way, a different fact. */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: HINT_INK }}>Your rules say</span>
        <span
          data-testid="command-deck-steward-verdict"
          data-verdict={permission.verdict}
          style={{
            fontFamily: SERIF,
            fontSize: 12,
            letterSpacing: 1.2,
            color: permission.verdict === "RESTRICTED" ? WM.state.objection : PEARL,
          }}
        >
          {permission.verdict.replace(/_/g, " ")}
        </span>
      </div>
      {/* THE RULES — why the Steward says that word. */}
      <div data-testid="command-deck-steward-rules" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, lineHeight: 1.45, color: PEARL }}>{permission.headline}</span>
        <Quiet>{permission.reason}</Quiet>
        {permission.engagedRules.length > 0 ? (
          <ul style={{ listStyle: "none", margin: "4px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {permission.engagedRules.map((r, i) => (
              <li
                key={`${r.rule.id}-${i}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  padding: "4px 8px",
                  borderLeft: `2px solid ${r.rule.kind === "HARD" ? WM.state.objection : GOLD}`,
                }}
              >
                <span style={{ fontSize: 11, color: PEARL }}>
                  <span style={{ fontSize: 9, letterSpacing: 0.6, color: r.rule.kind === "HARD" ? WM.state.objection : GOLD }}>
                    {r.rule.kind}
                  </span>{" "}
                  {r.rule.label}
                </span>
                <span style={{ fontSize: 10.5, lineHeight: 1.4, color: MUTED }}>{r.reason}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* THE MIRROR — gated to the moments it is not an overclaim, exactly as
          the deck gates it (theMirrorIsNotAMarketPanel). The phase control
          above opens it; nothing else does. */}
      <div data-testid="command-deck-mirror" style={{ borderTop: `1px solid ${RULE}`, paddingTop: 8 }}>
        <span style={{ fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: HINT_INK }}>
          Your behaviour mirror
        </span>
        {(phase === "REVIEW" || phase === "POST_EXIT") ? (
          deck.mirror.patterns.length > 0 ? (
            <MirrorPanel vm={deck.mirror} unabridged={unabridged} />
          ) : (
            <Quiet>{deck.mirror.reason ?? "No decisions in scope — the mirror has nothing to reflect yet."}</Quiet>
          )
        ) : (
          <Quiet>The mirror reflects a trade you have finished. It opens at Post-Exit and Review.</Quiet>
        )}
      </div>

      {/* WHAT WM IS WATCHING — disclosed (a pressed door answers in words),
          with a dismiss that actually holds for this sitting. */}
      <div data-testid="command-deck-watch" style={{ borderTop: `1px solid ${RULE}`, paddingTop: 8 }}>
        <span style={{ fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: HINT_INK }}>
          What WM is watching
        </span>
        <ATHOSInterventionPanel
          interventions={deck.interventions}
          onDismiss={deck.dismissIntervention}
          disclosed
          unabridged={unabridged}
        />
      </div>

      {/* PRACTICE HONESTY — §9: a look backwards waits for REVIEW / LEARN. */}
      <div data-testid="command-deck-practice" style={{ borderTop: `1px solid ${RULE}`, paddingTop: 8 }}>
        <span style={{ fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: HINT_INK }}>
          Your practice honesty
        </span>
        {retrospectiveJob(deck.job) ? (
          <PracticeHonestyLayer disclosed unabridged={unabridged} />
        ) : (
          <Quiet>Held back until your job is Review or Learn. It is a look backwards, and it can wait.</Quiet>
        )}
      </div>
    </Section>
  );
}

function ReceiptSection({ deck }: { deck: ChartCommandDeck }): React.ReactElement {
  return (
    <Section section="RECEIPT" title="Receipt" subtitle="the sealed decision · can I stop now">
      <DecisionReceiptPanel vm={deck.receipt} />
      <ExitRampCard ramp={deck.exitRamp} presentation="embedded" />
    </Section>
  );
}

/** The trader's morning — their own book, subscribed only while on screen. */
function PrepSlot({
  ownerId,
  nowMs,
  dataQuality,
}: {
  ownerId: string | null;
  nowMs: number;
  dataQuality?: MarketQualityState;
}): React.ReactElement {
  const prep = useTodayPrep(ownerId, nowMs);
  const evidence = selectPrepEvidence({
    readState: prep.readState,
    checklistDone: prep.checklistDone,
    checklistTotal: prep.checklistTotal,
  });
  const band = selectPrepChecklistBand(evidence);
  return (
    <div data-testid="command-deck-prep" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* No prep link: this drawer carries no navigation. */}
      <OpeningBellEvidence evidence={evidence} dataQuality={dataQuality} showPrepLink={false} />
      {band ? (
        <PrepChecklistBand band={band} testId="command-deck-prep-checklist" caption={(b) => `${b.done} of ${b.total} checked`} />
      ) : null}
    </div>
  );
}

/** The learning genome — the trader's own record, read only when admitted. */
function GenomeSlot({ unabridged }: { unabridged: boolean }): React.ReactElement {
  const bundle = useLearningGenomeBundle();
  if (!bundle) return <Quiet>Your record is still being read.</Quiet>;
  return (
    <LearningGenomeInspector
      genome={bundle.genome}
      drill={bundle.drill}
      misread={bundle.misread}
      trend={bundle.trend}
      focusStreak={bundle.focus_streak}
      ruleAdherenceStreak={bundle.rule_adherence_streak}
      dayModelCoverage={bundle.day_model_coverage}
      dualSideGuard={bundle.dual_side_guard}
      weekMaturity={bundle.week_maturity}
      unabridged={unabridged}
    />
  );
}

function PrepLearnSection({
  deck,
  ownerId,
  nowMs,
  dataQuality,
  unabridged,
}: {
  deck: ChartCommandDeck;
  ownerId: string | null;
  nowMs: number;
  dataQuality?: MarketQualityState;
  unabridged: boolean;
}): React.ReactElement {
  return (
    <Section section="PREP_LEARN" title="Prep · Learn" subtitle="this morning · your bottleneck">
      <PrepSlot ownerId={ownerId} nowMs={nowMs} dataQuality={dataQuality} />
      <div data-testid="command-deck-genome" style={{ borderTop: `1px solid ${RULE}`, paddingTop: 8 }}>
        <span style={{ fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: HINT_INK }}>
          Your learning genome
        </span>
        {retrospectiveJob(deck.job) ? (
          <GenomeSlot unabridged={unabridged} />
        ) : (
          <Quiet>Held back while the room belongs to the market. It opens when your job is Review or Learn.</Quiet>
        )}
      </div>
    </Section>
  );
}

function WireSection({
  symbol,
  capabilityReport,
}: {
  symbol: string;
  capabilityReport: PerCapabilityFidelityReport;
}): React.ReactElement {
  return (
    <Section section="WIRE" title="Wire" subtitle="what each capability is really fed by">
      <PerCapabilityFidelityGrid report={capabilityReport} symbol={symbol} showUnevaluated />
    </Section>
  );
}

export function CommandDeckSurface({
  deck,
  phase,
  onPhase,
  stage,
  decisionId,
  decisionIdAbsence,
  risk,
  symbol,
  ownerId,
  nowMs,
  dataQuality,
  capabilityReport,
  unabridged,
}: CommandDeckSurfaceProps): React.ReactElement {
  const order = commandDeckSectionOrder(deck.emphasis);
  const render = (section: CommandDeckSection): React.ReactElement => {
    switch (section) {
      case "PROCESS":
        return <ProcessSection key={section} deck={deck} />;
      case "STORY":
        return <StorySection key={section} deck={deck} />;
      case "STEWARD":
        return <StewardSection key={section} deck={deck} phase={phase} unabridged={unabridged} />;
      case "RECEIPT":
        return <ReceiptSection key={section} deck={deck} />;
      case "PREP_LEARN":
        return (
          <PrepLearnSection
            key={section}
            deck={deck}
            ownerId={ownerId}
            nowMs={nowMs}
            dataQuality={dataQuality}
            unabridged={unabridged}
          />
        );
      case "WIRE":
        return <WireSection key={section} symbol={symbol} capabilityReport={capabilityReport} />;
    }
  };
  // THE PLATE'S HIERARCHY (deck canon, 2026-09-27): the verdict + Decision_ID
  // first and largest, the lifecycle rail directly beneath it, then the book
  // (§32's attachments), then the organs in the job's order.
  return (
    <div
      data-testid="command-deck-surface"
      data-section-order={order.join(" ")}
      style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 10, minWidth: 0 }}
    >
      <HeadlinePlate deck={deck} decisionId={decisionId} decisionIdAbsence={decisionIdAbsence} />
      <LifecycleRail deck={deck} stage={stage} onPhase={onPhase} />
      <BookPlate deck={deck} risk={risk} symbol={symbol} />
      {order.map(render)}
    </div>
  );
}

export default CommandDeckSurface;
