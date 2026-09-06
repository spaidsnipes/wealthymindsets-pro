/**
 * What a chart bubble CLAIMS — Founding Contract §13 "Delta Bubbles level
 * ownership", second half.
 *
 * `deltaBubbleLevels.ts` closed the first half: WHICH PRICE does a bubble own?
 * (Answer: the heaviest real traded tick in its bucket, never the bucket's
 * computed centre.) This module closes the half that was still open: WHAT
 * QUANTITY does the bubble claim, and do the words match the number?
 *
 * THE DEFECT, AS FOUND
 *
 *   MainChart merged both bubble kinds into one array and rendered one
 *   sentence for both:
 *
 *     const bubbles = [...bubblesRef.current, ...deltaBubblesRef.current];
 *     ...
 *     text: `${vstr} ${base > 100 ? "shares" : "vol"} aggressive ` +
 *           `${hit.side === "buy" ? "buy" : "sell"} at ${pstr}`
 *
 *   with a header chip reading AGGRESSIVE BUY / AGGRESSIVE SELL above it. But
 *   `hit.value` is a DIFFERENT QUANTITY in each kind, and neither one is the
 *   thing those words describe:
 *
 *     big-trade   value = ±(bid + ask)   the level's GROSS TWO-SIDED total
 *     delta       value = ±|ask - bid|   the zone's NET
 *
 *   So a big-trade level with 7,000 bought and 5,400 sold rendered
 *   "12,400 shares aggressive buy" — folding the 5,400 that were SOLD into a
 *   number labelled BUY. And a delta zone with 20,000 bought and 7,600 sold
 *   rendered "12,400 shares aggressive buy" as well: same words, same number,
 *   arrived at by subtraction rather than addition, from a completely
 *   different market fact.
 *
 *   Two different truths, one sentence, and the sentence was wrong about both.
 *   §5 SYSTEM TRUTH LAW, and LIVING-PIXEL LAW — the LABEL is part of the pixel.
 *
 *   The in-code comment on that line asserted, in as many words, "this is one
 *   real print's aggressor size". It is not. For a big trade it is a whole
 *   price level's two-sided volume; for a delta bubble it is a net across a
 *   price BUCKET. The comment described a third thing that neither branch did.
 *
 * THE UNIT NOUN
 *
 *   `base > 100 ? "shares" : "vol"` asked a PRICE question and used the answer
 *   for an INSTRUMENT-CLASS one. `base` is `getBase(symbol)` — a price
 *   magnitude. NQ at 21,750 is > 100, so the chart said "shares" about an
 *   instrument that trades in CONTRACTS. So did ES, GC, CL and BTC.
 *
 *   This module prints no unit noun at all. "7,000 bought · 5,400 sold" is
 *   true of shares, contracts and coins alike, and needs no instrument
 *   taxonomy the chart does not have. Saying less is how it stops being wrong:
 *   a missing noun is a gap, an incorrect one is a false claim.
 *
 * WHY A DELTA BUBBLE MAY NOT SAY "AT"
 *
 *   A big trade's price is a real print at an exact tick, so "at 150.01" is
 *   backed. A delta bubble's price is the heaviest tick in a bucket that spans
 *   a range — an ANCHOR for where to draw it, not the place all that volume
 *   happened. It says "in this zone" and names the anchor separately.
 *
 * Pure: no DOM, no React, no globals, so the shipped sentence is the tested
 * sentence — not a re-typed copy of it.
 *
 * Aggressor convention is codebase-wide: ask = buyer-initiated ("buy"),
 * bid = seller-initiated ("sell"), delta = ask - bid.
 */

export type BubbleKind = "big-trade" | "delta";

export interface BubbleClaimInput {
  kind: BubbleKind;
  /** Seller-initiated volume (hit the bid) in this level or zone. */
  bid: number;
  /** Buyer-initiated volume (lifted the ask) in this level or zone. */
  ask: number;
  /** The real traded price this bubble owns. See deltaBubbleLevels.ts. */
  price: number;
}

