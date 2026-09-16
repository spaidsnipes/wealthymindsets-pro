# WM PRO SHIFT BATON — 2026-09-15-B — THE ORPHANAGE TRIAGE

Four commits. They start from a question the previous baton left open — *what
are the fourteen orphan components?* — and they end with all fourteen answered
and one live hazard deleted. Along the way this baton was wrong twice, in
public, and both corrections are in the commits rather than in hindsight.

    0b00c81  A RETIREMENT IS NOT A DEBT
    c369aa9  A SUPERSEDED MODULE IS NOT AN UNFINISHED ONE
    c7bb909  SIX FOR SIX — AN UNREFERENCED COMPONENT IS A QUESTION, NOT A DIAGNOSIS
    50800a4  TWO ERROR BOUNDARIES UNDER ONE NAME IS A COIN FLIP   <- corrects c7bb909

---

## 1. The question inherited

`c85256b` made `src/app` the only walk root and froze **14 components that no
route renders** as a bidirectional ceiling in `KNOWN_ORPHAN_COMPONENTS`. It
deliberately did NOT give them reasons — inventing fourteen justifications
would have put guesses in the file that holds facts.

This baton triaged all fourteen. The triage instrument is one line, and it is
the only thing in this document that generalises:

    RUN `git log` ON THE COMPONENT BEFORE DECIDING IT IS MISSING SOMETHING.

## 2. The three-way taxonomy, arrived at one error at a time

The ledger began with one reason for "no route renders this": `DEAD_CONSUMER`.
That single bucket was wrong twice, and each correction shipped as its own law.

    DEAD_CONSUMER    built, never mounted.                    -> debt.
    RETIRED_BY_SPEC  built, mounted, deliberately unmounted.  -> a decision.
    SUPERSEDED       built, mounted, REPLACED by an honest owner.

Each hands the next engineer a different instruction: *"mount it or delete it"*,
*"the decision was to have less"*, *"this is already done correctly elsewhere,
go find it."*

**SUPERSEDED is the most dangerous to mis-file**, because the replacement is
usually a TRUTH fix. Restoring a superseded module does not duplicate work — it
restores the defect the replacement was written to kill.

`× THE REVIVED RETIREMENT` now covers both closing reasons and requires every
entry to name a lock file **that exists**, with non-vacuity that each reason is
actually exercised. The strongest claim a ledger can make — *leave this alone* —
must be checkable, or it is just a word that stops questions.

## 3. The false history the taxonomy caught (c369aa9)

The ledger said of `selectOpeningBell.ts`: *"Selector and panel were both built;
the mount was never made."* That is not what happened.

    74ad348  wire OpeningBellPanel above the feed
    ce90890  Opening Bell accused the trader of rushing, from zero observation
    b326282  stop the Opening Bell fabricating both a NOT DONE and a DONE

The mount WAS made, then torn out of **both** rooms, because it rendered a
verdict about the trader's morning from no observation of the trader: six items
hardcoded NOT DONE on one surface; two marked DONE on the other, stamped with a
completion TIME the trader never earned.

Describing that as *"the mount was never made"* is worse than merely wrong. It
describes finished work as unfinished, so it reads as an invitation.

### The hole this found, and the measurement that proved it real

`b326282`'s locks pin the fabrication's **spelling** — `completed: false`,
`completedAt:`, `hasTodayEntry` — inside the two route files. But
`OpeningBellPanel` is a **pure display consumer**: it renders whatever vm it is
handed. The accusation can return with the route files' spelling untouched.

`× THE SUPERSEDED PANEL` pins the **mount** instead, on both rooms, with
non-vacuity on the Evidence surface still being present and on `codeOnly` really
stripping comments — **A COMMENT IS NOT A CONSUMER**.

**§22 REVIVAL J2, the one that matters.** Changed `completed: false` to
`completed: Boolean(0)`. Still compiles. MEASURED: **the old spelling-pinned
lock PASSES**, and `1 failed | 17 passed` — the only failure is
`× THE SUPERSEDED PANEL`. The escape route was one character substitution wide.

