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

# Cloudflare deploy — the 6 declared-but-empty secrets

> ## CORRECTION — this baton's diagnosis was WRONG. Superseded below.
>
> Everything from "What is actually happening" through "The exact Founder
> action that unblocks deploy" is **retracted**. It was reasoned from the log
> alone, without looking at the platform. When the dashboard was finally read
> directly, it contradicted the guess. The wrong text is left in place
> unedited so the failure mode stays legible; read the CORRECTED DIAGNOSIS
> section at the bottom of this file for what is actually true.
>
> No Founder action is required. The deploy is not failing. It already shipped.

Sealed 2026-09-13T09:50Z. Diagnoses the Cloudflare Workers deploy failure the
Founder screenshot showed at build `c942757e-9c53-4975-af2f-083f78fb3080`.

## The exact error, verbatim from CI

    ✘ [ERROR] The following required secrets have not been set:
      LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LONGBRIDGE_BRIDGE_TOKEN,
      MOOMOO_BRIDGE_TOKEN, SUPABASE_SERVICE_ROLE_KEY, TASTYTRADE_REFRESH_TOKEN

    Use `wrangler secret put <NAME>` to set secrets before deploying,
    or supply them when deploying with `wrangler deploy --secrets-file <path-to-file>`.

## What is actually happening

`wrangler.jsonc` intentionally declares only ONE required secret — `JWT_SECRET`
— on the grounds that provider credentials are owned by `providerReadiness`
and any absent provider reports NOT CONFIGURED honestly without preventing
deploy. That is the whole point of the manifest.

But wrangler is failing on 6 OTHER names. That is not repo state. Wrangler is
reading the Cloudflare Worker's own secret REGISTRY on the platform and
finding these 6 secret NAMES have been declared but their VALUES are missing
or empty. Once a name is declared, wrangler treats it as required. The names
survived on the platform from an earlier install; the values did not.

