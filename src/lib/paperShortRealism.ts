/**
 * THE SHORT THAT NEEDED NO SHARES.
 *
 * ── THE MEASURED GAP ──────────────────────────────────────────────────
 * /paper opens short positions freely. `applyFill` writes a negative quantity
 * with no gate of any kind:
 *
 *   const signedQty = ord.side === "buy" ? ord.qty : -ord.qty;
 *   const cashDelta = -signedQty * fillPx * mult;   // receive to sell
 *
 * and the funding check declines to look at sells at all:
 *
 *   if (side !== "buy") return null;               // selectOrderRejection
 *
 * Read those together and three things are true of every short on /paper, none
 * of which is true of a real one, and none of which is said anywhere:
 *
 *   1. NO LOCATE WAS REQUIRED. A real short sale cannot be entered until the
 *      broker LOCATES borrowable shares. Some names are hard-to-borrow and
 *      carry a daily fee; some cannot be borrowed at all and the order is
 *      simply refused. /paper never asks, so every name is infinitely
 *      shortable here and always free.
 *
 *   2. NO COLLATERAL WAS POSTED. Because `selectOrderRejection` returns null
 *      for every sell, a short is never sized against the account at all — and
 *      the proceeds CREDIT cash, which can then fund a buy. A real short is the
 *      opposite: it consumes margin rather than creating buying power.
 *      Regulation T requires collateral of 150% of the short's value. That is a
 *      published rule, not an estimate — but it is named here only to say what
 *      /paper skipped, never to compute a verdict.
 *
 *   3. NO BUY-IN IS POSSIBLE. A real short can be RECALLED: the lender wants
 *      the shares back, and the position is bought in at the market, without
 *      consent and usually at the worst moment. /paper's short closes when, and
 *      only when, the trader decides.
 *
 * ── WHY THIS IS NOT ALREADY COVERED ───────────────────────────────────
 * `paperExecutionRealism` owns `no-spread` and `unbounded-size` — both about
 * the PRICE a fill got. `paperStopRealism` owns gap risk. This is not about
 * price at all. It is about whether the position could have been ENTERED and
 * whether it could have been HELD, which nothing on this page has ever asked.
 *
 * ── DERIVED, NOT INVENTED ─────────────────────────────────────────────
 * `qty` and `marketPx` are already on every persisted position, so the open
 * short notional is measured and a short opened before this file existed is
 * described by the same rule. Nothing is stored, nothing new is required.
 *
 * ── LABEL, NOT MODEL ──────────────────────────────────────────────────
 * No borrow fee is estimated, no recall probability is invented, and no short
 * is refused. Refusing the trader's short would be a policy they never chose;
 * minting a borrow rate would be a fabricated number wearing the costume of
 * realism. `Math.random` appears nowhere.
 *
 * ── AND NOT WALLPAPER ─────────────────────────────────────────────────
 * Silent until a short is actually open. A long-only book hears nothing.
 */

/** The position fields this disclosure is allowed to read. Nothing else. */
export interface ShortRealismInput {
  readonly symbol?: string;
  /** Negative is short. */
  readonly qty: number;
  readonly marketPx?: number;
}

export interface ShortRealism {
  /** Open positions with a negative quantity. */
  readonly shortCount: number;
  /** Of those, how many carried a readable `marketPx`. */
  readonly valuedCount: number;
  /** Total value of the valued shorts, or null when none could be valued. */
  readonly shortNotional: number | null;
  readonly heading: string | null;
  readonly sentences: readonly string[];
}

const NONE: ShortRealism = {
  shortCount: 0, valuedCount: 0, shortNotional: null, heading: null, sentences: [],
};

const LOCATE_SENTENCE =
  "No locate was required. A real short cannot be entered until your broker " +
  "finds shares to borrow — some names cost a daily fee to hold short, and some " +
  "cannot be borrowed at all, in which case the order is simply refused. Every " +
  "name is infinitely shortable here, and always free.";

const RECALL_SENTENCE =
  "No buy-in is possible. A real short can be RECALLED: the lender wants the " +
  "shares back and the position is closed at the market, without your consent " +
  "and usually at the worst moment. A short here closes when you decide, and " +
  "never before.";

const money = (n: number): string =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Pure. Reads `qty` and `marketPx`. Writes nothing, refuses nothing. */
export function selectShortRealism(
  positions: readonly ShortRealismInput[] | null | undefined,
): ShortRealism {
  if (!positions || positions.length === 0) return NONE;

  let shortCount = 0;
  let valuedCount = 0;
  let notional = 0;

  for (const p of positions) {
    const qty = num(p?.qty);
    if (qty === null || qty >= 0) continue;
    shortCount++;
    const px = num(p?.marketPx);
    // H1: a position whose mark nobody recorded has no measurable value. It
    // still counts — that needs only `qty` — but valuing it at 0 would mint the
    // claim that the trader is short nothing.
    if (px === null || px <= 0) continue;
    valuedCount++;
    notional += Math.abs(qty) * px;
  }

  if (shortCount === 0) return NONE;

  const sentences = [LOCATE_SENTENCE];

  if (valuedCount > 0) {
    sentences.push(
      `No collateral was posted. You are short ${money(notional)} and /paper ` +
      `asked for nothing against it — the sale CREDITED your cash, which can ` +
      `then fund a buy. A real short does the opposite: it consumes margin ` +
      `rather than creating buying power, and Regulation T requires collateral ` +
      `of 150% of the short's value.`,
    );
  } else {
    sentences.push(
      "No collateral was posted. /paper never sizes a short against the " +
      "account — the sale CREDITED your cash, which can then fund a buy. A real " +
      "short does the opposite: it consumes margin rather than creating buying " +
      "power, and Regulation T requires collateral of 150% of its value.",
    );
  }

  sentences.push(RECALL_SENTENCE);

  return {
    shortCount,
    valuedCount,
    shortNotional: valuedCount > 0 ? notional : null,
    heading:
      shortCount === 1
        ? "1 short position was opened with no shares located"
        : `${shortCount} short positions were opened with no shares located`,
    sentences,
  };
}

/**
 * The note for one short position, or null when the row is not one.
 *
 * Reserved for shorts. A note under every row is a note nobody reads.
 */
export function selectShortPositionNote(
  position: ShortRealismInput | null | undefined,
): string | null {
  const qty = num(position?.qty);
  if (qty === null || qty >= 0) return null;
  const px = num(position?.marketPx);
  const shares = Math.abs(qty);
  if (px === null || px <= 0) {
    return (
      "This is a SHORT. /paper located no shares to borrow and posted no " +
      "collateral for it. A real broker must find the shares first, charges you " +
      "to keep them, and can recall them at any time."
    );
  }
  return (
    `This is a SHORT worth ${money(shares * px)}. /paper located no shares to ` +
    `borrow and posted no collateral for it. A real broker must find the shares ` +
    `first, charges you to keep them, and can recall them at any time.`
  );
}
