/**
 * selectContinuationHealth — the compiled reading behind ASSET 15,
 * "Question-Driven Continuation Health".
 *
 * The mockup's banner asks ONE question — "Is this continuation healthy?" — and
 * this file compiles the answer out of owners that already exist. It detects
 * nothing, re-derives nothing, and mints no number.
 *
 * ── WHAT THE MOCKUP ASKS FOR THAT THIS FILE REFUSES ─────────────────────────
 *
 * The left rail of `WM_Transformation_UI_15_Question_Driven_Continuation_Health`
 * is five stacked cards, four of which are a percentage over a filled bar:
 *
 *     STRUCTURE ALIGNMENT      92%   Bullish
 *     MOMENTUM SUSTAINMENT     78%   Constructive
 *     VOLUME CONFIRMATION      84%   Supportive
 *     CONTINUATION HEALTH SCORE 85%  Healthy Continuation
 *
 * Not one of those four numbers can be derived from anything in this repo, and
 * that is not a gap waiting to be filled — it is the shape of number this
 * product exists to not print. "92% aligned" answers a question no owner asked.
 * The swing sequence knows whether the last two highs printed higher; it does
 * not know, and cannot know, that the alignment is 92 rather than 87. A number
 * with no owner is a confidence the trader cannot audit, and the ledger for
 * this asset bans it by name.
 *
 * So the four scores are refused and the reading is stated in WORDS. That is
 * also Build Order §9 — a verdict may never be graded in hue, and a bar filled
 * 92% green is a grade in hue with a number painted on it.
 *
 * `VOLUME CONFIRMATION` is refused twice over: this composition reads structure
 * and regime, and neither is a volume owner. Rather than drop the row silently,
 * `unread` NAMES it. A surface that quietly renders four of the mockup's five
 * cards teaches the reviewer that the fifth was never asked for.
 *
 * ── WHAT IT DOES INSTEAD ────────────────────────────────────────────────────
 *
 * Continuation health is an AGREEMENT question, and agreement between two
 * compiled owners is fully auditable: either the swing sequence is directional
 * and the regime supports a directional move, or they disagree, and which of
 * the two is saying what can be printed verbatim beside the verdict.
 *
 *   COHERENT   the sequence is directional AND the regime supports continuation
 *   CONTESTED  both were read and they disagree about whether anything continues
 *   ROTATING   both were read and both say there is nothing continuing
 *   UNREADABLE one of the two could not be read at all
 *
 * ROTATING is deliberately NOT folded into CONTESTED. A range inside a balance
 * regime is two owners AGREEING — the honest answer to "is this continuation
 * healthy" is "there is no continuation", which is a finding, not a failure.
 * Collapsing it into CONTESTED would report an agreement as a conflict.
 *
 * ── THE CAVEAT THAT RIDES EVERY DIRECTIONAL VERDICT ─────────────────────────
 *
 * `MarketStructureVM.confirmationLagNote` is carried verbatim on every reading
 * that states a direction. A fractal pivot needs `lookback` bars on both sides,
 * so the newest bars can never be pivots and the sequence is always describing
 * a market that has already moved past it. The mockup says nothing about this.
 * It is permanent, it is not cured by more bars, and a continuation surface is
 * the single worst place to omit it — the trader is asking about the NEXT bar
 * while the evidence is structurally about an earlier one.
 *
 * PURE / DETERMINISTIC — no React, no I/O, no clock.
 */

import type { MarketStructureVM } from "./selectMarketStructure";
import type { RegimeVM, RegimeVerdict } from "./selectRegime";

export const CONTINUATION_HEALTH_VERSION = "wm.continuation-health.v1" as const;

export type ContinuationHealth =
  | "COHERENT"
  | "CONTESTED"
  | "ROTATING"
  | "UNREADABLE";

/**
 * One row of the reading. `basis` is the owner's OWN sentence, never a
 * rephrasing — the same discipline `deriveStructureDimension` applies to
 * `confirmationLagNote`. `owner` is the audit trail: a reviewer can grep the
 * file named here and check the claim.
 */
export interface ContinuationReading {
  readonly label: string;
  /** The verdict in words. Never a score, never a percentage. */
  readonly value: string;
  readonly basis: string;
  readonly owner: string;
}

