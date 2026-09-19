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

# WM PRO — SHIFT BATON G · 2026-09-16

## A SENTINEL THAT NAMES A FILE LOSES THE LAW

Continues baton F (`WM-PRO-SHIFT-2026-09-16-F-THE-QUIET-SCENE-AND-THE-OTHER-OWNER`).

---

## WHAT LANDED

| commit | slice |
|---|---|
| `5d1326c` | a disclosure the trader has to open is not a disclosure |
| `cd312d6` | the room had a screen door where its grain should be |

Both pushed. `main` is clean and **0 ahead** of `origin/main`.

---

## FINDING 1 — the `<details>` rule demoted two things, and both demotions were correct

The generalised reach rule — **a mount nested inside `<details>` is not a
surface** — was already in `surfaceElementReach`. Applying it honestly cost two
entries, and the temptation in both cases was to weaken the rule rather than
accept the finding.

**FIDELITY_CHIPS** was the real defect. The signal-provenance chips — the answer
to *"which signals did WM actually read?"* — lived inside `SceneAdmissionPanel`,
which the deck mounts inside a collapsed drawer. A trader who never clicks the
drawer was told nothing about what the room had and had not observed, while the
reach ledger reported the element as carried. Fixed by extracting
`SignalProvenanceStrip` as the single owner and mounting it in the market room
`<section>`, outside every `<details>`.

**THESIS_GEOMETRY** was not a defect and the distinction matters. Its CARRIER
entry named `DLARStrip`, which sits in the deck's collapsed Workspace/Proof
drawer — so as a MOUNT it reaches nobody. But the element is GATED on the deck
(`<SceneAdmits element="THESIS_GEOMETRY">`), which is the *stronger* of the two
forms of reach, and the first assertion already accounts for it there. The
CARRIER table exists to catch elements reaching a screen **without** a gate.
Keeping a stale entry would have had the table claim two forms of reach where
only one is real, so the entry was removed and the absence documented in place.

`DEBT` now holds exactly `HOT_PATH_REMOTE`, `OPEN_BROKER`, `RECEIPT_SHEET`.

### The part worth carrying forward

Extracting the owner **broke a Sentinel**, and how it broke is the lesson.
`compileScene.enforcement.test.ts` asserted `expect(panel).toContain("OBSERVED")`
against `SceneAdmissionPanel`'s literal source. Once the chip loop moved to its
owner, the only way to make that assertion pass again would have been to keep a
second copy of the loop in the panel — **the test would have been REQUIRING the
second ANSWER that §24 forbids.**

> A Sentinel that names a FILE instead of an INVARIANT defends the location and
> loses the law.

Fixed by pointing the invariant at its owner and adding a *separate* caller
assertion. Both facts are now guarded, and neither one pins a location.

---

## FINDING 2 — the "grain" was a screen door, and 7,900 assertions had no opinion

`public/wm/` did not exist. The Canon's §5 grain tile had never been built. What
the shell actually painted was two 3px orthogonal `repeating-linear-gradient`s —
a crosshatch at close to HiDPI pixel pitch, which moirés against the candle
canvas. That is **motion with no owner**, which the shell's own rules forbid.
There were also no key/fill lights at all.

`scripts/generate-grain-tile.mjs` now produces the tile: deterministic xorshift,
three octaves at lattice cell sizes 4/2/1 with amplitude halving, every lattice
indexed **modulo its period** so the tile wraps by construction rather than by a
blur applied afterwards.

### The two properties that are not cosmetic

**MEAN 128 is a truth constraint.** Under `mix-blend-mode: overlay` mid-grey is
the identity value. A tile whose mean sits off 128 lifts or crushes the luminance
of *the entire room*, uniformly and invisibly — it would read as a theme change
nobody committed.

Centring the source bytes is **not sufficient**, and this cost a detour. WebP's
lossy path is a transform codec with no promise to preserve a block's DC level:
perfectly centred input decoded at **128.32**. A third of a grey level, forever,
from a file nobody would reopen. Smallness is the danger — that is exactly the
size of defect that survives review permanently. The generator now biases the
source in a loop until the **decoded** mean is neutral, and the test measures the
shipped file the same way for the same reason.

Shipped: `256x256`, **7382 bytes**, decoded mean **127.9980**.

**SEAMLESS was proven by arithmetic, and the threshold was falsified, not
guessed.** The test compares mean absolute difference across the wrap junction
against interior neighbours. Fair objection: the dominant octave is pixel-scale
noise where neighbouring columns are uncorrelated by design, so does the
assertion distinguish anything, or does it pass for every input? It was run
against deliberately broken tiles:

```
shipped tile ............................ 1.18
shipped tile, last column inverted ...... 3.32
non-wrapping horizontal gradient ...... 255.0
```

Real seams land multiples away. Threshold 1.5. (The shipped tile is not at
exactly 1.00 because WebP encodes in macroblocks and has no notion of wrapping —
a property of the codec, not a seam.)

### The revive-attempt found the real hole

Six of the seven tests measure the FILE. **All six would still pass if someone
deleted the `background-image` from the shell tomorrow** — the tile would sit in
`public/` being perfectly seamless and perfectly neutral, and reaching nobody.
Same failure `surfaceElementReach` exists to catch, one layer down.

