# BATON — DECISION SPINE BLOCK

**Sealed** 2026-09-12 ~21:10Z · **Head** `6b78843` · **Base** `a6df7d7`

Four commits. Ticket T acceptance items 6–9 advanced; items 4, 5, 10 **NOT**
closed and named below with the exact joint.

---

## What landed

| SHA | Atom |
|---|---|
| `02b21d8` | `permissionBirth.ts` + `DecisionSpineBand.tsx` — the spine is on the scene, and `PERMISSION_GRANTED` finally has a production caller |
| `bf5028a` | `continueOrMint` — the option expression adopts the born identity instead of minting a second one |
| `bb4ac82` | 19 tests for the band's absence-disclosure laws |
| `6b78843` | The band was unreadable at 390px. Fixed, plus the geometry channel that found it |

---

## The finding that matters most

**`02b21d8` shipped a surface that could not be read on the primary device, and
three separate gates were green while it was true.**

Measured in real Chrome at 390px, the six spine cells were
`240 / 30 / 30 / 30 / 30 / 30` px wide and 220px tall — five vertical noodles of
one character per line. Cause: `flex: "1 1 0"` with `minWidth: 0` can never
wrap, because `flex-wrap` only moves an item to the next line once items exceed
their BASE size. `flexWrap: "wrap"` sat on the container as dead code.

Why nothing caught it:

- `tsc --noEmit` — **EXIT=0.** Third and fourth confirmation this session of the
  carried finding: *renames are type-visible, wrong answers are not.*
- the 19 band tests — **EXIT=0.** They use `renderToStaticMarkup`, and
  **static markup has no geometry.**
- `scripts/audit-phone-parity.mjs` — holds no session, lands on `/login`,
  never reaches `/charts`.

This is the SAME lesson `audit-phone-parity.mjs` already records in its own
header ("a class name cannot witness geometry") arriving a second time through a
different door. The repair is `scripts/measure-spine-band.mjs`, which renders
the band into real Chrome via `channel: "chrome"` (downloads nothing) at
390/834/1440 and fails any cell under 120px.

**Standing warning for the next shift:** every other component on `/charts` is
in exactly the same position — source-gated, geometry-ungated. The band was
found because it was new and suspected. Nothing has swept the rest.

---

## REVIVE ledger — three breaks, all FAILURE-PROVEN

| # | Break | Gate that caught it | tsc |
|---|---|---|---|
| 1 | `isEvaluated` relaxed to `v !== null` | vitest EXIT=1, 2 named | EXIT=0 |
| 2 | adoption re-stamps `bornFrom` | vitest EXIT=1, 1 named | EXIT=0 |
| 3 | `rText` → `?? 0`, `asOfText` → epoch 0 | vitest EXIT=1, 3 named | EXIT=0 |
| 4 | absence branch → em dash; NEXT → invented WAIT | vitest EXIT=1, 2 named | EXIT=0 |
| 5 | flex reverted to `1 1 0` / minWidth 0 | **measure EXIT=1, 5 cells named** — vitest EXIT=0, tsc EXIT=0 | EXIT=0 |

All five restored byte-identical, shas verified.

---

## Architectural notes worth keeping

**Birth is an event, not a reading.** `selectPermission` emits `UNKNOWN` before
quotes arrive, so `UNKNOWN → ALLOWED` happens on essentially every cold page
load. Counting it as a crossing would mint a decision per page load — identity
as a render count. `permissionBirth.ts` therefore treats `UNKNOWN` as the
ABSENCE of a prior reading, identically to `null`. Exactly two crossings exist
in the whole matrix: `ADVISORY→ALLOWED` and `RESTRICTED→ALLOWED`.

**The shadow object caught before it shipped.** Landing the permission birth
meant `OptionExpressionIntent` — which minted unconditionally when its ref was
empty — would have produced a SECOND id for one decision: the band showing one,
the recorded intent carrying another, the journal later showing two decisions
where the human made one. Found by hunting for duplicate truth owners, not by a
failing test. `continueOrMint` preserves the WHOLE identity
(`bornFrom`/`bornAt`/`bornOnDeviceId`), because adopting the id while
re-stamping the birth would claim the decision was born at the option chain.

---

## BLOCKED — named joints, not vague

### 1. Cloudflare deploy — OWNER-AUTH REQUIRED / SESSION LIMIT

`./node_modules/.bin/wrangler whoami` → **EXIT=1**, not logged in.
`.github/workflows/` contains only `sentinels.yml`, so pushing to main does
**not** trigger a build. A pasted plaintext API token will continue to be
declined on Drive canon ("never expose secret values").

**GREEN EXIT CRITERION:** Founder runs `wrangler login` interactively →
`wrangler whoami` EXIT=0 → deploy lands → scene observed in the browser.

### 2. Live visual verification of the composed scene — both channels down

- Chrome extension screenshot → `Cannot take screenshot with 0 width`
  (persisted across reload, 3s settle, and an explicit `resize_window` to
  1512×950).
- computer-use screen capture → `Screenshot capture returned nil
  (permission missing or SCContentFilter failure)`. Chrome granted at tier
  "read", `open_application` succeeded, capture still nil.

**What WAS observed live**, 2026-09-12 21:02Z, page text of
`https://wealthymindsetspro.com/charts` via the Chrome extension: `▸ WHY`
drawer toggle present, **no spine labels**, AAPL @ 332.25, `SESSION CLOSED —
LAST VERIFIED`. Production serves the July composition. Consistent with the
deploy block — not independent evidence of a code defect.

Per the NO-ESCAPE VISUAL VERIFICATION BREAKER all four commits are
**🟡 HUMAN_PROOF_REQUIRED**, never GREEN.

### 3. Ticket T acceptance item 10 — NOT DONE

The July shell is still the parent visual architecture of `/charts`. The band
is an addition to it. The contract is explicit: *"If it is still fundamentally
old WM with a new card attached, Ticket T is not complete."* This was
deliberately not attempted while no visual channel exists — a whole-scene
re-architecture that cannot be looked at is the one thing worth refusing.

---

## Next unblocked atoms

1. **Sweep the rest of `/charts` for the geometry-blind defect class.**
   `measure-spine-band.mjs` is the pattern; generalise it or repeat it per
   component. Highest expected yield of any lane right now.
2. **Seed a test account** so `audit-phone-parity.mjs` can reach interior
   routes. Its own header names this as its known limit. Account creation is
   a Founder action — the agent may not create accounts.
3. Remaining `/loop` gates untouched this block: Delta Bubbles level ownership;
   Live VP render geometry proof; `executionConnectivity` orphaned; paper
   execution state-machine realism.
4. Decision Memory sealing still has **zero production callers** — surfaced,
   deliberately NOT rush-wired.
