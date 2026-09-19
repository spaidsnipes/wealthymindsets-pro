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

# TENANT 8 — SESSION WATCH, AND THE DEFECT 8548 GREEN TESTS WERE BLIND TO

Date: 2026-09-17
Commits: `141aa72a` (eighth tenant), `16310c77` (the equipment speaks WM)
CI: `35209785857` success · `35210502030` success
Live: https://wealthymindsetspro.com/command-deck?equip=session-watch

## WHAT THIS BLOCK CLOSED

`ATHOSInterventionPanel` — the thing that notices when HOW you are trading this
session is worth stopping for — became the eighth WORKSPACE tenant and the
second DOUBLE BURIAL to be discharged. Rail entry `session-watch`, label
"What WM is watching".

The full grammar was walked on PROD, not inferred:

| Stage | Measured |
| --- | --- |
| baseline (pre-deploy) | 7 rails |
| ROOM | 8 rails, last is `session-watch` |
| PREVIEW | `0 raised` / `no escalation` — real counts, not placeholders |
| DRAWER | `data-athos-disclosed="1"`, `detailsDepth: 0` (burial gone) |
| ENTER | `stage=full` |
| RETURN | `stage=drawer`, room intact |

That is the directive's own acceptance test: preview it, enter it, experience
its depth, return without losing my place. PASS.

## THE THING THAT ACTUALLY MATTERED

**The live walk is a detector, not a formality.**

Walking the prod drawer showed the trader this sentence:

> Nothing to raise — **ATHOS** has watched this session…

8548 tests were green over it. The directive bans exposing internal
architecture in Founder-facing UI by name, and the rail label had already been
written to avoid it — and then the BODY COPY said it anyway. The rail label is
not the only surface. The preview headline is what the trader reads BEFORE
deciding whether to open anything, and it lives in the ROOM, not the registry:
exactly the seam the defect fell through.

Fixed at both sites to "WM has watched…", then pinned twice — once over the
registry + descriptor (`roomAdoptsEquipment`), once over RENDERED markup
(`theMirrorIsNotAMarketPanel`, that file's first rendering rule). A source scan
cannot answer "what does the trader see" without also banning the import, the
component name, and the test ids — none of which the trader reads.

**The first copy sentinel was VACUOUS and its own probe caught it.**
Draft one extracted string literals with `/"([^"\\]{8,})"/g`. Over real `.tsx`
that matches the GAPS BETWEEN literals — quote pairing does not survive a naive
regex. Probe H (putting the internal name back into the headline) PASSED, which
is how it was found. Replaced with a standalone-token test (`/\bATHOS\b/`),
which needs no tokenizer and is not fooled: every legitimate code occurrence is
a longer identifier (`ATHOSInterventionPanel`) and `\b` refuses those. Probe H
then went red.

A rule that passes its own probe is not a rule. It is decoration.

## THREE SENTINELS RE-PINNED — NONE DELETED, ALL STRONGER

**1. `roomAdoptsEquipment`: a fixed character window is a rule pinned to a
file's current LENGTH, not to its meaning.** `deck.slice(chooser, chooser + 400)`
went RED on a CORRECT eighth tenant, and would have gone quietly WEAKER on a
room that shrank — accepting a memo that merely happened to sit downstream.
Re-pinned to the chooser statement's own end (`indexOf(";")`, safe because the
object literal contains no `;`). Strictly stronger: every descriptor memo must
now appear INSIDE the chooser, not merely near it.

**2. `theMirrorIsNotAMarketPanel` self-silence: went red on a change that
STRENGTHENED the thing it guards.** §14 governs the UNPROMPTED case; a trader
who deliberately opens the door has asked, and a blank panel then is not
silence, it is a broken door. The empty path forked. The rule now pins BOTH
halves, so neither can drift: un-forking goes red on the first assertion,
deleting the disclosed branch goes red on the second.

**3. `buriedOnlyIsARegister`: 16 → 15.** The register's THIRD discharge and the
first to require TWO cures (the `{chainVm && …}` market gate in `f12998a3`,
then the equipment door). Recorded in place rather than silently deleted,
because the whole claim of that file is that the number cannot move without
somebody looking. The buried mount was NOT removed — buried-ONLY means every
mount is buried, and this one now has an unburied one.

Six anti-vacuity probes run RED before trusting any of it.

## HONEST LIMITS

- **The populated path is proved by test and sentinel, NOT by eye.** The Founder
  has 0 session decisions, so the considerations list, the `unabridged` cap, and
  the `data-athos-considerations-withheld` marker were never seen rendering real
  content on prod. Do not claim otherwise.
- **ENTER on equipment with nothing deeper is a silent no-op.** Curing it would
  require the Room to know the equipment's CONTENTS — the second semantic brain
  the directive bans by name. Recorded as an open Founder question, not fixed.

## DEBT REGISTER AFTER TENANT 8

- `DecisionWhyPanel` — IS the drawer. Needs a Founder ruling before it can be a
  tenant of itself.
- `WhyInspector` — target-driven via a `target` prop; may not be standing
  equipment at all.
- `MarketCanvasPanel` at `page.tsx:~1704` — twice buried. DECISION REQUESTED.

## UNCHANGED BLOCKERS

- `/journal` detail canvas — 0 journal entries. Will not fabricate entries into
  the Founder's production localStorage to manufacture a screenshot.
- Gate 4 responsive device proof — programmatic window resize does not take
  effect; `outerWidth` stays pinned.
