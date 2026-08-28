# Deep Read Collapses in the Live-Decision Loop — Job-Aware Depth on the Command Deck

- **Date / time:** 2026-08-27 (~23:40 local)
- **Branch / worktree:** `shift/deck-emphasis-explain` @ `/Users/dspaidnoosleep/wm-shift-emphasis`
- **Starting SHA:** `82fc23e` (deck calm-lead receipt)
- **Ending SHA:** `c173124` on `origin/main`
- **Commit created:**
  - `c173124` — `feat(command-deck): collapse the deep analytical stack in the live-decision loop so the calm lead dominates`

## Doctrine binding
Second conversion atom of the same directive. Founder canon quoted directly:
**"WAIT should feel calm"**, **"the moment capital is live, WM should REDUCE
navigation"**, **"the system reorganizes around the user's current job"**, and the
north star **"DEEP WISDOM. LOW NOISE."** Atom 1 calmed the LEAD (raw ribbon →
collapsed RAW tier); this atom calms the DEPTH below it.

## Subsystem(s) touched
- `src/lib/experience/selectDeckEmphasis.ts` — the canonical per-job deck-emphasis
  map (single owner). Added one field, `deepSectionsOpen`.
- `src/lib/experience/selectDeckEmphasis.test.ts` — +2 regression tests (17→19).
- `src/app/command-deck/page.tsx` — wrapped the deep numbered stack in a
  job-derived `<details>`. Presentation-only.

## Observed failure (before)
Below the (now calm) lead, five always-open numbered sections — **Story Ribbon**,
the **auction lens (DLAR)**, the **9-node Decision Chain** (~1265px by itself),
**Steward rules**, and **Data Fidelity** — rendered expanded in EVERY job:
~3500px of deep analytics competing with the One Story / one question / Hero Truth
for the trader's first screen even while merely watching with no position. A
second, deeper card museum stacked under the first.

## Root cause
The deck rendered the full decision machinery unconditionally, ignoring the
human's current job. The deep chain is the correct depth for deliberate analysis
(planning, review, drilling) but pure noise ahead of the calm lead inside the
live-decision loop.

## Exact change made (presentation-only; invents no market claim)
1. `selectDeckEmphasis` gains `deepSectionsOpen: boolean` — **TRUE** only in the
   deliberate-analysis jobs (**PREP** builds the plan off the chain; **REVIEW /
   LEARN** dissect the record); **FALSE** in the live-decision loop (**OBSERVE /
   WAIT / EXECUTE / MANAGE**). Total over all 7 modes; spread through the existing
   `...base` so every returned `DeckEmphasis` carries it.
2. Page wraps the five numbered sections + Structure note + ATHOS in a single
   `<details open={deckEmphasis.deepSectionsOpen}>` with summary *"Deep read ·
   story · auction lens · decision chain · steward · fidelity"*. Gated on
   `chainVm` so the empty (no-state) view shows no orphan disclosure. Every
   section stays in the DOM, one deliberate click from view in every job. No
   market truth touched; no data hidden.

## Why the flag lives in the selector, not the page
Keeps ALL per-job deck emphasis (lead surface, order, passportOpen, receiptOpen,
now deepSectionsOpen) in one canonical, unit-tested owner — "the system
reorganizes around the user's job" stays a single source of truth, not logic
scattered into JSX.

## Tests / build proof
- `tsc --noEmit --skipLibCheck`: **0 errors**.
- `selectDeckEmphasis` suite: **17 → 19** (deep stack opens only in
  PREP/REVIEW/LEARN; stays collapsed across OBSERVE/WAIT/EXECUTE/MANAGE; field is
  a total boolean).
- Full `vitest run`: **174 files / 1480 tests green**.

## Founder-visible running-product proof (VERIFIED)
Local preview (serverId `cba0d4d0…`, port 3020, Founder session persisted).
- **OBSERVE** (default, live-loop): the five deep sections collapse to a single
  line "▶ DEEP READ · STORY · AUCTION LENS · DECISION CHAIN · STEWARD · FIDELITY"
  (DOM-confirmed `deepOpen=false`; contains the Decision Chain). Screenshot
  captured.
- **REVIEW** (deliberate-analysis): clicking the mode re-opens the stack
  (DOM-confirmed `open` false→true). Restored to OBSERVE afterwards.

## Experience Receipt (the human delta)
While watching with no position, the trader no longer scrolls past ~3500px of
decision machinery to nothing actionable — the deck ends at the calm lead plus
two quiet "System state" / "Deep read" lines. The instant the job becomes
deliberate analysis (REVIEW / LEARN / PREP), the full chain is there, expanded,
because that is when it is the work. Depth preserved; noise removed; the surface
visibly reorganizes around the job.

## Deployment state
- **PUSHED** @ `c173124`. **NOT DEPLOYED** — Cloudflare prod under Error 1027
  (Founder-only, task #15). Redeploy required once prod recovers.

## Supabase / DB state
- Untouched.

## Anything now duplicate or unnecessary
- None. Extended the single canonical emphasis selector; no parallel job logic.

## Remaining limitations
- Real-prod Gate-4 blocked on Error 1027 — LOCAL-verified only until redeploy.
- The PREPARATION-phase Opening Bell panel sits OUTSIDE the Deep Read wrapper (it
  is a phase-gated readiness gate, not analytical depth) — intentionally
  unchanged this atom.

## Next real dependency / next slice
- Continue the WAIT vertical slice: WHY should hold depth without losing chart
  context. Founder resolves Error 1027 (task #15) to move both deck-calm atoms
  DEPLOYED → OBSERVED on real prod.