Two proofs of this diagnosis:

  · `wrangler.jsonc` `secrets.required` array lists ONLY `JWT_SECRET`.
    A source-level check would fail on JWT_SECRET, not on the 6 named.
  · The 6 names match provider credentials from `providerReadiness.ts` —
    exactly the credentials the manifest deliberately DOES NOT declare
    (line 596 comment: "`secretsDeferredToReadiness` — deferred for a stated
    reason").

## Why we cannot fix it from a Claude session

The classifier declined credential exploration (correct); wrangler
`whoami` returns "auth token has expired, non-interactive" and
`wrangler secret bulk` requires that same interactive auth. Adding empty
`vars` entries to `wrangler.jsonc` was tried and correctly rejected by
`providerReadiness.wrangler.test.ts` (line 103) — the sentinel enforces
"presence/name/provider/state only, never values." Empty strings are
values. Canon holds.

## The exact Founder action that unblocks deploy

In the Cloudflare dashboard, on the SAME page the screenshot showed:

    Cloudflare Dashboard
      -> Workers & Pages
      -> wealthymindsets-pro
      -> Settings
      -> Variables and Secrets

For each of these six names:

    LIVEKIT_API_KEY
    LIVEKIT_API_SECRET
    LONGBRIDGE_BRIDGE_TOKEN
    MOOMOO_BRIDGE_TOKEN
    SUPABASE_SERVICE_ROLE_KEY
    TASTYTRADE_REFRESH_TOKEN

pick ONE of:

  A. DELETE the entry. Wrangler stops requiring the secret. Provider
     readiness reports NOT CONFIGURED at runtime, which is the whole
     point of the manifest architecture. This is the CORRECT move if the
     credential does not exist yet.

  B. SET the entry to an empty string via the dashboard edit UI. Deploy
     will succeed and provider readiness will still report NOT CONFIGURED
     (empty === missing at the provider level).

  C. SET the entry to the REAL credential if the Founder has it and the
     provider is intended to be live. This is only correct when the
     provider is genuinely wired.

Then retry the deploy — either from the Cloudflare "Retry build" button
the screenshot showed, or from a terminal:

    npm run deploy:cf

## What has already landed in the tree

Nothing in wrangler.jsonc has been changed. The provisional `vars` fix was
attempted, correctly rejected by the sentinel, and reverted. The tree at
this baton's commit is byte-identical to the pre-attempt state for
`wrangler.jsonc`, and `providerReadiness.wrangler.test.ts` remains green.

The MainLayout Founder-route branch now uses `isFounderRoomRoute(pathname)`
from the registry — this was already the case before this session; my
initial reading of a stale git state showed an old string literal. The
`MainLayout.founderRoute.sentinel.test.tsx` update from Codex (the test
that asserts `isFounderRoomRoute(pathname)` shape) matches current code and
passes at 6/6. Full suite: 6461/6461. TSC: 0.

## After deploy: the Founder-room WILL flip on more than /command-deck

`founderRoomRoutes.ts` now names SEVEN routes as the Asset-10 family:
`/command-deck`, `/charts` (INSTRUMENT_VIEW_ROUTE), `/heatmaps`,
`/morning-prep`, `/journal`, `/paper`, `/nectar`. When the deploy lands,
every one of those routes stops rendering the July shell and starts
rendering the sanctuary + WATER-BREATH + seven-mode bar. The blur-silhouette
test the Founder audit demanded then applies to all seven — MARKET IS THE
ROOM everywhere the trader is likely to arrive.

MARKET IS THE ROOM. WATER MAY BREATHE. PRICE MAY ONLY MOVE WHEN TRUTH MOVES.
NO OWNER = STILL.

---

# CORRECTED DIAGNOSIS — read from the platform, not from the log

Appended 2026-09-13, after the Founder said "go inside Cloudflare and get more
context" and the dashboard was actually opened and read.

## What the platform says

`Workers & Pages -> wealthymindsets-pro -> Settings -> Variables and Secrets`
lists 28 secrets. NAMES ONLY were read; every value rendered as
"Value encrypted" and no value was opened, revealed, copied, or logged.

**NONE of the six names is present.** Not empty — ABSENT:

| required by the failing build    | on the platform                        |
|----------------------------------|----------------------------------------|
| `LIVEKIT_API_KEY`                | absent (`ATH_LIVEKIT_KEY_` exists)     |
| `LIVEKIT_API_SECRET`             | absent (`ATH_LIVEKIT_KEY_SECRET_`)     |
| `LONGBRIDGE_BRIDGE_TOKEN`        | absent                                 |
| `MOOMOO_BRIDGE_TOKEN`            | absent                                 |
| `SUPABASE_SERVICE_ROLE_KEY`      | absent (`SUPABASE_SECRET_KEY` exists — the accepted alias) |
| `TASTYTRADE_REFRESH_TOKEN`       | absent (`TASTYTRADE_CLIENT_ID`/`_SECRET` exist) |

`JWT_SECRET` — the one name the current manifest declares — IS present.

## So the direction of the error was backwards

The baton claimed the platform declared names the repo did not. The truth is
the exact mirror image: **the repo declared names the platform does not have.**

    537a803  2026-09-12 04:34  declared NINE required secrets, incl. all six
    65a659b  2026-09-13 07:16  reduced the array to JWT_SECRET only

Build `c942757e` was cut from a commit in that window. Wrangler did exactly
what it was told: it compared nine declared names against the Worker's real
secret set and named the six that were missing. The registry — not the
platform — was the source, and `secretsDeferredToReadiness` is precisely the
mechanism `65a659b` introduced to stop declaring them.

## And therefore

**The deploy is not failing. It already succeeded, and no Founder action is
required.** From the Deployments tab:

    Active deployment   399b69f7
    Source commit       8dcda56  (this very baton)
    Deployed            ~17 minutes before this correction
    Traffic             100%
    Error rate          0%
    Median CPU          8.38ms
    Version history     538 versions; the last ten all landed from main

Every remediation option A/B/C above is moot. Do not delete a secret. Do not
set one to an empty string. There is nothing to retry.

## G9 — the Founder can see it

`https://wealthymindsetspro.com/command-deck`, observed live in the Founder's
authenticated Chrome after this deploy, renders THE SANCTUARY:

  · seven-mode bar — PREP OBSERVE **WAIT** EXECUTE MANAGE REVIEW LEARN
  · job caption "Watch the market with no position."
  · "What is the market actually doing right now?" + SUGGESTED JOB → WAIT
  · HERO TRUTH — SPY 15M · MARKET STATE UNKNOWN · session CLOSED ·
    source unknown · coverage 0 channels · unknowns 8
  · MARKET · CHART EVIDENCE — real candles, SPY 15m 120 bars, price 764.29
  · right column AVAILABLE R (UNKNOWN, honestly) and EXPRESSION · SHORTLIST
    ("WAIT FOR DIRECTION")
  · MARKET CANVAS — "Right-of-way is withheld — the market has not earned entry."

  · **NO** left primary rail. **NO** ticker tape. **NO** workspace tabs.
    **NO** `wm-universe` card dashboard.

The July shell is gone from the Founder URL. G2 was green in code; **G9 is now
green by observation.**

## The lesson this baton is actually worth keeping for

The first diagnosis was internally coherent, cited two "proofs", named a file
and a line number, and was WRONG — because every input to it was a log and a
repo, and the claim was about a platform. Reading the platform took four tool
calls and inverted the conclusion. A confident diagnosis that never touched
the system it is a diagnosis OF is a hypothesis wearing a receipt's clothes.

NAMES ONLY. NO VALUE WAS READ. THE ROOM IS LIVE.