export interface BubbleClaim {
  side: "buy" | "sell";
  /**
   * The header chip. A delta bubble says NET, because its number is one.
   * Never labels a two-sided total with a one-sided word.
   */
  heading: string;
  /** The headline number, signed and formatted. Describes exactly `heading`. */
  headline: string;
  /** The two-sided breakdown the headline was derived from. */
  detail: string;
  /**
   * The signed magnitude behind `headline`, for callers that need the number
   * rather than the string (colour, sort, tests).
   */
  value: number;
}

/**
 * The ONE aggressor-side rule, for both bubble kinds.
 *
 * MainChart derives `side` twice at spawn — `lv.ask >= lv.bid` for big trades
 * and `lv.delta >= 0` for delta zones. Since delta is `ask - bid`, those are
 * the same predicate written two ways, and this is it written once. Exported
 * so the equivalence is a test rather than a coincidence.
 */
export function aggressorSide(bid: number, ask: number): "buy" | "sell" {
  return ask >= bid ? "buy" : "sell";
}

/**
 * Volume magnitudes, in the chart's existing M/k house style.
 *
 * Sub-1 values keep real precision: crypto zones are legitimately 0.0431 BTC
 * and rounding those to "0" would erase the evidence the bubble exists to show.
 */
export function formatBubbleVolume(v: number): string {
  const a = Math.abs(v);
  if (!Number.isFinite(a)) return "—";
  if (a >= 1_000_000) return `${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${(a / 1_000).toFixed(1)}k`;
  if (a >= 1) return Math.round(a).toLocaleString("en-US");
  if (a > 0) return a.toFixed(a >= 0.1 ? 2 : 4);
  return "0";
}

/**
 * The headline number, at FULL precision.
 *
 * Deliberately not `formatBubbleVolume`. The headline is the hero figure in
 * 18px bold, and the tooltip has always rendered it exactly — abbreviating
 * 12,400 to "12.4k" there would be a silent precision loss dressed up as a
 * truth fix, which is its own kind of overclaim. The compact M/k form belongs
 * on the detail line, where two numbers sit side by side in 9.5px.
 */
export function formatBubbleExact(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  return a >= 1
    ? a.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : a.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

/** Price display precision, by magnitude. Matches the chart's axis convention. */
export function formatBubblePrice(p: number): string {
  if (!Number.isFinite(p)) return "—";
  if (p >= 10_000) return Math.round(p).toLocaleString("en-US");
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

const clean = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Describe one bubble in words its own number can back.
 *
 * Returns `null` when there is no aggressor volume at all: a bubble with
 * nothing behind it has nothing honest to say, and the caller renders no
 * tooltip rather than a confident "0".
 */
export function describeBubbleClaim(input: BubbleClaimInput): BubbleClaim | null {
  const bid = clean(input.bid);
  const ask = clean(input.ask);
  if (bid + ask <= 0) return null;

  const side = aggressorSide(bid, ask);
  const bought = formatBubbleVolume(ask);
  const sold = formatBubbleVolume(bid);
  const price = formatBubblePrice(input.price);

  if (input.kind === "delta") {
    // The NET, which is what a delta bubble's size and colour encode. Naming
    // it "net" is the whole point: 12.4k net buy out of 20.0k bought and 7.6k
    // sold is a different market fact from 12.4k bought, and a trader reading
    // absorption needs to be able to tell them apart.
    const net = ask - bid;
    return {
      side,
      heading: side === "buy" ? "NET BUY PRESSURE" : "NET SELL PRESSURE",
      headline: `${net >= 0 ? "+" : "−"}${formatBubbleExact(net)}`,
      // "in this zone", never "at": the price is the bucket's heaviest tick,
      // an anchor for drawing, not the place this volume happened.
      detail: `${bought} bought · ${sold} sold in this zone — heaviest tick ${price}`,
      value: net,
    };
  }

  // A big trade is a real print at an exact tick, so "at <price>" is backed.
  // The headline is the DOMINANT side's own volume — not the level's
  // two-sided total, which is what used to sit under the word BUY.
  const dominant = side === "buy" ? ask : bid;
  return {
    side,
    heading: side === "buy" ? "AGGRESSIVE BUY" : "AGGRESSIVE SELL",
    headline: `${side === "buy" ? "+" : "−"}${formatBubbleExact(dominant)}`,
    detail: `${bought} bought · ${sold} sold at ${price}`,
    value: side === "buy" ? dominant : -dominant,
  };
}
