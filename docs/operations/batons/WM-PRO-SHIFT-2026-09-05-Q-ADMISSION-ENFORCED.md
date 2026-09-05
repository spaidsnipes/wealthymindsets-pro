# WM Pro — Shift Q — ADMISSION, ENFORCED

**Date:** 2026-09-05
**Founder call:** *"we need to see the new os"*
**Commits:** `c458adb` → `6142043` → `7721cc2` (all on `main`)
**Parent:** `09e0696` (the shift-P baton)
**Predecessor:** `WM-PRO-SHIFT-2026-09-05-P-SCENE-COMPILER.md`

---

## 0. One-paragraph handoff

Shift P built the scene compiler and put a disclosure panel on `/command-deck`.
Shift Q found that the compiler's verdicts were **announced by one surface and
obeyed by none**, and closed that defect in three places. The OS now refuses
things. `/command-deck` governs **1 of 12** surface elements through admission
— a small number, disclosed on screen deliberately, and the honest measure of
how much of §10 is actually built. Eleven §22 revive-attempts were run across
the block; all eleven were caught, three of them only after a lock was made
stronger than the one I first wrote.

---

## 1. The defect family: "announced but not obeyed"

Shift P shipped a compiler that decides what may be on screen, and a panel that
prints its decisions. What it did not ship was anything that **honours** them.
That produces a specific and nasty failure: a screen that states a refusal and
then displays the refused thing. It is worse than shipping no compiler, because
a panel reporting refusals nothing enforces is not disclosure — it is decoration
(§H19 dead vocabulary), and it argues the exact opposite of what it claims.

The same shape appeared three times, in three different owners:

| # | Who overclaimed | The lie on screen | Closed by |
|---|---|---|---|
| 1 | The **surface** | Panel said "Withheld · One story"; the One Story strip rendered thirteen lines above it | `c458adb` |
| 2 | The **panel** | "Withheld · 9" in CLOSED, when the route routes exactly **one** element through admission | `6142043` |
| 3 | **Nothing at all** | `admitsAmbient` computed since day one, printed in every scene, with zero production readers — §9 INTERRUPTION LAW enforced by no one | `7721cc2` |

Instance 2 is the one worth remembering. It was *introduced by the fix for
instance 1*: the moment the gate existed, the panel's nine strike-throughs
started flattering it, implying WM has a Flatten control and a Receipt sheet on
this route and is choosing to withhold them. It has neither. **A fix that makes
an adjacent claim newly false is not finished.**

---

## 2. What shipped

### `c458adb` — `SceneAdmits`: the surface obeys

One gate component. Takes the whole `SceneCompilation`, never a bare `admits`
array — passing the array would let a caller hand-build a list and call it
admission; taking the compilation means the value can only have come from
`compileScene`.

Withholds **silently** (renders `null`, leaves no "hidden by scene" stub),
because §10 says a scene changes what is ADMITTED, not what is collapsed. That
silence is honest *only* because `SceneAdmissionPanel` accounts for the removal
on the same screen. A surface adopting the gate without the panel would leave
the trader unable to distinguish "WM has nothing to say" from "WM is refusing
to say it" — different claims. The sentinel enforces both directions.

### `6142043` — `governed`: the panel may only refuse what the route governs

A caller now **declares** what it routes through `SceneAdmits`, and the verdict
splits three ways instead of two:

```
ADMITTED      governed, scene allowed it     → it is on this screen
WITHHELD      governed, scene removed it     → a real refusal
NOT GOVERNED  compiled, not applied here     → an opinion, not a power
```

`governed` is **required, not optional-with-a-default** — a default is precisely
how the first overclaim happened. Ungoverned elements are disclosed and counted,
never struck through and never silently dropped. The panel states:

> *"The scene governs 1 of 12 surface elements on this route."*

**That number is meant to be uncomfortable, and it is meant to rise.** It is the
§10 build-completeness meter, not decoration. See §5 for what raising it
honestly requires.

### `7721cc2` — `SceneAdmitsAmbient`: §9 made binding

§9 is a sentence with teeth: *"Only capital truth and material invalidation may
take the room. Academy may not. Nectar may not. A beautiful card may not."*
`/command-deck`'s Learning Genome is the one surface on this route that the law
names **by category** — a backward-looking Academy diagnostic — so it is the one
that carries the gate.

Ships as a sibling of `SceneAdmits` in the same file: one authority, not a
seventh owner (§24). A second *caller* is correct; a second *implementation*
would be a seventh owner in disguise.