/**
 * A price the sequence actually turned at. Asset 17 draws these as `KEY LEVELS ·
 * Resistance / Support` — and those two words are refused here.
 *
 * "Resistance" and "support" are forward-looking claims: they say price WILL
 * struggle at a number. Nothing in this repo owns that. What `selectMarketStructure`
 * owns is narrower and true — a confirmed fractal pivot, a bar the market has
 * already turned at. So the label states what was observed, and the reader is
 * left to decide what it means. This is the same refusal Asset 03 made of
 * `IMPLICATION: SIDEWAYS / REVERSAL RISK`.
 *
 * `price` is a real observed extreme, not a derived score — which is why it is
 * the one number this VM carries. §9 bans grading a VERDICT in hue and painting
 * a number on it; it does not ban reporting a price the market printed.
 */
export interface ContinuationLevel {
  readonly label: string;
  readonly price: number;
  readonly time: number;
  readonly owner: string;
}

export interface ContinuationHealthVM {
  readonly version: typeof CONTINUATION_HEALTH_VERSION;
  readonly health: ContinuationHealth;
  /** True when BOTH owners produced a reading. */
  readonly measured: boolean;
  /** The rows that were read, each with its owner. */
  readonly readings: readonly ContinuationReading[];
  /**
   * Named dimensions this composition did NOT read, so an absent card is a
   * disclosed absence rather than a silently dropped one.
   */
  readonly unread: readonly string[];
  /** One sentence naming which owners said what, and why that is the verdict. */
  readonly reason: string;
  /**
   * WHERE the sequence turned. Empty when no pivot was confirmed.
   *
   * These survive a verdict this compiler could NOT reach. When structure is
   * measured but the regime is unknown, `health` is UNREADABLE and yet the
   * pivots are perfectly well known — refusing to state them because a DIFFERENT
   * owner is short would withhold a fact that was actually observed. An
   * unreadable continuation is still allowed to say where the market last turned.
   */
  readonly levels: readonly ContinuationLevel[];
  /**
   * The permanent pivot-confirmation lag, carried verbatim from the structure
   * owner. Non-null whenever this VM makes ANY claim resting on a pivot — a
   * stated direction, a carried level, or both.
   *
   * It used to be carried only on a DIRECTIONAL reading, on the reasoning that a
   * rotating market states no direction and so makes no lagged claim. That was
   * true until `levels` existed. A level IS a pivot, so it carries the lag
   * whatever the bias did, and a rotating range is defined by exactly the two
   * pivots now being printed. Omitting the note there would have put the repo's
   * most lag-sensitive numbers on screen with the lag disclosure removed.
   */
  readonly confirmationLagNote: string | null;
}

export interface SelectContinuationHealthInput {
  readonly structure: MarketStructureVM | null | undefined;
  readonly regime: RegimeVM | null | undefined;
}

/**
 * Which regimes support a move CONTINUING, and which say the market is going
 * nowhere. Exported as data for the same reason `STRUCTURE_VERDICTS` is: when
 * a producer gains a verdict and a consumer's set does not, nothing throws and
 * no test reddens — the new verdict simply falls into the wrong bucket forever.
 */
export const CONTINUATION_REGIMES: Readonly<Record<RegimeVerdict, "SUPPORTS" | "DENIES" | "NEITHER">> = {
  TREND: "SUPPORTS",
  EXPANSION: "SUPPORTS",
  BALANCE: "DENIES",
  COMPRESSION: "DENIES",
  // A regime that is mid-flip supports nothing and denies nothing. Reading it
  // either way would resolve, in this file, a question `selectRegime` has
  // explicitly declined to resolve.
  TRANSITION: "NEITHER",
  UNKNOWN: "NEITHER",
};

/** The volume rail the mockup shows, which this composition has no owner for. */
const UNREAD_DIMENSIONS = [
  "Volume confirmation — no volume owner is read by this composition, "
  + "so the mockup's VOLUME CONFIRMATION card has no basis here and is not drawn.",
] as const;

/**
 * The pivots the sequence actually turned at, in the structure owner's own
 * terms. Returns empty when nothing was confirmed — never a guessed level.
 */
function levelsFrom(structure: MarketStructureVM): readonly ContinuationLevel[] {
  const out: ContinuationLevel[] = [];
  if (structure.lastSwingHigh) {
    out.push({
      label: "Last confirmed swing high",
      price: structure.lastSwingHigh.price,
      time: structure.lastSwingHigh.time,
      owner: "selectMarketStructure",
    });
  }
  if (structure.lastSwingLow) {
    out.push({
      label: "Last confirmed swing low",
      price: structure.lastSwingLow.price,
      time: structure.lastSwingLow.time,
      owner: "selectMarketStructure",
    });
  }
  return out;
}

