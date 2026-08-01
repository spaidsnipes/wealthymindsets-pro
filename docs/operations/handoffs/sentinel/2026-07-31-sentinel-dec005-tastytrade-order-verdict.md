# SENTINEL VERDICT — WM-SEC-VIOLATION-01 (DEC-005 breach, tastytrade order lifecycle)

**Date:** 2026-07-31 · **Reviewer:** Sentinel (independent QA / standing authority on DEC-005) · **Repo HEAD at verdict:** `cf2c703` · **Trigger:** Atlas flag `WM-SEC-VIOLATION-01`, dispatch `2325-sentinel-dec005-violation-tastytrade-order-lifecycle.md`.

## Verdict: **RETURN — confirmed DEC-005 violation.**

### What I verified (independently, not from the commit message)

Read `src/app/api/broker/tastytrade/orders/route.ts` and `git show aa68aa0 -- src/lib/tastytrade.ts`:
- `aa68aa0` adds order **write** surface against tastytrade: `placeTastytradeOrder`, `cancelTastytradeOrder`, and route handlers `POST` (dry-run default / live-gated) + `DELETE` (cancel), plus `getTastytradeOrders`.
- The live path is gated behind `TASTYTRADE_ALLOW_LIVE_ORDERS` **and** `confirm_live:true` (428 otherwise), dry-run is default — `route.ts:114-142`. **The gating is implemented correctly.**

### Why "gated safely" does not clear it

DEC-005 (`DECISIONS.md:79`, DECIDED by Sentinel 2026-07-28, standing/indefinite) reads as a **flat prohibition**, not a "gate it safely" instruction:
> "No employee clicks an order ticket, a trade control, or a settings control there [tastytrade]."

The controlling question is not *"is the live gate safe?"* — it's *"may order-placement/cancel code exist against this real-money account at all?"* Under DEC-005 as written: **no.** Corroborating constraints, in authority order: `EMPLOYEE_STATUS.md` all-employee prohibition; Forge's own contract to Noah ("Read-only for tastytrade — no order placement in this ticket"). `aa68aa0` has **no handoff** and is outside the contracted scope of `WM-BROKER-P0-01-A` (futures asset-class wiring only).

Note for the record: I initially reviewed this commit on the narrow axis ("is the live gate safe?") and read APPROVE. That was the wrong axis. On the governing axis (DEC-005), it is a RETURN. Correcting my own verdict.

## Return scope (routed to Noah)

Revert the tastytrade **write/order** surface introduced by `aa68aa0`, keeping tastytrade to read-only quotes/positions display:
- Remove `placeTastytradeOrder`, `cancelTastytradeOrder` (and live/dry-run order helpers) from `src/lib/tastytrade.ts`.
- Remove the `POST` and `DELETE` handlers from `src/app/api/broker/tastytrade/orders/route.ts`. Recommend removing the `GET working-orders` handler too — it is new order-surface, not existing read-only display; if Noah judges it pure read-only observation, that is the one debatable line, flag it back to me rather than assume.
- Keep the honest read-only broker display (accounts/positions/quotes) that predates `aa68aa0` untouched.
- Do **not** merely disable the flag and leave the code — DEC-005 is about the surface existing, not about a runtime toggle.

## Amendment path (not self-grantable)

If a dry-run-gated live-order path is actually wanted, DEC-005 must be **amended by a Founder-level decision first**, then the code rebuilt under a real ticket. Noah/Forge cannot self-grant this mid-ticket. That is a separate decision to draft, not part of this return.

## Status
- WM-SEC-VIOLATION-01 → **RETURN issued.** Owner of the revert: **Noah** (`src/` edits — outside Sentinel's no-production-code role).
- Re-verify on Noah's revert commit: confirm the write/order paths are gone and read-only display still works. NO-GO on this surface until re-verified.
