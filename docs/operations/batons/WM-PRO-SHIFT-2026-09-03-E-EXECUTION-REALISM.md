# WM PRO SHIFT E — §13 gates: bubbles, VP, paper execution realism
Date: 2026-09-03
Thread: ATHOS single-thread (Claude Code)
Running under a 15-minute recurring loop (cron 5221e2b9).

## SHIPPED
| SHA | Fix |
|---|---|
| b833b8b | delta bubbles silently discarded ticks on bucket edges |
| 89a350e | removed unreachable Session VP panel mount |
| ca891d6 | guard the cancel transition, not just the Cancel button |
| 6c03b27 | closing a position twice could leave you short instead of flat |
| cdb1483 | a $100k account could fund millions in orders |
| 91c240e | close the option buying-power side door |

## b833b8b — Delta Bubbles level ownership (§13 gate)
Bucket assignment used `Math.abs(t.price - priceLevel) < half`, a STRICT
comparison. Ticks landing exactly on a bucket edge matched no bucket and
vanished from bid, ask AND delta — no error, no gap marker.

Not a rare edge: market prices are quantised to tick size (0.25 futures, 0.01
equities), so when levelStep is a multiple of that tick, real traded prices hit
boundaries systematically. The bar's low and high are ALWAYS boundaries, so the
extremes — where absorption and rejection evidence lives — were dropped from
every bar.

**Method note worth keeping:** my first test used decimal prices and showed ZERO
drops. I would have concluded "no bug". The old code only appeared correct
because floating-point error nudged |price − center| just under `half`. Retested
with exact binary fractions (lo=0, hi=1, n=4): ticks at 0.0, 0.25, 0.5 and 1.0
were ALL dropped. **A measurement too weak to see the defect looks identical to
the absence of a defect.**

Replaced with half-open binning [start, end), last bucket inclusive of `hi`,
indexed directly — also O(ticks) rather than O(ticks × levels).

## 89a350e — why VP had no visual proof (§13 gate)
`{sessionVPOpen && <WMSessionVP …/>}` — state initialised false, its ONLY setter
was the panel's own onClose(false). Unreachable; the component could never
render. That is the likely real reason §13 says "Live VP production visual
behavior still requires direct proof".

But the comment directly above it recorded: "The large stationary Volume Profile
panel was REMOVED per spec… frees ~340px". So it is debris from an INTENTIONAL
removal, not a lost feature. **I was one step from wiring a toggle to it, which
would have silently reversed a Founder spec decision while I believed I was
closing a canon gate.** Removed the dead branch so the retirement is legible.

VP geometry verified correct, no defect: buildSessionLevels and buildTapeLevels
both return high→low, foldTape preserves order, so `levels[lo]`=VAH and
`levels[hi]`=VAL are right in both layers; both already use half-open binning;
the VA expansion can only terminate after adding a non-zero level.

## ca891d6 / 6c03b27 / cdb1483 / 91c240e — paper execution realism (§13 gate)
**Cancel had no state guard.** cancelOrder() relabelled ANY order, so a filled
order could read "cancelled" while its cash movement and position stayed on the
books. Not reachable via UI (button gated to pending) — but this module already
states the principle in writing: selectPaperQuoteReadiness exists so
"UI-disabled controls" do not "become the sole guard against direct handler
invocation". The quote path enforced it; the order state machine did not.

**Double-close could reverse your position.** closePosition() sized the
flattening order from the CURRENT position, the Close control has no disabled
state, and fills land on the next quote tick. Two quick clicks on a long 10
created two sell-10 orders; both filled; the trader who asked to go FLAT ended
up SHORT 10 — from the button whose entire purpose is removing exposure.
selectCloseOrderPlan() now nets pending MARKET orders and returns only the
residual. Resting limit/stop orders are excluded: they may never fill, and
counting them would under-size a genuine flatten.

**No buying power check existed anywhere.** submit() gated on readiness+qty,
openOption() ran `setCash(c => c - cost)` unconditionally, fills applied
cashDelta unconditionally. A $100,000 account could buy millions and go deeply
negative. Position sizing is the one habit paper trading exists to build, and an
account that cannot run out of money cannot teach it — the sim was training the
opposite lesson. `OrderStatus` already declared "rejected" for this and nothing
produced it; it does now.

Enforced at the fill loop (where cash moves), with cash run forward across the
batch so several fills in one tick cannot each pass against the same starting
balance. `cash` added to the effect deps — it participates in the gate, so
omitting it evaluated a stale balance. Options bypass the order ledger entirely,
so openOption() got the same selector via a ref (its useCallback would otherwise
close over a stale balance), and a refusal is surfaced as an alert rather than a
silent no-op.

**Deliberate limit:** only a BUY exceeding cash is rejected — unambiguous. Short
selling needs a margin model, which is a Founder decision and is NOT invented
here. A test pins that sells are untouched so nobody assumes it is covered.

## PROOF STATE
- /paper live after deploy: cash $100,000, 0 pending, 0 UNKNOWN, 0 "WAIT FOR
  VERIFIED QUOTE", Place Buy Order armed, no console errors → **no regression**
  from the fill-effect dependency change.
- The buying-power gate itself is TESTED, not live-exercised: submitting an
  oversized order would leave a rejected-order artifact in the Founder's own
  paper ledger. Not worth mutating his data to prove a unit-tested branch.

## STATE
343 files / **3198 tests passing** (unpiped). TypeScript clean.

## STILL OPEN
- **Decision Memory sealing has zero production callers.** Correction to my
  earlier phrasing: the MODULE is imported by 5 production files for its types —
  it is the `sealDecisionMemory()` FUNCTION that never executes, so the sealing
  guarantee (validated chronology, sealedAt, deepFreeze, append-only amendments)
  does not run even though the shape flows through. Wiring it into the live
  decision path is an architectural change; **surfaced for Founder intent, not
  rush-wired.**
- `executionConnectivity` orphaned (0 importers). NOT a live defect —
  /readiness already discloses honestly that READY means "credentials present".
  An unwired stronger guarantee, not a lie.
- Gate 4 responsive device proof — BLOCKED: programmatic resize does not take
  effect (outerWidth pinned 1568, innerWidth never leaves 1920).
- /journal detail canvas — BLOCKED: journal has 0 entries.
- Founder unblock: `/api/market-memory/coverage` 503 names
  `SUPABASE_SERVICE_ROLE_KEY` — paste into Cloudflare env vars.

## TIMING TRUTH
No duration claimed. 6 implementation commits, 1 live regression check,
2 investigations that correctly produced NO change (VP geometry, fill/P&L math),
1 near-miss caught (nearly reversed a spec removal), 0 Founder questions.
