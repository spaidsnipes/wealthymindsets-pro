# WM Pro — three claims the program could not support

Recorded 2026-09-12. This is not a claim of elapsed time. Work occurred in
bursts; gaps between turns are interruptions, not execution. No aggregate
active duration is established by these receipts.

Commits, all pushed to main: `172e9bc`, `a9ab49a`, `d5bc1c6`, on top of `2f847bb`.

## The through-line

Three unrelated surfaces, one defect shape: each stated something with more
confidence than its evidence allowed. None was caught by a type, a test, or a
build. All three were found by reading what the program actually printed and
asking whether it could know that.

## 172e9bc — the env manifest recommended deleting 24 live credentials

`node scripts/env-manifest.mjs --check` exited 0 while listing
`SUPABASE_SERVICE_ROLE_KEY` and the whole ALPACA and WEBULL sets as "retired
candidates in .env.example not referenced by code." 24 names. Every one
actively read. Acting on that advice deletes live credentials and takes the
host down.

Root cause: the scanner matched exactly one of three env-read channels. It saw
literal `process.env.FOO`. It could not see reads BY INDEX off a const table
(`PROVIDER_REQUIREMENTS`, `SERVICE_KEY_VARS` — the name exists only as a quoted
string) or DOTTED OFF AN INJECTED ALIAS (`function f(env = process.env) { env.X }`).

The fix is a suppression-only second pass that deliberately over-matches and
NEVER promotes a name to "referenced" — it can only withhold the retirement
claim. A false positive costs a human one extra line; a false negative
recommends deleting a live credential. The error is pushed entirely into the
harmless direction. Candidates: 24 → 0.

Three iterations were needed, each found by CHECKING the survivors rather than
believing the output: quoted literals → plus dotted-on-alias → plus
trailing-underscore names (`FINNHUB_KEY_`, `ALPACA_BROKERAGE_KEY_SECRET_` are
real load-bearing names on this host).

**`tsc` caught a bug the test suite hid.** The new Sentinel used `p.name` on
`ProviderRequirement`, which is `undefined` at runtime — the guard set silently
held `undefined` and was far weaker than it looked. Vitest passed anyway. After
the fix, the revive break named 23 credentials instead of 8.

## a9ab49a — the Alpaca rows did not declare the canary symbol they read

Surfaced by the REVIVE break above, which was recorded in `172e9bc` as **NOT
protected**: narrowing the scanner back to quoted literals only let the CLI call
the live `ALPACA_CANARY_SYMBOL` a retirement candidate while the Sentinel passed.

The shape of that gap was the finding. `owned` is built from what the registry
DECLARES, and `ALPACA_CANARY_SYMBOL` was read inline at
`providerProbeFleet.ts:107` while its three sibling canaries (MOOMOO / WEBULL /
LONGBRIDGE) were declared in their providers' `recommended` lists. **The hole
was in the table, not in the test.**

Declared on the `alpaca-live` row — the probe authenticates with
`resolveAlpacaLiveCredentials`, so one read gets one owner and a missing canary
is reported once rather than twice.

Re-ran the same break afterward: the CLI now prints no retirement-candidates
line at all. **Closed at the source.** Widening the Sentinel's pattern instead
would have hidden an incomplete registry rather than completing it.

## d5bc1c6 — the options surface said INDICATIVE without saying why

A trader reading `RECENT REFERENCE · INDICATIVE` was told a true consequence —
not an executable quote — with its cause left unsaid. That reads as a limit of
options data. It is a limit of this account's subscription. A trader who cannot
tell those apart cannot tell what would change it.

`lib/ops/healthDimensions` forbids collapsing AVAILABLE and ENTITLED and cites
this exact pair as its empirical case (Garden Pass 2026-09-11): Alpaca
INDICATIVE returns fresh bid/ask while Alpaca OPRA is an explicit subscription
denial — same vendor, opposite entitlement. The surface reported AVAILABLE and
FRESH honestly while staying silent on ENTITLED.

The route's `feed=indicative` had no account beside it despite being the
decision that produces the label. It now carries one, including the trap:
"upgrading" to `opra` without the subscription returns 403, `upstreamEdge`
reports REQUEST DENIED — correctly, since authorization, subscription and
policy are indistinguishable at 403 — and the chain disappears with no
statement of what happened.

`optionsChainTruthSurface.test.ts` asserts the closing sentence verbatim and
failed on the first wording. It was left byte-identical and the new clause
added before it. Relaxing a real guard to fit a rewording would have traded it
for a cosmetic one.

## Gates

Run UNPIPED at each commit (`> file 2>&1` + `echo $?`; a pipe masks the exit
code). Final: `tsc --noEmit` EXIT=0, empty output. `vitest run` EXIT=0, 529
files / 6058 tests.

## REVIVE ledger

| Break | Result |
|---|---|
| Remove `&& !literals[n]` suppression | FAILED by name, listed 23 owned credentials. Protected. `tsc` stayed green — the Sentinel is the only gate that catches this. |
| Narrow pattern to quoted literals only (pre-`a9ab49a`) | PASSED while CLI called live `ALPACA_CANARY_SYMBOL` a retirement candidate. Real gap. |
| Same break, post-`a9ab49a` | CLI prints no retirement-candidates line. Closed. |

Both scanner restores verified byte-identical (`diff` empty, shasum
`7f307467b16101d3c004e9972e03d2ad754baccc`).

## 🟡 HUMAN_PROOF_REQUIRED — deploy

`./node_modules/.bin/wrangler whoami` EXIT=1, re-measured this block:

> Not logged in. Your auth token has expired and could not be refreshed, and
> the environment is non-interactive.

All four commits (`2f847bb`, `172e9bc`, `a9ab49a`, `d5bc1c6`) are
**repo-proven, not deploy-proven**. The live host serves the previous release.
No visual proof is claimed for any of them. Owner: Founder. Green exit is
`wrangler login` or exporting `CLOUDFLARE_API_TOKEN`.

## Known boundary, stated rather than papered over

The env-manifest Sentinel protects exactly the names the registry declares. An
env var read inline by a future module with no row in `PROVIDER_REQUIREMENTS`
is still outside it. That is deliberate: the remedy for such a name is to give
it an owner in the table, which is the remedy `a9ab49a` applied.

## Still open

- Gate 4 responsive device proof — BLOCKED, programmatic window resize does not
  take effect, `outerWidth` pinned.
- `/journal` detail canvas — BLOCKED, 0 journal entries.
- Decision Memory sealing has zero production callers. Architectural; surfaced,
  deliberately not rush-wired.
- `executionConnectivity` orphaned. Not a live defect; `/readiness` discloses
  honestly.
- Delta Bubbles level ownership; Live VP render geometry proof; paper execution
  state machine realism.
