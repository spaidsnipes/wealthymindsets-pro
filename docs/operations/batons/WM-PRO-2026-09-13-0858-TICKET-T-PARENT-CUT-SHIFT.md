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

# WM Pro — Ticket T parent cut shift, 2026-09-13 08:58Z

Sealed by Claude (autonomous 3h shift after the mid-shift Founder audit
reframed the work as "MOVE THE FAMILY INTO THE NEW HOUSE, THEN CONNECT
UTILITIES INSIDE IT"). Continues 08:37Z baton `WM-PRO-2026-09-13-0837-
TICKET-T-LIVE-G9-RED.md`, which recorded a live G9 red before this cut.

## What landed this shift (in log order)

  0899c92  TICKET T G12 gate: July chrome cannot smuggle back into the Founder room
  dbee147  Gate the state matrix inside the Founder room (0 tests -> 9)
  11feab0  TICKET T STEP 4: sanctuary atmosphere layers inside the shell
  d286650  TICKET T PARENT CUT: /command-deck now mounts the Asset-10 shell
  3504417  Gate the ExperienceModeBar seven-mode strip (0 tests -> 10)

Plus this baton and the earlier 08:37Z baton.

## The Parent_Scene_Owner receipt (the audit's P0)

The audit demanded a concrete PARENT_SCENE_OWNER_FILE/COMPONENT before
any more visual PR could count. The answer, found by grep + wc + a
1400-line read:

  PARENT_SCENE_OWNER_FILE:      src/components/layout/MainLayout.tsx
  PARENT_SCENE_OWNER_COMPONENT: MainLayout
  LEGACY_PARENT_TO_RETIRE:      MainLayout (1405 lines)
  NEW_ASSET10_PARENT_FILE:      src/components/experience/WMExperienceShell.tsx
  NEW_ASSET10_PARENT_COMPONENT: WMExperienceShell
  ORPHANED_BEFORE_CUT:          yes — zero consumers

The Asset-10 room had been built and never moved into. The whole cut is
a five-line escape-hatch inside MainLayout, mirroring the existing
`isPublicAuthPath` branch on line 940.

## What G2 through G12 look like now

  G2  ROOT/OWNERSHIP   GREEN in code  · sentinel gates the escape hatch
  G9  HUMAN FRUIT      YELLOW         · HUMAN_PROOF_REQUIRED — awaiting
                                       deploy + a 1440x900 screenshot read
  G12 RETIREMENT       GREEN in code  · residency sentinel gates that
                                       TickerTape/MusicPlayer/MobileSessionPill/
                                       SpaidbotButton/lucide-icons cannot
                                       reappear on the Founder route
                                       without failing tests BY NAME

The three sentinels together are the F9 route-tree receipt the audit
asked for. F8 (visual receipt) is still a screenshot away, and the
screenshot needs the code to be on prod.

## Sanctuary atmosphere — the three planes

The audit prescribed WATER-BREATH by name. WMExperienceShell now owns
the STATIC MATERIAL plane (vignette + grain via pseudo-elements) and
the AMBIENT plane (a very subtle 8x4px 26s brass radial drift), with:

  · pointer-events: none on every atmosphere layer
  · z-index: 0 below, content at z-index: 1
  · WATER-BREATH gated on prefers-reduced-motion: no-preference
  · transform + opacity only in the @keyframes (compositor-friendly)
  · no market vocabulary anywhere in the <style> block — gated by a
    source-scan test named "never keys atmosphere on a market state or
    symbol". A future edit that types `bullish` inside the sanctuary
    fails BY NAME. tsc is BLIND to CSS values — REVIVE #12 confirmed.

The audit's law is pinned in a comment ON the source: `WATER MAY BREATHE.
PRICE MAY ONLY MOVE WHEN TRUTH MOVES. NO OWNER = STILL.`

## REVIVE ledger continued

Four confirmations added this shift, all followed by byte-identical
restore:

  #10  aria-pressed={true} on every mode button.
       "never two active at once" failed BY NAME. tsc EXIT=0.
       Boolean toggle inside JSX — tsc-invisible wrong answer.

  #11  Deleted the isFounderOperatingRoom escape branch.
       Three sentinel tests failed BY NAME. tsc EXIT=0.
       Removing a working block is a legal edit to the type checker.

  #12  Added `.wm-sanctuary[data-mode="EXECUTE"] > .wm-water-breath
       { background-color: bullish; }` inside the <style> block.
       "never keys atmosphere on a market state or symbol" failed BY NAME.
       tsc EXIT=0. First confirmation that tsc is BLIND to CSS content —
       an invalid CSS value inside a template literal is a plain string
       to the compiler.

  #13  Flipped WAIT.railDefaultOpen from false to true in shellLayout.
       "defaults the guest rail CLOSED in live-market modes" failed BY NAME.
       tsc EXIT=0. A boolean cell in a Readonly<Record> table is tsc-visible
       as a shape but tsc-blind as a truth.

  #14  Added `<TickerTape />` above `<WMExperienceShell>` inside the
       Founder branch. "does not mount TickerTape on the Founder route"
       failed BY NAME. tsc EXIT=0. TickerTape is a legal top-of-file
       import; the type checker cannot see that mounting it inside a
       specific branch is a residency defect.

That is now FOURTEEN independent confirmations that:

  · `tsc --noEmit` stays EXIT=0 through behavioural breaks;
  · a source-scan test that reads for LAWS (residency of names, presence
    of aria-* labels, exclusion of vocabulary) catches things tsc cannot;
  · a screenshot read catches things every automated gate misses.

Renames are type-visible. Wrong answers are not.

## What did NOT land, and why

  · command-deck/page.tsx is still held by a parallel worker with an
    unstaged 60-line diff wiring canonical direction into the option
    expression shortlist. The audit's step 3 ("put NOW/MARKET/RISK/WHY/
    NEXT truth INSIDE the new room") is that worker's lane. This shift
    stayed off it. COLLISION LAW.

  · Cloudflare deploy remains OWNER-AUTH-REQUIRED. `wrangler whoami`
    returned "auth token has expired" earlier in the day; the trigger
    `npm run deploy:cf` requires interactive login. The only workflow in
    `.github/workflows/` is `sentinels.yml`, so pushing main does not
    auto-deploy. All 21 tests added this shift are in the tree; F8 will
    be red until whoever holds the trigger fires it.

  · F8 evidence itself: the 1440x900 live screenshot showing MARKET as
    the largest field on /command-deck. Not captured because prod at the
    time of writing serves the pre-cut composition.

  · No new visual constitution was created. The audit's warning was
    explicit: "The Drive already contains the correct architectural
    direction. Do not create another front door, command center,
    architecture layer, status owner, decision store, visual-state
    owner, provider registry, or cleanup framework." This shift added
    zero new such owners.

## What the next hand does

1. Fire `npm run deploy:cf` from a session that owns wrangler auth. Then
   read `/command-deck` at 1440x900 and 390x844 and stand F8 next to F0
   (screenshot in this baton would go here — captured in the
   08:37Z baton as evidence of the PRE-cut state).

2. Land the parallel worker's canonical-direction wire (currently
   unstaged) so NEXT (expression shortlist) reads canon direction. That
   is the audit's step 3 continued.

3. Land content inside the new room so the deck's composition READS
   MARKET-first inside the sanctuary — the sanctuary is the frame; the
   picture in the frame is still the parallel worker's job on
   command-deck/page.tsx.

4. Only after F8 lands: resume the polish lane (untested panels
   remaining: ExitRampCard). The audit's line "no more 47 green commits
   while the Founder glass still looks July" was the correction that
   turned this shift around; do not let it lapse.

## Gates snapshot at shift close

  VITEST      = 0    · 6396 tests, +21 from this shift
  TSC         = 0    · noEmit
  MEASURE     = 0    · 7 surfaces clear at 390/834/1440 (unchanged)
  REVIVE      = #14  · fourteen consecutive tsc EXIT=0 through breaks
  F8          = HUMAN_PROOF_REQUIRED
  F9          = code receipt LANDED (three sentinels); live receipt owed
  DEPLOY      = OWNER-AUTH-REQUIRED

MARKET IS THE ROOM. WATER MAY BREATHE. PRICE MAY ONLY MOVE WHEN TRUTH MOVES.
NO OWNER = STILL.
