# WM PRO — BATON X — ROOM MEASURE + AUTHORITY REPAIR (2026-09-13)

Thread: one-thread WM Pro bus. Directive: Founder audit (SCENE_FRAGMENTATION)
+ Founding Execution Contract §13 open gates.

No elapsed-time claim is made anywhere in this document. PROVEN is written
only where a live production observation backs it.

---

## 1. The block

Four commits after baton W, oldest first:

| commit | what it moved |
|---|---|
| `5e4ab64` | The market room was measured for PROSE, not for price |
| `c1adf93` | `bigTradeLevels` had no adoption guard; a dead IDENTITY formula was still in the renderer |
| `a4797c1` | The F8 static-shell authority was vouching for a shell two commits old |
| `6c28953` | The RISK pixel promised an evaluation that cannot happen |

`origin/main` at seal time: `6c28953`.

## 2. Production measurement — §30 STEP 2 (PROVEN — live reads on
`https://wealthymindsetspro.com/command-deck` in the Founder's authenticated
Chrome, viewport 1920×847)

`<main>` carried `maxWidth: 1280`. That is a READING measure: long prose lines
are harder to scan, so nearly every dashboard container in this codebase was
born with one. Price geometry has no comfortable line length. Measured live,
the cap rendered the room 1248px wide starting at x=334 — **672px, 35% of the
screen, was dead sanctuary field** while the candle canvas owned 29% of
viewport area.

The rail was `minmax(280px, 0.62fr)`. Widening the room alone would have handed
~35% of every new pixel to a chip, a closed summary line, and a shortlist.
So the cap became `min(1720px, 100%)` and the rail became a bounded `340px`.

| | start of block W | after block W | after `5e4ab64` (NOW) |
|---|---|---|---|
| market canvas top (px) | 402 | 295 | **295** |
| starts at % of viewport | 47% | 35% | **35%** |
| canvas WIDTH (px) | — | 921 | **1338** |
| canvas % of viewport AREA | 18% | 29% | **42%** |
| rail width (px) | — | 317 (proportional) | **340 (bounded)** |

Final live read, verbatim:

```
{"vw":1920,"vh":847,"field":{"x":114,"y":295,"w":1338,"h":505},
 "ctx":{"x":1462,"y":295,"w":340,"h":469},"areaPct":42,"startsAtPct":35,
 "cols":"1338px 340px"}
```

`cols: "1338px 340px"` is the live confirmation that the rail is pinned and
every released pixel went to MARKET.

`min(1720px, 100%)` still refuses the extreme: an unbounded room on an
ultrawide stretches past one gaze and detaches from the centered header. Below
1720 it resolves to 100%, so nothing that already landed at laptop widths
moved.

## 3. Verified-NOT-a-defect (measured, not assumed)

Recorded because the cheap move was to "fix" them and manufacture churn against
§0 and §4.

1. **§30 STEPS 4–6 were already structurally satisfied.** The
   `@media (min-width: 1100px)` grid already puts NOW spanning both columns
   with MARKET and the RISK/WHY/NEXT rail side by side, all inside one
   `[aria-label="One decision market room"]` owner sharing one
   `data-decision-id`. Nothing rebuilt. The defect was the container MEASURE,
   not the scene architecture.

2. **"No decision born yet on this scene" is honestly pending.** Swept the deck
   and `components/experience` for the fabricated-FUTURE class after finding
   one real instance (§5). `sessionDecisions` = DecisionMemoryStore decisions
   (proven zero writers) UNION `journalDecisions` from `useJournalBook`. The
   journal half IS a reachable producer: a trader logging a trade births a
   decision. The word "yet" is therefore true. No edit made.

## 4. §13 gate CLOSED — adoption ownership for `bigTradeLevels` — `c1adf93`

`deltaVPGeometry.ts` and `deltaBubbleLevels.ts` each had an adoption Sentinel.
`bigTradeLevels.ts` — extracted from the same 7000-line file, consumed from the
same canvas block, owning the same price-identity arithmetic — had none. A
module can be fully tested and fully correct while silently ceasing to be
CONSULTED: `tsc` stays EXIT=0, its own tests stay green, and the canvas is
governed by a re-inlined copy no test can reach.

What the extraction fixed, and what the Sentinel now protects: the ranking used
to round every print for DISPLAY and then use that rounded value as the level's
IDENTITY. On crypto, where `base > 100` collapses every print to two decimals,
two separate block trades produced one key and the second was **overwritten** —
not merged, gone, with its size and its aggressor side.

The new Sentinel earned its keep on first run, finding a defect nobody was
looking for: `MainChart.tsx:5443` still carried
`b.spawnKey ?? \`bt:${b.anchorTime}:${b.anchorPrice}\`` — a second copy of
`bigTradeLevelKey`'s formula. Unreachable today (`spawnKey` is required on
`Bubble`), lethal the day it becomes optional: the cull would delete a key
built from a different price than the spawn added, the real key would leak in
`bubbleSpawnRef` forever, and the print would silently never re-spawn on
pan-back. Removed; the delta path one screen up already had no fallback.

