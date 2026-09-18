/**
 * selectDecisionChain — the composed Founder decision chain:
 *
 *   REGIME → DIRECTION → LOCATION → AUCTION STATE → AGGRESSION → CLC →
 *   RISK GEOMETRY (Available R) → PERMISSION → MANAGEMENT
 *
 * From Founder Aug-13 super-directive §9 "BUILD THE COMMAND DECK, NOT
 * A WIDGET GRAVEYARD":
 *
 *   The trader should not have to mentally reconstruct the entire
 *   engine from scattered panels. The UI should help perform that
 *   synthesis.
 *
 *   The Command Deck should orchestrate them. The trader's current
 *   phase determines information priority:
 *     PREPARATION → APPROACH → DECISION → POSITION → POST-EXIT → REVIEW
 *
 * This selector runs all 8 upstream selectors once, threads DLAR into
 * both CLC and AuctionState (as they depend on it), and produces ONE
 * DecisionChainVM the Command Deck can render as a synthesized surface.
 *
 * Pure — takes state + optional history + optional configs. Deterministic.
 */

import type {
  CanonicalMarketState,
  MarketStateResolution,
} from "../canonicalMarketState";
import { selectRegime, type RegimeVM } from "./selectRegime";
import { selectDLAR, type DLARVM } from "./selectDLAR";
import { selectCLC, type CLCVM } from "./selectCLC";
import { selectAuctionState, type AuctionStateVM } from "./selectAuctionState";
import {
  selectAvailableR,
  type AvailableRVM,
  type AvailableRInput,
} from "../../traderMemory/viewModels/selectAvailableR";
import {
  selectPermission,
  type PermissionVM,
  type PermissionInput,
} from "../../traderMemory/viewModels/selectPermission";

export type TradePhase =
  | "PREPARATION"     // pre-market or between opportunities
  | "APPROACH"        // watching a setup form
  | "DECISION"        // signal fired, deciding
  | "POSITION"        // in a trade, managing
  | "POST_EXIT"       // just exited
  | "REVIEW";         // post-session review

export interface DecisionChainInput {
  readonly state: CanonicalMarketState;
  readonly history?: readonly CanonicalMarketState[];
  readonly nowMs: number;
  readonly phase: TradePhase;
  readonly msSinceSessionOpen?: number;

  /** Optional Available R inputs — populated when trader has a proposed setup. */
  readonly availableRInputs?: Omit<AvailableRInput, "state"> | null;
  /** Optional Permission inputs — populated when trader has configured rules. */
  readonly permissionInputs?: Omit<PermissionInput, "nowMs" | "clc" | "availableR" | "marketState"> | null;
  /** ATR extractor for DLAR + Story guards. */
  readonly atrExtractor?: (state: CanonicalMarketState) => number | null;
}

