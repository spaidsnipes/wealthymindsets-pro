# Cloudflare deploy — the 6 declared-but-empty secrets

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