REVIVE (ranking re-inlined) → FAIL by name, EXIT=1:
- `× finds a non-trivial delegating body to police`
- `× the delegating call is a return statement, not a discarded expression`
- `× does not re-inline the ranking, the lot threshold, or price-as-identity rounding`

REVIVE (local `bt:` template restored) → FAIL by name:
- `× the spawn key the renderer draws with comes from the owner, not a local template`

## 5. Two truth defects in INSTRUMENTS, not in numbers

Both are the same family: **something reporting on a copy that has stopped
representing what it claims to represent.**

### 5a. The F8 static-shell authority was a hand-copy — `a4797c1`

`scripts/verify-founder-f8.mjs` probes `/founder-room-sample` on prod as its
ROUTE-SCOPED authority — the one page with no auth, no shared bundle, and only
the sanctuary shell, so a substring check on it tells the truth.

That authority was resting on a hand-copy. The renderer wrote the sample to
`tmpdir()` on every vitest run; `public/founder-room-sample.html` was copied by
hand once and never again.

```
/var/folders/.../T/founder-room-sample.html   10995 bytes
public/founder-room-sample.html               10914 bytes
cmp -s → DIVERGED
```

**The divergence was not cosmetic.** The served copy still carried the separate
job-caption bar below the header — the second stacked chrome bar that `50572da`
collapsed. The F8 gate was green over the exact silhouette defect baton W
measured as repaired.

The renderer now owns the served artifact directly. Three gates fail by name if
it does not — including one that catches the write being swallowed by its own
try/catch, which previously printed a single stderr line into a 569-file run.

REVIVE (public write removed, served copy perturbed) → FAIL by name, EXIT=1:
`× the SERVED copy is byte-identical to the markup this shell just rendered`
`AssertionError: public/founder-room-sample.html has drifted from the rendered
shell — the F8 static-shell probe would be vouching for markup this build does
not produce`

**PROVEN live.** After deploy:

```
curl -sL https://wealthymindsetspro.com/founder-room-sample | shasum -a 256
  18afcf04b80b1a30004cecbedc61d2f387567850ef8951d0de242bed1d5ddae1
shasum -a 256 public/founder-room-sample.html
  18afcf04b80b1a30004cecbedc61d2f387567850ef8951d0de242bed1d5ddae1
grep -c 'shell-job-caption' → 1
```

Byte-identical, and the collapsed header is on the wire.

### 5b. The RISK pixel promised a future this build cannot deliver — `6c28953`

MEASURED, not suspected. `selectDecisionChain` emits `availableR` only when
handed `availableRInputs`. That field has **zero production referencers** — its
own declaration, its own read, and a unit test. The deck's call is
`selectDecisionChain({ state, history, nowMs, phase })`. So
`chainVm.availableR` is `null` on /command-deck for every trader, in every
phase, on every symbol, by construction.

For that null, `AvailableRChip` rendered *"Available R has not been evaluated on
this scene."* Every word true except the tense. "Has not been evaluated" tells a
trader that evaluation is something their next action causes. It is not.

Same class as the Decision Receipt's "No decision sealed YET" (`d72f76b`): not a
fabricated number, a fabricated FUTURE. §35 of the quietest kind — no
numeric-truth gate can see it, because there is no number to check.

§13 SURFACE, DO NOT RUSH-WIRE honored exactly: no entry invented, no stop
invented, no R invented, no producer bolted on to make the pixel light up. New
constant `AVAILABLE_R_UNWIRED_DETAIL` = *"Available R needs a declared entry and
a declared structural invalidation. No surface in this build declares them, so
no R can be computed here."*

The wording rule lives in `availableRReachability.test.ts` **beside the
zero-producer measurement that justifies it**. Wire a real producer and the
measurement goes red FIRST and drags the disclosure red with it — the
disclosure cannot outlive its condition and become the new lie.

REVIVE (old sentence restored) → FAIL by name, EXIT=1:
- `× the null-VM detail DISCLOSES the unwired capability rather than implying a pending one`
- `× does not tell the trader that evaluation is coming`
- `AssertionError: the RISK disclosure promises a future: /has not been evaluated/i`

**NOT YET PROVEN LIVE.** At seal time the deck chunk
`/_next/static/chunks/0us7bu0lbqp85.js` still serves the OLD string; the new one
is in no served chunk. The probe method is validated (it finds the old string,
which is exactly what a working probe should do against a pre-deploy prod).
This is deploy lag, recorded as OWED, not claimed.

## 6. A lesson that bit three times in one block

Each repair's comment quotes the defect it removed — which is how the next
reader learns why the line is shaped the way it is. Three times, that comment
tripped the repair's own regex:

1. the deck comment quoting `maxWidth: 1280`
2. the MainChart comment quoting `` `bt:${...}` ``
3. the chip docstring naming `availableRInputs`

All three fixed by asserting against comment-stripped source:
`src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")`.

**A test a comment can turn red teaches the next author to stop explaining, and
an unexplained gate is a deleted gate.**

## 7. Gate state at seal

Both run UNPIPED (`> file 2>&1; echo $?` — a pipe masks the exit code):

