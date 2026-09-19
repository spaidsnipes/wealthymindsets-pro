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

# WM PRO — SHIFT BATON 2026-09-18-E

## THE INSTRUMENT WAS THE DEFECT

Baton D closed the prose round-trip and named a gap it could not close. This
shift went to close that gap and found the gap had never been measured — and
then found the measuring instrument was wrong twice before any finding from it
could be trusted.

**Commits:** `b25af195`, `2be5c892` (continuing the block opened at `c9c1368d`).

---

## 1. `b25af195` — FEED UNKNOWN names WHICH absence it found

`compileFeedStanding` in `src/lib/os/osChrome.ts` collapsed three materially
different states into one sentence, `"no observation yet"` — the same shape
`Not receiving` had in `ProviderWireStrip` before baton D:

| state | what is true | old detail | new detail |
|---|---|---|---|
| `source === null` | nothing was even ATTRIBUTED | `no observation yet` | `no observation yet` |
| source named, no quote | a provider ANSWERED without a price | `no observation yet` | `provider returned no quote` |
| quote, no timestamp | a price ARRIVED and cannot be aged | `no observation yet` | `quote arrived without a provider timestamp` |

Row 3 is the one that mattered: `"no observation yet"` there was **flatly
false**. A price had arrived.

**`label` and `established` are unchanged on all three paths.** The badge stays
`FEED UNKNOWN`; the provenance footer keeps printing `SOURCE UNKNOWN`. A sharper
sentence must not become a stronger claim.

### The Sentinel caught the first draft

The first draft interpolated `obs.source` and went **red by name** on
`WM-CHART-PROV-EMERG-01` — the Founder emergency of 2026-08-06, *"stop telling
people where the apis come from."* `detail` is RENDERED, and the provenance
footer UPPERCASES it.

```
AssertionError: vendor "polygon" leaked into the nothing detail:
  "polygon returned no quote"     osChrome.test.ts:874
```

**Repaired the fix, not the Sentinel.** The distinction that matters here is
WHAT was absent, never WHO was asked. Vendor identity stays in `provenance`,
which no chrome renders.

### Live status — HONEST NEGATIVE

Probed `/command-deck?symbol=TSLA` and `/charts?symbol=TSLA`. Both read
`["SOURCE OBSERVED"]`. **The repaired branch is not reachable on production
today.** Test-proven, NOT live-observed — same standing as the
`BrokerConnectPanel` witness from baton D.

---

## 2. `2be5c892` — the Sentinel was auditing a minority of its own corpus

Baton D recorded the inline-row notes as an unclosable gap:

> "moomoo/longbridge author their refusal notes inline on capability rows
> instead, and separating those from ACCEPTED-row notes statically is not
> reliable."

**Nobody measured that.** §14.1 applied to the instrument: *a gap asserted
without measuring is a DEFAULT, not a FINDING.* Two things were wrong:

1. **Only 2 of the 7 non-test adapters call `zeroState` at all.** The Sentinel
   covered a minority of the corpus while its comment implied coverage.
2. **The separation IS reliable.** The thing that decides whether a note is a
   refusal — the `CapabilityCertStatus` — is a string literal sitting in the
   SAME construct as the note.

### Two corrections to my own probe, before any finding was trusted

**A PROBE THAT MIS-ATTRIBUTES IS A BROKEN PROBE, NOT A FINDING ABOUT THE CODE.**

**(a) "Nearest preceding status literal" reported a defect that does not exist.**
It flagged `webullMarketData.ts:335` — a note sitting on a `state: "OBSERVED"`
success envelope **46 lines below** an unrelated `BLOCKED_ENTITLEMENT`. The rule
reached straight across both. Replaced with a **bracket-depth scan** that stops
the moment the enclosing construct closes. The four moomoo findings survived the
correction; the webull one correctly vanished.