**HONEST SCOPE — this changes nothing on screen today.** The deck has no broker
panel, so its capital column is permanently `POSITION UNCONFIRMED / UNOBSERVED`.
`capitalAtRisk` is therefore false in all four scenes the route can reach
(PERMISSION, WAIT, CLOSED, PREGAME) and `admitsAmbient` is true in all four.
Nothing is withheld by this gate right now, and a tripwire test asserts exactly
that so it fails the day it stops being true.

It shipped anyway for one reason: the panel's WARN branch — *"Ambient surfaces
are withheld — only capital truth and material invalidation may take the room"*
— is code that **first renders on the day a position goes live**. Without a
gate, the first screen that sentence ever appears on is a screen with money
exposed, and it is false there. Closing a lie before it can be told beats
catching it afterwards.

### Also in `7721cc2` — a latent scanner bug, found by reading

`SceneAdmits` is a **strict prefix** of `SceneAdmitsAmbient`. The enforcement
scanner's `indexOf("<SceneAdmits")` depth counter therefore read every ambient
gate as a nested element gate and never found its close tag. It was benign at
today's line ordering and **no test was failing** — it was one rename away from
silently disarming the ONE_STORY containment lock. Now `\b`-anchored,
tag-parameterised, and `lastIndex`-driven.

---

## 3. §22 Orkin ledger — 11 attempted, 11 CAUGHT

A fix is not finished until the bug has been deliberately reintroduced and the
sentinel observed going red.

| ID | Revive-attempt | Result |
|----|----------------|--------|
| E–F | (c458adb baseline attacks) | CAUGHT |
| **G** | Delete the `<SceneAdmits>` wrapper from the page | **SURVIVED 9 green component tests** — see below |
| **H** | Decoy gate wrapping `<span />` beside an ungated strip | **SURVIVED a proximity regex** — see below |
| I | Declare `MARKET_CANVAS` governed without gating it | CAUGHT — sentinel red |
| **J** | Make `governed` optional, defaulting to all 12 | **CAUGHT by the source lock only** — see below |
| K | Compute WITHHELD against the whole enum (the real bug) | CAUGHT — 4 tests red |
| L | Drop the NOT GOVERNED disclosure to hide the ratio | CAUGHT — 2 tests red |
| M | Strip the ambient gate from the page entirely | CAUGHT — 2 sentinels red |
| **N** | Gate present but wrapping `{null}`, genome moved outside | **CAUGHT — only the page-pin red** — see below |
| **O** | Optional `admitsAmbient` prop with `?? compilation.admitsAmbient` | **CAUGHT — 37/38 behavioural tests stayed green** — see below |

### The four that taught something

**G — "a gate nothing calls is not admission."** Nine component tests proved the
gate WORKS. Not one proved the page USES it. Deleting the wrapper from
`page.tsx` left every test green. Component tests are necessary and are not
sufficient; a page-level pin is a different claim and needs its own lock.

**H — "proximity is not containment."** The first breadcrumb was a regex proving
the gate tag and the strip tag were near each other. A decoy gate wrapping an
empty `<span />` beside an ungated strip satisfied it. Two tokens being adjacent
does not prove one is inside the other. The lock now walks tags with a depth
counter.

**N — the same lesson, deliberately re-run against the new lock.** Gate present,
adjacent, wrapping `{null}`, with `<LearningGenomeInspector>` twenty lines below
it outside the gate. The *presence* sentinel passed (the tag is genuinely
there). **Only** the containment pin went red. That asymmetry is the proof the
tag walk actually tests containment and not proximity — H's lesson, verified
rather than assumed.

**J and O — why source-level sentinels exist.** Both are bypasses that are
**behaviourally invisible**. Every component test passes `governed` explicitly,
so weakening the prop to optional changes no observable output. Every caller of
the ambient gate passes only `compilation`, so `admitsAmbient ?? compilation
.admitsAmbient` is byte-identical at runtime. O left **37 of 38 tests green**.
Behaviour cannot catch a widened contract that nothing currently exercises —
only a lock reading the source can. This is the strongest argument in the block
for keeping the enforcement suite.

---

## 4. Evidence — what is PROVEN and what is NOT

All gates observed **unpiped** (a pipe masks the exit code; `>` redirect
preserves it):

| Gate | Observation |
|---|---|
| `vitest run` @ `c458adb` | 394 files / **3860** tests, exit 0 |
| `vitest run` @ `6142043` | 394 files / **3865** tests, exit 0 |
| `vitest run` @ `7721cc2` | 394 files / **3873** tests, `VITEST_EXIT=0` |
| `tsc --noEmit` @ `7721cc2` | `TSC_EXIT=0`, 0 lines of output |
| `git diff --check` | exit 0 |
| `git push origin main` | `6142043..7721cc2`, exit 0 |
| Prod reachability | `GET /` → 200, `GET /command-deck` → 200 |

