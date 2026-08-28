# Deck Opens Calm — Raw Context Rail Demoted to a Collapsed RAW-Third Tier

- **Date / time:** 2026-08-27 (~23:35 local)
- **Branch / worktree:** `shift/deck-emphasis-explain` @ `/Users/dspaidnoosleep/wm-shift-emphasis`
- **Starting SHA:** `96bb69b` (LOCAL Gate-4 close — mode-band wrap screenshot-confirmed)
- **Ending SHA:** `71c06c8` on `origin/main`
- **Commit created:**
  - `71c06c8` — `feat(command-deck): demote the raw context rail to a collapsed RAW-third tier so the deck opens calm`

## Doctrine binding
Founder contract-level directive (this shift): the bottleneck is **CONVERSION** —
the rich architecture must "start collapsing into the actual human experience."
North star: **ONE STORY. ONE QUESTION. ONE NEXT THING. … SHOW FIRST. EXPLAIN
SECOND. RAW THIRD.** and **DO NOT BUILD A CARD MUSEUM.** This atom is the first
founder-visible conversion of that directive on `/command-deck`.

## Subsystem(s) touched
- `src/app/command-deck/page.tsx` — primary-column JSX placement only. No
  selector, view-model, or shared-primitive logic changed.

## Observed failure (before)
The Command Deck opened as a **card museum**: the 6-tile `CommandContextRibbon`
(SESSION / DATA / OBSERVED / AVAILABLE R / EVIDENCE DEBT / RIGHT OF WAY) rendered
**first** in the primary column — above the Hero Truth and the One Story. Six raw
evidence tiles competed for the trader's first second, inverting SHOW-FIRST /
EXPLAIN-SECOND / RAW-THIRD.

## Root cause
The ribbon was placed at the **top** of the primary column during the 2026-08-19
OS Transformation as an at-a-glance state read. But it *leads* rather than
*supports*: every decision-critical value it carries is already surfaced above it
— right-of-way + missing-evidence in the **One Story** strip, Available R +
evidence debt in the **decision-chain** panel. Leading with the raw tiles is
therefore pure noise ahead of the truth, not additional truth.

## Exact change made (presentation-only; invents no market claim)
1. Removed the `<CommandContextRibbon>` from the top of the primary column.
2. Re-inserted it at the **bottom** of the primary column, wrapped in a
   `<details>` **collapsed by default**, summary line:
   *"System state · session · data · evidence · right-of-way."*
3. Result order: **Hero Truth + One Story lead (SHOW FIRST)** → WHY panel
   explains (EXPLAIN SECOND) → raw rail one deliberate click away (RAW THIRD).
4. No truth hidden: the drawer opens to the full canonical 6-tile read;
   UNKNOWN / DELAYED / MISSING remain first-class visible states. The shared
   `CommandContextRibbon` primitive is untouched — no fork.

## Tests / build proof
- `tsc --noEmit --skipLibCheck`: **0 errors**.
- Full `vitest run`: **174 files / 1478 tests green**.

## Founder-visible running-product proof (VERIFIED)
Local preview (serverId `cba0d4d0…`, port 3020, Founder session persisted).
- **BEFORE** (documented, prior session): 6 raw tiles (SESSION UNKNOWN, DATA
  DELAYED, OBSERVED NONE YET, AVAILABLE R UNKNOWN, EVIDENCE 9 MISSING, RIGHT OF
  WAY WAIT) led the deck above the hero.
- **AFTER** (screenshot captured this shift): the deck leads with the routed
  **question** ("What is the market actually doing right now?") → the **WAIT job
  suggestion** ("Right-of-way is withheld — hold the thesis and wait") → the
  **HERO TRUTH** card (UNKNOWN · NQ1! 15M · DELAYED · 29664 · PRICE AGE 615.1s).
  The raw rail renders as a single collapsed line
  ("▶ SYSTEM STATE · SESSION · DATA · EVIDENCE · RIGHT-OF-WAY") below the
  Decision Receipt drawer; DOM eval confirmed it opens on click to the 6 tiles
  (SESSION/DATA/OBSERVED/AVAILABLE R/EVIDENCE/RIGHT OF WAY).

## Experience Receipt (the human delta)
The trader's first second changed from *"read six competing status cards"* to
*"hear the one question, see the one next thing, read the one truth."* Risk is
not live here (WAIT/withheld), so the deck is calm by construction; the raw
canonical rail is preserved and reachable, not deleted. This is a felt reduction
in first-glance noise with zero loss of depth.

## Deployment state
- **PUSHED** @ `71c06c8`. **NOT DEPLOYED** — Cloudflare prod under Error 1027
  (Founder-only, task #15). Redeploy required once prod recovers.

## Supabase / DB state
- Untouched.

## Anything now duplicate or unnecessary
- None. The ribbon primitive is reused, not forked; only its placement + default
  open-state in the deck changed.

## Remaining limitations
- Real-prod Gate-4 blocked on Error 1027 — LOCAL-verified only until redeploy.
- Viewport captured was the narrow preview panel width; the same JSX order holds
  at all widths (single-column below 900px; the raw tier is always last).

## Next real dependency / next slice
- Continue the WAIT vertical slice: make the collapsed WHY hold depth without
  losing chart context, and keep reducing lead-noise. Founder resolves Error
  1027 (task #15) to move this atom DEPLOYED → OBSERVED on real prod.
