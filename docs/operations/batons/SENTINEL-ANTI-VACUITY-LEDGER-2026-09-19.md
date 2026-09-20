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
> Demoted 2026-09-19 at the moment of writing. The demotion was not volunteered:
> `datedDocsAreDemoted.sentinel.test.ts` failed the full suite on this very file
> and named it. A Sentinel caught the author of a Sentinel baton — recorded here
> because that is the whole point of the class.
<!-- END:ath-historical-lineage -->

# BATON — Anti-vacuity: teaching 14 Sentinels to prove they looked

**Sealed** 2026-09-19. **Commits** `b4da29a3` … `bd4c1826` (7).
**Predecessor** `SENTINEL-SCOPE-AND-IDENTITY-2026-09-19.md`, which closed at `fc889cc8`.

---

## THE DEFECT CLASS

A large family of Sentinels in this repo polices the codebase by scanning:

```ts
const files = walk(SRC_ROOT).filter(...);
for (const f of files) if (bad(f)) violations.push(f);
expect(violations).toEqual([]);
```

**That shape is green whether you LOOKED AND FOUND NOTHING, or DID NOT LOOK.**
A Sentinel policing nothing is indistinguishable, from the outside, from a
Sentinel finding nothing wrong.

It has really happened here three times — recorded in
`src/lib/ops/sentinelsProveTheyScanned.test.ts`, the meta-Sentinel that now
polices the class and carries a frozen, ratcheting debt ledger.

**Ledger movement this block: 26 → 4.**

## THE THREE EMPTINESS MODES

A scan is `walk → filter → match`. Each step can empty independently, and a
file count only sees the first.

1. **THE WALK DIES.** `src/` renamed, extension set narrowed, a
   `resolve(__dirname,"..","..")` that no longer lands where it used to, a
   `statSync` throwing on a broken symlink. Zero files scanned, zero violations.

2. **THE PATTERN GOES STALE.** *The likelier and nastier one, and no file count
   can see it.* These rules hunt one English string or one formatting accident.
   Reword a label, move it behind an i18n key, run a formatter that breaks JSX
   children onto their own line, switch a literal map to a computed form — and
   the regex matches nothing anywhere, forever. The rule then reports a clean
   repo while every surface is free to hand-roll the new wording.

3. **THE SUBJECT VANISHES.** Found in
   `closedSessionPrecedence.enforcement.test.ts`. That rule `continue`s past any
   file not containing `writer(`. Rename the four fidelity writers and
   `violations` empties — while the Sentinel reports that every surface passes
   the closure signal when *no surface asks for it at all*. Neither a file count
   nor a detector self-test can see this. The guard must assert **callers still
   exist**.

## THE CURE: A POSITIVE CONTROL, NOT A COUNT

For mode 2 the guard must name a **live specimen** — the canonical owner/writer
that is *supposed* to emit the policed shape — and assert the rule's own regex
still matches it. The detection pattern is hoisted to one module-level `const`
used by BOTH the guard and the rule, so they can never drift apart. Likewise the
walk is hoisted to one `const ALL_FILES`, so guard and rule provably see the
same tree.

`SemanticZoom` shows the deliberate inversion worth copying: its positive
control asserts the **allowlisted** file matches. Being whitelisted is exactly
what makes it a safe specimen — the rule skips it, so nothing there can mask a
violation.

## WHAT WAS REFUSED, AND WHY THAT MATTERS MORE

**A hand-written decoy is not a control.** It is written to match, so it proves
only that the regex compiles. It cannot tell you whether the notation is still
what real code says. Several files already had such a self-test; they were
credited in-file and then given a live specimen alongside.

**Where a positive control could not be earned, it was refused rather than
faked.** `categoryTabsFor.sentinel.test.ts` hunts an order-anchored literal run
of six quoted tab names. MEASURED: it matches **zero files in the repo,
including its own owner** — `ALL_CATEGORY_TABS` has since grown six
microstructure tabs *between* `"Chart"` and `"Options"`. As written the Sentinel
can only catch a re-inline of the pre-2026-09 eight-tab list; a re-inline of
today's fourteen-tab list passes. That scope limit is now **stated in the file**
instead of papered over with a manufactured specimen.

**A tempting fix was refused with a measurement.** The meta-Sentinel's scope
heuristic (`/readdirSync|readFileSync/`) has one known false positive:
`LeftSidebar.lifecycle.test.ts`, which is not a scanner at all. The obvious
remedy — narrow the predicate to `readdirSync`, files that actually *walk* —
was measured: it would drop **nine** ledger entries at a stroke, and eight of
them are real gates that read a **declared list** of paths. A fixed-list gate
goes vacuous exactly like a walking one. The narrowing would have bought one
cosmetic removal by silently exempting eight live gates.

> A conservative detector costs one wrong name on a list. A permissive one costs
> coverage nobody can see they lost.

The entry stays, annotated, as the cheaper error taken with eyes open.

**Two more refusals, both earned by measurement, both in the final wave:**

