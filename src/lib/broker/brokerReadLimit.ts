/**
 * The ceiling on the owner's tastytrade READ routes (ATHOS P0.1, 2026-10-06):
 * 240 requests a minute per user per route — four a second. Normal use (a
 * stream connect, chain reads on a symbol switch, panel polls) sits far below
 * it; a client loop firing at frame rate is refused with 429 instead of
 * hammering the broker session. Order routes are not governed here.
 */
export const TASTY_READ_LIMIT = { max: 240, windowMs: 60_000 } as const;
