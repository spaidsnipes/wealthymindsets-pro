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

# WM PRO SHIFT — THE REVIVES NOTHING EVER RAN

Commit: `f309540d` (pushed to `main`)
Predecessor live-verified this block: `75a8a4ab`

---

## 1. The Founder journey PASSED on the NORMAL prod URL

Walked ROOM → PREVIEW → DRAWER → ENTER FULL → RETURN on
`https://wealthymindsetspro.com/charts`, with a screenshot at every stage.
No hidden route, no component harness.

URL grammar: `?equip=<id>&stage=preview|drawer|full`.
Equipment walked: `market-object-passport` (rail also carries `market-reality`).

Against the Founder's five acceptance criteria:

- **Did another app load?** NO. The ROOMS / WORKSPACE / TOOLS rail and the
  NQ1! chart persist at preview and at drawer.
- **Is the chart cluttered?** NO. Equipment is opt-in from the rail; nothing
  is permanently displayed on MARKET.
- **Is FULL structural depth, or just a resize?** DEPTH. FULL adds a
  `MISSING / INVALIDATION` sub-row to each of the 8 dimensions that the
  drawer does not show, plus the sealed snapshot identity.
- **Does RETURN restore the exact prior Room state?** YES. RETURN went back
  to `&stage=drawer` — the exact prior stage, same NQ1! / 1h / RTH, same
  DECISION panel.
- **Same canonical object across depths?** YES. DRAWER and FULL both report,
  verbatim:

  `chart:NQ1!:RTH:1h:no-price:1789631009597:1789631010190 · sealed 2026-09-17 07:43:30Z`
  `0/8 resolved · UNAVAILABLE`

  One brain, three depths. The equipment layer is handed a descriptor; it
  compiles and resolves nothing.

## 2. The VP live-observation blocker root-caused — the Mac is at the lock screen

`document.visibilityState` is `"hidden"` while `document.hasFocus()` is true,
and a computer-use screenshot showed only wallpaper with
`"com.apple.loginwindow" was also hidden`. The machine is locked. No attempt
was made to unlock it.

The VP governor in `MainChart.tsx` behaves CORRECTLY under this: it stamps
`data-vp-suspended="hidden"` and withholds the receipt rather than writing a
misleading `0`. The presence of that stamp also proves
`fixedVPActive || sessionVPActive` is already true on the Founder's chart.

**Gate 4 implication, recorded as a lead and NOT as a claim:** the standing
Gate 4 blocker is written as "programmatic window resize does not take
effect, `outerWidth` pinned". A locked display not applying window geometry
would produce exactly that symptom. Gate 4's recorded root cause should be
re-examined on an unlocked machine before it is treated as an API defect.
(Note also that Playwright launches its own browser and is immune to this,
which is why the pixel proofs ran fine.)

## 3. §13 gate record is STALE — two gates are already closed

- **Live VP render geometry proof** — closed by `scripts/prove-vp-pixels.mjs`.
- **Delta Bubbles level ownership** — closed by `scripts/prove-bubble-pixels.mjs`
  (`src/lib/bubbleDrawGeometry.ts` now owns radius; it previously had no
  owner at all, computed inline in two places with two disagreeing formulas).

Both are wired into `.github/workflows/sentinels.yml`. The §13 list should be
corrected rather than re-worked.

## 4. The measured gap this block closed

Both pixel proofs carry `WM_*_REVIVE` switches that swap a real defect into
the paint path, so every law can be made to fail on demand. `prove-vp-pixels.mjs`
records that **three of its five laws were written wrong the first time and
were only found because their revive ran GREEN**. The revives are the
instrument that audited the instrument.

`grep -n "REVIVE" .github/workflows/sentinels.yml` matched exactly one
COMMENT line. **Ten revive modes existed and zero were executed by anything
automated.** The only thing standing between a dead pixel law and a
permanently green check was someone remembering to type an env var by hand.

That is the vacuity failure this repo has already shipped for real: a detector
that silently stops matching reports "no offences" forever, and reads exactly
like a clean bill of health. Both proofs are explicitly fragile in this way —
their own headers record that `BOT_Y` at 520 and an even bar width each made a
real defect undetectable, because the FIXTURE, not the law, had drifted. A
clean run cannot notice that. A revive can.

### The atom

`scripts/prove-revives-fail.mjs` — for every proof script that declares revive
modes, each mode must exit RED.