### NOT PROVEN — stated plainly

- **RENDER on production is NOT PROVEN.** `/command-deck` is behind auth. No
  human has observed the admission panel on the deployed site. HTTP 200 proves
  the route is served, not that the panel renders correctly.
- **DEPLOY of `7721cc2` is NOT YET CONFIRMED.** Production auto-deploys from
  `main` and the push succeeded, but the served bundle was not fingerprinted
  after this commit.
- No elapsed-time claim is made anywhere in this baton. Time is data; it was not
  observed, so it is not invented.

### Founder action — about 30 seconds, unblocks the RENDER proof

Sign in at `https://wealthymindsetspro.com/command-deck`. Expected: a bordered
panel headed **Scene**, showing one of `PERMISSION / WAIT / CLOSED / PREGAME`, a
reason sentence, `Admitted · N`, `Withheld · N`, `Not governed here · 11`, and
`Signals observed · 2 / 5`.

---

## 5. The uncomfortable number: 1 of 12, and how it rises honestly

`SURFACE_ELEMENTS` has twelve members. The deck governs one (`ONE_STORY`). The
temptation is to raise the ratio by declaring more elements governed. **That is
the ORKIN I bug wearing a nicer hat**, and the sentinel already refuses it.

Reading `compileScene.ts` in full establishes the real constraint:

- `MARKET_CANVAS`, `FIDELITY_CHIPS`, `HUMILITY_PANEL` are admitted in **every**
  scene. Gating them is behaviourally inert — it would inflate the ratio while
  proving nothing.
- `THESIS_GEOMETRY` and `EXPRESSION_CARD` are the **only two remaining elements
  that actually flip** across the four scenes the deck can reach.
- **Neither has a real surface on `/command-deck`.**

A `DLARStrip → THESIS_GEOMETRY` mapping was considered and **explicitly
declined**: `DLARStrip` self-describes as the DIRECTION × LOCATION × AGGRESSION
× RESPONSE support row for the HERO TRUTH. That is market state, not thesis
geometry. Mapping it would be a label applied for the ratio's sake.

**Therefore: raising 1 → 3 honestly requires BUILDING the thesis-geometry and
expression surfaces, not remapping existing ones.** That is the next real atom
in this lane, and it is a build task, not a wiring task.

The other structural gap: `/command-deck` is currently the compiler's **only**
consumer. A one-route OS is a demo. A second route adopting `compileScene` is
what turns it into an operating system.

---

## 6. Preserved dirty lanes — DO NOT COMMIT

Verified intact before and after every commit in this block:

- `docs/operations/batons/WM-PRO-EVENING-2026-09-03.md` (modified)
- `scratchpad/` (untracked)

Every commit in this block staged files **by name**. No `git add -A` was used.
No `--no-verify`. No force-push.

---

## 7. Known blockers — recorded honestly, not worked around

| Blocker | Why it is blocked | Who unblocks it |
|---|---|---|
| Production RENDER proof | `/command-deck` is behind auth | **Founder** — sign in (§4) |
| Wrangler observability / rollback | `wrangler login` needs an interactive terminal | **Founder** — `./node_modules/.bin/wrangler login` |
| Gate 4 responsive device proof | Programmatic window resize does not take effect; `outerWidth` stays pinned | Needs a real device or a different harness |
| `/journal` detail canvas | 0 journal entries exist | Needs real entries |
| Shared server-side Decision/Position store | DB mutation is outside this shift's authority | Founder decision |
| Real broker order path | §22-B / H17 — adapters honestly refuse `submitOrder` | Founder decision |

---

## 8. Open items carried forward

- `resolveQuoteDayChange.ts:100` — `referenceCandidate(payload.open, price)` is
  an **undisclosed SESSION_OPEN fallback in the shared resolver**. Recorded, not
  acted on. This is a truth-labelling defect and deserves its own atom.
- `f25d7ba` was never live-verified. Fingerprint to look for: `changeWindow` on
  `/api/exchange?ex=coinbase&coin=BTC&type=quote` (provably absent at parent
  `ce56f93`).
- §19 "toolbar tattoo" canon tension against the restored Smart Money `WMLogo`
  trigger — needs a Founder ruling.
- The Founder's Chrome appears signed out of **every** WM tab at once, prod and
  localhost. May be ordinary session expiry; may be a persistence defect. **Not
  investigated — recorded so it is not mistaken for a new finding later.**

---

## 9. The sentence to carry forward

> Emphasis shrinks a card. **Admission refuses it.**
>
> And a refusal nothing honours is not a refusal — it is decoration with a
> confident voice.
