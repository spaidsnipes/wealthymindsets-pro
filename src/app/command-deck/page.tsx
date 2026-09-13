"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCanonicalMarketState,
  useCanonicalMarketStateHistory,
} from "@/lib/marketData/useCanonicalMarketState";
import { useCanvasClock } from "@/lib/marketData/viewModels/canvasClock";
import { usePublishChartMarketState } from "@/lib/marketData/chartMarketStatePublisher";
import {
  canonicalMarketStateIdentity,
  selectCanonicalSessionToken,
} from "@/lib/marketData/canonicalIdentity";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  useProvenSessionClosure,
  useSessionClockDate,
} from "@/lib/marketData/useProvenSessionClosure";
import { selectDecisionChain, type TradePhase } from "@/lib/marketData/viewModels/selectDecisionChain";
import { selectMarketStory } from "@/lib/marketData/viewModels/selectMarketStory";
import DecisionChainPanel from "@/components/chart/DecisionChainPanel";
import StructureContextNote from "@/components/chart/StructureContextNote";
import StoryRibbon from "@/components/chart/StoryRibbon";
import ATHOSInterventionPanel from "@/components/athos/ATHOSInterventionPanel";
import { selectATHOSIntervention, type ATHOSIntervention } from "@/lib/traderMemory/viewModels/selectATHOSIntervention";
import MirrorPanel from "@/components/mirror/MirrorPanel";
import OpeningBellPanel from "@/components/opening-bell/OpeningBellPanel";
import { selectMirror } from "@/lib/traderMemory/viewModels/selectMirror";
import { selectOpeningBell, DEFAULT_PREPARATION_TEMPLATE } from "@/lib/traderMemory/viewModels/selectOpeningBell";
import { useDecisionMemory, useDecisionMemoryRecords } from "@/lib/traderMemory/useDecisionMemory";
import { useJournalBook } from "@/lib/traderMemory/adapters/useJournalSnapshots";
import PersonalEdgeChip from "@/components/journal/PersonalEdgeChip";
import { selectPersonalEdge } from "@/lib/traderMemory/viewModels/selectPersonalEdge";
import HeroTruth from "@/components/command-deck/HeroTruth";
import DLARStrip, { type DLARDimensionKey } from "@/components/command-deck/DLARStrip";
import WhyInspector, { type WhyTarget } from "@/components/command-deck/WhyInspector";
import SectionBanner from "@/components/brand/SectionBanner";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import RealmGateway from "@/components/brand/RealmGateway";
import { useTodayPrep } from "@/lib/traderMemory/adapters/useTodayPrep";
import CommandContextRibbon from "@/components/command/CommandContextRibbon";
import OneStoryStrip from "@/components/command/OneStoryStrip";
import SceneAdmissionPanel from "@/components/experience/SceneAdmissionPanel";
import SceneAdmits, { SceneAdmitsAmbient } from "@/components/experience/SceneAdmits";
import { compileScene, type SurfaceElement } from "@/lib/experience/compileScene";
import { deckSceneSignals } from "@/lib/experience/deckSceneSignals";
import {
  computeEvidenceDebt as computeSceneEvidenceDebt,
  computeRightOfWay as computeSceneRightOfWay,
} from "@/lib/marketData/viewModels/decisionPermissionCompiler";
import { PerCapabilityFidelityGrid } from "@/components/marketData/PerCapabilityFidelityGrid";
import { selectPerCapabilityFidelity } from "@/lib/marketData/selectPerCapabilityFidelity";
import { selectAggressorFlow } from "@/lib/marketData/selectAggressorFlow";
import { strongestCapability, weakestCapability, evaluatedCapabilityCount } from "@/lib/marketData/perCapabilityFidelity";
import { SemanticZoom } from "@/components/experience/SemanticZoom";
import MarketObjectPassportPanel from "@/components/experience/MarketObjectPassportPanel";
import { selectMarketObjectPassport } from "@/lib/marketData/viewModels/selectMarketObjectPassport";
import DecisionWhyPanel from "@/components/experience/DecisionWhyPanel";
import MarketCanvasPanel from "@/components/experience/MarketCanvasPanel";
import DeckMarketChart from "@/components/experience/DeckMarketChart";
import AvailableRChip from "@/components/experience/AvailableRChip";
import DeckExpressionShortlist from "@/components/experience/DeckExpressionShortlist";
import { OptionExpressionIntent } from "@/components/chart/OptionExpressionIntent";
import {
  adoptSceneDecision,
  currentDecisionIdentity,
  expressionDirectionFromCanonical,
  expressionScopeIsCurrent,
  type ScopedDecisionIdentity,
} from "@/lib/expressionShortlist";
import { birthOnPermissionCrossing } from "@/lib/traderMemory/permissionBirth";
import { thisDeviceId } from "@/lib/traderMemory/deviceIdentity";
import { SanctuarySessionProvider, type SanctuarySessionSignal } from "@/lib/experience/sanctuarySessionContext";
import type { OptionContract, OptionChainFidelity, OptionChainSource } from "@/lib/optionContractResponse";
import type { DecisionIdentity } from "@/lib/traderMemory/decisionIdentity";
import { composeMarketCanvasVM } from "@/lib/marketData/viewModels/composeMarketCanvasVM";
import DecisionReceiptPanel from "@/components/experience/DecisionReceiptPanel";
import { selectDecisionReceipt } from "@/lib/traderMemory/viewModels/selectDecisionReceipt";
import { useDecisionContext } from "@/lib/experience/useDecisionContext";
import { shellEmphasis } from "@/lib/experience/shellLayout";
import { routeQuestion } from "@/lib/experience/questionRouter";
import { selectDeckEmphasis, surfaceOrder } from "@/lib/experience/selectDeckEmphasis";
import { inferJobMode } from "@/lib/experience/inferJobMode";
import { selectJobSuggestion } from "@/lib/experience/selectJobSuggestion";
import { selectCompletionState } from "@/lib/experience/selectCompletionState";
import { deriveCompletionSignals } from "@/lib/experience/deriveCompletionSignals";
import { composeExitRamp } from "@/lib/experience/composeExitRamp";
import ExitRampCard from "@/components/experience/ExitRampCard";
import { useLearningGenomeBundle } from "@/lib/learningGenome/useLearningGenomeBundle";
import { LearningGenomeInspector } from "@/components/learningGenome/LearningGenomeInspector";
import ProviderWireStrip from "@/components/marketData/ProviderWireStrip";

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

