"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCanonicalMarketState,
  useCanonicalMarketStateHistory,
} from "@/lib/marketData/useCanonicalMarketState";
import { usePublishChartMarketState } from "@/lib/marketData/chartMarketStatePublisher";
import { canonicalMarketStateIdentity } from "@/lib/marketData/canonicalIdentity";
import { useWebSocket } from "@/hooks/useWebSocket";
import { selectDecisionChain, type TradePhase } from "@/lib/marketData/viewModels/selectDecisionChain";
import { selectMarketStory } from "@/lib/marketData/viewModels/selectMarketStory";
import DecisionChainPanel from "@/components/chart/DecisionChainPanel";
import StructureContextNote from "@/components/chart/StructureContextNote";
import StoryRibbon from "@/components/chart/StoryRibbon";
import ATHOSInterventionPanel from "@/components/athos/ATHOSInterventionPanel";
import { selectATHOSIntervention, type ATHOSIntervention } from "@/lib/traderMemory/viewModels/selectATHOSIntervention";
import { selectPermission, defaultFounderRules } from "@/lib/traderMemory/viewModels/selectPermission";
import MirrorPanel from "@/components/mirror/MirrorPanel";
import OpeningBellPanel from "@/components/opening-bell/OpeningBellPanel";
import { selectMirror } from "@/lib/traderMemory/viewModels/selectMirror";
import { selectOpeningBell, DEFAULT_PREPARATION_TEMPLATE } from "@/lib/traderMemory/viewModels/selectOpeningBell";
import { useDecisionMemory, useDecisionMemoryRecords } from "@/lib/traderMemory/useDecisionMemory";
import { useJournalSnapshots } from "@/lib/traderMemory/adapters/useJournalSnapshots";
import PersonalEdgeChip from "@/components/journal/PersonalEdgeChip";
import { selectPersonalEdge } from "@/lib/traderMemory/viewModels/selectPersonalEdge";
import HeroTruth from "@/components/command-deck/HeroTruth";
import DLARStrip, { type DLARDimensionKey } from "@/components/command-deck/DLARStrip";
import WhyInspector, { type WhyTarget } from "@/components/command-deck/WhyInspector";
import WmWordmark from "@/components/brand/WmWordmark";
import SectionBanner from "@/components/brand/SectionBanner";
import CinematicAtmosphere from "@/components/brand/CinematicAtmosphere";
import RealmGateway from "@/components/brand/RealmGateway";
import DoctrineTagline from "@/components/brand/DoctrineTagline";
import { useTodayPrep } from "@/lib/traderMemory/adapters/useTodayPrep";
import CommandContextRibbon from "@/components/command/CommandContextRibbon";
import OneStoryStrip from "@/components/command/OneStoryStrip";
import MarketObjectPassportPanel from "@/components/experience/MarketObjectPassportPanel";
import { selectMarketObjectPassport } from "@/lib/marketData/viewModels/selectMarketObjectPassport";
import DecisionWhyPanel from "@/components/experience/DecisionWhyPanel";
import { selectDecisionWhyNot } from "@/lib/marketData/viewModels/selectDecisionWhyNot";
import DecisionReceiptPanel from "@/components/experience/DecisionReceiptPanel";
import { selectDecisionReceipt } from "@/lib/traderMemory/viewModels/selectDecisionReceipt";
import { selectOneStory } from "@/lib/marketData/viewModels/selectOneStory";
import ExperienceModeBar from "@/components/experience/ExperienceModeBar";
import { useDecisionContext } from "@/lib/experience/useDecisionContext";
import { shellEmphasis } from "@/lib/experience/shellLayout";
import { routeQuestion } from "@/lib/experience/questionRouter";
import { selectDeckEmphasis, surfaceOrder } from "@/lib/experience/selectDeckEmphasis";
import { inferJobMode } from "@/lib/experience/inferJobMode";
import { selectJobSuggestion } from "@/lib/experience/selectJobSuggestion";
import { useLearningGenomeBundle } from "@/lib/learningGenome/useLearningGenomeBundle";
import { LearningGenomeInspector } from "@/components/learningGenome/LearningGenomeInspector";

/**
 * /command-deck — the composed Command Deck surface.
 *
 * Aug-14 transformation (Founder correction §"START WITH /command-deck"):
 * Visual + information hierarchy is now:
 *
 *   HERO TRUTH   ← 1s dominant message (symbol + price + quality verdict)
 *   ↓
 *   PRIMARY CHART SLOT (deferred — link to /charts today, embed next)
 *   ↓
 *   STORY RIBBON (real producer state — UNKNOWN when unknown, honest)
 *   ↓
 *   DIRECTION × LOCATION × AGGRESSION × RESPONSE (compact strip)
 *   ↓
 *   AVAILABLE R / PROCESS / STEWARD  (decision chain panel)
 *   ↓
 *   NECTAR / DATA FIDELITY / MEMORY HEALTH
 *   ↓
 *   WHY? / EVIDENCE INSPECTOR (opens on click, one deliberate step away)
 *
 * Every panel renders truthfully — UNKNOWN stays UNKNOWN, MISSING stays
 * MISSING, STALE stays STALE. Zero fabrication. Progressive disclosure
 * via WhyInspector so beginners get one hero truth and pros can drill.
 */

type CommandPhase = TradePhase;

const PHASES: readonly { id: CommandPhase; label: string }[] = [
  { id: "PREPARATION", label: "Prep" },
  { id: "APPROACH", label: "Approach" },
  { id: "DECISION", label: "Decide" },
  { id: "POSITION", label: "In Trade" },
  { id: "POST_EXIT", label: "Post-Exit" },
  { id: "REVIEW", label: "Review" },
];

