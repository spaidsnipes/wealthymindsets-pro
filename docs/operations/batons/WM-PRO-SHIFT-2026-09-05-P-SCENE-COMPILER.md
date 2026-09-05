# WM Pro — Shift P — THE SCENE COMPILER

**Date:** 2026-09-05
**Founder call:** *"we need to see the new os"*
**Commits:** `b4143d9` → `3670d17` → `4633ed6` (all on `main`)
**Parent:** `14b1374`

---

## 1. Why this atom, and not another one

The Founder said *"we need to see the new os."* Everything WM had shipped to
date was **emphasis** or **projection**:

- `shellEmphasis` / `selectDeckEmphasis` — decides how much ROOM a surface gets.
- `composeMarketCanvasVM` — decides what a surface SAYS.

Both are real, both are canonical, and neither is an operating system. In both,
**every surface still renders.** That is an app with good manners.

BUILD ORDER §10 is the literal canonical definition of the OS:

> *Implement one live route. A scene variable changes what is ADMITTED to the
> surface. Same market state underneath. Different admission.*

A grep of `src/` for `compileScene`, `sceneOf`, `OsScene`, `TradingScene`,
`PREGAME` returned **zero files**. §10 had no implementation at all. That is
why the product still read as an app: nothing in it had the authority to say
*"you may not see this right now."*

**Admission is the difference.** Emphasis shrinks a card. Admission refuses it.

---

## 2. What shipped

### `b4143d9` — the compiler (`src/lib/experience/compileScene.ts`, 57 tests)

Pure and total. No React, no I/O, no clock. Ten `SceneSignals` in, one
`SceneCompilation` out: scene, a reason **sentence** (§9: sentences, not
badges), the admitted surface list, `admitsAmbient`, `degraded`, `capitalAtRisk`.

Ten scenes: `PREGAME · WAIT · PERMISSION · EXECUTE · PENDING · MANAGE ·
DEGRADED · CLOSED · RECEIPT · DONE`.

The precedence cascade is ordered **by consequence, not by convenience** —
DEGRADED outranks everything, because a screen that cannot tell you what your
money is doing must never look calm.

### `3670d17` — the wiring + the visible surface

- `deckSceneSignals.ts` — the honest adapter. The deck has no broker panel, so
  the entire capital column is reported **UNOBSERVED**, never defaulted to
  FLAT/CONFIRMED. It emits a provenance record.
- `SceneAdmissionPanel.tsx` — leads with **WITHHELD**, not the scene name.
- `/command-deck` — wired. Right-of-way comes from the *same* canonical Decision
  owner the ribbon uses (`computeEvidenceDebt` → `computeRightOfWay`): a second
  **caller**, not a second implementation (§24 — no seventh owner).

### `4633ed6` — the sentinel (12 tests)

Four locks: single writer; no inline capital column; deck adapter stays honest;
the panel never degrades to a badge.

---

## 3. The two findings that mattered

**a) The exhaustive property test found a real bug that 43 hand-written cases
missed.**

A generator over 10,000+ signal combinations found:
`position: "POSITION UNCONFIRMED"` + `positionConfidence: "CONFIRMED"` +
`hadCapitalEvent` + `!receiptWritten` fell past *both* DEGRADED guards, past
RECEIPT (which requires `position === "FLAT"`), and landed in **CLOSED or
PREGAME** — a quiet screen, no escape hatch to the broker, while money was
unaccounted for. The label and the confidence are separate facts in
`positionTruth`, and only the label answers *"what do you hold."*

Fixed with a third DEGRADED branch **and** a structural backstop in `build()`.

*Lesson recorded: hand-written cases test the states you already imagined.*

**b) "Admission being right while the scene lies is still a lie."**

ORKIN 8 removed the new DEGRADED branch and the suite stayed green — the
structural backstop was silently patching the *admission* while the *scene*
was wrong. The trader would have gotten the broker link, and a screen that
said CLOSED. Pinned separately with three scene-semantics property tests.

---

## 4. §22 Orkin ledger — 13 revive-attempts

| # | Attempt | Result |
|---|---|---|
| 1 | Remove OPEN_BROKER from RECEIPT | CAUGHT |
| 2 | Demote DEGRADED below MANAGE | CAUGHT |
| 3 | Remove `working === 0` from DONE | survived → CAUGHT after property tests |
| 4 | `admitsAmbient: true` always | CAUGHT |
| 5 | Loosen `flatConfirmed` | CAUGHT |
| 6 | Remove both §21 enforcement points | CAUGHT |
| 7 | Remove the structural OPEN_BROKER backstop | **SURVIVED** — see below |
| 8 | Remove the POSITION UNCONFIRMED DEGRADED branch | survived → CAUGHT after scene-semantics tests |
| 9 | Drop the RECEIPT branch | CAUGHT |
| A | Adapter claims a CONFIRMED FLAT book | CAUGHT |
| B | Inline capital column on /command-deck | CAUGHT |
| C | Panel demoted to a badge | CAUGHT |
| D | A second scene authority | CAUGHT |

