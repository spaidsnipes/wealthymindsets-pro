# WM PRO — SHIFT BATON F · 2026-09-16

## THE QUIET SCENE AND THE OTHER OWNER

Continues baton E (`WM-PRO-SHIFT-2026-09-16-E-THE-ROOM-WAS-NOT-THE-ROOT`).

---

## CORRECTION TO BATON E

E sealed saying **"Four commits land here · main ahead 4 · 659 files / 7919
tests."** All three numbers were stale before the ink dried. A fifth commit
(`e28d495`) landed in the same stretch and was never written back into it.

Recording this rather than quietly fixing E, because the failure mode is the
one the batons exist to prevent: a handoff document that is *almost* current is
worse than an absent one, since the next reader trusts it. E's SLICE and
FINDING sections remain accurate. Its STATE AT SEAL block does not. Read it
from here.

---

## WHAT LANDED

| commit | slice |
|---|---|
| `e28d495` | the canonical ramp rendered "we do not know" in the colour that cannot be read |
| `891d039` | the other colour owner had the same defect, at 622 call sites |
| `cd17845` | `DONE` was the only scene that stopped telling you what it does not know |

All pushed. `main` is clean.

---

## FINDING 1 — the bottom rung was unreadable in BOTH owners

`e28d495` closed it in `wmTokens.ts`; `891d039` closed it in
`tailwind.config.ts`. The same defect, in the two files that disagree about who
owns colour, found by measuring instead of reading.

