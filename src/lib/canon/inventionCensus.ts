/**
 * THE INVENTION CENSUS — Garden 18 §XXVI / §XLVIII / §CV ("ZERO GHOSTS").
 *
 * Read from the CURRENT — WM Pro Complete Invention Registry & Surface Map
 * (2026-09-22) and the CURRENT VISUAL CANON folder (plates WM_NewMockup_*,
 * WM_A_*, ATH_Blueprint_*). The registry's own rule: "If one of these is
 * unknown, mark UNKNOWN. Do not silently omit the invention." So every
 * consumer-facing invention is listed here — built or not — with:
 *
 *   owner    the module that computes it (a test proves the file exists)
 *   surface  where a trader reaches it: a Tools switch (ProfileId), a
 *            footprint mode, a route, or a contextual door (Inspect, select)
 *   plate    the canon plate it must embody, when one exists in the folder
 *   status   BUILT · PARTIAL (built, a named leg missing) · NOT_BUILT ·
 *            INTERNAL (organ, never a consumer surface — registry §B)
 *
 * A test keeps it honest in both directions: an owner that disappears, a
 * switch with no census identity, a route that 404s, or a consumer BUILT
 * invention with no surface all fail the gate. This is the list the visual
 * canon walk (§XLVIII) is run against.
 */
import type { ProfileId } from "@/lib/marketData/viewModels/selectProfileMenu";

export type CensusStatus = "BUILT" | "PARTIAL" | "NOT_BUILT" | "INTERNAL";
export type CensusSurface =
  | { readonly kind: "SWITCH"; readonly id: ProfileId }
  | { readonly kind: "FOOTPRINT"; readonly mode: string }
  | { readonly kind: "ROUTE"; readonly href: string }
  | { readonly kind: "CONTEXT"; readonly how: string }
  | { readonly kind: "NONE" };

export interface CensusEntry {
  readonly id: string;
  readonly name: string;
  readonly family: string;
  readonly status: CensusStatus;
  readonly owner: string | null;
  readonly surface: CensusSurface;
  readonly plate: string | null;
  /** What is missing, when not BUILT. */
  readonly gap?: string;
  /** Words a trader may search by that are not in the name (Tools search). */
  readonly aliases?: readonly string[];
}

const sw = (id: ProfileId): CensusSurface => ({ kind: "SWITCH", id });
const ctx = (how: string): CensusSurface => ({ kind: "CONTEXT", how });
const route = (href: string): CensusSurface => ({ kind: "ROUTE", href });
const VM = "src/lib/marketData/viewModels/";

