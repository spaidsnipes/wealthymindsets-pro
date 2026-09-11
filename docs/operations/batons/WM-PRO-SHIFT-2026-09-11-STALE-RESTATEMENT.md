# WM Pro — Shift baton, 2026-09-11

## THE STALE RESTATEMENT — one defect class, four instances, four commits

`736e095` · `73cbf21` · `bc17065` · `72c1924` — all on `main`, all green in CI.

This shift opened as a Vercel decommission sweep (Founder directive: *"MAKE SURE
ALL VERCEL CONNECTIONS ARE COMPLETELY PUT INTO THE COMPOST"*). It became
something more useful: the sweep kept turning up the **same defect wearing
different clothes**, and by the fourth instance the shape was unmistakable
enough to name.

### The shape

> **One module restates a fact that another module owns. The restatement is
> correct on the day it is written. The owner later changes, or the world
> changes, and the restatement cannot notice — because a restatement has no
> way to check itself against its source.**

Every instance shares three properties that make it survive normal engineering:

1. **Nothing throws.** The restatement is syntactically fine.
2. **`tsc --noEmit` exits 0.** A dead string, a hard-coded array, an object
   literal — all type-correct no matter how wrong they are.
3. **The existing guards stay green**, because they were guarding the doors the
   defect did not walk through. In two cases a hand-written test *retyped the
   same stale list*, which does not merely fail to catch the bug — it **pins it
   green**.

This class cannot be found by tests, types, or CI. It is found by **reading a
claim and asking who owns the fact it restates**.

---

## The four instances

### 1 — `src/lib/email.ts` read `x-vercel-ip-*` headers (`736e095`)

The "new sign-in to your account" security email filled its location line from
`x-vercel-ip-city` / `-country-region` / `-country`. After the Cloudflare
cutover those headers were never present again, so the location silently became
`undefined` and the security email shipped without it.

`headers.get()` on an absent header is type-correct and returns `null`. Nothing
failed. The two host-neutrality locks that existed — `@vercel/*` imports and
`process.env.VERCEL*` reads — were green the entire time.

**Fixed** + a third lock added: no app code may name an `x-vercel-*` header.

### 2 — `src/middleware.ts` guarded `.vercel.app` (`73cbf21`)

The canonical-host guard existed to stop a customer beginning an authenticated
journey on a platform hostname, because cookies are host-scoped: confirm an
email on the wrong host and you land back in a signed-out app.

It tested `.vercel.app` inline. After the cutover that suffix matched nothing,
**and the guard never began covering the hostname that replaced it.**

Proven by `curl` *before* editing:

```
https://wealthymindsets-pro.dhill5711.workers.dev/login  → HTTP 200, no redirect
https://<the vercel host it did guard>/login             → HTTP 402
```

The lock was on the door nobody could open, and the door that was open had no
lock. `src/middleware.ts` had **zero tests** — which is how it got here.

**Fixed:** the membership test moved to `PLATFORM_HOST_SUFFIXES` +
`isNonCanonicalPlatformHost()` in `@/lib/canonicalUrl`, beside the canonical
host it is defined against. 11 new tests **drive the predicate** rather than
retyping the suffix list — a test that restated `.workers.dev` inline would pin
the next migration's bug green exactly as the old inline suffix did.

A fourth host-coupling lock was added at the same time, for host config that is
**not code at all**: `vercel.json` sat at the repo root declaring `framework`,
`installCommand` and `buildCommand` for a platform that had not built this app
since the cutover. Nothing imported it, so every `src/`-scanning lock was green;
nothing executed it, so nothing failed. Deleted.

### 3 — `/api/yahoo` defaulted a missing symbol to `NQ1!` (`bc17065`)

Found while executing the Founder's *"don't test on just BTC, test everything"*
directive. A request with no `sym` did not fail — it returned a
**fully-populated, internally-consistent quote for NQ1!**

This one is worth dwelling on, because it defeats the usual defences. Every
freshness check passes. Every observation check passes. The data **is** real,
correctly timestamped, and correctly labelled. It is simply *about a different
instrument than the caller asked about*. An invalid symbol already 404'd
honestly; only the ABSENT case fabricated an identity.

**Fixed:** missing or whitespace-only `sym` is a 400 that names the parameter,
on both the quote and candles paths.

### 4 — the capability matrix typed its own session state (`72c1924`)

`/api/athos/market-data/capabilities` — the surface ATHOS reads — built its
`SessionTruth` from an object literal:

```ts
reason: "canonical exchange-calendar session owner is not wired to this endpoint yet"
```

That sentence was **true when written**. It stopped being true. The codebase
holds a closure owner, `provenSessionClosure()`, and the user-visible surfaces
already consult it: the bottom index bar via `selectUsCashSessionBarLabel`, the
phone header and `/charts` via `selectCanonicalSessionToken`. This endpoint
alone kept answering from the constant, on **all eleven capability rows**.

The cost appears on exactly the days the owner can prove something: on a
Saturday `/charts` prints `US CASH SESSION · CLOSED` while this endpoint reports
`UNKNOWN` and blames a module one import away.

**Fixed:** `deriveSessionTruth()` owns the derivation, using SPY as the US-cash
proxy **to match the index bar** — two surfaces answering one question must not
pick two proxies, or they will disagree on a future holiday calendar.

**Deliberately not fixed:** `UNKNOWN` on a weekday stays. There is no intraday
calendar here, and inventing `OPEN` from "a provider answered us" is the
promotion of connectivity into session truth that the module header forbids. The
repair is narrow: stop hard-coding the shrug; let the owner sharpen it on the
days it can.

---

## Orkin §22 revives — all four proven

Each fix was reverted, the suite re-run, and the file restored byte-identical.

| Instance | `tsc --noEmit` during revive | guards failing by name |
|---|---|---|
| `x-vercel-*` headers | **exit 0** | 4 |
| `.vercel.app` suffix | **exit 0** | 4 |
| `NQ1!` default | **exit 0** | 4 |
| session literal | **exit 0** | 3 |

**`tsc` exited 0 on every single revive.** That column is the whole argument for
why this class needs a different instrument than the type system.

---

## Retirement receipt (Drive acceptance items F + G)

Post-repair sweep of `src/`:

- `@vercel/*` runtime imports — **0**
- `process.env.VERCEL*` code reads — **0**
- `x-vercel-*` code reads — **0**
- localhost-as-production — **0**
- Vercel entries in `package.json` — **0**
- `vercel.json` / `.vercelignore` / `now.json` at repo root — **0** (deleted)

Every surviving textual mention of Vercel is a comment, a guard, or a regression
fixture — explicitly historical, which is what item F requires.

Four locks now bound host coupling, one per mechanism: package imports, env
reads, request headers, and root-level deploy config.

A fifth mechanism was closed as a side-effect: `stripComments` had been
**duplicated into three scanners**, and the duplicate in `scripts/` was the
reason the prose-vs-code blind spot survived its first repair. The
implementation now lives once, in `src/lib/sourceScan.mjs` — `.mjs` and not
`.ts` because `scripts/env-manifest.mjs` runs under plain `node` with no
compiler and cannot import TypeScript. `sourceScan.ts` is a typed re-export.
Each scanner carries a positive control proving the stripper removes prose and
keeps code, so an over-greedy stripper cannot silently report a clean repo.

---

## Live state, observed — not inferred

**Market data, all six asset classes, market open.** Every class returns
distinct correct data: AAPL 332.95 (+1.95%), NVDA 219.71, TSLA 364.68, SPY
765.23, QQQ 716.26, ^GSPC 7666.09, ^IXIC 26381.60, ^VIX 15.67 (−12.16%), NQ1!
29439.75, ES=F 7670.25, CL=F 100.01 (−2.41%), GC=F 4389.30, EURUSD=X 1.15969,
JPY=X 153.724, BTC-USD 77128.75, ETH-USD 2543.39.

**Brokers — the honest answer to "are they fully wired for tick data": no, and
the app says so correctly.** Read from production through the Founder's
authenticated session:

| Provider | implemented | env configured | connected | what is actually blocking |
|---|---|---|---|---|
| webull | ✅ | ✅ | ❌ | **HTTP 401 → `BLOCKED_AUTH`.** appKey + appSecret present, accessToken absent. Webull Connect OAuth not registered (`WEBULL_CONNECT_CLIENT_ID` / `_SECRET`). |
| alpaca | ✅ | ✅ | ❌ | live creds present, paper creds absent. **This is the only provider actually serving data.** |
| tastytrade | ✅ | ❌ | ❌ | needs `CLIENT_ID` + `CLIENT_SECRET` + `REFRESH_TOKEN` |
| moomoo | ✅ | ❌ | ❌ | needs `MOOMOO_BRIDGE_URL` + `_TOKEN` **and a host running OpenD** |
| longbridge | ✅ | ❌ | ❌ | bridge URL / shared token not set |

**What the app can actually see right now**, per the capability matrix:

- `PRICE`, `TICKS`, `EXECUTED_VOLUME` → **alpaca, `ACTIVE_DEGRADED`,
  `SNAPSHOT` fidelity**, ~19s staleness. One provider-timestamped executed
  trade observed; relay continuity and reconnect are *not* certified.
- `BARS`, `AGGRESSOR_SIDE`, `DEPTH`, `OPTIONS`, `FUTURES`, `ACCOUNT`,
  `POSITIONS`, `ORDERS` → **`UNAVAILABLE`**, each with a named recovery path.

`AGGRESSOR_SIDE` being `UNAVAILABLE` is the gating fact for Delta Bubbles: they
need real per-trade aggressor tape, and no configured provider supplies it. That
is a **credential/entitlement blocker, not a code blocker** — worth stating
plainly so nobody spends a shift trying to code around it.

---

## BLOCKERS — Founder action required

1. **DEPLOY IS BLOCKED. None of these four fixes are live.** All four commits are
   on `main` and green in CI, but CI is Sentinels-only — **there is no
   auto-deploy.** `npm run deploy:cf` requires Cloudflare auth, and:

   ```
   wrangler whoami
   → Not logged in. Your auth token has expired and could not be refreshed,
     and the environment is non-interactive.
   ```

   Needs `wrangler login` in an interactive terminal, or `CLOUDFLARE_API_TOKEN`
   in the environment. **Until then production still has the silent geo defect,
   the unguarded workers.dev host, the NQ1! default, and the typed session
   shrug.**

2. **Broker credentials** — per the table above. Each is a value only the
   Founder can obtain from the provider's own interface. Names only; no secret
   values in this repo, in Drive, or in any log.

3. **Gate 5, asked and still unanswered:** is migration
   `20260907080000_wm_decision_position_shared_authority.sql` applied to
   Supabase project `zrzaifaxecwgpfrqctkp`?

---

## Carried blockers, unchanged and honestly recorded

- **Gate 4 responsive device proof** — `resize_window` reports success while
  `outerWidth` stays pinned at 1568. Not provable through this channel. This is
  **EXTERNALLY-LIMITED, not PROVEN** and must not be written up as passing.
- **Live VP render geometry** — same channel limitation. Same wording applies.
- **`/journal` detail canvas** — 0 journal entries exist to render.
- **Decision Memory sealing has zero production callers** — architectural.
  Surfaced deliberately; **not** rush-wired.
- **`executionConnectivity` orphaned** — ledgered `AWAITING_SURFACE`. Not a live
  defect; `/readiness` discloses it honestly.

---

## For whoever picks this up

The four fixes here are done. The **reading habit** is the part worth carrying:

> When a module states a fact — a hostname, a header name, a symbol, a session,
> a provider list — ask **"who owns this fact, and is this module importing it
> or retyping it?"** If it is retyped, it is already drifting; you just do not
> know how far yet.

And when you write the test: **drive the predicate, never retype the list.** Two
of the four defects above were sitting inside test files that restated the very
thing that had gone stale.

Verification for every commit in this baton: `vitest run` and `tsc --noEmit`,
both **unpiped** — a pipe masks the exit code. Final state: **500 files, 5625
tests, exit 0; `tsc --noEmit` exit 0.**

---

# ADDENDUM — instances five, six and seven (`be87e41`, `cfdc1c0`, `6ce3853`)

The baton above was sealed after four instances. Sweeping every consumer of one
owner — `selectAggressorFlow` — turned up three more, and they are the most
instructive of the shift, because they show the class getting **worse as it
moves inward**: from a rendered pixel, to a typed seam, to a sealed fact.

## The seam variant — a consumer restates what an owner publishes, MINUS the qualifier

`selectAggressorFlow` publishes `provenance: "PROVIDER" | "INFERRED" | "MIXED" |
"UNDISCLOSED"` — how the aggressor side of each print was established. Per
provider: coinbase/binance `MAKER_SIDE_INVERTED` (conf 1), webull/moomoo
`PROVIDER` (conf 1), **alpaca relay `TICK_RULE` (conf 0.5)**.

No rendering surface read it. On a live US equity chart, a tick-rule guess was
wearing the exact chrome a venue-asserted Coinbase aggressor gets. That is
certainty manufactured **by omission** at a type boundary.

**Fix:** one owner for the disclosure words —
`src/lib/marketData/aggressorProvenanceNote.ts` — imported by both
`OrderFlowCockpitStrip` and `SmartMoneyPanel`. The words describe the FACT, not
either component's chrome, so they live in `lib/`, beside the type. A
component→component import would have pointed the arrow the wrong way; retyping
them would have been the very drift the atom exists to kill.

## Instance five — `SmartMoneyPanel` restated the selector's SHAPE three times

An `interface Flow` with ten hand-typed members; a field-by-field object
projection; and a zeroed `{ hasFlow: false, askVol: 0, ... }` literal for the
no-tape case. **The panel's own in-file comment recorded that this had already
cost a live defect**: the selector gained `oneSided` — the honest signal that a
zero-volume opposing side makes the ratio UNBOUNDED, not 3:1 — and the panel did
not receive it, painting the `300` sentinel as a measured ratio. It would have
happened a second time on `provenance`.

> A retyped list is not a shape. It is a snapshot of a shape, taken on the day
> someone typed it.

**Cure is structural, not vigilant:** `interface Flow extends
AggressorFlowSnapshot` plus `...selectAggressorFlow(realTape ? recentTicks :
null, ...)`. The empty case is expressed by giving the selector **nothing**, not
by typing a zeroed twin — the selector already owns its own empty answer, and
stamps `provenance: "UNDISCLOSED"` on it, which a hand-typed literal would not.
The owner adds a field; every consumer has it; there is no list anywhere to
forget.

## Instance seven — the DURABLE variant (`6ce3853`)

`deriveOrderFlowDimension` does not merely paint the flow; it **seals** it into
`CanonicalMarketState` as a decision-grade dimension other surfaces then trust.
Forty classified trades earned `RESOLVED` / `confidence: 0.75` /
`fidelity: "DERIVED"` / **`unknowns: []`** — which is not silence but an
affirmative claim that nothing about the verdict is unknown. Every one of those
forty sides was an Alpaca tick-rule reconstruction. The sealed Passport claimed
more certainty than its own source claims *per print*, in a field whose only
input was volume.

Three corrections, all sourced from the flow's own `provenance`:

1. **`confidence` is capped by method** (PROVIDER 1, INFERRED/MIXED 0.5,
   UNDISCLOSED 0.35). More prints narrow a heuristic's sampling error; they do
   not turn the heuristic into an observation. There is no independent
   observation anywhere in the chain to raise it.
2. **`fidelity` is `INFERRED`, not `DERIVED`.** `MarketFidelityClass` has
   published that distinction all along; the bridge hard-coded past it.
3. **`unknowns` carries the disclosure even when RESOLVED**, and the evidence
   `basis` names the method.

The verdict STRING is deliberately unchanged. **Direction is what the tape says;
provenance is how well it says it.** Hedging "AGGRESSIVE BUY DOMINANT" would
hide a real observation — the opposite error, and equally forbidden.

## Two new rules, both learned by being caught

**1. Prose pins a guard green.** My own adoption guard matched the bare module
path `@/lib/marketData/aggressorProvenanceNote`. The first Orkin revive deleted
the import outright — and the guard **passed**, because a nearby *code comment*
I had written contained the path. A guard must match the real edge:
`from "<path>"`. Two of this shift's earlier stale restatements had survived
inside their own test files by the same mechanism.

**2. A fixture that names a provider must supply that provider's method.**
`deriveOrderFlowDimension.test.ts` named `source: "coinbase"` in every fixture
while its `tradeTick` helper supplied no `aggressorMethod` at all — so the
selector honestly resolved `UNDISCLOSED` beneath assertions that read as though
a venue had asserted the side. The defect class *inside its own test*. The
helper now defaults to coinbase's real `MAKER_SIDE_INVERTED`, so the two
pre-existing assertions hold because the fixture means what it says — **not**
because they were loosened.

## The revive ledger — the evidence that matters

| # | Defect revived | `tsc --noEmit` | Guards failing |
|---|---|---|---|
| 1 | Disclosure words retyped in the second surface | **exit 0** | 2, by name |
| 2 | Shape retyped, consumer still reads `provenance` | exit 2 | (type error) |
| 3 | Shape retyped **and** no consumer — the historical state that let `oneSided` drift | **exit 0** | 4, by name |
| 4 | Count-only confidence + hard-coded `DERIVED` + empty `unknowns` | **exit 0** | 6, by name |

Row 2 is the honest caveat and row 3 is the answer to it: the type system
catches this class **only while somebody is still reading the dropped field**.
The moment the last consumer goes, `tsc` goes silent — which is precisely the
condition under which the drift occurred historically. Row 4 makes the point
sharpest: `tsc` tolerated even an unused `provenance` parameter on a function
that had stopped consulting it.

All four revives restored **byte-identical** (`cp` from `/tmp`, `diff` clean).

## Sweep closing the nest

Every other consumer of `selectAggressorFlow` was checked and is clean, with the
reasoning recorded so the next sweep does not redo it:

- **`deriveVolatilityDimension`** reads only `price` from the tick. A print's
  price is observed regardless of who lifted it, so `DERIVED` is honest there.
- **`ChartsDashboard.tsx:652`** and **`command-deck/page.tsx:1162`** read only
  the `hasFlow` boolean — a presence claim, carrying no certainty qualifier.
  Neither restates a shape.

## State at addendum seal

- Commits on `main`: `be87e41`, `cfdc1c0`, `6ce3853`.
- **502 files, 5659 tests, exit 0; `tsc --noEmit` exit 0.**
- **NOT LIVE.** CI is Sentinels-only; there is no auto-deploy. Every fix in this
  baton is green on `main` and none of it is in front of a trader until
  `npm run deploy:cf` runs. That requires `wrangler login` in an interactive
  terminal, or `CLOUDFLARE_API_TOKEN` — **the top blocker, and a Founder
  action.** Last checked: `wrangler whoami` → "Not logged in. Your auth token
  has expired and could not be refreshed, and the environment is
  non-interactive."
