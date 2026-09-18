/**
 * CANON ASSET 05 — BIG TRADE INTELLIGENCE.
 *
 * The mockup asks one question: which prints in this window were LARGE, and
 * which way were they leaning. Everything else on that board — the left rail
 * (INTELLIGENCE / MARKET PROFILE / ORDER FLOW / STRUCTURE MAP / HISTORICAL EDGE
 * / ALERTS) — is navigation invention with no owner in this repo, and is not
 * built here.
 *
 * ── WHY A PERCENTILE, AND WHY THE ABSOLUTE FLOOR IS SHOWN BESIDE IT ─────────
 *
 * The chart already has a large-print detector: `minBigTradeLot(base)` in
 * src/lib/bigTradeLevels.ts. It is an ABSOLUTE floor keyed to price magnitude —
 * 0.15 on BTC, 2 on a $500 name — hand-tuned so that bubbles appear at a
 * watchable rate. That is the right basis for a bubble, which must be sparse.
 *
 * It is the wrong basis, alone, for the question "was that big". A 0.15 BTC
 * print is unremarkable in a busy hour and enormous at 04:00. "Big" is a claim
 * about a DISTRIBUTION, so this view ranks each print against the other prints
 * in the same window and cuts at a percentile.
 *
 * Both readings are published, and they are not averaged into one score. They
 * answer different questions and they routinely disagree: on a quiet tape the
 * percentile cut sits BELOW the absolute floor (the biggest print of the hour
 * is still small), and on a violent one it sits far above (dozens of prints
 * clear the floor and none of them stand out). A single blended "big trade
 * count" would hide exactly the condition the trader needed to know about, so
 * the divergence is a printed sentence rather than an averaged-away artefact.
 *
 * ── THE PERCENTILE NEEDS A POPULATION, AND SAYS SO WHEN IT HAS NONE ─────────
 *
 * A 90th percentile of four prints is just "the second largest print" wearing a
 * statistic's clothes. Below `MIN_PRINTS_FOR_PERCENTILE` the view refuses to
 * compute one and names the reason, rather than rendering a threshold that
 * would move wildly with every arriving tick. `missingInput` is a value, not a
 * boolean, so the panel prints WHICH incapacity it hit.
 *
 * ── THE SIDE IS THE HALF MOST LIKELY TO BE A LIE ────────────────────────────
 *
 * "$2M BOUGHT" is the sentence this view exists to enable, and on the only live
 * US-equity tape this product can reach, the buy/sell flag is not from the
 * venue at all — the Alpaca relay reconstructs it with a tick rule and stamps
 * `aggressorMethod: "TICK_RULE"`, confidence 0.5. See the long header on
 * selectAggressorFlow. So provenance is computed here with the same
 * weakest-link rule and carried on the view model: a reconstructed side may not
 * wear the same chrome as a venue-asserted one.
 *
 * And `largeNet` is `null` unless EVERY large print carried a side. A sum over
 * the sided subset is a number with no window — it would read as "big money is
 * buying" when the biggest print of the window had no side at all. The count of
 * unsided large prints is published so the gap is visible instead of inferred.
 *
 * Pure: no DOM, no clock, no globals. The shipped code is the tested code.
 *
 * Aggressor convention is codebase-wide: ask = buyer-initiated ("buy"),
 * bid = seller-initiated ("sell").
 */

import { minBigTradeLot } from "@/lib/bigTradeLevels";
import type { AggressorMethod } from "@/lib/marketData/marketEvent";
import type { AggressorProvenance } from "@/lib/marketData/selectAggressorFlow";

export const BIG_TRADE_INTELLIGENCE_VERSION = 1;

/**
 * Fewer prints than this and a percentile is not a distribution reading.
 *
 * Twenty is the smallest window where the 90th percentile is not simply "the
 * largest print or two" — at n=20 the cut has eighteen observations beneath it.
 * It is a deliberate floor, not a tuning knob: lowering it would make the
 * threshold jump on every tick and give the panel a number that looks stable
 * and is not.
 */