`supabaseServiceKeyName.enforcement.test.ts` is a **BAN**: the forbidden text is
supposed to appear in zero files, and the natural specimen — the owner — does not
contain it either, *because* it reads `env[name]` indirectly, which is precisely
what makes it the owner. Planting a decoy would have proved only that the test can
find its own decoy. Instead the banned patterns are now **derived from the owner's
`SERVICE_KEY_VARS`**, so the two ban rules collapse into one loop that covers a
third key name the day it is added, and the guard pins the `process.env.X` idiom's
liveness (measured 36, floor 10). Under a mutated `SRC_ROOT` the two ban rules
**stayed green** on 3 files while five guards failed — the vacuity, demonstrated.

`visualReceipt.test.ts` could not prove its `OWNER_IMPORT` branch: `from
"@/lib/ops/visualReceipt"` matches **zero** files in the repo. Nothing imports the
module but its own excluded test. That exemption branch is unexercised, no honest
control exists, and it is documented as such rather than dressed up.

A third emptiness mode was closed there too: the three-root walk did
`if (!existsSync(dir)) continue;`, so a renamed root vanished silently and a
**total** file count could not see it. Each root now carries its own floor.

## THE ACCEPTANCE BAR: MUTATION PROOF

Every guard: clean **EXIT 0** → introduce the exact regression → **EXIT 1**
naming it → byte-exact restore → **EXIT 0**.

**The proof must print that the mutation landed BEFORE it prints the exit
code.** A proof that does not show the mutation is not a proof — a partial
`perl` that converted only two of four pill labels would have left the pattern
still matching and the "proof" meaningless.

Three times the mutation showed the **ORIGINAL rule staying green** while only
the new guard fired (`Tests 1 failed | 4 passed`). That is direct evidence these
guards close a real hole, not a theoretical one.

## THREE THINGS CAUGHT ON OURSELVES

Both are recorded because the near-miss is the lesson.

**1. An agent left a production mutation unrestored.** A sub-agent renamed a
user-facing `/charts` tab from `"Corporate Actions"` to `"Corp Actions"` to
prove its guard fires, then reported *"git diff --name-only filtered for
non-test paths is empty."* **That statement was false.** The mutation was still
on disk and would have shipped a wrong label to production. Caught by reading
`git status` before staging.
**Rule adopted:** agents paste the **raw, unfiltered** `git diff --name-only`
output. They do not filter it, summarize it, or assert it is clean.

**2. A positive control that read a COMMENT.** In `yahooQuoteRounds.test.ts` the
control extracted the owner's URL template with `read(OWNER)` — unstripped. The
owner's JSDoc on line 53 says *"Join the open `/api/yahoo?type=quote` round"*,
so renaming the real query parameter on line 64 left the control passing happily
against prose. Only the *pre-existing* test caught that mutation; the new guard
did not. Fixed with `strip()`.

> A positive control that can be satisfied by prose is not a control.

**3. This document did not demote itself.** The full suite failed on the final
run, and the failing test was `datedDocsAreDemoted.sentinel.test.ts`, naming this
file: a baton that announces its own day in its filename and carried no lineage
block, free to speak in the present tense forever. The author of an anti-vacuity
baton was caught by a Sentinel of exactly the class being written about. The
block at the top of this file was added by that failure, not by foresight.

## DISCOVERY RULES vs PRESERVATION RULES

A **discovery** rule with zero offenders today is vacuous and must be refused.
A **preservation** rule (a ratchet) legitimately has zero offenders today — its
acceptance evidence is its mutation proof, not its count. The completeness guard
added to `yahooQuoteRounds` is the latter: the 7 declared consumers exactly
match the 7 real callers today, and the guard exists to fail when an eighth
appears undeclared.

## STATE AT SEAL

- `vitest run` — **823 files, 10520 passed | 2 skipped, EXIT 0** (unpiped).
- `tsc --noEmit` — **EXIT 0** (unpiped).
- A pipe masks the exit code. Use `> file 2>&1; echo "EXIT=$?"`.

## OPEN

- **Ledger at 4**, down from 26. Remaining: `providerReadiness.envExample`,
  `chartsRoomChrome`, `journalDecisionFilter`, plus the annotated false positive
  `LeftSidebar.lifecycle`. The ratchet fails if a listed file is fixed but left
  listed, so the number on screen stays true.
- **The narrowing refusal now cuts harder, and the ledger says so.** RE-MEASURED
  at this seal: **none** of the four survivors contains `readdirSync`. Narrowing
  the meta-Sentinel's scope heuristic to files that actually walk would no longer
  drop nine entries — it would **empty the ledger completely**, reporting zero
  debt by exempting the three remaining live gates rather than by guarding them.
  The first measurement argued the point; this one proves it.
- **`npm run deploy:cf` is DENIED by the tooling classifier** — 7+ attempts
  across this shift, not worked around. **~16 commits are pushed and NOT
  SERVING. Nothing in this block has been live-observed.** The Sentinel work is
  CI-enforced and does not change runtime behaviour, but the claim stops at
  "committed and green", not "live".
- Still open from the §13 gate list: Decision Memory sealing has zero production
  callers (architectural — surface, do not rush-wire); executionConnectivity
  orphaned (`/readiness` discloses honestly); paper execution state-machine
  realism. **BLOCKED:** Gate 4 responsive device proof (programmatic resize does
  not take effect, `outerWidth` pinned); `/journal` detail canvas (0 entries).
