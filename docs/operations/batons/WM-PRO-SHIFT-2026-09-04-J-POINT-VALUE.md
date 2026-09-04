# BATON — the point value, and the guard that lied (lane J)

GOVERNING CANON: "WM Pro — Operating System BUILD ORDER — Natural Language —
BINDING — September 3, 2026".

Commits sealed by this baton: `3edaf5f`, `669c3d4`, `601e9b2`, `7cc4ca0`.

Gates at seal time, run unpiped: **379 test files / 3600 tests, `VITEST_EXIT=0`**;
**`TSC_EXIT=0`**.

---

## FOUNDER_VISIBLE_DELTA

**/paper stopped teaching position sizing that was wrong by up to 1000x.**

/paper's universe carries five CME futures next to the equities and the spot
crypto. Every money path in the app multiplied quantity by price and stopped
there. A futures contract is not one unit of anything — it is a point value.

    A 10-point move on one NQ contract is worth $200. It rendered as $10.
    A $1.00 move on one CL contract is worth $1,000. It rendered as $1.

Five separate lines carried the error, and they were not in one place:

| where | what it computed |
| --- | --- |
| `applyFill` | `cashDelta = -signedQty * fillPx` |
| `applyFill` | `realized  = closeQty * (fillPx - avgPx) * sign` |
| /paper | `unrealPnl = (mark - avgPx) * qty` |
| /paper | `equity    = cash + SUM(qty * marketPx)` |
| /paper fill loop | `selectOrderRejection` called with no multiplier |

So the blotter, the running P&L, the equity curve and the buying-power gate
were each independently understating the trade. All five now carry
`contractMultiplier(symbol)`, sourced from the published CME specification:
NQ $20/pt, ES $50/pt, RTY $50/pt, GC 100 troy oz, CL 1,000 barrels.

`avgPx` and `marketPx` are deliberately left as quoted prices. The multiplier
is applied to money, never to the price on screen — if it leaked into those
fields the blotter would disagree with the tape.

**Why this direction of error is the dangerous one.** Canon weakness #9 is
PAPER-FILL OVERCONFIDENCE, and the stated reason paper trading exists is that
*position sizing is the habit paper trading exists to build*. Understating a
loss by 20x–1000x is the most confident possible way to teach the wrong habit.
The options path already applied `OPT_MULTIPLIER` correctly. Futures were
simply never given a point value. This is H-Bkt 5 — *"Journal missing
contract-type multiplier, option trades computed 100x too low"* — one surface
over, which is the tell that the class of defect was never swept, only the
instance.

---

## The part that should change how we review

**The Sentinel I wrote to protect this fix was broken, and it failed GREEN.**

A fix to five hardcoded symbols decays the moment somebody adds a sixth, so the
durable half of the work was a guard that reads /paper's `UNIVERSE` out of the
source and cross-checks every derivative against the multiplier table. It
passed. Then §22 was applied to the guard itself.

Revive F2 reordered the `UNIVERSE` object keys from `{ name, base, tick }` to
`{ base, name, tick }` — exactly what an editor key-sort does, an edit nobody
would flag in review. The parser matched `"SYM": { name: "…"` positionally. It
saw 11 of 16 entries. All five futures went invisible.

And then:

> **"every derivative in the universe has a point value" reported PASS while
> `CL1!` genuinely had no point value.**

The guard did not error. It did not warn. It returned an empty list of
problems, which reads identically to a clean bill of health. A defect the
Sentinel existed specifically to catch was live in the tree and the suite was
green.

The parser now matches the symbol and the name in two independent steps, and a
new assertion fails if any entry parses without a name — because the
classification is *by name*, so a nameless entry would be waved through as
"not a derivative" rather than flagged. The reason is written into the file so
the next person does not re-learn it by shipping. Revive G re-ran the identical
key-reorder attack against the hardened parser: it now sees all 16 entries and
correctly reports `CL1! (Crude Oil)`.

Second time this has been proven empirically. **A silently-broken detector
reports "no problems" forever.** Every Sentinel needs a positive control that
fails when the detector stops detecting — not just an assertion that the
codebase is clean.

Also recorded honestly: **Revive F did not reproduce.** It reformatted the
`UNIVERSE` entries across two lines expecting to blind the parser, and the
guard still caught the real missing `CL1!` — `\s*` spans newlines. That was
written down as a failed attempt rather than dressed up as a passed one, and
the attack was escalated to a drift that actually worked.

---

## The second thing found, which is NOT fixed, on purpose

`placeChartMarketOrder(symbol: string, …)` takes an **arbitrary** symbol —
whatever the chart happens to be displaying — not one of /paper's sixteen. The
chart's own catalog carries **fifteen futures**. Five have a point value. Ten
do not, and would settle 1:1. The /paper Sentinel cannot see any of this,
because it reads the /paper universe.

It is inert today for exactly one reason: `placeChartMarketOrder` has **zero
production callers**. The one-click chart BUY/SELL path it was written for is
not wired to anything. The defect is unreachable, not absent.

`7cc4ca0` pins that state instead of hiding it. The zero-caller fact is itself
an assertion, so the day someone wires that path the suite goes red and the ten
contracts have to be specified before it ships. The ten are pinned by exact
list rather than by count — a count would let one contract be swapped for
another silently.