export const MIN_PRINTS_FOR_PERCENTILE = 20;

/** Where the large-print cut is taken. */
export const LARGE_PRINT_PERCENTILE = 0.9;

/** The most rows the panel will carry. Beyond this it is a tape, not a reading. */
export const MAX_LARGE_PRINTS = 12;

/**
 * Which incapacity stopped the reading. A value rather than a boolean, because
 * "no tape at all" and "a tape too thin to rank" are different facts about the
 * feed and the panel must be able to say which one it hit.
 */
export type BigTradeMissingInput = "NO_TAPE" | "TOO_FEW_PRINTS";

export interface BigTradePrint {
  readonly time?: number | null;
  readonly price?: number | null;
  readonly size?: number | null;
  readonly side?: "buy" | "sell" | null | undefined;
  /** Only real executed prints count. Quotes and bookTicker updates are not trades. */
  readonly trade?: boolean;
  readonly marketEvent?: { readonly aggressorMethod?: AggressorMethod } | null;
}

export interface LargePrint {
  readonly time: number | null;
  readonly price: number;
  readonly size: number;
  /** `null` when the tape stated no side for this print. Never defaulted to a side. */
  readonly side: "buy" | "sell" | null;
  /** Share of the window's prints strictly smaller than this one, 0..1. */
  readonly sizePercentile: number;
  /** Whether this print would also have fired the chart's absolute bubble floor. */
  readonly clearsLotFloor: boolean;
}

export interface BigTradeIntelligenceVM {
  /** True only when a percentile cut was actually computed over a real window. */
  readonly measured: boolean;
  readonly missingInput: BigTradeMissingInput | null;
  /** The sentence naming that incapacity, or `null` when the window could answer. */
  readonly missingInputNote: string | null;

  readonly windowPrints: number;
  readonly windowVolume: number;

  /** Size at the percentile cut, in the instrument's own units. */
  readonly thresholdSize: number | null;
  readonly thresholdPercentile: number;
  /** The chart's absolute bubble floor for this price magnitude. */
  readonly lotFloor: number;
  /** How many prints cleared that absolute floor — the OTHER basis, unblended. */
  readonly lotFloorCount: number;
  /** Names the disagreement between the two bases, or `null` when they agree. */
  readonly basisDivergenceNote: string | null;
  readonly percentileBasisNote: string;

  readonly largePrints: readonly LargePrint[];
  /** How many prints cleared the percentile, before `MAX_LARGE_PRINTS` truncation. */
  readonly largeCount: number;
  readonly largeVolume: number;
  /** Large volume ÷ window volume. `null` when the window traded nothing. */
  readonly largeShareOfVolume: number | null;

  readonly largeBuyVolume: number;
  readonly largeSellVolume: number;
  /** Large prints that stated no side at all. The reason `largeNet` can be null. */
  readonly largeUnsidedCount: number;
  /** `null` unless EVERY large print carried a side. See the header. */
  readonly largeNet: number | null;

  readonly provenance: AggressorProvenance;
  readonly provenanceNote: string;
}

export interface BigTradeIntelligenceOptions {
  /**
   * Price magnitude for the absolute floor. Defaults to the last valid print's
   * price, which is what `minBigTradeLot` is keyed on everywhere else.
   */
  readonly base?: number;
  readonly percentile?: number;
  readonly maxRows?: number;
  readonly minPrints?: number;
}

const MISSING_NOTE: Readonly<Record<BigTradeMissingInput, string>> = {
  NO_TAPE:
    "this feed carries no per-trade tape — there are no prints to rank, so no print can be called large",
  TOO_FEW_PRINTS:
    "too few prints in this window to rank one against the others — a percentile of a handful "
    + "is the largest print wearing a statistic's clothes, so none is computed",
};