/**
 * The §10 surface elements /command-deck actually routes through admission.
 *
 * This is a CLAIM, and a sentinel checks it: every element named here must have
 * a real `<SceneAdmits element="…">` gate on this page. Naming one without
 * gating it puts the panel straight back to reporting refusals nothing honours.
 *
 * It is deliberately short. The compiler rules on twelve elements; this route
 * applies two. The panel prints that ratio rather than hiding it, because
 * "Withheld · 9" on a route with one gate was flattering the OS — eight of
 * those nine were verdicts the scene has no power to enforce here.
 *
 * Growing this list is the work. Every addition is a real card that a real
 * market state can now refuse.
 *
 * ── Why THESIS_GEOMETRY and not the other nine ──────────────────────────────
 *
 * The test for adding an element is not "does the compiler have an opinion
 * about it" — it has an opinion about all twelve. It is: does this element
 * both ADMIT and REFUSE in scenes this route can actually reach? An element
 * admitted everywhere reachable is a gate that never says no, which is
 * decoration (§H19). An element refused everywhere reachable would silently
 * delete a working surface.
 *
 * /command-deck has no broker panel, so it reaches exactly four scenes:
 * PREGAME, WAIT, PERMISSION, CLOSED. Against that set:
 *
 *   MARKET_CANVAS / FIDELITY_CHIPS / HUMILITY_PANEL — admitted in all four.
 *     Never refuse. Decoration.
 *   EXPRESSION_CARD — admitted only in PERMISSION, and the deck's expression
 *     surfaces are not built to disappear yet.
 *   PENDING_BANNER / PROTECTION_GRADE / HOT_PATH_REMOTE / FLATTEN_CONFIRM /
 *     RECEIPT_SHEET / OPEN_BROKER — refused in all four. Gating them would
 *     delete real surfaces on every render, which is a bug wearing a law.
 *   ONE_STORY — admitted in WAIT/PERMISSION, refused in PREGAME/CLOSED. Real.
 *   THESIS_GEOMETRY — same split. Real.
 *
 * So the honest list is two, and it is two because the route is small, not
 * because the ambition is.
 */
const DECK_GOVERNED_ELEMENTS: readonly SurfaceElement[] = [
  "ONE_STORY",
  "THESIS_GEOMETRY",
];