export default function CommandDeckPage() {
  // useSearchParams must be inside a Suspense boundary during SSG. The
  // whole page reads it, so wrap the surface in a Suspense fallback that
  // shows the deep-obsidian shell instantly.
  return (
    <React.Suspense fallback={<div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #050506 0%, #0b0b0d 100%)" }} />}>
      <CommandDeckInner />
    </React.Suspense>
  );
}

function CommandDeckInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { activeSymbol, setActiveSymbol } = useActiveSymbol();
  // URL param wins over SymbolContext so external links (/heatmaps cell
  // click, /scanner row action, docs link) can seed the deck to a
  // specific market without touching the app-wide symbol state.
  const urlSymbol = searchParams?.get("symbol");
  const urlTf = searchParams?.get("tf");
  const symbol = (urlSymbol || activeSymbol || "TSLA").toUpperCase();
  const timeframe = (urlTf || "15m").toLowerCase();
  React.useEffect(() => {
    // If a URL symbol was supplied, thread it into SymbolContext so a
    // subsequent nav to /charts keeps the same symbol (Founder Aug-14
    // §15 'context continuity').
    if (urlSymbol && urlSymbol.toUpperCase() !== activeSymbol) {
      setActiveSymbol(urlSymbol.toUpperCase());
    }
  }, [urlSymbol, activeSymbol, setActiveSymbol]);
  const [phase, setPhase] = React.useState<CommandPhase>("PREPARATION");
  const [whyTarget, setWhyTarget] = React.useState<WhyTarget | null>(null);
  const [showEvidence, setShowEvidence] = React.useState<boolean>(false);

  // Experience layer (Founder Phase 1): the seven operating states reorganise
  // the shell's EMPHASIS around the human's current job — the market truth
  // below is untouched. `context.mode` is the live job; `emphasis.job` is its
  // single-line caption. This surface is the first WM Experience Shell cutover.
  const { context: experienceContext, setMode: setExperienceMode } = useDecisionContext();
  const experienceEmphasis = shellEmphasis(experienceContext.mode);

  // Identity routes through canonicalMarketStateIdentity — the SAME helper
  // chartMarketStatePublisher writes with — so the deck cannot silently
  // drift from the writer again (b46fa64 was the P0; the contract test in
  // canonicalIdentity.test.ts guarantees writer == reader). Never assemble
  // literals like `${symbol}:NASDAQ` inline here.
  const identity = React.useMemo(
    () => canonicalMarketStateIdentity({ symbol, timeframe, extHours: false }),
    [symbol, timeframe],
  );

  // Subscribe to the WS + publish canonical state for this symbol so a
  // direct landing on /command-deck (without opening /charts first)
  // still populates the store. The tape hub dedupes so double-connect
  // with an open /charts tab is safe.
  const wsFeed = useWebSocket({ symbol, timeframe });
  usePublishChartMarketState({
    symbol,
    timeframe,
    session: identity.session,
    ticker: wsFeed.ticker,
    recentTicks: wsFeed.recentTicks,
    source: wsFeed.source,
    connected: wsFeed.connected,
  });

  const state = useCanonicalMarketState(identity);
  const history = useCanonicalMarketStateHistory(identity, 6);
  const storeDecisions = useDecisionMemory(user?.id ?? null);
  const decisionRecords = useDecisionMemoryRecords(user?.id ?? null);
  const journalDecisions = useJournalSnapshots(user?.id ?? null);
  const sessionDecisions = React.useMemo(
    () => {
      const ids = new Set(storeDecisions.map((d) => d.decisionId));
      return [...storeDecisions, ...journalDecisions.filter((d) => !ids.has(d.decisionId))];
    },
    [storeDecisions, journalDecisions],
  );
  const personalEdgeVm = React.useMemo(
    () =>
      selectPersonalEdge({
        ownerId: user?.id ?? "",
        decisions: sessionDecisions,
        nowMs: Date.now(),
      }),
    [user?.id, sessionDecisions],
  );

  const chainVm = React.useMemo(() => {
    if (!state) return null;
    return selectDecisionChain({
      state,
      history,
      nowMs: Date.now(),
      phase,
    });
  }, [state, history, phase]);

  const athos = React.useMemo(() => {
    const momentMap: Record<CommandPhase, ATHOSIntervention["moment"]> = {
      PREPARATION: "IDLE",
      APPROACH: "PRE_ENTRY",
      DECISION: "AT_ENTRY_TRIGGER",
      POSITION: "IN_POSITION",
      POST_EXIT: "POST_EXIT",
      REVIEW: "SESSION_REVIEW",
    };
    return selectATHOSIntervention({
      ownerId: user?.id ?? "",
      sessionIdentity: `session-${new Date().toISOString().slice(0, 10)}`,
      nowMs: Date.now(),
      moment: momentMap[phase],
      sessionDecisions,
      marketState: state ?? undefined,
      dlar: chainVm?.dlar ?? null,
      clc: chainVm?.clc ?? null,
    });
  }, [phase, user?.id, state, chainVm, sessionDecisions]);

  const permission = React.useMemo(
    () =>
      selectPermission({
        ownerId: user?.id ?? "",
        sessionIdentity: `session-${new Date().toISOString().slice(0, 10)}`,
        nowMs: Date.now(),
        rules: defaultFounderRules(),
        sessionDecisions,
        marketState: state ?? undefined,
        clc: chainVm?.clc ?? null,
        availableR: chainVm?.availableR ?? undefined,
      }),
    [user?.id, state, chainVm, sessionDecisions],
  );

  // One Story (canon §7 compiler) computed ONCE at component level so both the
  // mode band's routed question and the One Story strip below consume the SAME
  // canonical read — no second, potentially-disagreeing truth producer.
  const oneStory = React.useMemo(() => {
    const storyVm = state ? selectMarketStory(state, history) : null;
    return selectOneStory({
      story: storyVm,
      chainNodes: chainVm?.nodes,
      permission,
    });
  }, [state, history, chainVm, permission]);

  // The Question Router (canon P26/P6) compiles the ONE dominant question the
  // surface is currently answering: a function of the human's job (mode) and
  // what the engine actually resolved (oneStory). It asserts no market fact.
  const experienceQuestion = routeQuestion(experienceContext.mode, oneStory);

  // Market Object Passports (canon P6 Object DNA): each canonical dimension the
  // engine resolved becomes a Passport with its evidence lineage, fidelity,
  // contradictions and invalidation — reversible to provider evidence. Pure
  // read of the sealed state; never a second truth producer.
  const passport = React.useMemo(() => selectMarketObjectPassport(state), [state]);

  // WHY / WHY NOT (canon P6): reverse the compiled right-of-way verdict to its
  // concrete causes (engaged rules, contradiction, unpaid evidence debt). Reads
  // the same oneStory + permission the deck already compiled — no new truth.
  const decisionWhy = React.useMemo(
    () => selectDecisionWhyNot(oneStory, permission),
    [oneStory, permission],
  );

  // Decision Receipt (canon P8): project the most-recently sealed decision
  // capsule into its trader-facing receipt — verbatim commitment, defensible
  // process facts, management trail, outcome, and the trader's own review
  // split. WAIT / NO_TRADE reads as complete; no fabricated grade. Honest
  // empty state when nothing is sealed yet.
  const latestDecisionRecord = React.useMemo(() => {
    if (decisionRecords.length === 0) return null;
    return decisionRecords.reduce((latest, r) =>
      r.frozen.capturedAt > latest.frozen.capturedAt ? r : latest,
    );
  }, [decisionRecords]);
  const decisionReceipt = React.useMemo(
    () => selectDecisionReceipt(latestDecisionRecord),
    [latestDecisionRecord],
  );

  // Canon §9 Learning Genome — client-side bundle assembled from
  // browser-local Journal storage. Undefined during first hydration
  // so the caller can render a skeleton. Reads the same 7+7 day
  // window as /journal so the diagnostic is consistent across surfaces.
  const learningGenome = useLearningGenomeBundle();

  // Job-mode inference (the OS completing the loop): infer which job the human
  // is most likely in from concrete decision state, so the shell can gently
  // SUGGEST it. Never auto-switches — the human's manual selection always wins.
  const jobInference = React.useMemo(() => {
    const hasOpenPosition = decisionRecords.some(
      (r) => (r.plan.action === "ENTER_LONG" || r.plan.action === "ENTER_SHORT") && !r.outcome,
    );
    const hasUnreviewedClose = decisionRecords.some((r) => !!r.outcome && !r.review);
    return inferJobMode({
      hasOpenPosition,
      hasUnreviewedClose,
      decision: oneStory.decision.value,
      hasResolvedMarketState: passport.resolvedCount > 0,
    });
  }, [decisionRecords, oneStory, passport]);
  // Scale the suggestion's insistence to the inference confidence: a firm
  // (HIGH/MEDIUM) divergence earns a full accept-chip; a LOW-confidence guess
  // drops to a quiet hint so the OS never nags the human off their chosen job.
  // Still suggestion-only — the chip stays clickable, WM never auto-switches.
  const jobSuggestion = selectJobSuggestion(jobInference, experienceContext.mode);

  // Deck-level job emphasis: which decision surface LEADS, which contextual
  // drawer opens by default, and the physical top-to-bottom order of the four
  // surfaces for the human's current job. Presentation-only — never changes
  // market truth or which data is shown (Auto-Quiet). Live signals refine only
  // the SECONDARY order (never the lead): a live blocker raises WHY; an empty
  // Receipt sinks so it never outranks a live surface.
  const deckEmphasis = React.useMemo(
    () =>
      selectDeckEmphasis(experienceContext.mode, {
        hasUnresolvedContradiction: oneStory.contradiction != null,
        hasSealedReceipt: !decisionReceipt.empty,
      }),
    [experienceContext.mode, oneStory.contradiction, decisionReceipt.empty],
  );

  const openWhy = (t: WhyTarget) => {
    setWhyTarget(t);
    setShowEvidence(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #050506 0%, #0b0b0d 100%)", color: "#ede6d3" }}>
      {/* Nav header */}
      <header
        className="wm-cd-header"
        style={{
          borderBottom: "1px solid rgba(139,106,41,0.35)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "rgba(11,11,13,0.85)",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          className="wm-cd-header-back"
          onClick={() => router.push("/charts")}
          aria-label="Back to charts"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            letterSpacing: 0.3,
            textTransform: "uppercase",
            color: "#8a8271",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            minHeight: 44,
            padding: "0 10px",
          }}
        >
          <ArrowLeft size={12} />
          Charts
        </button>
        <div className="wm-cd-header-identity" style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <WmWordmark size="compact" subtitle="COMMAND CENTER" />
          <div style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800, whiteSpace: "nowrap" }}>
            ◆ Command Deck
          </div>
        </div>
        <div className="wm-cd-header-actions" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <button
            className="wm-cd-header-action"
            type="button"
            onClick={() => (showEvidence ? setShowEvidence(false) : openWhy({ kind: "hero" }))}
            aria-label={showEvidence ? "Hide evidence inspector" : "Show evidence inspector"}
            aria-pressed={showEvidence}
            style={{
              fontSize: 10,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              color: showEvidence ? "#d4af37" : "#8a8271",
              background: showEvidence ? "rgba(212,175,55,0.1)" : "transparent",
              border: showEvidence ? "1px solid #d4af3760" : "1px solid rgba(139,106,41,0.35)",
              minHeight: 32,
              padding: "0 10px",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Why?
          </button>
          <button
            className="wm-cd-header-action"
            type="button"
            onClick={() => router.push("/profile?tab=growth")}
            aria-label="Open Growth on your Profile"
            style={{
              fontSize: 10,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              color: "#8a8271",
              background: "transparent",
              border: "1px solid rgba(139,106,41,0.35)",
              minHeight: 32,
              padding: "0 10px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Growth →
          </button>
          <button
            className="wm-cd-header-action"
            type="button"
            onClick={() => router.push("/journal")}
            aria-label="Open Journal"
            style={{
              fontSize: 10,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              color: "#8a8271",
              background: "transparent",
              border: "1px solid rgba(139,106,41,0.35)",
              minHeight: 32,
              padding: "0 10px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Journal →
          </button>
        </div>
      </header>

      {/* Experience mode band (Founder Phase 1 — the WM Experience Shell
          cutover): the seven operating states, live and switchable, reorganise
          the shell's emphasis around the human's current job. The market truth
          below is unchanged — only what the surface EMPHASISES changes. */}
      <div
        className="wm-cd-mode-band"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "10px 16px 0",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {/* Mode bar + current-job descriptor. On desktop they share one row
            (descriptor right-aligned); on mobile the row WRAPS so the descriptor
            drops below and the mode bar keeps its full width instead of being
            crushed to a sliver (which previously made the seven tabs overflow
            and collide with this text). */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 260px", minWidth: 240 }}>
            <ExperienceModeBar />
          </div>
          <div
            style={{
              flexShrink: 0,
              fontSize: 11,
              letterSpacing: 0.3,
              color: "#8a7a52",
              whiteSpace: "nowrap",
              textTransform: "uppercase",
            }}
          >
            {experienceEmphasis.job}
          </div>
        </div>
        {/* The ONE dominant question this surface is currently answering
            (Question Router, canon P26/P6). Tracks the engine's actual read —
            never invents a market claim. */}
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.35,
            color: "#c9a55c",
            fontStyle: "italic",
          }}
        >
          {experienceQuestion}
        </div>
        {/* Job-mode SUGGESTION (inferJobMode → selectJobSuggestion). Appears
            only when the inferred job differs from the human's current
            selection. Read-only nudge: clicking accepts it; WM never
            auto-switches the job. The chip's insistence scales with confidence
            — a firm ACTIONABLE divergence gets a gold accent + "Suggested job",
            a LOW-confidence HINT is muted + "Possibly →" so a weak guess never
            nags the human off their chosen job. */}
        {jobSuggestion.strength !== "NONE" && jobSuggestion.inference && (() => {
          const sug = jobSuggestion.inference;
          const hint = jobSuggestion.strength === "HINT";
          return (
            <button
              type="button"
              onClick={() => setExperienceMode(sug.suggested)}
              title={sug.reason}
              style={{
                marginTop: 6,
                alignSelf: "flex-start",
                display: "inline-flex",
                alignItems: "baseline",
                gap: 6,
                background: "transparent",
                border: hint
                  ? "1px dashed rgba(138,130,113,0.35)"
                  : "1px solid rgba(212,175,55,0.35)",
                borderRadius: 999,
                padding: "3px 10px",
                cursor: "pointer",
                fontSize: 10,
                letterSpacing: 0.4,
                color: "#c9a55c",
                textTransform: "uppercase",
                opacity: hint ? 0.72 : 1,
              }}
            >
              <span style={{ color: "#8a8271" }}>{hint ? "Possibly →" : "Suggested job →"}</span>
              <span style={{ color: hint ? "#c9a55c" : "#d4af37", fontWeight: 600 }}>
                {sug.suggested}
              </span>
              <span style={{ color: "#8a8271", textTransform: "none", letterSpacing: 0.2 }}>
                {sug.reason}
              </span>
            </button>
          );
        })()}
      </div>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px", position: "relative" }}>
        {/* Cinematic light rays — subtle, non-interactive, sits behind
            all content per Founder mockup atmosphere. */}
        <CinematicAtmosphere intensity="subtle" />
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Responsive shim — mobile viewport should never see the
              two-column layout that would force a 380px WHY panel next
              to a squeezed main column. Use CSS media query via style
              tag so we don't require a global stylesheet touch. */}
          <style>{`
            .wm-cd-header-action { min-height: 44px !important; }
            .wm-cd-header-action:focus-visible,
            .wm-cd-header-back:focus-visible {
              outline: 2px solid #d4af37;
              outline-offset: 2px;
            }
            @media (max-width: 640px) {
              .wm-cd-header {
                flex-wrap: wrap !important;
                gap: 8px !important;
                padding: 8px 12px !important;
              }
              .wm-cd-header-back { padding-inline: 6px !important; }
              .wm-cd-header-identity { flex: 1 1 auto; gap: 6px !important; }
              .wm-cd-header-actions {
                flex: 0 0 100%;
                margin-left: 0 !important;
                display: grid !important;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 8px !important;
              }
              .wm-cd-header-action {
                width: 100%;
                padding-inline: 8px !important;
              }
            }
            @media (max-width: 900px) {
              .wm-cd-layout { grid-template-columns: minmax(0, 1fr) !important; }
              .wm-cd-why-column { position: static !important; }
            }
          `}</style>
        {/* Two-column layout when evidence panel is open, single column otherwise.
            Below 900px viewport the second column stacks under the first
            (see <style> above). */}
        <div
          className="wm-cd-layout"
          style={{
            display: "grid",
            gridTemplateColumns: showEvidence && whyTarget ? "minmax(0, 1fr) 380px" : "minmax(0, 1fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Primary column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
            {/* HERO TRUTH — the 1s dominant message. Market-state chapter
                is derived from the same selectMarketStory the Story Ribbon
                consumes downstream, so hero and ribbon can never disagree.
                When no chapter resolves, HeroTruth still renders — the
                marketState prop is skipped and SYMBOL becomes the dominant
                element (never a fabricated 'BALANCE'). */}
            {(() => {
              const story = state ? selectMarketStory(state, history) : null;
              return (
                <button
                  type="button"
                  onClick={() => openWhy({ kind: "hero" })}
                  aria-label="Explain hero truth"
                  style={{ padding: 0, background: "transparent", border: "none", cursor: "pointer", textAlign: "left", display: "block", width: "100%" }}
                >
                  <HeroTruth
                    symbol={symbol}
                    timeframe={timeframe}
                    state={state}
                    marketState={story?.current?.chapter ?? (story ? "UNKNOWN" : null)}
                    marketStateResolution={story?.resolution ?? undefined}
                  />
                </button>
              );
            })()}

            {/* Daily-stable doctrine tagline — one aphorism per trader per day. */}
            <DoctrineTagline seed={`${user?.id ?? "guest"}-${new Date().toISOString().slice(0, 10)}`} />

            {/* Today's morning-prep intention (if any) — the PREP→OBSERVE
                bridge from Founder Aug-14 §14 'Morning Prep intention
                appears later in review.' Silent when no entry today
                (never fabricates). */}
            <TodayPrepBridge userId={user?.id ?? null} />

            {/* Layout-honesty caption — the OS reorders the decision column
                around the human's job; this one quiet line SAYS why, so the
                re-emphasis is never silent or mysterious. Sits OUTSIDE the
                reorderable stack so it always leads the section. Reads the same
                deckEmphasis.rationale that drives the order. Presentation-only. */}
            <div
              aria-live="polite"
              style={{
                fontSize: 10,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: "#8a8271",
                display: "flex",
                gap: 6,
                alignItems: "baseline",
                marginBottom: -8,
              }}
            >
              <span style={{ color: "#c9a55c" }}>Layout</span>
              <span style={{ textTransform: "none", letterSpacing: 0 }}>
                {deckEmphasis.rationale}
                {deckEmphasis.refinementNote && (
                  // A live signal physically moved a surface below the lead; say
                  // so, so the re-emphasis is never silent. Reads the same pure
                  // selector that drove the order — no new truth.
                  <span style={{ color: "#c9a55c" }}> · {deckEmphasis.refinementNote}</span>
                )}
              </span>
            </div>

            {/* Decision-surface stack — the four job-reorderable surfaces
                (STORY / WHY / PASSPORT / RECEIPT). This is its OWN flex column
                so the job-emphasis `order` reranks ONLY these four (via CSS
                `order`) without disturbing the hero, ribbon, or phase selector
                above/below. Every surface stays in the DOM in every job — the
                job only decides which physically leads. Presentation-only. */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* One Story Strip — Founder 2029 Integration Glue canon §7
                  ONE STORY COMPILER. Compiles the market state into
                  PRIMARY / CONTRADICTION / MISSING / DECISION so the
                  trader gets the at-most-four-outputs read before hunting
                  the numbered sections below. Consumes shared canonical
                  selectors — never invents. */}
              <div style={{ order: surfaceOrder(deckEmphasis, "STORY") }}>
                <OneStoryStrip vm={oneStory} />
              </div>

              {/* WHY / WHY NOT (canon P6) — reverses the right-of-way verdict to
                  its concrete causes so the trader sees exactly what stands
                  between them and entry (or why the path is clear). */}
              <div
                style={{
                  order: surfaceOrder(deckEmphasis, "WHY"),
                  // Job-emphasis: in WAIT / EXECUTE the trigger question leads, so
                  // the panel gets a quiet gold ring. Presentation-only.
                  borderRadius: deckEmphasis.emphasizeWhy ? 12 : undefined,
                  boxShadow: deckEmphasis.emphasizeWhy
                    ? "0 0 0 1px rgba(212,175,55,0.35)"
                    : undefined,
                }}
              >
                <DecisionWhyPanel vm={decisionWhy} />
              </div>

              {/* Market Object Passports (canon P6 Object DNA) — a contextual
                  drawer, collapsed by default so the canvas stays sacred. Opens
                  to each resolved dimension's evidence lineage / fidelity /
                  contradiction / invalidation. Pure display of the sealed state.
                  Opens by default when the job is OBSERVE (studying market
                  objects) per the deck job-emphasis. */}
              <details
                style={{ order: surfaceOrder(deckEmphasis, "PASSPORT") }}
                open={deckEmphasis.passportOpen}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: 10,
                    letterSpacing: 0.6,
                    color: "#c9a55c",
                    textTransform: "uppercase",
                    padding: "4px 0",
                  }}
                >
                  Market Object Passports · {passport.resolvedCount}/{passport.totalCount} resolved
                </summary>
                <div style={{ marginTop: 6 }}>
                  <MarketObjectPassportPanel vm={passport} />
                </div>
              </details>

              {/* Decision Receipt (canon P8) — a contextual drawer, collapsed by
                  default. Projects the most-recently sealed decision capsule into
                  its trader-facing receipt: verbatim commitment, defensible
                  process facts, management trail, outcome, and the trader's own
                  review split. WAIT / NO_TRADE reads as complete; no fabricated
                  grade. Honest empty state when nothing is sealed yet. Opens by
                  default in management + reflection jobs (MANAGE / REVIEW / LEARN)
                  per the deck job-emphasis. */}
              <details
                style={{ order: surfaceOrder(deckEmphasis, "RECEIPT") }}
                open={deckEmphasis.receiptOpen}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: 10,
                    letterSpacing: 0.6,
                    color: "#c9a55c",
                    textTransform: "uppercase",
                    padding: "4px 0",
                  }}
                >
                  Decision Receipt ·{" "}
                  {decisionReceipt.empty
                    ? "none sealed"
                    : `${decisionReceipt.stage.toLowerCase()}`}
                </summary>
                <div style={{ marginTop: 6 }}>
                  <DecisionReceiptPanel vm={decisionReceipt} />
                </div>
              </details>
              {/* Canon §9 Learning Genome — surfaced in REVIEW / LEARN
                  where the trader is looking backward. Silent when
                  either the bundle is still hydrating or the trader
                  hasn't logged enough plan-adherence / MFE data to
                  measure two dimensions comparably. */}
              {(experienceContext.mode === "REVIEW" || experienceContext.mode === "LEARN") &&
                learningGenome &&
                learningGenome.genome.headlineWeakness && (
                  <details style={{ marginTop: 8 }}>
                    <summary
                      style={{
                        cursor: "pointer",
                        fontSize: 10,
                        letterSpacing: 0.6,
                        color: "#c9a55c",
                        textTransform: "uppercase",
                        padding: "4px 0",
                      }}
                    >
                      Learning Genome ·{" "}
                      {learningGenome.drill ? learningGenome.drill.stage.toLowerCase() : "diagnostic"}
                    </summary>
                    <div style={{ marginTop: 6 }}>
                      <LearningGenomeInspector
                        genome={learningGenome.genome}
                        drill={learningGenome.drill}
                        misread={learningGenome.misread}
                        trend={learningGenome.trend}
                        focusStreak={learningGenome.focus_streak}
                        ruleAdherenceStreak={learningGenome.rule_adherence_streak}
                        dayModelCoverage={learningGenome.day_model_coverage}
                        dualSideGuard={learningGenome.dual_side_guard}
                        weekMaturity={learningGenome.week_maturity}
                      />
                    </div>
                  </details>
                )}
            </div>

            {/* RAW context rail — SHOW FIRST, EXPLAIN SECOND, RAW THIRD
                (Founder doctrine). The 6-tile purposeful state read
                (session / data / observed / available-R / evidence debt /
                right-of-way) used to LEAD the room, forcing six cards to
                fight the Hero Truth for the trader's first second. Every
                decision-critical value it carries is already surfaced above
                — right-of-way + missing-evidence in the One Story, Available
                R + evidence debt in the decision chain — so it is genuinely
                the RAW tier: collapsed by default so the deck opens calm,
                one deliberate click from the full canonical read. Reads
                canonical owners only; UNKNOWN/UNAVAILABLE/DEGRADED stay
                first-class visible states. Shared primitive — do not fork. */}
            <details>
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: 10,
                  letterSpacing: 0.6,
                  color: "#8a8271",
                  textTransform: "uppercase",
                  padding: "4px 0",
                }}
              >
                System state · session · data · evidence · right-of-way
              </summary>
              <div style={{ marginTop: 8 }}>
                <CommandContextRibbon
                  symbol={symbol}
                  session={identity.session}
                  state={state}
                  wsConnected={wsFeed.connected}
                  wsSource={wsFeed.source ?? null}
                  availableR={chainVm?.availableR ?? null}
                  permission={permission}
                  chainNodes={chainVm?.nodes}
                />
              </div>
            </details>

            {/* Phase selector — the trader's current decision phase */}
            <div
              role="tablist"
              aria-label="Trade phase"
              style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
            >
              {PHASES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={phase === p.id}
                  aria-pressed={phase === p.id}
                  aria-label={`Phase: ${p.label}${phase === p.id ? " (selected)" : ""}`}
                  onClick={() => setPhase(p.id)}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "10px 14px",
                    minHeight: 44,
                    minWidth: 44,
                    borderRadius: 6,
                    cursor: "pointer",
                    border: phase === p.id ? "1px solid #d4af37" : "1px solid rgba(139,106,41,0.35)",
                    background: phase === p.id ? "rgba(212,175,55,0.12)" : "transparent",
                    color: phase === p.id ? "#ede6d3" : "#8a8271",
                    letterSpacing: 0.3,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Personal Edge chip — one-line 'where do I perform' summary. */}
            {sessionDecisions.length > 0 && <PersonalEdgeChip vm={personalEdgeVm} />}

            {/* When no state, show the deck structure as an INDEX so the
                trader sees what will appear once the chart publisher
                seeds the canonical store. Every row lists a section that
                will populate. Never fabricated — each row explicitly
                says 'waiting'. */}
            {!state && (
              <div
                role="status"
                aria-label="Command Deck sections waiting for canonical market state"
                style={{
                  border: "1px dashed rgba(139,106,41,0.35)",
                  borderRadius: 10,
                  padding: 20,
                  background: "rgba(11,11,13,0.5)",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
                  <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 13, letterSpacing: 0.32, color: "#c9a55c", textTransform: "uppercase" }}>
                    Awaiting first observation
                  </span>
                  <span style={{ fontSize: 11, color: "#8a8271", fontStyle: "italic", marginLeft: "auto" }}>
                    {symbol} · deck is subscribed — chapters populate as evidence arrives
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { n: 1, label: "Story Ribbon · Market Narrative" },
                    { n: 2, label: "Direction · Location · Aggression · Response" },
                    { n: 3, label: "Decision Chain (Regime → Management)" },
                    { n: 4, label: "Steward Rules Verdict" },
                    { n: 5, label: "Data Fidelity · Market Evidence" },
                  ].map((row) => (
                    <div
                      key={row.n}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 12,
                        padding: "8px 12px",
                        borderLeft: "2px solid rgba(139,106,41,0.25)",
                        fontSize: 11,
                        color: "#8a8271",
                      }}
                    >
                      <span style={{ fontFamily: "Georgia, serif", fontSize: 14, color: "#c9a55c", minWidth: 18 }}>{row.n}</span>
                      <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 12, color: "#c0b8a0", letterSpacing: 0.2 }}>{row.label}</span>
                      <span style={{ marginLeft: "auto", fontSize: 9, color: "#55503f", letterSpacing: 0.4, textTransform: "uppercase" }}>waiting</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, textAlign: "center" }}>
                  <a
                    href="/charts"
                    style={{
                      display: "inline-block",
                      padding: "10px 18px",
                      borderRadius: 6,
                      background: "rgba(212,175,55,0.12)",
                      border: "1px solid #d4af37",
                      color: "#d4af37",
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: 12,
                      letterSpacing: 0.32,
                      textTransform: "uppercase",
                      textDecoration: "none",
                    }}
                  >
                    Open Charts →
                  </a>
                </div>
              </div>
            )}

            {/* STORY RIBBON — Market state → progression → evidence */}
            {chainVm && (
              <div>
                <SectionBanner number={1} label="Story Ribbon · Market Narrative" tagline="the sequence of chapters" />
                <div style={{ height: 12 }} />
                <StoryRibbon state={state} history={history} />
              </div>
            )}

            {/* DIRECTION × LOCATION × AGGRESSION × RESPONSE strip */}
            {chainVm && (
              <div>
                <SectionBanner number={2} label="Direction · Location · Aggression · Response" tagline="the auction lens" />
                <div style={{ height: 12 }} />
                <DLARStrip
                  dlar={chainVm.dlar}
                  onDrillClick={(dim: DLARDimensionKey) => openWhy({ kind: "dlar", dim })}
                />
              </div>
            )}

            {/* AVAILABLE R / PROCESS / STEWARD — the full 9-node chain */}
            {chainVm && (
              <div>
                <SectionBanner number={3} label="Decision Chain" tagline="regime → management" />
                <div style={{ height: 12 }} />
              <DecisionChainPanel
                vm={chainVm}
                showNarratives
                onNodeClick={(node) => {
                  if (node.key === "regime" || node.key === "direction" || node.key === "location" || node.key === "aggression") {
                    // Direction/location/aggression → DLAR drill
                    openWhy({ kind: "dlar", dim: (node.key === "regime" ? "direction" : node.key) as "direction" | "location" | "aggression" });
                  } else if (node.key === "clc") {
                    openWhy({ kind: "clc", leg: "confirmation" });
                  } else {
                    openWhy({ kind: "hero" });
                  }
                }}
              />
              </div>
            )}

            {/* Structure context — surfaces external vs internal contradictions */}
            {chainVm && <StructureContextNote vm={chainVm} />}

            {/* Steward / Permission — rules-informing surface. Now lists
                EACH engaged rule with its label + reason so the trader
                can see WHICH rules changed the verdict, not just how many.
                Founder canon: 'every state must be explainable'. */}
            {chainVm && (
              <div>
                <SectionBanner number={4} label="Steward · Rules Verdict" tagline="informs, never gates" />
                <div style={{ height: 12 }} />
              <div
                style={{
                  border: "1px solid rgba(139,106,41,0.35)",
                  borderRadius: 10,
                  background: "rgba(11,11,13,0.9)",
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800, marginBottom: 8 }}>
                  Steward Rules · {permission.verdict}
                </div>
                <div style={{ fontSize: 13, color: "#ede6d3", lineHeight: 1.5 }}>
                  {permission.headline}
                </div>
                <div style={{ fontSize: 11, color: "#8a8271", lineHeight: 1.5, marginTop: 6 }}>
                  {permission.reason}
                </div>
                <div style={{ fontSize: 10, color: "#55503f", marginTop: 8, letterSpacing: 0.3 }}>
                  {permission.engagedRules.length}/{permission.ruleCount} engaged · phase: {phase.toLowerCase()}
                </div>
                {/* Per-rule breakdown — 'informs, never gates'. If any
                    rule is engaged, list each with its label + reason
                    so the verdict is fully inspectable without another
                    click. Silent when no rules engaged (the ALLOWED
                    state needs no per-rule explanation). */}
                {permission.engagedRules.length > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(139,106,41,0.15)", display: "flex", flexDirection: "column", gap: 6 }}>
                    {permission.engagedRules.map((r, i) => (
                      <div
                        key={`${r.rule.label}-${i}`}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "baseline",
                          padding: "4px 8px",
                          borderLeft: `2px solid ${r.rule.kind === "HARD" ? "#c05a4a" : "#c9a55c"}`,
                          background: "rgba(19,19,23,0.5)",
                          borderRadius: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            letterSpacing: 0.3,
                            textTransform: "uppercase",
                            color: r.rule.kind === "HARD" ? "#c05a4a" : "#c9a55c",
                            fontWeight: 700,
                            minWidth: 32,
                          }}
                        >
                          {r.rule.kind}
                        </span>
                        <span style={{ fontSize: 11, color: "#ede6d3", fontWeight: 600 }}>
                          {r.rule.label}
                        </span>
                        <span style={{ fontSize: 11, color: "#8a8271", flex: 1, minWidth: 0, lineHeight: 1.4 }}>
                          {r.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>
            )}

            {/* NECTAR / DATA FIDELITY — coverage + freshness at a glance */}
            {state && (
              <div>
                <SectionBanner number={5} label="Data Fidelity · Market Evidence" tagline="what did WM actually witness" />
                <div style={{ height: 12 }} />
              <div
                style={{
                  border: "1px solid rgba(139,106,41,0.35)",
                  borderRadius: 10,
                  background: "rgba(11,11,13,0.9)",
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800 }}>
                    Data Fidelity
                  </span>
                  <span style={{ fontSize: 10, color: "#8a8271", marginLeft: "auto" }}>
                    {state.qualityState}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
                  <Stat label="Coverage" value={`${state.coverage.length} ch`} />
                  <Stat label="Unknowns" value={String(state.unknowns.length)} tone={state.unknowns.length > 0 ? "watch" : "ok"} />
                  <Stat label="Contradictions" value={String(state.contradictions.length)} tone={state.contradictions.length > 0 ? "warn" : "ok"} />
                </div>

                {/* Nectar memory-age row — how long has WM actually been
                    watching this instrument, and when was the most recent
                    observation. Renders '—' when unavailable (never a
                    fabricated 'live now'). Founder Aug-14 §11 explicit
                    ask: 'History must remain independently attributable
                    by user/canonical symbol/timeframe/source/observation
                    time.' */}
                {state.coverage.length > 0 && (() => {
                  const observedFroms = state.coverage.map((c) => c.observedFrom).filter((n): n is number => typeof n === "number");
                  const lastEvents = state.coverage.map((c) => c.lastEventAt).filter((n): n is number => typeof n === "number");
                  const totalEvents = state.coverage.reduce((s, c) => s + (c.observedEventCount ?? 0), 0);
                  const gapTotal = state.coverage.reduce((s, c) => s + (c.gapCount ?? 0), 0);
                  const memoryStart = observedFroms.length ? Math.min(...observedFroms) : null;
                  const lastEvent = lastEvents.length ? Math.max(...lastEvents) : null;
                  const now = state.capturedAt;
                  const memoryAgeMs = memoryStart ? Math.max(0, now - memoryStart) : null;
                  const staleAgeMs = lastEvent ? Math.max(0, now - lastEvent) : null;
                  const fmtAge = (ms: number | null): string => {
                    if (ms == null) return "—";
                    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
                    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
                    if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
                    return `${(ms / 86_400_000).toFixed(1)}d`;
                  };
                  return (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(139,106,41,0.2)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
                      <Stat label="Memory age" value={fmtAge(memoryAgeMs)} />
                      <Stat label="Last event" value={fmtAge(staleAgeMs)} tone={staleAgeMs != null && staleAgeMs > 60_000 ? (staleAgeMs > 300_000 ? "warn" : "watch") : "ok"} />
                      <Stat label="Observed" value={String(totalEvents)} />
                      <Stat label="Gaps" value={String(gapTotal)} tone={gapTotal > 0 ? "watch" : "ok"} />
                    </div>
                  );
                })()}
              </div>
              </div>
            )}

            {/* ATHOS — silent when nothing worth surfacing */}
            {chainVm && (
              <ATHOSInterventionPanel
                interventions={athos.interventions as readonly ATHOSIntervention[]}
                onDismiss={(id) => console.debug("dismissed", id)}
              />
            )}

            {/* Opening Bell — only during PREPARATION phase */}
            {chainVm && phase === "PREPARATION" && (
              <OpeningBellPanel
                vm={selectOpeningBell({
                  ownerId: user?.id ?? "",
                  sessionIdentity: `session-${new Date().toISOString().slice(0, 10)}`,
                  items: DEFAULT_PREPARATION_TEMPLATE.map((t) => ({ ...t, completed: false })),
                  minutesUntilOpen: null,
                  dataQuality: state?.qualityState,
                  nowMs: Date.now(),
                })}
              />
            )}

            {/* Mirror — meaningful during REVIEW + POST_EXIT */}
            {chainVm && (phase === "REVIEW" || phase === "POST_EXIT") && (
              <MirrorPanel
                vm={selectMirror({
                  ownerId: user?.id ?? "",
                  decisions: sessionDecisions,
                  nowMs: Date.now(),
                })}
              />
            )}
          </div>

          {/* Evidence column — appears when user has opened a Why? drill */}
          {showEvidence && whyTarget && (
            <aside className="wm-cd-why-column" style={{ position: "sticky", top: 80, alignSelf: "start" }}>
              <WhyInspector
                target={whyTarget}
                state={state}
                dlar={chainVm?.dlar ?? null}
                clc={chainVm?.clc ?? null}
                onClose={() => setShowEvidence(false)}
              />
            </aside>
          )}
        </div>

        {/* Doctrine footer — mirrors the mockup cadence:
            'THE MIRROR REFLECTS. YOU EVOLVE.' */}
        <div
          style={{
            paddingTop: 20,
            marginTop: 32,
            borderTop: "1px solid rgba(139,106,41,0.25)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 12,
              letterSpacing: 0.4,
              color: "#c9a55c",
              marginBottom: 6,
            }}
          >
            OBSERVE TRUTH · PROTECT PROCESS · COMPOUND WISDOM
          </div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              color: "#55503f",
            }}
          >
            Regime → Direction → Location → Auction → Aggression → CLC → Available R → Permission → Management
          </div>
        </div>

        {/* Realm Gateway — 5-tile bottom band from Founder mockups. */}
        <RealmGateway currentKey="wm-pro" />
        </div>{/* end z-index wrapper */}
      </main>
    </div>
  );
}

