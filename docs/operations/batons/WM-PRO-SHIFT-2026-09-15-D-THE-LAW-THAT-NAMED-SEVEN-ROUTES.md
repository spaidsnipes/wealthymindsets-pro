# WM PRO — BATON 2026-09-15-D · THE LAW THAT NAMED SEVEN ROUTES

`0aa0877` → `8e74773` (3 commits). Same rubric as baton C: every atom is
ASSEMBLY, and each had to satisfy one of two tests — **either** two owners were
contradicting each other on one screen and now do not, **or** something already
built became visible.

---

## THE THREAD THAT RUNS THROUGH ALL THREE

Baton C's thread was *a surface answered a question it was not the owner of*.
This block's thread is one layer up:

> **A law was written at the scope of what had been measured, and then the
> scope was mistaken for the law.**

Each of the three defects survived not because nobody had thought about it, but
because the instrument pointed at it had been aimed at a subset — and a green
subset reads exactly like a green whole.

| atom | the law that existed | the scope it was actually enforced at |
|---|---|---|
| zz | "a room publishes its standing upward" | two rooms, both hand-named |
| aaa | `payable === resolved + missing + warn` | never written down at all |
| bbb | "one room, one landmark" | seven `FOUNDER_ROOM_ROUTES` |

---

## zz · THE FRAME WAS LESS CONFIDENT THAN THE ROOM INSIDE IT — `62f2909`

Measured live on `https://wealthymindsetspro.com/charts`: the room rendered
`DECISION … WAIT`, `9 unpaid evidence nodes` and `Right-of-way is withheld`
while the masthead directly above it read `EVIDENCE DEBT UNKNOWN / no ledger
compiled` and `RIGHT OF WAY UNKNOWN / no permission reading`.

One screen answered its own question twice, in two different voices. **False
humility is the mirror of an overclaim, not a safe default** — a masthead that
says UNKNOWN above a room that knows is as wrong as one that guesses.

Root cause: `/charts` never called `usePublishOsStanding`. The obvious repair —
pasting the deck's three-line derivation into `ChartsDashboard` — would have
given every room its own author of the null-vs-zero rule, which is the shell
defect one layer down. So the derivation was extracted to
`src/components/os/standingFromOneStory.ts` as its one owner, and the Sentinel
now forbids any room from re-deriving `openEvidenceItems:` or
`rightOfWayResolved:` inline.

---

## aaa · THE NINTH NODE WAS IN THE DENOMINATOR AND IN NO NUMERATOR — `ef0f344`

Measured live on `/command-deck`, **two lines apart inside the same card**:

```
EVIDENCE DEBT   0 of 9 paid
8 evidence nodes unpaid: regime + direction +6
```

Zero paid plus eight unpaid is eight, not nine. LIVING-PIXEL LAW — that `9` had
no owner anywhere on the screen.

`computeEvidenceDebt` returned `total: nodes.length` while its own loop carried
the comment *"WATCH is neither paid nor blocking — not counted"*. A WATCH node
therefore sat in the denominator and in none of the three buckets that could
ever explain it. The same arithmetic made `resolved === total` **unreachable**
for any chain holding a WATCH node, so `CommandContextRibbon`'s
"authorization complete" branch was dead code on exactly the chains closest to
complete.

`total` became `payable` — the nodes carrying a gradeable indicator, and so the
only honest denominator for "X of N paid". The ungradeable remainder is *named*
`watch` rather than discarded, because an unexplained gap between chain length
and ledger size is how this defect stayed invisible.

A rename, not a redefinition, on purpose: silently redefining `total` would have
left every existing reader looking correct while meaning something new. The
rename made the compiler walk all eighteen call sites.

```
payable === resolved + missing + warn
payable + watch === nodes.length
```

**A FIXTURE THAT OPTED OUT OF THE TYPE.**
`noThesisIsNotNoContradiction` used `as unknown as` on its debt fixture. `tsc`
could not see the stale `total` through the cast; only the runtime assertion
caught it. Changed to `satisfies`. *An `as unknown as` on a test fixture is a
fixture that has stopped proving the thing it names.*

---

## bbb · FIVE PAGES DREW A SECOND `<main>` — `8e74773`

Measured live on `/nectar/SPY`:

```
{ testid: "os-room", ancestorMains: 0 }
{ testid: null,      ancestorMains: 1 }
```

A `<main>` inside a `<main>`. Invalid HTML, and *"take me to the main content"*
is handed two answers to a question defined by having one.