interface DeckOptionSelection {
  readonly underlying: string;
  readonly owner: string;
  readonly direction: "long" | "short";
  readonly contract: OptionContract;
  readonly source: OptionChainSource;
  readonly fidelity: OptionChainFidelity;
  readonly providerPath: string | null;
  readonly rightsPolicyId: string | null;
}

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
  const [proofChainOpen, setProofChainOpen] = React.useState(false);
  const [optionSelection, setOptionSelection] = React.useState<DeckOptionSelection | null>(null);
  const [sceneDecision, setSceneDecision] = React.useState<ScopedDecisionIdentity | null>(null);

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
  // Canon §8 "CLOSED IS NOT DELAYED". Called HERE, at the top of the
  // component, not inside the capability IIFE further down — a hook inside
  // JSX is the React #310 defect this codebase has already paid for twice.
  // `null` until mount and on every weekday: provider labelling unchanged.
  const sessionOpen = useProvenSessionClosure(symbol);
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
  // Live cadence clock: keeps freshness / evidence age advancing even
  // when the feed is silent (see canvasClock.ts). Fed into every memo
  // below AND listed in their deps so age reflects the live clock
  // instead of freezing at the last market-state change. SSR-safe:
  // before mount it falls back to a render-time clock (first paint
  // unchanged), then ticks on a 5s cadence.
  const nowMs = useCanvasClock() ?? Date.now();
  const storeDecisions = useDecisionMemory(user?.id ?? null);
  const decisionRecords = useDecisionMemoryRecords(user?.id ?? null);
  // One subscription, two readers: the decisions the deck merges, and how
  // much of the stored book they were built from.
  const { snapshots: journalDecisions, coverage: journalCoverage } = useJournalBook(
    user?.id ?? null,
  );
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
        nowMs,
      }),
    [user?.id, sessionDecisions, nowMs],
  );

  const chainVm = React.useMemo(() => {
    if (!state) return null;
    return selectDecisionChain({
      state,
      history,
      nowMs,
      phase,
    });
  }, [state, history, phase, nowMs]);

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
      sessionIdentity: `session-${new Date(nowMs).toISOString().slice(0, 10)}`,
      nowMs,
      moment: momentMap[phase],
      sessionDecisions,
      marketState: state ?? undefined,
      dlar: chainVm?.dlar ?? null,
      clc: chainVm?.clc ?? null,
    });
  }, [phase, user?.id, state, chainVm, sessionDecisions, nowMs]);

  // canon §Single-Writer / Many-Readers: the deck's four Phase 3
  // compilations (permission → oneStory → decisionWhy → marketCanvas)
  // now flow through the shared composeMarketCanvasVM compiler so any
  // other decision surface (Nectar deep-dive, /paper receipts) can
  // consume the SAME derivations without duplicating the pipeline.
  // The deck passes its own chainVm to skip the compiler's internal
  // chain re-compile (used by sibling panels: athos, decision receipt).
  const canvasCompilation = React.useMemo(
    () =>
      composeMarketCanvasVM({
        state: state ?? null,
        history,
        sessionDecisions,
        ownerId: user?.id ?? "",
        nowMs,
        chain: chainVm ?? null,
      }),
    [state, history, sessionDecisions, user?.id, chainVm, nowMs],
  );
  const permission = canvasCompilation.permission;
  const oneStory = canvasCompilation.oneStory;
  const decisionWhy = canvasCompilation.decisionWhy;
  const marketCanvas = canvasCompilation.canvas;
  const expressionDirection = expressionDirectionFromCanonical(state?.direction);
  const expressionOwner = user?.id ?? "signed-out";
  const selectedExpression = expressionScopeIsCurrent(optionSelection, {
    underlying: symbol,
    owner: expressionOwner,
    direction: expressionDirection,
  }) ? optionSelection : null;
  const currentSceneDecision = currentDecisionIdentity(sceneDecision, {
    underlying: symbol,
    owner: expressionOwner,
  });
  const permissionVerdict = permission?.verdict ?? "UNKNOWN";
  const priorPermission = React.useRef<typeof permissionVerdict | null>(null);
  const [sceneDecisionAbsence, setSceneDecisionAbsence] = React.useState<string>(
    "No decision born yet on this scene — permission has not crossed here.",
  );
  React.useEffect(() => {
    // Founder Build Order §5 Step 5 (INTENT BEFORE ORDER TYPE) — the decision
    // is born on the SAME scene the trader is looking at, not on the other
    // route. Before this effect, /command-deck adopted an id if one had been
    // birthed on /charts, and rendered "No decision born yet" otherwise
    // forever. That kept the room's decision identity, the Expression
    // shortlist's scoped selection, and OptionExpressionIntent's
    // bornDecision all null on the room the Founder actually opens.
    //
    // Mirrors ChartsDashboard's mint discipline: read the current
    // permission verdict, classify the transition against the previous one
    // held on a ref (never state — a mint is not a render dependency), and
    // on CROSSED_INTO_GRANTED mint a scoped identity and adopt it. All
    // other transitions are refusals; the ABSENCE sentence carries the
    // reason so the room can name it in words.
    const prev = priorPermission.current;
    priorPermission.current = permissionVerdict;
    const outcome = birthOnPermissionCrossing({
      prev,
      next: permissionVerdict,
      deviceId: thisDeviceId(),
      nowMs: Date.now(),
      nonce: crypto.randomUUID(),
    });
    if (!outcome.born) return;
    if (!outcome.mint.ok) {
      // Refusal is a first-class output. A blank id here would mean the
      // scene "sort of" has a decision — the worst possible middle state.
      setSceneDecisionAbsence(`Decision not minted: ${outcome.mint.reason}`);
      return;
    }
    const candidate: ScopedDecisionIdentity = {
      underlying: symbol,
      owner: expressionOwner,
      identity: outcome.mint.identity,
    };
    setSceneDecision((current) => adoptSceneDecision(current, candidate));
  }, [permissionVerdict, symbol, expressionOwner]);
  React.useEffect(() => {
    // The selectors above fence the transition render; these effects remove
    // stale storage once the room, owner, or thesis side changes.
    setOptionSelection(null);
  }, [symbol, expressionOwner, expressionDirection]);
  React.useEffect(() => {
    setSceneDecision(null);
    priorPermission.current = null;
    setSceneDecisionAbsence("No decision born yet on this scene — permission has not crossed here.");
  }, [symbol, expressionOwner]);
  // ── BUILD ORDER §10 SCENE COMPILER ─────────────────────────────────────────
  // The OS layer: given the state, what is ADMITTED to the surface. This is not
  // emphasis (shellEmphasis already does that) — it is admission, and the panel
  // renders the WITHHELD list so the refusal is visible rather than implied.
  //
  // Right-of-way is computed through the SAME canonical owners the context
  // ribbon uses (computeEvidenceDebt → computeRightOfWay). A second caller of
  // one owner is fine; a second implementation would not be (§24).
  //
  // The capital column is UNOBSERVED on this route and `deckSceneSignals` says
  // so explicitly rather than defaulting it to flat. §14.1.
  //
  // The session comes from `selectCanonicalSessionToken` — the SAME owner the
  // mobile pill and the context ribbon read — and NOT from `identity.session`.
  // That field is the store key; `canonicalSession()` answers "RTH" for every
  // non-crypto instrument on every day of the week. Passing it here made
  // `sessionOpen` permanently true, which made compileScene's CLOSED branch
  // (compileScene.ts, "SESSION CLOSED — LAST VERIFIED. Nothing is streaming.")
  // unreachable on this route. On Saturday 2026-09-05 production rendered SCENE
  // WAIT — "holding is the action" — on a page that was simultaneously printing
  // "SESSION CLOSED — LAST VERIFIED" in eight other nodes. Same market, same
  // instant, four different claims.
  //
  // `sessionClockDate` is the mount-safe day clock, deliberately NOT `nowMs`:
  // closure changes at local midnight, so the scene must not recompile on the
  // 5s cadence, and the first paint must make no day claim at all.
  const sessionClockDate = useSessionClockDate();
  // Hoisted out of the scene memo deliberately. The scene compiler AND the hero
  // truth strip are both consumers of the session, and until now they were not
  // reading the same thing: the scene read this owner while the strip rendered
  // `state.session` — the STORE KEY — so on Saturday 2026-09-05 production
  // printed "session RTH" a few nodes above "SESSION CLOSED — LAST VERIFIED".
  // §24: a second CALLER of one owner is fine; a second ANSWER is not.
  // One call, one answer, two consumers.
  const sessionTruth = React.useMemo(
    () => selectCanonicalSessionToken({ symbol, at: sessionClockDate }),
    [symbol, sessionClockDate],
  );
  const sceneInput = React.useMemo(() => {
    const debt = computeSceneEvidenceDebt(chainVm?.nodes);
    const row = computeSceneRightOfWay(permission, debt);
    return deckSceneSignals({ session: sessionTruth.token, rightOfWay: row.value });
  }, [chainVm?.nodes, permission, sessionTruth]);
  const sceneCompilation = React.useMemo(
    () => compileScene(sceneInput.signals),
    [sceneInput],
  );

  // The Question Router (canon P26/P6) compiles the ONE dominant question the
  // surface is currently answering: a function of the human's job (mode) and
  // what the engine actually resolved (oneStory). It asserts no market fact.
  const experienceQuestion = routeQuestion(experienceContext.mode, oneStory);

  // Market Object Passports (canon P6 Object DNA): each canonical dimension the
  // engine resolved becomes a Passport with its evidence lineage, fidelity,
  // contradictions and invalidation — reversible to provider evidence. Pure
  // read of the sealed state; never a second truth producer.
  const passport = React.useMemo(() => selectMarketObjectPassport(state), [state]);

  // decisionWhy + marketCanvas are already destructured above from the
  // shared composeMarketCanvasVM call. No second, potentially-disagreeing
  // compilation happens here.

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
    // POSITION STATE IS NOT OBSERVABLE FROM THIS SURFACE, and saying so is the
    // fix. The old code derived `hasOpenPosition` from `decisionRecords` alone.
    // That store's only ingress is `DecisionMemoryStore.put()`, which has ZERO
    // production callers (decisionMemoryReachability.test.ts pins this), so the
    // array is provably empty for every owner, forever — the boolean was
    // structurally `false`, and the inference then printed "with no position"
    // to a trader who might be holding one.
    //
    // The scene bus cannot rescue it either: /command-deck deliberately does
    // not publish, because it owns no book (see activeSceneBus.ts). So the
    // honest value here is UNOBSERVED, not `false`. §14.1 — FLAT is a finding,
    // never a default. This does NOT invent a position source; it stops the
    // deck from asserting flatness it never checked.
    const hasUnreviewedClose = decisionRecords.some((r) => !!r.outcome && !r.review);
    return inferJobMode({
      position: "UNOBSERVED",
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
  React.useEffect(() => {
    // Auto-Quiet: only the capital-decision modes (WAIT / EXECUTE) may
    // automatically reveal the proof chain. OBSERVE, MANAGE, REVIEW, and
    // LEARN still rank the relevant inner panel first, but the trader opens
    // the chain deliberately. This prevents a Passport or Receipt preference
    // from expanding the entire evidence stack on arrival.
    setProofChainOpen(deckEmphasis.emphasizeWhy);
  }, [deckEmphasis.emphasizeWhy, experienceContext.mode]);

  // Completion Intelligence (the "DONE" half of the experience grammar): from
  // the SAME concrete decision state, answer "can I stop carrying this now?"
  // and compile a calm Exit Ramp / Completion Receipt. The engine owns the
  // SAFE-TO-LEAVE verdict — this surface only reflects it (never fabricates
  // permission). Additive + presentation-only; it never changes market truth.
  const exitRamp = React.useMemo(() => {
    const signals = deriveCompletionSignals({
      mode: experienceContext.mode,
      decisionRecords,
      resolvedObjectCount: passport.resolvedCount,
      receiptEmpty: decisionReceipt.empty,
      decision: oneStory.decision.value,
    });
    const assessment = selectCompletionState(signals);
    const done: string[] = [];
    if (!decisionReceipt.empty) done.push("Decision receipt sealed");
    if (passport.resolvedCount > 0) done.push(`${passport.resolvedCount} market object(s) resolved`);
    const saved: string[] = [];
    if (decisionRecords.length > 0) saved.push(`${decisionRecords.length} decision record(s) preserved`);
    return composeExitRamp({ assessment, done, saved, returnCondition: signals.returnCondition });
  }, [decisionRecords, decisionReceipt.empty, passport.resolvedCount, experienceContext.mode, oneStory.decision.value]);

  const openWhy = (t: WhyTarget) => {
    setWhyTarget(t);
    setShowEvidence(true);
  };

  // Founder brief (2026-09-13): "CLOSED: last verified market picture remains.
  // Calm. No fake candle activity." Publish the session signal to the shell's
  // sanctuary so the WATER-BREATH slows to WAIT tempo when the tape is closed.
  // The token vocabulary from selectCanonicalSessionToken is "PREMARKET" /
  // "RTH" / "AFTER" / "CLOSED" / "UNKNOWN" — everything that is not CLOSED
  // is treated as OPEN (the tape can move), and UNKNOWN reads as UNKNOWN so
  // silence never implies a decision.
  const sanctuarySession: SanctuarySessionSignal =
    sessionTruth.token === "CLOSED" ? "CLOSED" :
    sessionTruth.token === "UNKNOWN" ? "UNKNOWN" :
                                       "OPEN";

  return (
    <SanctuarySessionProvider value={sanctuarySession}>
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #050506 0%, #0b0b0d 100%)", color: "#ede6d3" }}>
      {/*
        TICKET T G12: the July shell duplicates are gone.

        Founder audit (2026-09-13): the deck was rendering, INSIDE the
        sanctuary, its own header (Charts / Command Deck / Why? / Growth /
        Journal), its own ExperienceModeBar, and its own "Watch the market
        with no position" job caption — all three of which the sanctuary
        shell already renders one layer above. Blur-tested, the eye landed
        on THREE horizontal stripes of navigation before it found MARKET.
        That is exactly the "card → card → card → chart card" silhouette
        the ship-today priorities were written to abolish.

        The single-owner rule applies here too: brand identity, seven-mode
        bar, and one-line job caption live in ONE component
        (WMExperienceShell). The deck starts with its own contribution: the
        italic question and the read-only suggestion chip — both of which
        REACT to the mode bar the shell owns, without recreating it.

        openWhy, showEvidence, CanvasSummaryPill, and INSTRUMENT_VIEW_ROUTE
        are still reachable from inside the composed scene below (WHY panel,
        Market Canvas anchor, forward-arrow chip). Removing the sub-nav
        does not lose functionality — it lets the eye reach the room.
      */}

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "12px 16px", position: "relative" }}>
        {/*
          SCENE_FRAGMENTATION repair (Founder audit 2026-09-13, §30 STEP 3
          "Embed NOW into MARKET").

          Measured live on production at 1920x847 before this change: the first
          market pixel began at y=402 — 47% of the way down the viewport — with
          the candle canvas owning only 18% of viewport AREA. Five separately
          stacked bands sat above it: the shell header (69px), the mode caption
          (26px), THIS question + job block (47px + 16px margin), the NOW
          identity block (175px), and the decision-absence line (14px).

          The thesis question is not a preamble to the room. It IS the room's
          NOW. Rendering it as its own band outside `deck-market-scene` forced
          the trader to reconstruct one decision from two stacked mental models.
          It now rides inside `scene-now`, under the same scene owner as chart,
          risk, WHY and NEXT. This is a MOVE, not a removal: the question and
          the job suggestion still render, still react to the shell's mode bar,
          still set the mode on click. They moved INTO the decision instead of
          sitting above it.

          (The first draft of this comment said "N-o-t-h-i-n-g was deleted" and
          turned journalBookCoverage.sentinel.test.ts red — that gate forbids
          the deck from restating coverage-disclosure wording and cannot tell a
          comment from a string literal. The gate is right and the prose moved.
          Loosening a disclosure gate to accommodate a comment would be the
          wrong trade.)
        */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Responsive shim — mobile viewport should never see the
              two-column layout that would force a 380px WHY panel next
              to a squeezed main column. Use CSS media query via style
              tag so we don't require a global stylesheet touch. */}
          <style>{`
            /* Founder audit 2026-09-13: the .wm-cd-header* rules that used
               to live here belonged to the July sub-nav (Charts / Command
               Deck / Why? / Growth / Journal), which was stripped in
               fd24a80. They are gone with the DOM they styled. */
            .wm-cd-chapter-history { min-width: 0; }
            .wm-cd-chapter-history > summary {
              min-height: 44px;
              min-width: 0;
              display: flex;
              align-items: center;
              padding: 10px 12px;
              border: 1px solid rgba(212, 175, 55, 0.2);
              border-radius: 10px;
              color: #c9a55c;
              cursor: pointer;
              font-size: 11px;
              letter-spacing: 0.5px;
              overflow-wrap: anywhere;
            }
            .wm-cd-chapter-history > summary:focus-visible {
              outline: 2px solid #d4af37;
              outline-offset: 2px;
            }
            .wm-cd-chapter-history-content {
              min-width: 0;
              overflow-x: auto;
              overscroll-behavior-x: contain;
              padding-top: 12px;
            }
            .wm-cd-chapter-history:not([open]) > .wm-cd-chapter-history-content {
              display: none;
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
            @media (min-width: 1100px) {
              .wm-cd-market-workspace {
                display: grid !important;
                grid-template-columns: minmax(0, 1.8fr) minmax(280px, 0.62fr);
                grid-template-areas:
                  "now now"
                  "market context";
                align-items: start;
              }
              .wm-cd-market-now { grid-area: now; }
              .wm-cd-market-field { grid-area: market; }
              .wm-cd-market-context { grid-area: context; }
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
          {/* Founder brief 2026-09-13 §6: "MARKET should become the
              dominant continuous spatial environment." A 20px gap between
              sections made the workspace read as separate cards floating
              on the sanctuary field; a 12px gap keeps enough negative
              space for the eye to distinguish aspects while dissolving
              the "each section is its own container" mental model. */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            {/* Ticket T "WHY with Spaidbot on the same object" — the deck used
                to omit the #wm-chart-context span. Only /charts published it,
                so on /command-deck the global SpaidBotButton read {} and the
                model answered questions with no idea WHICH INSTRUMENT or WHICH
                TIMEFRAME the trader was looking at. Same wire the
                formatChartContextNote validator already re-derives on the
                server (canonicalRole, timeframe fallback, unknown-collapse),
                so nothing hostile can be smuggled from this end. */}
            <span
              id="wm-chart-context"
              data-ctx={JSON.stringify({
                symbol,
                timeframe,
                role: state?.qualityState ?? null,
                price: state?.price?.last ?? null,
              })}
              style={{ display: "none" }}
            />
            {/* Ticket T's NOW / MARKET / RISK / WHY / NEXT — one scene owner,
                one canonical compilation, and one adopted decision identity.
                The page may birth an identity only on a real permission
                crossing; layout and disclosures never mint one. */}
            {/* Founder brief 2026-09-13: "MARKET IS THE ROOM. Not a
                little chart card inside a dashboard." Before this
                reorder, the six-column SpineBand summary sat above the
                chart; blur-test at 1440x723 landed on a card grid
                (DECISION / NOW / MARKET / RISK / WHY / NEXT text
                columns) BEFORE the candle geometry. The chart is now
                first — the SpineBand is the compiled summary that
                supports the room, not the other way around. */}
            <div
              className="wm-cd-market-workspace"
              aria-label="One decision market room"
              data-testid="deck-market-scene"
              data-decision-id={currentSceneDecision?.decisionId ?? undefined}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              {/* NOW belongs to MARKET. It is deliberately inside the same
                  scene owner as chart, risk, WHY, NEXT, and the spine; opening
                  its explanation only changes the contextual layer and never
                  creates a second decision. */}
              <div
                className="wm-cd-market-now"
                data-testid="scene-now"
                data-decision-id={currentSceneDecision?.decisionId ?? undefined}
              >
                {/* The one dominant question and (when confidence justifies
                    it) the read-only job suggestion. The sanctuary shell owns
                    brand, mode bar and mode caption — never duplicate them
                    here. These belong to NOW, inside the scene owner. */}
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
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
                  {jobSuggestion.strength !== "NONE" && jobSuggestion.inference && (() => {
                    const sug = jobSuggestion.inference;
                    const hint = jobSuggestion.strength === "HINT";
                    return (
                      <button
                        type="button"
                        onClick={() => setExperienceMode(sug.suggested)}
                        title={sug.reason}
                        style={{
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
                        sessionPresented={{ value: sessionTruth.token, detail: sessionTruth.detail }}
                        density="room"
                      />
                    </button>
                  );
                })()}
                <SceneAdmits compilation={sceneCompilation} element="ONE_STORY">
                  <OneStoryStrip vm={oneStory} />
                </SceneAdmits>
                <div
                  data-testid="scene-decision"
                  data-decision-id={currentSceneDecision?.decisionId ?? undefined}
                  style={{ marginTop: 6, color: "#8a8271", fontSize: 9, letterSpacing: 0.4 }}
                >
                  {currentSceneDecision
                    ? `DECISION · ${currentSceneDecision.decisionId}`
                    : sceneDecisionAbsence}
                </div>
              </div>

              <div
                className="wm-cd-market-field"
                data-testid="scene-market"
                data-decision-id={currentSceneDecision?.decisionId ?? undefined}
                style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}
              >
                <DeckMarketChart symbol={symbol} timeframe={timeframe} />
              </div>
              <section
                className="wm-cd-market-context"
                aria-label="Risk, why, and next"
                data-testid="scene-support"
                data-decision-id={currentSceneDecision?.decisionId ?? undefined}
                style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}
              >
                <div data-testid="scene-risk" data-decision-id={currentSceneDecision?.decisionId ?? undefined}>
                  <AvailableRChip vm={chainVm?.availableR ?? null} />
                </div>
                <details
                  className="wm-cd-market-why"
                  data-testid="scene-why"
                  data-decision-id={currentSceneDecision?.decisionId ?? undefined}
                  style={{ borderTop: "1px solid rgba(139,106,41,0.22)", paddingTop: 10 }}
                >
                  <summary
                    style={{
                      minHeight: 38,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      cursor: "pointer",
                      listStyle: "none",
                      color: "#c9a55c",
                      fontSize: 10,
                      letterSpacing: 0.55,
                      textTransform: "uppercase",
                    }}
                  >
                    <span>Why · decision evidence</span>
                    <span style={{ color: "#8a8271" }}>
                      {marketCanvas.blockers.length} blocker{marketCanvas.blockers.length === 1 ? "" : "s"} · inspect
                    </span>
                  </summary>
                  <DecisionWhyPanel vm={decisionWhy} />
                  <MarketCanvasPanel vm={marketCanvas} />
                </details>
                <div data-testid="scene-next" data-decision-id={currentSceneDecision?.decisionId ?? undefined}>
                  <DeckExpressionShortlist
                    symbol={symbol}
                    spot={state?.price?.last ?? null}
                    direction={expressionDirection}
                    onSelect={(slot, receipt) => {
                      if (!slot.contract || !expressionDirection || receipt.source === "unknown" || receipt.fidelity === "UNKNOWN") return;
                      setOptionSelection({
                        underlying: symbol,
                        owner: expressionOwner,
                        direction: expressionDirection,
                        contract: slot.contract,
                        source: receipt.source,
                        fidelity: receipt.fidelity,
                        providerPath: receipt.providerPath,
                        rightsPolicyId: receipt.rightsPolicyId,
                      });
                    }}
                  />
                  {selectedExpression && (
                    <OptionExpressionIntent
                      key={`${expressionOwner}:${symbol}:${selectedExpression.contract.symbol}:${selectedExpression.contract.expirationDate}:${selectedExpression.contract.contractType}:${selectedExpression.contract.strike}`}
                      ownerId={user?.id ?? ""}
                      underlying={symbol}
                      contract={selectedExpression.contract}
                      source={selectedExpression.source}
                      fidelity={selectedExpression.fidelity}
                      providerPath={selectedExpression.providerPath}
                      rightsPolicyId={selectedExpression.rightsPolicyId}
                      bornDecision={currentSceneDecision}
                      onIdentity={(identity: DecisionIdentity) => setSceneDecision({ underlying: symbol, owner: expressionOwner, identity })}
                      onClear={() => setOptionSelection(null)}
                    />
                  )}
                  {/* Exit Ramp is the terminal NEXT state, not a second card
                      below the market room. It stays silent while work remains
                      and renders the existing canonical completion receipt when
                      the assessment says the trader may stop carrying it. */}
                  <ExitRampCard ramp={exitRamp} />
                </div>
              </section>
            </div>

            {/* Today's morning-prep intention (if any) — the PREP→OBSERVE
                bridge from Founder Aug-14 §14 'Morning Prep intention
                appears later in review.' Silent when no entry today
                (never fabricates). */}
            <TodayPrepBridge userId={user?.id ?? null} />

            {/* Advanced proof remains available below the market room, but the
                primary decision story and Exit Ramp now live with NOW/NEXT. */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* The proof chain remains complete, but it no longer competes
                  with the hero and one-story read. Advanced evidence is one
                  intentional disclosure instead of four stacked gold panels. */}
              <details
                key={`evidence-${experienceContext.mode}`}
                className="wm-cd-evidence-drawer"
                open={proofChainOpen}
                onToggle={event => setProofChainOpen(event.currentTarget.open)}
                style={{
                  order: surfaceOrder(deckEmphasis, "WHY"),
                  border: "1px solid rgba(139,106,41,0.28)",
                  borderRadius: 12,
                  background: "rgba(10,12,18,0.72)",
                  overflow: "hidden",
                }}
              >
                <summary
                  style={{
                    minHeight: 54,
                    padding: "0 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    color: "#d7d9e2",
                    fontSize: 12,
                    fontWeight: 750,
                    listStyle: "none",
                  }}
                >
                  <span>Evidence &amp; reasoning</span>
                  <span style={{ color: "#8a8271", fontSize: 10, fontWeight: 500 }}>
                    Open the proof chain
                  </span>
                </summary>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
                  {/* Scene admission and layout provenance are canonical proof,
                      not the trader's primary read. Keep them available here
                      without letting implementation vocabulary interrupt
                      MARKET → RISK → NEXT in the default Founder room. */}
                  <div
                    aria-live="polite"
                    style={{
                      fontSize: 10,
                      color: "#8a8271",
                      display: "flex",
                      gap: 6,
                      alignItems: "baseline",
                    }}
                  >
                    <span style={{ color: "#c9a55c", textTransform: "uppercase", letterSpacing: 0.6 }}>
                      Scene rationale
                    </span>
                    <span>
                      {deckEmphasis.rationale}
                      {deckEmphasis.refinementNote && (
                        <span style={{ color: "#c9a55c" }}> · {deckEmphasis.refinementNote}</span>
                      )}
                    </span>
                  </div>

                  <SceneAdmissionPanel
                    compilation={sceneCompilation}
                    provenance={sceneInput.provenance}
                    observedCount={sceneInput.observedCount}
                    totalCount={sceneInput.totalCount}
                    governed={DECK_GOVERNED_ELEMENTS}
                  />

                  {/* WHY / WHY NOT (canon P6) — reverses the right-of-way verdict to
                      its concrete causes so the trader sees exactly what stands
                      between them and entry (or why the path is clear). */}
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
                </div>
              </details>
              {/* Canon §9 Learning Genome — surfaced in REVIEW / LEARN
                  where the trader is looking backward. Silent when
                  either the bundle is still hydrating or the trader
                  hasn't logged enough plan-adherence / MFE data to
                  measure two dimensions comparably. */}
              {/* §9 INTERRUPTION LAW: "Only capital truth and material
                  invalidation may take the room. Academy may not." The Learning
                  Genome is Academy — a backward-looking diagnostic. It is the
                  one surface on this route the law names by category, so it is
                  the one that carries the ambient gate.

                  Honest scope: this route's capital column is permanently
                  UNOBSERVED, so `admitsAmbient` is true in all four scenes it
                  can reach and nothing is withheld here today. The gate exists
                  so the panel's "Ambient surfaces are withheld" sentence is
                  true the first time it renders, rather than false on the first
                  screen where money is actually exposed. */}
              <SceneAdmitsAmbient compilation={sceneCompilation}>
                {(experienceContext.mode === "REVIEW" || experienceContext.mode === "LEARN") &&
                learningGenome &&
                learningGenome.genome.headlineWeakness ? (
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
                ) : null}
              </SceneAdmitsAmbient>
            </div>

            {/* Connection diagnostics are operational evidence, not the
                trader's primary market story. Keep the complete wireboard one
                deliberate tap away so auth/config failures remain inspectable
                without turning the Command Deck into permanent infrastructure
                chrome. */}
            <details className="wm-cd-connection-diagnostics">
              <summary
                style={{
                  minHeight: 44,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  fontSize: 10,
                  letterSpacing: 0.6,
                  color: "#8a8271",
                  textTransform: "uppercase",
                  padding: "4px 0",
                }}
              >
                Connections · provider readiness
              </summary>
              <ProviderWireStrip compact />
            </details>

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

            {/* Per-capability fidelity — canon §Provider Status Is
                Resolved Per Capability (Founding Contract 2026-08-29).
                Rendered inside a canonical <SemanticZoom> so the deck
                honors §Phase 2 Experience Shell 4-level pattern:
                  L1 — one-glance summary line
                  L2 — essential evidence (weakest capability + coverage line)
                  L3 — full per-capability grid
                (§Semantic Zoom skips L4 here — silent per canon.) */}
            {(() => {
              const bookLevels =
                (wsFeed.orderBook?.bids?.length ?? 0) +
                (wsFeed.orderBook?.asks?.length ?? 0);
              // X7 (canon §Provider Status Per Capability): light ORDER
              // FLOW from real aggressor-volume observation via the pure
              // selectAggressorFlow primitive. When hasFlow=true we KNOW
              // aggressor deltas are being derived from real ticks;
              // undefined otherwise (canon §Silence).
              const aggressorFlow = wsFeed.connected
                ? selectAggressorFlow(wsFeed.recentTicks)
                : null;
              const orderFlowDerived =
                aggressorFlow != null && aggressorFlow.hasFlow ? true : undefined;
              const capabilityReport = selectPerCapabilityFidelity({
                source: wsFeed.source ?? "unavailable",
                connected: wsFeed.connected,
                hasCandles: !!state,
                // Canon §8 — the deck's bars/quotes slots claimed an active
                // session on a closed one. ticks/orderFlow below keep their
                // own owners; closure governs market-data capabilities only.
                sessionOpen,
                // TICKS lit from real wsFeed tape signal
                tapeConnected: !wsFeed.connected
                  ? undefined
                  : (wsFeed.recentTicks?.length ?? 0) > 0,
                orderFlowDerived,
                // DEPTH lit from real wsFeed order-book signal. When the
                // book is empty we leave DEPTH UNDEFINED (silent) rather
                // than lighting BLOCKED_BY_ENTITLEMENT — empty could
                // mean "no L2 provider wired" and canon §Silence
                // requires the caller not claim knowledge it doesn't
                // have.
                depthSubscribed: bookLevels > 0 ? true : undefined,
              });
              const evaluated = evaluatedCapabilityCount(capabilityReport);
              const weakest = weakestCapability(capabilityReport);
              const strongest = strongestCapability(capabilityReport);
              return (
                <div style={{ marginTop: 6 }}>
                  <SemanticZoom
                    ariaLabel="Data fidelity per capability"
                    levels={{
                      1: (
                        <div className="text-[10px]" style={{ color: "#8B92AC", padding: "4px 2px" }}>
                          {evaluated === 0 ? (
                            <span className="italic">Fidelity not yet evaluated</span>
                          ) : weakest && strongest && weakest.capability === strongest.capability ? (
                            <span>
                              <span style={{ color: "#F0B429", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                Data
                              </span>{" · "}
                              <span>{evaluated} / 7 capabilities · {strongest.label}</span>
                            </span>
                          ) : weakest && strongest ? (
                            <span>
                              <span style={{ color: "#F0B429", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                Data
                              </span>{" · "}
                              <span>{evaluated} / 7 capabilities · strongest {strongest.capability} = {strongest.label}</span>
                              {weakest.label !== strongest.label && (
                                <span> · weakest {weakest.capability} = {weakest.label}</span>
                              )}
                            </span>
                          ) : null}
                        </div>
                      ),
                      2: (
                        <div style={{ padding: "6px 2px", display: "flex", flexDirection: "column", gap: 4 }}>
                          {evaluated === 0 ? (
                            <span className="text-[11px] italic" style={{ color: "#8B92AC" }}>
                              No capabilities evaluated yet — nothing to summarise (canon §Silence Is A Feature).
                            </span>
                          ) : (
                            <>
                              <div className="text-[11px]" style={{ color: "#E4E7EF", fontWeight: 600 }}>
                                {weakest && strongest && weakest.capability !== strongest.capability
                                  ? `Weakest: ${weakest.capability} — ${weakest.label}`
                                  : `All evaluated capabilities: ${strongest?.label ?? "—"}`}
                              </div>
                              <div className="text-[10px]" style={{ color: "#8B92AC" }}>
                                {evaluated} of 7 capabilities evaluated
                                {strongest && weakest && weakest.capability !== strongest.capability
                                  ? ` · strongest: ${strongest.capability} — ${strongest.label}`
                                  : ""}
                              </div>
                            </>
                          )}
                        </div>
                      ),
                      3: (
                        <PerCapabilityFidelityGrid
                          symbol={symbol}
                          showUnevaluated
                          report={capabilityReport}
                        />
                      ),
                    }}
                  />
                </div>
              );
            })()}

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

            {/* HOW MUCH OF THE BOOK THE EDGE CHIP IS SPEAKING FOR.
                Deliberately NOT gated on sessionDecisions.length: a book
                whose records were ALL unreadable produces zero decisions,
                which is the exact case where an unqualified silence would
                read as 'you have no history' rather than 'WM could not
                read it'. §24 D — WM may refuse a record, but not quietly. */}
            {journalCoverage.note != null && (
              <p
                role="note"
                className="text-[10px] leading-relaxed text-wm-text-dim"
                style={{ marginTop: 8 }}
              >
                {journalCoverage.note}
              </p>
            )}

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
                    href={INSTRUMENT_VIEW_ROUTE}
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

            {/* DEEP READ — the numbered analytical stack (Story Ribbon, the
                auction lens, the 9-node Decision Chain, Steward rules, Data
                Fidelity). In the live-decision loop (OBSERVE / WAIT / EXECUTE /
                MANAGE) it is collapsed by default so the calm lead — One Story /
                one question / Hero Truth — owns the first screen and the depth is
                one deliberate click away; in the deliberate-analysis jobs (PREP /
                REVIEW / LEARN) it opens because the chain IS the material being
                worked. Open-state is derived from the same canonical deckEmphasis
                that reorders the surfaces above — presentation-only, every section
                stays in the DOM and reachable in every job. */}
            {chainVm && (
            <details open={deckEmphasis.deepSectionsOpen}>
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: 10,
                  letterSpacing: 0.6,
                  color: "#c9a55c",
                  textTransform: "uppercase",
                  padding: "6px 0",
                }}
              >
                Deep read · story · auction lens · decision chain · steward · fidelity
              </summary>
            {/* One Story owns the primary read. Preserve the full market
                chronology one deliberate layer deeper instead of repeating it
                as another large numbered gold section. */}
            <details className="wm-cd-chapter-history">
              <summary>Market chapter history</summary>
              <div className="wm-cd-chapter-history-content">
                <StoryRibbon state={state} history={history} />
              </div>
            </details>

            {/* §10 THESIS_GEOMETRY — sections 2 and 3 are ONE admission.
                Both render the same claim at two resolutions: the auction lens
                is the four-dimension summary, the decision chain is the nine
                nodes underneath it. Admitting one without the other would put
                a conclusion on screen with its own workings withheld, which is
                the "SHOW FIRST, EXPLAIN SECOND" order run backwards.

                Withheld in PREGAME (nothing has traded yet) and in CLOSED
                (§9: candles remain, last verified time remains, no fake
                stream — a live directional read over a dead tape IS a fake
                stream wearing a chart). Admitted in WAIT and PERMISSION.

                The note is required rather than optional here: these are
                NUMBERED sections inside a collapsed drawer. A trader who
                opens "Deep read" and finds 1 then 4 has no way to tell a
                refusal from a bug. */}
            <SceneAdmits
              compilation={sceneCompilation}
              element="THESIS_GEOMETRY"
              withheldNote={
                sceneCompilation.scene === "CLOSED"
                  ? "Sections 2–3 (auction lens · decision chain) are withheld while the session is closed. The tape is not moving, so a directional read would be describing a market that is not there."
                  : "Sections 2–3 (auction lens · decision chain) are withheld until this session has produced something to read."
              }
            >
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
            </SceneAdmits>

            {/* Structure context — surfaces external vs internal contradictions.
                Deliberately OUTSIDE the THESIS_GEOMETRY gate above. This is not
                a thesis; it is the note that says the thesis and the tape
                disagree. §9 names material invalidation as one of the only two
                things allowed to take the room, and it renders null unless a
                contradiction actually exists, so it can never become furniture. */}
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
            </details>
            )}

            {/* Opening Bell — only during PREPARATION phase */}
            {chainVm && phase === "PREPARATION" && (
              <OpeningBellPanel
                vm={selectOpeningBell({
                  ownerId: user?.id ?? "",
                  sessionIdentity: `session-${new Date(nowMs).toISOString().slice(0, 10)}`,
                  items: DEFAULT_PREPARATION_TEMPLATE.map((t) => ({ ...t, completed: false })),
                  minutesUntilOpen: null,
                  dataQuality: state?.qualityState,
                  nowMs,
                })}
              />
            )}

            {/* Mirror — meaningful during REVIEW + POST_EXIT */}
            {chainVm && (phase === "REVIEW" || phase === "POST_EXIT") && (
              <MirrorPanel
                vm={selectMirror({
                  ownerId: user?.id ?? "",
                  decisions: sessionDecisions,
                  nowMs,
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
    </SanctuarySessionProvider>
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
        // SCENE_FRAGMENTATION cure: the "this morning's intention"
        // callout had a full border + tint + radius. The 3px gold
        // left accent already carries the emphasis; the surrounding
        // wall added nothing.
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px 10px 18px",
        borderLeft: "3px solid #d4af37",
        background: "transparent",
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
