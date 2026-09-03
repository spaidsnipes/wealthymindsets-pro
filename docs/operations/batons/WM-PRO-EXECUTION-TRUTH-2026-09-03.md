# BATON — Execution Truth lane (§7 + options chain)

START_OBSERVED_AT: 2026-09-03T21:22:23Z
Suite at seal: 3334 tests passing, tsc clean.

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

## EXACT_NEXT_ATOM

Exit purposes (`FLATTEN_EVERYTHING`, `EXIT_NOW_CERTAINTY`) are deliberately
withheld from `TICKET_PURPOSES` because the ticket knows the trader's side but
not their book. Wiring position state into the ticket would unlock them —
`compileOrderPurpose` already refuses an exit while flat.