**It was not closed by adding ten table entries, and that was a decision, not
an oversight.** A wrong point value is strictly worse than a missing one: 1x is
visibly, obviously too small, while a plausible-looking wrong multiplier reads
as authoritative. Silver is 5,000 troy oz, copper 25,000 lbs, the treasuries
quote in 32nds, and each FX contract is a different notional. Those are lookups
against the exchange, not inferences from a ticker, and they were not guessed
here.

There is a structural confirmation of that reasoning. Revive I added
`"YM1!": 5` to the table to see what would happen. **Both guards fired.** The
chart pin flagged that YM1! should be retired from the uncovered list, and the
/paper Sentinel independently flagged `expected [ 'YM1!' ] to deeply equal []`
— the table now named a symbol the universe does not trade. The two guards
interlock: coverage cannot arrive before the surface that needs it.

Per the Founder's standing instruction on this class of finding — *architectural
— surface, do not rush-wire*.

---

## Revive-attempts (§22), by outcome

| # | attack | result |
| --- | --- | --- |
| B | removed the multiplier from realized P&L | fired — `expected 10 to be 200`, `expected 1 to be 1000`, literally the reported defect |
| F | reformatted UNIVERSE across two lines | **did not reproduce** — `\s*` spans newlines; guard still caught the real `CL1!` |
| F2 | reordered UNIVERSE keys to `{ base, name, tick }` | **found a real weakness in my own guard** — passed GREEN with `CL1!` uncovered |
| G | same attack, hardened parser | fired correctly — reports `CL1! (Crude Oil)`, sees all 16 |
| H | `src/lib/__reviveProbe.ts` imports `placeChartMarketOrder` | fired — `expected [ 'src/lib/__reviveProbe.ts' ] to deeply equal []` |
| I | added `"YM1!": 5` to the table | fired on **both** guards — the interlock described above |
| J | added `{ sym:"ZC1!", label:"Corn Futures", cat:"Futures" }` to the catalog | fired — `+ "ZC1! (Corn Futures)"` |

Every probe was removed and every touched source file was restored from a
backup and confirmed byte-identical with `diff` before anything was committed.

---

## Two orphans named earlier in the same block

`3edaf5f` — **Decision Memory sealing has zero production callers.** Surfaced
as a named blocker under the §14.13 precedent rather than rush-wired. Note the
detector shape that made it work: `.map(toDecisionSnapshot)` is a real,
point-free use that a call-syntax matcher (`sym\s*\(`) scores as *zero*. The
guard matches the bare identifier `\bsym\b` for that reason.

`669c3d4` — **`executionConnectivity` is orphaned, and /readiness discloses that
honestly.** Not a live defect. The commit guards the *prose* that makes it safe,
because the disclosure is the mitigation — if the wording drifts, the orphan
stops being disclosed and starts being hidden. Carried lesson written into that
file: a substring ban cannot parse English negation. Banning the word
"certified" goes red against the sentence *"are **not** certified by this
receipt"*, which is the honest sentence.

---

## BLOCKERS — stated plainly

**PRODUCTION IS NOT UPDATED. This entire baton is `implemented` + `tested`, NOT
`observed` on production.**

`./node_modules/.bin/wrangler whoami` returns, verbatim:

    Not logged in. Your auth token has expired and could not be refreshed,
    and the environment is non-interactive.

Re-observed at seal time, not assumed. `https://wealthymindsetspro.com/paper`
returns HTTP 200, and is serving the **pre-fix bundle** — a trader on
production today still sees futures P&L at 1x.

**FOUNDER ACTION REQUIRED, and it blocks all production observability for every
lane, not just this one:**

    ./node_modules/.bin/wrangler login

Run it in an **interactive terminal**. Note that `npx` is broken on this
machine — `npx wrangler whoami` fails with `MODULE_NOT_FOUND` at
`/Users/dspaidnoosleep/bin/npx` — so invoke the local binary directly by path.
No `CLOUDFLARE_API_TOKEN` will be written by this thread under any
circumstances.

Carried, unchanged by this lane:

- Every `BrokerAdapter.submitOrder()` returns `rejected` with
  `brokerOrderId: null`. There is no order path to any broker.
- `SESSION HALTED` vocabulary is absent from the codebase.
- Paper state is localStorage only — §12 has no server store.
- `/api/market-memory/coverage` returns 503 pending `SUPABASE_SERVICE_ROLE_KEY`.
- Gate 4 responsive device proof — programmatic window resize does not take
  effect, `outerWidth` stays pinned.
- /journal detail canvas — 0 journal entries exist to render.

---

## What the next lane should pick up

The ten uncovered chart futures are the obvious next atom **only if the
one-click chart order path is being wired**. If it is not, leave them pinned;
adding them now would break the interlock proven by Revive I.

Untouched Founder gates that are not blocked: **Delta Bubbles level
ownership**, and **Live VP render geometry proof**.

Files held by another thread and NOT touched by this lane:
`src/components/chart/ChartsDashboard.tsx`, `src/components/chart/ChartToolbar.tsx`,
`src/app/globals.css`, `docs/operations/batons/WM-PRO-EVENING-2026-09-03.md`,
`scratchpad/`, `src/lib/chartPhoneControlReachability.test.ts`. Every commit in
this block staged its files by name.

No elapsed time is claimed anywhere in this baton. Time is data; it was not
observed, so it is not reported.