`oneRoomHasOneLandmark` already existed and already enforced exactly this. It
derived its room list from `FOUNDER_ROOM_ROUTES` — seven routes. But
`MainLayout` wraps **every** non-auth route in `<main className="wm-app-surface">`.
Five pages lived outside the seven and every one of them drew a second `<main>`:
`/ai-bot`, `/lounge`, `/nectar/[symbol]`, `/proof-lane`, `/readiness`.

The law now walks every `page.tsx` under `src/app`, minus `PUBLIC_AUTH_PATHS`.

**WHY ONLY `<main>` WIDENED.** The `<header>`/`<aside>`/`<footer>` half stays
scoped to founder rooms. Its justification is the second shell that actually
grew in the founder frame; a card's own `<header>` inside `<main>` maps to no
landmark role at all, and claiming the wider law for surfaces nobody has
measured would be the overclaim this codebase keeps naming. `<main>` needs no
such measurement — *both* frames draw one, unconditionally.

`/reset-password` keeps its `<main>` and is excluded **by name**, because
`MainLayout` genuinely returns public auth paths unframed. That exemption is
pinned to its cause by a test, so it cannot outlive the reason.

`/nectar/[symbol]` also dropped `100dvh` → `100%`: a full viewport measured
against the SCREEN while living in a room that already begins below a masthead.

The same probe found the same false-humility defect as atom zz on that page, so
it took the identical cure and is now the **third** publishing room.

**`/journal` deliberately does NOT publish**, though it also holds a canvas VM.
Its VM is compiled for the *selected past entry's* symbol, so publishing would
make the masthead assert a standing about an instrument the trader is merely
reviewing, and it would jump as entries are clicked. `/nectar/[symbol]` is
unambiguous because the room's entire subject **is** that one symbol.

---

## SURFACED, NOT WIRED — TWO OWNERS OF "FIDELITY"

The masthead reads `FEED UNKNOWN` on every route, while `/nectar` itself
measures `5 CHANNELS · 5 stale · none observing`. This is **not** an unbuilt
feature: `compileFeedStanding` in `src/lib/os/osChrome.ts` is fully written,
carries 20 test cases, and is already wired into `WMOperatingSystem.tsx:290`.
It has simply never had a room supply a `FeedObservation`.

It is not wired here on purpose. Supplying `fidelity` requires back-translating
`CANONICAL_FIDELITY_LABELS` — already owned by `priceSourceBadge` in
`src/lib/priceSource.ts:101` — into `REALTIME` / `DELAYED` / `SNAPSHOT`. That
would create a **second owner of the fidelity vocabulary**, which is the precise
defect class the three atoms above spent their entire effort removing. Wiring it
fast would trade a visible blank for an invisible contradiction.

**The honest next step** is to decide which module owns the fidelity vocabulary
and have the other consume it — not to add a translation layer between two
peers. That is an architectural decision, and it is recorded here rather than
taken quietly.

---

## GATES

| gate | result |
|---|---|
| `./node_modules/.bin/vitest run` | **EXIT=0** — 647 files / 7716 tests |
| `./node_modules/.bin/tsc --noEmit` | **EXIT=0** |

Test count moved 7686 → 7716; the widened page scan in `bbb` is the difference.

---

## THE ONE BLOCKER THAT MATTERS

**`npm run deploy:cf` is denied by the Claude Code auto-mode classifier.** This
is the third consecutive block. All three commits in this baton are pushed to
`main` and **none of them is live** — production still serves `0aa0877`.

Everything above was measured on production BEFORE the fix and proven by test
after it. Nothing in this baton claims post-fix live observation, because none
was possible. **Live verification is owed on all three**, specifically:

- `/charts` masthead + rail must stop reading `UNKNOWN` above a compiled room
- `/command-deck` card 03 must read `0 of 8 paid` above `8 evidence nodes unpaid`
- `/nectar/SPY` must report exactly one `<main>`, and publish its standing

Screenshots are mandatory to close these. Until the deploy runs, they stay open.

---

## STANDING BLOCKERS — UNCHANGED, DO NOT RE-LITIGATE

- Live VP panel mount — retired by spec `89a350e`
- Decision Memory sealing — zero production callers; architectural, surface only
- `executionConnectivity` — orphaned; not a live defect, `/readiness` discloses it
- Gate 4 responsive proof — programmatic resize does not take effect
- `/journal` detail, `/proof-lane` — 0 entries
- Delta Bubbles / Live VP raster — no per-trade tape on the free tier
- `/paper` blotter — 0 orders
