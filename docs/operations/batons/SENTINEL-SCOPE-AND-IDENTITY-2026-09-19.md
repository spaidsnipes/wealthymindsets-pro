<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **shift baton** — a hand-off written at the end of one shift. Its
> filename names its own day. It was true on that day and is preserved as
> evidence of what was observed and decided then. Do not take a current action,
> diagnosis, release decision or task claim from it.
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
> Demoted 2026-09-19 at the moment of writing, by the same gate this document
> reports on. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

# BATON — sentinel scope, and a store key that minted two identities

**Day:** 2026-09-19 · **Commits:** `da1e2bc0` → `fc889cc8` (5)
**Gates moved:** M5 CLOSED, M6 CLOSED-then-CORRECTED
**Suite at seal:** `./node_modules/.bin/vitest run` EXIT 0 — 822 files, 10466
passed, 2 skipped. `./node_modules/.bin/tsc --noEmit` EXIT 0. Both unpiped.

---

## 1. The finding worth carrying forward

**A scan's scope is an assertion about the world.** `datedDocsAreDemoted`
shipped in `da1e2bc0` with a non-recursive `readdirSync`. It found 47 undemoted
dated documents at the top level of `docs/operations`, they were stamped, the
gate went green, and M6 was closed on that number.

The number was wrong by 308. The five subdirectories — `batons/`,
`dispatches/`, `scoreboards/`, `handoffs/`, `huddles/` — hold 311 further
markdown files, of which **308 carried a date in the filename and not one was
demoted**. Every one of those directories is point-in-time *by name*: a baton
is a hand-off at a moment, a huddle is a meeting on a day, a scoreboard is a
count at a time. They are the densest possible concentration of exactly the
defect the gate describes, and they sat one directory level down from it.

So the file that exists to refuse vacuous green produced vacuous green. That is
kept in its own docblock rather than quietly fixed, because "use a recursive
walk" is not the lesson. The lesson is that nobody measured whether
`docs/operations` was flat before asserting that it was.

**Carry-forward question for the next worker, applicable to every Sentinel in
`src/lib/ops/`: what is this scan's scope, and who measured it?**

## 2. What actually landed

| Commit | What |
|---|---|
| `da1e2bc0` | `datedDocsAreDemoted` sentinel + 46 top-level docs demoted |
| `7e043ba5` | M5 closed with a machine; M6 closed on measurement of both halves; 3 dead source-comment pointers fixed |
| `79f72e88` | `canonicalInstrumentId` idempotency fix + 2 tests |
| `fc889cc8` | recursive walk + 308 subdirectory docs demoted + M6 row corrected in place |

## 3. The real latent defect: a store key with two spellings

Found by probing rather than by reading. `canonicalInstrumentId`'s docblock
promises `crypto → "<TICKER>-USD"`, but the code appended `-USD` to the whole
input: `f("BTC")` = `BTC-USD`, `f("BTC-USD")` = `BTC-USD-USD`. The return value
is a canonical **store key**, so a second application anywhere in a chain mints
a second identity for one instrument and the reader then looks up a key nothing
ever writes — empty surface, no error, forever.

**Recorded as LATENT, not live.** Every production picker in the tree emits the
bare base: `ChartToolbar`, `WatchlistPanel`, `AssetClassSwitcher`,
`shellPanels`, `/ai-bot`, `/backtesting` all pass `"BTC"`. It was reachable
only from a journal entry whose symbol was typed in an already-quoted spelling.

Fixed by stripping the quote currency before re-quoting, which deliberately
also collapses `BTCUSD`, `BTC/USD` and `BTC-USDT` onto the single identity
`BTC-USD` — the identity layer answers "which instrument", and those are one
instrument.

**Mutation proof:** clean EXIT 0 (51 passed) → revert to the unconditional
suffix → EXIT 1 with both new tests failing by name, one reporting
`"BTC-USD-USD"` and the other reporting 5 rival identities for Bitcoin →
byte-exact restore → EXIT 0.

## 4. A false proof I caught on myself, recorded so it stays caught

An earlier mutation attempt used `perl -0pi -e` with an escaped regex. The
substitution silently did not apply and the run reported `MUTANT_EXIT=0`. The
verification grep printed nothing, which is the tell. **An EXIT 0 from a mutant
that was never applied is not evidence of anything.** Redone with a `python3`
heredoc carrying `assert old in s, "anchor not found"`, which printed
`MUTANT APPLIED` before the real EXIT 1 arrived.

Procedure for the next worker: **a mutation proof must print that the mutation
landed before it prints the exit code.**

## 5. Blockers, stated honestly

- **`npm run deploy:cf` is denied by the agent's own permission classifier.**
  Attempted repeatedly; not worked around. **Nine commits are now pushed to
  `main` and are NOT serving.** The worker version live at seal time is
  `72a69e89-ade5-4bd0-aa6b-c1db362de484`, deployed by David
  2026-09-19T22:30:46.796Z. **Nothing in this baton has been live-observed.**
  Everything above is test-and-typecheck evidence only. Needs the Founder to
  run the deploy, or to grant the permission.
- **Gate 4 responsive device proof** remains blocked: programmatic window
  resize does not take effect, `outerWidth` stays pinned.
- **`/journal` detail canvas** remains blocked: zero journal entries exist, and
  a canvas verified against a fabricated entry proves only that the fabricator
  agrees with itself.

## 6. What is still not covered, and why no gate was built

The **17 ops docs with no date in the filename** are outside
`datedDocsAreDemoted`'s reach entirely. Two candidate rules for them were
measured and rejected — one produced 70 offending units that were mostly table
legends and template headers, the other produced 1 offender out of 64, i.e.
sixty-three docs passing by accident. Neither teaches care. **The honest reason
there is no gate is that no proposed rule survived measurement**, not that the
problem is solved.
