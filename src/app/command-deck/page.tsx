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
// Sourced from the COMPILER, not from selectPermission directly — the deck
// routes through composeMarketCanvasVM for everything permission-shaped, and
// that is what the single-writer Sentinel enforces.
import { defaultFounderRules } from "@/lib/marketData/viewModels/composeMarketCanvasVM";
import { useMarketStory } from "@/lib/marketData/viewModels/useMarketStory";
import DecisionChainPanel from "@/components/chart/DecisionChainPanel";
import StructureContextNote from "@/components/chart/StructureContextNote";
import StoryRibbon from "@/components/chart/StoryRibbon";
import ATHOSInterventionPanel from "@/components/athos/ATHOSInterventionPanel";
import { selectATHOSIntervention, type ATHOSIntervention } from "@/lib/traderMemory/viewModels/selectATHOSIntervention";
import MirrorPanel from "@/components/mirror/MirrorPanel";
import { selectMirror } from "@/lib/traderMemory/viewModels/selectMirror";
import { selectPrepEvidence } from "@/lib/experience/openingBellPrep";
import OpeningBellEvidence from "@/components/opening-bell/OpeningBellEvidence";
import type { MarketQualityState } from "@/lib/marketData/canonicalMarketState";
// The single writer for every contradiction claim WM makes. A contradiction
// requires TWO determinations to disagree; with fewer than two on the packet,
// `contradictions.length === 0` is arithmetic about an empty set, not evidence
// of coherence. See canonicalMarketState.describeContradictionCoverage.
import { describeContradictionCoverage } from "@/lib/marketData/canonicalMarketState";
// The single writer for every gap claim WM makes. See coverageMap.ts —
// a bare `gapCount` is not evidence unless gaps were detectable at all.
import { describeGapCoverageTotal } from "@/lib/marketData/coverageMap";
import { useDecisionMemory, useDecisionMemoryRecords } from "@/lib/traderMemory/useDecisionMemory";
import { useJournalBook } from "@/lib/traderMemory/adapters/useJournalSnapshots";
import { selectUnreviewedCloses } from "@/lib/journal/selectUnreviewedCloses";
import PersonalEdgeChip from "@/components/journal/PersonalEdgeChip";
import { selectPersonalEdge } from "@/lib/traderMemory/viewModels/selectPersonalEdge";
import HeroTruth from "@/components/command-deck/HeroTruth";
import DLARStrip, { type DLARDimensionKey } from "@/components/command-deck/DLARStrip";
import WhyInspector, { type WhyTarget } from "@/components/command-deck/WhyInspector";
import SectionBanner from "@/components/brand/SectionBanner";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import {
  normalizeMarketSurfaceSymbol,
  normalizeMarketSurfaceTimeframe,
  resolveMarketSymbolSeed,
} from "@/lib/routing/marketSurfaceQuery";
import RealmGateway from "@/components/brand/RealmGateway";
import { useTodayPrep } from "@/lib/traderMemory/adapters/useTodayPrep";
import CommandContextRibbon from "@/components/command/CommandContextRibbon";
import OneStoryStrip from "@/components/command/OneStoryStrip";
import SceneAdmissionPanel from "@/components/experience/SceneAdmissionPanel";
import SignalProvenanceStrip from "@/components/experience/SignalProvenanceStrip";
import SceneAdmits, { SceneAdmitsAmbient } from "@/components/experience/SceneAdmits";
import { compileScene, type SurfaceElement } from "@/lib/experience/compileScene";
import { deckSceneSignals } from "@/lib/experience/deckSceneSignals";
import { selectCapitalPosture } from "@/lib/experience/selectCapitalPosture";
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
import DeckMarketChart, { type Candle as DeckCandle } from "@/components/experience/DeckMarketChart";
import { selectPriceEvidence } from "@/lib/marketData/formatSpinePrice";
import AvailableRChip from "@/components/experience/AvailableRChip";
import CapitalPostureLine from "@/components/experience/CapitalPostureLine";
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
import { selectQuestionFocus } from "@/lib/experience/selectQuestionFocus";
import { selectSecondaryNoise } from "@/lib/experience/selectSecondaryNoise";
import { selectPassportStamp } from "@/lib/experience/selectPassportStamp";
import { DECK_SECTIONS, deckSection } from "@/lib/experience/deckSectionIndex";
import PassportStamp from "@/components/command/PassportStamp";
import { selectMateriality } from "@/lib/marketData/viewModels/selectMateriality";
import ActiveQuestionBar from "@/components/command/ActiveQuestionBar";
import { usePublishOsStanding } from "@/components/os/osStandingContext";
import { standingFromOneStory } from "@/components/os/standingFromOneStory";
import { selectDeckEmphasis, surfaceOrder } from "@/lib/experience/selectDeckEmphasis";
import { inferJobMode } from "@/lib/experience/inferJobMode";
import { selectJobSuggestion } from "@/lib/experience/selectJobSuggestion";
import { selectCompletionState } from "@/lib/experience/selectCompletionState";
import { deriveCompletionSignals } from "@/lib/experience/deriveCompletionSignals";
import { composeExitRamp } from "@/lib/experience/composeExitRamp";
import ExitRampCard from "@/components/experience/ExitRampCard";
import PracticeHonestyLayer from "@/components/experience/PracticeHonestyLayer";
import {
  usePracticeHonestyLedger,
  practiceHonestyIsSilent,
} from "@/lib/practice/usePracticeHonestyLedger";
import { useLearningGenomeBundle } from "@/lib/learningGenome/useLearningGenomeBundle";
import { LearningGenomeInspector } from "@/components/learningGenome/LearningGenomeInspector";
import ProviderWireStrip from "@/components/marketData/ProviderWireStrip";
import RoomEquipmentLayer from "@/components/experience/RoomEquipmentLayer";
import { useEquipmentJourney } from "@/lib/workspace/useEquipmentJourney";

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
  // lets the parent sanctuary's deep-obsidian material plane remain visible
  // instantly. An opaque route fallback would briefly cover the atmosphere
  // that the Asset-10 parent owns.
  return (
    // The route plane below already moved off `100vh` for this reason; the
    // fallback ABOVE it did not, so the scroll it was fixed for came back
    // during the exact frames the trader is waiting.
    <React.Suspense fallback={<div data-testid="deck-suspense-plane" style={{ minHeight: "100%", background: "transparent" }} />}>
      <CommandDeckInner />
    </React.Suspense>
  );
}

function CommandDeckInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { activeSymbol, setActiveSymbol } = useActiveSymbol();
  const urlSymbol = searchParams?.get("symbol");
  const urlTf = searchParams?.get("tf");
  const requestedSymbol = normalizeMarketSurfaceSymbol(urlSymbol);
  const requestedTimeframe = normalizeMarketSurfaceTimeframe(urlTf);
  const seededUrlSymbol = React.useRef<string | null>(null);
  const symbolSeed = resolveMarketSymbolSeed(requestedSymbol, activeSymbol, seededUrlSymbol.current);

  // The URL wins the arrival render, then yields to SymbolContext after its
  // one validated seed. This preserves deep-link fidelity without turning an
  // old query string into a leash over later watchlist selections.
  const symbol = symbolSeed.displaySymbol;
  const timeframe = requestedTimeframe || "15m";
  React.useEffect(() => {
    const seed = resolveMarketSymbolSeed(requestedSymbol, null, seededUrlSymbol.current);
    seededUrlSymbol.current = seed.nextSeededSymbol;
    if (!seed.shouldSeedContext) return;
    setActiveSymbol(seed.displaySymbol);
  }, [requestedSymbol, setActiveSymbol]);
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
  // THE DECK'S OWN CANDLES, PUBLISHED.
  //
  // `DeckMarketChart` fetches ~120 real candles from /api/yahoo and, until
  // this state existed, kept every one of them private. Canonical market state
  // therefore held no bars, `deriveLastBarClose` returned null, and HeroTruth
  // printed `?` for price DIRECTLY ABOVE a chart rendering those same candles.
  //
  // Observed on production 2026-09-16, TSLA: last close 356.58 drawn on the
  // canvas under the words "Read just now", `?` in the hero eleven pixels up.
  // Understating what the room knows is a truth defect in the same family as
  // overclaiming it — see deriveLastBarClose.ts, which exists for exactly this
  // shape on /charts.
  //
  // The chart remains the ONLY fetcher. This is a forward, not a second
  // request, so there is still exactly one owner of "ask for candles".
  const [deckCandles, setDeckCandles] = React.useState<readonly DeckCandle[] | null>(null);
  // Stable identity: DeckMarketChart's publish effect depends on this
  // callback, so an inline lambda would re-fire it on every deck render.
  const handleDeckCandles = React.useCallback((candles: readonly DeckCandle[]) => {
    setDeckCandles(candles);
  }, []);

  usePublishChartMarketState({
    symbol,
    timeframe,
    session: identity.session,
    ticker: wsFeed.ticker,
    recentTicks: wsFeed.recentTicks,
    source: wsFeed.source,
    connected: wsFeed.connected,
    bars: deckCandles,
  });

  const state = useCanonicalMarketState(identity);
  // ONE owner of "which price fact wins" for every consumer in this room —
  // the hero, the spine, and the assistant's context note.
  const chartContextPrice = selectPriceEvidence(
    state?.price?.last,
    state?.lastBar?.close,
    state?.lastBar?.timeframe,
  );
  const history = useCanonicalMarketStateHistory(identity, 6);
  // THE STORY IS COMPILED EXACTLY ONCE, HERE, WITH CONTINUITY.
  //
  // `selectMarketStory`'s third argument carries every temporal fact — when
  // the market ENTERED the current chapter, the chapter history, and the
  // freshness window that keeps a momentary evidence gap from reading as "no
  // story". This page used to call the selector twice and pass that argument
  // neither time, so the chapter clock was pinned at zero and the disclosure
  // labelled "Market chapter history" could never contain one.
  //
  // Both consumers below (HeroTruth and StoryRibbon) read THIS object. Giving
  // one memory and not the other would replace a missing story with two
  // surfaces disagreeing about which chapter the market is in.
  const marketStory = useMarketStory(state, history);
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
  const {
    snapshots: journalDecisions,
    coverage: journalCoverage,
    entries: journalEntries,
  } = useJournalBook(user?.id ?? null);
  // THE REVIEW QUESTION, ASKED OF A BOOK THAT CAN ANSWER IT.
  //
  // `decisionRecords` below comes from decisionMemoryStore, whose only ingress
  // has ZERO production callers (decisionMemoryReachability.test.ts pins it),
  // so every `hasUnreviewedClose` derived from it is structurally false — and
  // the Exit Ramp could therefore reach DONE ("acceptance criteria are
  // truthfully complete") for a trader with today's trades sitting unjudged in
  // their Journal. That `false` was a DEFAULT, not a FINDING.
  //
  // This reads the same book the Learning Genome already reads, on the same
  // subscription. It does not seal a decision, write to the store, or claim the
  // store is reachable — it answers the question from the evidence that exists.
  const unreviewedCloses = React.useMemo(
    () => selectUnreviewedCloses(journalEntries, new Date(nowMs).toISOString().slice(0, 10)),
    [journalEntries, nowMs],
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

  /**
   * `permissionInputs` is REQUIRED here, not optional.
   *
   * Without it `selectDecisionChain` leaves its permission node null and the
   * chain narrates a non-evaluation, while `composeMarketCanvasVM` below
   * compiles a real verdict off `defaultFounderRules()`. Both rendered on the
   * same screen: the chain's PERMISSION row and the Steward's RESTRICTED
   * verdict, ~140px apart, disagreeing about whether the trader has any rules.
   *
   * The four values below are the SAME ones handed to composeMarketCanvasVM —
   * `sessionIdentity` is spelled to match its `defaultSessionIdentity(nowMs)`
   * exactly. Both are pure selectors, so identical inputs give identical
   * output; the chain becomes the single writer and the compiler reads it.
   * If these two call sites ever drift apart, a Sentinel fails.
   */
  const chainVm = React.useMemo(() => {
    if (!state) return null;
    return selectDecisionChain({
      state,
      history,
      nowMs,
      phase,
      permissionInputs: {
        ownerId: user?.id ?? "",
        sessionIdentity: `session-${new Date(nowMs).toISOString().slice(0, 10)}`,
        rules: defaultFounderRules(),
        sessionDecisions,
      },
    });
  }, [state, history, phase, nowMs, user?.id, sessionDecisions]);

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

  /*
    ONE OS. The deck used to wrap itself in a shell, which put a second
    masthead inside the sanctuary's. It now PUBLISHES its compiled readings
    upward and the single frame — mounted above every founder room — renders
    them. What the deck has not compiled stays UNKNOWN in the chrome; the
    frame is never more confident than the room that fed it.
  */
  usePublishOsStanding({
    // Only the room knows its own name.
    surface: "Question-Driven Mode",
    // Everything a compiled story can justify comes from ONE owner, shared with
    // every other room that publishes upward. This used to be three inline
    // expressions here — which quietly made the deck the author of a rule that
    // /charts then had to re-invent, and got wrong by publishing nothing.
    ...standingFromOneStory(oneStory),
    /*
      THE FEED OBSERVATION — the same omission /charts already paid for.

      Until now this call published a surface and a Right of Way and no `feed`,
      so `compileFeedStanding` took the `source === null` arm and the frame
      printed FEED UNKNOWN in the masthead and SOURCE UNKNOWN in the footer.
      Measured live on production 2026-09-17 at fb7826c, /command-deck wore both
      of those labels while the SAME PAGE, inches below, printed `source alpaca`,
      `coverage 1 channel`, `358.08 LAST 15M BAR CLOSE` and drew 120 candles.
      One screen answering its own question twice, in two different voices —
      §14.1: the UNKNOWN was a DEFAULT, not a FINDING.

      Nothing here is derived. Every value was already resolved above for the
      deck's own panels: `wsFeed` is the transport, `sessionOpen` is the proven
      closure calendar, `deckCandles` is the array the deck forwards into
      canonical market state and draws. `priceSourceBadge` remains the sole
      grader — this publishes EVIDENCE, never a verdict.
    */
    feed: {
      // "unavailable" is the hook's word for "no provider answered" — an ABSENT
      // source, not a provider named unavailable. Same guard /charts uses.
      source: wsFeed.source === "unavailable" ? null : wsFeed.source,
      // Identical predicate to the chart's fidelity chip, so the masthead and
      // the room cannot disagree about whether a price arrived.
      quotePresent: Number.isFinite(wsFeed.ticker.price) && wsFeed.ticker.price > 0,
      // THE BAR RECEIPT the deck has held since it started forwarding candles.
      // A closed US session serves no quote and hundreds of bars; without this
      // the frame claims ignorance over a fully drawn chart.
      barsPresent: (deckCandles?.length ?? 0) > 0,
      lastObservedAtMs: wsFeed.lastObservedAtMs,
      connected: wsFeed.connected,
      sessionOpen,
    },
  });

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
  /*
    WORKSPACE — the equipment journey for this room.

    ROOM → WORKSPACE → PREVIEW/WIDGET → DRAWER → ENTER FULL → RETURN.

    Everything about what the stages MEAN lives in the owner
    (@/lib/workspace/equipmentJourney); this is the room holding one journey at
    a time and answering the rail. Three deliberate properties:

      · The rail's Workspace entry is an EVENT, not a link. A link would
        remount the chart and blank a frame — the exact "another app loaded"
        sensation the grammar exists to disprove.
      · The URL is reflected with replaceState, so the journey is shareable and
        the room is still /command-deck. No route per invention.
      · ENTER records the scroll offset and RETURN restores it, so "return to
        the exact room" is a measured promise rather than a hopeful one.

    All fifty-odd lines of that wiring used to sit right here. They now live in
    `useEquipmentJourney`, because /charts became the grammar's second ROOM and
    a per-room copy of this plumbing is a second semantic brain wearing a
    quieter disguise — see that hook's header for the two specific ways the
    copies drift.
  */
  const {
    journey: equipment,
    onExpand: onEquipmentExpand,
    onEnter: onEquipmentEnter,
    onReturn: onEquipmentReturn,
    onClose: onEquipmentClose,
  } = useEquipmentJourney("/command-deck", currentSceneDecision?.decisionId ?? null);

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

  // RISK, second half. Derived from the two owners immediately above — the
  // adapter that decides what this route honestly observes, and the compiler
  // that decides whether capital can be exposed. No third computation, no
  // fetch, and deliberately NOT gated behind `SceneAdmits`: a posture line is
  // the one element that must survive every scene, because the scene where it
  // is least wanted (a calm PREGAME with an unread book) is the scene where
  // its absence is most easily mistaken for flatness.
  const capitalPosture = React.useMemo(
    () =>
      selectCapitalPosture({
        position: sceneInput.signals.position,
        confidence: sceneInput.signals.positionConfidence,
        provenance: sceneInput.provenance.POSITION,
        capitalAtRisk: sceneCompilation.capitalAtRisk,
      }),
    [sceneInput, sceneCompilation.capitalAtRisk],
  );

  // The Question Router (canon P26/P6) compiles the ONE dominant question the
  // surface is currently answering: a function of the human's job (mode) and
  // what the engine actually resolved (oneStory). It asserts no market fact.
  const experienceQuestion = routeQuestion(experienceContext.mode, oneStory);
  // The question's SUBJECT, compiled from the same OneStoryVM the question was
  // routed from — so the banner's two lines can never disagree. Canon: the
  // ACTIVE QUESTION element carries question + focus, not a bare sentence.
  const questionFocus = selectQuestionFocus(oneStory);

  // SECONDARY NOISE (canon §4 MATERIALITY ENGINE / Auto-Quiet). The ref holds
  // the PREVIOUS compiled story so the gate can say whether this reading was
  // compared to anything. Until a prior exists it stays null and the header
  // prints "Unwatched" — never "Quieted", which would claim a comparison that
  // never happened. Written in an effect, never during render.
  // `typeof oneStory` rather than an OneStoryVM import: the single-writer
  // Sentinel forbids this page from importing selectOneStory directly, and it
  // is right to — the ref's type should FOLLOW the compiler's output, not be a
  // second declaration of it that can drift.
  const priorStoryRef = React.useRef<typeof oneStory | null>(null);
  const [priorStory, setPriorStory] = React.useState<typeof oneStory | null>(null);
  React.useEffect(() => {
    if (!oneStory) return;
    if (priorStoryRef.current === oneStory) return;
    const seen = priorStoryRef.current;
    priorStoryRef.current = oneStory;
    setPriorStory(seen);
  }, [oneStory]);
  const secondaryNoise = selectSecondaryNoise(
    priorStory && oneStory ? selectMateriality(priorStory, oneStory) : null,
  );

  // Market Object Passports (canon P6 Object DNA): each canonical dimension the
  // engine resolved becomes a Passport with its evidence lineage, fidelity,
  // contradictions and invalidation — reversible to provider evidence. Pure
  // read of the sealed state; never a second truth producer.
  const passport = React.useMemo(() => selectMarketObjectPassport(state), [state]);
  // The canon's passport is a DOCUMENT. Its stamp band belongs above the fold,
  // not folded inside the drawer that holds the per-object lineage — a
  // passport that must be unfolded to prove it exists is one the trader never
  // looks at. `selectPassportStamp` owns which mockup fields are real.
  const passportStamp = React.useMemo(() => selectPassportStamp(passport), [passport]);

  // decisionWhy + marketCanvas are already destructured above from the
  // shared composeMarketCanvasVM call. No second, potentially-disagreeing
  // compilation happens here.

  /**
   * MARKET REALITY AS EQUIPMENT — the ROOM's descriptor, not the layer's.
   *
   * `RoomEquipmentLayer` used to import `MarketCanvasPanel` and read this vm's
   * fields itself, which meant exactly one invention could ever be equipment.
   * The chrome now knows only four strings and a callback; WHICH panel gets
   * rendered, and what `unabridged` buys inside it, is the room's business —
   * because the room is the only place that already holds the compilation.
   *
   * The counts carry their testids so the preview's three facts stay
   * externally checkable per equipment rather than being a shape the chrome
   * assumes every invention happens to have.
   */
  const marketRealityEquipment = React.useMemo(
    () => ({
      equipmentId: "market-reality",
      title: "Market reality",
      verdict: marketCanvas.verdict,
      headline: marketCanvas.headline,
      counts: [
        { testId: "equipment-count-resolved", label: `${marketCanvas.resolved.length} resolved` },
        { testId: "equipment-count-missing", label: `${marketCanvas.missing.length} missing` },
        { testId: "equipment-count-blockers", label: `${marketCanvas.blockerCount} blocking` },
      ],
      renderDepth: (unabridged: boolean) => (
        <MarketCanvasPanel vm={marketCanvas} unabridged={unabridged} />
      ),
    }),
    [marketCanvas],
  );

  /**
   * OBJECT PASSPORT AS EQUIPMENT — the grammar's SECOND tenant.
   *
   * This is the directive's closing clause ("reuse that proven interaction
   * grammar across the remaining legitimate WM Pro inventions") and one of its
   * BANS discharged in the same move: the passport used to be an article
   * pinned open in the room's document band, visible whether the trader had
   * asked for it or not. That is "permanently displaying every invention on
   * MARKET". It is now picked up from Workspace like any other equipment.
   *
   * Built from the `passport` memo above — the SAME compilation the stamp band
   * already reads. No second selector call, so the stamp and the equipment
   * cannot come to disagree about how much of the passport is filled in.
   *
   * `unabridged` here buys the one thing the docked panel cannot give: the
   * evidence lineage stops being folded behind a disclosure per row.
   */
  const passportEquipment = React.useMemo(
    () => ({
      equipmentId: "market-object-passport",
      // The SAME words the rail entry uses, and the same words the stamp band
      // above the chart prints. A trader who presses "Market object passport"
      // must land on something that agrees it is called that — a widget with a
      // different title reads as a different thing having opened, which is the
      // directive's "another app loaded" sensation in miniature.
      title: "Market object passport",
      verdict: passport.qualityState,
      headline: `Every reading carries its own lineage — ${passport.resolvedCount} of ${passport.totalCount} objects are sealed with evidence.`,
      counts: [
        {
          testId: "equipment-count-passport-resolved",
          label: `${passport.resolvedCount} resolved`,
        },
        {
          testId: "equipment-count-passport-unresolved",
          label: `${passport.totalCount - passport.resolvedCount} unresolved`,
        },
        { testId: "equipment-count-passport-objects", label: `${passport.totalCount} objects` },
      ],
      renderDepth: (unabridged: boolean) => (
        <MarketObjectPassportPanel vm={passport} unabridged={unabridged} />
      ),
    }),
    [passport],
  );

  /**
   * THE DECISION CHAIN AS EQUIPMENT — the grammar's THIRD tenant, and the one
   * that had no door at all.
   *
   * Every `DecisionChainPanel` mount in this file sat two `<details>` deep.
   * `buriedOnlyIsARegister.test.ts` measured it on the day this was written and
   * counted it among twenty-two components with no path that is not a second
   * press. The equipment burial rule could not reach it, because that rule is
   * stated per equipment DESCRIPTOR and the chain was not equipment.
   *
   * THE NUMBERED SECTION IS NOT REMOVED. It is deep reading in its proper
   * sequence and the room's two clutter Sentinels pin that composition. What
   * this adds is a door.
   *
   * ── THE RAIL MAY NOT OFFER A DOOR THE ROOM HAS CLOSED ──────────────────
   * The in-room chain sits behind `<SceneAdmits element="THESIS_GEOMETRY">`,
   * which withholds it in CLOSED and before the session has produced anything
   * to read. Equipment that ignored that gate would be a second, louder path to
   * a surface the scene compiler had refused — the "self-contradicting screen"
   * SceneAdmits was written against, rebuilt in the rail.
   *
   * So the withholding TRAVELS WITH THE EQUIPMENT: the gate is inside
   * `renderDepth`, and the preview's own verdict and headline say so before the
   * trader presses anything. A refusal that is stated is not a painted door —
   * it is the product telling the trader WM is declining rather than broken,
   * which is the distinction `SceneAdmits`' own note exists to preserve.
   *
   * ── WHAT IS READ, AND WHAT IS NOT COMPILED ─────────────────────────────
   * Every field below is a READ of `chainVm`, which this room already holds.
   * The verdict is the chain's OWN permission node, not a fresh judgement
   * assembled here — a descriptor that decided for itself whether the setup
   * were permitted would be a second semantic brain that could disagree with
   * the panel it is a preview of.
   */
  const decisionChainEquipment = React.useMemo(() => {
    const admitted = sceneCompilation.admits.includes("THESIS_GEOMETRY");
    const withheldNote =
      sceneCompilation.scene === "CLOSED"
        ? "The decision chain is withheld while the session is closed. The tape is not moving, so a permission verdict would be describing a market that is not there."
        : "The decision chain is withheld until this session has produced something to read.";
    const tally = chainVm?.summary ?? null;
    return {
      equipmentId: "decision-chain",
      // The SAME words the rail entry uses. A widget that opened under a
      // different title reads as a different thing having loaded.
      title: "Decision chain",
      verdict: !admitted
        ? "WITHHELD"
        : (chainVm?.nodes.find((n) => n.key === "permission")?.verdict ?? "UNKNOWN"),
      headline: !admitted
        ? withheldNote
        : (chainVm?.headline ??
          "The chain has not compiled for this session yet — nothing is being claimed about permission."),
      counts: [
        { testId: "equipment-count-chain-ok", label: `${tally?.ok ?? 0} clear` },
        {
          testId: "equipment-count-chain-attention",
          label: `${(tally?.watch ?? 0) + (tally?.warn ?? 0)} need attention`,
        },
        { testId: "equipment-count-chain-unknown", label: `${tally?.unknown ?? 0} unresolved` },
      ],
      renderDepth: (unabridged: boolean) => (
        <>
        <SceneAdmits
          compilation={sceneCompilation}
          element="THESIS_GEOMETRY"
          withheldNote={withheldNote}
        >
          {chainVm && (
            <>
              {/* THE AUCTION LENS TRAVELS WITH THE CHAIN, because the room says
                  they are ONE admission and it says so in the gate above:
                  "admitting one without the other would put a conclusion on
                  screen with its own workings withheld, which is the SHOW
                  FIRST, EXPLAIN SECOND order run backwards."

                  This door used to do exactly that. It carried the §10 GATE
                  faithfully and dropped the §10 PAIRING, so pressing it opened
                  section 3 without section 2 — the nine nodes with the
                  four-dimension summary they resolve to nowhere in sight. The
                  in-room composition never had that defect; only the rail did,
                  which is how a door built from one half of a rule goes wrong
                  while every test about the other half stays green.

                  It is NOT `unabridged`-gated. The lens is the shallower read
                  of the two — it is what the chain COMPACTS to — so docking it
                  away would leave the preview showing the workings without the
                  conclusion, which is the same inversion pointing the other
                  way. */}
              <DLARStrip dlar={chainVm.dlar} />
              <div style={{ height: 12 }} />
              <DecisionChainPanel
                vm={chainVm}
                showNarratives
                unabridged={unabridged}
              />
            </>
          )}
        </SceneAdmits>
        {/* THE CONTRADICTION NOTE TRAVELS WITH THE DOOR, AND IT TRAVELS OUTSIDE
            THE GATE — exactly as it does in the room at section 3.

            This is the §10 lesson again, pointing a third way. The lens was a
            missing PAIRING inside the gate. This is a missing ADJACENCY outside
            it. The room admits this note under §9 — material invalidation is one
            of only two things allowed to take the room — NOT under
            THESIS_GEOMETRY, and the room says so in its own comment: "this is
            not a thesis; it is the note that says the thesis and the tape
            disagree." Putting it inside the gate would silence a contradiction
            warning in precisely the case where the thesis is withheld, which is
            the one case the trader most needs it.

            Without this, ENTER was STRICTLY WORSE THAN THE ROOM: the trader in
            the room reads the chain with the contradiction sitting under it, and
            the trader who pressed ENTER for "the complete professional
            experience" got the chain with the contradiction gone. A full screen
            that discloses less than the dock is the ENTER promise run backwards.

            Not `unabridged`-gated, and it cannot become furniture: it returns
            null unless direction is resolved AND the auction is FAILING. */}
        {chainVm && <StructureContextNote vm={chainVm} />}
        </>
      ),
    };
    /* NO `onNodeClick` OR `onDrillClick` HERE, AND THAT IS THE BAN BEING HONOURED.
       The in-room mounts drill each node — and each DLAR chip — into the WHY
       drawer. Doing that from inside the equipment would open a drawer from
       within a drawer — the "drawer-inside-drawer burial" the directive bans
       by name. The equipment is a place to READ the chain, and ENTER is how it
       gets deeper. The lens above is handed no `onDrillClick` for exactly the
       reason the panel is handed no `onNodeClick`: admitting the surface is
       not the same as admitting its exits. */
  }, [chainVm, sceneCompilation]);

  /**
   * THE ROOM'S SINGLE `selectMirror` CALL.
   *
   * It used to live inline in the JSX of the one mount that needed it. Two
   * consumers now need the same reflection — the in-room panel and the rail's
   * equipment — and inlining it twice would compile the trader's behaviour
   * twice off two different clock reads. Two answers to "what does my behaviour
   * teach me" is precisely the second semantic brain the directive bans, and it
   * would be the worst possible place to have one, because the subject is the
   * trader themselves rather than a market that is at least externally checkable.
   */
  const mirrorVm = React.useMemo(
    () =>
      selectMirror({
        ownerId: user?.id ?? "",
        decisions: sessionDecisions,
        nowMs,
      }),
    [user?.id, sessionDecisions, nowMs],
  );

  /**
   * THE MIRROR AS EQUIPMENT — the grammar's FOURTH tenant, and the first that
   * is not about the market at all.
   *
   * Three tenants proved the WORKSPACE layer generalises across READINGS (market
   * reality, an object's passport, the decision chain) and across ROOMS (the
   * deck and /charts). All three are compiled from the tape. What was still
   * unproven is whether the grammar carries the OTHER half of WM Pro — the
   * trader's own record — or whether "equipment" had quietly come to mean
   * "market widget". It carries it, and it costs one registry entry and one
   * descriptor, exactly as the second room did.
   *
   * ── THE PHASE GATE TRAVELS WITH IT, AND THAT IS NOT OPTIONAL ───────────
   * `theMirrorIsNotAMarketPanel.enforcement.test.ts` pins REVIEW and POST_EXIT
   * as the only moments the Mirror renders, with the reason stated in the file:
   * "A Mirror during PREPARATION would be a different overclaim." A rail entry
   * that ignored that would be a louder second path to a claim the room has
   * deliberately declined to make — the same failure the chain's `SceneAdmits`
   * gate is carried for, one surface over.
   *
   * So the gate is INSIDE `renderDepth` and the preview says so first. In
   * PREPARATION the verdict reads NOT YET and the headline names the moment the
   * trader has to reach for this to mean anything. A stated "not now" is not a
   * painted door; a rail entry that opened onto an empty frame would be.
   *
   * ── WHY IT IS ALSO SAFE WHEN THE PHASE IS RIGHT ────────────────────────
   * `MirrorPanel` returns null at zero patterns — the over-correction guard the
   * same Sentinel pins. In a drawer, null is a blank drawer, so the room renders
   * the VM's own `reason` sentence instead. That sentence is written by
   * `selectMirror` ("No decisions in scope — Mirror has nothing to reflect
   * yet"), not invented here, which keeps the descriptor a READER.
   */
  const mirrorEquipment = React.useMemo(() => {
    const reflecting = phase === "REVIEW" || phase === "POST_EXIT";
    const notYet =
      "The Mirror reflects a session you have finished. Move to REVIEW or POST-EXIT and it will have something to show you.";
    const patterns = mirrorVm.patterns;
    const strengths = patterns.filter((p) => p.direction === "STRENGTH").length;
    const watches = patterns.filter((p) => p.direction === "WATCH").length;
    const observed = patterns.filter((p) => p.evidenceClass === "OBSERVED").length;
    return {
      equipmentId: "behaviour-mirror",
      title: "Your behaviour mirror",
      verdict: !reflecting ? "NOT YET" : patterns.length === 0 ? "NOTHING YET" : "REFLECTING",
      headline: !reflecting
        ? notYet
        : patterns.length === 0
          ? (mirrorVm.reason ?? "Nothing to reflect yet.")
          : `${patterns.length} pattern${patterns.length === 1 ? "" : "s"} from ${mirrorVm.totalDecisions} decision${mirrorVm.totalDecisions === 1 ? "" : "s"} you made this session.`,
      counts: [
        { testId: "equipment-count-mirror-strength", label: `${strengths} strength` },
        { testId: "equipment-count-mirror-watch", label: `${watches} to watch` },
        { testId: "equipment-count-mirror-observed", label: `${observed} observed` },
      ],
      renderDepth: (unabridged: boolean) =>
        !reflecting ? (
          <p style={{ fontSize: 12, color: "#8a8271", lineHeight: 1.6, margin: 0 }}>{notYet}</p>
        ) : mirrorVm.patterns.length === 0 ? (
          /* MirrorPanel's own silence is correct on a canvas and wrong in a
             drawer the trader just opened on purpose. The words are the
             selector's, not this room's. */
          <p style={{ fontSize: 12, color: "#8a8271", lineHeight: 1.6, margin: 0 }}>
            {mirrorVm.reason ?? "No decisions in scope — Mirror has nothing to reflect yet."}
          </p>
        ) : (
          <MirrorPanel vm={mirrorVm} unabridged={unabridged} />
        ),
    };
    /* NO `onDrill`. The in-room panel is not drillable either, and adding a
       drill from inside a drawer would open a drawer within a drawer — banned
       by name. ENTER is how this gets deeper. */
  }, [mirrorVm, phase]);

  /**
   * PERSONAL EDGE AS EQUIPMENT — the grammar's FIFTH tenant, and the first
   * whose horizon is longer than the session.
   *
   * ── WHY IT IS NOT THE MIRROR ─────────────────────────────────────────────
   * Both are the trader's own record, and that is exactly why they must not be
   * merged. The Mirror asks "what did you just do"; this asks "where have you
   * ever performed". Folding the second into the first would make one panel
   * answer two questions with one verdict, and the two genuinely disagree —
   * a clean session inside a weak context is the single most useful thing this
   * pair can tell a trader, and it is unsayable if they share a headline.
   *
   * ── NO PHASE GATE, AND THAT IS DELIBERATE ────────────────────────────────
   * The Mirror is gated to REVIEW / POST_EXIT because reflecting on a session
   * you are still inside is an overclaim. This is the opposite: PREPARATION is
   * precisely when "you have historically performed badly in this context" is
   * worth reading, because it is still actionable. Gating it to REVIEW would
   * reproduce the defect `theMirrorIsNotAMarketPanel.enforcement.test.ts` was
   * written against — a panel that disappears exactly when it is most useful.
   *
   * ── THE VERDICT IS THE SELECTOR'S, NOT THIS ROOM'S ───────────────────────
   * `resolution` is `selectPersonalEdge`'s own word, and it refuses RESOLVED
   * below its sample threshold. The room prints it; it does not compute it and
   * it does not soften it. `NO RECORD` is the one string added here, for the
   * case the chip answers by rendering null — honest emptiness on a canvas is
   * silence, but a trader who just pressed this on purpose is owed a sentence.
   */
  const personalEdgeEquipment = React.useMemo(() => {
    const noRecord = personalEdgeVm.totalDecisions === 0;
    const strengths = personalEdgeVm.topStrengths.length;
    const watches = personalEdgeVm.topWatch.length;
    return {
      equipmentId: "personal-edge",
      title: "Your personal edge",
      verdict: noRecord ? "NO RECORD" : personalEdgeVm.resolution,
      headline: noRecord
        ? "No decisions on record yet — your edge cannot be measured from nothing."
        : personalEdgeVm.headline,
      counts: [
        { testId: "equipment-count-edge-strength", label: `${strengths} strength` },
        { testId: "equipment-count-edge-watch", label: `${watches} to watch` },
        { testId: "equipment-count-edge-decisions", label: `${personalEdgeVm.totalDecisions} decisions` },
      ],
      renderDepth: (unabridged: boolean) =>
        noRecord ? (
          <p style={{ fontSize: 12, color: "#8a8271", lineHeight: 1.6, margin: 0 }}>
            {personalEdgeVm.reason ?? "No decisions on record yet."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <PersonalEdgeChip vm={personalEdgeVm} unabridged={unabridged} />
            {/* THE SAMPLE RULE, SAID OUT LOUD AT DEPTH. The chip prints the
                verdict; a trader who entered the full experience is owed the
                reason a context is not called RESOLVED. It is the selector's
                sentence, carried — not a second explanation written here. */}
            {personalEdgeVm.reason != null && (
              <p style={{ fontSize: 11, color: "#8a8271", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
                {personalEdgeVm.reason}
              </p>
            )}
          </div>
        ),
    };
    /* NO `onCellClick`/drill. Same reason as the Mirror: a drill from inside a
       drawer would open a drawer within a drawer, which the directive bans by
       name. ENTER is how this gets deeper. */
  }, [personalEdgeVm]);

  // Canon §9 Learning Genome — client-side bundle assembled from
  // browser-local Journal storage. Undefined during first hydration
  // so the caller can render a skeleton. Reads the same 7+7 day
  // window as /journal so the diagnostic is consistent across surfaces.
  //
  // DECLARED HERE, ABOVE THE EQUIPMENT DESCRIPTOR THAT READS IT. It used to
  // sit two hundred lines lower, beside the only consumer it had — the
  // in-room disclosure. The sixth tenant gave it a second consumer that runs
  // EARLIER in the body, so the hook moved up to meet it. Nothing about the
  // call changed: it is unconditional and argument-free, so hook order across
  // renders is untouched, and the in-room mount still reads the same binding.
  const learningGenome = useLearningGenomeBundle();
  /* Read once, here, for BOTH the in-room panel's door-label and the equipment
     descriptor. See usePracticeHonestyLedger's header for why this read moved
     up out of the component that used to own it. Unconditional and
     argument-free, so hook order across renders is untouched. */
  const practiceHonesty = usePracticeHonestyLedger();

  /**
   * THE LEARNING GENOME AS EQUIPMENT — the grammar's SIXTH tenant, and the
   * first whose door the room is allowed to REFUSE.
   *
   * ── WHAT IT IS, AND WHY IT IS NOT THE EDGE OR THE MIRROR ──────────────
   * The Mirror is this session. Personal Edge is where the record says the
   * trader has performed. This is neither: it is WHICH PART OF THE WORK is
   * the bottleneck — perception, reasoning, process or transfer — and the
   * drill prescribed for it. Three surfaces about the trader, three different
   * questions, and collapsing any pair would make one verdict answer two.
   *
   * ── THE REFUSAL TRAVELS WITH THE EQUIPMENT ────────────────────────────
   * The in-room mount sits inside `<SceneAdmitsAmbient>`. A rail entry that
   * rendered the genome regardless would be a second, louder path to a
   * surface the room had deliberately closed — precisely the defect the
   * chain's `SceneAdmits` gate was written against, rebuilt one tenant later.
   *
   * So the gate is INSIDE `renderDepth`, and the preview's verdict says
   * WITHHELD before the trader presses anything. `sceneCompilation` is in the
   * deps for that reason and not for tidiness: a descriptor that dropped it
   * would type-check and would open a door the room had shut.
   *
   * ── THE VERDICT IS THE BUNDLE'S, NOT THIS ROOM'S ──────────────────────
   * Every field below is a READ. `headlineWeakness` is undefined until the
   * selector has two comparably-measured dimensions — it refuses to name a
   * weakest area from one data point or from a tie — and this descriptor
   * carries that refusal rather than inventing a headline to fill the space.
   */
  const learningGenomeEquipment = React.useMemo(() => {
    const admitted = sceneCompilation.admitsAmbient;
    const withheldNote =
      "Your learning genome is held back while the room belongs to the market. It is a backward-looking reading, and it can wait.";
    const genome = learningGenome?.genome;
    const measured = genome
      ? (["perception", "reasoning", "process", "transfer"] as const).filter(
          (k) => genome[k].score !== undefined,
        ).length
      : 0;
    return {
      equipmentId: "learning-genome",
      // The rail's own words. A widget that opened under a different title
      // reads as a different thing having loaded.
      title: "Your learning genome",
      verdict: !admitted
        ? "WITHHELD"
        : !learningGenome
          ? "MEASURING"
          : genome?.headlineWeakness
            ? (learningGenome.drill?.stage ?? "DIAGNOSTIC")
            : "NOT YET",
      headline: !admitted
        ? withheldNote
        : !learningGenome
          ? "Your record is still being read."
          : (genome?.headlineWeakness ??
            "Not enough measured dimensions yet — two have to be comparable before WM will name a bottleneck."),
      counts: [
        { testId: "equipment-count-genome-dimensions", label: `${measured}/4 measured` },
        {
          testId: "equipment-count-genome-misreads",
          label: `${learningGenome?.misread.sample_size ?? 0} reviewed`,
        },
        {
          testId: "equipment-count-genome-drill",
          label: learningGenome?.drill ? `drill: ${learningGenome.drill.stage.toLowerCase()}` : "no drill",
        },
      ],
      renderDepth: (unabridged: boolean) => (
        <SceneAdmitsAmbient compilation={sceneCompilation}>
          {learningGenome ? (
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
              unabridged={unabridged}
            />
          ) : (
            <p style={{ fontSize: 12, color: "#8a8271", lineHeight: 1.6, margin: 0 }}>
              Your record is still being read.
            </p>
          )}
        </SceneAdmitsAmbient>
      ),
    };
    /* NO drill-launcher here. Starting a drill from inside a drawer would open
       a working surface within a drawer — the burial the directive bans by
       name. This is a place to READ the diagnostic; ENTER is how it opens. */
  }, [learningGenome, sceneCompilation]);

  /**
   * THE SEVENTH TENANT — the practice book's honesty ledger.
   *
   * WHY THE DESCRIPTOR READS THE SAME HOOK THE PANEL DOES. A door has to say
   * something truthful about what is behind it BEFORE it is pressed. The only
   * two ways to get that are: read the same ledger the panel renders, or have
   * the ROOM compile its own opinion of the practice book. The second is the
   * second semantic brain the grammar bans — two compilations of one subject,
   * free to disagree, with nothing that would notice when they did. So both
   * consumers take `usePracticeHonestyLedger`, and there is one author.
   *
   * THE §9 GATE IS THE ROOM'S, NOT A NEW ONE. The in-room mount renders only
   * in REVIEW/LEARN. A rail entry that ignored that would be a louder path to
   * a surface the room had closed while capital is exposed. The gate is read
   * from the same `experienceContext.mode` the room reads, stated once here,
   * and it governs the verdict, the headline AND the depth.
   */
  const practiceHonestyEquipment = React.useMemo(() => {
    const retrospectiveAdmitted =
      experienceContext.mode === "REVIEW" || experienceContext.mode === "LEARN";
    const withheldNote =
      "Your practice honesty is held back until you are reviewing. It is a look backwards at a book you have already written, and it can wait.";
    const silent = practiceHonestyIsSilent(practiceHonesty);
    return {
      equipmentId: "practice-honesty",
      // The rail's own words. A widget that opened under a different title
      // reads as a different thing having loaded.
      title: "Your practice honesty",
      verdict: !retrospectiveAdmitted
        ? "WITHHELD"
        : practiceHonesty == null
          ? "READING"
          : silent
            ? "NOTHING YET"
            : "DISCLOSED",
      headline: !retrospectiveAdmitted
        ? withheldNote
        : practiceHonesty == null
          ? "Your practice book is still being read."
          : silent
            ? "Nothing to disclose yet — there are no practice fills for WM to be honest about."
            : (practiceHonesty.caption ?? ""),
      counts: [
        {
          testId: "equipment-count-practice-easements",
          label: `${practiceHonesty?.easements.length ?? 0} easements`,
        },
        {
          testId: "equipment-count-practice-caveat",
          label: practiceHonesty?.markCaveat != null ? "mark caveat" : "no caveat",
        },
      ],
      /**
       * TWO PROPS, TWO DIFFERENT QUESTIONS, AND THEY MUST BOTH BE PASSED.
       *
       * `disclosed` is structural: the trader pressed this door, so the fold
       * comes off at EVERY stage — preview, drawer and full alike — because a
       * `<details>` inside a drawer the trader already opened is the banned
       * drawer-inside-drawer.
       *
       * `unabridged` is about the screen, and it is the stage's own signal, so
       * it is forwarded unchanged. Every easement HEADING renders at both
       * widths; what ENTER buys is the SENTENCES explaining each one, which is
       * a real cap over real content rather than a prop invented so a rule
       * would have something to point at.
       */
      renderDepth: (unabridged: boolean) =>
        retrospectiveAdmitted ? (
          <PracticeHonestyLayer disclosed unabridged={unabridged} />
        ) : (
          <p style={{ fontSize: 12, color: "#8a8271", lineHeight: 1.6, margin: 0 }}>
            {withheldNote}
          </p>
        ),
    };
  }, [practiceHonesty, experienceContext.mode]);

  /**
   * WHICH equipment is in the trader's hand. The rail asks for an id; the room
   * answers with the reading it already holds for that id. A `Record` rather
   * than a chain of ternaries so that adding a third tenant is an entry, not a
   * branch — and `?? marketRealityEquipment` never actually fires, because the
   * journey reducer only accepts ids `isRoomEquipment` recognised. It exists so
   * an unknown id degrades to a rendered room instead of a crashed one; the
   * layer then refuses the mismatch and draws nothing, which is the honest
   * output.
   */
  const equipmentContent =
    ({
      "market-reality": marketRealityEquipment,
      "market-object-passport": passportEquipment,
      "decision-chain": decisionChainEquipment,
      "behaviour-mirror": mirrorEquipment,
      "personal-edge": personalEdgeEquipment,
      "learning-genome": learningGenomeEquipment,
      "practice-honesty": practiceHonestyEquipment,
    }[equipment.equipmentId ?? ""] ?? marketRealityEquipment);

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
    // Unioned with the Journal for the same reason `position` says UNOBSERVED:
    // the record path alone cannot see this, and an unseen question must not
    // resolve to "no".
    const hasUnreviewedClose =
      decisionRecords.some((r) => !!r.outcome && !r.review) ||
      unreviewedCloses.hasUnreviewedClose;
    return inferJobMode({
      position: "UNOBSERVED",
      hasUnreviewedClose,
      decision: oneStory.decision.value,
      hasResolvedMarketState: passport.resolvedCount > 0,
    });
  }, [decisionRecords, oneStory, passport, unreviewedCloses]);
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
      journalUnreviewedCloses: unreviewedCloses.today,
    });
    const assessment = selectCompletionState(signals);
    const done: string[] = [];
    if (!decisionReceipt.empty) done.push("Decision receipt sealed");
    if (passport.resolvedCount > 0) done.push(`${passport.resolvedCount} market object(s) resolved`);
    const saved: string[] = [];
    if (decisionRecords.length > 0) saved.push(`${decisionRecords.length} decision record(s) preserved`);
    return composeExitRamp({ assessment, done, saved, returnCondition: signals.returnCondition });
  }, [decisionRecords, decisionReceipt.empty, passport.resolvedCount, experienceContext.mode, oneStory.decision.value, unreviewedCloses.today]);

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
    <div
      data-testid="deck-route-plane"
      style={{
        // 100vh was correct when this plane WAS the page. It is now a child
        // of the frame's scrolling room, which sits below a masthead — so a
        // 100vh floor guarantees the room scrolls by exactly the masthead's
        // height even when the room is empty. 100% fills the room it was
        // actually given, and an empty room stays still.
        minHeight: "100%",
        background: "transparent",
        color: "#ede6d3",
      }}
    >
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

      {/*
        SCENE_FRAGMENTATION repair, §30 STEP 2 ("Make MARKET the dominant
        continuous spatial field").

        This was `maxWidth: 1280`. Measured live on production at 1920x847:
        the market room rendered 1248px wide starting at x=334, so 672px —
        35% of the screen — was dead sanctuary field down the left and right
        edges while the candle canvas itself owned only 29% of viewport AREA.

        1280 is a READING measure. It is the right cap for prose, where a long
        line is genuinely harder to scan, and it is how nearly every dashboard
        container in this codebase was born. It is the wrong cap for a market
        room: price geometry has no comfortable line length, and every pixel
        the cap refuses is a pixel of structure the trader cannot see. The room
        was being asked to behave like a document.

        `min(1720px, 100%)` still refuses the extreme — an unbounded room on an
        ultrawide would stretch the candle field past what one gaze can hold,
        and the header above is centered chrome that would detach from it. Below
        1720 this resolves to 100% and behaves exactly as the old cap did at
        every laptop width, so nothing that already landed at 1280-or-narrower
        moves.

        The companion change lives in the `.wm-cd-market-workspace` grid below:
        the context rail was `minmax(280px, 0.62fr)`, which would have spent
        ~35% of every new pixel widening RISK/WHY/NEXT. It is now bounded, so
        the width this cap releases goes to MARKET and only to MARKET.
      */}
      {/*
        This was a <main>. The OS frame owns <main data-testid="os-room">
        one layer above, so this element was a SECOND <main> nested inside
        the first — which HTML forbids and which tells a screen reader the
        page has two primary contents. The visual result was identical,
        which is exactly why it survived: the defect was addressed to the
        accessibility tree, and nobody was reading that.

        A <div> keeps every pixel and returns the landmark to its one owner.
      */}
      <div style={{ maxWidth: "min(1720px, 100%)", margin: "0 auto", padding: "12px 16px", position: "relative" }}>
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
            }
            @media (min-width: 1100px) {
              .wm-cd-market-workspace {
                display: grid !important;
                /* The rail is BOUNDED, not proportional. It was
                   minmax(280px, 0.62fr), which shares every new pixel with
                   MARKET at roughly 35/65 — so widening the room above would
                   have quietly widened RISK/WHY/NEXT too. RISK is a chip, WHY
                   is a closed summary line, NEXT is a shortlist; none of them
                   read better at 440px than at 340px. MARKET is the only thing
                   in this scene that gains meaning from width, so it takes
                   1fr and the rail takes a fixed measure. */
                grid-template-columns: minmax(0, 1fr) 340px;
                grid-template-areas:
                  "now now"
                  "market context";
                /* Fusion, not adjacency. The inherited 10px flex gap became
                   an empty vertical channel when this element switches to a
                   grid, making MARKET and its RISK/WHY/NEXT edge read as two
                   neighboring apps. Remove the channel and let one brass seam
                   express their relationship inside the same room. */
                column-gap: 0;
                row-gap: 8px;
                align-items: start;
              }
              .wm-cd-market-now { grid-area: now; }
              .wm-cd-market-field { grid-area: market; }
              .wm-cd-market-context {
                grid-area: context;
                border-left: 1px solid rgba(139,106,41,0.22);
                padding-left: 14px;
              }
            }
          `}</style>
        {/* One scene column at every state. Opening WHY must reveal a contextual
            layer inside the room; it may never shrink MARKET to make space for
            a second mini-application. */}
        <div
          className="wm-cd-layout"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
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
          <>
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
                // Same owner the hero and the spine read. Before this, the
                // assistant was handed `price.last` — null whenever no live
                // trade had printed — so it answered "I don't have sufficient
                // price data" about a screen that was showing 120 candles.
                // The provenance rides along because an unlabelled close is
                // how the model learns to quote one as a print.
                price: chartContextPrice.value,
                priceProvenance: chartContextPrice.provenance,
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
                <ActiveQuestionBar
                  question={experienceQuestion}
                  focus={questionFocus}
                  mode={experienceContext.mode}
                  noise={secondaryNoise}
                >
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
                </ActiveQuestionBar>

                {/* MARKET OBJECT PASSPORT stamp band (canon: Canonical Market
                    State). A DOCUMENT HEADER, and it has to live where a
                    document header lives — in the primary scene, under the
                    active question and above the canvas.

                    It was first placed at the top of the passport region, which
                    is itself nested inside the collapsed SECONDARY WORKSPACE
                    drawer and the collapsed EVIDENCE drawer. A live probe found
                    it rendering two closed <details> deep: present in the DOM,
                    invisible to the trader. Being ABOVE a drawer is worthless
                    when the drawer is inside another drawer. The per-object
                    evidence lineage stays down there, where it belongs. */}
                <div style={{ marginBottom: 10 }}>
                  <PassportStamp vm={passportStamp} />
                </div>

                {(() => {
                  const story = state ? marketStory : null;
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
              </div>

              <div
                className="wm-cd-market-field"
                data-testid="scene-market"
                data-decision-id={currentSceneDecision?.decisionId ?? undefined}
                style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}
              >
                <DeckMarketChart
                  symbol={symbol}
                  timeframe={timeframe}
                  onCandlesReady={handleDeckCandles}
                />
              </div>
              <section
                className="wm-cd-market-context"
                aria-label="Risk, why, and next"
                data-testid="scene-support"
                data-decision-id={currentSceneDecision?.decisionId ?? undefined}
                style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}
              >
                <div
                  data-testid="scene-risk"
                  data-decision-id={currentSceneDecision?.decisionId ?? undefined}
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <AvailableRChip vm={chainVm?.availableR ?? null} />
                  {/* The protection/humility half of Ticket T's RISK pixels.
                      Until this line, `scene-risk` answered "how much R can I
                      risk" and said nothing about what the trader is already
                      holding — and blank space in a risk column reads as
                      "flat". Both arguments come from owners this page has
                      already computed; nothing new is fetched and no book is
                      invented. On this route the honest answer is UNREAD, and
                      saying so out loud is the entire point. */}
                  <CapitalPostureLine vm={capitalPosture} />
                </div>
                <details
                  className="wm-cd-market-why"
                  data-testid="scene-why"
                  data-decision-id={currentSceneDecision?.decisionId ?? undefined}
                  open={showEvidence || undefined}
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
                      {/* blockerCount, NOT blockers.length — the list is a
                          sample capped at 3 labels per evidence bucket, so this
                          rail printed "6 BLOCKERS" while cell 03 two panels
                          below read "0 of 9 paid". The 6 was the cap. */}
                      {marketCanvas.blockerCount} blocker{marketCanvas.blockerCount === 1 ? "" : "s"} · inspect
                    </span>
                  </summary>
                  {/* The raw identity is evidence about the decision, not a
                      fourth NOW headline. Keeping it inside WHY preserves the
                      inspectable one-id contract without inserting an
                      engineering-status stripe between the story and MARKET. */}
                  <div
                    data-testid="scene-decision"
                    data-decision-id={currentSceneDecision?.decisionId ?? undefined}
                    style={{ marginBottom: 8, color: "#8a8271", fontSize: 9, letterSpacing: 0.4 }}
                  >
                    {currentSceneDecision
                      ? `DECISION · ${currentSceneDecision.decisionId}`
                      : sceneDecisionAbsence}
                  </div>
                  <DecisionWhyPanel vm={decisionWhy} />
                  {showEvidence && whyTarget && (
                    <div data-testid="scene-why-inspector" style={{ marginTop: 10 }}>
                      <WhyInspector
                        target={whyTarget}
                        state={state}
                        dlar={chainVm?.dlar ?? null}
                        clc={chainVm?.clc ?? null}
                        onClose={() => setShowEvidence(false)}
                      />
                    </div>
                  )}
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
                  <ExitRampCard ramp={exitRamp} presentation="embedded" />

                  {/* SIGNAL PROVENANCE — IN THE ROOM, NOT IN A DRAWER.

                      These chips existed ONLY inside SceneAdmissionPanel, which
                      lives TWO closed `<details>` deep: the Workspace toggle,
                      then the proof-chain toggle inside it.
                      `surfaceElementReach` generalised the rule `humilityReach`
                      had already stated for one element — A MOUNT NESTED IN
                      `<details>` IS NOT A SURFACE — and immediately reported
                      FIDELITY_CHIPS as reaching no screen at all.

                      The measurement was right, and the first attempt at this
                      repair was still wrong: putting the strip at the top of
                      the Workspace left it one toggle deep, which the same rule
                      caught again. A disclosure is either in the room or it is
                      not a disclosure.

                      Why it matters here specifically: without it, a scene
                      compiled from two observed signals renders identically to
                      one compiled from five. §14.1 — FLAT IS A FINDING, NEVER A
                      DEFAULT — is a rule about the wiring, not only about the
                      compiler.

                      The drawer keeps the full form with its explanatory
                      sentence. This is the SAME component in its `inline`
                      variant: one owner of the answer, two presentations. The
                      variant drops framing, never a chip — a compact form that
                      hid UNOBSERVED groups would be the precise overclaim the
                      strip exists to prevent. */}
                  <SignalProvenanceStrip
                    variant="inline"
                    provenance={sceneInput.provenance}
                    observedCount={sceneInput.observedCount}
                    totalCount={sceneInput.totalCount}
                  />
                </div>
              </section>
            </div>

            {/* THE DOCUMENT WALL.
                ==================
                The Decision Receipt: what was known at decision time, and then
                what actually happened. A document the trader is supposed to
                READ, not hunt for.

                It used to be mounted three collapsed <details> deep — the
                Workspace toggle, then the evidence drawer, then one of its
                own. Present in the DOM, absent from the product. This file
                already diagnosed that failure mode in prose ("<details> IS NOT
                A SURFACE") without ever acting on it.

                It is now TOP LEVEL and always open. `data-wm-document-wall` is
                the measurement handle: a probe can assert it is on the page
                without expanding anything, which is the only assertion that
                distinguishes shipped from merely mounted.

                The Market Object Passport was the wall's second document until
                it became Workspace equipment. Reachability did not regress —
                the mechanism changed from "always on the page" to "one press
                from the rail, with a full-screen depth the wall never gave
                it". See the note where it used to sit. */}
            <section
              data-wm-document-wall
              data-wm-documents="1"
              aria-label="Document wall — decision receipt"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                borderTop: "1px solid rgba(139,106,41,0.24)",
                paddingTop: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  // Side by side once there is room for two columns of prose;
                  // stacked on a phone, where a two-up would shrink both into
                  // unreadable slivers. Done with wrap + a 320px flex-basis
                  // rather than a JS viewport read, so the layout is correct on
                  // the first paint instead of after a measurement round-trip.
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  gap: 16,
                }}
              >
                {/* THE PASSPORT USED TO BE PINNED OPEN HERE.
                    ==========================================
                    It was moved to WORKSPACE equipment, and that is a
                    subtraction the Founder is meant to SEE: this row now holds
                    one document instead of two, and the chart above it is not
                    competing with eight always-open object rows.

                    The directive bans "permanently displaying every invention
                    on MARKET" — and the passport was the clearest instance of
                    it, because eight dimension rows are unconditionally eight
                    rows whether or not the trader is asking about provenance.

                    It did NOT become less reachable. The rail's Workspace
                    entry opens it in one press, the drawer holds it beside the
                    chart, and ENTER gives it a whole screen with its lineage
                    unfolded — which is more of the passport than this band
                    ever showed. Its identity line (PassportStamp) stays above,
                    so the market object is still named without being picked
                    up. The Sentinel moved with it. */}
                <article
                  data-wm-document="receipt"
                  style={{ flex: "1 1 320px", minWidth: 0 }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 11,
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                        color: "#c9a55c",
                        fontWeight: 600,
                      }}
                    >
                      Decision Receipt
                    </h2>
                    <p
                      style={{
                        margin: "3px 0 0",
                        fontSize: 10,
                        letterSpacing: 0.6,
                        textTransform: "uppercase",
                        color: "#8a8271",
                      }}
                    >
                      A snapshot of what you knew, then what happened ·{" "}
                      {decisionReceipt.empty
                        ? "none sealed"
                        : decisionReceipt.stage.toLowerCase()}
                    </p>
                  </div>
                  <DecisionReceiptPanel vm={decisionReceipt} />
                </article>
              </div>
            </section>

            {/* The market room owns the default Founder read. Preparation,
                diagnostics, raw system state, fidelity, phase tooling, and
                retrospective analysis remain intact in one intentional
                workspace instead of rebuilding a dashboard beneath MARKET. */}
            <details
              className="wm-cd-secondary-workspace"
              style={{
                borderTop: "1px solid rgba(139,106,41,0.24)",
                paddingTop: 8,
              }}
            >
              <summary
                style={{
                  minHeight: 44,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  listStyle: "none",
                  color: "#c9a55c",
                  fontSize: 10,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  width: "fit-content",
                  maxWidth: "100%",
                  marginLeft: "auto",
                  padding: "0 8px",
                }}
              >
                <span>Workspace</span>
                <span style={{ color: "#8a8271" }}>Proof · preparation · tools</span>
              </summary>
              <div
                data-testid="secondary-workspace-content"
                style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 8 }}
              >
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
                  // SCENE_FRAGMENTATION cure: even when collapsed, the
                  // full-box brass border + opaque dark fill made this
                  // read as a distinct "evidence app" sitting inside the
                  // room. WHY is an aspect of the same decision — a
                  // hairline delimits it; the room's atmosphere passes
                  // through.
                  order: surfaceOrder(deckEmphasis, "WHY"),
                  borderTop: "1px solid rgba(139,106,41,0.22)",
                  background: "transparent",
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

                  {/* The full resolved/missing/blocker/clearance canvas is
                      audit evidence, not a second MARKET inside the compact
                      WHY edge. Keep the concise canonical DecisionWhyPanel in
                      the room and preserve this deeper projection here. */}
                  <MarketCanvasPanel vm={marketCanvas} />

                  {/* WHY / WHY NOT (canon P6) — reverses the right-of-way verdict to
                      its concrete causes so the trader sees exactly what stands
                      between them and entry (or why the path is clear). */}
              {/* Market Object Passport and Decision Receipt USED TO LIVE HERE,
                  three collapsed <details> deep — the Workspace toggle, the
                  evidence drawer, and then one of their own. Two comments in
                  this very file already named that as the defect ("<details> IS
                  NOT A SURFACE"), and it was never acted on for these two.

                  They are now top-level sections above the Workspace fold. See
                  THE DOCUMENT WALL below. Nothing is duplicated: this is the
                  only other place they were ever mounted. */}
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

              {/* PRACTICE HONESTY — the REVIEW/RECEIPT layer the visual
                  coverage matrix lists as a GAP.

                  Five modules already measure how the practice book was easier
                  than a real venue (locate, fill, rest, cancel, stop). Until
                  now every one of those sentences was visible only inside the
                  legacy /paper page's tabs — truth living in a mini-app, which
                  is exactly the SCENE_FRAGMENTATION the current repair law
                  names. The room now consumes truth it already owned.

                  Gated to REVIEW/LEARN for the same reason the Learning Genome
                  is: this is backward-looking. §9 INTERRUPTION LAW forbids a
                  retrospective taking the room while capital is exposed, and
                  the component is a closed drawer even here. */}
              {(experienceContext.mode === "REVIEW" || experienceContext.mode === "LEARN") && (
                <PracticeHonestyLayer />
              )}
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
                  // SCENE_FRAGMENTATION cure: even the empty-state INDEX
                  // was drawn as a bordered box, reading as another app.
                  // The awaiting state is a section of the room, not a
                  // placeholder widget.
                  borderTop: "1px solid rgba(139,106,41,0.22)",
                  padding: "16px 0 4px",
                  background: "transparent",
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
                  {/* Read from the ONE owner. This list used to be typed out
                      here, and it drifted: it kept promising a numbered
                      "1 · Story Ribbon · Market Narrative" long after that
                      section was retired into the chapter-history drawer. An
                      index that lists a chapter the book does not contain is
                      read as a commitment. */}
                  {DECK_SECTIONS.map((row) => (
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
                    href={`${INSTRUMENT_VIEW_ROUTE}?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(timeframe)}`}
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
                stays in the DOM and reachable in every job.
             *
             * NOT gated on `chainVm`. The drawer is a CONTAINER, and gating a
             * container on one child's input erases every sibling with it.
             * Each child that actually dereferences `chainVm` carries its own
             * gate — the DLAR strip, the Decision Chain, the structure note
             * and ATHOS. The ones that do not are Story Ribbon (takes `state`
             * and renders "Market state cannot be resolved yet." on its own),
             * the SceneAdmits withheld-note, Data Fidelity (gated on `state`)
             * and the Steward verdict (the trader's own rules).
             *
             * The note inside SceneAdmits exists because "a trader who opens
             * Deep read and finds 1 then 4 has no way to tell a refusal from
             * a bug." That was exactly right and it guarded one level too
             * low: with the container gated, the trader found no drawer at
             * all — a refusal with no note attached, which is the same defect
             * the note was written to prevent. A comment guards the cell it
             * sits on and nothing else. */}
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
                <StoryRibbon state={state} history={history} story={marketStory} />
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
                <SectionBanner number={2} label={deckSection(2).label} tagline={deckSection(2).tagline} />
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
                <SectionBanner number={3} label={deckSection(3).label} tagline={deckSection(3).tagline} />
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
                Founder canon: 'every state must be explainable'.
             *
             * NOT gated on `chainVm`. It used to be, and that gate was
             * spurious in the strictest sense: this block dereferences
             * `permission` and `phase` and NOTHING ELSE. `permission` is
             * compiled by composeMarketCanvasVM through an explicit
             * `chain: null` path, so it is always defined — the market being
             * unresolved has never been able to make it undefined.
             *
             * And the verdict it produces in that exact condition is the
             * most decision-relevant sentence WM can say to this trader:
             * DATA_QUALITY_FLOOR is a HARD rule, `marketState?.qualityState
             * ?? "UNAVAILABLE"` resolves to UNAVAILABLE, the rule engages by
             * name, and the Steward reads RESTRICTED because the tape cannot
             * be trusted. The deck deleted that sentence for precisely the
             * reason that made it worth reading. Same inversion as the
             * Opening Bell (42b4106) and the Mirror (9bc3844).
             *
             * Every evaluator already degrades honestly without a market:
             * MIN_RR returns "Cannot evaluate — conservative R unresolved",
             * CLC returns "No CLC evaluation available." The selector got
             * absence right. The render layer erased it wholesale. */}
              <div>
                <SectionBanner number={4} label={deckSection(4).label} tagline={deckSection(4).tagline} />
                <div style={{ height: 12 }} />
              <div
                style={{
                  borderTop: "1px solid rgba(139,106,41,0.22)",
                  background: "transparent",
                  padding: "12px 0 4px",
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

            {/* NECTAR / DATA FIDELITY — coverage + freshness at a glance */}
            {state && (
              <div>
                <SectionBanner number={5} label={deckSection(5).label} tagline={deckSection(5).tagline} />
                <div style={{ height: 12 }} />
              <div
                style={{
                  borderTop: "1px solid rgba(139,106,41,0.22)",
                  background: "transparent",
                  padding: "12px 0 4px",
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
                {/* CONTRADICTIONS is a CLAIM, so it goes through the claim compiler.
                  *
                  * This used to be `String(state.contradictions.length)` in the OK
                  * tone. It printed `0` — four pixels from `UNKNOWNS 8` in the watch
                  * tone. Read together those two cells said: *WM determined very
                  * little, and found no disagreement in what it determined.* The
                  * second half is not a finding. A contradiction requires TWO
                  * determinations to disagree, and with 0/8 dimensions resolved
                  * there were not two. Same shape as the GAPS tile below. */}
                {(() => {
                  const contradictionClaim = describeContradictionCoverage(state);
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
                      <Stat label="Coverage" value={`${state.coverage.length} ch`} />
                      <Stat label="Unknowns" value={String(state.unknowns.length)} tone={state.unknowns.length > 0 ? "watch" : "ok"} />
                      <Stat
                        label="Contradictions"
                        value={contradictionClaim.value}
                        tone={contradictionClaim.warn ? "warn" : contradictionClaim.measured ? "ok" : "dim"}
                        title={contradictionClaim.detail}
                      />
                    </div>
                  );
                })()}

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
                  /**
                   * GAPS is a CLAIM, so it goes through the claim compiler.
                   *
                   * This used to be `reduce((s, c) => s + (c.gapCount ?? 0), 0)`
                   * rendered as a bare number in the OK tone. It printed `0` —
                   * and it could never have printed anything else. Every shipped
                   * adapter declares `sequenceState: "UNAVAILABLE"`, so
                   * `MarketEventGuard` never emits `SEQUENCE_GAP`, so `gapCount`
                   * is pinned at 0 by construction. The tile was reporting the
                   * absence of a DETECTOR as the absence of GAPS.
                   *
                   * `describeGapCoverageTotal` is the single writer for that
                   * claim — `/nectar/[symbol]` reads the same one.
                   */
                  const gapClaim = describeGapCoverageTotal(state.coverage);
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
                      <Stat
                        label="Gaps"
                        value={gapClaim.value}
                        tone={gapClaim.warn ? "watch" : gapClaim.measured ? "ok" : "dim"}
                        title={gapClaim.detail}
                      />
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

            {/* Opening Bell — only during PREPARATION phase.
             *
             * NOT gated on `chainVm`. It used to be, and that was a coupling
             * defect found by standing in the room: `chainVm` is null whenever
             * canonical market state has not resolved, so on a morning where
             * the deck reads MARKET STATE UNKNOWN the Opening Bell vanished
             * entirely — and the trader was told nothing about their own prep
             * because the MARKET was unreadable.
             *
             * Those two things have nothing to do with each other. The prep
             * evidence is compiled from the trader's own journal via
             * useTodayPrep; it does not consult the tape. Worse, the moment
             * market state is unresolved is exactly the moment PREPARATION
             * matters most, so the panel disappeared precisely when it was
             * most useful.
             *
             * The one axis that DOES depend on market state is dataQuality,
             * and it degrades honestly on its own: `state?.qualityState` is
             * undefined when there is no state, and OpeningBellEvidence omits
             * the health line rather than defaulting it. */}
            {phase === "PREPARATION" && (
              <OpeningBellSlot
                userId={user?.id ?? null}
                nowMs={nowMs}
                dataQuality={state?.qualityState}
              />
            )}

            {/* Mirror — meaningful during REVIEW + POST_EXIT.
             *
             * NOT gated on `chainVm`, for the same reason the Opening Bell
             * above is not. That gate was here, eight lines below a comment
             * already diagnosing this exact coupling on a sibling panel — a
             * comment guards the cell it sits on and nothing else.
             *
             * Every input to this panel is the trader's own record:
             *   phase             — selected by the trader, not the tape
             *   sessionDecisions  — the decision store plus their journal
             *   ownerId, nowMs    — identity and the clock
             *
             * `selectMirror` does not read market state at any depth. So an
             * unresolved MARKET was erasing the trader's own reflection, and
             * REVIEW after a session you could not read the tape on is
             * exactly when you most want to look at what you actually did.
             *
             * Ungating is safe against the opposite error — design theater.
             * MirrorPanel returns null when `vm.patterns.length === 0`, so a
             * trader with nothing to reflect on still sees nothing, and
             * selectMirror's empty VM says so in words rather than in zeros:
             * "No decisions in scope — Mirror has nothing to reflect yet". */}
            {/* HOISTED, NOT RE-COMPILED. `mirrorVm` is the room's single
                `selectMirror` call; the WORKSPACE equipment reads the SAME
                object. Calling the selector a second time for the rail would
                be a second semantic brain that could disagree with this one
                about the trader's own behaviour — the directive bans exactly
                that, and `theMirrorIsNotAMarketPanel.enforcement.test.ts` now
                pins the single call site rather than one mount's arguments. */}
            {(phase === "REVIEW" || phase === "POST_EXIT") && (
              <MirrorPanel vm={mirrorVm} />
            )}

            {/* Doctrine and cross-realm navigation are useful orientation,
                but neither belongs on the default trading canvas. Keeping
                both inside the contextual workspace preserves every route
                while preventing a second permanent footer/navigation system
                from rebuilding the dashboard beneath MARKET. */}
            <div
              data-testid="secondary-workspace-doctrine"
              style={{
                paddingTop: 20,
                marginTop: 12,
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

            <RealmGateway currentKey="wm-pro" />
              </div>
            </details>
          </>

        </div>
        </div>{/* end z-index wrapper */}
      </div>
    </div>

    {/* WORKSPACE EQUIPMENT — renders NOTHING until the trader picks it up from
        the rail. Deliberately last in the tree and fixed-position: it must not
        push a single pixel of the market around, because a widget that
        reflows the chart it is supposed to sit beside has already broken the
        "same room" promise. Whichever equipment is in hand, it is the reading
        the ROOM already holds — one compilation, three depths. */}
    <RoomEquipmentLayer
      journey={equipment}
      content={equipmentContent}
      // The ROOM'S OWN symbol and timeframe — the same two bindings the hero
      // and the chart read. The equipment must never resolve a symbol of its
      // own, or the full experience could name a different market than the
      // chart the trader entered from.
      subject={{ symbol, timeframe }}
      onExpand={onEquipmentExpand}
      onEnter={onEquipmentEnter}
      onReturn={onEquipmentReturn}
      onClose={onEquipmentClose}
    />
    </SanctuarySessionProvider>
  );
}

/**
 * OpeningBellSlot — "am I prepared?", answered only as far as the evidence goes.
 *
 * THE DEFECT THIS REPLACES
 * -----------------------
 * This slot used to call `selectOpeningBell` with
 *
 *     items: DEFAULT_PREPARATION_TEMPLATE.map((t) => ({ ...t, completed: false }))
 *
 * — eight prep items, every one hardcoded incomplete. The selector did its job
 * and returned NOT_READY with the advisory "Preparation incomplete. Rushing
 * preparation correlates with process failure." That is a judgement about the
 * trader's morning, produced from no observation of the trader at all, and it
 * rendered identically whether they had finished everything or their browser
 * had simply failed to read their prep.
 *
 * It also contradicted this very page: `TodayPrepBridge` below already shows the
 * trader's REAL count from `useTodayPrep`. The deck displayed the true number
 * and a verdict that ignored it, at the same moment, on the same screen.
 *
 * WHY NO VERDICT NOW
 * ------------------
 * `selectOpeningBell` is not called here any more, because on this surface it
 * cannot be given honest input. Its template has stable ids; /morning-prep
 * stores the trader's own free-text list. We know HOW MANY items were checked,
 * never WHICH — so the eight named rows cannot be ticked without inventing the
 * mapping. `openingBellPrep` states the count, states why it stops there, and
 * stops there. See that module's docblock for the full argument.
 *
 * Data health is the one axis that IS observed, so it is stated — as an
 * observation, not as a grade.
 */
function OpeningBellSlot({
  userId,
  nowMs,
  dataQuality,
}: {
  userId: string | null;
  nowMs: number;
  dataQuality?: MarketQualityState;
}) {
  const prep = useTodayPrep(userId, nowMs);
  const evidence = selectPrepEvidence({
    readState: prep.readState,
    checklistDone: prep.checklistDone,
    checklistTotal: prep.checklistTotal,
  });

  // The wording lives in the shared component, not here. /morning-prep had the
  // same defect and a forked second copy of the cure is how the accusation
  // would grow back on one surface only.
  return <OpeningBellEvidence evidence={evidence} dataQuality={dataQuality} />;
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

/**
 * `tone="dim"` is not decoration — it is the visual form of "this is not a
 * measurement." A value WM could not observe must not wear the same weight as
 * one it did. The `title` carries the reason, so the trader can find out WHY a
 * cell is dim rather than guessing it is a rendering bug.
 */
function Stat({ label, value, tone, title }: { label: string; value: string; tone?: "ok" | "watch" | "warn" | "dim"; title?: string }) {
  const color =
    tone === "warn"  ? "#c05a4a" :
    tone === "watch" ? "#c9a55c" :
    tone === "dim"   ? "#8a8271" :
                       "#ede6d3";
  return (
    <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(19,19,23,0.5)" }} title={title}>
      <div style={{ fontSize: 8, letterSpacing: 0.4, textTransform: "uppercase", color: "#8a8271", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}
