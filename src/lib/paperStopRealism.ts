/**
 * THE STOP THAT WAS A GUARANTEE.
 *
 * ── THE MEASURED GAP ──────────────────────────────────────────────────
 * A stop is the one order a trader places to be PROTECTED by. It is the whole
 * arithmetic of position sizing: "I am risking the distance to my stop." That
 * sentence is true only if the stop is a floor. On /paper it always is. At a
 * real venue it never was.
 *
 * Two mechanisms in this codebase make it a floor, and neither is visible.
 *
 *   1. `selectOrderFill` records THE OBSERVED PRICE for every order type:
 *
 *        const triggered = buy ? px >= stop : px <= stop;
 *        case "stop": fills = triggered; break;
 *        return { fillPx: px, ... };
 *
 *      So the price that TRIGGERED the stop is also the price it FILLED at.
 *      At a real venue a triggered stop becomes a MARKET order and fills at
 *      whatever comes next. Across a gap — an earnings print, a halt reopen,
 *      a Sunday future — "whatever comes next" can be far past the level.
 *
 *   2. `selectFillQueueBasis` returns `"unconditioned"` for `type:"stop"`, and
 *      `describeFillQueueBasis` says nothing about it. That is correct for what
 *      that module owns — a stop has no limit level, so the touch/through
 *      question genuinely does not apply to it. The consequence is that a plain
 *      stop is the ONE order type on /paper that carries no fill caveat at all.
 *
 * The universal assumptions in `paperExecutionRealism` do not close this
 * either. `no-spread` names a constant edge of one spread. `unbounded-size`
 * names depth. Neither names GAP RISK, which is unbounded and which is the
 * only risk a stop exists to be exposed to.
 *
 * ── AND /paper NEVER SAW THE PRINTS BETWEEN ───────────────────────────
 * The trigger is evaluated inside a quote-tick effect. /paper learns a price
 * when it POLLS one; it does not read a tape. So every stop here triggered
 * against a SAMPLE, not against the print that actually crossed the level.
 *
 * ── DERIVED, NOT INVENTED ─────────────────────────────────────────────
 * `stopPx` and `fillPx` are both already on the persisted order. The distance
 * between them is therefore MEASURED, not modelled, and a stop booked long
 * before this file existed is described by exactly the same rule as one booked
 * today. Nothing is stored and no new field is required.
 *
 * What that measured distance means is stated precisely and narrowly: it is
 * what the POLLING CADENCE alone cost. A real venue adds queue and depth on
 * top of it. It is a FLOOR on the real number and is never presented as the
 * real number.
 *
 * ── LABEL, NOT MODEL ──────────────────────────────────────────────────
 * Nothing here estimates a gap, a slippage distribution or a fill probability.
 * No stop is refused, no status is written, and `Math.random` appears nowhere.
 * Minting a plausible gap would be the defect wearing the costume of the cure.
 *
 * ── AND NOT WALLPAPER ─────────────────────────────────────────────────
 * Silent until a stop has actually FILLED. Before that there is no protection
 * to caveat.
 */

/** The order fields this disclosure is allowed to read. Nothing else matters. */
export interface StopRealismInput {
  readonly status: string;
  /** "market" | "limit" | "stop" | "stop-limit" — may be absent on old books. */
  readonly type?: string;
  readonly side?: string;
  readonly stopPx?: number;
  readonly fillPx?: number;
}

export interface StopRealism {
  /** Filled orders whose type is readable AND stop-triggered. */
  readonly stopFilledCount: number;
  /** Of those, how many carried both a readable `stopPx` and `fillPx`. */
  readonly measuredCount: number;
  /**
   * The worst distance past the level, in price units, or null when nothing
   * was measurable. Zero means every measured stop filled exactly at its level.
   */
  readonly worstSlipPx: number | null;
  readonly heading: string | null;
  readonly sentences: readonly string[];
}

const NONE: StopRealism = {
  stopFilledCount: 0, measuredCount: 0, worstSlipPx: null, heading: null, sentences: [],
};

const GAP_SENTENCE =
  "A stop here fills at the same price that triggered it, so the distance to " +
  "your stop was exactly your loss. At a real venue a triggered stop becomes a " +
  "MARKET order and fills at whatever comes next — across a gap that can be far " +
  "past your level. A real stop is a trigger, not a floor.";

const SAMPLE_SENTENCE =
  "/paper also learns a price only when it polls a quote; it never reads the " +
  "prints in between. Every stop here triggered against a SAMPLE, not against " +
  "the print that actually crossed your level.";

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** True only for order types whose fill is gated by a stop level. */
function isStopType(type: unknown): boolean {
  return type === "stop" || type === "stop-limit";
}