Measured, not assumed: **the full suite was green the entire time the crosshatch
was painting.** Nothing in ~7,900 assertions had an opinion about what the room's
grain actually was. The seventh test reads the shell, requires the tile
reference, and forbids `repeating-linear-gradient` from returning to the grain
block. Verified by breaking it (EXIT=1) and restoring it (EXIT=0).

---

## RECORDED HONESTLY, NOT OVERRIDDEN

**The Canon names the field `#07080a`; `WM.surface.deepest` is `#050506`.** Two
grey levels at these alphas is nothing, and a literal in one file would fork the
answer to "what colour is the field". If the Canon's value must win, **it wins by
changing the token** — not by one component disagreeing with the system.

**FIDELITY_CHIPS is a partial, not a closed gate.** The strip is out of every
`<details>` — which is what the reach test enforces — but it renders at
**y=1212**, below the first viewport. The cutover brief's PROVE criterion
("if risk info is only in a hover tooltip or hidden panel, fix it") and the
Canon's FIRST-VIEWPORT ACCEPTANCE list ("fidelity visible as role+source+asOf")
both point above the fold. Reach is now real; **placement is still open.**

### CORRECTION TO THE PARAGRAPH ABOVE — I had not measured it

The paragraph above was written from reasoning, not from the page, and the
reasoning was wrong. Leaving it visible and correcting it here, because a baton
that quietly edits out its own bad call teaches the next reader nothing.

Measured on `localhost:3000/command-deck`, viewport height **840**, `scrollY 0`.
The first viewport already carries the full role+source+asOf trio — every field
honestly degraded, because nothing has been observed yet:

```
role     FEED UNKNOWN                 y=30
         UNAVAILABLE / Market state UNKNOWN   y=252 / y=302
source   source unknown               y=448   [data-testid=hero-source-vendor]
asOf     2026-09-16 22:10:48 UTC      y=252
         Read 4m ago                  y=648
```

Owners are `HeroTruth`'s truth strip and the Market Object Passport bar.
`HeroTruth.tsx:432-436` already claims this trio in a comment; the claim
checks out against the rendered page.

**So the Canon's first-viewport requirement was never open, and
`SignalProvenanceStrip` is not the surface it was asking for.** The strip
answers a different question — *which scene-admission signal groups did the
compiler observe* (Session / Decision / Position / Orders / Broker link) — not
*how fresh and from whom is this reading*. Two owners, two questions, no
contradiction between them: `source unknown` and `SIGNALS OBSERVED · 1 / 5` are
consistent, so this is not the second ANSWER §24 forbids.

**FIDELITY_CHIPS is CLOSED.** Reach was the whole defect and reach is fixed.
Hoisting the strip above the fold would have pushed real market truth down the
page to satisfy a requirement that another owner already satisfies.

---

## STATE AT SEAL

- `main` @ `cd312d6`, pushed, **0 ahead**.
- **665 test files / 7971 tests passing.** `tsc --noEmit` **EXIT=0**. Both run
  UNPIPED — a pipe masks the exit code.
- Untracked and deliberately left alone: `scratchpad/`, baton
  `WM-PRO-SHIFT-2026-09-13-X-ROOM-MEASURE-AND-AUTHORITY.md`.
  `public/founder-room-sample.html` shows modified — written by a test run, not
  by hand.

### Live-verification status — read this before claiming anything about prod

**These commits are pushed but NOT LIVE.** `npm run deploy:cf` is Founder-blocked
(denied by the auto-mode classifier and not to be worked around), so
`wealthymindsetspro.com` reflects an **earlier deploy**. Every observation below
was made against the local dev server, and is labelled as such rather than
dressed up as production proof.

Verified on `localhost:3000/command-deck` by DOM probe:

```
grain     bgImage  url("http://localhost:3000/wm/grain-256.webp")
          blend    overlay      opacity 0.06      size 256px 256px
field     rgb(5, 5, 6) + two radial key/fill gradients
vignette  radial-gradient(at 50% 42%, transparent 42%, rgba(0,0,0,0.42) 100%)
strip     height 106 · insideDetails false · visible true · top 1212
```

Resource timing confirms the tile is actually served and actually fetched **by
the stylesheet**, not merely by a probe:

```
initiatorType css · responseStatus 200 · encodedBodySize 7382
```

7382 bytes matches the committed file exactly.

Screenshot taken. **The grain is not visible in it** — at 0.06 opacity under
overlay it sits below JPEG quantisation. That is expected, and it is recorded
here rather than papered over with a claim to have seen it. The evidence that the
layer composites is the probe and the 200 above, not the image.

---

## OPEN / BLOCKED — unchanged from F unless noted

- ~~**FIDELITY_CHIPS placement**~~ — CLOSED by measurement, see the correction
  above. The first viewport already carries role+source+asOf from another owner.
- **Decision Memory sealing** — zero production callers. Architectural. Surface
  it; do not rush-wire.
- **executionConnectivity** — orphaned, not a live defect; `/readiness`
  discloses it honestly.
- **Gate 4 responsive device proof** — BLOCKED: programmatic window resize does
  not take effect, `outerWidth` stays pinned.
- **`/journal` detail canvas** — BLOCKED: 0 journal entries.
- **Deploy** — BLOCKED on the Founder. Nothing sealed here is on prod.
