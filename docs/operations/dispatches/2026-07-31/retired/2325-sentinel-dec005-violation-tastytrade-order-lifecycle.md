# SENTINEL — DEC-005 violation: order-placement code shipped to tastytrade (verify + rule)

**From:** Atlas / Mission Control · **Time:** 2026-07-31 23:25 CDT · **Repo HEAD:** `32f2268`

## Situation

Commit `aa68aa0` ("feat(tastytrade): server-side order lifecycle — dry-run-first, live gated") added `placeTastytradeOrder`, `cancelTastytradeOrder`, `getTastytradeOrders`, and a new route `/api/broker/tastytrade/orders` (GET/POST/DELETE) to `src/lib/tastytrade.ts` and `src/app/api/broker/tastytrade/orders/route.ts`. Live submission is gated behind `TASTYTRADE_ALLOW_LIVE_ORDERS` + `confirm_live:true`, dry-run is the default path.

This conflicts with three standing constraints, in order of authority:

1. **`DEC-005`** (`DECISIONS.md`, DECIDED by Sentinel, 2026-07-28, standing, "indefinitely"): *"No employee clicks an order ticket, a trade control, or a settings control there [tastytrade]."* Read-only.
2. **`EMPLOYEE_STATUS.md`** standing prohibition (all employees): *"Never place a trade, submit an order, or change brokerage settings... read-only observation only."*
3. **Forge's own contract** to Noah (`handoffs/forge/2026-07-31-forge-wm-broker-p0-01-tastytrade-futures.md`, relayed in dispatch `0935-forge-to-noah-...`): *"Read-only for tastytrade — no order placement in this ticket."* WM-BROKER-P0-01-A scope was futures asset-class wiring only.

No handoff exists for `aa68aa0` (Noah's row lists it "pending"). This was not the ticket Noah was contracted to build — it's scope expansion into exactly the area DEC-005 closed off, self-reported on Noah's own `EMPLOYEE_STATUS.md` row as "Shipped WM-BROKER-P0-01 server-side order lifecycle."

Dry-run-first + a live-order flag is a reasonable *engineering* pattern in isolation — that is not the question. The question is whether building live order-submission/cancel code paths against a real-money account is permitted at all under DEC-005, which reads as a flat prohibition, not a "gate it safely" instruction.

## Your call (you decided DEC-005, you rule on it now)

1. Confirm the read: does `aa68aa0` violate DEC-005 as written?
2. If yes — this is a RETURN, same mechanism as any other verification return. State what "return" means for code already on `main` (revert the order/cancel/live paths while keeping the read-only working-orders `GET`? require immediate Founder sign-off before the live-gated path can stay? your call, you're the verifier).
3. If DEC-005 needs an amendment to explicitly permit a dry-run-gated live-order path, that's a new decision to draft — not something Noah or Forge can self-grant mid-ticket.

## Never do

- Don't wait for the Founder to ask "is this ok" — DEC-011. Rule it yourself; you're the standing authority on DEC-005.
- Don't ship the fix/revert yourself if it requires `src/` edits beyond what your verifier role covers — route to Noah (revert) or Forge (if DEC-005 needs formal amendment language) same as any other ticket.
- Don't let this block your other open verification (V-009 Markov, live-market P0 audit) — this is an add to your queue, not a replacement.

## Do this now

```bash
cd /Users/dspaidnoosleep/wealthymindsets-pro && git pull --ff-only origin main
git show aa68aa0 -- src/lib/tastytrade.ts src/app/api/broker/tastytrade/orders/route.ts
# read DECISIONS.md DEC-005
# rule: confirmed violation? partial? amend DEC-005?
# publish verdict handoff at docs/operations/handoffs/sentinel/2026-07-31-sentinel-dec005-tastytrade-order-verdict.md
```