export interface DecisionChainNode {
  readonly key: string;
  readonly label: string;
  readonly verdict: string;
  readonly resolution: MarketStateResolution;
  readonly narrative: string;
  readonly reason?: string;
  /** UI hint: OK / WATCH / WARN / UNKNOWN — non-color state signal for a11y. */
  readonly indicator: "OK" | "WATCH" | "WARN" | "UNKNOWN";
  /**
   * Optional structured supporting evidence — each hint is a short
   * label (e.g. missing input name, engaged rule label, warning text).
   * Rendered as chips beneath the narrative so a trader can inspect
   * WHY a node is UNKNOWN / WATCH / WARN without opening WhyInspector.
   * Founder canon: 'every state must be explainable.'
   */
  readonly hints?: readonly string[];
  /**
   * Tone-per-hint — 'missing' (dim), 'warn' (red), 'watch' (gold).
   * Length must match hints[] when supplied; caller responsibility.
   * Absent = all hints render 'missing' tone.
   */
  readonly hintTones?: readonly ("missing" | "warn" | "watch")[];
  /**
   * WHAT WOULD PAY THIS NODE — and therefore whether it can be paid at all.
   *
   * ── The measured defect this field exists to end ──────────────────────────
   *
   * MEASURED LIVE on production /charts?symbol=TSLA at 12:06Z. The NEXT cell of
   * the decision rail — the cell whose entire job is "the single next thing
   * capable of changing the trader's job" — read:
   *
   *     NEXT   Resolve regime
   *            regime is the first of 7 unpaid evidence nodes (+6 behind it).
   *
   * There is no action, by any trader, on any venue, that resolves regime.
   * `deriveRegimeDimension`'s own doc block says so in capitals: "THIS PRODUCER
   * INVENTS NO EVIDENCE. It is a pure COMPOSITION of two dimensions that were
   * already sealed from the per-trade tape." Regime resolves when direction and
   * volatility resolve, and never before, and never by being worked on.
   *
   * So the product had named a CONSEQUENCE and asked the trader to act on it —
   * an instruction that is unfollowable 100% of the time, by construction, not
   * by data. Nothing threw. Nothing failed tsc. The sentence reads beautifully.
   *
   * It was picked because `payEvidence` took `missingLabels[0]`, and regime
   * happens to be declared first in the node array below. The word "first" in
   * that sentence was reporting SOURCE-FILE ORDER while reading as PRIORITY
   * (LIVING-PIXEL LAW: the word had no owner).
   *
   * Three answers, because there are genuinely three:
   *   EVIDENCE    — a direct `state.<dimension>` read. Pays when the market
   *                 produces the observation. The trader waits; the wait ends.
   *   DECLARATION — pays when the HUMAN declares something (an entry, an
   *                 invalidation, a rule). The canon's ONE-NEXT-THING ENGINE
   *                 names this lane explicitly: "the single next market fact
   *                 OR HUMAN ACTION capable of changing the trader's job."
   *   COMPOSITION — mints nothing. Resolves only as a side effect of its
   *                 inputs resolving. NEVER a legitimate "next thing".
   *
   * Optional so that a node author who has not thought about it is not silently
   * assumed to be payable — consumers treat `undefined` as "not asserted" and
   * fall back to the pre-existing behaviour rather than inventing a claim.
   */
  readonly payableBy?: "EVIDENCE" | "DECLARATION" | "COMPOSITION";

  /**
   * PAYABLE BY KIND IS NOT PAYABLE ON THIS VENUE.
   *
   * Read the EVIDENCE clause directly above: "Pays when the market produces the
   * observation. The trader waits; THE WAIT ENDS."
   *
   * MEASURED LIVE on production /charts?symbol=TSLA, that last clause is false.
   * The regime chip renders, truly, "no per-trade tape has arrived, and this
   * reading is measured trade by trade. The candles cannot answer it." Inches
   * away the ONE NEXT THING cell renders "Resolve direction" — and direction is
   * measured trade by trade too. The wait does not end. It cannot: a yahoo
   * candle feed does not carry a per-trade tape and never will.
   *
   * So `payableBy` was only half the law. It classifies the node by KIND (does
   * it mint its own evidence?) and says nothing about SUPPLY (can this feed
   * deliver that evidence?). 28b6cde8 removed the impossible instruction from
   * regime; without this field it simply reappeared one node down the list,
   * where it is harder to see because direction genuinely IS directly measured.
   *
   * Sourced from `MarketStateDimension.venueBlocked`, which is raised only by a
   * deriver holding a publisher-authored `evidenceGapNote`. Nothing here infers
   * it. `undefined` means NOT ESTABLISHED, and is treated as payable — the
   * pre-existing behaviour — because assuming a venue block nobody proved would
   * be the same fabrication in the opposite direction.
   */
  readonly venueBlocked?: boolean;
}

export interface DecisionChainVM {
  readonly phase: TradePhase;
  readonly evaluatedAt: number;
  readonly nodes: readonly DecisionChainNode[];

  /** Fully-resolved upstream VMs — consumers may inspect deeper. */
  readonly regime: RegimeVM;
  readonly dlar: DLARVM;
  readonly clc: CLCVM;
  readonly auction: AuctionStateVM;
  readonly availableR: AvailableRVM | null;
  readonly permission: PermissionVM | null;

