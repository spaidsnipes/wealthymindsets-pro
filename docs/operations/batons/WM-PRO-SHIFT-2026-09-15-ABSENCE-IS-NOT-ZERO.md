# Baton — ABSENCE IS NOT ZERO

**Sealed:** 2026-09-15 · **Block:** ten commits, eight defects, one law
**Law:** H1 — *absence is not zero* · LABEL-NOT-MODEL · canon §9

---

## What this block was

One law, applied four times, in four rooms, in four different disguises.

Every defect in this block had the same skeleton: **WM computed something
truthful about nothing, and then rendered it as though it were something.** The
arithmetic was correct every single time. The label was wrong every single time.

That is why no selector was modified in this entire block. Not one. The cure
was always at the render layer, and that is not a coincidence — it is the
diagnosis.

---

## The ledger

| # | Commit | Room | The disguise |
|---|---|---|---|
| 1 | `ce90890` | `/command-deck` | Opening Bell items hardcoded `completed: false` — an accusation built from zero observation |
| 2 | `b326282` | `/morning-prep` | The same panel fabricating BOTH a NOT DONE *and* a DONE stamped with a completion time |
| 3 | `42b4106` | `/command-deck` | Prep evidence gated on `chainVm` — an unobserved MARKET silencing an observable fact about the PERSON |
| 4 | `5233fa6` | `/journal` | `+$0.00` in the GREEN tint on an empty book, beside a chip reading "no trades taken" |
| 5 | `e714b04` | `/paper` | A 👑 crown and "🎉 prize zone" for ranking #1 in a field containing only the trader |
| 6 | `2c624f9` | `/paper` | `+0.0%` and `+$0` in the GREEN tint on a row reading `TRADES 0`, three cells from the `—` that WIN% gets right |
| 7 | `6635859` | `/paper` | `DAY P&L +$0.00` · `REALIZED +$0.00` · `+0.00 today (0.00%)`, all GREEN, in the account header of a book holding zero trades and zero positions |
| 8 | `9bc3844` | `/command-deck` | `MirrorPanel` gated on `chainVm` — an unobserved MARKET erasing the trader's own reflection, **eight lines below the comment that diagnoses this exact coupling** |

Receipts: `3088369`, `c5d6435`, `98a7f30`, `3a65192`
(dispatches `2358`, `2359`, `2360`, `2361`, `2362`).

---

## The four shapes H1 wore

Worth naming separately, because the next one will wear a fifth.

1. **Fabricated absence** — rendering "not done" from having never looked.
   *A false NOT DONE can be argued with. A false DONE is a record of something
   the trader never did, wearing a timestamp.*

2. **Structural H1** — an unobserved fact in one domain silencing an observable
   fact in an unrelated domain. The deck told the trader nothing about their own
   prep because the *market* was unreadable — and an unresolved market is
   exactly when PREPARATION matters most, so the panel vanished precisely when
   it was most useful.

3. **Chromatic H1** — colour is a claim. Green asserts money was made. `0 >= 0`
   is true, so every `>= 0 ? green : red` will congratulate a trader for a day
   they did not trade.

4. **Population H1** — rank, percentile, streak and podium are claims about a
   SET. Being 1st of 1 is arithmetically true and a complete fabrication as an
   achievement.

---

**A note on the fifth shape.** This section predicted the next defect would
wear a fifth disguise. It did not — and then it did not again, twice.

`2c624f9` wore the **third** (chromatic) in a room the block had already
visited and fixed. `6635859` wore the **third again**, in a third room on that
same page. `9bc3844` wore the **second** (structural), in the room where the
second shape was first named and cured.

Eight defects, four shapes, and the last three were all repeats. The
prediction was wrong in an instructive direction: **a shape does not retire
when you name it, and the surface you just cured is not thereby clean.** Left
uncorrected above, corrected here.

---

## Method lessons that cost something to learn

**Read the receipt.** `2c624f9` was found *inside the screenshot taken to
prove `e714b04`*. The crown was gone and the row underneath it read
`+0.0%` / `+$0` in `rgb(0, 212, 170)` on a book with zero trades. The image
you capture to close one atom is also a fresh, unfiltered look at a surface
you have stopped assuming things about. Two of the last three defects in this
block were found in the act of verifying the previous one.

**A comment guards the cell it sits on and nothing else.** The WIN% column had
the entire diagnosis written above it — *"Colouring 'no closed trades yet' as
failure is the same overclaim as printing 0%"* — and the two cells three
columns to its left shipped that exact overclaim anyway, in the same row, off
the same record. That is the argument for Sentinels over comments, made by the
codebase without being asked.

**The neighbour rule, stated properly.** Three times in this block a defect
was found beside an element that already handled absence correctly — the WR
chip beside the P&L chip, the Win% column beside the rank badge, the Win% cell
beside its own row's RETURN. When one element on a surface gets absence right
and its neighbour does not, that is not reassurance. Somebody already thought
about this here and stopped at the cell they were working on. **Look at the
whole row.**

**Sentinel the over-corrections — twice in a row is a pattern, not a
precaution.** Both `e714b04` and `2c624f9` needed guards against the two wrong
fixes (delete the honest half; fake the population / mute everything). This is
now the assumed shape of a Sentinel set, not an extra.


