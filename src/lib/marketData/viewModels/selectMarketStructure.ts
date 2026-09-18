/**
 * selectMarketStructure — the ONE compiled owner of "what the swing sequence
 * is doing".
 *
 * ── WHY THIS FILE HAD TO BE WRITTEN BEFORE THE PASSPORT WIRE ────────────────
 *
 * STRUCTURE is the last dimension still hard-coded into
 * `chartMarketStatePublisher`'s unresolved list. The four repairs before it
 * (PROFILE, LOCATION, AGGRESSION, and ORDER FLOW earlier) each had a compiled
 * VM waiting to be read — `selectLivingProfile`, `selectAggressionResponse`.
 * Structure had none. The only thing in the repo that knows where a swing is
 * is `swingHighLow` in `components/chart/indicators.ts`, and MainChart calls it
 * INLINE, four separate times, at two different lookbacks, to draw Swing
 * High/Low, Strong Highs/Lows, Liquidity Pools and CHoCH.
 *
 * Deriving the Passport's structure verdict straight off the raw detector would
 * have made the publisher a FIFTH inline caller and a second opinion about the
 * same swings. So the compiled owner comes first, and the Passport reads it.
 *
 * ── THE ONE REFUSAL THIS FILE EXISTS TO MAKE ────────────────────────────────
 *
 * A fractal pivot needs `lookback` bars on BOTH sides to be a pivot. So the
 * newest `lookback` bars can NEVER produce one — the most recent structure is
 * always unconfirmed, by construction, not by bad luck. A surface that prints
 * "HIGHER HIGHS" off a high that the detector has not yet confirmed is telling
 * a trader a pivot exists where only a candle does.
 *
 * `unconfirmedBars` and `confirmationLagNote` are therefore first-class fields,
 * not an afterthought, and every reader is expected to carry the sentence
 * rather than rephrase it.
 *
 * ── WHY IT IMPORTS FROM components/ ─────────────────────────────────────────
 *
 * Unusual direction, deliberately taken. `swingHighLow` is a pure function with
 * no React and no imports of its own, and it is truth-locked by
 * `indicators.smc.test.ts`. Re-implementing pivot detection here to keep the
 * import graph tidy would produce exactly the defect this lane exists to
 * prevent: two detectors, two answers, one chart.
 *
 * PURE — no I/O, no clock.
 */

import { swingHighLow, type Bar } from "@/components/chart/indicators";

/** The detector's own default, and the lookback MainChart draws swings at. */
export const STRUCTURE_DEFAULT_LOOKBACK = 5;

/**
 * Two highs and two lows are the minimum that can express a SEQUENCE. With one
 * of either there is a level, but no direction to read off it.
 */
export const STRUCTURE_MIN_PIVOTS_PER_SIDE = 2;

export type StructureBias =
  | "HIGHER_HIGHS"
  | "LOWER_LOWS"
  | "RANGE"
  | "UNCLEAR";

export interface StructurePoint {
  readonly time: number;
  readonly price: number;
}

export interface MarketStructureVM {
  /** False when the window could not produce a readable sequence at all. */
  readonly measured: boolean;
  readonly lookback: number;
  readonly barCount: number;
  /**
   * The newest bars that cannot yet be pivots. Equals `lookback` on any window
   * long enough to have pivots at all — it is a property of the detector, not
   * of the market.
   */
  readonly unconfirmedBars: number;
  /** Owned here, carried verbatim by readers. Never rephrased downstream. */
  readonly confirmationLagNote: string;
  readonly swingHighs: readonly StructurePoint[];
  readonly swingLows: readonly StructurePoint[];
  readonly lastSwingHigh: StructurePoint | null;
  readonly lastSwingLow: StructurePoint | null;
  readonly bias: StructureBias;
  /** The sequence stated in words — "the last two highs each printed higher". */
  readonly biasNote: string;
  /** Why nothing could be read, when `measured` is false. Null otherwise. */
  readonly insufficientNote: string | null;
}

export interface SelectMarketStructureOptions {
  readonly lookback?: number;
}

