# WM PRO — SF-D01 REFUSAL REACHABILITY — 2026-09-07

CLAIM_CLASS: **BURST / PARTIAL_SHIFT**
DURATION: **NOT MEASURED** — no reliable observed wall-clock start was
recorded for this window. Per the ELAPSED-TIME TRUTH / ANTI-FABRICATION
EXECUTION LOCK (2026-08-30), scope completion does not imply elapsed time and
no duration is claimed here. Two atoms closed; that is the honest unit.

SCOPE_COMPLETE: yes, for the two atoms named below.
DURATION_REQUIREMENT_MET: **not asserted.**

## Canon preflight (authority-complete, archive-light)

Read this window, newest first:

- `ATH Universal Product Doctrine — Resilience, Studio, KISS & Jeet Kune Do`
  (Drive, modified 2026-09-07 13:51) — including the ELAPSED-TIME TRUTH lock,
  BREAKTHROUGH GATE, UNIVERSAL SHIFT EXECUTION LOOP, DUAL-PROOF CONTRACT,
  FOUNDER-VISIBLE CONVERGENCE LAW.
- `00 — Above the Hill Canon — Master Index & Source of Truth` (front-door /
  authority graph only).

Not reread: the remaining historical volumes. Per the doctrine's own rule —
READ ENOUGH TO EXECUTE CORRECTLY; DO NOT READ SO MUCH THAT READING BECOMES
THE WORK.

## Human job

A trader glances at /charts to answer one question: *what is this worth right
now, and can I trust that number?*

## Atom 1 — `61dc1ab` watchlist: a refused quote stops borrowing a delay's vocabulary

BEFORE (measured): four futures rows read `NQ1! ACTIVE DEGRADED 29565.25
+0.00%`. The `+0.00%` was not a quiet market — `/api/yahoo` returned
`price === prevClose`, so the change computed `prevClose − prevClose = 0` and
reported it as OBSERVED, with two decimals of false precision.

ROOT CAUSE: three separate `/api/yahoo?type=quote` branches, zero of them
consulting the SF-D01 gate. The observation envelope was in the response and
simply never asked.

FIX: all three branches route through `yahooQuoteRefusal` (existing owner —
no second copy). On refusal, RETRACT the price to 0 so the ~15 existing
`price > 0` consumers degrade into the honest path they already own. Refused
rows are skipped when writing `SEED_PRICES` and the mount cache, so WM cannot
re-serve the number it just declined, laundered of the refusal.

SECOND DEFECT, found only by driving the running app: the refusal copy was
**dead**. Retraction zeroes the price, and the block holding `—` /
`not certified` was gated on `item.price > 0`, so every refused row fell
through to the `quote pending` placeholder — a delay's words on a decision,
the exact §8 failure the change exists to remove.

AFTER (measured, `/api/yahoo` forced to `resolution: UNKNOWN` at the network
edge): rows render `DATA UNAVAILABLE — not certified`; hover reads
`not certified — Session boundary: no trade observed since the prior close.
This is not a delay; a provider answered and WM declined the answer.`

## Atom 2 — `23b2f60` stock info: zero is not a price, and it has no colour

This defect was introduced BY atom 1's lineage, not found by it. Once
`useWebSocket` began retracting to 0, `StockInfoPanel`'s unconditional
`ticker.price.toFixed(3)` rendered `0.000` — painted green or red by `up`,
asserting a direction the number does not have.

A retraction is only honest if EVERY consumer of the retracted field degrades
with it. Also removed: `j.price > 0` authorising the OHLC session facts, when
under SF-D01 a refused quote's `price` silently falls back to prevClose — a
refused number granting itself permission.

AFTER (measured at `/charts?symbol=NQ1!` against a REAL, unforced provider
refusal): headline renders `—` in `#8B8FA8`, hover reads `No price to show. A
provider answered and WM declined the answer: No live traded price in the
pre/post-aware intraday session.` BTC happy path unchanged in the same panel
(`79000.600`, red, down).

## Compounding dividend — what got easier to verify

The Sentinel discipline moved one level up, twice:

1. **Counting cannot see WHICH branch a gate belongs to.** A mutation proved
   `gateCalls.length >= yahooCalls.length` false-green: deleting the futures
   gate outright still left 3 gates against 3 calls, so `3 >= 3` passed.
   Replaced with per-branch binding by POSITION, plus an ordering clause (a
   branch may not spend the price before asking whether WM accepted it).

2. **Asserting a string EXISTS proves nothing about whether a user can ever
   see it.** Both "refused row renders correctly" assertions passed while the
   strings were unreachable. Added a REACHABILITY Sentinel that asserts the
   admitting gate, not the copy.

Every Sentinel added this window was mutation-verified: the invariant was
broken in real source, the test was confirmed to die, the source restored.

## Engineering proof

- `tsc --noEmit --skipLibCheck` — clean, both atoms.
- `vitest run` — 5015/5015 then 5018/5018, full suite.
- `next build` — clean, both atoms.
- `UNGATED_DEBT` ratchet: 3 entries → 2.

## Experience proof

Driven in the running dev app via Claude Preview: forced `UNKNOWN` at the
network edge, observed the refusal render; forced `RESOLVED`, observed
refusals clear to zero and prices return — **the state is not sticky**;
restored natural conditions and observed the real provider begin refusing
futures on its own, with the tape reading `NQ1! not certified`,
`ES1! not certified`, `RTY1! not certified` unforced.

`preview_screenshot` was unavailable for this entire window, so every visual
claim above is a DOM/computed-style measurement, not a viewed image. Stated
plainly per the TOOL-TRUTH RULE.

## Remaining debt / named next edges

1. `UNGATED_DEBT` still holds `app/paper/page.tsx` and
   `components/chart/MainChart.tsx` (its own `spotFetch`).
2. **`.wm-chart-watchlist` is `display:none` at both 375px and 768px** —
   measured. The watchlist is desktop-only, so a trader on phone or tablet
   has no watchlist on /charts at all. Not a regression from this work, but
   it directly contradicts the mobile-primary standard and is now named.
3. `canonicalMarketStateStore` coverage/UI-adoption gap (P00290) — coverage
   channels register only via the WebSocket per-trade path; REST quote
   pipelines never register one.
4. Pre-existing and untouched: Supabase Site URL + redirect allowlist;
   Cloudflare Error 1027 Workers-plan upgrade (Founder-only); transient
   cold-mount infinite-render burst in MainLayout providers.

## Repo state

- Start: `7a4f47f`
- End: `23b2f60` (pushed to `origin/main`)
- Commits: `61dc1ab`, `23b2f60`
- No Supabase migration applied. No secret rotated. No destructive git op.
- Still uncommitted and deliberately untouched: the modified
  `WM-PRO-EVENING-2026-09-03.md`, five untracked baton files, `scratchpad/`.

MISSION STATUS: **ACTIVE / CONTINUATION AVAILABLE** — next edge is item 1 or
item 2 above.
