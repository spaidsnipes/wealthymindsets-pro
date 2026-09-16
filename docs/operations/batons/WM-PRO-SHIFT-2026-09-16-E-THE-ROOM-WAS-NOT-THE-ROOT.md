# WM PRO SHIFT — 2026-09-16 E — THE ROOM WAS NOT THE ROOT

Continues `WM-PRO-SHIFT-2026-09-16-D-A-COUNT-MAY-NOT-BE-A-SAMPLE-SIZE.md`.
Four commits land here:

| SHA | What |
|---|---|
| `fa19a24` | the position book had no protection grade, and the one grade it had was a literal |
| `d84bb5f` | the front door was never on the design system, and used green as identity metal |
| `8b24c90` | an OS room was painting itself in a palette the design system does not own |
| `b7c7ffd` | **the root: there are two colour owners, and the non-canonical one wins** |

Gates at seal: **659 files / 7919 tests PASS**, `tsc --noEmit` **EXIT 0**.
Both run UNPIPED, via `./node_modules/.bin/` — `npx` is broken on this machine
and reports exit 0 while failing.

---

## DEPLOY STATE — READ THIS BEFORE BELIEVING ANY SCREENSHOT

All four commits are on local `main` and **NOT PUSHED** (`ahead 4`) and **NOT
LIVE**. Anything observed at `wealthymindsetspro.com` reflects an earlier deploy
and says nothing about this work.

Every live observation below was taken on **local dev** (`localhost:3000`) and is
labelled as such. Nothing here is claimed PROVEN in production.

---

## THE FINDING — `b7c7ffd`

This is the one that matters, and it arrived by demoting the two commits before
it.

WM Pro has **two colour owners**, and they have never referenced each other:

| Owner | Information | Structure |
|---|---|---|
| `src/lib/design/wmTokens.ts` — canonical | **IVORY** `#ede6d3` | **BRASS** `rgba(139,106,41,…)` |
| `tailwind.config.ts` → the `wm.*` scale | **SLATE-BLUE** `#E8EDF3` / `#8B95A5` / `#5A6575` | neutral grey `#222222` / `#2D3748` |

The slate one is not a leftover. Measured this shift:

```
1599  text-wm-text
 554  border-wm-border
 328  bg-wm-surface
 222  text-wm-red     218 text-wm-green    176 text-wm-gold
  93  bg-wm-dark       86 text-wm-blue      64 bg-wm-black
```

≈3,300 painted class instances. And `body` inherits `#E8EDF3`, confirmed live on
dev — so **the product's default text colour comes from the non-canonical owner
on every route**. The ivory sanctuary is the minority palette in its own house.

### Why this demotes the two commits before it

`d84bb5f` and `8b24c90` removed slate from the `/login` and `/heatmaps` FILES.
They did not remove it from those SCREENS, because the Tailwind classes still on
those screens paint from the other owner. Both commits were real work on real
defects — `/login` genuinely used `#00D4AA` (`wm-green`, a MARKET SEMANTIC token)
as identity metal, including a green "safe" shield, which §9 forbids outright —
and both were **treating a symptom**. That is recorded in the commit message of
`b7c7ffd` rather than left for someone else to discover.

### Why the reconciliation did NOT ship

Reconciling repaints the entire product in one commit. The room interiors sit
behind **client-side** auth (all routes return 200, then redirect), so the change
**cannot be visually verified from here** — crossing that auth boundary is not
available to this seat. A whole-product repaint that nobody has SEEN is exactly
what "repo green is not enough" exists to stop.

So what shipped is the **fence**, not the cure:

- the divergence is named in `tailwind.config.ts` itself, where the next person
  to edit it will read it;
- it is pinned in `src/lib/design/tokenOwnership.enforcement.test.ts`;
- CI fails if a **new** foreign colour is added to the scale (**failure-proven**:
  injected `teal: "#00FFD5"`, watched it fail, restored);
- CI also fails if slate is promoted **INTO** the canon to make the two agree
  cheaply. The repair direction is one-way.

**Healing is not hiding the wound.**

### The decision this leaves open — FOUNDER

The structural-neutral half of the map is written into the sentinel docstring and
is the safe half (near-identical luminance, unambiguously on-canon):

```
wm.black   #000000 → WM.surface.deepest     wm.text       #E8EDF3 → WM.text.hero
wm.dark    #0A0A0A → WM.surface.deep        wm.text-muted #8B95A5 → WM.text.muted
wm.surface #111111 → WM.surface.mid         wm.text-dim   #5A6575 → WM.text.dim
wm.card    #161616 → WM.surface.raised      wm.border     #222222 → WM.border.line
wm.muted   #2D3748 → WM.surface.raised      wm.gold       #F0B429 → WM.gold.hero
```