> **A SENTINEL PINNED TO A SPELLING IS NOT PINNED TO A MEANING** — measured,
> not asserted.

## 4. The generalisation this baton made, and then had to retract

After six orphans came back as retirements, `c7bb909` wrote into the docblock:
*"six for six… the prior assumption has now been wrong every time it was
actually checked."*

Then the remaining eight were checked and broke the streak flatly. **Seven of
the last eight have exactly ONE commit that ever touched a reference to them:
their own creation.** No mount was ever made, so none was taken away. They are
**born orphans**, and born orphans really are debt.

Six retirements and seven born orphans looked **identical** from the import
graph. A streak of six was not a pattern, it was a sampling order — the
retirements happened to have the loudest names. The honest finding is not a rule
in either direction:

> **THE IMPORT GRAPH REPORTS "RETIRED" AND "NEVER FINISHED" IDENTICALLY.
> ONLY HISTORY SEPARATES THEM, AND IT SEPARATES THEM EVERY TIME.**

This is the same species of error as `dcdb403` in the previous baton: a
confident conclusion from a real measurement, quantified over cases the
measurement did not cover. Two batons running, that is the failure mode.

### The refinement that paid for itself immediately

> **A FILE'S OWN HISTORY IS NOT ITS MOUNT'S HISTORY.**

The mount lives in the route that imported it, so ask the graph's history:

    git log -S"<ComponentName>" -- src/app src/components

`TimeframeSelector` is the proof. **Six** commits in its own log — reads as a
long-maintained component. **One** commit touching any reference to it. Six
commits of upkeep on something no route has ever rendered.

## 5. The live hazard the finished triage exposed (50800a4)

Two classes were exported as `ErrorBoundary`:

| | `ui/ErrorBoundary.tsx` (live) | `components/ErrorBoundary.tsx` (dead) |
|---|---|---|
| mounted by | MainLayout, ChartsDashboard | nothing |
| scope | panel, `minHeight: 120` | `minHeight: 100vh` |
| fallback prop | yes | no |
| SafePanel | exported here | absent |
| recovery | `setState` — **in place** | `window.location.reload()` |

A dead duplicate is debt. **This one was a trap**: the twins are not equivalent,
the dead one is the destructive one, and it sat at the **shorter, more guessable
import path** (`@/components/ErrorBoundary`) — the cheaper thing to type was the
wrong thing to type. One panel throwing under it would have blanked the whole
viewport and offered the trader one button: a reload that discards every unsaved
in-memory thing a session holds — drawings, a half-filled order ticket, journal
text not yet committed.

> **AN ERROR BOUNDARY IS A PROMISE ABOUT HOW MUCH YOU LOSE WHEN SOMETHING
> BREAKS.** Two of them making different promises under one name is a coin flip.

`× THE SECOND ERROR BOUNDARY` pins exactly one **declaring** file (matching
`class ErrorBoundary`, so imports and JSX usage stay legal), plus a second
assertion that the survivor still keeps the promise that made it the survivor.

**The revival here was not synthesized.** The lock was written and RUN against
the real pre-fix tree, where it failed with
`expected [ Array(2) ] to deeply equal [ 'components/ui/ErrorBoundary.tsx' ]`.
The defect was still standing when the lock was written, so the §22 obligation
was discharged by the commit itself.

## 6. The guarded-orphan finding

`FailureStateChip` and `TruthStatusChip` are born orphans **with passing
single-writer enforcement tests**. They pass by forbidding their label
vocabulary everywhere else — while the chips that own it are mounted nowhere.

> **A SINGLE-WRITER LOCK OVER AN UNMOUNTED WRITER GUARANTEES THE LABELS ARE
> SHOWN BY NOBODY.**

Green locks are not evidence of liveness. Annotated so they are not misread.

## 7. The orphanage, fully triaged

**Closed questions — do NOT "fix" these by mounting them:**