**(b) The replay harness hardcoded `NOT_IMPLEMENTED`,** fabricating a row no
adapter emits. moomoo's `"OpenD gateway offline or not logged in"` is authored
on a `BLOCKED_AUTH` row, and `BLOCKED_AUTH` is resolved **by status, never by
prose**. Both extractors now capture the status and replay each note under its
own.

### Two genuinely-unclassified families → two new ladder arms

| label | what it means, and why neither neighbour would do |
|---|---|
| `No probe target` | bridge up, OpenD up, token present — and `MOOMOO_CANARY_SYMBOL` was never set, so **NOTHING WAS ASKED**. `Not configured` sends a Founder to check bridge credentials that are fine; `Not receiving` claims a delivery failure that never had a request. **The missing thing is OURS.** |
| `Probe failed` | the probe that RAN and threw. Distinct from `Unreachable` (never got there) and `Provider error` (provider answered badly): the gateway WAS reachable and transport still failed. |

Placed after `Transport unproven`, before `Stale data`. Guards pin the **ORDER**,
not merely the regexes, and pin that neither arm is reachable by a
witness-overrulable `evidenceless` default.

`longbridgeTicks.ts`'s `` note: `${label} — ${detail}` `` is built entirely from
runtime values and carries no prose a static reader can classify. A real limit of
this instrument, not a pass — excluded by construction and **PINNED BY NAME** so
it cannot grow into a hiding place.

### Mutation receipt

Stripped both arms → **4 red BY NAME** (the corpus test plus all three new
cases) → restored → 49/49 green.

### Live status — HONEST NEGATIVE THAT CONFIRMS THE GUARD

`/command-deck?symbol=TSLA`, `[data-provider]`, **5 rows observed live**:

```
moomoo      OFFLINE   Not configured
longbridge  OFFLINE   Not configured
webull      BLOCKED   AUTH BLOCKED
tastytrade  OFFLINE   Not configured
alpaca      LIMITED   Stale data
```

`MOOMOO_BRIDGE_URL` is unset in production, so `Not configured` fires **before**
the ladder can reach `No probe target`. The new arms are therefore **not
observable in this environment** — but this is exactly the ordering the
over-correction guard pins, observed live. Test-proven, not live-observed.

---

## GATES

Both UNPIPED (a pipe masks the exit code):

- `./node_modules/.bin/vitest run` → **EXIT=0** — 762 files, 9459 passed, 2 skipped
- `./node_modules/.bin/tsc --noEmit` → **EXIT=0**

---

## RULES THIS SHIFT ADDED TO THE LEDGER

- **§14.1 APPLIES TO THE INSTRUMENT.** A scope gap asserted in a comment without
  measuring is a DEFAULT, not a FINDING. Baton D's "not reliable" was untested,
  and both halves of it were wrong.
- **A PROBE THAT MIS-ATTRIBUTES IS A BROKEN PROBE, NOT A FINDING ABOUT THE CODE.**
  (Extends *a probe that returns empty is a broken probe.*) Verify a probe against
  the source before trusting a single thing it reports.
- **A TEST HARNESS THAT HARDCODES AN ENUM TESTS A ROW THE PRODUCT CANNOT EMIT.**
  Replay each fixture under the status it was actually authored on.
- **A SHARPER SENTENCE MUST NOT BECOME A STRONGER CLAIM.** Split the detail; leave
  the label and the standing exactly where they were.

## CARRIED FORWARD, HONESTLY UNPROVEN

- `compileFeedStanding`'s three-way split — test-proven, not live-observable
  (both prod surfaces read `SOURCE OBSERVED`).
- `No probe target` / `Probe failed` — test-proven, not live-observable
  (`Not configured` fires first in this environment).
- `BrokerConnectPanel` witness — never observed firing live (webull HTTP 401).
- longbridge's pure-template refusal note — outside static reach by construction.

## BLOCKED, UNCHANGED

Gate 4 responsive proof (`outerWidth` pinned under programmatic resize);
`/journal` detail canvas (0 entries); Level-2 depth family (Assets 08/19/20);
`executionConnectivity` orphaned (disclosed honestly by `/readiness`).