The semantic hues (green/red direction, blue/purple categorical) are a **separate
decision with separate evidence** and are deliberately not in that map.

**What is needed to close it: an authenticated pair of eyes on the seven OS rooms
after the swap.** Not approval-in-principle — observation.

---

## THE OTHER THREE

### `fa19a24` — protection grade on the position book

`selectProtectionState` (§7, "PROTECTION IS A STATE, NOT A LINE") was already on
screen: `ContractStance` has rendered it on `/paper`'s OPTIONS blotter since
2026-09-08. **This commit does not get that credit, and the first draft of it
claimed it.** The claim was written into three docstrings before a consumer grep
disproved it; all three were rewritten to say so explicitly, and a test that
passed vacuously against a stale ledger entry was deleted rather than kept as
decoration.

What was actually closed, after the correction:

1. the equity/futures **position book** had no grade at all;
2. every existing caller passes `brokerAckedProtectedQty: 0` as a **literal**
   (`/paper` line ~1469), so the grade was decided before the book was read and
   no real stop could ever move it. `selectPaperProtection` counts the actual
   working stops: type ∈ {stop, stop-limit}, status non-terminal, side closes the
   position. A resting limit on the closing side is a TARGET, not protection, and
   counting it would let a profit objective masquerade as a floor — which reads
   in the reassuring direction and is therefore the dangerous one.

Mounted ABOVE the recovery/empty/table ternary, so it degrades with the book
instead of vanishing exactly when a trader most needs it. Guarded by a test that
asserts that mount ORDER, not merely that the component exists.

### `d84bb5f` — the front door

`/login` was never migrated. Private palette (`#070A0F`, `#0A0F17`, `#8B95A5`,
`#C5CDD8`, `#5A6575`, `#3A4250`) and `#00D4AA` as the identity accent. Measured
on dev at 1512×900: **18 elements painted `rgb(0,212,170)`** on the first screen a
trader ever sees. After: `tealRemaining: []`, verified live on dev.

The green shield on "Secured with…" is the §9 violation in miniature — a
pre-attentive safety claim made before anything has been evaluated.

Signup terms line moved `text.dim` (2.53:1, below AA) → `text.muted` (5.35:1).
Measured, not assumed. One "below AA" hit in the sweep (`Sign In →` at 1.0) was a
**measurement artifact** — the button paints via `backgroundImage`, so the probe
read the page background and compared `#050506` to itself. Recorded because the
artifact is what surfaced the real `text.dim` problem.

F9 sentinel: `src/lib/design/frontDoorPalette.enforcement.test.ts`.

### `8b24c90` — `/heatmaps`

39 foreign hex values, zero references to the design system, inside a room that
`MainLayout` mounts in the sanctuary shell. Same slate palette as the old door,
one route over.

`#4FA3E0` was the worse offence: not data, but the active-view chip, the section
heading and the current-price marker. **A second identity metal in a second room
is a second visual brain.**

Two families deliberately did **not** move:

- **eleven sector hues** — telling XLK from XLE genuinely needs hue; flattening
  to brass buys tidiness with unreadability;
- **bull/bear direction colours** — §9 permits green for DIRECTION and forbids it
  as a SAFETY claim. These say "up", not "safe".

Two accessibility suites pinned the focus ring and the unavailable-tile fill to
the old literals. They now assert the **requirement** (3px solid identity metal;
a neutral provably not green-dominant) instead of freezing values the system no
longer owns.

---

## TRAP FOR THE NEXT SEAT

A scripted regex substitution across `heatmaps/page.tsx` silently mangled **four
pre-existing template literals** by matching across their boundaries — e.g.
`? "—" : \`${p >= 0 ? "+" : ""}\`` became syntactically valid-looking garbage.
`tsc` caught it. All four were restored **byte-identical** and verified absent
from the diff.

If you bulk-substitute in a TSX file: diff every `+` line that does not contain
the thing you were adding. That check is what found it.

---

## STATE AT SEAL

- `main` **ahead 4**, unpushed, undeployed.
- 659 files / 7919 tests PASS. `tsc --noEmit` exit 0.
- Untracked and deliberately not committed: `scratchpad/` (one-shot migration
  script), `WM-PRO-SHIFT-2026-09-13-X-ROOM-MEASURE-AND-AUTHORITY.md`.
- Dev server on `:3000`, owned by the preview harness.

### Do not repeat

- `npx` is broken here. Use `./node_modules/.bin/…`.
- `public/founder-room-sample.html` renders WITHOUT the app stylesheet. It is not
  a faithful proof channel. Navigate the real route.
- A red overlay on a dev screenshot is not automatically transient. It lives in a
  `NEXTJS-PORTAL` shadow root that `document.body.innerText` does not traverse —
  so "the text looks right" does not clear it. Run `tsc`.
