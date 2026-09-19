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

# WM PRO SHIFT BATON — 2026-09-15 — THE CLAIM THAT WAS NEVER MEASURED

Five commits. The middle one was wrong, and the rest of this shift was spent
finding that out and repairing it. That is the actual subject of this baton.

    204297c  A ROUTE NAMED IN PROSE IS A CLAIM THAT THE ROUTE EXISTS
    dcdb403  A REDIRECT THAT LANDS ON A REDIRECT IS A DETOUR THE USER PAYS FOR
    4d36aa9  AN INSTRUCTION IS A CLAIM THAT THE ACTION IS POSSIBLE
    3c14b9e  A REDIRECT THAT SHIPS THE APP IS NOT A REDIRECT   <- corrects dcdb403
    c85256b  A ROOT THAT NOTHING REACHES IS NOT A ROOT

---

## 1. The failure worth carrying forward

`dcdb403` rewrote `/vailbuild` from a client `useEffect` hop into a server
`redirect("/partnerships")` and its message claimed the alias now resolved in
"one server-side hop straight to the destination — **no bundle, no hydration,
no paint, no chain**."

That sentence was read off the source. It was never measured.

MEASURED against production serving that exact commit:

    /vailbuild    -> HTTP 200, NO Location header, 18,275 bytes, 17 <script> tags
    /veddbuild    -> HTTP 200, NO Location header
    /partnerships -> 19,346 bytes, 18 <script> tags

The alias document was **94% the weight of the page it exists to avoid**. Only
the fourth claim — the chain — was true.

**HOST FACT, now permanent knowledge:** on OpenNext/Cloudflare Workers an App
Router `redirect()` is **NOT** a 307/308 at the edge. It is a 200 HTML document
carrying the destination in its payload. The browser downloads the app shell,
executes it, and only then leaves. `/veddbuild` — always a bare server
`redirect()`, untouched by `dcdb403` — behaved identically, which is how we know
this is the host and not a regression that commit introduced.

The claim was written with confidence and no receipt. **That is the exact
failure mode every guard in this repo exists to catch. It simply happened in a
commit message, where no guard was looking.**

## 2. The repair, and why this mechanism

Aliases moved to `src/middleware.ts`: `NextResponse.redirect(url, 308)`.

Both middleware and `next.config` `redirects()` were plausible. Only one had a
receipt on this host — the canonical-host guard directly above the new block has
been issuing a real 308 in production since the Cloudflare cutover. `redirects()`
under OpenNext has no evidence in this repo. **Choosing the unmeasured mechanism
to fix an unmeasured claim would have repeated the mistake being corrected.**

308 not 307: permanent, method preserved. The page stubs are KEPT as a fallback —
middleware short-circuits before they render, so they cost nothing, but if the
matcher is ever narrowed the aliases degrade to a working slow redirect instead
of a 404.

### MEASURED LIVE after deploy (prod serving 3c14b9e)

    /vailbuild  -> HTTP/2 308, location: /partnerships, body 0 bytes
    /veddbuild  -> HTTP/2 308, location: /partnerships, body 0 bytes

**18,275 bytes -> 0 bytes. 17 script tags -> 0.** PIXEL-PROVEN in the Founder's
Chrome: opening `/vailbuild` lands on a fully rendered `/partnerships` with the
URL bar reading `/partnerships`.

The corrected claim is now stronger than the false one — and it is the only one
of the two with a receipt.

## 3. c85256b — the guard that trusted its own roots

Chasing the ledger consequences of the new module surfaced a defect in the
truth machinery itself.

`screenReach.enforcement.test.ts` exists to catch modules that are IMPLEMENTED
but not REACHABLE. Its walk rooted at `src/app` **and `src/components`** — so a
component that no route renders was still a ROOT, and everything it imported was
marked reached. **A dead consumer laundered its dependencies into the live set.**

MEASURED by walking the real import graph both ways:

    component files                                    118
    components unreachable from ANY route               14
    src/lib reported reached under old roots           331
    src/lib actually reached from a route              324
    LAUNDERED                                            7