const PROVENANCE_NOTE: Readonly<Record<AggressorProvenance, string>> = {
  PROVIDER: "every side below was asserted by the venue",
  INFERRED:
    "every side below was RECONSTRUCTED by heuristic (tick rule) — directionally useful, not ground truth",
  MIXED:
    "some sides were asserted by the venue and some reconstructed by heuristic — "
    + "no single method backs the net figure",
  UNDISCLOSED: "this tape did not state how it knows which side was the aggressor",
};

function provenanceOf(method: AggressorMethod | undefined): AggressorProvenance {
  if (method === "PROVIDER" || method === "MAKER_SIDE_INVERTED") return "PROVIDER";
  if (method === "TICK_RULE" || method === "QUOTE_TEST") return "INFERRED";
  return "UNDISCLOSED";
}

interface CleanPrint {
  readonly time: number | null;
  readonly price: number;
  readonly size: number;
  readonly side: "buy" | "sell" | null;
  readonly method: AggressorMethod | undefined;
}

/**
 * Nearest-rank percentile over an ascending array.
 *
 * Nearest-rank rather than interpolated on purpose: the threshold is compared
 * against real print sizes, and an interpolated cut is a size that never
 * traded. Every number this view prints should be one the tape produced.
 */
function nearestRank(ascending: readonly number[], p: number): number {
  const idx = Math.min(ascending.length - 1, Math.max(0, Math.ceil(p * ascending.length) - 1));
  return ascending[idx];
}