**ORKIN 7 SURVIVED and is disclosed, not laundered.** The backstop is currently
redundant-by-construction — every capital-at-risk path already admits
OPEN_BROKER through its own case arm. It stays because it must survive a future
scene edit by someone who has not read the file. It is future-proofing, **not**
a pinned invariant, and it should not be counted as one.

ORKIN 3 is the same category and is documented in-file with a dated §22 finding
rather than a passing test that would have been passing for the wrong reason.

---

## 5. §25 REPORT

| Field | Value |
|---|---|
| `FOUNDERVISIBLE_DELTA` | `/command-deck` now compiles a SCENE and renders what it **withheld**. First surface in WM where a signal can refuse a card. |
| `REAL_DATA_OBSERVED` | Session (canonical identity) + right-of-way (Decision owner). Disclosed as **2 / 5**. The other three are UNOBSERVED and say so. |
| `PRODUCTION_SURFACE_OBSERVED` | **DEPLOYED — PROVEN. RENDERED — NOT PROVEN.** See §6. |
| `OLD HUMAN STEP REMOVED` | The trader no longer decides which panels to ignore in a given market state. The scene decides admission. |
| `TEN_STEP_PROOF_MOVED` | §10 moved from **0 files** to a live route + 91 tests. |
| `BLOCKER BURN-DOWN` | 1 new blocker recorded (§6). No blocker closed this block. |

---

## 6. Live verification — the honest split

**DEPLOYED: PROVEN ✅**

The panel is client-rendered, so a plain HTML fetch cannot prove it. Proof was
taken from the production JS bundle instead:

- `curl https://wealthymindsetspro.com/command-deck` → `HTTP 200`, 15 chunks.
- All seven fingerprints — `wm.scene.v1`, `Signals observed`, `Withheld`,
  `POSITION UNCONFIRMED`, `Expression shortlist`,
  `Ambient surfaces are withheld`, `PREGAME` — present in one served chunk.
- **Negative control PASSES:** `wm.scene.v1` exists in exactly one file at HEAD
  and did **not** exist at `b4143d9^`.

**RENDERED: NOT PROVEN ❌ — BLOCKED ON FOUNDER SIGN-IN**

`src/middleware.ts` has no auth gate; the `/login` redirect is client-side, from
`AuthContext.tsx`. Every WM tab in the connected Chrome — production **and**
`localhost:4333/4334/4335/4338` — is sitting on `/login`. The browser has no WM
session. I did not sign in: entering the Founder's password is prohibited, and
forging a JWT would make the observation worthless anyway.

> **FOUNDER ACTION (30 seconds):** sign in to
> `https://wealthymindsetspro.com/command-deck`. Expected: a bordered panel
> reading **Scene** + one of `PERMISSION / WAIT / CLOSED / PREGAME`, a reason
> sentence, `Admitted · N`, **`Withheld · N`** with struck-through chips, and
> `Signals observed · 2 / 5`.

Note this is the same class of blocker as the wrangler login — a credential the
agent must not hold. It is not a defect in the work.

**Side observation, not overclaimed:** the Founder's Chrome being signed out of
*every* WM tab at once may be ordinary session expiry, or may be a persistence
defect. I did not investigate; recording it so it is not lost.

---

## 7. Reachable scenes on this route

`PERMISSION` · `WAIT` · `CLOSED` · `PREGAME`.

**`DONE` is provably unreachable here and a test pins it.** DONE means "nothing
is exposed, the day is answered" — the deck has never read a book and must
never say that. When a broker-aware surface adopts the compiler it must supply
the capital column from `selectPositionTruth` and the execution owner —
**not** by relaxing the constants in the adapter. The sentinel enforces this.

---

## 8. Gates

- `./node_modules/.bin/vitest run` → **EXIT 0**, 393 files / **3847 tests**
  (block start: 390 / 3756).
- `./node_modules/.bin/tsc --noEmit` → **EXIT 0**, 0 lines.
- `NEXT_DISABLE_TURBOPACK=1 next build` → **EXIT 0** (at `3670d17`).
- `git diff --check` → clean.

All run unpiped via `>` redirect + `echo "EXIT=$?"`. A pipe masks the exit code.

---

## 9. Next

1. **Founder signs in** → render proof, then flip §6 to PROVEN LIVE ✅.
2. Second consumer for the compiler. A one-route OS is a demo; §10's power
   shows when two surfaces admit differently from the same market state.
3. `f25d7ba` remains un-live-verified (fingerprint: `changeWindow` on
   `/api/exchange`, provably absent at `ce56f93`).
4. `resolveQuoteDayChange.ts:100` — `referenceCandidate(payload.open, price)` is
   an undisclosed SESSION_OPEN fallback in the shared resolver. Recorded, not
   acted on.

**Preserved dirty lanes (do not stage):**
`docs/operations/batons/WM-PRO-EVENING-2026-09-03.md` (M), `scratchpad/` (??).