Among the seven: **`src/lib/sessionVP.ts`** — the Live VP volume-profile math
named in the §13 open gates. Implemented, tested, and no human can see its
output. The ledger said it reached a screen. Also `selectOpeningBell.ts`.

A screen is a ROUTE. `src/app` is now the only root. New reason `DEAD_CONSUMER`
for the seven, each note naming its dead component — a surface WAS built for
them and never mounted, which is more deceptive than never building one, because
the source reads as finished.

New locks: `× THE LAUNDERING ROOT` (with non-vacuity: some component must be
unreachable AND every DEAD_CONSUMER must really be unreached) and
`× THE GROWING ORPHANAGE` (the 14 frozen as a bidirectional ceiling — a new
orphan fails, and a name that stops being an orphan must LEAVE, because a ceiling
that overstates is still a false number).

Deliberately NOT a reason ledger for components: inventing 14 justifications for
untriaged components would put guesses in the one file that holds facts.

## 4. §22 revivals this shift — all VALID

Every one reintroduced via Edit only, confirmed to COMPILE, confirmed to fail the
Sentinel BY NAME, restored byte-identical.

| # | Defect revived | Caught by |
|---|---|---|
| E1 | `/vailbuild` client hop | `× THE DETOUR` |
| E2 | `NAV_ITEMS` constant | prose/route locks |
| F | the "Add real members…" imperative | `× THE IMPOSSIBLE INSTRUCTION` |
| G | middleware alias block removed + false prose restored | `× THE UNGUARDED EDGE`, `× THE UNMEASURED BOAST` |
| H | `src/components` restored as a walk root | `× THE LAUNDERING ROOT`, `× THE GROWING ORPHANAGE` |

**`tsc --noEmit` stayed at exit 0 for every single revival**, including one with
a genuinely unused import. `noUnusedLocals` is OFF. **The type system cannot
catch dead wiring in this repo.** That is precisely why these are Sentinels and
not types.

## 5. Sub-laws coined

- **A WORD IS NOT A MOOD.** My own `× THE IMPOSSIBLE INSTRUCTION` rejected my own
  honest fix, because its regex matched the vocabulary ("add", "build") inside
  "No members yet — this build has no way to add one." The discriminator is
  grammatical MOOD: the verb opens the sentence, or is handed to the reader in
  second person. Caught by RUNNING it, not by reading it.
- **A COMMENT IS NOT A CONSUMER.**
- **A DEAD IMPORT CAN SATISFY A TRUTH SENTINEL** — hence asserting occurrence
  count > 1 in `× THE UNGUARDED EDGE`.
- **AN AFFORDANCE IS A CLAIM THAT SOMETHING HAPPENS.**

## 6. Machine and channel notes (cost real time; do not rediscover)

- **`npx` is BROKEN here** (`Cannot find module '../lib/cli.js'`). Always
  `./node_modules/.bin/tsc`, `./node_modules/.bin/vitest`.
- Run gates **UNPIPED** — `> /tmp/x.log 2>&1; echo "EXIT=$?"`, then grep the log
  in a separate call. A pipe masks the exit code.
- **PIXEL CHANNEL:** `computer-use request_access(["Google Chrome"])` → tier
  "read" → `screenshot` + `zoom`. Genuine render receipts, zero credential
  handling. `Control_Chrome open_url` with `new_tab: true` WORKS;
  **`reload_tab` is classifier-denied**; `execute_javascript` is broken.
  Sequence: `open_url` → `wait(6-8)` → `screenshot`.
- A mid-load screenshot nearly got misread as a broken redirect. `curl` settled
  it — and that is what surfaced the false claim in §1. **When a claim is about
  cost, measure the wire, not the pixels.**

## 7. Honest non-findings — do NOT re-open without new evidence

`/shop` (discloses at three levels incl. the button label itself), `/radio`
(`EPISODES: []`, passive copy, real upload path), `/profile`
CIRCLE_OF_EXCELLENCE (passive "No members added yet."), `/creator`,
`/command-deck` NEXT cell, `/signup` stub.

