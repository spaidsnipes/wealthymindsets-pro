# WM PRO — SHIFT T — ONE SESSION OWNER

**Date:** Saturday 2026-09-05 · market CLOSED · §25 Monday deadline = 2026-09-07
**Commits:** `3c305bb` · `90f76ca` · `be39cb1` (all on `main`, all pushed)
**Gates at seal:** `vitest` 413 files / **4191 tests**, exit 0 · `tsc --noEmit` exit 0, 0 lines

---

## What this block was

One defect, found three times, in three different disguises, on two devices.

A **store key was being rendered as a truth**. `canonicalSession(extHours, cls)`
is part of the canonical market-state store key. It answers `"RTH"` for every
non-crypto instrument on **every day of the week, including Saturday**. It is a
key. It is not an observation. Three separate surfaces were reading it as one.

The three disguises, in the order they were found:

| # | Commit | Surface | What it said on a Saturday |
|---|---|---|---|
| 1 | `3c305bb` | Mobile session chip (phone header) | `"SESSION ?"` for futures, `"RTH"` for equities |
| 2 | `90f76ca` | Desktop SESSION tile (`/command-deck`) | value `"RTH"` next to caption `"market closed"` |
| 3 | `be39cb1` | The SCENE compiler (`/command-deck`) | `WAIT — holding is the action` |

---

## The live artifact — observed, not inferred

Read out of production in a **single DOM evaluation**, `https://wealthymindsetspro.com/command-deck`,
Saturday 2026-09-05, active symbol `GC1!`:

```
SCENE         "WAIT — Right-of-way is withheld, holding is the action."
SESSION tile  "SESSION UNKNOWN"
mobile pill   "CLOSED — closure is established for this market today"
DATA strip    "SESSION CLOSED — LAST VERIFIED"        ← 8 or more nodes
disclosure    "2 / 5" signal groups reported OBSERVED
```

**Four owners. One market. One instant. Four different claims.**

This is Canon Weakness #1 (multi-truth disagreement on one page) captured live
rather than reasoned about from source. The page was *already printing the true
answer eight times* while its own scene compiler argued with it.

Methodology note: `document.visibilityState === "hidden"` throughout. Only
text-content and DOM-attribute reads were taken. **No geometry, transform,
animation or visibility claim is made anywhere in this baton.**

---

## Atom 1 — `3c305bb` — the phone header chip

`MobileSessionPill.tsx:126`

```ts
const sessionToken = futuresTruth ? "SESSION ?" : session;   // both halves wrong
```

* **Futures half — a dead predicate.** `selectCanonicalFuturesSessionTruth`
  returns a non-nullable object, so `futuresTruth ?` was a constant `true`. It
  printed a shrug on a day whose closure is **PROVEN**. That is §8 violated in
  the *withholding* direction — false humility.
* **Other half — a store key.** `"RTH"` on a Saturday. §8 violated in the
  *inventing* direction.
* **Plus an accessibility inversion.** The `aria-label` distinguished states the
  visible chip could not — the accessible name carried *more* truth than the
  pixel, which is the LIVING-PIXEL LAW upside down.

Fixed by introducing the one owner, `selectCanonicalSessionToken`, and routing
both the chip and its accessible name through it via the mount-safe
`useSessionClockDate()`.

---

## Atom 2 — `90f76ca` — the tile that contradicted itself

The `/command-deck` SESSION tile rendered, in **two adjacent DOM nodes of one
component**:

```
value  ->  "RTH"
detail ->  "market closed"
```

Three voices inside a single tile:

1. **Headline** — echoed the store key. The `detail` branch one line below had
   *already computed* `isWeekend` and used it; the `value` branch refused to look.
2. **Colour** — `sessionTone(session, wsConnected)` read the raw store-key prop,
   matched `s === "RTH"`, and painted the ESTABLISHED gold on a day its own
   caption called closed. **The colour is part of the pixel. A tone is a claim.**
3. **Clock** — `dayOfWeek: new Date(nowMs ?? 0).getDay()`. `new Date(0)` is
   1970-01-01, a weekday. Every Saturday's **first paint asserted a weekday**
   before the clock settled — the inverse of "the settle may only ever sharpen."

Fixed: the presenter takes `at: Date | null` instead of a caller-computed
`dayOfWeek: number` and delegates to the same owner; `sessionTone` reads the
**presented** value and has no `"RTH"` branch left, because the presenter can no
longer return one.

---

## Atom 3 — `be39cb1` — the scene, and the disclosure that vouched for it

