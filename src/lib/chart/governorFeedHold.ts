/**
 * THE GOVERNOR'S FEED, HELD (P0 2026-11-02, "like a blinking lamp"). The feed reading is graded at render time, so
 * on a quiet tape any re-render (a colour pick is one) could read STALE and dim every governed layer to STALE_DIM,
 * and the next print restored it. The STALE words stay immediate (the chip and strip read the reading directly);
 * the GLASS steps back only after STALE has held for GOVERNOR_STALE_HOLD_MS, and comes back at the first print.
 * PURE.
 */
export type GovernorFeed = "LIVE" | "STALE" | null;
export interface GovernorFeedHold {
  /** When the current unbroken STALE run began (ms), or null. */
  readonly staleSince: number | null;
  /** The last non-STALE reading (what the glass shows during the hold). */
  readonly steady?: "LIVE" | null;
}
export const GOVERNOR_STALE_HOLD_MS = 30_000;

export function holdGovernorFeed(hold: GovernorFeedHold, reading: GovernorFeed, nowMs: number): { readonly hold: GovernorFeedHold; readonly governed: GovernorFeed } {
  if (reading !== "STALE") return { hold: { staleSince: null, steady: reading }, governed: reading };
  const since = hold.staleSince ?? nowMs;
  const next = { staleSince: since, steady: hold.steady ?? null };
  return { hold: next, governed: nowMs - since >= GOVERNOR_STALE_HOLD_MS ? "STALE" : next.steady };
}
