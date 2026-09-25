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

import type { AggressorMethod } from "@/lib/marketData/marketEvent";

export type BubbleKind = "big-trade" | "delta";

export interface BubbleClaimInput {
  kind: BubbleKind;
  /** Seller-initiated volume (hit the bid) in this level or zone. */
  bid: number;
  /** Buyer-initiated volume (lifted the ask) in this level or zone. */
  ask: number;
  /** The real traded price this bubble owns. See deltaBubbleLevels.ts. */
  price: number;
  /** How the provider established the side on an individual-print bubble. */
  aggressorMethod?: AggressorMethod;
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
 * THE NUMBER A BUBBLE'S SIZE MUST ENCODE — the same one its headline states.
 *
 * ── FOUND FROM USE, 2026-09-18, reading the big-trade path ────────────────
 *
 * This module fixed the WORDS on a bubble and left the PIXELS saying the old
 * thing. `describeBubbleClaim` decided that a big trade's headline is the
 * DOMINANT side's own volume — "not the level's two-sided total, which is what
 * used to sit under the word BUY" — and MainChart adopted that sentence. It
 * kept sizing the disc by `lv.total`, the two-sided total this module had just
 * finished rejecting.
 *
 * So one bubble, at one instant, made two different magnitude claims: the
 * tooltip said one number and the area drew another. Canon Weakness #1, inside
 * a single glyph.
 *
 * It is not merely a scale offset. It INVERTS the ranking of the very figure
 * it prints, which is measurable in two levels on one bar:
 *
 *   A   ask 10,000  bid      0   headline +10,000   total 10,000
 *   B   ask  6,000  bid  5,000   headline  +6,000   total 11,000
 *
 * B painted the LARGER disc while printing the SMALLER number. A trader
 * scanning size — which is the entire reason bubbles exist rather than a table
 * — read the two-sided churn of B as the louder event, and had to open a
 * tooltip to find out the picture was backwards.
 *
 * The delta path was already correct by coincidence (|ask − bid| is both its
 * size input and its claim), and a coincidence is not a guarantee. Both sizing
 * call sites now ask HERE, and the test proves this function agrees with
 * `describeBubbleClaim` for every kind rather than re-typing its rule.
 *
 * Returns a MAGNITUDE, never signed: a radius has no direction. Side is
 * `aggressorSide`'s answer and colour's job.
 */
export function bubbleClaimMagnitude(kind: BubbleKind, bid: number, ask: number): number {
  const b = clean(bid);
  const a = clean(ask);
  // delta: the NET, which is what the zone's headline and colour both encode.
  // big-trade: the dominant side's own volume, exactly as the headline reads.
  return kind === "delta" ? Math.abs(a - b) : Math.max(a, b);
}

/**
 * H-701B · "Big-trade size is relational to session/evidence, not decorative."
 * Where one bubble stands among the retained bubbles of its own kind on this
 * chart: its rank by claimed magnitude (1 = largest; ties share the better
 * rank), how many there are, and their median. Pure; the magnitudes come from
 * `bubbleClaimMagnitude`, so the relation ranks exactly what the headline says.
 */
export function bubbleRelation(sameKind: readonly number[], magnitude: number): { rank: number; of: number; median: number } | null {
  const xs = sameKind.filter(v => Number.isFinite(v) && v > 0);
  if (!xs.length || !(magnitude > 0)) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { rank: 1 + xs.filter(v => v > magnitude).length, of: xs.length, median };
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

/**
 * The execution's clock time, in the zone and clock the chart's own time axis
 * uses (`displayTimeZone` / `clock24h`).
 *
 * A print inscription sits directly above that axis. Written in UTC it stated
 * a different hour than the axis under it — 14:31:05 over a 10:31 tick for a
 * New York viewer — on the one object whose job is to say exactly when the
 * print happened. When the zone cannot be formatted the fallback is UTC and
 * SAYS so, never an unlabelled UTC time.
 *
 * Formatters are cached per (zone, clock): the inscription is painted every
 * animation frame and constructing an Intl.DateTimeFormat is not free.
 */
const clockFormatters = new Map<string, Intl.DateTimeFormat>();
export function formatBubbleClock(sec: number, timeZone: string, clock24h: boolean): string {
  if (!Number.isFinite(sec)) return "—";
  const d = new Date(sec * 1000);
  const key = `${timeZone}|${clock24h ? 24 : 12}`;
  try {
    let f = clockFormatters.get(key);
    if (!f) {
      f = new Intl.DateTimeFormat("en-US", {
        timeZone, hourCycle: clock24h ? "h23" : "h12",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
      clockFormatters.set(key, f);
    }
    return f.format(d);
  } catch {
    return `${d.toISOString().slice(11, 19)} UTC`;
  }
}

const clean = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);

export function describeAggressorMethod(method: AggressorMethod | undefined): string {
  if (method === "PROVIDER") return "aggressor provenance: provider-stamped";
  if (method === "MAKER_SIDE_INVERTED") {
    return "aggressor provenance: provider maker-side inversion";
  }
  if (method === "TICK_RULE" || method === "QUOTE_TEST") {
    return `aggressor provenance: inferred by ${method === "TICK_RULE" ? "tick rule" : "quote test"}`;
  }
  return "aggressor provenance: undisclosed";
}

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
  const provenance = describeAggressorMethod(input.aggressorMethod);
  return {
    side,
    heading:
      input.aggressorMethod === "TICK_RULE" || input.aggressorMethod === "QUOTE_TEST"
        ? side === "buy" ? "INFERRED BUY PRINT" : "INFERRED SELL PRINT"
        : side === "buy" ? "AGGRESSIVE BUY" : "AGGRESSIVE SELL",
    headline: `${side === "buy" ? "+" : "−"}${formatBubbleExact(dominant)}`,
    detail: `${bought} bought · ${sold} sold at ${price} · ${provenance}`,
    value: side === "buy" ? dominant : -dominant,
  };
}
