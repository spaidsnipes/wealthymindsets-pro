/**
 * The MARKET cell's price line — ONE owner for a three-state truth.
 *
 * Observed live on /charts, one viewport, one instrument, one moment:
 *
 *   chart header :  7,622.25  HISTORICAL BARS VERIFIED
 *   MARKET tile  :  ES1! · 1h · PRICE UNKNOWN
 *
 * Neither statement was false. The tile was right that no live trade print
 * existed with the cash session closed; the header was right that the last
 * loaded candle closed at 7,622.25. But the trader had to reconcile two
 * owners in their head, which is SCENE_FRAGMENTATION in the truth dimension.
 *
 * The repair is NOT to relax `price.last`. It is to give the second fact its
 * own sentence, with its own provenance word, and to keep PRICE UNKNOWN for
 * the case where we genuinely know nothing. Three states, never two:
 *
 *   PRINT      — a live trade printed, and canonical state holds the tick.
 *   BAR_CLOSE  — no print, but a loaded bar closed here. Say so, out loud.
 *   NONE       — no price evidence of any kind. PRICE UNKNOWN is the truth.
 *
 * Kept pure and separate from the component so the label cannot drift on one
 * surface and not another, and so it is testable without a DOM.
 */
export type SpinePriceProvenance = "PRINT" | "BAR_CLOSE" | "NONE";

export interface SpinePriceDisplay {
  readonly text: string;
  readonly provenance: SpinePriceProvenance;
}

const usable = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

export function formatSpinePrice(
  last: number | null | undefined,
  lastBarClose: number | null | undefined,
  lastBarTimeframe?: string | null,
): SpinePriceDisplay {
  // A print outranks a close. It is the stronger claim and it is the one the
  // trader is actually asking for; the close only speaks when it is silent.
  if (usable(last)) return { text: String(last), provenance: "PRINT" };

  if (usable(lastBarClose)) {
    // The timeframe is part of the fact, not decoration — "closed at 7622.25"
    // means something different on 1m than on 1D. It is appended only when
    // canonical state actually carried one; never invented to look complete.
    const tf = typeof lastBarTimeframe === "string" ? lastBarTimeframe.trim() : "";
    return {
      text: tf
        ? `${lastBarClose} LAST ${tf} BAR CLOSE`
        : `${lastBarClose} LAST BAR CLOSE`,
      provenance: "BAR_CLOSE",
    };
  }

  return { text: "PRICE UNKNOWN", provenance: "NONE" };
}
