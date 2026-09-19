<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **shift baton** — a hand-off written at the end of one shift. Its filename names its own day. It was true
> on that day and is preserved as evidence of what was observed and decided
> then. Do not take a current action, diagnosis, release decision or task claim
> from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference below is a `GHOST_HOST` signal: the
> Vercel host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-19 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which
> until that day scanned only the top level of `docs/operations` and could not
> see this directory at all. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

# SHIFT BATON — 2026-09-19 — QUARANTINE WRITTEN, GATE DARK

STATUS OF EVERYTHING IN THIS BATON: **IMPLEMENTED-BUT-UNGATED.** The Bash
safety classifier (the harness-side gate on executing commands) has been
unavailable across repeated retries this segment. No vitest run, no tsc run,
no commit, no push, no deploy, no live observation. Nothing below is claimed
green, and nothing below is claimed PROVEN. The static-verification greps
named per unit are the ONLY checks that have actually run.

## Why this baton exists now

Three logical units of work are complete on disk and the executing gate is
dark. Sealing the state honestly beats letting a fresh session re-derive it —
or worse, letting the size of the uncommitted batch get misread as one unit.

## Unit 1 — M3 phone-slot cut (carried from earlier in the shift)

- `src/lib/routing/wmDestinations.ts` — `/command-deck` removed from
  `PHONE_SLOT_HREFS`; strip pinned at four doors.
- `src/components/layout/ShellAccessParity.test.tsx` — pins count EXACTLY
  four with explicit `not.toContain("/command-deck")`.
- `src/lib/routing/founderRoomRoutes.test.ts`,
  `src/lib/academyMobileDiscoverability.test.ts` — companion pins.

## Unit 2 — M3 legacy quarantine (this segment's atom)

The Founder's 2026-09-19 order: "as soon as /charts is legal HOME, Command
Deck loses normal-route authority → explicit legacy/debug quarantine.
Preserve capability. Kill competing authority."

- `src/lib/routing/wmDestinations.ts` — new `authority?: "legacy"` VERDICT
  field, deliberately separate from `frame` (a measurement of chrome; bending
  it would falsify a fact to express a verdict). Exactly one carrier:
  `/command-deck`. Capability untouched: group ROOM, tier 1, frame "os".
- `src/components/os/WMOperatingSystem.tsx` — OS_ROOMS spreads
  `{ legacy: true }` for the deck only (absence-not-false: normal rooms carry
  NO key); RailLink renders a LEGACY chip
  (`data-testid="os-rail-legacy-chip"`); rooms map passes
  `legacy={room.legacy}`.
- `src/components/layout/MainLayout.tsx` — 72px July rail destructures
  `authority` and renders `data-testid="rail-legacy-chip"`; stale five-slot
  phone-nav comment (still naming DECIDE/Command Deck) rewritten to defer to
  `PHONE_SLOT_HREFS` as owner. SECOND DOOR-DRAWING SURFACE COVERED: the
  Workspace drawer's withheld-while-capital-is-live section also draws ROOM
  doors; its tile now renders `data-testid="drawer-legacy-chip"` — without
  it the label would vanish exactly when capital is live. (The OS phone
  Rooms sheet needs nothing extra: it IS the rail, one RailLink renderer.)
- `src/lib/routing/commandDeckQuarantine.test.ts` (NEW) — four data-first
  tests: exactly-one-legacy, capability preservation, OS_ROOMS carry with
  `toBeUndefined()` for every other room, source breadcrumbs on both
  renderers.
- `docs/operations/DECK-ORGAN-INVENTORY.md` (NEW) — strict-import census:
  15 DECK-ONLY organs (suggested targets only; each migration is its own
  atom), 19 SHARED; four overturned claims from the discarded
  mention-counting census recorded with file:line evidence;
  ConnectedStoryRibbon orphan flagged (spawn-task chip filed for deletion in
  a separate session — do NOT sweep into a migration commit).

Static verification that HAS run (read-only greps, this segment):
`wmDestinations.ts:159` field + `:170` sole carrier;
`WMOperatingSystem.tsx:95` ShellRoom.legacy, `:126` spread, `:949`
`legacy={room.legacy}`; `MainLayout.tsx:488` destructure, `:524` chip;
`OS_ROOMS` is exported at `WMOperatingSystem.tsx:120` (the new test's import
resolves).

## Unit 3 — Paper execution realism (carried)

- `docs/operations/PAPER-EXECUTION-REALISM-STANDARD.md` — four-rung ladder;
  realism = fidelity to what was observed; fixed-bps spreads / probabilistic
  fills / random partials / latency jitter FORBIDDEN.
- `src/app/paper/page.tsx` — micro-walk docblock + info.base % fix.
- MEASURED: Rung 1 (spread) is UNFUNDABLE on the current lane — `/api/yahoo`
  carries no bid/ask anywhere. Next legal move is a data-lane change, not a
  fills change.

## Docs carried

`docs/operations/CANON-SHIFT-GATE-STATUS.md` — M3 row records sub-atom (2)
as IMPLEMENTED-BUT-UNGATED; paper-realism row records the rung-1
unfundability measurement. Land with whichever unit goes last.

## FIRST ACTIONS FOR WHOEVER PICKS THIS UP (in order)

1. `cd /Users/dspaidnoosleep/wealthymindsets-pro && ./node_modules/.bin/vitest run` UNPIPED, then `./node_modules/.bin/tsc --noEmit` UNPIPED — capture both exit codes.
2. On green: commit in the three surgical units above, staging ONLY the named
   files. NEVER stage `scratchpad/*` or `public/*-sample.html` (the vitest
   run itself rewrites `public/founder-room-sample.html` and
   `public/decision-rail-sample.html`, so they always show dirty).
3. Push main → `npm run deploy:cf` → `npm run verify:prod` MUST MATCH.
4. Live-verify in the Founder's already-authenticated Chrome (never enter his
   password, never forge a JWT): four-door phone strip at 390 without
   /command-deck; LEGACY chip on the deck door in BOTH rails; /paper rows
   with missing prevClose show a status word, not a fabricated %. Restore any
   toggled UI state.

## Standing blockers (recorded honestly, unchanged)

finnhub candles 403 · Gate 4 programmatic resize ineffective · /journal
detail (0 entries) · live-bar fold · Asset 08 (L2) · Asset 18 (signed tape) ·
/api/memecoin DARK · paper rung 1 unfundable on current quote lane.
