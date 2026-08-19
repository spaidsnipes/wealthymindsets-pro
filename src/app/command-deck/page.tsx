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
import { useDecisionMemory } from "@/lib/traderMemory/useDecisionMemory";
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
            {/* CONTEXT RIBBON — 5-tile purposeful state read (Founder
                2026-08-19 OS Transformation Program §DESKTOP TARGET).
                Reads canonical owners only; UNKNOWN/UNAVAILABLE/DEGRADED
                are first-class visible states. Shared primitive: other
                rooms consume the same component. */}
            <CommandContextRibbon
              symbol={symbol}
              session={identity.session}
              state={state}
              wsConnected={wsFeed.connected}
              wsSource={wsFeed.source ?? null}
              availableR={chainVm?.availableR ?? null}
              permission={permission}
            />

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
                    { n: 5, label: "Data Fidelity · Nectar Memory" },
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
                <SectionBanner number={5} label="Data Fidelity · Nectar Memory" tagline="what did WM actually witness" />
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
