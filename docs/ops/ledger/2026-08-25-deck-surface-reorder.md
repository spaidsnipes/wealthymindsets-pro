# Ledger — Deck Surface Reorder by Job (2026-08-25)

**Session:** Five-Hour Megazord Finish Shift (continuous execution).
**Canon:** BUILD → TEST → BREAK → VERIFY → COMMIT → CONTINUE. Transformation
thesis: "The market stays the same. The interface changes its emphasis around
the human's current job." This atom makes the emphasis *physical*: the lead
surface for the current job rises to the top of the decision column.

## Starting SHA

`c9ea0a9` (job-mode-inference ledger).

## Ending SHA

`afd1a55` (deck surface reorder by job).

## Commit created

**`afd1a55` — Physically reorder decision surfaces by the human's job.**
- `selectDeckEmphasis` already resolved which surface LEADS each job, but the
  deck only used it to open a drawer / ring the WHY panel — the four surfaces
  (STORY / WHY / PASSPORT / RECEIPT) stayed in fixed source order. The emphasis
  was signalled but not embodied.
- Added a pure `order: DeckSurface[]` to `DeckEmphasis` — a full permutation of
  all four surfaces, `lead` first — for every ExperienceMode, plus a total
  `surfaceOrder(emphasis, surface)` helper returning the 0-based rank (a surface
  never in the ranking sorts last so it can never silently vanish above fold).
- Wired into `/command-deck`: the four surfaces are wrapped in their OWN flex
  column and each maps to a CSS `order`, so the job floats its lead surface to
  the top WITHOUT any surface leaving the DOM and without moving the hero,
  context ribbon, or phase selector above/below.
- Presentation-only — no market truth, no data-selection change, every surface
  reachable in every job.
- 2 new deterministic tests (order is a full permutation with `lead === order[0]`;
  `surfaceOrder` yields a contiguous 0-based rank). Experience suite 58/58.

## Subsystems touched

`src/lib/experience/selectDeckEmphasis.ts` (+ `order`, `surfaceOrder`),
`src/lib/experience/selectDeckEmphasis.test.ts` (+2 tests),
`src/app/command-deck/page.tsx` (import `surfaceOrder`; isolate the four
surfaces in a flex wrapper; apply CSS `order` per surface).

## Proof

- `tsc --noEmit --skipLibCheck` — clean.
- `vitest run src/lib/experience` — 58/58 green (6 files).
- `next build` — clean; `/command-deck` compiled.
- Deploy: `npm run deploy:cf` exit 0 — Version ID `87f1b2bb`. Prod `/login` = 200.
- **Production VERIFIED LIVE (desktop) via the Founder's authenticated Chrome**
  (no credentials entered; measured the real deployed DOM):
  - Job **OBSERVE** → visual top-to-bottom order:
    `PASSPORT(order=0) → STORY(1) → WHY(2) → RECEIPT(3)` — PASSPORT physically
    leads (matches the OBSERVE ranking).
  - Switched to **REVIEW** → order reranked to
    `RECEIPT(order=0) → STORY(1) → WHY(2) → PASSPORT(3)` — RECEIPT floated from
    bottom to top, PASSPORT dropped to bottom, exactly the REVIEW ranking.
  - Restored **OBSERVE** — PASSPORT back to `order=0`, RECEIPT to `order=3`.
  - Proved the pure `order` permutation drives the physical column live, and
    that WM only reranks on the human's explicit job selection.

## DB / Supabase state

No migrations applied. No secrets touched. Pure selector + CSS-order wiring.

## Founder-visible result

The operating system now *physically* reorganises the decision column around
the human's current job — the lead surface rises to the top — completing the
emphasis loop from "signalled" to "embodied." The market stays the same; the
interface's layout changes around the job.

## Remaining limitations

- **Mobile 390px screenshot NOT VERIFIED THIS SESSION** (task #6 still open).
- The `order` ranking is a fixed per-mode permutation; it does not yet respond
  to sub-signals within a job (e.g. an unresolved contradiction could promote
  WHY within OBSERVE). A future atom could make the secondary ordering
  signal-aware, still presentation-only.

## Anything now duplicate

Nothing. `order` extends the single `selectDeckEmphasis` mapping; `surfaceOrder`
is the only rank helper. No second layout owner introduced.

## Next real dependency

Optional: signal-aware secondary ordering within a job, or animate the reorder
transition (CSS `order` jumps instantly today) — always presentation-only,
human job-selection authoritative.