Canonical (`WM.text.dim`, #55503f) against the five WM surfaces:

```
2.53 · 2.44 · 2.30 · 2.10 · 1.86
```

Second owner (`wm.text-dim`, #5A6575) against its own six:

```
3.55 · 3.35 · 3.19 · 3.06 · 2.69 · 2.03
```

Below AA everywhere in both. Below even the 3:1 non-text floor on the lightest
surface in both. Between them they carried **667 text call sites** — 45
canonical, 622 Tailwind — and not one was a divider.

**The part worth carrying forward is what the worst of them were saying.**
Unknown fidelity. `NO_MEMORY`. Zero observed events. `CHANNELS UNAVAILABLE`.
ATHOS's `Quiet` verdict. SmartMoney's `neutral` signal. Every one of those is a
statement about *absence* — and absence was systematically assigned the least
readable colour the system owned, in both palettes independently. That is §14.1
wearing a palette: a trader who cannot read "we do not know" reads the space as
calm.

Neither could be fixed by nudging. A `dim` clearing AA on the lightest surface
needs relative luminance 0.2644; `muted` sits at 0.2256. The bottom rung would
have to out-shine the rung above it. Four AA-legal text weights do not fit on
near-black — arithmetic, not taste. So the canonical bottom rung was declared
**non-text** (`TEXT_ON_SURFACE.dim = []`) and the Tailwind one was **moved onto
the canonical `muted`**.

### The trap in the reconciliation map

`tokenOwnership.enforcement.test.ts` carried a mapping written last shift:

```
wm.text-dim  #5A6575  →  WM.text.dim  #55503f
```

Bottom rung to bottom rung, matched **by name**. `WM.text.dim` is itself
non-text. Executing that map would have carried the defect across the
reconciliation intact and produced a "completed" migration with the same
unreadable colour at the end of it.

**Rungs match by measured legibility, not by position in the ramp.** Corrected
in place with the reasoning kept, because the wrong version is the instructive
one.

### Reconciliation status

The two-owner split is now **14 entries**, down from 17 (`text-dim` closed;
the count in E was before this). `text-dim` jumped the queue because it was the
only entry whose current value was an *accessibility defect* rather than a
style disagreement — pinning it as "known debt" would have made the ownership
sentinel the thing keeping an unreadable colour alive.

Open, asserted as an exact list so it can neither grow nor silently shrink:

- `text-muted` on `bg-wm-muted` — 3.96
- `text-dim` on `bg-wm-border` — 4.18
- `text-dim` on `bg-wm-muted` — 3.15

23 background uses between them, bars and chips, not content surfaces. Named,
not excused.

---

## FINDING 2 — the scene that got quiet by forgetting

`compileScene.admissionFor` admitted `HUMILITY_PANEL` in **9 of 10 scenes**.
The exception was `DONE`, under the note §18 *"The screen gets quiet."*

DONE is the scene that tells a trader the day is answered. It is therefore the
single worst place to drop the blind-spot disclosure, because there the absence
does not read as silence — it reads as *there are none*. The unknowns do not
end when the receipt is written; a flat book confirmed by the one source WM
could reach is still a book read from one source.

The compiler already had this right four cases up. `DEGRADED`'s own comment
says it outright: *"what survives is the way OUT and the admission that we do
not know."* The defect was applying that reasoning to failure and forgetting it
at completion.

**Quiet is a volume, not an omission.** DONE now admits the panel; rendering it
small there is the surface's job, the same as the receipt.

---

## THE BIGGER GAP THIS OPENED — read this before the next slice

`HUMILITY_PANEL` is now admitted in **10 of 10** scenes. It has **zero
renderers in the entire repo.**

The compiler states a law — humility may never be withheld, in any scene — and
every surface withholds it. `SceneAdmissionPanel` has the human label ("What we
do not know") and a signal-provenance block that is *arguably* a partial
instance, but it is not routed through admission and no route declares
`HUMILITY_PANEL` in its `governed` list. On /command-deck it renders as a
dashed chip under **NOT GOVERNED HERE**.

`PROTECTION_GRADE` is in the same family: admitted in 4 scenes, rendered only
on /paper.

**Do not close this by adding `HUMILITY_PANEL` to /command-deck's `governed`
list.** It is admitted unconditionally, so admission over it can never withhold
it, and routing it through would move the §10 meter from 1/12 to 2/12 without
the OS gaining any power at all. `SceneAdmissionPanel`'s own docstring was
written to kill exactly that class of overclaim. The honest slice is a real
renderer on a route with a real book — /paper, which reads positions, working
orders and a persistence result, and currently has no humility surface at all.

---

## PHASE 8 NOTE — why the third slice is not another sentinel

Six consecutive commits had been palette-and-sentinel work. That is the exact
shape Phase 8 names `TRANSFORMATION_STALLED`: *"three truth/support atoms
without scene movement or materially sharper root evidence."*

`cd17845` is the deliberate pivot. It is a change to what the OS **allows**,
found by counting the compiler's own branches rather than by reading its prose.
The stall rule is doing its job — it was the thing that redirected the search
away from the seventh sentinel.

---

## WHAT IS STILL NOT PROVEN

Unchanged and still honest: **all seven OS rooms are behind client-side auth.**
Every route returns 200 and then redirects in the browser. None of this shift's
work has been SEEN. `/login` is the only visually-verified surface.

Phase 9 is explicit that repo green is not enough, and I will not forge a
session to manufacture a screenshot. Everything above is proven by measurement
and by mutation, which is a real standard — and it is not the human standard.
Say so plainly to the Founder; do not let the green suite imply otherwise.

---

## FAILURE-PROOF LEDGER

Every assertion added this shift was mutated and observed to fire:

| mutation | fired |
|---|---|
| darken `WM.text.body` | 3 of 4 legibility assertions |
| reintroduce one `WM.text.dim` text use | call-site guard, named `file:line` |
| revert `wm.text-dim` to slate | AA test + divergence test |
| brighten `wm.text-dim` past `text-muted` | monotonic + chip-debt tests |
| re-add raw `#5A6575` at any call site | slate guard, named `file:line` |
| restore DONE's old admission list | humility law, named the scene |

All mutations reverted; trees verified clean by diff afterwards.

---

## STATE AT SEAL

- `main` at `cd17845`, **pushed**, working tree clean.
- **660 files / 7929 tests PASS.** `tsc --noEmit` exit 0.
- Untracked and deliberately so: `scratchpad/`,
  `WM-PRO-SHIFT-2026-09-13-X-ROOM-MEASURE-AND-AUTHORITY.md`.

### Next slice, sharply specified

1. A real `HUMILITY_PANEL` renderer on **/paper** — the route with an actual
   book. Not on /command-deck, for the reason above.
2. Rooms still minting foreign palettes: `/morning-prep` 19, `/paper` 11,
   `/journal` 6, `/command-deck` 4; non-OS `/radio` 33, `/shop` 29, `/tv` 21,
   `/profile` 18, `/lounge` 17.
3. The 14-entry owner reconciliation. Needs authenticated eyes on seven rooms
   before it lands, not more measurement.

### Do not repeat

- Carried from E: `npx` is broken here — use `./node_modules/.bin/…`.
  `public/founder-room-sample.html` renders without the app stylesheet and is
  not a proof channel.
- A comment-stripping guard must blank comment characters **in place**, not
  delete the lines. Deleting them shifts every subsequent line number, so the
  failure message points at the wrong code. Cost one debug cycle here.
- Prose recording *why* a colour was retired will trip a naive grep guard for
  that colour. Strip comments before scanning, or the sentinel fires on its own
  documentation.
