# SHIFT RECEIPT — 2026-09-07 — stored symbol lists stop lying to the trader

**Thread:** single WM Pro execution thread
**Observed window:** ~13:11 → 13:41 CDT (measured from tool timestamps, not estimated)
**Start SHA:** `08796aa` → **End SHA:** `f2deb9e` (pushed to `origin/main`)

---

## THE THROUGH-LINE

Every atom this shift is the same sentence: **a list the trader owns was read by
code that did not believe him.** Four surfaces, one class of defect. Nothing here
was planned in advance — each edge was found by breaking the one before it.

---

## ATOMS SHIPPED

### 1 · `58ab3d0` — two Available-R engines stop disagreeing

`selectAvailableR` carried a private copy of the R formula that charged costs
only to the reward; `riskKernel.calculateAvailableR` charges both sides.
Measured disagreement on one trade: **kernel 1.63R vs selector 2.48R — 52% more
edge than the trader had.** `selectPermission` gates entry on `conservativeR`,
so this loosened the capital-protection gate.

Deleted the private formula; the selector delegates. Side effect recorded
honestly: `riskKernel.ts` gained a screen, so the screen-reach LEDGER entry
pinning it as unreachable was removed and one assertion flipped into a positive
reachability lock. The §10 orphan gap is now ONE file (`expressionCard.ts`).

### 2 · `e409b11` — a lost connection stops being reported as a fact

`/api/decision-position` collapsed five distinct transport failures into
confident data answers. Every transport failure now returns
`verdict: "UNVERIFIED"` / 503; `applied.error` (503) is separated from
`applied.data === null` (409 `REJECT_STALE`, the genuine atomic conflict).
11 new tests.

### 3 · `a4ebb7d` — the trader's tape list owns the rail

**Measured in the running app**, stored `["NQ1!","AMD","AAPL"]`:

```
editor panel   NQ1!  AMD  AAPL     <- the trader's list, all three
ticker rail    NQ1!       AAPL     <- AMD absent
```

Both on screen at the same moment, one row apart. Not "unavailable", not
"pending" — absent, with nothing saying so.

`TAPE_SYMBOLS` was the DEFAULT list, the FETCH allowlist and the row seed at
once. `handleAddSym` hid it for exactly one session by mutating the module
constant at runtime. New owner `tapeSymbols.ts`; the default is a default, never
an allowlist. `Promise.all` → `allSettled` (one non-string entry had been
rejecting the whole round, freezing *every* symbol).

Deleted 53 hardcoded prices that existed under a comment reading *"It must never
be rendered or restored as a verified quote."* **AMD was hardcoded at 507; its
real observed quote is 476.25 — a 6.5% fabrication that only a rendering bug had
kept off screen.**

### 4 · `03deb2c` — "no feed", not "quote pending"

The add field OFFERED EUR/USD, GBP/USD, USD/JPY, AUD/USD. An anonymous
`filter(sym => !sym.includes("/"))` dropped them, and the row said
`quote pending` — forever. `fetchQuote` has no forex branch at all, so no
request was ever sent. §8: a designed boundary must not wear a transient state's
vocabulary.

`tapeQuoteBlocker` is now the one place that fact lives, read by three callers.
`TAPE_SYMBOL_SUGGESTIONS` is **derived** by filtering candidates through it, so
the menu cannot drift from the kitchen — and the pairs return by themselves the
day an FX feed is wired.

### 5 · `cf25102` — one junk byte destroyed the whole watchlist

**Measured on /charts**, `{"My Watchlist":["AAPL",42,"NVDA"]}`:

```
TypeError: sym.toUpperCase is not a function
The above error occurred in the <WatchlistPanel> component.
It was handled by the <ErrorBoundary> error boundary.        (x16)
```

Worse than the tape bug: the panel was not degraded, it was **destroyed**. AAPL
and NVDA — both readable, both his — left the screen along with the add field he
would have used to repair the list.

`storedSymbolList.ts` is now the one rule for reading an untrusted stored symbol
list. It is an **extraction, not an invention**: `tapeSymbols`'s proven reader,
promoted. All 19 pre-existing tape tests pass through the delegation unchanged —
that is the evidence the extraction preserved behaviour.

Also killed a second, drifted reader in the same file: the import path used
`String(s).toUpperCase()`, which does not reject a non-symbol, it **fabricates**
one — `42` → `"42"`, `{}` → `"[OBJECT OBJECT]"`.

### 6 · `f2deb9e` — the third reader joins the one owner

Fixing the panel left a THIRD reader of the same bytes. `wm_watchlists` had
three readers that disagreed about what one stored list means:

