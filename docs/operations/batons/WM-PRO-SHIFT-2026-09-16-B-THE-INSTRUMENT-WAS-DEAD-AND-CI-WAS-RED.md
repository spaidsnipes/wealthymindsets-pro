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

# The instrument was dead, CI was red, and nobody had looked

**2026-09-16 · 3 commits · `7ef3dbb`, `2f80d7c`, `85c35ef`**

Successor to *A room is not the screen, and some rooms have no feed*. That baton
ended with deploy owner-blocked and no production observation available. This one
does not unblock deploy. It repairs the only visual proof channel that does not
need it — and discovers, on the way, that the channel had been dead and CI had
been failing on exactly that death.

---

## The finding that reframes the previous baton

**CI on `main` has been RED, and the failing step was the geometry gate.**
Verified with `gh run list`, not recalled:

| run | commit | result |
|---|---|---|
| 35076414117 | Stop the masthead owning a second fidelity ladder | failure |
| 35077529381 | Baton: the masthead learns to read the feed | failure |
| 35078648027 | a room is not the screen | failure |
| 35079492354 | a room with no feed says so | failure |
| 35079902784 | Baton: a room is not the screen… | **failure** |

`gh run view 35079902784` names the step: **Interior surface geometry
(390 / 834 / 1440px)**. Every other step — typecheck, sentinels, production
build, phone geometry — was green. The previous baton's closing gates
("652 files / 7819 tests pass, `tsc --noEmit` clean") were true and were also
not the whole picture, because neither of those commands is the one that was
failing.

After `7ef3dbb`, run **35092381411 is GREEN**, every step. That is the first
green `main` in this commit run, and it is observed, not inferred.

---

## Defect 1 — the instrument (`7ef3dbb`)

`scripts/measure-experience-geometry.mjs` renders each interior surface alone
against real Chrome at three widths. With production deploy Founder-blocked and
every interior route credential-gated locally, it is **the only honest visual
channel this shift had**. It had three defects at once.

### 1a. Dead at import

`DecisionSpineBand` made `now` required in `1fc7975`. Both harness fixtures
still omitted it. The crash:

```
TypeError: Cannot read properties of undefined (reading 'established')
```

Two facts make this worse than an ordinary break. First, **harness props are
template string literals**, emitted verbatim into a generated entry module — so
`tsc` never checked them and never will. Second, the fixtures rendered
**eagerly at module scope**, so one throw aborted the import and took **all
fourteen other surfaces with it**. The gate was not measuring a bad surface. It
was measuring nothing.

### 1b. All-or-nothing

Refusing to report is right when the INSTRUMENT is missing. It is wrong when one
SPECIMEN is broken. Each surface now renders inside `try/catch`, and a failure
becomes an `UNRENDERABLE` offence — named **once**, not once per width, which
would triple one fact — while its siblings are still measured.

`UNRENDERABLE` reports in its own paragraph, separate from geometry offences:

> NOT MEASURED — 1 surface(s) could not be rendered: spine-band. Their geometry
> is UNKNOWN.

Collapsing the two would let *"we could not look"* hide inside *"we looked and
it was bad"*. Those are different claims and the gate now makes different
sentences out of them.

### 1c. The wrong box model — and this one nearly made me lie

With the fixtures repaired the gate went **EXIT=0, PASS, 11 surfaces clear**. A
screenshot then showed the spine rail rendering `would` as `wou`.

Probing it: host `clientWidth` 317, `scrollWidth` 341; child 341 wide,
overhanging by 24px. But `317 + 12 + 12 = 341` is content-box arithmetic, and
`src/app/globals.css` opens with `@tailwind base` — whose preflight sets
`box-sizing: border-box` on everything the Founder actually sees.

**The harness was wrong, not the product.** I had the finding half-written as a
production defect before checking. It is not one, and it is not claimed as one.
The measurement page now carries the preflight rule:

```js
`<!doctype html><html><head><style>` +
  `*,::before,::after{box-sizing:border-box}` +
  `</style></head>` + …
```

The general lesson is the sharp one: **the gate had reported "clear", so this
mis-calibration could produce a false PASS as readily as a false FAIL.**

**Remaining gap, recorded not hidden:** the app renders in Inter, the harness in
system-ui. Near-threshold measurements are not decisive.

Fixing the calibration turned PASS into **EXIT=1, 3 offences** — which is how
Defect 2 was found.

---

## Defect 2 — a hint is the reason, so it may not be cut off (`2f80d7c`)

All three offences were the same one: `decision-chain-panel`, `CLIPPED`,
`box=220px content=220px`, at **390 and 834 and 1440**.

Probe of the offender: `SPAN`, `rectW 220`, `scrollW 220`, `clientW 218`,
`whiteSpace: nowrap`, `overflow: hidden`, `width: 220px`.

Then the screenshot, looked at with my own eyes at 1440px **with most of the
panel empty**:

> account equity not observed this sess…

while its sibling `broker link not established` fit. **The cap was not width
pressure. It truncated at every viewport.**

These chips exist so the trader can read WHY a node is UNKNOWN without opening
WhyInspector. An elided reason sends them to the drawer anyway — the exact
burden the chips removed. The `title` attribute is not an answer: hover-only, so
it does not exist on touch and is invisible to a five-second gaze.

