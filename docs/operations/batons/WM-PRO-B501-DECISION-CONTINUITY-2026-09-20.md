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

# B-501 — one DECISION_ID across tabs

**Sheet:** B-501 TABS SAME DECISION_ID · contractor index rule 4
**Also consulted:** G-001 Job Site General Notes, B-601 Browser Storage Vault Tanks
**Route:** `/charts` (desktop browser lane)
**Serving Version ID at acceptance:** `3929c107-2fdc-4d52-9d31-86f3ce243d1e`
**Commit:** `9fac0bfa`
**Sheriff:** unnamed at time of writing — G-001 requires one, and this is
recorded as an open item rather than quietly skipped.

## What the sheet says

Six tabs — ARCHITECTURAL, STRUCTURAL, MEP, PLUMBING, ELECTRICAL, FIRE
PROTECTION — every one showing the same glass elements for
`DECISION_ID = D-501-G01`. "All tabs show the same glass elements."
"Consistent visibility maintained."

The contractor index states it as a rule: the same DECISION_ID follows the
decision through tabs, glasses, mobile, journal, inspect and broker expression,
and you do not mint a new ID for zoom, overlay, refresh, symbol change or
inspect.

## What was measured BEFORE

Two tabs open on production `/charts`, same browser profile, same origin,
against the then-serving Worker:

| | tab A | tab B |
|---|---|---|
| localStorage keys | 48 | 48 |
| `wm.device-id.v1` | `dev_282b7987-…` | `dev_282b7987-…` (same) |
| keys matching `/decision/i` | `[]` | `[]` |
| `[data-decision-id]` in DOM | 0 | 0 |
| absence copy | "No decision born yet — permission has not crossed." | identical |

Two findings, and the second is the one that reframed the work.

1. **Identity was React state and nothing else.** Every tab that crossed
   permission minted its own `wmd_…`. One trader, one device, one instrument
   = two decisions. That is precisely the aliasing failure `decisionIdentity.ts`
   was written to prevent, arriving through the one door it does not watch.

2. **The transport was never missing.** Both tabs already read the SAME
   `wm.device-id.v1` out of the SAME origin's localStorage. Decision identity
   simply never got on it. The fix was not to build a channel; it was to use
   the one that had been carrying the device id all along.

And the finding that changed the order of work: **`[data-decision-id]` was 0 in
both tabs.** B-501 was not merely violated, it was *unmeasurable*. No live
observation could prove or disprove "same DECISION_ID across tabs" — the law
could only be read in the source. ORGANISM PASS cannot accept a law that
cannot be observed on the glass, so the receipt had to come first.

## What shipped

- **`src/lib/traderMemory/decisionContinuity.ts`** — the vault tank. B-601:
  browser storage is equipment, never a room or a route, so this is a module
  and not a surface. It is a SEPARATE module because `decisionIdentity.ts`
  declares itself pure — "no React, no I/O, no Supabase" — and that purity is
  what makes identity reproducible in a test.

  It may rehydrate; it may never mint. Everything read off disk passes
  `isDecisionId`, which is the exact case that function's header was written
  for: a persisted `decisionId: 42` "was accepted and handed downstream wearing
  a brand that promised it had been minted."

  Scoped by owner AND underlying, and the envelope re-checks both on read,
  because a key can be written by hand and a scope that only the filename
  asserts is not a scope.

- **The symbol-change reset no longer blanks the scene — it re-reads it.**
  Leaving TSLA still drops the TSLA identity from view (a decision belongs to
  the instrument it was born about). Returning to TSLA now finds the SAME
  identity, which is what the contractor rule against minting on symbol change
  actually requires.

- **Cross-tab arrival over `storage`,** adopted through `adoptSceneDecision` —
  not a bare set — so a decision already standing on the scene is not replaced
  by another witness to it.

- **`data-b501-decision-id` / `-born-from` / `-born-on-device`** — the receipt.
  Omitted entirely when no decision is born, so a named absence cannot be
  misread as an identity.

- **Registered in `logoutIsolation.ts`** under owner-scoped prefixes. A
  decision left behind for the next person to sign in and inherit would be a
  worse bug than the one being fixed.

## Gates

`./node_modules/.bin/vitest run` — 829 files, 10,593 passed, 2 skipped, EXIT=0
`./node_modules/.bin/tsc --noEmit` — EXIT=0

## The sentinel that had to change, and why

`DeckExpressionShortlist.test.tsx` asserted the literal string
`}, [symbol, canvasUser?.id]);` as a PROXY for "the scene re-scopes per symbol
and owner." The proxy and the property came apart here: continuity moved the
effect onto `decisionScope`, which line 1099 defines as exactly
`{ underlying: symbol, owner: canvasUser?.id ?? "signed-out" }` — the same two
values, with one improvement (a signed-out visitor re-scopes on a stable
`"signed-out"` rather than on `undefined`).

The assertion now names the scope SOURCE instead of one spelling of it. This is
recorded because "I changed a failing test" is the most suspicious sentence an
engineer can write, and the reader deserves to check the reasoning rather than
trust it.

## AFTER, on the serving build

Measured on `3929c107` at innerWidth 1920:

```
chunksChecked ................. 24
servedBuildHasContinuityKey ... true    (wm:decision-identity:v1:)
servedBuildHasChangedEvent .... true    (wm:decision-continuity:changed:v1)
servedBuildHasCarriedCopy ..... true    ("Decision carried from another tab")
data-b701-band ................ LARGE
data-b501-decision-id ......... absent  (correct — no decision born)
absence copy .................. "No decision born yet — permission has not crossed."
```

## Honest blockers and debt, unresolved

- **The cross-tab hop is NOT yet proven on live glass.** Proving it would have
  required writing a synthetic `wmd_` identity into the Founder's real scope —
  putting a decision he never made into his own book. That was refused. The
  rehydrate and refusal paths are proven by 22 unit tests against the REAL
  minter; the tab-to-tab hop will be proven the first time a real permission
  crossing occurs. Anyone reading this should treat cross-tab continuity as
  CODE-PROVEN and LIVE-UNPROVEN until that observation exists.
- **`/command-deck` has the identical un-continued pattern** (`page.tsx` ~:649
  mint, ~:656 reset). It was left alone deliberately: the Founder's lane for
  this shift is `/charts`. B-501 is not closed until the deck routes through
  the same owner, and a second surface is the real test of whether this owner
  is shaped correctly.
- **No Sheriff is named.** G-001 requires one.
- **Cross-DEVICE continuity is explicitly out of scope.** `bornOnDeviceId` is
  preserved exactly as minted, so a rehydrated decision still names the device
  that actually witnessed its birth. B-501's six tabs are six views of one
  machine; a cross-device claim needs a server and is not this sheet.

## The finding that outlives this baton

A law that the running app cannot be asked about is not enforceable, however
carefully it is written in the source. B-501 had a pure owner, a nominal type,
22 tests and a header arguing its own necessity — and still could not be
checked on production, because nothing published it to the DOM. The receipt is
not decoration on top of the law. It is the part that makes the law a law.

The same question is worth asking of every sheet still open: *if I opened
production right now, could I measure whether this holds?*