- exit 1 — the defect was injected and a law fired. **The only pass.**
- exit 0 — the defect was injected and NOTHING fired → `LAW_STOPPED_MEASURING`.
- exit 2 — the script could not measure at all → `COULD_NOT_MEASURE`.

Exit 0 and exit 2 are separate offences on purpose. "The law stopped measuring"
and "no browser could be launched" are different problems, and collapsing them
would let a broken environment read as a dead law — or worse, let a dead law
hide behind a blamed environment.

It **DISCOVERS** proofs by scanning `scripts/` for a `REVIVE_MODES`
declaration and reads the env var name out of each file's own source, rather
than naming two files. A hard-coded list is a coverage hole with a deadline:
the moment someone adds a third pixel proof, a hard-coded guard keeps passing
while silently never running it — the same blindness, one level up. It also
guards `SWITCH_UNREACHABLE` (modes declared, no `WM_*_REVIVE` read) and
`NO_MODES` (empty array).

If the scan matches nothing it exits 2 and **refuses to report**, because a
green check proving that nothing was checked is the exact thing it exists to
prevent.

### Proven non-vacuous, twice, non-destructively

Backed up with `cp` to `/tmp`, mutated in place, restored, `git diff --stat`
confirmed empty both times.

1. Neuter one revive — `if (REVIVE === "BAR_CURVE") {` → `if (false) {`:
   `GUARD_EXIT=1`, printing
   `GREEN BAR_CURVE ← the defect was injected and no law noticed`
   and the offence `LAW_STOPPED_MEASURING`.
2. Rename `REVIVE_MODES` → `RENAMED_MODES` in BOTH proofs:
   `VACUITY_EXIT=2`, printing
   `REFUSING TO REPORT — no proof script in scripts/ declares REVIVE_MODES.`

### Gate, run unpiped

- `./node_modules/.bin/tsc --noEmit` → `TSC_EXIT=0`
- `./node_modules/.bin/vitest run` → 691 files / 8507 tests passed
- `npm run prove:revives` → exit 0, *"CLEAN — 10 revive modes across 2 proof
  scripts all still fail."*

CI step added after the Delta Bubble proof:
`- name: Pixel laws are still falsifiable` / `run: npm run prove:revives`.
Both directions are now required: clean must be GREEN, and every declared
revive must still be RED.

## 5. Scope, so no green check is over-read

This proves the pixel laws remain FALSIFIABLE. It does not re-prove the clean
runs. It does not prove MainChart's COMPOSED scene paints honestly — colour,
POC/VAH/VAL over live price, sibling spread and spawn easing remain
`HUMAN_PROOF_REQUIRED`. And a green Sentinels run still does not BLOCK a merge:
GitHub reports zero rulesets on this repo, so this remains a loud alarm, not a
locked door. Turning on branch protection is founder-only.

## 6. Carried forward

- **BLOCKED (environment):** any live VP pixel observation, and very likely
  Gate 4's responsive device proof — the Mac is at the lock screen.
- **BLOCKED (data):** `/journal` detail canvas — 0 journal entries, gated on
  `selected` in `src/app/journal/page.tsx`. Fabricating entries into the
  Founder's production localStorage to manufacture a screenshot is refused.
- **OPEN:** paper execution state machine realism.
- **ARCHITECTURAL, surface don't rush-wire:** Decision Memory sealing has zero
  production callers.
- **VERIFIED CLOSED, leave alone:** `executionConnectivity` —
  `screenReach.enforcement.test.ts` records it `AWAITING_SURFACE` with
  import-graph confirmation, and `/readiness` discloses it honestly.
- **ESCALATE:** Cloudflare Workers build `651be3e7-0a2e-4f19-b3ea-7aa3b6f0fb36`
  FAILED while GitHub CI passed the same SHA `ebf26a2`.
- **PARTIAL COVERAGE, noted:** `documentWallIsNotADrawer.enforcement.test.ts`
  guards only `/command-deck` (`const REL = "src/app/command-deck/page.tsx"`).
  The `<details>`-re-burial risk on `/charts` is only partially covered by the
  re-pinned `chartPassportAccessibility.test.ts` negatives, which inspect just
  the Decision Why drawer window.
- **FOUNDER DECISIONS PENDING:** `DecisionWhyPanel` drawer vs mockup #8;
  whether `DecisionReceiptPanel` becomes equipment.