`page.tsx:299` passed `identity.session` into `deckSceneSignals`. Therefore:

```
sessionOpenFrom("RTH")                       -> true, always
compileScene.ts:322 `sessionOpen === false`  -> never taken
```

The CLOSED scene — *"SESSION CLOSED — LAST VERIFIED. Nothing is streaming."* —
was **unreachable on this route, on any weekend, for any symbol.**

**And it was worse than a wrong label.** `deckSceneSignals` also emits a
PROVENANCE record whose entire stated purpose, in its own file header, is:

> "A scene compiled from three real signals and seven guesses must never look
> like a scene compiled from ten real ones."

Because `sessionOpen` was non-null, `provenance.SESSION` read `OBSERVED` and
`observedCount` was inflated. **The mechanism built to expose fabrication was
itself fed the fabrication, and then vouched for it.** That is the disclosure
lying about the lie.

`sessionOpenFrom` also gained `24X7 -> true`. It had been falling through to
`null`, so the deck reported **crypto's** session UNOBSERVED (withholding an
established fact) while reporting a **Saturday equity's** OBSERVED (inventing
one) — one mapper wrong in both directions at once, the same shape as the dead
ternary in atom 1.

**The honest downgrade, stated plainly:** a weekday equity now reports
`SESSION UNOBSERVED`, `observedCount 0`. It always *was* unobserved. The deck had
been claiming to observe a session on a Tuesday on the strength of a store key.

---

## The methodology lessons

### Lesson 7 — assert the half you did not touch

`sessionDetailText.test.ts` had 8 tests. **Every one read `.detail`. Not one read
`.value`.** Line 33 —

```ts
expect(present("RTH", true, 6).detail).toBe("market closed");
```

— is a *literal specification of the contradiction*: session RTH, Saturday, and
the only thing checked is the subtitle. Shift-H's I-Bkt 6 fixed the caption and
locked the caption, certifying the whole tile on the strength of the one corner
it had just repaired. `canonicalIdentity.test.ts` had the identical blind spot:
its crypto cases assert `.value`, its equity weekend case asserts only `.detail`.

### Lesson 8 — a pure-function suite can be perfectly correct and perfectly irrelevant

`deckSceneSignals.test.ts` had 22 tests. **Every input was hand-written** —
`{ session: "RTH", … }`. The mapper was proven correct *for* `"RTH"`; not one
line asked whether the caller could legitimately *have* `"RTH"`. It could not.

The file's own header even says *"the compiler is pure and well-tested; the
wiring is where a lie would enter"* — and then every test tested the compiler and
none tested the wiring.

This brings the running list of *"a check written against the shape the data has
when it is present, rather than the shape it has when it is missing"* to **eight**.

### Lesson 9 (re-proved, not new) — a BAN needs a stripper proof-test

Revive **EE** neutered `stripComments` to return `""`. The pure-BAN test
(`not.toMatch`) then **passed vacuously**. Only the proof-test and the two
positive assertions caught it. This is the recorded W1 lesson repeating exactly,
and it is the whole justification for the proof-test existing.

---

## Orkin §22 ledger — every revive exit 1, every one firing by name

### Atom 1 — `MobileSessionPill`
| # | Revive | Exit | Fired |
|---|---|---|---|
| S | restore `futuresTruth ? "SESSION ?" : session` | 1 | 3 |
| T | truthiness test instead of `=== false` in the owner | 1 | 4 |
| U1 | delete the crypto early-return from the token selector | 1 | 1 |
| U2 | U1 + strip the crypto guard from `provenSessionClosure` | 1 | 2 |
| V | invent a clock when `at: null` | 1 | 2 |
| W1 | neuter `stripComments` → `""` | 1 | 4 (**2 pure bans passed vacuously**) |
| W2 | identity stripper | 1 | 2 |

### Atom 2 — `CommandContextRibbon`
| # | Revive | Exit | Fired |
|---|---|---|---|
| X | echo the store key as the visible value | 1 | 5 |
| X2 | drop the futures fall-through to the owner | 1 | 1 |
| Y | tone from the raw store-key prop | 1 | 1 |
| Y2 | restore the dead `s === "RTH"` tone branch | 1 | 1 |
| Z | restore `new Date(nowMs ?? 0).getDay()` | 1 | 2 |

### Atom 3 — `deckSceneSignals`
| # | Revive | Exit | Fired |
|---|---|---|---|
| AA | pass the store key back into the adapter | 1 | 3 |
| BB | delete the `24X7` branch | 1 | 2 |
| CC | map the UNKNOWN token to open | 1 | 2 |
| DD | drop the CLOSED mapping | 1 | 8 |
| EE | neuter the comment-stripper | 1 | 3 (**1 pure ban passed vacuously**) |