220px is now a **wrap width, not a clip**. The row was already `flexWrap:
"wrap"`, so a long hint takes a second line inside its own chip and the chip
rhythm survives. Nothing is hidden.

---

## Defect 3 — the chain was nine cards (`85c35ef`)

Three truth/support atoms without scene movement is `TRANSFORMATION_STALLED`.
Two were spent. The third had to move the scene — and scene movement without
canon is taste, so the canon was read first.

**Phase 0 authority, resolved by the Command Center's own 2026-09-16 CURRENT
header:** there is exactly ONE current visual canon — *SUPPORT — WM Pro Living
Market Visual Systems Canon — 2026-08-27* — and the `SUPPORT` prefix is **stale
labelling, not a demotion**. There is no missing successor and no second canon
to create. The Transformation UI mockup folder is REFERENCE ASSETS,
NON-AUTHORITATIVE. **No Drive edit was made, and none was needed.**

The canon names this component's defect and its repair verbatim:

> SCENE_FRAGMENTATION … Repair: **ONE DECISION. ONE MARKET ROOM. MANY
> CONTEXTUAL LAYERS.**
>
> **NO CARD-MUSEUM REGRESSION** — Do not convert internal systems into permanent
> panels.
>
> Negative space is an attention asset, not an empty card slot.

`DecisionChainPanel`'s container already carried that cure — hairline top,
transparent ground, and a comment explaining it. **The cure stopped at the
container.** Underneath, the nodes were nine separately bordered, separately
filled, 6px-rounded boxes with an 8px gutter. A chain that asks the eye to cross
nine borders to read one decision is not a chain; it is a museum of nodes.

Gutter → 0. Nodes divided by one brass hairline at the same value the
container's own top edge uses. One continuous spine, segments still
individually inspectable. Nothing removed. The boxes are.

### State light is now localized

The old per-node border was tinted by indicator — which lights the five calm
nodes exactly as loudly as the one warning node, and therefore carries no
information. Canon:

> Color may support meaning but may never replace it.
>
> UNKNOWN and degraded fidelity must look visibly degraded.

A 2px left edge is now lit **only** for WARN and WATCH. OK and UNKNOWN keep a
transparent edge of the same width, so a node changing state cannot shift its
text horizontally. The glyph and the verdict word still carry the meaning
without color.

---

## How this was proven

Positive control, reverted with an **Edit**, never `git checkout`: `now` removed
from the `spine-band` fixture → `NOT MEASURED — 1 surface(s) could not be
rendered: spine-band`, **with the other ten still measured**. That disjointness
is the point — it proves 1b works rather than merely proving the gate can fail.

Gates after each commit, run **unpiped** (a pipe masks the exit code — proven
again this shift when `node … | tail` printed `EXIT=0` on a failing run):

- `tsc --noEmit` → **EXIT=0**
- `./node_modules/.bin/vitest run` → **652 files / 7819 tests pass**
- `node scripts/measure-experience-geometry.mjs 390 834 1440` → **EXIT=0, 11
  surfaces clear, measured with chrome**
- `gh run watch 35092381411` → **green, every step**

Both visual claims were closed by looking at the screenshot taken **after** the
change, never before it.

---

## What is NOT claimed

- **NOT claimed:** that any of this is live. Deploy remains Founder-blocked;
  `npm run deploy:cf` needs `CLOUDFLARE_API_TOKEN`, which is the Founder's to
  supply, and it must not be worked around. The Bash permission rule the Founder
  approved was never actually added. **Seventeen-plus commits are pushed and not
  live.**
- **NOT claimed:** that the assembled rooms read well. The gate measures surfaces
  **in isolation against fixtures**. That remains HUMAN_PROOF_REQUIRED.
- **NOT claimed:** that near-threshold geometry is decisive, while the harness
  renders in system-ui and the app in Inter.

---

## For whoever picks this up

1. **Get deploy unblocked.** Still the top of the list, and now seventeen commits
   deep.
2. **Watch CI.** It is green as of `7ef3dbb`. It had been red for at least five
   consecutive pushes and that went unremarked — which is the more expensive
   defect than any single one repaired here.
3. **The remaining card museums are UNMEASURED.** `grep 'rgba(19,19,23,0.5)'`
   names nine more files: `PersonalEdgeChip`, `OpeningBellPanel`,
   `RealmGateway`, `ATHOSInterventionPanel`, `/journal`, `PlaybookDNAPanel`,
   `PersonalEdgePanel`, `MirrorPanel`, `/command-deck`. **Do not sweep them.**
   The honest order is: add a surface to the harness registry → measure it →
   repair what the measurement names → re-measure. Repairing a surface no
   instrument has looked at is a guess wearing a test's authority.
4. **The harness fixtures are still untypechecked.** They are template strings;
   `tsc` cannot see them. `UNRENDERABLE` now catches the drift at gate time
   instead of blinding the gate, which is a containment, not a cure. The cure is
   moving fixtures into a real `.tsx` module the typechecker reads.

Unchanged and still open: Delta Bubbles level ownership; Live VP render geometry
proof (bar-pixel correctness); Decision Memory sealing has zero production
callers (architectural — surface it, do not rush-wire); `executionConnectivity`
orphaned (not a live defect — `/readiness` discloses it honestly); paper
execution state-machine realism. Still blocked: Gate 4 responsive device proof
(programmatic window resize does not take effect, `outerWidth` pinned);
`/journal` detail canvas (0 journal entries to open).