**Deploy identity is not observation.** A poll for a literal string returned
`FOUND on poll 1` seconds after a push — impossible for a Cloudflare build. The
string had shipped in a *previous* commit. The reliable proxy is **chunkset
identity** (md5 of the route's sorted chunk URLs, polled until it CHANGES) — and
even that only proves a build arrived, never that the pixel is right.

**The strongest finding of the block came after the tests were green.** From
dispatch `2358`:

> The unit tests were green, the Sentinels were green, the component was
> correct, and the panel still was not on the screen.

Defect #3 exists only because someone opened the page. Live verification is a
step, not a formality.

**A Sentinel can pin syntax rather than intent.** `dataQuality: coverageQuality`
broke on a correct refactor to `dataQuality={coverageQuality}`. Update the
assertion *and write down why it moved* — "I updated the failing test" is
exactly the sentence a weakened Sentinel hides behind.

**Guard on the owner's own counters.** The empty-book branch reads
`recordedTotal.counted === 0 && recordedTotal.unreadable === 0`, and the
leaderboard reads `board.length > 1`. Never a second, independent notion of
"empty" — it will drift away from the thing it describes. If the world changes,
these guards re-light on their own.

**Sentinel the over-corrections too.** Two of the six on `e714b04` guard against
deleting the honest half and against inventing opponents. A set that only
forbids the defect leaves both wrong fixes wide open.

**The cure ships in ONE component.** `OpeningBellEvidence` exists because the
defect was found twice, in two rooms, and the second copy had mutated further
from the truth. Non-forkable wording cannot rot on one screen while looking
healthy on the other.

---

## Gates at seal

```
Test Files  596 passed (596)
Tests       6964 passed (6964)
VITEST_EXIT=0
TSC_EXIT=0
```

Test count across the block: 6935 → 6936 → 6938 → 6944 → 6950 → 6957 → 6964.
REVIVE §22 proven **by name** on every code fix, via the Edit tool only, each
file restored byte-identical.

---

## Live status — honest

| Commit | Status |
|---|---|
| `b326282` | **PROVEN** — observed on `/morning-prep` |
| `42b4106` | **PROVEN** — observed on `/command-deck`, PREP phase, with the deck simultaneously reading MARKET STATE UNKNOWN (the exact condition that used to erase it) |
| `5233fa6` | **PROVEN** — observed on `/journal`, empty book, zero `$0.00` spans on the page |
| `e714b04` | **PARTIALLY PROVEN** — the podium half observed on `/paper` (row `1 · You ⭐ · +0.0% · +$0 · 0 · —`, no 👑 in the row's `outerHTML`; the remaining crown is the external contest's prize-tier legend, checked not assumed). The `NO FIELD TO RANK AGAINST` callout is gated on `myTrades > 0` and the Founder's book reads `Blotter (0)` — **not observable today, therefore not claimed.** |
| `2c624f9` | **PROVEN** — observed on `/paper`. The row reads `1 · You ⭐ · — · — · 0 · —` with RETURN and P&L both computing `rgb(139, 149, 165)`; no `+0.0%` anywhere on the page. The surviving green span in the row is the `You ⭐` identity marker (`isMe ? green`), checked not assumed. |
| `6635859` | **PROVEN** — observed on `/paper`. `DAY P&L —` and `REALIZED —` both `rgb(139, 149, 165)`; `EQUITY $100,000` and `CASH $100,000` untouched; the equity card reads *"No trades placed — nothing to measure yet"*. A scan for leaf nodes matching `^[+-]?\$?0\.00$` returns **0**. |
| `9bc3844` | **CURE NOT OBSERVABLE — not claimed. One over-correction guard PROVEN.** The deck was driven to `Phase: Review` with the page simultaneously reading `MARKET STATE UNKNOWN` (0/8 dimensions resolved) — the exact intersection under test — and **no empty frame appeared**. That proves the self-silencing the ungating depends on, live. It does *not* prove the gate was removed: `MirrorPanel` returns null at zero patterns and the Founder has no decisions, so the panel is absent under old and new code alike. |

---

## Open, carried forward

**Found while verifying, deliberately not rushed:**

- The Opening Bell region on `/command-deck` sits inside
  `<details class="wm-cd-secondary-workspace">`, **closed by default**. Nothing
  false is on screen — it is a placement question. During PREPARATION, the panel
  that answers "am I prepared" is one collapsed disclosure away. Where it
  belongs is a canon call.
- ~~`src/app/command-deck/page.tsx` still has six other `chainVm &&` gates,
  including MirrorPanel.~~ **CLOSED as defect #8 (`9bc3844`).** It *was* the
  same nest in a sibling slot: `selectMirror` was read end to end and touches
  market state at no depth. Five `chainVm &&` gates remain on that page —
  1617, 1667, 1679, 1707, 1713 — plus the ATHOS gate at 1846, which is
  **correct and must stay**, because ATHOS interventions are compiled *with*
  `chainVm`. Each of the five needs the same question asked individually:
  *does this panel's content depend on the market, or only on the person?*
  Stripping them wholesale would be the opposite error.

**Swept clean this block (recorded, not manufactured into atoms):**

- Streak badges on `/morning-prep` and `/journal` — already silent at zero, and
  they disclose unreadable records separately from a genuine zero.
- `/creator` — `CREATORS` is empty and the page already says *"No creator
  earnings have been verified and published yet."*
- Eleven of the twelve green-tint sites — legitimate; a scratched trade really
  is a flat result.

**Still blocked, untouched, do not retry:**

- Gate 4 responsive device proof — programmatic window resize does not take
  effect, `outerWidth` pinned. Script route classifier-denied.
- `/journal` detail canvas — 0 journal entries in the Founder's book.
- Delta + VP raster half — no per-trade tape available.
- Decision Memory sealing — zero production callers. **Architectural. Surface
  it; do not rush-wire it to close a gate. It needs a decision surface first.**
- `executionConnectivity` orphaned — not a live defect; `/readiness` discloses
  it honestly.

---

## The next sweep, already specified

Ask of every ranking, streak, badge, percentile and podium on the product:
**what is the population, and did we observe it?**

Grep targets: `.findIndex(… isMe)`, `top N`, `percentile`, `rank`, and any
surface whose population is the trader alone.