Recorded duplication, deliberately NOT refactored: Circle of Excellence exists on
both `/lounge` and `/profile` — one feature, two owners. Worth merging only if a
real add-member surface is ever built.

## 8. Still blocked — unchanged, recorded honestly

- **Gate 4 responsive device proof** — programmatic window resize does not take
  effect, `outerWidth` pinned. **The script route was classifier-denied; do not
  retry by another route.**
- **Decision Memory sealing** — zero production callers. Architectural. Needs a
  decision surface first. **Do not rush-wire it to close a gate.**
- `/journal` detail canvas, `/proof-lane` MEASURED JOURNAL — 0 entries.
- `/paper` blotter — 0 orders. Delta Bubbles / Live VP raster — no per-trade tape
  on the free tier.
- `executionConnectivity` — orphaned, not a live defect; `/readiness` discloses
  it honestly.

## 9. Next — AND THE CORRECTION OF THIS SECTION, SAME DAY

This section originally read:

> `src/lib/sessionVP.ts` is now the highest-value named target on the board. The
> Live VP gate was never really "awaiting a raster proof" — the math has a panel
> (`WMSessionVP.tsx`) that no route mounts. **That is a mount, not a rewrite.**

**That was wrong, and it was wrong the same way `dcdb403` was wrong** — a
confident conclusion drawn from the import graph, published without checking the
one source that would have contradicted it. The graph was right. The inference
was not.

`git log` on the component answers it in one line:

    89a350e  chore(charts): remove unreachable Session VP panel mount

The panel was mounted, and then **deliberately unmounted per Founder spec**,
freeing ~340px so Smart Money and the DOM ladder fit without cutoffs. It is held
retired by `src/lib/sessionVpRetired.test.ts`. That commit's author wrote that
they were "one step from" wiring a button to it and thereby "silently reversing a
Founder spec decision while believing I was closing a canon gate."

**The §13 Live VP gate is a trap of exactly that shape, and it has now nearly
caught two engineers in a row.** The second was this baton.

Consequences, shipped:

- `src/lib/sessionVP.ts` is re-filed from `DEAD_CONSUMER` to a new
  **`RETIRED_BY_SPEC`** reason. DEAD_CONSUMER means "built, never mounted" —
  debt. RETIRED_BY_SPEC means "built, mounted, deliberately unmounted" — a
  DECISION. Collapsing them is what nominates retirements for revival.
- `× THE REVIVED RETIREMENT` requires every RETIRED_BY_SPEC entry to name a real,
  existing lock file. The strongest claim in the ledger — "leave this alone" —
  must be checkable, or it is just a word that stops questions.
- `WMSessionVP.tsx` is annotated in `KNOWN_ORPHAN_COMPONENTS` as retired by spec,
  not untriaged. **Do not "fix" it by mounting it.**

**The live VP surfaces are the ON-CHART ones** — `sessionVPChart`, "WM Session
VP", "WM Fixed VP". They do not import `src/lib/sessionVP.ts`. Any future Live VP
render proof must target those, not the retired panel.

Geometry, already verified in 89a350e and recorded so it is not re-litigated:
`buildSessionLevels` and `buildTapeLevels` both return high→low, `foldTape`
preserves order, so `levels[lo]`=VAH and `levels[hi]`=VAL are the right way round
in both layers; half-open binning is correct; VA expansion cannot terminate on an
untraded bin except when the value area spans the whole profile.

### The remaining orphans

The other 13 are frozen in `KNOWN_ORPHAN_COMPONENTS`. Each is a mount, a delete,
**or a retirement** — and this section is the standing evidence that you cannot
tell which from the import graph alone. **Run `git log` on the component before
deciding it is missing something.**

---

**GATES at seal:** `tsc --noEmit` exit 0; `vitest run` exit 0, 630 files / 7474
tests, unpiped. Prod parity confirmed at `3c14b9e`; `c85256b` pushed and
building at seal time.
