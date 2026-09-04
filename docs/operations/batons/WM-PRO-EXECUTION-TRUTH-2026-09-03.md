# BATON — Execution Truth lane (§7 + options chain)

START_OBSERVED_AT: 2026-09-03T21:22:23Z
Suite at seal: 3395 tests passing, tsc clean. `npm run build` exit 0.

## FOUNDERVISIBLE_DELTA

**/paper Order Ticket** now opens with the human question, not broker vocabulary:

```
WHAT ARE YOU TRYING TO DO?
  Get me in now · Get me in, but do not chase · Work for a better price · Exit if my thesis fails
Prioritises  A ceiling on what you pay
Costs you    Certainty of getting in at all
```

Choosing a purpose compiles the order type. Every purpose must state what it
costs; a purpose listing only benefits cannot be offered (type-enforced).

**Limit / Stop price fields** now read `Required — no default` and refuse the
order when blank, instead of silently pricing it at the market.

**Options chain** renders `—` for unquoted contracts instead of 0.00 bid /
0.00 ask / 0.0% IV, and withholds the P/C ratio when no call interest exists.

## Defects removed (all were shipped and live)

1. `+limitPx||px` / `+stopPx||px` — `+""` is 0 and falsy, so a BLANK price box
   fell through to the market price. Choosing "limit" and typing nothing
   produced an order priced at market: the exact protection the trader selected,
   removed silently. A blank *stop* was worse — a stop at the market triggers on
   arrival, converting "get me out if I'm wrong" into an immediate market exit.
   The placeholder rendered `fmt2(px)`, teaching the wrong mental model.
2. `call?.bid ?? 0` (and 19 sibling fields) — an unquoted strike rendered a
   contract that looks real, worthless, and free to buy.
3. `puts / Math.max(1, calls)` — with no call open interest, the forced
   denominator printed the put total as a sentiment ratio.

## REAL_DATA_OBSERVED / PRODUCTION_SURFACE_OBSERVED

Observed on https://wealthymindsetspro.com/paper via the Founder's Chrome:
`Last Price $29,502.25 · STALE PIPELINE · NOT ACTIONABLE · Observed
9/3/2026, 3:59:58 PM · 57m old · Est. Value UNKNOWN`.
Market closed 16:00 ET; the staleness gate is behaving correctly and will open
Monday. Purpose row + tradeoff + `Required — no default` all confirmed in the
live DOM.

## OLD_HUMAN_STEP_REMOVED

The trader no longer has to translate intent into broker vocabulary, and no
longer has to remember that a blank price box means "market".

## BLOCKER_BURNDOWN

- **Manual deploy is NOT possible from this environment.** `npm run deploy:cf`
  builds, then wrangler fails: no `CLOUDFLARE_API_TOKEN` and no `~/.wrangler`
  login. Founder-side secret; must not be created here.
  **Not actually blocking**: push to `main` auto-deploys. All three commits
  reached production and were verified live. Use push, not `deploy:cf`.
- Note: `npm run deploy:cf` exits **0 even when the publish fails**. Never
  treat its exit code as proof of deployment; verify the live surface.
- Order ticket cannot be exercised end-to-end until quotes are actionable
  (market open). Refusal path is unit-tested + Sentinel-asserted, not yet
  visually confirmed on a live fill.

## Second block — defect sweep by class

Ran each established defect class as a codebase-wide sweep rather than
file-by-file. Confirmed fixes:

**Fabricated zeros / absence-as-measurement**
- Options chain: `call?.bid ?? 0` × 20 fields rendered unquoted strikes as
  bid 0.00 / ask 0.00 / IV 0.0% / delta 0.00 — real, worthless, free to buy.
- Chain footer: `puts / Math.max(1, calls)` invented a P/C sentiment ratio.
- Ticker tape + watchlist (9 sites): `chg: j.change ?? 0` and
  `prevClose ?? price` asserted a flat session in green with an up-arrow.
  The tape is on every page.
- DOM header: `(close ?? 0) >= (open ?? 0)` is `0 >= 0` — a MISSING bar
  painted the headline price green. Silent and always bullish.

**Silent-catch / unchecked fetch** (broker panel)
- `fetch` does not reject on 4xx/5xx. loadPositions/loadOrders swallowed
  failures, leaving an empty list that renders "No open positions" — telling a
  trader holding risk that they hold none.
- `cancelOrder` swallowed everything: a broker-REJECTED cancel looked
  successful, so the trader walked away still exposed.

**Design theater**
- Options chain rows had `cursor-pointer` + hover with no onClick.
- Lounge tags styled as filters with no filter state.

