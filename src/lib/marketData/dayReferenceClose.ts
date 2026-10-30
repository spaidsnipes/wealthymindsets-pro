/**
 * ONE OWNER FOR THE REFERENCE CLOSE (2026-10-25).
 *
 * MEASURED in the Founder's recording (BTC 5m, 2026-10-24 ~18:58 CDT, header
 * read frame by frame): the change cell flipped
 *   80739.71 −339.92 (−0.42%)  → reference 81079.63
 *   80860.01 −316.60 (−0.39%)  → reference 81176.61
 *   80739.71 −436.90 (−0.54%)  → reference 81176.61
 * inside two seconds. Two writers were deciding "the prior close": every REST
 * poll re-seeded it from the vendor's own `price − change` (a ROLLING 24 h
 * basis on crypto, so it moved on every poll) and the tape flush measured from
 * whatever the last poll had left; the poll also printed its own, older price
 * over the live tape's. Each frame was internally consistent and the row as a
 * whole was not.
 *
 * This module is the only place that decides which reference the day change
 * is measured from. Rules:
 *   · EXCHANGE (the exchange's own Summary prevDayClosePrice) outranks VENDOR
 *     (a REST quote's price − change) and is never replaced by it.
 *   · A newer EXCHANGE offer replaces an older one (a day roll).
 *   · A VENDOR reference is HELD for VENDOR_REFERENCE_HOLD_MS. A rolling-basis
 *     vendor re-anchors at most once per hold window instead of every poll;
 *     a fixed-basis vendor (yesterday's close) offers the same number anyway.
 *   · Anything non-finite or ≤ 0 is not a reference and changes nothing.
 *
 * Pure, so the rules are tested here and the hook only routes offers to it.
 */

export type ReferenceRank = "EXCHANGE" | "VENDOR";

export interface HeldReference {
  readonly value: number;
  readonly rank: ReferenceRank;
  readonly adoptedAtMs: number;
}

export interface ReferenceOffer {
  readonly value: number;
  readonly rank: ReferenceRank;
  readonly atMs: number;
}

/** How long a vendor reference is held before a vendor offer may replace it. */
export const VENDOR_REFERENCE_HOLD_MS = 15 * 60_000;

/**
 * While a live trade tape has printed within this window, a polled REST quote
 * may not print its price in the header (it is older than the tape, and the
 * two alternating is the flicker). The poll still offers its reference.
 */
export const TAPE_OUTRANKS_QUOTE_MS = 15_000;

const RANK_ORDER: Record<ReferenceRank, number> = { VENDOR: 1, EXCHANGE: 2 };

export function adoptReferenceClose(held: HeldReference | null, offer: ReferenceOffer): HeldReference | null {
  if (!Number.isFinite(offer.value) || !(offer.value > 0)) return held;
  const fresh: HeldReference = { value: offer.value, rank: offer.rank, adoptedAtMs: offer.atMs };
  if (!held) return fresh;
  const a = RANK_ORDER[offer.rank], b = RANK_ORDER[held.rank];
  if (a > b) return fresh;
  if (a < b) return held;
  if (offer.value === held.value) return held;
  if (offer.rank === "EXCHANGE") return fresh;
  return offer.atMs - held.adoptedAtMs >= VENDOR_REFERENCE_HOLD_MS ? fresh : held;
}

/** The day change measured from the held reference, or null when none is held. */
export function changeFromReference(price: number, held: HeldReference | null): { change: number; changePct: number } | null {
  if (!held || !(held.value > 0) || !Number.isFinite(price) || !(price > 0)) return null;
  return {
    change: +(price - held.value).toFixed(8),
    changePct: +((price - held.value) / held.value * 100).toFixed(2),
  };
}

/** True while a live trade tape is newer than any polled quote may claim to be. */
export function tapeOutranksQuote(tapeHeardAtMs: number | null, nowMs: number): boolean {
  return tapeHeardAtMs != null && tapeHeardAtMs > 0 && nowMs - tapeHeardAtMs < TAPE_OUTRANKS_QUOTE_MS;
}