- `./node_modules/.bin/vitest run` → **570 files / 6503 tests, EXIT=0**
  (test count moved 6487 → 6494 → 6497 → 6503 across the block)
- `tsc --noEmit` → **EXIT=0**

`tsc` stayed EXIT=0 through every one of the six intentional breaks in this
block. A CSS string's content and a string literal's content are type-correct
at any value. The typechecker is structurally blind to every defect repaired
here.

## 8. Still blocked — honest record, not worked around

| blocker | state | named unblock |
|---|---|---|
| Gate 4 responsive device proof on authenticated routes | `resize_window` reports success and does not resize; Claude_Preview cannot attach (Founder's dev server holds :4333, PID 11798 — not killed); Playwright harness holds no session | **a seeded test account** — highest-value human unblock on the board |
| `scripts/audit-phone-parity.mjs` against prod | DENIED by the Claude Code auto-mode classifier | honored, not worked around |
| `/journal` detail canvas | 0 journal entries exist | seeded data |
| Live VP / delta-bubble render geometry proof | canvas has no DOM to measure | needs a pixel-level proof channel |
| 390×844 phone capture of the Founder route | **OWED** under the BINDING mobile + visual-confirmation standard (untaken screenshot = FAILED) | — |
| `6c28953` live confirmation | **OWED** — deploy lag at seal time | re-probe the deck chunks |
| `executionConnectivity` orphaned | not a live defect; `/readiness` discloses it honestly | architectural |

## 9. Open work carried forward

- §30 STEPS 4–6 **as the audit MEANS them**, not merely structurally: attach
  RISK to market STRUCTURE — geometrically against price, not a rail chip; make
  WHY contextual inspection of the SAME decision; make NEXT/WAIT/Expression
  emerge from that decision. Note that §5b just proved RISK has no producer at
  all, which makes "attach it to structure" a wiring question before it is a
  layout question.
- F8 capture: 1440×900 + 390×844 beside the F0 baseline.
- F9 capture: proof of what old human burden actually died.

## 10. Acceptance law check

> "IF THE NORMAL FOUNDER URL STILL BLUR/SQUINTS INTO THE OLD CARD DASHBOARD,
> TICKET T FAILS — EVEN IF THE BUILD IS GREEN, THE TESTS PASS, THE PROVIDERS
> IMPROVED, AND 40 COMMITS LANDED."

The market field went from 29% to **42% of viewport area** on the Founder's own
screen, at an unchanged 35% start, with the rail pinned so it cannot reclaim
the gain. That is measured RUNNING PRODUCT DELTA.

It is still not the full required silhouette. RISK now tells the truth about
itself, which is strictly better than a confident-looking UNKNOWN — but a rail
chip that honestly says "this build cannot compute me" is a disclosure, not the
attached risk geometry STEP 4 asks for. **HUMAN_PROOF_REQUIRED = YELLOW** on the
phone form factor, where no screenshot has been taken.

## 11. Append-only checkpoint — 2026-09-14 23:00 CDT

- Exact local HEAD: `0a9d09bb052179a6f92937ac011f3a83f378b645`
- Exact `origin/main`: `0a9d09bb052179a6f92937ac011f3a83f378b645`
- Exact Cloudflare build identity: `0a9d09bb052179a6f92937ac011f3a83f378b645`
  (`builtAt=2026-09-15T03:30:18Z`). This proves the answering server bundle,
  not an authenticated browser session.
- Shipped atom: rail-only `NEXT` anchors to the bottom decision edge; horizontal
  band/mobile/Options behavior is unchanged.
- Verification: focused 25 tests; full 579 files / 6623 tests; TypeScript clean;
  webpack production build clean; `git diff --check` clean; independent static
  review PASS.
- Production desktop F8 was not claimed. The available desktop Chrome profile
  redirected localhost to `/login`; the in-app browser capture was narrow and
  therefore was not counted as desktop proof.
- Fresh Drive reconciliation at the observed start found no WM Pro authority
  newer than the September 13 canon set. Supabase project
  `zrzaifaxecwgpfrqctkp` was read-only `ACTIVE_HEALTHY`; Webull's read-only quote
  request returned an internal error. No provider, secret, auth, DB, permission,
  brokerage, or order mutation occurred.
- Preserved unrelated state: this baton and `scratchpad/` remain untracked and
  were not added to the scoped product commit.
- Actual-time record: observed implementation/review/gates/push ran from the
  19:59 CDT start checkpoint into the first block; 20:13–22:45 CDT was not
  observed execution and is recorded as an interruption, not work. The final
  bounded deployment reconciliation and source audit ran at 22:45–23:00 CDT.
  This was not a continuous three-hour work proof.
- Unfinished NEXT: in `ChartsDashboard.tsx`, move the existing desktop toolbar
  and optional study strip inside the MARKET/canvas column so the canonical
  `DecisionSpineBand` rail begins at the room's top. Preserve Smart Money,
  fullscreen ownership, drawers, canonical truth callbacks, Options, and narrow
  behavior; add a source-structure guard and obtain fresh authenticated desktop
  production proof.