export const INVENTION_CENSUS: readonly CensusEntry[] = [
  // ── F01 TRUTH / FIDELITY ───────────────────────────────────────────────
  { id: "F01", name: "Truth owns the candle · Fidelity five (not a rainbow)", family: "F01 Truth / Fidelity", status: "BUILT",
    owner: "src/components/marketData/CanonicalFidelityBadge.tsx", surface: ctx("fidelity chip beside every price (chart, watchlist, tape, desk)"),
    plate: "WM_NewMockup_64b_F01A_Truth_Owns_Candle · WM_NewMockup_136_Fidelity_Five_Not_A_Rainbow" },
  { id: "F01.CHART_INTEGRITY", name: "Chart Integrity Inspector / honesty plaque", family: "F01 Truth / Fidelity", status: "BUILT",
    owner: "src/lib/marketData/selectPerCapabilityFidelity.ts", surface: ctx("honesty plaque under the WAIT rail"), plate: "ATH_Blueprint_E-301_Fidelity_Logic" },

  // ── F03 MEMORY ─────────────────────────────────────────────────────────
  { id: "F03A", name: "Memory Ghost", family: "F03 Memory", status: "BUILT", owner: `${VM}selectMemoryGhost.ts`, surface: sw("MEMORY_GHOST"), plate: "WM_NewMockup_68_F03A_Memory_Ghost" },
  { id: "H-801", name: "Expected Envelope + Analogue Surprise", family: "F03 Memory", status: "BUILT", owner: `${VM}selectExpectedEnvelope.ts`, surface: sw("EXPECTED_ENVELOPE"), plate: "WM_NewMockup_120_F03_Expected_Envelope_Surprise" },

  // ── F04 CAUSAL LADDER ──────────────────────────────────────────────────
  // Glass 2026-10-01 (MNQ 1m): FORCE (AGGRESSIVE SELL) → UNPAID EVIDENCE DEBT
  // 0/3…2/3 → RESPONSE (FADED · REVERSED, with 11 · against 14); Inspect carries
  // OUTCOME UNKNOWN until the response bars close. Marks ONE selected event by design.
  { id: "F04A", name: "Causal marks on the event (Force → Response, Unpaid Evidence Debt)", family: "F04 Causal Ladder", status: "BUILT",
    owner: `${VM}selectPrintResponse.ts`, surface: ctx("switch on Big Trades, then select a print"), plate: "WM_NewMockup_70_F04A_Causal_Marks · WM_NewMockup_119_F06_Force_Response_Same_Print" },

  // ── F05 CLARITY ────────────────────────────────────────────────────────
  { id: "F05A", name: "Clarity Candle (default language)", family: "F05 Clarity", status: "BUILT", owner: "src/lib/chart/clarityCandle.ts", surface: sw("CLARITY_CANDLE"), plate: "WM_NewMockup_72_F05A_Clarity_Default_Language" },
  { id: "F05B", name: "Candle Anatomy Inspect (Truth Range · Pressure Split · Battle Balance)", family: "F05 Clarity", status: "BUILT",
    owner: `${VM}selectClarityAnatomy.ts`, surface: ctx("select a candle → Inspect"), plate: "WM_NewMockup_73_F05B_Candle_Anatomy_Inspect" },

  // ── F06 ORDER FLOW ─────────────────────────────────────────────────────
  { id: "F06A.BIDASK", name: "Footprint · Bid × Ask", family: "F06 Order Flow", status: "BUILT", owner: "src/components/chart/FootprintControls.tsx", surface: { kind: "FOOTPRINT", mode: "bid-ask" }, plate: "WM_NewMockup_74_F06A_OrderFlow_On_Price" },
  { id: "F06A.DELTA", name: "Delta Bubbles", family: "F06 Order Flow", status: "BUILT", owner: "src/components/chart/FootprintControls.tsx", surface: { kind: "FOOTPRINT", mode: "delta" }, plate: "WM_NewMockup_74_F06A_OrderFlow_On_Price" },
  { id: "F06A.IMB", name: "Imbalance cells", family: "F06 Order Flow", status: "BUILT", owner: "src/components/chart/FootprintControls.tsx", surface: { kind: "FOOTPRINT", mode: "imbalance" }, plate: "WM_NewMockup_74_F06A_OrderFlow_On_Price" },
  { id: "F06A.AGGPAS", name: "Aggressive / Passive", family: "F06 Order Flow", status: "BUILT", owner: "src/components/chart/FootprintControls.tsx", surface: { kind: "FOOTPRINT", mode: "aggressive-passive" }, plate: null },
  { id: "F06A.VOL", name: "Volume per candle", family: "F06 Order Flow", status: "BUILT", owner: "src/components/chart/FootprintControls.tsx", surface: { kind: "FOOTPRINT", mode: "volume-profile" }, plate: null },
  { id: "F06B", name: "Raw Tape Inspect", family: "F06 Order Flow", status: "BUILT", owner: "src/components/chart/ChartInspectTicket.tsx", surface: ctx("select a print → Inspect"), plate: "WM_NewMockup_75_F06B_Raw_Tape_Inspect" },
  { id: "H-701.ABS", name: "Absorption Shelf", family: "F06 Order Flow", status: "BUILT", owner: "src/lib/marketData/selectAbsorptionAnatomy.ts", surface: sw("ABSORPTION"), plate: "WM_NewMockup_46_OrderFlow_Footprint_Absorption · WM_Transformation_UI_06_Absorption_Anatomy" },
  { id: "H-701.EXH", name: "Exhaustion", family: "F06 Order Flow", status: "BUILT", owner: `${VM}selectExhaustion.ts`, surface: sw("EXHAUSTION"), plate: "WM_Transformation_UI_06_Absorption_Anatomy" },
  { id: "F06.STACK", name: "Stacked Imbalance", family: "F06 Order Flow", status: "BUILT", owner: `${VM}selectStackedImbalance.ts`, surface: sw("IMBALANCE_STACK"), plate: null },
  { id: "F06.DIV", name: "Delta Divergence", family: "F06 Order Flow", status: "BUILT", owner: `${VM}selectDeltaDivergence.ts`, surface: sw("DELTA_DIVERGENCE"), plate: null },
  { id: "F06.EFFORT", name: "Effort → Response (Effort Mark)", family: "F06 Order Flow", status: "BUILT", owner: "src/lib/marketData/effortMarkGeometry.ts", surface: sw("EFFORT_MARK"), plate: null },
  { id: "F06.DLEVELS", name: "Delta Levels", family: "F06 Order Flow", status: "BUILT", owner: `${VM}selectDeltaLevels.ts`, surface: sw("DELTA_LEVELS"), plate: null },
  { id: "F06A.FLOW", name: "Flow Current (order flow on price)", family: "F06 Order Flow", status: "BUILT", owner: "src/components/chart/MainChart.tsx", surface: sw("FLOW_CURRENT"), plate: "WM_NewMockup_74_F06A_OrderFlow_On_Price" },
  { id: "F06.VALUE_CANDLE", name: "Value Candle", family: "F06 Order Flow", status: "BUILT", owner: `${VM}selectValueCandle.ts`, surface: sw("VALUE_CANDLE"), plate: null },
  { id: "F06.ANATOMY", name: "Anatomy Cards (absorption / exhaustion metrics)", family: "F06 Order Flow", status: "BUILT", owner: `${VM}selectAnatomyCards.ts`, surface: sw("ANATOMY_CARDS"), plate: "WM_Transformation_UI_19_Absorption_Anatomy_Alternate" },
  { id: "F06.BIDASK_PROFILE", name: "Bid/Ask Split Profile (#11)", family: "P-110 Profiles", status: "BUILT", owner: `${VM}selectProfileMenu.ts`, surface: sw("DELTA_VP"), plate: "WM_A_P110_LIVING_PROFILE_STACK" },
  { id: "F06.COMPRESSION", name: "Order Flow Compression", family: "F06 Order Flow", status: "NOT_BUILT", owner: null, surface: { kind: "NONE" }, plate: null, gap: "named in the registry; no owner" },

  // ── F07 BIG TRADES ─────────────────────────────────────────────────────
  { id: "F07A", name: "Big Trades on the market", family: "F07 Big Trades", status: "BUILT", owner: "src/lib/bigTradeLevels.ts", surface: { kind: "FOOTPRINT", mode: "big-trades" }, plate: "WM_NewMockup_76_F07A_BigTrades_On_Market" },
  { id: "F07B", name: "Cluster → Response Inspect", family: "F07 Big Trades", status: "BUILT", owner: `${VM}selectPrintResponse.ts`, surface: ctx("select a Big Trades print → Inspect"), plate: "WM_NewMockup_77_F07B_Cluster_Response_Inspect" },

  // ── F08 LIQUIDITY ──────────────────────────────────────────────────────
  { id: "F08A", name: "Liquidity Lifecycle", family: "F08 Liquidity", status: "BUILT", owner: `${VM}selectLiquidityLifecycle.ts`, surface: sw("LIQUIDITY_LIFECYCLE"), plate: "WM_NewMockup_78_F08A_Liquidity_Lifecycle" },
  { id: "F08B", name: "Liquidity Weather (lens)", family: "F08 Liquidity", status: "BUILT", owner: `${VM}selectLiquidityWeather.ts`, surface: sw("LIQUIDITY_WEATHER"), plate: "WM_NewMockup_79_F08B_Weather_Lens" },
  { id: "F08.BRICK", name: "Brick Walls", family: "F08 Liquidity", status: "BUILT", owner: `${VM}selectProfileMenu.ts`, surface: sw("BRICK_WALLS"), plate: null },

  // ── P-110 PROFILE FAMILY (the eleven) ──────────────────────────────────
  { id: "P110.1", name: "Living Profile", family: "P-110 Profiles", status: "BUILT", owner: `${VM}selectLivingProfile.ts`, surface: sw("LIVING_PROFILE"), plate: "WM_A_P110_LIVING_PROFILE_STACK · WM_NewMockup_121_F09_Living_Profile_Passport_Doorway" },
  { id: "P110.2", name: "Structure Profile", family: "P-110 Profiles", status: "BUILT", owner: `${VM}selectStructureProfile.ts`, surface: sw("STRUCTURE_PROFILE"), plate: "WM_A_P110_LIVING_PROFILE_STACK" },
  { id: "P110.3", name: "Profile Fusion", family: "P-110 Profiles", status: "BUILT", owner: `${VM}selectProfileFusion.ts`, surface: sw("PROFILE_FUSION"), plate: "WM_A_P110_LIVING_PROFILE_STACK" },
  { id: "P110.4", name: "Profile Memory", family: "P-110 Profiles", status: "BUILT", owner: `${VM}selectProfileMemory.ts`, surface: sw("PROFILE_MEMORY"), plate: "WM_A_P110_LIVING_PROFILE_STACK" },
  { id: "P110.5", name: "Profile DNA", family: "P-110 Profiles", status: "BUILT", owner: `${VM}selectProfileDna.ts`, surface: sw("PROFILE_DNA"), plate: "WM_A_P110_LIVING_PROFILE_STACK" },
  { id: "P110.6", name: "Session Profile", family: "P-110 Profiles", status: "BUILT", owner: `${VM}selectProfileMenu.ts`, surface: sw("SESSION"), plate: null },
  { id: "P110.7", name: "Visible Range Profile", family: "P-110 Profiles", status: "BUILT", owner: `${VM}selectVisibleRangeProfile.ts`, surface: sw("VISIBLE_RANGE_PROFILE"), plate: null },
  { id: "P110.8", name: "Fixed Range Profile", family: "P-110 Profiles", status: "BUILT", owner: `${VM}selectProfileMenu.ts`, surface: sw("ANCHORED_RANGE"), plate: null },
  { id: "P110.9", name: "Composite Profile", family: "P-110 Profiles", status: "BUILT", owner: `${VM}selectCompositeProfile.ts`, surface: sw("COMPOSITE_PROFILE"), plate: null },
  { id: "P110.10", name: "TPO / Auction Distribution", family: "P-110 Profiles", status: "BUILT", owner: `${VM}selectTpoProfile.ts`, surface: sw("TPO_PROFILE"), plate: null },
  { id: "P110.CLASSIC", name: "Classic VP · all loaded bars", family: "P-110 Profiles", status: "BUILT", owner: `${VM}selectProfileMenu.ts`, surface: sw("FIXED_RANGE"), plate: null },
  { id: "F09.MIGRATION", name: "Value Migration (Living's auction movie)", family: "F09 Living Profile", status: "BUILT", owner: `${VM}selectValueMigration.ts`, surface: sw("VALUE_MIGRATION"), plate: null },

  // ── F10 TIME ───────────────────────────────────────────────────────────
  { id: "F10", name: "MTF Ancestry (higher-timeframe objects on this camera)", family: "F10 Time", status: "BUILT", owner: `${VM}selectMtfAncestry.ts`, surface: sw("MTF_ANCESTRY"), plate: null },
  { id: "F10.REPLAY", name: "Replay (no-hindsight walk)", family: "F19 Replay", status: "BUILT", owner: "src/lib/chart/replayWindow.ts", surface: ctx("Workspace › Replay"), plate: null },
  { id: "F10.TED", name: "Temporal Evidence Density · Structural/Event/Adaptive time", family: "F10 Time", status: "PARTIAL", owner: "src/lib/chart/effortEvidence.ts", surface: ctx("Evidence density (TED) line in the WAIT rail"), plate: null, gap: "TED reads volume concentration across clock time (WM's reading of the name — Founder to confirm); Structural / Event / Adaptive time not built" },

  // ── F11 OBJECTS / PASSPORT ─────────────────────────────────────────────
  { id: "F11A", name: "Market Object on chart", family: "F11 Object Passport", status: "BUILT", owner: `${VM}selectStructureZoneObjects.ts`, surface: ctx("Tools › Market object passport"), plate: "WM_NewMockup_84_F11A_Object_On_Chart · WM_NewMockup_137_Object_Kinds_Shared_Passport_Slots" },
  { id: "F11B", name: "Object Passport", family: "F11 Object Passport", status: "BUILT", owner: `${VM}selectMarketObjectPassport.ts`, surface: ctx("select an object → Passport"), plate: "WM_NewMockup_85_F11B_Passport_Drawer" },
  { id: "F11.STRUCTURE", name: "Market Structure", family: "F11 Object Passport", status: "BUILT", owner: `${VM}selectMarketStructure.ts`, surface: sw("MARKET_STRUCTURE"), plate: null },

  // ── F12 EVIDENCE LINEAGE ───────────────────────────────────────────────
  { id: "H-301", name: "Evidence Lineage (do not count 7 correlated readings as 7)", family: "F12 Indicator Graduation", status: "BUILT", owner: "src/lib/chart/evidenceLineage.ts", surface: ctx("the WAIT rail beside the chart, once indicators or senses are on"),
    plate: "WM_NewMockup_118_F12_Evidence_Lineage_Do_Not_Count_7" },

  // ── F13 SEMANTIC ZOOM / QUESTIONS ──────────────────────────────────────
  { id: "H-501", name: "Semantic Zoom (FAR · MID · NEAR)", family: "F13 Semantic Zoom", status: "BUILT", owner: `${VM}selectSemanticDensity.ts`, surface: ctx("the chart's zoom itself"), plate: "WM_NewMockup_128_F13_Semantic_Zoom_Micro" },
  { id: "F13.LENS", name: "Question Lens", family: "F13 Semantic Zoom", status: "BUILT", owner: `${VM}selectQuestionLens.ts`, surface: sw("QUESTION_LENS"), plate: "WM_Transformation_UI_04_Question_Driven_Absorption_Canvas" },
  { id: "F13.SCAFFOLD", name: "Scaffolding (Foundation → Pro)", family: "F13 Semantic Zoom", status: "BUILT", owner: `${VM}scaffoldingGlass.ts`, surface: sw("SCAFFOLDING"), plate: null },
  { id: "S-501", name: "Attention Governor / Four-Chunk Budget", family: "F27 Governors", status: "BUILT", owner: `${VM}selectAttentionGovernor.ts`, surface: ctx("always on; visual roles in Tools › Active"), plate: "ATH_Blueprint_S-501_Four_Chunk_Attention_Budget · WM_NewMockup_122_F17_Attention_Governor_MANAGE" },

  // ── F14 DISCOVERY / HEAT · CONTRADICTION ───────────────────────────────
  { id: "H-401", name: "Contradiction not averaged", family: "F14 / H-401", status: "BUILT", owner: `${VM}selectContradiction.ts`, surface: sw("CONTRADICTION"), plate: "WM_NewMockup_124_F14_Contradiction_Not_Averaged" },
  { id: "F14.HEAT", name: "Heat lens — lands on the same camera", family: "F14 Discovery / Heat", status: "BUILT", owner: `${VM}selectHeatLens.ts`, surface: route("/scanner/map"), plate: "WM_NewMockup_126_F14_Heat_Lands_Same_Camera · ATH_Blueprint_P-601_Heat_Lens_Stack" },
  { id: "F14.ARCHIVE", name: "Research Heat Archive (saved / historical heat)", family: "Rooms", status: "BUILT", owner: "src/lib/research/heatArchive.ts", surface: route("/research-heat"), plate: null },

  // ── F15 REGIME ─────────────────────────────────────────────────────────
  { id: "H-901", name: "Regime State Lighting", family: "F15 Regime", status: "BUILT", owner: `${VM}selectRegimeLighting.ts`, surface: sw("REGIME_LIGHTING"), plate: "WM_NewMockup_92_F15A_Regime_State_Lighting" },
  { id: "F15.PRESSURE", name: "Derivatives Pressure world", family: "F15 Regime", status: "BUILT", owner: `${VM}selectDerivativesPressure.ts`, surface: sw("DERIVATIVES_PRESSURE"), plate: null },
  { id: "F15.BREATHING", name: "Market Breathing", family: "F15 Regime", status: "PARTIAL", owner: "src/lib/chart/marketBreathing.ts", surface: ctx("Market breathing card in the WAIT rail beside the chart"), plate: null, gap: "rail reading built to the registry's Volatility/Breathing definition (ATR, realized vol, compression, expansion); its on-canvas grammar waits for a Founder plate" },

  // ── F16 DECISION / WAIT / EVIDENCE DEBT ────────────────────────────────
  { id: "H-101", name: "Evidence Debt / WAIT as a finished state", family: "F16 Decision", status: "BUILT", owner: `${VM}selectWaitPlaque.ts`, surface: ctx("the WAIT rail beside the chart"),
    plate: "WM_NewMockup_94_F16A_WAIT_Finished_State · WM_NewMockup_123_F16_Evidence_Debt_WAIT_Finished · WM_NewMockup_133_Gates_One_Rail_Debt" },

  // ── F17 RISK ON PRICE ──────────────────────────────────────────────────
  { id: "H-1001", name: "Risk on Price + Frozen Receipt", family: "F17 Risk", status: "BUILT", owner: `${VM}selectRiskOnPrice.ts`, surface: sw("RISK_ON_PRICE"), plate: "WM_NewMockup_96_F17A_Risk_On_Price · WM_NewMockup_127_F20_Receipt_Frozen_asOf" },

  // ── F18 BROKER / EXECUTION ─────────────────────────────────────────────
  { id: "F18", name: "TRADE — one verb (futures · stocks · crypto · options family)", family: "F18 Broker Megazord", status: "BUILT", owner: "src/components/chart/TradePanel.tsx", surface: ctx("TRADE beside Desk / Watchlist"), plate: null },
  { id: "F18.EXPR", name: "Underlying + Expression, same Decision_ID (Dual Truth)", family: "F18 Broker Megazord", status: "BUILT", owner: "src/components/chart/FuturesOptionsPanel.tsx", surface: ctx("Options / Futures Options"), plate: "WM_NewMockup_134_Underlying_Plus_Expression_Same_ID" },

  // ── F20 JOURNAL · F21 LEARNING · F22 SPAIDBOT · F23 OPENING BELL ─────────
  { id: "F20", name: "Journal / Review (broker truth + 8-part review)", family: "F20 Journal", status: "BUILT", owner: "src/components/journal/BrokerTruthToday.tsx", surface: route("/journal"), plate: "WM_NewMockup_127_F20_Receipt_Frozen_asOf" },
  { id: "F20.EDGE", name: "Personal Edge", family: "F20 Journal", status: "BUILT", owner: "src/lib/traderMemory/viewModels/selectPersonalEdge.ts", surface: route("/journal"), plate: null },
  { id: "F21", name: "Academy (same room) · Learning Genome", family: "F21 Learning Genome", status: "BUILT", owner: "src/lib/learningGenome/selectSetupGrade.ts", surface: route("/education"), plate: "WM_NewMockup_105_F21B_Academy_Same_Room" },
  { id: "F22", name: "Spaidbot — WHY over the same object", family: "F22 Spaidbot", status: "BUILT", owner: "src/components/experience/DecisionWhyPanel.tsx", surface: ctx("Ask SpaidBot from its chat button (analysis only — it cannot see accounts or place orders); its WHY reads in DECISION · RISK · WHY · NEXT"), plate: "WM_NewMockup_106_F22A_Spaidbot_Same_Object · WM_NewMockup_125_WHY_Summary_Over_Same_Chart",
    // ATHOS order §8: Tools search found nothing for the words traders type.
    aliases: ["spadebot", "spaid bot", "ai", "assistant", "chat", "ask", "bot"] },
  { id: "F23", name: "Opening Bell posture", family: "F23 Opening Bell", status: "BUILT", owner: "src/lib/traderMemory/viewModels/selectOpeningBell.ts", surface: route("/morning-prep"), plate: null },

  // ── ROOMS ──────────────────────────────────────────────────────────────
  { id: "ROOM.BACKTEST", name: "Backtest Lab", family: "Rooms", status: "BUILT", owner: "src/app/backtesting/page.tsx", surface: route("/backtesting"), plate: null },
  { id: "ROOM.SCANNER", name: "Scanner Deck", family: "Rooms", status: "BUILT", owner: "src/app/scanner/page.tsx", surface: route("/scanner"), plate: null },

  // ── NAMED CROSS-SURFACE INVENTIONS (registry §AB) — not yet built ───────
  { id: "AB.TWIN", name: "Market Twin · State Graph", family: "Registry §AB", status: "NOT_BUILT", owner: null, surface: { kind: "NONE" }, plate: null, gap: "named; no owner" },
  { id: "AB.MATRIX", name: "Response Matrix", family: "Registry §AB", status: "PARTIAL", owner: "src/lib/chart/effortEvidence.ts", surface: ctx("Response matrix card in the WAIT rail (effort × response cells per bar)"), plate: null, gap: "rail reading built to the registry line 'observed response vs contextual expected response'; on-canvas grammar waits for a Founder plate" },
  { id: "AB.PERCEPTION", name: "Perception Graduation", family: "Registry §AB", status: "NOT_BUILT", owner: null, surface: { kind: "NONE" }, plate: null, gap: "named; no owner" },
  { id: "AB.COMPARATIVE", name: "Comparative Reality Mode", family: "Registry §AB", status: "NOT_BUILT", owner: null, surface: { kind: "NONE" }, plate: null, gap: "named; no owner" },
  { id: "AB.GRAVITY", name: "Process Gravity Field", family: "Registry §AB", status: "NOT_BUILT", owner: null, surface: { kind: "NONE" }, plate: null, gap: "named; no owner" },
  { id: "AB.DECAY", name: "Structural Memory + Decay Physics", family: "Registry §AB", status: "NOT_BUILT", owner: null, surface: { kind: "NONE" }, plate: null, gap: "named; no owner" },

  // ── GARDEN 19 §34 RECOVERY — registry names that had no census row ──────
  // Read from the Registry (1pC82nUdffKbfr60RTwbbXjNErRgj0gZKAqbPhEzvCvY) on
  // 2026-10-06. Classes per docs/operations/GARDEN19-INVENTION-CERTIFICATES.md
  // (A continuous · B event · C territory). Recorded so none is silently lost.
  { id: "G19.BAR_DELTA", name: "Bar delta (signed aggressor volume per bar)", family: "F06 Order Flow", status: "PARTIAL", owner: "src/components/chart/MainChart.tsx",
    surface: ctx("numerals under the bars at NEAR semantic zoom"), plate: null,
    gap: "Class A: numbers only and only at NEAR zoom — no on-candle grammar across the field (number-erasure fails)" },
  { id: "G19.DELTA_RATIO", name: "Delta ratio (|bar delta| ÷ bar volume)", family: "F06 Order Flow", status: "NOT_BUILT", owner: null, surface: { kind: "NONE" }, plate: null,
    gap: "registry formula (H-701 refinement); no owner" },
  { id: "G19.RVOL", name: "Relative volume · Relative Market Energy (RME)", family: "Participation sense", status: "PARTIAL", owner: "src/lib/chart/volumeTruth.ts",
    surface: ctx("volume band under the candles and the Vol figure in the footer"), plate: null,
    gap: "raw volume only — nothing carries bar-relative participation; spot FX is silenced honestly and has a CME related-flow line (G19.CROSS), but no TICK ACTIVITY carrier" },
  { id: "G19.CVD_REL", name: "CVD ⇄ price relationship (agreement / divergence per bar)", family: "Aggression sense", status: "PARTIAL", owner: "src/components/chart/MainChart.tsx",
    surface: ctx("Indicators › Tape CVD pane under the chart"), plate: null,
    gap: "CVD lives in its own pane; the per-bar relationship never reaches the candle (panel-erasure fails); Delta Divergence marks only two pivots" },
  { id: "G19.FAILED_AGG", name: "Failed aggression", family: "F06 Order Flow", status: "NOT_BUILT", owner: null, surface: { kind: "NONE" }, plate: null,
    gap: "registry §C/§E and the order-flow plate pack; no owner" },
  { id: "G19.CLC", name: "CLC — Clean Level Close family (Wick Test · Weak Close · Clean Close · +Volume · +CVD Agreement · Break and Hold · Failed Hold · Reclaim · Rejection)",
    family: "F16 Decision", status: "NOT_BUILT", owner: null, surface: { kind: "NONE" }, plate: null,
    gap: "Manifestation Map §13 'CLC IS A FAMILY'; no owner", aliases: ["clc", "clean close", "wick test"] },
  { id: "G19.SURPRISE", name: "Market Surprise · Absence-as-Evidence (marks on price)", family: "Causal / expectation", status: "NOT_BUILT", owner: null, surface: { kind: "NONE" }, plate: null,
    gap: "observed vs expected response is read inside the WAIT-rail matrix card only; no mark where the market surprised or stayed silent" },
  { id: "G19.CROSS", name: "Cross-market relationship · benchmark alignment (incl. FX RELATED FUTURES EVIDENCE)", family: "Cross-market sense", status: "PARTIAL",
    owner: "src/lib/chart/fxRelatedFlow.ts", surface: ctx("on a spot FX chart: the 'CME 6E flow · related, not spot' line beside the price (owner only)"), plate: null,
    gap: "only the FX leg (CME 6E / 6B / 6J signed flow as words) exists — index / sector / futures↔equity benchmark alignment not built" },
  { id: "G19.VWAP", name: "VWAP · session-anchored VWAP", family: "Value sense", status: "PARTIAL", owner: "src/components/chart/indicators.ts",
    surface: ctx("Indicators › VWAP"), plate: null,
    gap: "an indicator line, not a Tools sense — no Inspect identity, no user-dragged anchor (registry §I 'VWAP anchor')" },
  { id: "G19.AGES", name: "Object ages — Clock · Structural · Event · Session · Regime Age", family: "F10 Time", status: "NOT_BUILT", owner: null, surface: { kind: "NONE" }, plate: null,
    gap: "registry §G ('Old in clock time. Young in structural time.'); no owner" },
  { id: "G19.TIME_FAMILY", name: "Temporal Lens · Adaptive Time · Structural Time · Event Time · Temporal Sync · Horizon", family: "F10 Time", status: "NOT_BUILT", owner: null,
    surface: { kind: "NONE" }, plate: null, gap: "registry §G time family; no owner" },
  { id: "G19.REGIME_HISTORY", name: "Regime history · regime transition marks", family: "F15 Regime", status: "NOT_BUILT", owner: null, surface: { kind: "NONE" }, plate: null,
    gap: "Regime Lighting applies the current breaker to every bar in view; past regimes and their transitions are not on the field" },
  { id: "G19.STRUCTURE_STATE", name: "Structure state (intact · testing · deteriorating · failed · reclaimed) · body-close break", family: "F11 Object Passport", status: "NOT_BUILT", owner: null,
    surface: { kind: "NONE" }, plate: null, gap: "Market Structure draws swings; leg state and break / reclaim events are not distinguished" },
  { id: "G19.CONTRIBUTION", name: "Profile per-bar contribution (which candles built this shelf)", family: "P-110 Profiles", status: "NOT_BUILT", owner: null, surface: { kind: "NONE" }, plate: null,
    gap: "H-601 shared profile object; no owner — a component of the eleven, never a twelfth species" },
  { id: "G19.STACK", name: "Profile stack — show/hide · reorder · side · width · opacity · lock · Auto Arrange · Save My Stack · presets", family: "P-110 Profiles", status: "BUILT",
    owner: `${VM}myProfileStack.ts`, surface: ctx("Tools › Profiles preset bar (Save My Stack)"), plate: "WM_A_P110_LIVING_PROFILE_STACK" },
  { id: "G19.PLAYBOOKS", name: "Strategy playbooks — Trending · Mean-Reversion · Pullback Continuation · Breakout Retest · Failed Auction · NO TRADE", family: "Strategy", status: "NOT_BUILT",
    owner: null, surface: { kind: "NONE" }, plate: null, gap: "registry §AD strategy model; no owner (setup grade A+…No Trade lives with the Learning Genome)" },
  { id: "G19.CHALLENGE", name: "Challenge My Thesis · Show Opposing", family: "F22 Spaidbot", status: "NOT_BUILT", owner: null, surface: { kind: "NONE" }, plate: null,
    gap: "registry §H / §M question lens; only an internal SHOW OPPOSING word in decisionLifecycle.ts" },
  { id: "G19.SQUEEZE", name: "Squeeze conditions · balance escape / failed escape", family: "F06 Order Flow", status: "NOT_BUILT", owner: null, surface: { kind: "NONE" }, plate: null,
    gap: "registry §E / §AD; no owner" },
  { id: "G19.NARRATOR", name: "Accessible Narrator · non-color state grammar", family: "Experience", status: "NOT_BUILT", owner: null, surface: { kind: "NONE" }, plate: null,
    gap: "registry §AD accessibility; no owner" },
  { id: "G19.MARKOV", name: "Markov regime transition matrix (measured transition probabilities)", family: "Strategy", status: "NOT_BUILT", owner: null, surface: { kind: "NONE" }, plate: null,
    gap: "registry §AD lineage; disposition UNKNOWN (current vs lab) — recorded so it is not lost" },

  // ── INTERNAL ORGANS (registry §B — never a consumer room) ──────────────
  { id: "F02", name: "Hive / Nectar", family: "F02 Hive", status: "INTERNAL", owner: "src/app/nectar/page.tsx", surface: route("/nectar"), plate: null },
  { id: "F25", name: "Vault continuity", family: "F25 Vault", status: "INTERNAL", owner: "src/components/chart/NectarVaultChip.tsx", surface: { kind: "NONE" }, plate: null },
  { id: "F26", name: "Chaos Gym", family: "F26 internal", status: "INTERNAL", owner: null, surface: { kind: "NONE" }, plate: null },
];

/**
 * WHERE IS IT? — Garden 18 §XXVI ("if we built it, show me where it is").
 * Tools search reaches every switch; this reaches the built inventions that
 * live in CONTEXT (a rail, a selected print, a room) so typing "causal",
 * "lineage" or "fidelity" in Tools answers with the way to reach it. PURE.
 */
export function searchCensusPlaces(query: string): readonly CensusEntry[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return INVENTION_CENSUS.filter(e => {
    if (e.status !== "BUILT" && e.status !== "PARTIAL") return false;
    if (e.surface.kind !== "CONTEXT" && e.surface.kind !== "ROUTE") return false;
    const hay = `${e.id} ${e.name} ${e.family} ${(e.aliases ?? []).join(" ")}`.toLowerCase();
    return words.every(w => hay.includes(w));
  });
}

/** The words that tell a trader how to reach a CONTEXT / ROUTE invention. */
export function censusPlaceWords(e: CensusEntry): string {
  return e.surface.kind === "CONTEXT" ? e.surface.how : e.surface.kind === "ROUTE" ? `Open ${e.surface.href}` : "";
}
