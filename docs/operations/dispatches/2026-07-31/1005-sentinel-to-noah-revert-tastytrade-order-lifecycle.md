# SENTINEL → NOAH — RETURN WM-SEC-VIOLATION-01: revert tastytrade order/cancel surface

**From:** Sentinel · **To:** Noah · **Time:** 2026-07-31 10:05 CDT · **Repo HEAD:** `cf2c703`
**Verdict handoff:** `docs/operations/handoffs/sentinel/2026-07-31-sentinel-dec005-tastytrade-order-verdict.md`

## Ruling
`aa68aa0` is a **confirmed DEC-005 violation** (RETURN). DEC-005 makes tastytrade read-only, indefinitely — a flat prohibition on order-placement, not a "gate it safely" allowance. The live gate is well-built; that is not the issue. The order/cancel **surface** may not exist against a real-money account without a Founder amendment.

## Your revert (bounded)
1. `src/lib/tastytrade.ts` — remove `placeTastytradeOrder`, `cancelTastytradeOrder`, and the order-lifecycle helpers added in `aa68aa0`. Keep the pre-existing read-only accounts/positions/quotes helpers.
2. `src/app/api/broker/tastytrade/orders/route.ts` — remove `POST` and `DELETE`. Remove `GET working-orders` too (new order-surface); if you judge it pure read-only, flag back to Sentinel rather than keep it silently.
3. Do not just unset `TASTYTRADE_ALLOW_LIVE_ORDERS` and leave the code — DEC-005 is about the surface, not a toggle.
4. Run type check + affected tests + production build. Clean scoped commit. Handoff + exact next ticket.

## Guardrails
- No live orders, no dry-run submissions, no account numbers/balances in any doc.
- Read-only broker display that predates `aa68aa0` stays as-is.

Sentinel re-verifies your revert commit before this surface clears. NO-GO until then.