/**
 * How far past the level this fill printed, in price units.
 *
 * Positive is AGAINST the trader: a buy stop that filled above its level paid
 * more, a sell stop that filled below its level received less. Negative is
 * price improvement and is clamped to 0 — reporting "your worst slip was
 * -0.02" would be a nonsense worst case.
 *
 * Returns null when either price is unreadable. H1: absence is not zero. An
 * order whose `stopPx` nobody recorded has no measurable distance, and
 * inventing 0 for it would mint a claim that the stop filled perfectly.
 */
export function selectStopSlipPx(order: StopRealismInput | null | undefined): number | null {
  if (!order || order.status !== "filled" || !isStopType(order.type)) return null;
  const stop = num(order.stopPx);
  const fill = num(order.fillPx);
  if (stop === null || fill === null) return null;
  // An unreadable side cannot be signed, and guessing a direction would invent
  // whether the trader was helped or hurt.
  if (order.side !== "buy" && order.side !== "sell") return null;
  const signed = order.side === "buy" ? fill - stop : stop - fill;
  return signed > 0 ? signed : 0;
}

/**
 * Render a price distance without ever rounding a real one away.
 *
 * Two decimals is what a stock trader reads. But a sub-cent slip on a cheap
 * instrument would round to "0.00", and "0.00 past its level" says the fill was
 * PERFECT — the exact opposite of what was measured. So the width follows the
 * NUMBER, not a price threshold: widen only when the short form would erase a
 * nonzero distance. A true zero still prints "0.00", because it is one.
 */
function fmtPx(n: number): string {
  const short = n.toFixed(2);
  if (n > 0 && Number(short) === 0) return n.toFixed(6).replace(/0+$/, "");
  return short;
}

/** Pure. Reads `status`, `type`, `side`, `stopPx`, `fillPx`. Writes nothing. */
export function selectStopRealism(
  orders: readonly StopRealismInput[] | null | undefined,
): StopRealism {
  if (!orders || orders.length === 0) return NONE;

  let stopFilledCount = 0;
  let measuredCount = 0;
  let worst: number | null = null;

  for (const o of orders) {
    if (o?.status !== "filled" || !isStopType(o.type)) continue;
    stopFilledCount++;
    const slip = selectStopSlipPx(o);
    if (slip === null) continue;
    measuredCount++;
    if (worst === null || slip > worst) worst = slip;
  }

  if (stopFilledCount === 0) return NONE;

  const sentences = [GAP_SENTENCE, SAMPLE_SENTENCE];

  if (worst !== null) {
    sentences.push(
      worst === 0
        ? measuredCount === 1
          ? "Your stop filled EXACTLY at its level. No real venue promises that."
          : `All ${measuredCount} of your measured stops filled EXACTLY at their ` +
            `levels. No real venue promises that.`
        : `Your worst stop here filled ${fmtPx(worst)} past its level. That ` +
          `distance is what /paper's polling gap alone cost you — a real venue ` +
          `adds queue and depth on top of it, so treat it as a FLOOR on the real ` +
          `number, never the real number.`,
    );
  }

  return {
    stopFilledCount,
    measuredCount,
    worstSlipPx: worst,
    heading:
      stopFilledCount === 1
        ? "1 stop protected you more than a real one would have"
        : `${stopFilledCount} stops protected you more than real ones would have`,
    sentences,
  };
}

/**
 * The note for one filled stop order, or null when the row is not one.
 *
 * Reserved for the genuinely surprising case. A note under every row is a note
 * nobody reads.
 */
export function selectStopOrderNote(
  order: StopRealismInput | null | undefined,
): string | null {
  if (!order || order.status !== "filled" || !isStopType(order.type)) return null;
  const slip = selectStopSlipPx(order);
  if (slip === null) {
    return (
      "This stop filled at the price that triggered it. At a real broker a " +
      "triggered stop becomes a market order and fills at whatever comes next."
    );
  }
  if (slip === 0) {
    return (
      "This stop filled EXACTLY at its level — the distance to it was exactly " +
      "your loss. A real stop only promises to TRIGGER there; where it fills " +
      "depends on what the market does next."
    );
  }
  return (
    `This stop filled ${fmtPx(slip)} past its level, which is what /paper's ` +
    `polling gap cost. A real venue adds queue and depth on top of that, so the ` +
    `real distance would have been at least this wide.`
  );
}