| reader | rule | defect |
|---|---|---|
| `WatchlistPanel` init | `Array.from(new Set(p[k]))` | no entry check → ErrorBoundary |
| `WatchlistPanel` import | `String(s).toUpperCase()` | invents symbols |
| `WatchlistGrid` | `Array.isArray(syms) ? syms : []` | container only |

`storedSymbolListAdoption.test.ts` now enumerates the readers and enforces the
single owner.

---

## PROOF

- `tsc --noEmit --skipLibCheck` — clean
- `vitest run` — **4982/4982 across 454 files**
- `next build` — clean
- Hands-on operator pass in the running app for every user-visible atom

### Hands-on, with the REAL controls (not injected state)

- Clicked the pencil, typed `mnq1!` into the actual add field, pressed Enter,
  reloaded → survives, renders `MNQ1! quote pending`. **This is the exact gate
  the old code failed**, and `MNQ1!` is deliberately on no default and no
  suggestion list — adding AMD to a catalogue fixes AMD and nothing else.
- `["AAPL",42,"NVDA",{"x":1}]` → renders AAPL + NVDA, storage self-heals
- `"{not json at all"` → rail recovers to the 13 defaults and stays **alive**
- `EUR/USD` row: `no feed`, hover reads *"no forex feed on the tape. This is not
  a delay — no request is made for this symbol."*
- Datalist: 39 symbols offered, 0 containing `/`, AMD + BTC + NQ1! intact
- Watchlist with the corrupt list: `2/2 verified quotes`, AAPL 320.01, NVDA
  229.50, no ErrorBoundary
- Grid view with `["AAPL",42,"NVDA",{},"TSLA"]`: 3 cards, 12 canvases drawn, no
  fabricated `"42"` card

### BREAK/RECOVER (§22)

Every rewritten Sentinel was **mutation-tested** — the invariant was broken in
the real source and the test confirmed to fail, then restored.

**This caught a real hole rather than confirming what I already believed.** My
first rewrite of the `chgObserved` write-check passed *while the flag was
deleted from the cache write*, because a loose repo-wide match was satisfied by
a different line (the row-mapping helper). It is now scoped to the `priceCache`
statement itself. Had I trusted the green, I would have shipped a Sentinel
guarding nothing.

---

## FORM-FACTOR PARITY

| form factor | result |
|---|---|
| Desktop | rail visible, pencil clickable, all atoms verified |
| Tablet 768 | rail visible, pencil clickable, `MNQ1!` present |
| Phone ≤639 | **tape not rendered at all** — `.wm-shell-ticker` is `display:none` (globals.css:417, pre-existing and deliberate; `MobileSessionPill` is the substitute). Unchanged by this shift. |

A DOM-text read initially reported the phone tape as present — the node is in
the DOM but `display:none`. **That was a false green caught by the parity pass**
and is corrected here.

---

## HONEST LIMITATIONS

- **`preview_screenshot` timed out (30s) for this entire session.** Every visual
  claim above is a DOM/`preview_eval` measurement. **No screenshot proof exists
  for any atom in this shift.** Per the mobile/visual-confirmation standard this
  is a real gap, not a formality.
- Three source-text Sentinels were rewritten (`marketTruthSurface`,
  `sessionChangeTruth`, `tickerTapePollingTruth`). Each guarded a live invariant
  and was pinned to an identifier that moved. All were re-expressed to bind
  behaviour and mutation-tested. **A reviewer should confirm I loosened no
  invariant** — this is the change in this shift most capable of hiding a
  regression.
- Nothing was verified against Cloudflare production this session; all proof is
  local.
- No Supabase migration applied. No secret touched. No destructive git op.

---

## SETTLED, NOT CHANGED

`/command-deck`'s `contradictions 1` was investigated as a suspected
count-without-content defect. **It is not a defect.** One click on WHY? names it
verbatim: *"Displayed ticker price has no matching timestamped runtime tick;
canonical price evidence omitted."* Recorded so the next thread does not re-open
it.

`Session · UNOBSERVED` on the deck was investigated as a suspected wire gap.
**It is not one.** The presented token is literally `SESSION ?`, and
`deckSceneSignals.sessionOpenFrom` correctly refuses to invent. Wiring it would
be the exact mistake that file's own comment warns against.

---

## NEXT REAL EDGE

**The deck says `Quality state UNAVAILABLE. 0 coverage channel(s)` while the
ticker tape on the same screen displays AAPL 320.01 and NVDA 229.50.** Two price
systems, one screen: one showing numbers, the other saying it has observed
nothing. The deck's own contradiction already names this. That is the honest
next target, and it is likely the `canonicalMarketStateStore` UI-adoption gap
tracked as P00290.

Second: `expressionCard.ts` is now the LAST §10 compiler with no surface.