  /** Overall chain status: how many nodes are OK / WATCH / WARN / UNKNOWN. */
  readonly summary: {
    readonly ok: number;
    readonly watch: number;
    readonly warn: number;
    readonly unknown: number;
    readonly total: number;
  };

  /** One-line headline the Command Deck can render prominently.
   *  Composed from the phase + node summary + weakest link. */
  readonly headline: string;
}

// ── Verdict → indicator mapping ─────────────────────────────────────────

const REGIME_INDICATOR: Record<RegimeVM["verdict"], DecisionChainNode["indicator"]> = {
  TREND: "OK", BALANCE: "OK", COMPRESSION: "WATCH",
  TRANSITION: "WATCH", EXPANSION: "WATCH", UNKNOWN: "UNKNOWN",
};

const AUCTION_INDICATOR: Record<AuctionStateVM["verdict"], DecisionChainNode["indicator"]> = {
  ACCEPTING: "OK", EXPANDING: "OK", BALANCING: "OK",
  REJECTING: "WATCH", OPENING_ROTATION: "WATCH",
  FAILING: "WARN", UNKNOWN: "UNKNOWN",
};

const CLC_INDICATOR: Record<CLCVM["verdict"], DecisionChainNode["indicator"]> = {
  CLC_LONG: "OK", CLC_SHORT: "OK",
  WAIT: "WATCH", INVALID: "WARN", UNKNOWN: "UNKNOWN",
};

const PERMISSION_INDICATOR: Record<PermissionVM["verdict"], DecisionChainNode["indicator"]> = {
  ALLOWED: "OK", ADVISORY: "WATCH", RESTRICTED: "WARN", UNKNOWN: "UNKNOWN",
};

const dimIndicator = (resolution: MarketStateResolution, value: string | null): DecisionChainNode["indicator"] => {
  if (resolution === "UNKNOWN" || value == null) return "UNKNOWN";
  if (resolution === "PARTIAL") return "WATCH";
  return "OK";
};

// ── Composed selector ──────────────────────────────────────────────────

