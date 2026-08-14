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
import StoryRibbon from "@/components/chart/StoryRibbon";
import ATHOSInterventionPanel from "@/components/athos/ATHOSInterventionPanel";
import { selectATHOSIntervention, type ATHOSIntervention } from "@/lib/traderMemory/viewModels/selectATHOSIntervention";
import { selectPermission, defaultFounderRules } from "@/lib/traderMemory/viewModels/selectPermission";
import MirrorPanel from "@/components/mirror/MirrorPanel";
import OpeningBellPanel from "@/components/opening-bell/OpeningBellPanel";
import { selectMirror } from "@/lib/traderMemory/viewModels/selectMirror";
import { selectOpeningBell, DEFAULT_PREPARATION_TEMPLATE } from "@/lib/traderMemory/viewModels/selectOpeningBell";

/**
 * /command-deck — the composed Command Deck surface.
 *
 * Renders the Founder decision chain (§9) end-to-end using the canonical
 * store. This is the "not a widget graveyard" surface — one composed
 * synthesis instead of scattered panels.
 *
 * Data flow:
 *   Canonical store subscription (per identity) → DecisionChainVM →
 *   DecisionChainPanel + StoryRibbon + ATHOS + Permission
 *
 * When the store has no snapshot for the current identity, each panel
 * renders its truthful UNKNOWN state — nothing fabricated.
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
      sessionDecisions: [],
      marketState: state ?? undefined,
      dlar: chainVm?.dlar ?? null,
      clc: chainVm?.clc ?? null,
    });
  }, [phase, user?.id, state, chainVm]);

  const permission = React.useMemo(
    () =>
      selectPermission({
        ownerId: user?.id ?? "",
        sessionIdentity: `session-${new Date().toISOString().slice(0, 10)}`,
        nowMs: Date.now(),
        rules: defaultFounderRules(),
        sessionDecisions: [],
        marketState: state ?? undefined,
        clc: chainVm?.clc ?? null,
        availableR: chainVm?.availableR ?? undefined,
      }),
    [user?.id, state, chainVm],
  );

  return (
    <div style={{ minHeight: "100vh", background: "#050506", color: "#ede6d3" }}>
      {/* Nav header */}
      <header
        style={{
          borderBottom: "1px solid rgba(139,106,41,0.35)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
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
        <div style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800 }}>
          ◆ Command Deck ◆ {symbol} · {timeframe}
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Phase selector */}
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
                border: phase === p.id ? "1px solid #c9a55c" : "1px solid rgba(139,106,41,0.35)",
                background: phase === p.id ? "rgba(201,165,92,0.15)" : "transparent",
                color: phase === p.id ? "#ede6d3" : "#8a8271",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

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
            The chart publisher has not yet published a Market State for{" "}
            <span style={{ color: "#ede6d3" }}>{symbol} · {timeframe}</span>.
            <br />
            Open <span style={{ color: "#c9a55c" }}>/charts</span> for this symbol to seed the store, then return here.
          </div>
        )}

        {/* Full composed surface — everything below renders truthfully with
            UNKNOWN states when the store is empty */}
        {chainVm && (
          <>
            <DecisionChainPanel vm={chainVm} showNarratives={true} />

            <StoryRibbon
              state={state}
              history={history}
            />

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

            <ATHOSInterventionPanel
              interventions={athos.interventions as readonly ATHOSIntervention[]}
              onDismiss={(id) => console.debug("dismissed", id)}
            />

            {/* Opening Bell — only meaningful during PREPARATION phase.
                Uses the default preparation template with no items completed
                yet, so verdict truthfully = NOT_READY when required items
                exist. When Founder configures + completes items, this
                updates automatically. */}
            {phase === "PREPARATION" && (
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

            {/* Mirror — meaningful during REVIEW phase (also visible in
                POST_EXIT). Renders NOTHING when no patterns detected
                (silence-is-a-feature §14 applied to reflection too). */}
            {(phase === "REVIEW" || phase === "POST_EXIT") && (
              <MirrorPanel
                vm={selectMirror({
                  ownerId: user?.id ?? "",
                  decisions: [],
                  nowMs: Date.now(),
                })}
              />
            )}
          </>
        )}

        {/* Doctrine footer */}
        <div
          style={{
            fontSize: 10,
            letterSpacing: 0.3,
            textTransform: "uppercase",
            color: "#55503f",
            paddingTop: 12,
            borderTop: "1px solid rgba(139,106,41,0.25)",
            textAlign: "center",
          }}
        >
          Regime → Direction → Location → Auction → Aggression → CLC → Available R → Permission → Management
        </div>
      </main>
    </div>
  );
}