All files restored byte-identical after every pass (`shasum -c`, exit 0).

---

## Live-deployment status — stated honestly

| Commit | Deployed | Proof |
|---|---|---|
| `3c305bb` | **YES — PROVEN** | pill read `"GC1! CLOSED"` + matching `aria-label` |
| `90f76ca` | **YES — PROVEN** | tile changed `"SESSION UNKNOWN"` → `"CLOSED"` / `"closure is established for this market today"` on the same URL, same tab, same day |
| `be39cb1` | **NOT YET** | SCENE still reads `WAIT`, disclosure still reads `2 / 5` — i.e. exactly the pre-fix behaviour the commit targets |

`be39cb1` is **pushed, not proven.** Cloudflare Workers auto-deploys from `main`;
the next reader should re-read `/command-deck` and expect SCENE `CLOSED` and a
disclosure of `1 / 5` on a weekend (SESSION OBSERVED + DECISION, minus the
inflated count) — or, on a weekday, `SESSION UNOBSERVED`.

---

## Honest blockers — recorded, NOT claimed as solved

* **Bubble tooltip not observable.** Needs real per-trade aggressor tape; the
  market is closed. Cannot be proven this session.
* **`/paper` rejection reason not triggerable.** The ticket is gated
  `STALE PIPELINE · NOT ACTIONABLE`.
* **Geometry / visibility claims impossible.** `document.visibilityState` was
  `"hidden"` for every probe. None were made.
* **Gate 4 responsive device proof — BLOCKED.** Programmatic window resize does
  not take effect; `outerWidth` stays pinned.
* **`/journal` detail canvas — BLOCKED.** 0 journal entries exist.
* **Decision Memory sealing has zero production callers.** Architectural. Surfaced
  here deliberately; **not** rush-wired.
* **`executionConnectivity` orphaned.** Not a live defect — `/readiness` already
  discloses it honestly.

## Founder action required — blocking, only he can do it

1. **Set the Supabase privileged key on the Cloudflare Worker**
   (`wealthymindsets-pro`, env `production`) as `SUPABASE_SERVICE_ROLE_KEY` or
   `SUPABASE_SECRET_KEY`. Until then every authenticated route answers **503**.
2. **Rotate the leaked `sb_secret_…` key** — it was pasted in plaintext chat. It
   has not been written to any file in this repo and will not be.
3. Rename `FINNHUB_KEY_` → `FINNHUB_KEY`; `ATH_LIVEKIT_KEY_` /
   `ATH_LIVEKIT_KEY_SECRET_` → `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`; plus the
   Alpaca-paper names.
4. `wrangler` observability needs `./node_modules/.bin/wrangler login` **by the
   Founder**. No `CLOUDFLARE_API_TOKEN` will be set from this seat.

---

## Next reader — the open lane

* **Re-verify `be39cb1` live** (above). This is the one outstanding proof.
* `ChartsDashboard.tsx:596` — `session: canonicalSession(extHours, …)`. Believed
  a store **write** (correct), **not yet verified**. Last remaining site of this
  defect class that has not been read.
* `canonicalSession` KNOWN GAP — there is still **no intraday exchange calendar**
  in this codebase. Everything above establishes closure only from the *day of
  the week*. A real calendar is the architectural fix; do not fake it.
* Raise scene governance from **1 / 12** — make `admitsAmbient` binding (§9).
* Fix `/api/readiness` 404 vs `/api/broker/readiness`.
* Task #176 — `scripts/env-manifest.mjs` + regression test.
* Correct the stale comment at `CanonicalFidelityBadge.enforcement.test.ts:25-26`
  — `candleDataStatus` **does** derive from `priceSourceBadge`.

**Recorded, NOT claimed as defects:**
* `Bubble.levelIdx` (rank within candle, for fan stagger) vs
  `DeltaBubbleLevel.levelIdx` (bucket index) — same name, two meanings.
  `levelIdx: rankIdx` at the spawn sites is **CORRECT** for
  `offX = (lvlIx - (sibN-1)/2) * spread`. A naming hazard. Do not "fix" without
  re-verifying the fan math.
* `journalEntryToEdgeEntry.ts:51` / `journalEntryToSnapshot.ts:63` zero-fill
  unknown pnl/R — legacy-data hardening, not a proven live defect.