/**
 * `structure` is optional because the FIRST unreadable branch is reached when
 * there is no structure at all — no pivots, therefore no levels. The second
 * branch has a measured structure and passes it, so a reading that cannot state
 * a verdict can still state where the market turned.
 */
function unreadable(reason: string, structure?: MarketStructureVM): ContinuationHealthVM {
  const levels = structure ? levelsFrom(structure) : [];
  return {
    version: CONTINUATION_HEALTH_VERSION,
    health: "UNREADABLE",
    measured: false,
    readings: [],
    unread: UNREAD_DIMENSIONS,
    reason,
    levels,
    // A level is a pivot, so carrying one obliges the lag note even here.
    confirmationLagNote: levels.length > 0 ? (structure?.confirmationLagNote ?? null) : null,
  };
}

const STRUCTURE_VALUE: Readonly<Record<MarketStructureVM["bias"], string>> = {
  HIGHER_HIGHS: "HIGHER HIGHS",
  LOWER_LOWS: "LOWER LOWS",
  RANGE: "ROTATING IN RANGE",
  UNCLEAR: "UNREADABLE",
};

export function selectContinuationHealth(
  input: SelectContinuationHealthInput,
): ContinuationHealthVM {
  const { structure, regime } = input;

  if (!structure || !structure.measured) {
    return unreadable(
      structure?.insufficientNote
      ?? "No swing sequence was compiled, so there is no move whose continuation could be judged.",
    );
  }

  if (!regime || regime.verdict === "UNKNOWN") {
    // Structure IS measured on this branch — the pivots are known even though the
    // verdict is not. Pass it, so the reading can still answer "where did it turn".
    return unreadable(
      regime?.reason
      ?? "No regime was resolved, so the sequence cannot be read against the environment it printed in.",
      structure,
    );
  }

  const structureValue = STRUCTURE_VALUE[structure.bias];
  const directional = structure.bias === "HIGHER_HIGHS" || structure.bias === "LOWER_LOWS";
  const stance = CONTINUATION_REGIMES[regime.verdict];

  const readings: ContinuationReading[] = [
    {
      label: "Swing sequence",
      value: structureValue,
      basis: structure.biasNote,
      owner: "selectMarketStructure",
    },
    {
      label: "Regime",
      value: regime.verdict,
      basis: regime.narrative,
      owner: "selectRegime",
    },
  ];

  let health: ContinuationHealth;
  let reason: string;

  if (directional && stance === "SUPPORTS") {
    health = "COHERENT";
    reason = `The confirmed sequence is ${structureValue.toLowerCase()} and the regime is `
      + `${regime.verdict.toLowerCase()} — both owners describe a market that is going somewhere.`;
  } else if (!directional && stance === "DENIES") {
    health = "ROTATING";
    reason = `The confirmed sequence is rotating and the regime is ${regime.verdict.toLowerCase()} — `
      + "both owners agree there is no move in progress to continue.";
  } else if (stance === "NEITHER") {
    health = "CONTESTED";
    reason = `The confirmed sequence is ${structureValue.toLowerCase()}, but the regime is `
      + `${regime.verdict.toLowerCase()}, which neither supports nor denies continuation — `
      + "the environment has not settled enough to read the sequence against.";
  } else if (directional) {
    health = "CONTESTED";
    reason = `The confirmed sequence is ${structureValue.toLowerCase()}, but the regime is `
      + `${regime.verdict.toLowerCase()} — the swings say trend and the environment says it is not one.`;
  } else {
    health = "CONTESTED";
    reason = `The confirmed sequence is rotating, but the regime is ${regime.verdict.toLowerCase()} — `
      + "the environment says a move is running while the swings have not made one.";
  }

  const levels = levelsFrom(structure);

  return {
    version: CONTINUATION_HEALTH_VERSION,
    health,
    measured: true,
    readings,
    unread: UNREAD_DIMENSIONS,
    reason,
    levels,
    // Carried on every DIRECTIONAL reading, COHERENT included — the lag is the
    // reason a healthy-looking continuation can already be over. Also carried
    // whenever a LEVEL is on screen, direction or not: a level is a pivot, and a
    // rotating range is defined by precisely the two pivots being printed above.
    confirmationLagNote:
      directional || levels.length > 0 ? structure.confirmationLagNote : null,
  };
}

export default selectContinuationHealth;
