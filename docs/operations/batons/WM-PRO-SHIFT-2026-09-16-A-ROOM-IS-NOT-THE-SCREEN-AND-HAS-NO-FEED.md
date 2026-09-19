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

# A room is not the screen, and some rooms have no feed

**2026-09-16 · 3 commits · `309d423`, `55d2d14`, `39f9fa1`**

Successor to *The masthead learns to read the feed*. That baton ended by naming
a vocabulary gap it had created. This one closes it, and closes a second defect
found on the way.

---

## The blocker first, because it invalidates half of every claim below

**Production does not track `main`, and I cannot make it.** Verified this
shift, not recalled:

- `.github/workflows/` contains only `sentinels.yml`. There is **no CI deploy**.
- `deploy:cf` is `npm run build:cloudflare && opennextjs-cloudflare deploy`,
  which requires `CLOUDFLARE_API_TOKEN`. It is **not set**, and it is the
  Founder's to supply.
- `https://wealthymindsetspro.com/login` returns 200, so the site is up — it is
  simply serving an older build.

Thirteen commits are now pushed and not live. **Every "before" measurement in
this baton was taken on the live build; not one "after" has been observed.** The
fixes are proven by test and by type, which is a weaker claim, and this document
does not pretend otherwise.

Unblocking is one of: a Bash permission rule for `npm run deploy:cf`, or the
Founder running it once with the token set.

---

## Defect 1 — a room floored itself at the height of the screen (`309d423`)

`osRoomPlane.ts` measures the **colour** of a room's plane. So the repairs it
prompted fixed the colour and stopped at the instrument's edge, leaving the
**height** on the very same elements.

`/command-deck` is the proof. Its route plane had been moved `100vh` → `100%`
with the reasoning written out in a comment — while the Suspense fallback ~300
lines above it, drawn during the exact frames the trader is waiting, was left at
`100vh`.

A room in this frame begins *below* the masthead. A viewport floor therefore
hands the trader a room that scrolls by exactly the masthead's height while it
is still empty.

Four live sites in two spellings repaired: `/charts`, `/command-deck`,
`/journal`, `/profile`.

`roomViewportFloor.ts` is the sibling detector. It reuses `enclosingOpenTag` and
`stripComments` from `osRoomPlane` rather than re-deriving the grammar, and
walks `OS_FRAMED_ROUTES` — so promoting a route pulls it into the gate in the
same commit. Deliberate non-offences, each documented: `fixed` elements (they
left the room's flow and measure the viewport honestly), `max-h-*` (a ceiling
cannot create scroll), anything inside a comment.

It fails **closed**: no enclosing tag, no offence.

Scoping note, evidence-backed: `/readiness`, `/reset-password` and `/login` also
use `min-h-screen`, and grep against `wmDestinations.ts` confirms none is in the
registry. They **are** the screen, not rooms inside the frame. Scoping the walk
to `OS_FRAMED_ROUTES` excludes them without a hand-maintained allowlist.

The house's own reachability gate caught the new module as unreachable. It was
declared in `LEDGER` as `OPS_TOOLING` with a real note — not exempted, not
weakened.

---

## Defect 2 — the chrome invented a subject (`55d2d14`, `39f9fa1`)

Measured live: `/nectar/TSLA` — 0 canvases, 0 prices, no socket, pure
browser-local memory — wore **FEED UNKNOWN**. That badge means *the OS cannot
establish the state of its feed*. The Vault has no feed. Asking an open question
about a pipeline that does not exist is not caution; it is the chrome inventing
a subject, in the one place on screen that claims to be the machine's own
self-report.

The canon already answers this case: **UNKNOWN inputs render no chip at all**
(canon §silence-is-a-feature).

### Why silence could not simply be "feed is falsy"

Rooms publish from an effect, so **every** room passes through `null` on its way
to its first publication. Collapsing "no feed here" into "nothing published yet"
would blank the badge on `/charts` for every frame before its first tick — and a
blank reads as fine. That was my first cut, and it was wrong.

So `feed` became a **tri-state**, consistent with the `sessionOpen` / `connected`
doctrine already in that file:

| declaration | meaning | masthead |
|---|---|---|
| a `FeedObservation` | "here is my evidence, grade it" | a canon reading |
| `FEEDLESS_SURFACE` | "I carry no feed; say nothing" | **omitted** |
| `null` | "I have not spoken yet" | FEED UNKNOWN |

Only the positive declaration silences — and it silences the provenance line
too, or the two halves of the chrome disagree on the same screen.

Named `FEEDLESS_SURFACE`, not "NO FEED", because that phrase is quarantined.

### The population, not just the one room

Survey of the seven OS-framed rooms: only **three** publish a standing at all.
The other four sit on `UNPUBLISHED_STANDING` permanently — no room name in the
masthead and FEED UNKNOWN forever. Right as a default, wrong as a steady state.

`/nectar` and `/journal` are declared here **because they were measured**: both
read only browser-local storage; neither opens a socket or calls a quote API.

`/journal` was the one most worth getting right. It holds five `lastTradeAtMs`
values and every one is read off a stored `nectarSnapshot` or saved slot — the
market time recorded *when an entry was written*, possibly weeks ago. Feeding
those to the compiler grades them as a pipeline gone quiet and raises **STALE
PIPELINE**: an alarm about a feed that is not stalled because it never existed
in that room. *Recorded market time is not a feed.* A lie in the opposite
direction is not a fix.

### What was deliberately NOT done

`/heatmaps`, `/paper` and `/morning-prep` also publish nothing. They are **not**
declared feedless. They compose components that were not measured, and declaring
them would be a guess wearing a test's authority. They keep the honest default
until someone looks. The test file says so in as many words.

---

## How these were proven

The feed badge is an ordinary prop of an ordinary child of the masthead, so this
law is **measured with `renderToStaticMarkup`, not scanned**. Where the real
thing can be measured, it was.

Three positive controls, each reverted with an **edit**, never `git checkout`:

1. Remove the silencing → **3 named failures**, spanning badge *and* provenance.
2. Silence `null` as well → a **disjoint 3** named failures. The disjointness is
   the point: it proves the tests distinguish three declarations rather than
   merely detecting "badge sometimes absent".
3. Drop `/journal`'s declaration → **2 failures naming `/journal` and only
   `/journal`**, proving the room table isolates per room.

Final gates, run unpiped: **652 files / 7819 tests pass**, `tsc --noEmit` clean.

---

## For whoever picks this up

1. **Get deploy unblocked.** Nothing here has been seen by a human eye on
   production. That is the top of the list.
2. **The after-measurement, once deployed:** `/charts` masthead at ≈(1804, 30)
   should read a canon fidelity label with a price rendering below it;
   `/nectar/TSLA`, `/nectar` and `/journal` should show a room name and **no
   feed badge at all**.
3. **Then measure `/heatmaps`, `/paper`, `/morning-prep`** and declare them one
   at a time, with evidence per room. Do not sweep.
4. `/command-deck` publishes a surface but no feed, so it still wears FEED
   UNKNOWN. It is a market surface and may genuinely have one — that is a wiring
   question, not a declaration question. Do not rush it to `FEEDLESS_SURFACE`.

Unchanged and still open from the previous baton: Delta Bubbles level ownership;
Live VP render geometry proof; Decision Memory sealing has zero production
callers (architectural — surface it, do not rush-wire); `executionConnectivity`
orphaned (not a live defect — `/readiness` discloses it honestly); paper
execution state-machine realism. Still blocked: Gate 4 responsive device proof
(programmatic window resize does not take effect, `outerWidth` pinned);
`/journal` detail canvas (0 journal entries to open).