/**
 * TodayPrepBridge — surfaces this-morning's stated intention on the deck
 * so the trader sees the same thread from PREP to DECISION. Silent when
 * no entry exists for today. Zero fabrication.
 */
function TodayPrepBridge({ userId }: { userId: string | null }) {
  const prep = useTodayPrep(userId);
  if (!prep.hasEntry) return null;
  return (
    <div
      role="region"
      aria-label="Today's morning prep intention"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        border: "1px solid rgba(212,175,55,0.35)",
        borderLeft: "3px solid #d4af37",
        borderRadius: 8,
        background: "rgba(212,175,55,0.05)",
      }}
    >
      {prep.mood && (
        <span style={{ fontSize: 18, lineHeight: 1 }} aria-label={`Mood ${prep.mood}`}>
          {prep.mood}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 700, marginBottom: 4 }}>
          Today's intention
        </div>
        {prep.routine ? (
          <div style={{ fontSize: 12, color: "#ede6d3", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {prep.routine}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "#8a8271", fontStyle: "italic" }}>
            Prep saved with no written routine today.
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        {prep.checklistTotal > 0 && (
          <div style={{ fontSize: 10, color: "#c9a55c", letterSpacing: 0.3 }}>
            {prep.checklistDone}/{prep.checklistTotal} checked
          </div>
        )}
        <a
          href="/morning-prep"
          style={{ fontSize: 9, letterSpacing: 0.3, textTransform: "uppercase", color: "#8a8271", textDecoration: "none" }}
          aria-label="Open Morning Prep"
        >
          Prep →
        </a>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "watch" | "warn" }) {
  const color =
    tone === "warn"  ? "#c05a4a" :
    tone === "watch" ? "#c9a55c" :
                       "#ede6d3";
  return (
    <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(19,19,23,0.5)" }}>
      <div style={{ fontSize: 8, letterSpacing: 0.4, textTransform: "uppercase", color: "#8a8271", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}