| Component | Reason | Held by |
|---|---|---|
| `WMSessionVP` | retired per Founder spec `89a350e` | `sessionVpRetired.test.ts` |
| `OpeningBellPanel` | superseded `ce90890`/`b326282` | `openingBellPrep.test.ts` |
| `CinematicAtmosphere` | retired `1677698` | `responsiveShell.test.ts` |
| `BottomIndexBar` | retired `aa54175` (2nd ticker) | `chartsMarketFirst.test.ts` |
| `OrderFlowCockpitStrip` | retired `777665d` | `chartsMarketFirst` + `chartsRoomChrome` |
| `HeaderVaultPill` | retired `6ae33ea` (private vocab in a public header) | `shellPublicVocabulary.test.ts` |

**Open debt — born orphans. Mount them or delete them:**
`ExecutionReceiptCard` · `ConnectedStoryRibbon` · `TimeframeSelector` ·
`CanvasBadgeMini` · `FailureStateChip` · `TruthStatusChip` · `HeroNumber`

`src/components/ErrorBoundary.tsx` **left the list by being deleted** — the
ceiling is bidirectional, so a name that stops being an orphan must leave.

`× THE ROTTED ANNOTATION` keeps the table above honest: every lock file cited by
an annotation must exist. **It caught its own author on its first run** — a bare
`chartsMarketFirst.test.ts` instead of a repo-relative path. A lock whose first
victim is the commit introducing it has at least been run.

## 8. §22 revivals this baton — all VALID

| # | Defect revived | Caught by |
|---|---|---|
| I | ledger note re-pointed at a non-existent lock | `× THE REVIVED RETIREMENT` |
| J | `OpeningBellPanel` re-mounted on `/command-deck` | `× THE SUPERSEDED PANEL` + 3 |
| J2 | `completed: false` → `completed: Boolean(0)` | `× THE SUPERSEDED PANEL` **alone** |
| K | annotation cites `responsiveShellChrome.test.ts` | `× THE ROTTED ANNOTATION` |
| — | (ErrorBoundary — measured on the real pre-fix tree, §5) | `× THE SECOND ERROR BOUNDARY` |

**Revival J did not compile on its first form** — route files may not export
arbitrary components, and `OpeningBellInput` needed three more fields. **A
REVIVAL THAT DOES NOT COMPILE IS INVALID**, so it was repaired to
`REVIVED_TSC_EXIT=0` before the measurement counted. Every revival restored
byte-identical (`git diff` empty).

`noUnusedLocals` is still OFF. **The type system cannot catch dead wiring in
this repo.** That is why these are Sentinels and not types.

## 9. Honest non-claims

All four commits are Sentinel-and-ledger work plus one deletion of a file
nothing imported. **There is no rendered surface change in this block, so there
is nothing pixel-visible to verify, and nothing was upgraded to PROVEN on
deploy identity alone.** The receipts here are gate exits and named lock
failures, which is the appropriate evidence for this kind of work.

## 10. Still blocked — unchanged, carried forward

- **Gate 4 responsive device proof** — programmatic resize does not take effect.
  **The script route was classifier-denied; do not retry by another route.**
- **Decision Memory sealing** — zero production callers. Architectural. Needs a
  decision surface first. **Do not rush-wire it to close a gate.**
- **Live VP** — the retired panel is NOT the target. Any future proof must aim
  at the ON-CHART `sessionVPChart` / "WM Session VP" / "WM Fixed VP", which do
  not import `src/lib/sessionVP.ts`.
- `/journal` detail canvas, `/proof-lane` — 0 entries. `/paper` blotter — 0
  orders. Delta Bubbles / Live VP raster — no per-trade tape on the free tier.
- `executionConnectivity` — orphaned, not a live defect; `/readiness` discloses.

## 11. Next

The seven born orphans are the first concrete, non-blocked backlog this repo has
had in a while — each is a decision someone can actually make. The pair
`FailureStateChip` / `TruthStatusChip` is the highest value of the seven,
because they were built as canon single-writers for vocabulary the product is
currently forbidden from showing anywhere.

---

**GATES at seal:** `tsc --noEmit` exit 0; `vitest run` exit 0, **631 files /
7481 tests**, unpiped. All four commits pushed to `main`.
