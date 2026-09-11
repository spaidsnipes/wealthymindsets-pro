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