export function selectBigTradeIntelligence(
  prints: readonly BigTradePrint[] | null | undefined,
  options: BigTradeIntelligenceOptions = {},
): BigTradeIntelligenceVM {
  const percentile = options.percentile ?? LARGE_PRINT_PERCENTILE;
  const maxRows = options.maxRows ?? MAX_LARGE_PRINTS;
  const minPrints = options.minPrints ?? MIN_PRINTS_FOR_PERCENTILE;

  const clean: CleanPrint[] = [];
  if (Array.isArray(prints)) {
    for (const p of prints) {
      if (!p || p.trade !== true) continue;
      const price = Number(p.price);
      const size = Number(p.size);
      if (!Number.isFinite(price) || price <= 0) continue;
      if (!Number.isFinite(size) || size <= 0) continue;
      const t = Number(p.time);
      clean.push({
        time: Number.isFinite(t) && t > 0 ? t : null,
        price,
        size,
        // An absent or unrecognised side is not a sell. It is an absent side.
        side: p.side === "buy" || p.side === "sell" ? p.side : null,
        method: p.marketEvent?.aggressorMethod,
      });
    }
  }

  const windowVolume = clean.reduce((s, p) => s + p.size, 0);
  // Keyed on the LAST print rather than the first: `minBigTradeLot` buckets by
  // price magnitude, and the newest price is the one the trader is looking at.
  const base = options.base ?? (clean.length > 0 ? clean[clean.length - 1].price : 0);
  const lotFloor = minBigTradeLot(base);
  const lotFloorCount = clean.filter((p) => p.size >= lotFloor).length;

  const percentileBasisNote =
    `LARGE = top ${Math.round((1 - percentile) * 100)}% by size WITHIN THIS WINDOW · `
    + `the cut moves with the tape and compares prints to each other, not to any other symbol or session`;

  if (clean.length === 0 || clean.length < minPrints) {
    const missingInput: BigTradeMissingInput = clean.length === 0 ? "NO_TAPE" : "TOO_FEW_PRINTS";
    return {
      measured: false,
      missingInput,
      missingInputNote: MISSING_NOTE[missingInput],
      windowPrints: clean.length,
      windowVolume,
      thresholdSize: null,
      thresholdPercentile: percentile,
      lotFloor,
      lotFloorCount,
      basisDivergenceNote: null,
      percentileBasisNote,
      largePrints: [],
      largeCount: 0,
      largeVolume: 0,
      largeShareOfVolume: null,
      largeBuyVolume: 0,
      largeSellVolume: 0,
      largeUnsidedCount: 0,
      largeNet: null,
      provenance: "UNDISCLOSED",
      provenanceNote: PROVENANCE_NOTE.UNDISCLOSED,
    };
  }

  const ascending = clean.map((p) => p.size).sort((a, z) => a - z);
  const thresholdSize = nearestRank(ascending, percentile);

  // `sizePercentile` counts prints STRICTLY smaller, so a tie does not let one
  // of two identical prints claim a higher rank than the other.
  const rankOf = (size: number): number => {
    let below = 0;
    for (const s of ascending) {
      if (s < size) below++;
      else break; // ascending — nothing further can be smaller
    }
    return below / ascending.length;
  };

  const qualifying = clean.filter((p) => p.size >= thresholdSize);

  let largeBuyVolume = 0;
  let largeSellVolume = 0;
  let largeUnsidedCount = 0;
  let sawProvider = false;
  let sawInferred = false;
  let sawUndisclosed = false;

  for (const p of qualifying) {
    if (p.side === "buy") largeBuyVolume += p.size;
    else if (p.side === "sell") largeSellVolume += p.size;
    else {
      largeUnsidedCount++;
      sawUndisclosed = true;
      continue;
    }
    const prov = provenanceOf(p.method);
    if (prov === "PROVIDER") sawProvider = true;
    else if (prov === "INFERRED") sawInferred = true;
    else sawUndisclosed = true;
  }

  // Weakest-link, matching selectAggressorFlow: "mostly from the venue" is not
  // a claim the weakest print supports.
  const kinds = (sawProvider ? 1 : 0) + (sawInferred ? 1 : 0) + (sawUndisclosed ? 1 : 0);
  const provenance: AggressorProvenance =
    kinds === 0 ? "UNDISCLOSED"
    : kinds > 1 ? "MIXED"
    : sawProvider ? "PROVIDER"
    : sawInferred ? "INFERRED"
    : "UNDISCLOSED";

  const largeVolume = qualifying.reduce((s, p) => s + p.size, 0);

  // Heaviest first; ties break on time ascending so identical input always
  // yields identical rows — a reordering would read as new prints arriving.
  const largePrints: LargePrint[] = qualifying
    .slice()
    .sort((a, z) => z.size - a.size || (a.time ?? 0) - (z.time ?? 0))
    .slice(0, maxRows)
    .map((p) => ({
      time: p.time,
      price: p.price,
      size: p.size,
      side: p.side,
      sizePercentile: rankOf(p.size),
      clearsLotFloor: p.size >= lotFloor,
    }));

  const basisDivergenceNote =
    lotFloorCount === qualifying.length
      ? null
      : lotFloorCount > qualifying.length
        ? `${lotFloorCount} prints clear the chart's absolute floor of ${lotFloor} but only `
          + `${qualifying.length} stand out against this window — a busy tape where large is common`
        : `only ${lotFloorCount} prints clear the chart's absolute floor of ${lotFloor}, yet `
          + `${qualifying.length} stand out against this window — a quiet tape where the biggest `
          + `prints are still small in absolute terms`;

  return {
    measured: true,
    missingInput: null,
    missingInputNote: null,
    windowPrints: clean.length,
    windowVolume,
    thresholdSize,
    thresholdPercentile: percentile,
    lotFloor,
    lotFloorCount,
    basisDivergenceNote,
    percentileBasisNote,
    largePrints,
    largeCount: qualifying.length,
    largeVolume,
    largeShareOfVolume: windowVolume > 0 ? largeVolume / windowVolume : null,
    largeBuyVolume,
    largeSellVolume,
    largeUnsidedCount,
    // A net over the sided subset would read as "big money is buying" even when
    // the largest print of the window carried no side at all.
    largeNet: largeUnsidedCount === 0 ? largeBuyVolume - largeSellVolume : null,
    provenance,
    provenanceNote: PROVENANCE_NOTE[provenance],
  };
}
