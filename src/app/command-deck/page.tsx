"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCanonicalMarketState,
  useCanonicalMarketStateHistory,
} from "@/lib/marketData/useCanonicalMarketState";
import { selectDecisionChain, type TradePhase } from "@/lib/marketData/viewModels/selectDecisionChain";
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
  const router = useRouter();
  const { user } = useAuth();
  const { activeSymbol } = useActiveSymbol();
  const symbol = activeSymbol ?? "TSLA";
  const timeframe = "15m";
  const [phase, setPhase] = React.useState<CommandPhase>("PREPARATION");
  const [whyTarget, setWhyTarget] = React.useState<WhyTarget | null>(null);
  const [showEvidence, setShowEvidence] = React.useState<boolean>(false);

  const identity = React.useMemo(
    () => ({
      instrumentId: `${symbol}:NASDAQ`,
      session: "REGULAR",
      timeframeContext: [timeframe] as readonly string[],
    }),
    [symbol, timeframe],
  );

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
        <WmWordmark size="compact" subtitle="COMMAND CENTER" />
        <div style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800, marginLeft: 8 }}>
          ◆ Command Deck
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={() => setShowEvidence(!showEvidence)}
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

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: 24, position: "relative" }}>
        {/* Cinematic light rays — subtle, non-interactive, sits behind
            all content per Founder mockup atmosphere. */}
        <CinematicAtmosphere intensity="subtle" />
        <div style={{ position: "relative", zIndex: 1 }}>
        {/* Two-column layout when evidence panel is open, single column otherwise */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: showEvidence && whyTarget ? "minmax(0, 1fr) 380px" : "minmax(0, 1fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Primary column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
            {/* HERO TRUTH — the 1s dominant message */}
            <button
              type="button"
              onClick={() => openWhy({ kind: "hero" })}
              aria-label="Explain hero truth"
              style={{ padding: 0, background: "transparent", border: "none", cursor: "pointer", textAlign: "left", display: "block", width: "100%" }}
            >
              <HeroTruth symbol={symbol} timeframe={timeframe} state={state} />
            </button>

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

            {/* When no state, single unified empty */}
            {!state && (
              <div
                role="status"
                style={{
                  padding: 32,
                  textAlign: "center",
                  border: "1px dashed rgba(139,106,41,0.35)",
                  borderRadius: 10,
                  color: "#8a8271",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                <div style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", marginBottom: 8 }}>
                  No canonical snapshot yet
                </div>
                Open <span style={{ color: "#c9a55c" }}>/charts</span> for{" "}
                <span style={{ color: "#ede6d3" }}>{symbol}</span> to seed the store, then return.
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

            {/* Steward / Permission — rules-informing surface */}
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <Stat label="Coverage" value={`${state.coverage.length} ch`} />
                  <Stat label="Unknowns" value={String(state.unknowns.length)} tone={state.unknowns.length > 0 ? "watch" : "ok"} />
                  <Stat label="Contradictions" value={String(state.contradictions.length)} tone={state.contradictions.length > 0 ? "warn" : "ok"} />
                </div>
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
            <aside style={{ position: "sticky", top: 80, alignSelf: "start" }}>
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
        </div>{/* end z-index wrapper */}
      </main>
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