function lagNote(lookback: number): string {
  return `the newest ${lookback} bar${lookback === 1 ? "" : "s"} cannot yet be a pivot — `
    + `a swing needs ${lookback} bar${lookback === 1 ? "" : "s"} on BOTH sides to confirm, `
    + "so the most recent move is always unconfirmed structure";
}

function unreadable(lookback: number, barCount: number, note: string): MarketStructureVM {
  return {
    measured: false,
    lookback,
    barCount,
    unconfirmedBars: Math.min(lookback, barCount),
    confirmationLagNote: lagNote(lookback),
    swingHighs: [],
    swingLows: [],
    lastSwingHigh: null,
    lastSwingLow: null,
    bias: "UNCLEAR",
    biasNote: note,
    insufficientNote: note,
  };
}

const BIAS_NOTE: Readonly<Record<StructureBias, string>> = {
  HIGHER_HIGHS:
    "the last two confirmed highs each printed higher, and so did the lows — "
    + "buyers have been paying up for each rotation",
  LOWER_LOWS:
    "the last two confirmed highs each printed lower, and so did the lows — "
    + "sellers have been accepting less at each rotation",
  RANGE:
    "the confirmed highs and lows disagree about direction — one side extended "
    + "while the other did not, which is rotation, not trend",
  UNCLEAR: "the window has no readable swing sequence",
};

export function selectMarketStructure(
  bars: readonly Bar[] | null | undefined,
  options: SelectMarketStructureOptions = {},
): MarketStructureVM {
  const lookback = Math.max(1, Math.trunc(options.lookback ?? STRUCTURE_DEFAULT_LOOKBACK));
  const input = (bars ?? []).filter((b) => b != null);
  const barCount = input.length;

  // A pivot needs `lookback` bars either side plus the pivot itself. Below that
  // the detector cannot return anything, and saying so beats returning empties
  // that look like "no structure found".
  if (barCount < lookback * 2 + 1) {
    return unreadable(
      lookback,
      barCount,
      `Only ${barCount} bar${barCount === 1 ? "" : "s"} are loaded; a ${lookback}-bar `
      + `pivot needs at least ${lookback * 2 + 1} before any swing can form.`,
    );
  }

  const { highs, lows } = swingHighLow(input as Bar[], lookback);

  if (
    highs.length < STRUCTURE_MIN_PIVOTS_PER_SIDE
    || lows.length < STRUCTURE_MIN_PIVOTS_PER_SIDE
  ) {
    return {
      ...unreadable(
        lookback,
        barCount,
        `The window confirmed ${highs.length} swing high${highs.length === 1 ? "" : "s"} and `
        + `${lows.length} swing low${lows.length === 1 ? "" : "s"}; a sequence needs at least `
        + `${STRUCTURE_MIN_PIVOTS_PER_SIDE} of each before a direction can be read.`,
      ),
      // The pivots that DID confirm are still real and are still published —
      // withholding them would be a second refusal the detector never made.
      swingHighs: highs,
      swingLows: lows,
      lastSwingHigh: highs[highs.length - 1] ?? null,
      lastSwingLow: lows[lows.length - 1] ?? null,
    };
  }

  const h1 = highs[highs.length - 2]!;
  const h2 = highs[highs.length - 1]!;
  const l1 = lows[lows.length - 2]!;
  const l2 = lows[lows.length - 1]!;

  const highsRising = h2.price > h1.price;
  const lowsRising = l2.price > l1.price;

  const bias: StructureBias =
    highsRising && lowsRising ? "HIGHER_HIGHS"
    : !highsRising && !lowsRising ? "LOWER_LOWS"
    : "RANGE";

  return {
    measured: true,
    lookback,
    barCount,
    unconfirmedBars: lookback,
    confirmationLagNote: lagNote(lookback),
    swingHighs: highs,
    swingLows: lows,
    lastSwingHigh: h2,
    lastSwingLow: l2,
    bias,
    biasNote: BIAS_NOTE[bias],
    insufficientNote: null,
  };
}
