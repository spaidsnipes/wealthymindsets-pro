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
import { DECK_PHASE_LABEL, DECK_PHASE_ORDER } from "@/lib/experience/decisionLifecycle";
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

const EYEBROW: React.CSSProperties = {
  fontFamily: SERIF,
  fontSize: 10,
  letterSpacing: 1.6,
  textTransform: "uppercase",
  color: GOLD,
};

/**
 * The six phases. The ORDER and the WORDS come from the one
 * lifecycle owner (decisionLifecycle) so the Workspace mode row's read-back and
 * this control can never name the same phase two ways.
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
        border: `1px solid ${RULE}`,
        borderRadius: 3,
        padding: "10px 12px 12px",
        background: "linear-gradient(180deg, rgba(196,165,116,0.05), rgba(196,165,116,0.012))",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 0,
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <h3 id={headingId} style={{ ...EYEBROW, margin: 0, fontWeight: 400 }}>
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

/**
 * PROCESS — the controls. The phase control is the proof the surface is real:
 * it writes ROOM state, and the chain headline directly beneath it is that
 * room's chain, recompiled with the new phase, read back.
 */
function ProcessSection({
  deck,
  phase,
  onPhase,
}: {
  deck: ChartCommandDeck;
  phase: TradePhase;
  onPhase: (phase: TradePhase) => void;
}): React.ReactElement {
  const management = deck.chain?.nodes.find((n) => n.key === "management") ?? null;
  const suggestion = deck.jobSuggestion.strength !== "NONE" ? deck.jobSuggestion.inference : null;
  const hint = deck.jobSuggestion.strength === "HINT";
  const elsewhere = leadLivesElsewhere(deck.emphasis.lead);
  return (
    <Section section="PROCESS" title="Process" subtitle="phase · job · the chain that reads them">
      <div
        role="group"
        aria-label="Trade phase"
        data-testid="command-deck-phase"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}
      >
        {COMMAND_DECK_PHASES.map((p) => {
          const on = p.id === phase;
          return (
            <button
              key={p.id}
              type="button"
              data-phase={p.id}
              aria-pressed={on}
              onClick={() => onPhase(p.id)}
              style={{
                minHeight: 36,
                padding: "6px 4px",
                borderRadius: 3,
                border: `1px solid ${on ? GOLD : RULE}`,
                background: on ? "rgba(196,165,116,0.14)" : "transparent",
                color: on ? PEARL : MUTED,
                fontFamily: SERIF,
                fontSize: 11,
                letterSpacing: 0.4,
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* ONE LIFECYCLE (Garden 16 §15/§32): this control and the Workspace's
          Experience mode row write the SAME stage. Said once, so the trader
          knows pressing either moves both. */}
      <span data-testid="command-deck-lifecycle-owner" style={{ fontSize: 10, lineHeight: 1.4, color: HINT_INK }}>
        {deck.job === "LEARN"
          ? "Your job is LEARN — not a trade-lifecycle stage. Pressing a phase re-enters the lifecycle."
          : "One lifecycle: the Workspace mode row and this phase move together."}
      </span>

      {/* THE CHAIN, READING THE PHASE. Not a caption about the control — the
          room's own chain headline, compiled with the phase just pressed. */}
      <div data-testid="command-deck-chain-reading" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: HINT_INK }}>
          The decision chain reads this phase
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
            The chain has not compiled for this market yet. The phase is held, and the chain will read it
            the moment it compiles.
          </Quiet>
        )}
      </div>

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
              border: hint ? `1px dashed ${RULE}` : `1px solid rgba(196,165,116,0.42)`,
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
      {/* THE RULES — the same permission the rail's verdict is compiled from.
          Its verdict word is in the drawer's header already; this says WHY. */}
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
        return <ProcessSection key={section} deck={deck} phase={phase} onPhase={onPhase} />;
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
  return (
    <div
      data-testid="command-deck-surface"
      data-section-order={order.join(" ")}
      style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 10, minWidth: 0 }}
    >
      {order.map(render)}
    </div>
  );
}

export default CommandDeckSurface;