export function selectDecisionChain(input: DecisionChainInput): DecisionChainVM {
  const { state, history = [], nowMs, phase, atrExtractor } = input;

  const regime = selectRegime({ state, history });
  const dlar = selectDLAR({ state, history, atrExtractor });
  const auction = selectAuctionState({
    state,
    dlar,
    msSinceSessionOpen: input.msSinceSessionOpen,
  });

  // Signed order-flow coverage — reads from orderFlow evidence.
  // Conservative default: null when no evidence, so CLC.Confirmation
  // returns UNKNOWN not fabricated.
  const signedOrderFlowCoverage = state.orderFlow.resolution === "RESOLVED"
    ? (state.orderFlow.confidence ?? null)
    : null;

  const clc = selectCLC({ state, history, dlar, signedOrderFlowCoverage, atrExtractor });

  const availableR = input.availableRInputs
    ? selectAvailableR({ ...input.availableRInputs, state })
    : null;

  const permission = input.permissionInputs
    ? selectPermission({
        ...input.permissionInputs,
        nowMs,
        clc,
        availableR: availableR ?? undefined,
        marketState: state,
      })
    : null;

  const nodes: DecisionChainNode[] = [
    {
      key: "regime",
      label: "Regime",
      verdict: regime.verdict,
      resolution: regime.resolution,
      narrative: regime.narrative,
      reason: regime.reason,
      indicator: REGIME_INDICATOR[regime.verdict],
      // Pure composition of direction + volatility — deriveRegimeDimension:
      // "THIS PRODUCER INVENTS NO EVIDENCE."
      payableBy: "COMPOSITION",
    },
    {
      key: "direction",
      label: "Direction",
      verdict: state.direction.value ?? "UNRESOLVED",
      resolution: state.direction.resolution,
      narrative: state.direction.value
        ? `Direction ${state.direction.value}`
        : "Direction unresolved — no verified evidence at snapshot time.",
      indicator: dimIndicator(state.direction.resolution, state.direction.value),
      payableBy: "EVIDENCE",
      venueBlocked: state.direction.venueBlocked,
    },
    {
      key: "location",
      label: "Location",
      verdict: state.location.value ?? "UNRESOLVED",
      resolution: state.location.resolution,
      narrative: state.location.value
        ? `Price at ${state.location.value}`
        : "Location unresolved.",
      indicator: dimIndicator(state.location.resolution, state.location.value),
      payableBy: "EVIDENCE",
      venueBlocked: state.location.venueBlocked,
    },
    {
      key: "auction",
      label: "Auction",
      verdict: auction.verdict,
      resolution: auction.resolution,
      narrative: auction.narrative,
      reason: auction.reason,
      indicator: AUCTION_INDICATOR[auction.verdict],
      // selectAuctionState reads the compiled state + dlar — mints nothing.
      payableBy: "COMPOSITION",
    },
    {
      key: "aggression",
      label: "Aggression",
      verdict: state.aggression.value ?? "UNRESOLVED",
      resolution: state.aggression.resolution,
      narrative: state.aggression.value
        ? `${state.aggression.value} aggression (response: ${dlar.response.verdict.toLowerCase()})`
        : "Aggression unresolved.",
      indicator: dimIndicator(state.aggression.resolution, state.aggression.value),
      payableBy: "EVIDENCE",
      venueBlocked: state.aggression.venueBlocked,
    },
    {
      key: "clc",
      label: "CLC",
      verdict: clc.verdict,
      resolution: clc.resolution,
      narrative: clc.narrative,
      reason: clc.reason,
      indicator: CLC_INDICATOR[clc.verdict],
      // selectCLC composes state + history + dlar + orderFlow coverage.
      payableBy: "COMPOSITION",
    },
    (() => {
      const missing = availableR?.missingInputs ?? [];
      const warnings = availableR?.warnings ?? [];
      const hints: string[] = [];
      const hintTones: ("missing" | "warn" | "watch")[] = [];
      for (const m of missing) {
        hints.push(`missing ${m}`);
        hintTones.push("missing");
      }
      for (const w of warnings) {
        hints.push(w);
        hintTones.push("warn");
      }
      return {
        key: "risk",
        label: "Available R",
        verdict: availableR
          ? availableR.resolution === "RESOLVED" || availableR.resolution === "PARTIAL"
            ? `${typeof availableR.conservativeR === "number" ? availableR.conservativeR.toFixed(2) : "?"}R–${typeof availableR.optimisticR === "number" ? availableR.optimisticR.toFixed(2) : "?"}R`
            : "UNKNOWN"
          : "NOT_EVALUATED",
        resolution: availableR?.resolution ?? "UNKNOWN",
        narrative: availableR
          ? availableR.reason ?? `${typeof availableR.conservativeR === "number" ? `${availableR.conservativeR.toFixed(2)}R conservative` : "conservative R unknown"} · ${typeof availableR.optimisticR === "number" ? `${availableR.optimisticR.toFixed(2)}R optimistic` : "optimistic R unknown"}`
          : "No proposed setup — Available R not evaluated.",
        reason: availableR?.reason,
        indicator: availableR
          ? availableR.resolution === "RESOLVED" ? "OK"
          : availableR.resolution === "PARTIAL" ? "WATCH"
          : "UNKNOWN"
          : "UNKNOWN",
        hints: hints.length > 0 ? hints : undefined,
        hintTones: hints.length > 0 ? hintTones : undefined,
        // Available R needs a DECLARED entry and a DECLARED structural
        // invalidation. Both are human acts, not market observations.
        payableBy: "DECLARATION",
      };
    })(),
    (() => {
      const engaged = permission?.engagedRules ?? [];
      const hints = engaged.map((e) => `${e.rule.kind === "HARD" ? "HARD" : "SOFT"}: ${e.rule.label}`);
      const hintTones = engaged.map((e): "warn" | "watch" => (e.rule.kind === "HARD" ? "warn" : "watch"));
      return {
        key: "permission",
        label: "Permission",
        verdict: permission?.verdict ?? "NOT_EVALUATED",
        resolution: permission
          ? permission.verdict === "UNKNOWN" ? "UNKNOWN"
          : permission.verdict === "ALLOWED" ? "RESOLVED"
          : "PARTIAL"
          : "UNKNOWN",
        /**
         * The fallback narrates the INPUT, never the world.
         *
         * `permission === null` means exactly one thing: no `permissionInputs`
         * were handed to this selector. It does NOT mean the trader has no
         * rules — this selector has no way to know that, and it used to say so
         * anyway ("No trader rules configured"), which put a flat
         * contradiction on `/command-deck`: the chain claimed no rules existed
         * while the Steward four rows below read RESTRICTED off eight of them.
         *
         * Every sibling link here already narrates its own inputs and is true
         * by construction — "No proposed setup — Available R not evaluated.",
         * "No CLC evaluation available.", "No open position — management not
         * active." This one reached past its inputs to assert a state of the
         * world it had not observed. H1: absence is not zero.
         */
        narrative: permission?.headline ?? "No rules supplied to this chain — Permission not evaluated here.",
        reason: permission?.reason,
        indicator: permission ? PERMISSION_INDICATOR[permission.verdict] : "UNKNOWN",
        hints: hints.length > 0 ? hints : undefined,
        hintTones: hintTones.length > 0 ? hintTones : undefined,
        // Permission pays when the trader supplies rules to the chain.
        payableBy: "DECLARATION",
      };
    })(),
    {
      key: "management",
      label: "Management",
      verdict: phase === "POSITION" ? "ACTIVE" : phase === "POST_EXIT" ? "COMPLETE" : "PENDING",
      resolution: phase === "POSITION" || phase === "POST_EXIT" ? "RESOLVED" : "UNKNOWN",
      narrative:
        phase === "POSITION" ? "Trade open — management rules apply."
      : phase === "POST_EXIT" ? "Trade closed — post-exit integrity applies."
      :                          "No open position — management not active.",
      indicator: phase === "POSITION" ? "OK" : phase === "POST_EXIT" ? "WATCH" : "UNKNOWN",
      // Management is a readout of `phase`. Nothing pays it directly.
      payableBy: "COMPOSITION",
    },
  ];

  const summary = {
    ok: nodes.filter(n => n.indicator === "OK").length,
    watch: nodes.filter(n => n.indicator === "WATCH").length,
    warn: nodes.filter(n => n.indicator === "WARN").length,
    unknown: nodes.filter(n => n.indicator === "UNKNOWN").length,
    total: nodes.length,
  };

  const headline = composeHeadline(phase, summary, nodes);

  return {
    phase,
    evaluatedAt: nowMs,
    nodes,
    regime,
    dlar,
    clc,
    auction,
    availableR,
    permission,
    summary,
    headline,
  };
}

function composeHeadline(
  phase: TradePhase,
  summary: DecisionChainVM["summary"],
  nodes: readonly DecisionChainNode[],
): string {
  const warnNode = nodes.find(n => n.indicator === "WARN");
  if (warnNode) {
    return `${phaseLabel(phase)} — ${warnNode.label} says ${warnNode.verdict}.`;
  }
  if (summary.unknown >= summary.total / 2) {
    return `${phaseLabel(phase)} — insufficient evidence across ${summary.unknown} of ${summary.total} nodes.`;
  }
  const watchNode = nodes.find(n => n.indicator === "WATCH");
  if (watchNode) {
    return `${phaseLabel(phase)} — ${watchNode.label} is ${watchNode.verdict}. ${summary.ok} node(s) resolved.`;
  }
  return `${phaseLabel(phase)} — chain resolved (${summary.ok}/${summary.total}).`;
}

function phaseLabel(phase: TradePhase): string {
  switch (phase) {
    case "PREPARATION": return "Preparing";
    case "APPROACH": return "Approaching";
    case "DECISION": return "Deciding";
    case "POSITION": return "Managing";
    case "POST_EXIT": return "Post-exit";
    case "REVIEW": return "Reviewing";
  }
}