**Coverage non-disclosure**
- Market Canvas rendered `blockers.slice(0, 6)`. A blocker you cannot read is
  one you cannot clear.

**Label overreach / provenance** (highest value for Monday)
- /paper options chain labelled columns "CALL bid/ask" over three stacked
  layers of modelling: hardcoded IV → Black-Scholes → an INVENTED
  `Math.max(0.02, mid*0.03)` band. No option quote is received on that path.
  In options the spread IS the cost of the trade.
- Open longs marked to the MID while entry paid the ask and closes paid the
  bid — every open contract displayed better than it could be closed for.
  Now marked to the bid per §21; the band assumption is single-sourced in
  `src/lib/optionModelBand.ts`.

Classes swept and found CLEAN: permissive risk gates (`?? true` / `|| true`
on any allow/valid/ready predicate — no hits); unchecked fetches on any other
trading/account/position surface (only the broker panel had them).

Two label-overreach hits ("AI Coaching", "Live Prices") were false positives —
the grep matched explanatory comments documenting an EARLIER fix. Verified
before touching.

## DEPLOY LAG — CORRECTED 2026-09-03, later the same day

**The earlier version of this section was wrong and is retracted here rather
than quietly edited away.** It claimed "production is roughly 8 commits behind
main", that `AI Trading Bot` still rendered, and that "prod sits at
approximately 5fc80a8". A later live read in the Founder's own Chrome disproves
all three. The record is corrected because a false blocker sends the Founder to
fix a pipeline that is working.

Observed in the Founder's own Chrome on https://wealthymindsetspro.com/paper
(tabId 773530904), bundle probe across 14 scripts / 943131 bytes:

| Marker | In bundle | Meaning |
| --- | --- | --- |
| `What are you trying to do?` | TRUE | §5 intent-before-order-type is live |
| `Required — no default` | TRUE | purpose has no silent default, live |
| `Signal Bot` | TRUE | the honest rename shipped |
| `AI Trading Bot` | FALSE | the overclaiming label is GONE from prod |
| `optModelBand` | TRUE | options band assumption is live |
| `26be209_buyGate` | FALSE | prod is BEHIND 26be209 |

DOM read on the same page: the four purpose buttons render live — "Get me in
now", "Get me in, but do not chase", "Work for a better price", "Exit if my
thesis fails". `aiTradingBot: false`, `signalBot: true`.

**So prod sits AFTER the orderPurpose / optionModelBand commits and BEFORE
26be209.** The pipeline moved past where this baton had recorded it as stuck.
The lag is real but small, and it is not a blocker requiring Founder action.

Honest caveats on that same probe, so it is not over-read:
- `Could not refresh positions.` / `Could not load positions.` both FALSE is
  **not** evidence about the Alpaca panel. `AlpacaTradingPanel` is not loaded
  on `/paper`, so neither string can appear in that route's bundle either way.
  That marker is inconclusive, not negative.
- `hasPurposeRow: false` / `hasRequiredNoDefault: false` in the DOM while both
  are TRUE in the bundle is expected: those render only in specific order-type
  states. Present-in-bundle, absent-in-DOM is the correct reading here.

The deploy environment limits below remain true and are kept for the next seat:
- `npm run deploy:cf` BUILDS fine, then wrangler refuses: no
  `CLOUDFLARE_API_TOKEN` and no `~/.wrangler` login in this environment. That
  token is a secret — it must not be created, pasted or stored here.
- **`npm run deploy:cf` exits 0 even when the publish fails.** Never trust its
  exit code; verify the live surface.
- The two `failure` commit statuses on GitHub are **Vercel** ("Account is
  blocked"). That is the superseded 2026-08-22 billing block from before prod
  moved to Cloudflare Workers — stale noise, not the live pipeline.

**Founder action: none required.** The earlier version of this baton asked the
Founder to run `wrangler login` / `npm run deploy:cf`. That ask is withdrawn —
the live read shows the pipeline is publishing. If a specific commit is ever
needed on prod faster than the pipeline delivers it, that manual path is still
the fallback, but it is not an outstanding request.

Verification method note: `curl` on the site reads a Cloudflare-cached HTML
(`cache-control: s-maxage=31536000`) that lists STALE chunk filenames, so a
chunk scan can report "not deployed" for work that is deployed, and vice versa.
Verify in a real browser.

## EXACT_NEXT_ATOM

Exit purposes (`FLATTEN_EVERYTHING`, `EXIT_NOW_CERTAINTY`) are deliberately
withheld from `TICKET_PURPOSES` because the ticket knows the trader's side but
not their book. Wiring position state into the ticket would unlock them —
`compileOrderPurpose` already refuses an exit while flat.
