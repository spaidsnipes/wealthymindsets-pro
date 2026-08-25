# Ledger — Layout-Rationale Caption (2026-08-25)

**Session:** Five-Hour Megazord Finish Shift (continuous execution).
**Canon:** BUILD → TEST → BREAK → VERIFY → COMMIT → CONTINUE. Founder rule:
"every state must be explainable." This atom makes the deck's re-emphasis
self-explaining — the OS now SAYS why it arranged the column the way it did.

## Starting SHA

`a4d4846` (signal-aware secondary-order ledger).

## Ending SHA

`0ddb6f5` (layout-rationale caption).

## Commit created

**`0ddb6f5` — Surface the layout rationale so re-emphasis is never silent.**
- The deck reorders its decision column around the human's job
  (`afd1a55` / `db4f1fd`), but `selectDeckEmphasis.rationale` — the one-line
  reason the layout fits the job — was computed and never shown. The
  re-emphasis happened silently.
- Rendered a single quiet, muted "LAYOUT · <rationale>" caption above the
  decision-surface stack, OUTSIDE the reorderable set so it always leads the
  section, `aria-live="polite"` so assistive tech announces the change. Reads
  the same `deckEmphasis.rationale` that drives the order — no new state, no new
  truth. Presentation-only.

## Subsystems touched

`src/app/command-deck/page.tsx` (one caption div above the surface stack).

## Proof

- `tsc --noEmit --skipLibCheck` — clean.
- `next build` — clean; `/command-deck` compiled.
- `vitest` — no new test needed; the rationale non-emptiness contract for every
  ExperienceMode is already asserted by `selectDeckEmphasis`'s totality test
  (`rationale.length > 0`). Experience suite 62/62 green.
- Deploy: `npm run deploy:cf` exit 0 — Version ID `2f350623`. Prod `/login` = 200.
- **Production VERIFIED LIVE (desktop) via the Founder's authenticated Chrome**
  (no credentials entered; read the deployed DOM):
  - Job **OBSERVE** → caption: "Watching with no position — the Object DNA leads
    the study."
  - Switched to **REVIEW** → caption updated to: "Reviewing — the sealed
    Decision Receipt is the object of study."
  - Each caption is exactly the job's `deckEmphasis.rationale`; restored OBSERVE.
  - Proved the caption tracks the job live and updates on the human's switch.

## DB / Supabase state

No migrations applied. No secrets touched. Pure presentation.

## Founder-visible result

The deck no longer re-emphasises silently — one honest line tells the human why
the column is arranged for their current job. The OS explains its own layout.

## Remaining limitations

- **Mobile 390px screenshot NOT VERIFIED THIS SESSION** (task #6 still open).
- The caption is text-only; it does not (yet) point to which surface leads with
  a visual connector. A future atom could tie the caption to the lead surface.

## Anything now duplicate

Nothing. The caption is the only consumer of `deckEmphasis.rationale`; it adds
no new state and duplicates no selector.

## Next real dependency

Optional: a subtle visual tie between the caption and the lead surface; or the
mobile 390px verification (task #6). Always presentation-only, human
job-selection authoritative.
