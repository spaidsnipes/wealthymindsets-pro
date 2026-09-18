# THE DOOR WAS BUILT TWICE BEFORE IT OPENED

**Block:** `42a495e4` → `f0cdf666` (six commits)
**Founder directive:** *"build asset 3 … there should also have a profiles drop
down for all the different vps and the profiles i created, the inventions …
lets make this beautiful os wm pro was made to be"*

---

## WHAT SHIPPED

| SHA | Atom |
|---|---|
| `42a495e4` | Canon Asset 03 — Aggression vs Response, as a VIEW on every asset class |
| `951de52d` | Effort-concentration gate publishes its own inability to answer |
| `ac779bef` | The Profiles menu — one door in front of all four profiles |
| `0ca2c7c2` | **Repair 1** — the menu was pinned; it had shipped behind a closed lid |
| `f0cdf666` | **Repair 2** — 24 Tailwind classes that painted nothing, plus a gate |

---

## THE LESSON THIS BLOCK IS NAMED FOR

The Founder asked for one thing — a drop-down that enumerates the inventions —
and it took **three commits** to actually put it in front of him. Both failures
were invisible to CI. Both were found by looking at the running product.

### Repair 1 — a catalogue behind a closed lid catalogues nothing

`ac779bef` passed 9104 tests, `tsc` clean, deployed green. The chip did not
exist on the live chart. It had been mounted inside the second toolbar row,
which is gated by `studyToolsOpen` and defaults to **false**.

That is not a new failure. It is exactly what the Founder reported once already
— *"the wm pro smartmoney button was taken from the charts and i dont know
why"* — when `e3ce41f` moved that row behind the same lid. The comment
explaining that incident sat four lines above the code that repeated it.

And it bit this menu harder than it bit that button. Hiding Smart Money hid a
panel the trader already knew existed. This menu's entire job is to let a
trader ENUMERATE what the product owns. You cannot discover, from a shut
drawer, that the drawer is where discovery lives.

**The invariant is now positional, because the bug was positional.** The
sentinel asserts the mount index precedes `studyToolsOpen && <div`, and that
`ChartToolbar` renders `{profilesSlot}` after `wm-chart-toolbar-pinned`. A
slot accepted and never rendered is the same silence with extra ceremony.

### Repair 2 — a class that names a token that does not exist paints nothing

With the chip finally pinned, the menu opened over the chart and the candles
read straight through it. `bg-wm-panel` computes to `rgba(0, 0, 0, 0)`. There
is no `panel` key in the `wm` scale, so Tailwind emitted no CSS: no error, no
warning, no build failure, no console message. I invented the token myself.

A repo-wide audit against the real scale found five more invalid names. The
worst were not on the chart at all — they were on `/paper`, where **eighteen**
`role="note"` risk disclosures and their `bg-wm-amber/5` caution blocks
rendered in ordinary body colour. The sentences saying the fill was not real,
the cancel could not have raced a fill, the short located no shares: none of
them looked like cautions.

That is a truthfulness defect wearing a styling defect's clothes. A caution
that does not look like a caution is a caution the trader reads as a fact.

`/paper` now uses `WM.state.watch` by inline style — which is the answer the
file's own `reachNote` comment had already written down, and already used, in
exactly one place. Knowing the trap in prose did not stop eighteen instances
of it shipping in the same file.

---

## THE GATE THAT MAKES REPAIR 2 UNREPEATABLE

`src/lib/design/wmColourClassesExist.sentinel.test.ts` parses the `wm` scale
out of `tailwind.config.ts` and fails on any `bg|text|border|…-wm-<name>` in
`src/` naming a key the scale does not carry.

Three decisions worth keeping:

1. **The allowed set is parsed, not listed.** A hardcoded list would be a
   second source of truth and would go stale the first time someone adds a
   colour — turning the gate into a thing people delete rather than trust.
2. **Comments are stripped first.** The prose explaining this defect must quote
   the dead class names. A gate that forbids documenting its own subject
   matter gets deleted, not obeyed. (Verified: it flagged this file's own
   explanation before `stripComments` was added — which also proved detection
   works.)
3. **A guard on the guard.** A second test asserts `amber` / `panel` /
   `yellow` / `bg` are still ABSENT from the scale, so nobody closes a future
   failure by adding the token instead of fixing the class.

---

## LIVE OBSERVATION

`https://wealthymindsetspro.com/charts?symbol=BTC`.

**`0ca2c7c2` — PROVEN.** Queried live: `chipFound: true`,
`insidePinnedCluster: true`, **`studyRowPresent: false`**. The lid is closed
and the catalogue is still reachable — which is precisely the thing that was
false before this commit.

Menu opened by real click: header `Profiles · 4 of 4 can draw now`, rows
`FIXED_RANGE:READY · SESSION:READY · DELTA_VP:READY · ABSORPTION:READY`,
Delta + VP carrying its `BOX` pill and *"drag a box on the chart to choose the
range"* — the gesture published rather than assumed.

**The Repair-2 defect was observed in the same sitting**, on the then-current
build: `getComputedStyle(panel).backgroundColor === "rgba(0, 0, 0, 0)"`, with
the four rows visibly overlapping the candles and the price ladder.

**`f0cdf666` — PROVEN.** After deploy, the same query on the same surface reads
`rgb(17, 17, 17)` — `#111111`, which is `wm-surface` in the scale. The panel is
opaque and the menu is legible against the chart.

Both arms of that measurement matter together. The BEFORE reading is what makes
the AFTER reading mean something: a transparent panel and an opaque one are the
same DOM, the same test result and the same commit status. Only the computed
style told them apart.

Asset 03 was live-observed separately (see `CANON-VIEW-BUILD-ORDER`), including
both arms of the effort-concentration gate in one sitting — `NO ZONE QUALIFIED`
and then the window reporting it could not answer at all. Seeing both arms
matters more than either alone: it proves the gate is mechanical, not stuck.

---

## GATES

`./node_modules/.bin/tsc --noEmit` — no output.
`./node_modules/.bin/vitest run` — **742 files, 9108 passed, 2 skipped**, unpiped.

---

## WHAT THE NEXT SESSION PICKS UP

1. **Asset 05 — Big Trade Intelligence**, next in the documented build order.
   Needs a large-print detector over the tape and a session-relative size
   percentile; renders the named missing-input state where there is no
   per-trade tape. The mockup's left rail is navigation invention — ship only
   sections with owners.
2. **Asset 06's honest gap is still open.** Absorption is a full-tab sibling of
   `Chart`, so the candles are not on screen beside it. The Founder's second
   acceptance question — *"is it useful while candles remain visible?"* — is
   answered PARTIAL, and saying so is not the same as fixing it.
3. **Deferred, needs the Founder:** whether plain crypto symbols should prefer
   `/api/exchange` (Coinbase) over Alpaca's thin keyless venue. Broad blast
   radius; the 88%-effort-concentration reading is a direct consequence.
4. **Still blocked, unchanged:** Gate 4 responsive proof (`outerWidth` pinned
   under programmatic resize); `/journal` detail canvas (0 entries); the
   Liquidity Weather depth family (no licensed Level 2 provider). Assets 19 /
   20 / 08 stay gated behind that provider — building them now would be
   decoration.

---

## THE STANDING RULE THIS BLOCK EARNED

Two defects in one menu, both green in CI, both found only by looking.

**A test proves the code does what it says. Only the running product proves the
trader can see it.** Neither repair was a logic error — one was a coordinate in
the component tree, the other a string that matched nothing. Both were the kind
of thing a suite is structurally unable to notice.
